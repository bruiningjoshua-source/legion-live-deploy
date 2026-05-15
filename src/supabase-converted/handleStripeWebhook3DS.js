/* eslint-disable no-undef */
// ═══ CONVERTED: handleStripeWebhook3DS ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!WEBHOOK_SECRET || !signature) return Response.json({ error: 'Webhook misconfigured' }, { status: 400 });
    let event;
    try { event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET); }
    catch (err) { return Response.json({ error: 'Invalid signature' }, { status: 401 }); }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      if (charge.payment_method_details?.card?.three_d_secure?.authenticated) {
        const { data: assessments } = await supabase.from('payment_risk_assessment').select('id').eq('payment_intent_id', charge.payment_intent).limit(1);
        if ((assessments||[])[0]) await supabase.from('payment_risk_assessment').update({ sca_completed: true }).eq('id', assessments[0].id).catch(() => {});
      }
    }
    if (event.type === 'payment_intent.requires_action') {
      const pi = event.data.object;
      if (pi.metadata?.user_email) await supabase.from('notification').insert({ user_email: pi.metadata.user_email, type: 'payment_requires_action', title: 'Verify Your Payment', message: 'Additional authentication required.', is_read: false }).catch(() => {});
    }
    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});