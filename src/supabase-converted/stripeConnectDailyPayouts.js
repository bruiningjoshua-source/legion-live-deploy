/* eslint-disable no-undef */
// ═══ CONVERTED: stripeConnectDailyPayouts ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });
const DENARII_TO_USD = (1/260)*0.60; const MIN_AUTO_PAYOUT_DENARII = 5000;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token).catch(() => ({ data: { user: null } }));
    if (user) { const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single(); if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 }); }

    const { data: verifiedMethods } = await supabase.from('creator_payout_method').select('*').eq('method_type', 'stripe_connect').eq('stripe_payouts_enabled', true).limit(500);
    const results = { processed: 0, skipped: 0, errors: 0, totalUsd: 0 };

    for (const method of (verifiedMethods||[])) {
      try {
        const { data: creators } = await supabase.from('creator').select('total_earnings_denarii,user_email').eq('id', method.creator_id).limit(1);
        const creator = (creators||[])[0];
        if (!creator) { results.skipped++; continue; }
        const balance = creator.total_earnings_denarii || 0;
        if (balance < MIN_AUTO_PAYOUT_DENARII) { results.skipped++; continue; }
        const payoutUsd = balance * DENARII_TO_USD;
        const payoutCents = Math.round(payoutUsd * 100);
        if (payoutCents < 100) { results.skipped++; continue; }

        const transfer = await stripe.transfers.create({ amount: payoutCents, currency: 'usd', destination: method.stripe_account_id, transfer_group: `auto_daily_${new Date().toISOString().split('T')[0]}`, metadata: { creator_id: method.creator_id, denarii_amount: String(balance), auto_payout: 'true' } });
        await supabase.from('creator').update({ total_earnings_denarii: 0 }).eq('id', method.creator_id);
        await supabase.from('creator_payout').insert({ creator_id: method.creator_id, user_email: creator.user_email, amount_denarii: balance, payout_usd: payoutUsd, payout_method: 'stripe_connect_auto', stripe_transfer_id: transfer.id, status: 'completed' });
        results.processed++; results.totalUsd += payoutUsd;
      } catch (err) { console.error(`[dailyPayouts] Error ${method.creator_id}:`, err.message); results.errors++; }
    }
    return Response.json({ success: true, ...results, totalUsd: `$${results.totalUsd.toFixed(2)}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});