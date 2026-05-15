/* eslint-disable no-undef */
// ═══ CONVERTED: processReferralOnboarding ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { referralCode } = await req.json();
    if (!referralCode) return Response.json({ success: false }, { status: 200 });

    const { data: codes } = await supabase.from('referral_code').select('*').eq('code', referralCode).limit(1);
    if (!(codes||[]).length) return Response.json({ success: false }, { status: 200 });

    await supabase.from('referral_code').update({ referred_creator_id: user.email, referred_email: user.email, status: 'onboarded', onboarded_date: new Date().toISOString() }).eq('id', codes[0].id);

    return Response.json({ success: true, referralCode: codes[0].code, referrerCreatorId: codes[0].referrer_creator_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});