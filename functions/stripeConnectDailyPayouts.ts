import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

// Automated daily payout job — triggered by a scheduled automation.
// Processes all creators with verified Stripe Connect accounts
// who have a pending balance above the minimum threshold.

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// DENARII_TO_USD already encapsulates the 60% creator share — do NOT multiply by CREATOR_SHARE again.
// 260 Denarii per $1 USD * 60% creator share = $0.002308 per Denarii
const DENARII_TO_USD = (1 / 260) * 0.60; // ~$0.002308
const MIN_AUTO_PAYOUT_DENARII = 5000; // ~$11.50 minimum for auto-payout

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Must be admin or scheduled automation
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[stripeConnectDailyPayouts] Starting daily payout run...');

    // Get all verified Stripe Connect methods with payouts enabled
    const verifiedMethods = await base44.asServiceRole.entities.CreatorPayoutMethod.filter(
      { method_type: 'stripe_connect', stripe_payouts_enabled: true },
      null, 500
    );

    console.log(`[stripeConnectDailyPayouts] Found ${verifiedMethods.length} verified accounts`);

    const results = { processed: 0, skipped: 0, errors: 0, totalUsd: 0 };

    for (const method of verifiedMethods) {
      try {
        // Get creator balance
        const creators = await base44.asServiceRole.entities.Creator.filter(
          { id: method.creator_id }, null, 1
        );
        const creator = creators[0];
        if (!creator) { results.skipped++; continue; }

        const balance = creator.total_earnings_denarii || 0;

        // Skip if below auto-payout threshold
        if (balance < MIN_AUTO_PAYOUT_DENARII) {
          results.skipped++;
          continue;
        }

        const payoutUsd = balance * DENARII_TO_USD;
        const payoutCents = Math.round(payoutUsd * 100);

        if (payoutCents < 100) { results.skipped++; continue; }

        console.log(`[stripeConnectDailyPayouts] Processing: creator=${method.creator_id} balance=${balance} → $${payoutUsd.toFixed(2)}`);

        // Create Stripe transfer
        const transfer = await stripe.transfers.create({
          amount: payoutCents,
          currency: 'usd',
          destination: method.stripe_account_id,
          transfer_group: `auto_daily_${new Date().toISOString().split('T')[0]}`,
          metadata: {
            base44_app_id: Deno.env.get("BASE44_APP_ID"),
            creator_id: method.creator_id,
            denarii_amount: String(balance),
            auto_payout: 'true',
            payout_date: new Date().toISOString()
          }
        });

        // Deduct balance
        await base44.asServiceRole.entities.Creator.update(method.creator_id, {
          total_earnings_denarii: 0
        });

        // Record payout
        await base44.asServiceRole.entities.CreatorPayout.create({
          creator_id: method.creator_id,
          user_email: creator.user_email,
          amount_denarii: balance,
          payout_usd: payoutUsd,
          payout_method: 'stripe_connect_auto',
          payout_identifier: method.stripe_account_id,
          stripe_transfer_id: transfer.id,
          status: 'completed'
        });

        results.processed++;
        results.totalUsd += payoutUsd;

        console.log(`[stripeConnectDailyPayouts] ✓ Transfer ${transfer.id} | $${payoutUsd.toFixed(2)} → ${method.stripe_account_id}`);

      } catch (err) {
        console.error(`[stripeConnectDailyPayouts] Error for creator ${method.creator_id}:`, err.message);
        results.errors++;
      }
    }

    console.log('[stripeConnectDailyPayouts] Run complete:', results);
    return Response.json({
      success: true,
      ...results,
      totalUsd: `$${results.totalUsd.toFixed(2)}`,
      run_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[stripeConnectDailyPayouts] Fatal error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});