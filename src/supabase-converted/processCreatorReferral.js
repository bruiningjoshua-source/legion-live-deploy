/* eslint-disable no-undef */
// ═══ CONVERTED: processCreatorReferral ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { referral_code } = await req.json();
    if (!referral_code || !referral_code.match(/^[A-Z0-9]{8,16}$/)) return Response.json({ error: 'Invalid referral code' }, { status: 400 });

    const { data: referrals } = await supabase.from('creator_referral').select('*').eq('referral_code', referral_code).limit(1);
    const referral = (referrals||[])[0];
    if (!referral) return Response.json({ error: 'Referral code not found' }, { status: 404 });
    if (referral.status !== 'pending' && referral.status !== 'signed_up') return Response.json({ error: 'Already activated' }, { status: 400 });
    if (referral.referred_email && referral.referred_email !== user.email) return Response.json({ error: 'Code belongs to different email' }, { status: 403 });

    if (referral.status === 'pending') await supabase.from('creator_referral').update({ referred_email: user.email, status: 'signed_up', signup_date: new Date().toISOString() }).eq('id', referral.id);

    const { data: existingBonus } = await supabase.from('wallet_audit_log').select('id').eq('user_email', user.email).eq('action', 'referral_bonus').eq('related_entity_id', referral.id).limit(1);
    if ((existingBonus||[]).length) return Response.json({ error: 'Already claimed' }, { status: 400 });

    // Award 5000 to referred
    const { data: wallets } = await supabase.from('wallet').select('*').eq('user_email', user.email).limit(1);
    if ((wallets||[])[0]) {
      const old = wallets[0].denarii_balance || 0;
      await supabase.from('wallet').update({ denarii_balance: old + 5000 }).eq('id', wallets[0].id);
      await supabase.from('wallet_audit_log').insert({ user_email: user.email, wallet_id: wallets[0].id, action: 'referral_bonus', amount_denarii: 5000, previous_balance: old, new_balance: old + 5000, related_entity_id: referral.id, reason: `Referral bonus from ${referral.referrer_id}`, timestamp_utc: new Date().toISOString() }).catch(() => {});
    } else {
      await supabase.from('wallet').insert({ user_email: user.email, denarii_balance: 5000, sestertii_balance: 0, as_balance: 0 });
    }

    // Award 5000 to referrer
    if (!referral.reward_claimed) {
      const { data: rw } = await supabase.from('wallet').select('*').eq('user_email', referral.referrer_id).limit(1);
      if ((rw||[])[0]) {
        const old = rw[0].denarii_balance || 0;
        await supabase.from('wallet').update({ denarii_balance: old + 5000 }).eq('id', rw[0].id);
        await supabase.from('wallet_audit_log').insert({ user_email: referral.referrer_id, wallet_id: rw[0].id, action: 'referral_bonus', amount_denarii: 5000, previous_balance: old, new_balance: old + 5000, related_entity_id: referral.id, reason: `Referral: ${user.email} signed up`, timestamp_utc: new Date().toISOString() }).catch(() => {});
      }
      await supabase.from('creator_referral').update({ reward_claimed: true, claimed_date: new Date().toISOString(), status: 'activated' }).eq('id', referral.id);
    }

    // 70% guarantee for 3 months
    const { data: guarantees } = await supabase.from('creator_guarantee').select('id').eq('creator_id', user.email).limit(1);
    if (!(guarantees||[]).length) {
      const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 3);
      await supabase.from('creator_guarantee').insert({ creator_id: user.email, guarantee_type: 'referral_onboard', base_share_percent: 60, guaranteed_share_percent: 70, start_date: new Date().toISOString(), end_date: endDate.toISOString(), is_active: true, referred_by: referral.referrer_id });
    }

    return Response.json({ success: true, bonuses: { referred_creator: 5000, referrer: 5000 }, guarantee: { creator_share: 70, duration_months: 3 } });
  } catch (error) {
    console.error('[processCreatorReferral] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});