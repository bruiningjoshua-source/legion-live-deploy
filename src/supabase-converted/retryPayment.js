/* eslint-disable no-undef */
// ═══ CONVERTED: retryPayment ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) return Response.json({ error: 'Payment intent ID required' }, { status: 400 });

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!pi) return Response.json({ error: 'Payment not found' }, { status: 404 });
    if (pi.status === 'succeeded') return Response.json({ success: true, status: 'succeeded', message: 'Already completed' });

    if (pi.status === 'requires_payment_method' || pi.status === 'processing') {
      try {
        const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, { return_url: `${req.headers.get('origin') || 'https://legionlive.com'}/Wallet?retry_success=true` });
        if (confirmed.status === 'succeeded') {
          await supabase.from('wallet_audit_log').insert({ user_email: user.email, action: 'payment_retry_succeeded', amount_denarii: 0, new_balance: 0, related_entity_id: paymentIntentId, reason: `Retry OK`, timestamp_utc: new Date().toISOString() }).catch(() => {});
          return Response.json({ success: true, status: 'succeeded' });
        }
        if (confirmed.status === 'requires_action') return Response.json({ success: false, status: 'requires_action', clientSecret: confirmed.client_secret });
      } catch (err) {
        return Response.json({ success: false, status: 'failed', message: err.message }, { status: 400 });
      }
    }
    return Response.json({ success: false, status: pi.status, message: `Cannot retry (${pi.status})` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});