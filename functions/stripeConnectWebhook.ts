import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// This webhook handles Stripe Connect account updates so KYC/payout status
// stays in sync automatically without creators needing to refresh.
Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      console.error('[stripeConnectWebhook] Signature verification failed:', err.message);
      return new Response('Webhook signature failed', { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    console.log('[stripeConnectWebhook] Event type:', event.type);

    // ── Account updated (KYC status change) ──────────────────────────────────
    if (event.type === 'account.updated') {
      const account = event.data.object;
      const creatorId = account.metadata?.creator_id;
      if (!creatorId) {
        console.log('[stripeConnectWebhook] No creator_id in metadata, skipping');
        return Response.json({ received: true });
      }

      const methods = await base44.asServiceRole.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect', stripe_account_id: account.id },
        null, 1
      );

      if (methods[0]) {
        const payoutsEnabled = account.payouts_enabled;
        const detailsSubmitted = account.details_submitted;

        await base44.asServiceRole.entities.CreatorPayoutMethod.update(methods[0].id, {
          stripe_onboarding_complete: detailsSubmitted,
          stripe_payouts_enabled: payoutsEnabled,
          is_verified: payoutsEnabled
        });

        // Sync KYC on creator
        const kycStatus = payoutsEnabled ? 'verified' : detailsSubmitted ? 'pending' : 'not_started';
        await base44.asServiceRole.entities.Creator.update(creatorId, {
          kyc_status: kycStatus,
          kyc_reviewed_at: payoutsEnabled ? new Date().toISOString() : undefined
        });

        console.log('[stripeConnectWebhook] Account updated:', account.id, '| KYC:', kycStatus, '| Payouts:', payoutsEnabled);
      }
    }

    // ── Payout paid out to creator's bank ────────────────────────────────────
    if (event.type === 'payout.paid') {
      const payout = event.data.object;
      console.log('[stripeConnectWebhook] Payout paid to bank:', payout.id, `$${(payout.amount/100).toFixed(2)}`);
      // Payout is confirmed — update any pending records if needed
    }

    // ── Payout failed ────────────────────────────────────────────────────────
    if (event.type === 'payout.failed') {
      const payout = event.data.object;
      console.error('[stripeConnectWebhook] Payout FAILED:', payout.id, payout.failure_message);
      // Could update CreatorPayout record to 'failed' status here
    }

    // ── Transfer created confirmation ────────────────────────────────────────
    if (event.type === 'transfer.created') {
      const transfer = event.data.object;
      const creatorId = transfer.metadata?.creator_id;
      console.log('[stripeConnectWebhook] Transfer confirmed:', transfer.id, `$${(transfer.amount/100).toFixed(2)}`, 'creator:', creatorId);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('[stripeConnectWebhook] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});