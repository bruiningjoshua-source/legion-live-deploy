/* eslint-disable no-undef */
// ═══ CONVERTED: getFraudDashboard ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const thirtyMinAgo = new Date(Date.now() - 1800000).toISOString();
    const { data: recentFraud } = await supabase.from('wallet_audit_log').select('*').eq('action', 'fraud_check').gte('timestamp_utc', thirtyMinAgo).order('timestamp_utc', { ascending: false }).limit(50);
    const { data: reviewCases } = await supabase.from('wallet_audit_log').select('*').eq('action', 'fraud_review_case').order('timestamp_utc', { ascending: false }).limit(50);
    const { data: flaggedUsers } = await supabase.from('user').select('email,full_name').eq('flagged_for_review', true).limit(50);

    return Response.json({
      summary: { lastUpdated: new Date().toISOString(), highRisk: (recentFraud||[]).filter(l => (l.reason||'').includes('HIGH')).length, mediumRisk: (recentFraud||[]).filter(l => (l.reason||'').includes('MEDIUM')).length, pendingReviews: (reviewCases||[]).length, flaggedUsers: (flaggedUsers||[]).length },
      recentTransactions: (recentFraud||[]).slice(0, 20).map(l => ({ id: l.id, email: l.user_email, timestamp: l.timestamp_utc, reason: l.reason, amount: l.amount_denarii })),
      reviewQueue: (reviewCases||[]).slice(0, 20),
      flaggedUsersList: (flaggedUsers||[]).slice(0, 20)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});