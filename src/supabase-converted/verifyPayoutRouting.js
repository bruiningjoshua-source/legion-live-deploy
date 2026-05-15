/* eslint-disable no-undef */
// ═══ CONVERTED: verifyPayoutRouting ═══
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

    const results = { timestamp: new Date().toISOString(), tests: {} };
    // Test Stripe Connect config
    try { const account = await stripe.accounts.retrieve(); results.tests.stripe_connect_config = { status: 'PASS', charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled, country: account.country }; } catch (e) { results.tests.stripe_connect_config = { status: 'FAIL', error: e.message }; }
    // Test connected accounts
    try { const accounts = await stripe.accounts.list({ limit: 5 }); results.tests.connected_accounts = { status: 'PASS', count: accounts.data.length }; } catch (e) { results.tests.connected_accounts = { status: 'FAIL', error: e.message }; }
    // Test webhook secret
    results.tests.webhook_secret = { status: Deno.env.get('STRIPE_WEBHOOK_SECRET') ? 'PASS' : 'FAIL' };
    results.overall_status = Object.values(results.tests).every(t => t.status === 'PASS') ? 'VERIFIED' : 'FAILED';
    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message, status: 'CRITICAL_FAILURE' }, { status: 500 });
  }
});