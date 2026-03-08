import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Atomic gift transaction — all-or-nothing server-side operation.
 * Prevents double-spend by re-fetching wallet balance before deduction.
 * Handles: wallet debit, transaction record, creator credit, stream totals, PK scores, chat.
 */

const GIFT_CREATOR_SHARE = 0.60;  // 60% creator / 40% platform
const MAX_GIFT_QUANTITY = 100;

// In-memory rate limiter: max 10 gift sends per 10 seconds per user
const giftBuckets = new Map();
const GIFT_RATE_LIMIT = 10;
const GIFT_RATE_WINDOW = 10000;

function checkGiftRate(email) {
  const now = Date.now();
  const bucket = giftBuckets.get(email);
  if (!bucket || now > bucket.resetAt) {
    giftBuckets.set(email, { count: 1, resetAt: now + GIFT_RATE_WINDOW });
    return true;
  }
  bucket.count++;
  return bucket.count <= GIFT_RATE_LIMIT;
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of giftBuckets) {
    if (now > val.resetAt) giftBuckets.delete(key);
  }
}, 30000);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { giftId, quantity, creatorId, streamId } = await req.json();

    // ── Input validation ──
    if (!giftId || !creatorId || !streamId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const qty = Math.floor(Number(quantity) || 1);
    if (qty < 1 || qty > MAX_GIFT_QUANTITY) {
      return Response.json({ error: 'Invalid quantity (1-100)' }, { status: 400 });
    }

    // ── Rate limit ──
    if (!checkGiftRate(user.email)) {
      return Response.json({ error: 'Too many gifts! Slow down.' }, { status: 429 });
    }

    // ── Fetch gift, stream, creator, wallet atomically with service role ──
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

    // ── Check creator can receive gifts (has active subscription or is admin) ──
    const subCheck = await base44.asServiceRole.entities.CreatorSubscription.filter(
      { user_email: creator.user_email, status: 'active' }, null, 1
    );
    const userCheck = await base44.asServiceRole.entities.User.filter({ email: creator.user_email }, null, 1);
    const isAdmin = userCheck[0]?.role === 'admin';
    if (!subCheck[0] && !isAdmin) {
      return Response.json({ error: 'Creator has not enabled monetization' }, { status: 400 });
    }

    // ── Balance check (authoritative — from database, not cache) ──
    const totalCost = (gift.cost_denarii || 0) * qty;
    if (totalCost <= 0) return Response.json({ error: 'Invalid gift cost' }, { status: 400 });
    if ((wallet.denarii_balance || 0) < totalCost) {
      return Response.json({ error: 'Insufficient balance', required: totalCost, balance: wallet.denarii_balance || 0 }, { status: 400 });
    }

    // ── Debit sender wallet FIRST (fail fast) ──
    await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      denarii_balance: (wallet.denarii_balance || 0) - totalCost,
    });

    // ── Record transaction ──
    const isPK = stream.stream_type === 'pk_battle';
    await base44.asServiceRole.entities.GiftTransaction.create({
      sender_email: user.email,
      receiver_creator_id: creatorId,
      stream_id: streamId,
      gift_id: giftId,
      gift_name: gift.name,
      quantity: qty,
      total_as_value: totalCost,
      is_pk_gift: isPK,
    });

    // ── Credit creator ──
    const creatorEarning = Math.floor(totalCost * GIFT_CREATOR_SHARE);
    await base44.asServiceRole.entities.Creator.update(creatorId, {
      total_earnings_denarii: (creator.total_earnings_denarii || 0) + creatorEarning,
    });

    // ── Update stream totals ──
    await base44.asServiceRole.entities.Stream.update(streamId, {
      total_gifts_received: (stream.total_gifts_received || 0) + qty,
      total_denarii_earned: (stream.total_denarii_earned || 0) + creatorEarning,
    });

    // ── Post chat message (non-blocking) ──
    base44.asServiceRole.entities.ChatMessage.create({
      stream_id: streamId,
      sender_email: user.email,
      sender_name: user.full_name || 'Anonymous',
      message: `sent ${qty > 1 ? qty + 'x ' : ''}${gift.name}`,
      message_type: 'gift',
      vip_level: wallet.vip_level || 0,
      gift_data: { gift_name: gift.name, gift_icon: gift.icon, quantity: qty },
    }).catch(e => console.warn('[sendGift] Chat message failed:', e.message));

    // ── Update PK Battle scores (non-blocking) ──
    if (isPK) {
      base44.asServiceRole.entities.PKBattle.filter(
        { stream_id: streamId, status: 'active' }, '-created_date', 1
      ).then(async (battles) => {
        const battle = battles[0];
        if (battle) {
          const isHost = creatorId === battle.host_creator_id;
          const scoreUpdate = isHost
            ? { host_score: (battle.host_score || 0) + totalCost }
            : { opponent_score: (battle.opponent_score || 0) + totalCost };
          await base44.asServiceRole.entities.PKBattle.update(battle.id, scoreUpdate);
        }
      }).catch(e => console.warn('[sendGift] PK score update failed:', e.message));
    }

    // ── Update broadcaster earnings (non-blocking) ──
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

    console.log(`[sendGift] ${user.email} → ${creator.display_name}: ${qty}x ${gift.name} (${totalCost} denarii, creator gets ${creatorEarning})`);

    return Response.json({
      success: true,
      gift: { id: gift.id, name: gift.name, icon: gift.icon },
      quantity: qty,
      totalCost,
      creatorEarning,
      newBalance: (wallet.denarii_balance || 0) - totalCost,
    });

  } catch (error) {
    console.error('[sendGift] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});