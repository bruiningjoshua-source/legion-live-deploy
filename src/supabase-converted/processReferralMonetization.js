/* eslint-disable no-undef */
// ═══ CONVERTED: processReferralMonetization ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: referrals } = await supabase.from('referral_code').select('*').eq('referred_creator_id', user.email).eq('status', 'onboarded').limit(1);
    if (!(referrals||[]).length) return Response.json({ success: false, message: 'No referral found' });

    const ref = referrals[0];
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);
    await supabase.from('referral_code').update({ status: 'monetized', monetized_date: now.toISOString(), revenue_share_expires_at: expires.toISOString() }).eq('id', ref.id);

    if (!ref.referred_bonus_claimed) {
      await supabase.from('monetization_bonus').insert({ creator_id: user.email, bonus_type: 'referral', amount_usd: ref.referred_bonus_amount || 50, description: `Referral bonus`, expires_at: new Date(now.getTime() + 60 * 86400000).toISOString() });
      await supabase.from('referral_code').update({ referred_bonus_claimed: true }).eq('id', ref.id);
    }
    if (!ref.referrer_bonus_claimed) {
      await supabase.from('monetization_bonus').insert({ creator_id: ref.referrer_creator_id, bonus_type: 'referral', amount_usd: ref.referrer_bonus_amount || 50, description: `Referral: ${user.email} activated`, expires_at: new Date(now.getTime() + 60 * 86400000).toISOString() });
    }
    return Response.json({ success: true, referrerBonus: ref.referrer_bonus_amount || 50, referredBonus: ref.referred_bonus_amount || 50 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});