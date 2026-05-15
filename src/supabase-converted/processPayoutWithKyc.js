/* eslint-disable no-undef */
// ═══ CONVERTED: processPayoutWithKyc ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

const DENARII_PER_USD = 180;
const CREATOR_SHARE = 0.60;
const DENARII_TO_USD = (1 / DENARII_PER_USD) * CREATOR_SHARE;
const MIN_PAYOUT_USD = 5.00;
const MAX_PAYOUT_USD = 10000;

async function auditLog(supabase, email, action, amountDenarii, newBalance, reason, relatedId, req) {
  return supabase.from('wallet_audit_log').insert({ user_email: email, action, amount_denarii: amountDenarii, new_balance: newBalance, related_entity_id: relatedId || null, reason, ip_address: req?.headers?.get('x-forwarded-for') || 'unknown', user_agent: req?.headers?.get('user-agent') || 'unknown', timestamp_utc: new Date().toISOString() }).catch(e => console.warn('Audit failed:', e.message));
}

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
  let user = null;
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    user = authUser;

    const body = await req.json();
    const { amount_usd, requestSignature, requestTimestamp } = body;
    if (!requestSignature || !requestTimestamp) { await auditLog(supabase, user.email, 'admin_adjustment', 0, 0, 'SECURITY: Missing signature'); return Response.json({ error: 'Request signature required' }, { status: 403 }); }
    const tsNum = parseInt(requestTimestamp, 10);
    const now = Date.now();
    if (isNaN(tsNum) || tsNum < now - 300000 || tsNum > now + 10000) return Response.json({ error: 'Invalid timestamp' }, { status: 403 });
    if (typeof amount_usd !== 'number' || amount_usd < MIN_PAYOUT_USD || amount_usd > MAX_PAYOUT_USD) return Response.json({ error: `Amount must be $${MIN_PAYOUT_USD}-$${MAX_PAYOUT_USD}` }, { status: 400 });

    // Rate limit: 1 per 24h
    const { data: recentPayouts } = await supabase.from('creator_payout').select('created_date,status').eq('creator_id', user.email).order('created_date', { ascending: false }).limit(5);
    const inWindow = (recentPayouts||[]).filter(p => new Date(p.created_date).getTime() > now - 86400000 && p.status !== 'rejected');
    if (inWindow.length >= 1) return Response.json({ error: '1 payout per 24 hours' }, { status: 429 });

    const { data: creators } = await supabase.from('creator').select('*').eq('user_email', user.email).limit(1);
    const creator = (creators||[])[0];
    if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });
    if ((creator.kyc_status || 'not_started') !== 'verified') return Response.json({ error: 'KYC verification required', kyc_status: creator.kyc_status }, { status: 403 });

    const { data: payoutMethods } = await supabase.from('creator_payout_method').select('*').eq('creator_id', creator.id).eq('method_type', 'stripe_connect').eq('stripe_payouts_enabled', true).limit(1);
    if (!(payoutMethods||[])[0]) return Response.json({ error: 'No verified bank account' }, { status: 400 });

    const earningsDenarii = creator.total_earnings_denarii || 0;
    const availableUsd = earningsDenarii * DENARII_TO_USD;
    if (amount_usd > availableUsd) return Response.json({ error: 'Insufficient balance', available_usd: parseFloat(availableUsd.toFixed(4)) }, { status: 400 });

    const { data: guarantees } = await supabase.from('creator_guarantee').select('*').eq('creator_id', user.email).eq('is_active', true).lte('start_date', new Date().toISOString()).gte('end_date', new Date().toISOString()).limit(1);
    const hasGuarantee = !!(guarantees||[])[0];

    const deductDenarii = Math.ceil(amount_usd / DENARII_TO_USD);
    const { data: payout } = await supabase.from('creator_payout').insert({ creator_id: user.email, amount_usd, amount_denarii: deductDenarii, status: 'pending_review', requested_at: new Date().toISOString(), kyc_verified: true, stripe_account_id: payoutMethods[0].stripe_account_id, guarantee_active: hasGuarantee }).select().single();
    await supabase.from('creator').update({ total_earnings_denarii: Math.max(0, earningsDenarii - deductDenarii) }).eq('id', creator.id);
    await auditLog(supabase, user.email, 'payout', -deductDenarii, Math.max(0, earningsDenarii - deductDenarii), `Payout $${amount_usd} (${deductDenarii} Denarii) payout_id=${payout?.id}`, payout?.id, req);

    return Response.json({ success: true, payout_id: payout?.id, amount_usd, amount_denarii: deductDenarii, status: 'pending_review', guarantee_active: hasGuarantee });
  } catch (error) {
    if (user?.email) auditLog(supabase, user.email, 'admin_adjustment', 0, 0, `PAYOUT ERROR: ${error.message}`).catch(() => {});
    return Response.json({ error: error.message }, { status: 500 });
  }
});