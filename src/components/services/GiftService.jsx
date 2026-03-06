/**
 * GiftService — Centralized gift/monetization operations.
 * Equivalent to a dedicated monetization microservice.
 */
import { base44 } from '@/api/base44Client';
import { CURRENCY, FEES, ERROR } from './constants';
import RateLimitService from './RateLimitService';

class GiftService {
  /** Send a gift with full validation and side effects */
  async sendGift({ user, wallet, gift, quantity, creator, stream, creatorCanReceiveGifts }) {
    // Validate
    if (!user || !wallet) throw new Error('Please sign in to send gifts');
    
    // Rate limit: max 10 gift sends per 10 seconds
    const rateCheck = RateLimitService.checkGiftSend(user.email);
    if (!rateCheck.allowed) {
      throw new Error(`Gift cooldown! Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
    }
    
    if (!creatorCanReceiveGifts) throw new Error(ERROR.MONETIZATION_DISABLED);
    if (stream?.status !== 'live') throw new Error(ERROR.STREAM_ENDED);
    if (quantity < 1 || quantity > CURRENCY.MAX_GIFT_QUANTITY) throw new Error(ERROR.INVALID_INPUT);
    if (user.email === creator.user_email) throw new Error(ERROR.SELF_ACTION);

    const totalCost = (gift.cost_denarii || 0) * quantity;
    if (totalCost > (wallet.denarii_balance || 0)) throw new Error(ERROR.INSUFFICIENT_BALANCE);

    // Record transaction
    await base44.entities.GiftTransaction.create({
      sender_email: user.email,
      receiver_creator_id: creator.id,
      stream_id: stream.id,
      gift_id: gift.id,
      gift_name: gift.name,
      quantity,
      total_as_value: totalCost,
      is_pk_gift: stream.stream_type === 'pk_battle',
    });

    // Deduct from sender
    await base44.entities.Wallet.update(wallet.id, {
      denarii_balance: (wallet.denarii_balance || 0) - totalCost,
    });

    // Credit creator
    const creatorEarning = Math.floor(totalCost * FEES.GIFT_CREATOR_SHARE);
    await base44.entities.Creator.update(creator.id, {
      total_earnings_denarii: (creator.total_earnings_denarii || 0) + creatorEarning,
    });

    // Update broadcaster earnings
    try {
      const existing = await base44.entities.BroadcasterEarnings.filter({ creator_id: creator.id }, null, 1);
      if (existing[0]) {
        await base44.entities.BroadcasterEarnings.update(existing[0].id, {
          session_earnings_denarii: (existing[0].session_earnings_denarii || 0) + creatorEarning,
          session_gifts_count: (existing[0].session_gifts_count || 0) + quantity,
          total_earnings_denarii: (existing[0].total_earnings_denarii || 0) + creatorEarning,
          total_gifts_received: (existing[0].total_gifts_received || 0) + quantity,
          last_gift_at: new Date().toISOString(),
        });
      } else {
        await base44.entities.BroadcasterEarnings.create({
          creator_id: creator.id,
          user_email: creator.user_email,
          stream_id: stream.id,
          session_earnings_denarii: creatorEarning,
          session_gifts_count: quantity,
          total_earnings_denarii: creatorEarning,
          total_gifts_received: quantity,
          session_start_time: new Date().toISOString(),
          last_gift_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error('[GiftService] BroadcasterEarnings update failed:', e);
    }

    // Post chat message
    await base44.entities.ChatMessage.create({
      stream_id: stream.id,
      sender_email: user.email,
      sender_name: user.full_name || 'Anonymous',
      message: `sent ${quantity > 1 ? quantity + 'x ' : ''}${gift.name}`,
      message_type: 'gift',
      vip_level: wallet?.vip_level || 0,
      gift_data: { gift_name: gift.name, gift_icon: gift.icon, quantity },
    });

    // Update stream totals
    await base44.entities.Stream.update(stream.id, {
      total_gifts_received: (stream.total_gifts_received || 0) + quantity,
      total_denarii_earned: (stream.total_denarii_earned || 0) + creatorEarning,
    });

    return { gift, quantity, totalCost, creatorEarning };
  }
}

export default new GiftService();