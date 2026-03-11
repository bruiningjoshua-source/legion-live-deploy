import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// Platform economics: 260 Denarii sold per $1 USD; creator earns 60% of gift value.
// DENARII_TO_USD already encapsulates the creator share — do NOT multiply by CREATOR_SHARE again.
const DENARII_PER_USD = 260;
const CREATOR_SHARE = 0.60;
const PLATFORM_FEE = 1 - CREATOR_SHARE; // 0.40 — used for metadata only
const DENARII_TO_USD = (1 / DENARII_PER_USD) * CREATOR_SHARE; // ~$0.002308 per Denarii
const MIN_PAYOUT_DENARII = 2600; // ~$6.00 minimum

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      console.error('[stripeConnectPayout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, amountDenarii } = await req.json();

    if (!creatorId || !amountDenarii) {
      return Response.json({ error: 'Missing creatorId or amountDenarii' }, { status: 400 });
    }

    if (amountDenarii < MIN_PAYOUT_DENARII) {
      return Response.json({
        error: `Minimum payout is ${MIN_PAYOUT_DENARII} Denarii ($${(MIN_PAYOUT_DENARII * DENARII_TO_USD).toFixed(2)})`
      }, { status: 400 });
    }

    // Verify requesting user owns this creator profile
    const creators = await base44.entities.Creator.filter({ id: creatorId, user_email: user.email }, null, 1);
    if (!creators[0]) {
      console.error('[stripeConnectPayout] Creator not found for user:', user.email);
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    const creator = creators[0];

    if ((creator.total_earnings_denarii || 0) < amountDenarii) {
      return Response.json({ error: 'Insufficient earnings balance' }, { status: 400 });
    }

    // Also verify the creator's Wallet has sufficient Denarii
    const wallets = await base44.asServiceRole.entities.Wallet.filter({ user_email: user.email }, null, 1);
    if (!wallets[0] || (wallets[0].denarii_balance || 0) < amountDenarii) {
      return Response.json({ error: 'Insufficient wallet balance' }, { status: 400 });
    }
    const wallet = wallets[0];

    // Require verified Stripe Connect account with payouts enabled
    const methods = await base44.entities.CreatorPayoutMethod.filter(
      { creator_id: creatorId, method_type: 'stripe_connect', stripe_payouts_enabled: true }, null, 1
    );
    if (!methods[0]) {
      return Response.json({
        error: 'Stripe Connect not set up or payouts not enabled. Please complete KYC verification first.'
      }, { status: 400 });
    }

    const stripeAccountId = methods[0].stripe_account_id;
    // DENARII_TO_USD already includes the creator share — no additional multiplication needed
    const payoutUsd = amountDenarii * DENARII_TO_USD;
    const payoutCents = Math.round(payoutUsd * 100);

    if (payoutCents < 100) {
      return Response.json({ error: 'Payout amount too small (minimum $1.00)' }, { status: 400 });
    }

    console.log('[stripeConnectPayout] Processing transfer:', {
      creatorId, amountDenarii, payoutUsd: `$${payoutUsd.toFixed(2)}`, stripeAccountId
    });

    const transfer = await stripe.transfers.create({
      amount: payoutCents,
      currency: 'usd',
      destination: stripeAccountId,
      transfer_group: `creator_payout_${creatorId}`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        creator_id: creatorId,
        denarii_amount: String(amountDenarii),
        user_email: user.email,
        platform_fee_pct: String(PLATFORM_FEE * 100),
        creator_share_pct: String(CREATOR_SHARE * 100),
      }
    });

    console.log('[stripeConnectPayout] Transfer created:', transfer.id);

    // Deduct from both the earnings counter and the spendable Wallet
    await base44.entities.Creator.update(creatorId, {
      total_earnings_denarii: (creator.total_earnings_denarii || 0) - amountDenarii
    });
    await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      denarii_balance: (wallet.denarii_balance || 0) - amountDenarii
    });

    await base44.entities.CreatorPayout.create({
      creator_id: creatorId,
      user_email: user.email,
      amount_denarii: amountDenarii,
      payout_usd: payoutUsd,
      payout_method: 'stripe_connect',
      payout_identifier: stripeAccountId,
      stripe_transfer_id: transfer.id,
      status: 'completed'
    });

    base44.asServiceRole.functions.invoke('transactionalEmail', {
      action: 'send_payout_notification',
      creatorEmail: user.email,
      creatorName: creator.display_name || user.full_name || user.email,
      amount: payoutUsd.toFixed(2),
      payoutMethod: 'Bank Transfer (Stripe Connect)',
      reference: transfer.id
    }).catch(e => console.warn('[stripeConnectPayout] Payout email failed:', e.message));

    console.log('[stripeConnectPayout] Payout completed:', transfer.id);
    return Response.json({
      success: true,
      transfer_id: transfer.id,
      amount_usd: payoutUsd,
      amount_denarii: amountDenarii,
      message: `$${payoutUsd.toFixed(2)} transfer initiated. Funds arrive in 1-2 business days.`
    });

  } catch (error) {
    console.error('[stripeConnectPayout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});