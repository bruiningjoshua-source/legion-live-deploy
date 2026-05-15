/* eslint-disable no-undef */
// ═══ CONVERTED: updateCreatorKYCTier ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const { creatorEmail } = await req.json();
    if (!creatorEmail) return Response.json({ error: 'Creator email required' }, { status: 400 });

    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
    const { data: payments } = await supabase.from('currency_purchase').select('price_usd').eq('user_email', creatorEmail).gte('created_date', thirtyDaysAgo);
    const monthly = (payments||[]).reduce((s, p) => s + (p.price_usd * 0.65), 0);

    let tier, requiresKyc, limit;
    if (monthly < 500) { tier = 'tier_0_under500'; requiresKyc = false; limit = null; }
    else if (monthly < 5000) { tier = 'tier_1_500_5k'; requiresKyc = true; limit = 2000; }
    else { tier = 'tier_2_5k_plus'; requiresKyc = true; limit = 10000; }

    const { data: existing } = await supabase.from('creator_kyc_tier').select('id').eq('creator_email', creatorEmail).limit(1);
    if ((existing||[])[0]) {
      await supabase.from('creator_kyc_tier').update({ tier, monthly_earnings_usd: monthly, kyc_required: requiresKyc, withdrawal_limit_usd: limit, tier_last_updated: new Date().toISOString(), withdrawal_blocked: requiresKyc }).eq('id', existing[0].id);
    } else {
      await supabase.from('creator_kyc_tier').insert({ creator_email: creatorEmail, tier, monthly_earnings_usd: monthly, kyc_required: requiresKyc, withdrawal_limit_usd: limit, tier_last_updated: new Date().toISOString(), withdrawal_blocked: requiresKyc });
      if (requiresKyc) await supabase.from('notification').insert({ user_email: creatorEmail, type: 'kyc_required', title: 'KYC Required', message: `You've reached $${monthly.toFixed(0)}+ earnings. Complete identity verification.`, is_read: false }).catch(() => {});
    }
    return Response.json({ success: true, tier, monthlyEarnings: monthly.toFixed(2), requiresKyc });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});