/**
 * GiftService — Server-side gift transactions via backend function.
 * All balance checks, deductions, and credits happen atomically on the server.
 */
import { base44 } from '@/api/base44Client';
import { CURRENCY, ERROR } from './constants';
import RateLimitService from './RateLimitService';

class GiftService {
  /** Send a gift via the atomic server-side sendGift function */
  async sendGift({ user, wallet, gift, quantity, creator, stream, creatorCanReceiveGifts }) {
    // Client-side pre-validation (fast feedback before network round-trip)
    if (!user || !wallet) throw new Error('Please sign in to send gifts');

    const rateCheck = RateLimitService.checkGiftSend(user.email);
    if (!rateCheck.allowed) {
      throw new Error(`Gift cooldown! Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
    }

    if (!creatorCanReceiveGifts) throw new Error(ERROR.MONETIZATION_DISABLED);
    if (stream?.status !== 'live') throw new Error(ERROR.STREAM_ENDED);
    if (quantity < 1 || quantity > CURRENCY.MAX_GIFT_QUANTITY) throw new Error(ERROR.INVALID_INPUT);
    if (user.email === creator.user_email) throw new Error(ERROR.SELF_ACTION);

    const totalCost = (gift.cost_denarii || 0) * quantity;
    if (totalCost <= 0) throw new Error(ERROR.INVALID_INPUT);
    if (totalCost > (wallet.denarii_balance || 0)) throw new Error(ERROR.INSUFFICIENT_BALANCE);

    // Server-side atomic transaction
    const response = await base44.functions.invoke('sendGift', {
      giftId: gift.id,
      quantity,
      creatorId: creator.id,
      streamId: stream.id,
    });

    const result = response.data;
    if (result.error) {
      throw new Error(result.error);
    }

    return {
      gift: result.gift || gift,
      quantity: result.quantity || quantity,
      totalCost: result.totalCost || totalCost,
      creatorEarning: result.creatorEarning || 0,
      newBalance: result.newBalance,
    };
  }
}

export default new GiftService();