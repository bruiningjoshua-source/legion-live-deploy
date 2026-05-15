/* eslint-disable no-undef */
// ═══ CONVERTED: batchFraudAnalysis ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token).catch(() => ({ data: { user: null } }));
    if (user) { const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single(); if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 }); }

    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: purchases } = await supabase.from('currency_purchase').select('user_email,price_usd').gte('created_date', oneDayAgo).order('created_date', { ascending: false }).limit(500);
    const velocity = new Map();
    for (const p of (purchases||[])) { const e = p.user_email; if (!velocity.has(e)) velocity.set(e, { count: 0, totalUsd: 0 }); const m = velocity.get(e); m.count++; m.totalUsd += p.price_usd||0; }

    const cases = [];
    for (const [email, m] of velocity) {
      let score = 0; const flags = [];
      if (m.totalUsd > 5000) { score += 30; flags.push(`Daily: $${m.totalUsd.toFixed(2)}`); }
      if (m.count > 20) { score += 25; flags.push(`Freq: ${m.count}`); }
      const { data: u } = await supabase.from('user').select('chargeback_count').eq('email', email).limit(1);
      if ((u||[])[0]?.chargeback_count >= 2) { score += 40; flags.push(`CB: ${u[0].chargeback_count}`); }
      if (score > 50) { cases.push({ email, riskScore: score, flags }); await supabase.from('notification').insert({ user_email: 'admin', type: 'fraud_review_case', title: `Fraud: ${email}`, message: `Score: ${score}. ${flags.join(', ')}`, is_read: false }).catch(() => {}); }
    }
    const report = { date: new Date().toISOString(), totalPurchases: (purchases||[]).length, totalSpend: (purchases||[]).reduce((s,p) => s+(p.price_usd||0), 0), flaggedUsers: cases.length, cases };
    await supabase.from('wallet_audit_log').insert({ user_email: 'system', action: 'batch_fraud_analysis_complete', amount_denarii: 0, new_balance: 0, reason: `${cases.length} cases flagged`, timestamp_utc: new Date().toISOString() }).catch(() => {});
    return Response.json({ success: true, report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});