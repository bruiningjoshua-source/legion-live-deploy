/* eslint-disable no-undef */
// ═══ CONVERTED: sendGift — Base44 → Supabase Edge Function ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

const GIFT_CREATOR_SHARE_BASE = 0.60;
const MAX_GIFT_QUANTITY = 100;

const fraudActivity = new Map();

async function checkGiftRate(supabase, email) {
  const now = Date.now();
  const windowMs = 10000;
  const maxCount = 10;
  const { data: logs } = await supabase
    .from('wallet_audit_log')
    .select('*')
    .eq('user_email', email)
    .eq('action', 'rate_limit_check')
    .eq('reason', 'rate_limit:sendGift')
    .order('timestamp_utc', { ascending: false })
    .limit(1);
  const record = (logs || [])[0];
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
  supabase.from('wallet_audit_log').insert({
    user_email: email,
    action: 'rate_limit_check',
    amount_denarii: 0,
    new_balance: 0,
    related_entity_id: JSON.stringify({ count, resetAt }),
    reason: 'rate_limit:sendGift',
    timestamp_utc: new Date().toISOString()
  }).then(() => {}).catch(() => {});
  return { allowed: true };
}

function detectGiftFraud(email, quantity, totalCost) {
  if (!fraudActivity.has(email)) fraudActivity.set(email, { gifts: [] });
  const activity = fraudActivity.get(email);
  const now = Date.now();
  activity.gifts = activity.gifts.filter(t => t.timestamp > now - 86400000);
  let riskScore = 0;
  const flags = [];
  const recentGifts = activity.gifts.filter(t => t.timestamp > now - 3600000);
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

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // Auth: get user from JWT
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Get full user profile
    const { data: userProfile } = await supabase
      .from('user')
      .select('*')
      .eq('email', authUser.email)
      .single();
    const user = { ...authUser, ...userProfile };

    const { giftId, quantity, creatorId, streamId, csrfToken } = await req.json();

    const validation = validateGiftInput(giftId, quantity, creatorId, streamId);
    if (!validation.valid) {
      return Response.json({ error: 'Invalid input', details: validation.errors }, { status: 400 });
    }
    const qty = validation.quantity;

    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) {
      return Response.json({ error: 'Missing or invalid CSRF token' }, { status: 403 });
    }

    const rateCheck = await checkGiftRate(supabase, user.email);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Rate limited', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    const fraud = detectGiftFraud(user.email, qty, 0);
    if (fraud.riskScore >= 75) {
      console.warn(`[sendGift] FRAUD FLAG for ${user.email}:`, fraud.flags);
    }

    // Parallel fetches
    const [giftsRes, streamsRes, creatorsRes, walletsRes] = await Promise.all([
      supabase.from('gift').select('*').eq('id', giftId).eq('is_active', true).limit(1),
      supabase.from('stream').select('*').eq('id', streamId).limit(1),
      supabase.from('creator').select('*').eq('id', creatorId).limit(1),
      supabase.from('wallet').select('*').eq('user_email', user.email).limit(1),
    ]);

    const gift = (giftsRes.data || [])[0];
    const stream = (streamsRes.data || [])[0];
    const creator = (creatorsRes.data || [])[0];
    const wallet = (walletsRes.data || [])[0];

    if (!gift) return Response.json({ error: 'Gift not found or inactive' }, { status: 404 });
    if (!stream || stream.status !== 'live') return Response.json({ error: 'Stream is not live' }, { status: 400 });
    if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });
    if (!wallet) return Response.json({ error: 'Wallet not found' }, { status: 404 });
    if (user.email === creator.user_email) return Response.json({ error: 'Cannot gift yourself' }, { status: 400 });

    const { data: subCheck } = await supabase
      .from('creator_subscription')
      .select('*')
      .eq('user_email', creator.user_email)
      .eq('status', 'active')
      .limit(1);
    const { data: userCheck } = await supabase
      .from('user')
      .select('role')
      .eq('email', creator.user_email)
      .limit(1);
    const isAdmin = (userCheck || [])[0]?.role === 'admin';
    if (!(subCheck || [])[0] && !isAdmin) {
      return Response.json({ error: 'Creator has not enabled monetization' }, { status: 400 });
    }

    const totalCost = (gift.cost_denarii || 0) * qty;
    if (totalCost <= 0) return Response.json({ error: 'Invalid gift cost' }, { status: 400 });

    // Re-fetch wallet for freshest balance
    const { data: freshWallets } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_email', user.email)
      .limit(1);
    if (!(freshWallets || [])[0] || ((freshWallets[0].denarii_balance || 0) < totalCost)) {
      return Response.json({
        error: 'Insufficient balance',
        required: totalCost,
        balance: freshWallets?.[0]?.denarii_balance || 0
      }, { status: 400 });
    }
    const freshWallet = freshWallets[0];

    const newSenderBalance = (freshWallet.denarii_balance || 0) - totalCost;
    const newTotalSpent = (freshWallet.total_spent || 0) + totalCost;
    const newVipPoints = (freshWallet.vip_points || 0) + Math.floor(totalCost / 10);
    await supabase.from('wallet').update({
      denarii_balance: newSenderBalance,
      total_spent: newTotalSpent,
      vip_points: newVipPoints,
    }).eq('id', freshWallet.id);

    // Audit log (non-blocking)
    supabase.from('wallet_audit_log').insert({
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
    }).then(() => {}).catch(e => console.warn('[sendGift] Sender audit log failed:', e.message));

    const isPK = stream.stream_type === 'pk_battle';
    const { data: txn } = await supabase.from('gift_transaction').insert({
      sender_email: user.email,
      receiver_creator_id: creatorId,
      stream_id: streamId,
      gift_id: giftId,
      gift_name: gift.name,
      quantity: qty,
      total_as_value: totalCost,
      is_pk_gift: isPK,
    }).select().single();

    // Creator share calculation
    const { data: guarantees } = await supabase
      .from('creator_guarantee')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('is_active', true)
      .limit(1);
    const now = new Date().toISOString();
    const activeGuarantee = (guarantees || []).find(g => g.start_date <= now && g.end_date >= now);
    const effectiveSharePct = activeGuarantee?.guaranteed_share_percent ?? (GIFT_CREATOR_SHARE_BASE * 100);
    const creatorEarning = Math.floor(totalCost * (effectiveSharePct / 100));

    // Credit creator
    await supabase.from('creator').update({
      total_earnings_denarii: (creator.total_earnings_denarii || 0) + creatorEarning,
    }).eq('id', creatorId);

    // Credit creator wallet
    const { data: creatorWallets } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_email', creator.user_email)
      .limit(1);
    if ((creatorWallets || [])[0]) {
      const cw = creatorWallets[0];
      const newCreatorBalance = (cw.denarii_balance || 0) + creatorEarning;
      await supabase.from('wallet').update({
        denarii_balance: newCreatorBalance,
        total_earned: (cw.total_earned || 0) + creatorEarning,
      }).eq('id', cw.id);

      supabase.from('wallet_audit_log').insert({
        user_email: creator.user_email,
        wallet_id: cw.id,
        action: 'gift_receive',
        amount_denarii: creatorEarning,
        previous_balance: cw.denarii_balance || 0,
        new_balance: newCreatorBalance,
        related_entity_id: txn?.id,
        reason: `Received ${qty}x ${gift.name} (${effectiveSharePct}% share)`,
        timestamp_utc: new Date().toISOString()
      }).then(() => {}).catch(e => console.warn('[sendGift] Creator audit log failed:', e.message));
    }

    // Update stream stats
    await supabase.from('stream').update({
      total_gifts_received: (stream.total_gifts_received || 0) + qty,
      total_denarii_earned: (stream.total_denarii_earned || 0) + creatorEarning,
    }).eq('id', streamId);

    // Check for AI video gift (non-blocking)
    const { data: videoGifts } = await supabase
      .from('ai_video_gift')
      .select('*')
      .eq('gift_id', giftId)
      .eq('is_active', true)
      .limit(1);
    const videoGiftData = (videoGifts || [])[0] ? {
      video_url: videoGifts[0].video_url,
      duration_seconds: videoGifts[0].duration_seconds,
    } : null;

    // Chat message (non-blocking)
    supabase.from('chat_message').insert({
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
    }).then(() => {}).catch(e => console.warn('[sendGift] Chat message failed:', e.message));

    // PK Battle scores (non-blocking)
    if (isPK) {
      supabase.from('pk_battle')
        .select('*')
        .eq('stream_id', streamId)
        .eq('status', 'active')
        .order('created_date', { ascending: false })
        .limit(1)
        .then(async ({ data: battles }) => {
          const battle = (battles || [])[0];
          if (battle) {
            const isHost = creatorId === battle.host_creator_id;
            await supabase.from('pk_battle').update(isHost
              ? { host_score: (battle.host_score || 0) + totalCost }
              : { opponent_score: (battle.opponent_score || 0) + totalCost }
            ).eq('id', battle.id);
          }
        }).catch(e => console.warn('[sendGift] PK score update failed:', e.message));
    }

    // BroadcasterEarnings (non-blocking)
    supabase.from('broadcaster_earnings')
      .select('*')
      .eq('creator_id', creatorId)
      .limit(1)
      .then(async ({ data: existing }) => {
        if ((existing || [])[0]) {
          await supabase.from('broadcaster_earnings').update({
            session_earnings_denarii: (existing[0].session_earnings_denarii || 0) + creatorEarning,
            session_gifts_count: (existing[0].session_gifts_count || 0) + qty,
            total_earnings_denarii: (existing[0].total_earnings_denarii || 0) + creatorEarning,
            total_gifts_received: (existing[0].total_gifts_received || 0) + qty,
            last_gift_at: new Date().toISOString(),
          }).eq('id', existing[0].id);
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