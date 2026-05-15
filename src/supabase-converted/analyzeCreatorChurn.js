/* eslint-disable no-undef */
// ═══ CONVERTED: analyzeCreatorChurn ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const { data: activeSubs } = await supabase.from('creator_subscription').select('*').eq('status', 'active').order('created_date', { ascending: false }).limit(1000);
    const churnAnalysis = {};
    let totalMrr = 0, atRiskCount = 0;

    for (const sub of (activeSubs||[])) {
      const email = sub.user_email;
      if (!churnAnalysis[email]) churnAnalysis[email] = { subscriptions: 0, mrr: 0, churnRiskScore: 0, churnFactors: [] };
      const price = sub.tier === 'premium' ? 4.99 : sub.tier === 'vip' ? 9.99 : 2.99;
      churnAnalysis[email].subscriptions++; churnAnalysis[email].mrr += price; totalMrr += price;

      const { data: streams } = await supabase.from('stream').select('created_date').eq('creator_id', email).eq('status', 'ended').order('created_date', { ascending: false }).limit(1);
      if ((streams||[])[0]) {
        const days = Math.floor((Date.now() - new Date(streams[0].created_date).getTime()) / 86400000);
        if (days > 14) { churnAnalysis[email].churnRiskScore += 30; churnAnalysis[email].churnFactors.push(`No stream in ${days}d`); }
      } else { churnAnalysis[email].churnRiskScore += 50; churnAnalysis[email].churnFactors.push('Never streamed'); }

      if (churnAnalysis[email].churnRiskScore > 40) {
        atRiskCount++;
        await supabase.from('notification').insert({ user_email: email, type: 'churn_risk_alert', title: 'We Miss You! 🎬', message: 'Your subscribers are waiting. Stream today!', is_read: false }).catch(() => {});
      }
    }

    return Response.json({ totalMrr: totalMrr.toFixed(2), totalSubscriptions: (activeSubs||[]).length, atRiskCreators: atRiskCount, churnAnalysis });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});