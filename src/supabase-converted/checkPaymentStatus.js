/* eslint-disable no-undef */
// ═══ CONVERTED: checkPaymentStatus ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) return Response.json({ error: 'Missing paymentIntentId' }, { status: 400 });

    const { data: logs } = await supabase.from('wallet_audit_log').select('*').eq('user_email', user.email).eq('related_entity_id', paymentIntentId).limit(1);
    if ((logs||[]).length && logs[0].action === 'purchase') return Response.json({ status: 'confirmed', processedAt: logs[0].timestamp_utc });

    let pi;
    try { pi = await stripe.paymentIntents.retrieve(paymentIntentId); }
    catch { try { const s = await stripe.checkout.sessions.retrieve(paymentIntentId); return Response.json({ status: s.payment_status === 'paid' ? 'confirmed' : s.status, stripeStatus: s.status, paymentStatus: s.payment_status }); } catch { return Response.json({ error: 'Payment not found' }, { status: 404 }); } }

    const statusMap = { succeeded: 'confirmed', requires_payment_method: 'requires_payment_method', requires_action: 'requires_action', canceled: 'canceled', processing: 'processing' };
    return Response.json({ status: statusMap[pi.status] || pi.status, stripeStatus: pi.status, clientSecret: pi.status === 'requires_action' ? pi.client_secret : null, amount: pi.amount / 100, currency: pi.currency, lastError: pi.last_payment_error?.message || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});