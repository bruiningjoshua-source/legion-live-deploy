import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GIFT_CREATOR_SHARE_BASE = 0.60;
const MAX_GIFT_QUANTITY = 100;

// In-memory fraud activity tracker (best-effort, non-authoritative)
const fraudActivity = new Map();

// DB-backed rate limit: 10 gifts per 10 seconds per user
async function checkGiftRate(base44, email) {
  const now = Date.now();
  const windowMs = 10000;
  const maxCount = 10;
  const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
    { user_email: email, action: 'rate_limit_check', reason: 'rate_limit:sendGift' }, '-timestamp_utc', 1
  ).catch(() => []);
  const record = logs[0];
  let count = 1;
  let resetAt = now + windowMs;
  if (record) {
    const data = JSON.parse(record.related_entity_id || '{}');
    if (now < (data.resetAt || 0)) {
      count = (data.count || 0) + 1;
      resetAt = data.resetAt;
    }
  }
  if (count > maxCount) {
    return { allowed: false, retryAfter: Math.ceil((resetAt - now) / 1000) };
  }
  base44.asServiceRole.entities.WalletAuditLog.create({
    user_email: email,
    action: 'rate_limit_check',
    amount_denarii: 0,
    new_balance: 0,
    related_entity_id: JSON.stringify({ count, resetAt }),
    reason: 'rate_limit:sendGift',
    timestamp_utc: new Date().toISOString()
  }).catch(() => {});
  return { allowed: true };
}

function detectGiftFraud(email, quantity, totalCost) {
  if (!fraudActivity.has(email)) {
    fraudActivity.set(email, { gifts: [] });
  }
  const activity = fraudActivity.get(email);
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const oneDayAgo = now - 86400000;
  activity.gifts = activity.gifts.filter(t => t.timestamp > oneDayAgo);
  let riskScore = 0;
  const flags = [];
  const recentGifts = activity.gifts.filter(t => t.timestamp > oneHourAgo);
  if (recentGifts.length >= 10) { riskScore += 30; flags.push('excessive_gift_velocity_1h'); }
  if (activity.gifts.length >= 50) { riskScore += 20; flags.push('excessive_gift_velocity_24h'); }
  activity.gifts.push({ quantity, totalCost, timestamp: now });
  return { isSuspicious: riskScore >= 50, riskScore, flags };
}

function validateGiftInput(giftId, quantity, creatorId, streamId) {
  const errors = [];
  if (!giftId || typeof giftId !== 'string' || giftId.length > 100) errors.push('Invalid giftId');
  if (!creatorId || typeof creatorId !== 'string' || creatorId.length > 100) errors.push('Invalid creatorId');
  if (!streamId || typeof streamId !== 'string' || streamId.length > 100) errors.push('Invalid streamId');
  const qty = Math.floor(Number(quantity) || 0);
  if (qty < 1 || qty > MAX_GIFT_QUANTITY) errors.push('Quantity must be 1-100');
  return { valid: errors.length === 0, errors, quantity: qty };
}

