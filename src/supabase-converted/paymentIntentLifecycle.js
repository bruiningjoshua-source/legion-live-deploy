/* eslint-disable no-undef */
// ═══ CONVERTED: paymentIntentLifecycle ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const { action, paymentIntentId, sessionId, customerEmail, metadata } = await req.json();

    if (action === 'check_status') {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const statusMap = { succeeded: { status: 'succeeded', message: 'Payment successful', amount: intent.amount/100 }, processing: { status: 'processing', message: 'Processing...', retryAfter: 5000 }, requires_payment_method: { status: 'failed', message: 'Card declined. Try another.', requiresRetry: true }, requires_action: { status: 'requires_action', message: 'Auth required.', clientSecret: intent.client_secret, requiresRetry: true }, canceled: { status: 'canceled', message: 'Payment canceled.', requiresRetry: true } };
      return Response.json(statusMap[intent.status] || { status: intent.status, requiresRetry: true });
    }

    if (action === 'create_retry') {
      const original = await stripe.checkout.sessions.retrieve(sessionId);
      if (!original) return Response.json({ error: 'Session not found' }, { status: 404 });
      const retry = await stripe.checkout.sessions.create({ payment_method_types: ['card'], mode: original.mode, customer_email: original.customer_email, success_url: original.success_url, cancel_url: original.cancel_url, metadata: { ...original.metadata, retry_of_session: sessionId, retry_count: (parseInt(original.metadata?.retry_count||'0')+1).toString() } });
      return Response.json({ success: true, sessionId: retry.id, url: retry.url });
    }

    if (action === 'log_abandoned') {
      await supabase.from('wallet_audit_log').insert({ user_email: customerEmail, action: 'abandoned_checkout', amount_denarii: 0, new_balance: 0, related_entity_id: sessionId, reason: 'Checkout abandoned', timestamp_utc: new Date().toISOString() }).catch(() => {});
      return Response.json({ success: true });
    }

    if (action === 'verify') {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status === 'succeeded' && intent.charges?.data?.length) {
        const charge = intent.charges.data[0];
        return Response.json({ verified: true, chargeId: charge.id, amount: charge.amount/100, receiptUrl: charge.receipt_url });
      }
      return Response.json({ verified: false, status: intent.status });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});