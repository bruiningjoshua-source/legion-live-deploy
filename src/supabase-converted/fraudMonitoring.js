/* eslint-disable no-undef */
// ═══ CONVERTED: fraudMonitoring ═══
// NOTE: This was originally an exported module, converted to a standalone edge function.
import { createClient } from 'npm:@supabase/supabase-js@2';

const FRAUD_LIMITS = { HIGH_VALUE: 5000, DAILY_LIMIT: 10000, CHARGEBACK_MAX: 3, HOURLY_PURCHASES: 5 };

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const { action, userEmail, amount } = await req.json();

    if (action === 'analyze') {
      let riskScore = 0, flags = [];
      if (amount > FRAUD_LIMITS.HIGH_VALUE) { riskScore += 40; flags.push(`HIGH_VALUE:$${amount}`); }
      const { data: users } = await supabase.from('user').select('chargeback_count').eq('email', userEmail).limit(1);
      if ((users||[])[0]?.chargeback_count >= FRAUD_LIMITS.CHARGEBACK_MAX) { riskScore += 50; flags.push(`CHARGEBACKS:${users[0].chargeback_count}`); }
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const { data: dayPurchases } = await supabase.from('currency_purchase').select('price_usd,created_date').eq('user_email', userEmail).gte('created_date', oneDayAgo).limit(100);
      const dailyTotal = (dayPurchases||[]).reduce((s, p) => s + (p.price_usd||0), 0) + (amount||0);
      if (dailyTotal > FRAUD_LIMITS.DAILY_LIMIT) { riskScore += 35; flags.push(`DAILY:$${dailyTotal.toFixed(2)}`); }
      const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';
      return Response.json({ riskScore, riskLevel, flags, requiresReview: riskScore > 40, shouldBlock: riskScore > 70 });
    }

    if (action === 'dashboard') {
      const thirtyMinAgo = new Date(Date.now() - 1800000).toISOString();
      const { data: recentFraud } = await supabase.from('wallet_audit_log').select('*').eq('action', 'fraud_check').gte('timestamp_utc', thirtyMinAgo).order('timestamp_utc', { ascending: false }).limit(50);
      const { data: reviewCases } = await supabase.from('wallet_audit_log').select('*').eq('action', 'fraud_review_case').order('timestamp_utc', { ascending: false }).limit(50);
      const { data: flaggedUsers } = await supabase.from('user').select('email').eq('flagged_for_review', true).limit(50);
      return Response.json({ summary: { highRisk: (recentFraud||[]).filter(l => (l.reason||'').includes('HIGH')).length, pendingReviews: (reviewCases||[]).length, flaggedUsers: (flaggedUsers||[]).length }, recentTransactions: (recentFraud||[]).slice(0, 20) });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});