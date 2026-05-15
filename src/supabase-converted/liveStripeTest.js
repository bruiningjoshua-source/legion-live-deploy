/* eslint-disable no-undef */
// ═══ CONVERTED: liveStripeTest ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { test_type = 'full_cycle' } = await req.json().catch(() => ({}));
    if (test_type === 'full_cycle') {
      const session = await stripe.checkout.sessions.create({ payment_method_types: ['card'], mode: 'payment', line_items: [{ price_data: { currency: 'usd', product_data: { name: '[TEST] 100 Denarii' }, unit_amount: 100 }, quantity: 1 }], success_url: 'https://legionlive.com/success', cancel_url: 'https://legionlive.com/cancel', metadata: { test_type: 'live_validation' } });
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
      return Response.json({ status: 'PASSED', session_id: session.id, webhook_configured: webhooks.data.some(w => w.enabled_events.includes('checkout.session.completed')) });
    }
    if (test_type === 'payout') {
      const account = await stripe.accounts.retrieve();
      return Response.json({ status: 'PASSED', charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled });
    }
    return Response.json({ error: 'Invalid test_type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, status: 'CRITICAL_FAILURE' }, { status: 500 });
  }
});