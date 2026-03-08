import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

/**
 * Process creator payout via Stripe Connect.
 * Only allowed if KYC is verified.
 * Converts pending_withdrawal Denarii to USD at 180:1 rate.
 */

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

const DENARII_PER_USD = 180;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount_denarii } = await req.json();
    if (!amount_denarii || amount_denarii <= 0) {
      return Response.json({ error: 'Invalid payout amount' }, { status: 400 });
    }

    // ── KYC Gate ──
    const creators = await base44.asServiceRole.entities.Creator.filter(
      { user_email: user.email }, null, 1
    );

    if (!creators[0]) {
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }

    const creator = creators[0];
    if (creator.kyc_status !== 'verified') {
      return Response.json({
        error: 'KYC verification required',
        kyc_status: creator.kyc_status
      }, { status: 403 });
    }

    // ── Check pending balance ──
    const wallet = await base44.asServiceRole.entities.Wallet.filter(
      { user_email: user.email }, null, 1
    );

    if (!wallet[0] || (wallet[0].pending_withdrawal || 0) < amount_denarii) {
      return Response.json({
        error: 'Insufficient pending balance',
        available: wallet[0]?.pending_withdrawal || 0,
        requested: amount_denarii
      }, { status: 400 });
    }

    // ── Convert Denarii to USD ──
    const amountUsd = Math.floor((amount_denarii / DENARII_PER_USD) * 100) / 100;
    const amountCents = Math.round(amountUsd * 100);

    if (amountCents < 50) { // $0.50 minimum
      return Response.json({ error: 'Minimum payout is $0.50', amount_usd: amountUsd }, { status: 400 });
    }

    // ── Create Stripe payout ──
    const stripeCustomerId = creator.stripe_customer_id || user.email;
    const payout = await stripe.payouts.create({
      amount: amountCents,
      currency: 'usd',
      destination: stripeCustomerId,
      statement_descriptor: 'Legion Live Payout',
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        creator_id: creator.id,
        creator_email: user.email,
        denarii_amount: amount_denarii.toString()
      }
    });

    // ── Record payout transaction ──
    await base44.asServiceRole.entities.CreatorPayout.create({
      creator_id: creator.id,
      user_email: user.email,
      amount_denarii: amount_denarii,
      amount_usd: amountUsd,
      stripe_payout_id: payout.id,
      status: 'processing',
      initiated_at: new Date().toISOString()
    });

    // ── Debit pending_withdrawal ──
    await base44.asServiceRole.entities.Wallet.update(wallet[0].id, {
      pending_withdrawal: Math.max(0, (wallet[0].pending_withdrawal || 0) - amount_denarii)
    });

    console.log('[processPayoutWithKyc]', user.email, '→', amountUsd, 'USD (', amount_denarii, 'denarii)', 'payout:', payout.id);

    return Response.json({
      success: true,
      payout_id: payout.id,
      amount_usd: amountUsd,
      amount_denarii: amount_denarii,
      status: 'processing'
    });

  } catch (error) {
    console.error('[processPayoutWithKyc] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});