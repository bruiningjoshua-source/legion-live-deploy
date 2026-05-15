/* eslint-disable no-undef */
// ═══ CONVERTED: adminAffiliateEarnings ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
const CEO_AFFILIATES = (Deno.env.get('CEO_AFFILIATE_EMAILS') || '').split(',').map(e => e.trim()).filter(Boolean);
const PLATFORM_CUT = 0.10;
const CEO_CUT = 0.90;

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: txns } = await supabase.from('gift_transaction').select('total_as_value').order('created_date', { ascending: false }).limit(1000);
    const totalEarnings = (txns || []).reduce((sum, t) => sum + (t.total_as_value || 0), 0);
    const isCeoAffiliate = CEO_AFFILIATES.includes(user.email);

    return Response.json({ isCeoAffiliate, totalPlatformEarnings: totalEarnings, ceoEarning: totalEarnings * CEO_CUT, platformEarning: totalEarnings * PLATFORM_CUT, userEarning: isCeoAffiliate ? totalEarnings * CEO_CUT : 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});