/* eslint-disable no-undef */
// ═══ CONVERTED: stripeConnectPayout ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });
const DENARII_PER_USD = 180; const CREATOR_SHARE = 0.60; const DENARII_TO_USD = (1/DENARII_PER_USD)*CREATOR_SHARE;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { creatorId, amountDenarii, payoutId } = await req.json();
    if (!creatorId || !amountDenarii || amountDenarii <= 0) return Response.json({ error: 'Invalid input' }, { status: 400 });

    const { data: creators } = await supabase.from('creator').select('*').eq('id', creatorId).eq('user_email', user.email).limit(1);
    if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 403 });
    const creator = creators[0];
    if (creator.kyc_status !== 'verified') return Response.json({ error: 'KYC required' }, { status: 403 });
    if (amountDenarii > (creator.total_earnings_denarii||0)) return Response.json({ error: 'Insufficient balance' }, { status: 400 });

    const { data: methods } = await supabase.from('creator_payout_method').select('stripe_account_id').eq('creator_id', creatorId).eq('method_type', 'stripe_connect').eq('stripe_payouts_enabled', true).limit(1);
    if (!(methods||[])[0]?.stripe_account_id) return Response.json({ error: 'Stripe Connect not set up' }, { status: 400 });

    const payoutUsd = amountDenarii * DENARII_TO_USD;
    const payoutCents = Math.round(payoutUsd * 100);
    if (payoutCents < 100) return Response.json({ error: 'Minimum payout $1' }, { status: 400 });

    const transfer = await stripe.transfers.create({ amount: payoutCents, currency: 'usd', destination: methods[0].stripe_account_id, transfer_group: `creator_payout_${creatorId}_${Date.now()}`, metadata: { creator_id: creatorId, user_email: user.email, denarii_amount: String(amountDenarii), payout_id: payoutId||'direct' } });

    const newEarnings = Math.max(0, (creator.total_earnings_denarii||0) - amountDenarii);
    await supabase.from('creator').update({ total_earnings_denarii: newEarnings }).eq('id', creatorId);
    const { data: payoutRecord } = await supabase.from('creator_payout').insert({ creator_id: creatorId, user_email: user.email, amount_denarii: amountDenarii, payout_usd: payoutUsd, payout_method: 'stripe_connect', stripe_transfer_id: transfer.id, status: 'completed', completed_at: new Date().toISOString() }).select().single();
    if (payoutId) await supabase.from('creator_payout').update({ status: 'completed', stripe_transfer_id: transfer.id, completed_at: new Date().toISOString() }).eq('id', payoutId).catch(() => {});
    await supabase.from('wallet_audit_log').insert({ user_email: user.email, action: 'payout', amount_denarii: -amountDenarii, previous_balance: creator.total_earnings_denarii, new_balance: newEarnings, related_entity_id: payoutRecord?.id, reason: `Stripe payout $${payoutUsd.toFixed(2)} | ${transfer.id}`, timestamp_utc: new Date().toISOString() }).catch(() => {});

    return Response.json({ success: true, transfer_id: transfer.id, amount_usd: payoutUsd, amount_denarii: amountDenarii, remaining_earnings_denarii: newEarnings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});