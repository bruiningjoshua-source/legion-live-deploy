/**
 * WalletService — Centralized wallet/currency operations.
 * Equivalent to a dedicated payments microservice.
 */
import { base44 } from '@/api/base44Client';
import { CURRENCY, ERROR } from './constants';

class WalletService {
  /** Get or create wallet for a user (with duplicate protection) */
  async getOrCreateWallet(userEmail) {
    if (!userEmail) return null;
    const wallets = await base44.entities.Wallet.filter({ user_email: userEmail }, null, 1);
    if (wallets.length > 0) return wallets[0];

    // Race-condition guard: re-check before creating
    const recheck = await base44.entities.Wallet.filter({ user_email: userEmail }, null, 1);
    if (recheck.length > 0) return recheck[0];

    return base44.entities.Wallet.create({
      user_email: userEmail,
      denarii_balance: CURRENCY.STARTER_BALANCE,
      sestertii_balance: 0,
      as_balance: 0,
    });
  }

  /** Validate that the wallet has sufficient balance */
  validateBalance(wallet, requiredDenarii) {
    if (!wallet) throw new Error(ERROR.UNAUTHORIZED);
    if ((wallet.denarii_balance || 0) < requiredDenarii) {
      throw new Error(ERROR.INSUFFICIENT_BALANCE);
    }
    return true;
  }

  /** Deduct denarii from wallet */
  async deduct(walletId, currentBalance, amount) {
    return base44.entities.Wallet.update(walletId, {
      denarii_balance: Math.max(0, (currentBalance || 0) - amount),
    });
  }

  /** Create Stripe checkout for Denarii purchase */
  async createCheckout(params) {
    const { packageId, denarii, bonus, price, packageName } = params;
    if (!packageId || !denarii || !price) throw new Error(ERROR.INVALID_INPUT);
    if (price <= 0 || price > 10000) throw new Error(ERROR.INVALID_INPUT);
    if (denarii <= 0 || denarii > 1000000) throw new Error(ERROR.INVALID_INPUT);

    // Block checkout in iframes (required for Stripe)
    if (window !== window.top) {
      throw new Error('Purchases only work from the published app. Please open in a new tab.');
    }

    return base44.functions.invoke('createDenariiCheckout', {
      packageId, denarii, bonus, price, packageName,
    });
  }
}

export default new WalletService();