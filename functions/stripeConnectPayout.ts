import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

/**
 * HARDENED: Execute Stripe Connect transfer for a verified payout
 *
 * Platform economics (canonical):
 *   180 Denarii = $1 USD sold to viewers
 *   Creator earns 60% of gift value received
 *   => DENARII_TO_USD = (1/180) * 0.60 = ~$0.003333 per Denarii earned
 *
 * This function is the EXECUTION layer — it should only be called after
 * processPayoutWithKyc has created a payout record in pending_review status.
 * In production, an admin approval step should trigger this via automation.
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia'
});

const DENARII_PER_USD = 180;
const CREATOR_SHARE = 0.60;
const DENARII_TO_USD = (1 / DENARII_PER_USD) * CREATOR_SHARE; // ~$0.003333
const MIN_PAYOUT_CENTS = 100; // $1.00

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      console.error('[stripeConnectPayout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, amountDenarii, payoutId } = await req.json();

    // ── Input validation ─────────────────────────────────────────────────
    if (!creatorId || !amountDenarii) {
      return Response.json({ error: 'Missing creatorId or amountDenarii' }, { status: 400 });
    }
    if (typeof amountDenarii !== 'number' || amountDenarii <= 0) {
      return Response.json({ error: 'amountDenarii must be a positive number' }, { status: 400 });
    }

    // ── Verify ownership — user must own this creator profile ────────────
    const creators = await base44.entities.Creator.filter(
      { id: creatorId, user_email: user.email }, null, 1
    );
    if (!creators[0]) {
      console.error('[stripeConnectPayout] Creator not found for user:', user.email, 'creatorId:', creatorId);
      return Response.json({ error: 'Creator not found or access denied' }, { status: 403 });
    }
    const creator = creators[0];

    // ── KYC gate ─────────────────────────────────────────────────────────
    if (creator.kyc_status !== 'verified') {
      return Response.json({
        error: 'Identity verification required before payouts. Complete KYC in Settings.',
        kyc_status: creator.kyc_status
      }, { status: 403 });
    }

    // ── Verify earnings balance ───────────────────────────────────────────
    const earningsDenarii = creator.total_earnings_denarii || 0;
    if (amountDenarii > earningsDenarii) {
      return Response.json({
        error: 'Insufficient earnings balance',
        requested: amountDenarii,
        available: earningsDenarii
      }, { status: 400 });
    }

    // ── Verify Stripe Connect account ─────────────────────────────────────
    const methods = await base44.asServiceRole.entities.CreatorPayoutMethod.filter(
      { creator_id: creatorId, method_type: 'stripe_connect', stripe_payouts_enabled: true },
      null, 1
    );
    if (!methods[0]?.stripe_account_id) {
      return Response.json({
        error: 'Stripe Connect not set up or payouts not enabled. Complete KYC setup first.'
      }, { status: 400 });
    }
    const stripeAccountId = methods[0].stripe_account_id;

    // ── Calculate payout amount ───────────────────────────────────────────
    const payoutUsd = amountDenarii * DENARII_TO_USD;
    const payoutCents = Math.round(payoutUsd * 100);

    if (payoutCents < MIN_PAYOUT_CENTS) {
      return Response.json({
        error: `Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)} USD`,
        cents: payoutCents
      }, { status: 400 });
    }

    console.log('[stripeConnectPayout] Initiating transfer:', {
      creatorId, amountDenarii, payoutUsd: payoutUsd.toFixed(4), stripeAccountId, payoutCents
    });

    // ── Execute Stripe transfer ───────────────────────────────────────────
    const transfer = await stripe.transfers.create({
      amount: payoutCents,
      currency: 'usd',
      destination: stripeAccountId,
      transfer_group: `creator_payout_${creatorId}_${Date.now()}`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        creator_id: creatorId,
        user_email: user.email,
        denarii_amount: String(amountDenarii),
        platform_fee_pct: '40',
        creator_share_pct: '60',
        denarii_per_usd: '180',
        payout_id: payoutId || 'direct',
      }
    });

    console.log('[stripeConnectPayout] Transfer created:', transfer.id);

    // ── Atomic balance deduction ──────────────────────────────────────────
    // Deduct from creator earnings only (Wallet is viewer spending, not creator earnings)
    const newEarnings = Math.max(0, earningsDenarii - amountDenarii);
    await base44.asServiceRole.entities.Creator.update(creatorId, {
      total_earnings_denarii: newEarnings
    });

    // ── Record payout ─────────────────────────────────────────────────────
    const payoutRecord = await base44.asServiceRole.entities.CreatorPayout.create({
      creator_id: creatorId,
      user_email: user.email,
      amount_denarii: amountDenarii,
      payout_usd: payoutUsd,
      payout_method: 'stripe_connect',
      payout_identifier: stripeAccountId,
      stripe_transfer_id: transfer.id,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    // ── Update existing payout record status if provided ─────────────────
    if (payoutId) {
      base44.asServiceRole.entities.CreatorPayout.update(payoutId, {
        status: 'completed',
        stripe_transfer_id: transfer.id,
        completed_at: new Date().toISOString(),
      }).catch(e => console.warn('[stripeConnectPayout] Payout record update failed:', e.message));
    }

    // ── Audit log ─────────────────────────────────────────────────────────
    base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: user.email,
      action: 'payout',
      amount_denarii: -amountDenarii,
      previous_balance: earningsDenarii,
      new_balance: newEarnings,
      related_entity_id: payoutRecord.id,
      reason: `Stripe Connect payout: $${payoutUsd.toFixed(2)} USD | transfer=${transfer.id}`,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      timestamp_utc: new Date().toISOString(),
    }).catch(e => console.warn('[stripeConnectPayout] Audit log failed:', e.message));

    // ── Payout notification email ─────────────────────────────────────────
    base44.asServiceRole.functions.invoke('transactionalEmail', {
      action: 'send_payout_notification',
      creatorEmail: user.email,
      creatorName: creator.display_name || user.full_name || user.email,
      amount: payoutUsd.toFixed(2),
      payoutMethod: 'Bank Transfer (Stripe Connect)',
      reference: transfer.id
    }).catch(e => console.warn('[stripeConnectPayout] Payout email failed:', e.message));

    console.log('[stripeConnectPayout] Complete:', transfer.id, `$${payoutUsd.toFixed(2)}`);

    return Response.json({
      success: true,
      transfer_id: transfer.id,
      amount_usd: payoutUsd,
      amount_usd_display: `$${payoutUsd.toFixed(2)}`,
      amount_denarii: amountDenarii,
      remaining_earnings_denarii: newEarnings,
      message: `$${payoutUsd.toFixed(2)} transfer initiated. Funds arrive in 1–2 business days.`
    });

  } catch (error) {
    console.error('[stripeConnectPayout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});