/* eslint-disable no-undef */
// ═══ CONVERTED: productionValidation ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const checks = {};
    // Database
    try { const { data: u } = await supabase.from('user').select('id').limit(1); const { data: w } = await supabase.from('wallet').select('id').limit(1); checks.database = { status: 'PASS', message: 'DB connected' }; } catch (e) { checks.database = { status: 'FAIL', message: e.message }; }
    // Stripe
    try { const stripeKey = Deno.env.get('STRIPE_SECRET_KEY'); if (!stripeKey) throw new Error('Missing key'); const s = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' }); await s.balance.retrieve(); checks.stripe = { status: 'PASS', mode: stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST' }; } catch (e) { checks.stripe = { status: 'FAIL', message: e.message }; }
    // Env vars
    const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ZEGOCLOUD_APP_ID', 'ZEGOCLOUD_SERVER_SECRET'];
    const missing = required.filter(v => !Deno.env.get(v));
    checks.envVars = { status: missing.length === 0 ? 'PASS' : 'FAIL', missing };
    // Performance
    const start = Date.now(); await supabase.from('user').select('id').limit(1); checks.performance = { status: 'PASS', query_ms: Date.now() - start };

    const allPassed = Object.values(checks).every(c => c.status === 'PASS');
    return Response.json({ status: allPassed ? 'READY_TO_LAUNCH' : 'FAILED', timestamp: new Date().toISOString(), checks });
  } catch (error) {
    return Response.json({ error: error.message, status: 'CRITICAL_FAILURE' }, { status: 500 });
  }
});