function validateCSRF(csrfToken) {
  if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) {
    return { valid: false, reason: 'Missing or invalid CSRF token' };
  }
  return { valid: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { giftId, quantity, creatorId, streamId, csrfToken } = await req.json();

    const validation = validateGiftInput(giftId, quantity, creatorId, streamId);
    if (!validation.valid) {
      return Response.json({ error: 'Invalid input', details: validation.errors }, { status: 400 });
    }
    const qty = validation.quantity;

    const csrfCheck = validateCSRF(csrfToken);
    if (!csrfCheck.valid) {
      return Response.json({ error: csrfCheck.reason }, { status: 403 });
    }

    const rateCheck = await checkGiftRate(base44, user.email);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Rate limited', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    const fraud = detectGiftFraud(user.email, qty, 0);
    if (fraud.riskScore >= 75) {
      console.warn(`[sendGift] FRAUD FLAG for ${user.email}:`, fraud.flags);
    }

    const [gifts, streams, creators, wallets] = await Promise.all([
      base44.asServiceRole.entities.Gift.filter({ id: giftId, is_active: true }, null, 1),
      base44.asServiceRole.entities.Stream.filter({ id: streamId }, null, 1),
      base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1),
      base44.asServiceRole.entities.Wallet.filter({ user_email: user.email }, null, 1),
    ]);

    const gift = gifts[0];
    const stream = streams[0];
    const creator = creators[0];
    const wallet = wallets[0];

    if (!gift) return Response.json({ error: 'Gift not found or inactive' }, { status: 404 });
    if (!stream || stream.status !== 'live') return Response.json({ error: 'Stream is not live' }, { status: 400 });
    if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });
    if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
    if (user.email === creator.user_email) return Response.json({ error: 'Cannot gift yourself' }, { status: 400 });

    const subCheck = await base44.asServiceRole.entities.CreatorSubscription.filter(
      { user_email: creator.user_email, status: 'active' }, null, 1
    );
    const userCheck = await base44.asServiceRole.entities.User.filter({ email: creator.user_email }, null, 1);
    const isAdmin = userCheck[0]?.role === 'admin';
    if (!subCheck[0] && !isAdmin) {
      return Response.json({ error: 'Creator has not enabled monetization' }, { status: 400 });
    }

    const totalCost = (gift.cost_denarii || 0) * qty;
    if (totalCost <= 0) return Response.json({ error: 'Invalid gift cost' }, { status: 400 });

    // Re-fetch wallet for freshest balance (prevents race conditions)
    const freshWallets = await base44.asServiceRole.entities.Wallet.filter({ user_email: user.email }, null, 1);
    if (!freshWallets[0] || (freshWallets[0].denarii_balance || 0) < totalCost) {
      return Response.json({
        error: 'Insufficient balance',
        required: totalCost,
        balance: freshWallets[0]?.denarii_balance || 0
      }, { status: 400 });
    }
    const freshWallet = freshWallets[0];

    const newSenderBalance = (freshWallet.denarii_balance || 0) - totalCost;
    await base44.asServiceRole.entities.Wallet.update(freshWallet.id, {
      denarii_balance: newSenderBalance,
    });

    base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: user.email,
      wallet_id: freshWallet.id,
      action: 'gift_send',
      amount_denarii: -totalCost,
      previous_balance: freshWallet.denarii_balance || 0,
      new_balance: newSenderBalance,
      related_entity_id: giftId,
      reason: `Sent ${qty}x ${gift.name} to ${creator.display_name}`,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp_utc: new Date().toISOString()
    }).catch(e => console.warn('[sendGift] Sender audit log failed:', e.message));

    const isPK = stream.stream_type === 'pk_battle';
    const txn = await base44.asServiceRole.entities.GiftTransaction.create({
      sender_email: user.email,
      receiver_creator_id: creatorId,
      stream_id: streamId,
      gift_id: giftId,
      gift_name: gift.name,
      quantity: qty,
      total_as_value: totalCost,
      is_pk_gift: isPK,
    });

    // Determine creator's effective share (guarantee period overrides base)
    const guarantees = await base44.asServiceRole.entities.CreatorGuarantee.filter(
      { creator_id: creatorId, is_active: true }, null, 1
    );
    const now = new Date().toISOString();
    const activeGuarantee = guarantees.find(g => g.start_date <= now && g.end_date >= now);
    const effectiveSharePct = activeGuarantee?.guaranteed_share_percent ?? (GIFT_CREATOR_SHARE_BASE * 100);
    const creatorEarning = Math.floor(totalCost * (effectiveSharePct / 100));

    // Credit creator stat counter
    await base44.asServiceRole.entities.Creator.update(creatorId, {
      total_earnings_denarii: (creator.total_earnings_denarii || 0) + creatorEarning,
    });

    // CRITICAL FIX: Also credit creator's spendable Wallet balance
    const creatorWallets = await base44.asServiceRole.entities.Wallet.filter(
      { user_email: creator.user_email }, null, 1
    );
    if (creatorWallets[0]) {
      const prevCreatorBalance = creatorWallets[0].denarii_balance || 0;
      const newCreatorBalance = prevCreatorBalance + creatorEarning;
      await base44.asServiceRole.entities.Wallet.update(creatorWallets[0].id, {
        denarii_balance: newCreatorBalance,
      });
      base44.asServiceRole.entities.WalletAuditLog.create({
        user_email: creator.user_email,
        wallet_id: creatorWallets[0].id,
        action: 'gift_receive',
        amount_denarii: creatorEarning,
        previous_balance: prevCreatorBalance,
        new_balance: newCreatorBalance,
        related_entity_id: txn.id,
        reason: `Received ${qty}x ${gift.name} (${effectiveSharePct}% share)`,
        timestamp_utc: new Date().toISOString()
      }).catch(e => console.warn('[sendGift] Creator audit log failed:', e.message));
    }

    await base44.asServiceRole.entities.Stream.update(streamId, {
      total_gifts_received: (stream.total_gifts_received || 0) + qty,
      total_denarii_earned: (stream.total_denarii_earned || 0) + creatorEarning,
    });

    // Check for AI video gift overlay
    const videoGifts = await base44.asServiceRole.entities.AIVideoGift.filter(
      { gift_id: giftId, is_active: true }, null, 1
    );
    const videoGiftData = videoGifts[0] ? {
      video_url: videoGifts[0].video_url,
      duration_seconds: videoGifts[0].duration_seconds,
      loop_enabled: videoGifts[0].loop_enabled
    } : null;

    // Post gift chat message (non-blocking)
    base44.asServiceRole.entities.ChatMessage.create({
      stream_id: streamId,
      sender_email: user.email,
      sender_name: user.full_name || 'Anonymous',
      message: `sent ${qty > 1 ? qty + 'x ' : ''}${gift.name}`,
      message_type: 'gift',
      vip_level: freshWallet.vip_level || 0,
      gift_data: {
        gift_name: gift.name,
        gift_icon: gift.icon,
        quantity: qty,
        video_url: videoGiftData?.video_url || null
      },
    }).catch(e => console.warn('[sendGift] Chat message failed:', e.message));

    // Update PK Battle scores (non-blocking)
    if (isPK) {
      base44.asServiceRole.entities.PKBattle.filter(
        { stream_id: streamId, status: 'active' }, '-created_date', 1
      ).then(async (battles) => {
        const battle = battles[0];
        if (battle) {
          const isHost = creatorId === battle.host_creator_id;
          await base44.asServiceRole.entities.PKBattle.update(battle.id, isHost
            ? { host_score: (battle.host_score || 0) + totalCost }
            : { opponent_score: (battle.opponent_score || 0) + totalCost }
          );
        }
      }).catch(e => console.warn('[sendGift] PK score update failed:', e.message));
    }

    // Update broadcaster earnings session (non-blocking)
    base44.asServiceRole.entities.BroadcasterEarnings.filter(
      { creator_id: creatorId }, null, 1
    ).then(async (existing) => {
      if (existing[0]) {
        await base44.asServiceRole.entities.BroadcasterEarnings.update(existing[0].id, {
          session_earnings_denarii: (existing[0].session_earnings_denarii || 0) + creatorEarning,
          session_gifts_count: (existing[0].session_gifts_count || 0) + qty,
          total_earnings_denarii: (existing[0].total_earnings_denarii || 0) + creatorEarning,
          total_gifts_received: (existing[0].total_gifts_received || 0) + qty,
          last_gift_at: new Date().toISOString(),
        });
      }
    }).catch(e => console.warn('[sendGift] BroadcasterEarnings update failed:', e.message));

    console.log(`[sendGift] ${user.email} → ${creator.display_name}: ${qty}x ${gift.name} (${totalCost} denarii, creator gets ${creatorEarning} @ ${effectiveSharePct}%)`);

    return Response.json({
      success: true,
      gift: { id: gift.id, name: gift.name, icon: gift.icon },
      quantity: qty,
      totalCost,
      creatorEarning,
      creatorSharePercent: effectiveSharePct,
      newBalance: newSenderBalance,
      hasVideoGift: !!videoGiftData,
      videoGiftUrl: videoGiftData?.video_url || null
    });

  } catch (error) {
    console.error('[sendGift] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});