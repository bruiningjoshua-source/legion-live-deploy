/* eslint-disable no-undef */
// ═══ CONVERTED: stripeConnectWebhook ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event;
    try { event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret); }
    catch (err) { console.error('[stripeConnectWebhook] Sig failed:', err.message); return new Response('Webhook signature failed', { status: 400 }); }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));

    if (event.type === 'account.updated') {
      const account = event.data.object;
      const creatorId = account.metadata?.creator_id;
      if (!creatorId) return Response.json({ received: true });
      const { data: methods } = await supabase.from('creator_payout_method').select('id').eq('creator_id', creatorId).eq('method_type', 'stripe_connect').eq('stripe_account_id', account.id).limit(1);
      if ((methods||[])[0]) {
        await supabase.from('creator_payout_method').update({ stripe_onboarding_complete: account.details_submitted, stripe_payouts_enabled: account.payouts_enabled, is_verified: account.payouts_enabled }).eq('id', methods[0].id);
        await supabase.from('creator').update({ kyc_status: account.payouts_enabled ? 'verified' : account.details_submitted ? 'pending' : 'not_started' }).eq('id', creatorId);
      }
    }
    if (event.type === 'payout.failed') { const p = event.data.object; console.error('[stripeConnectWebhook] Payout FAILED:', p.id, p.failure_message); }
    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});