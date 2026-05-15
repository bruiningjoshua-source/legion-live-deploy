/* eslint-disable no-undef */
// ═══ CONVERTED: fraudDashboardHandler ═══
// NOTE: Was originally export-only module. Converted to standalone edge function with action-based routing.
import { createClient } from 'npm:@supabase/supabase-js@2';
const FRAUD_THRESHOLDS = { HIGH_SINGLE_PURCHASE: 5000, DAILY_SPENDING_LIMIT: 10000, CHARGEBACK_LIMIT: 3, VELOCITY_THRESHOLD: 5 };

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const { action, userEmail, amount, paymentIntentId } = await req.json();

    if (action === 'analyze') {
      let riskScore = 0, flags = [];
      if (amount > FRAUD_THRESHOLDS.HIGH_SINGLE_PURCHASE) { riskScore += 40; flags.push(`HIGH_VALUE: $${amount}`); }
      const { data: users } = await supabase.from('user').select('chargeback_count,flagged_for_chargeback').eq('email', userEmail).limit(1);
      if ((users||[])[0]?.chargeback_count >= FRAUD_THRESHOLDS.CHARGEBACK_LIMIT) { riskScore += 50; flags.push(`CB:${users[0].chargeback_count}`); }
      if ((users||[])[0]?.flagged_for_chargeback) { riskScore += 30; flags.push('FLAGGED'); }
      const cutoff = new Date(Date.now() - 86400000).toISOString();
      const { data: daily } = await supabase.from('currency_purchase').select('price_usd,created_date').eq('user_email', userEmail).gte('created_date', cutoff).limit(100);
      const dailyTotal = (daily||[]).reduce((s, p) => s + (p.price_usd||0), 0) + (amount||0);
      if (dailyTotal > FRAUD_THRESHOLDS.DAILY_SPENDING_LIMIT) { riskScore += 35; flags.push(`DAILY:$${dailyTotal.toFixed(2)}`); }
      const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';
      await supabase.from('wallet_audit_log').insert({ user_email: userEmail, action: 'fraud_analysis', amount_denarii: Math.floor((amount||0)*180), new_balance: 0, related_entity_id: paymentIntentId, reason: `${riskLevel} (${riskScore}) | ${flags.join(', ')}`, timestamp_utc: new Date().toISOString() }).catch(() => {});
      return Response.json({ riskScore, riskLevel, flags, requiresManualReview: riskScore > 40, shouldBlock: riskScore > 70 });
    }

    if (action === 'create_review') {
      await supabase.from('wallet_audit_log').insert({ user_email: userEmail, action: 'fraud_review_required', amount_denarii: Math.floor((amount||0)*180), new_balance: 0, related_entity_id: paymentIntentId, reason: `MANUAL REVIEW`, timestamp_utc: new Date().toISOString() });
      const { data: users } = await supabase.from('user').select('id').eq('email', userEmail).limit(1);
      if ((users||[])[0]) await supabase.from('user').update({ flagged_for_review: true }).eq('id', users[0].id).catch(() => {});
      return Response.json({ success: true, caseId: paymentIntentId });
    }

    if (action === 'dashboard') {
      const thirtyMinAgo = new Date(Date.now() - 1800000).toISOString();
      const { data: recent } = await supabase.from('wallet_audit_log').select('*').eq('action', 'fraud_analysis').gte('timestamp_utc', thirtyMinAgo).order('timestamp_utc', { ascending: false }).limit(50);
      const { data: reviews } = await supabase.from('wallet_audit_log').select('*').eq('action', 'fraud_review_required').order('timestamp_utc', { ascending: false }).limit(100);
      const { data: flagged } = await supabase.from('user').select('email,full_name').eq('flagged_for_chargeback', true).limit(50);
      return Response.json({ summary: { highRisk: (recent||[]).filter(l => (l.reason||'').includes('HIGH')).length, pendingReviews: (reviews||[]).length, flaggedUsers: (flagged||[]).length }, recentTransactions: (recent||[]).slice(0, 20), reviewQueue: (reviews||[]).slice(0, 20) });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});