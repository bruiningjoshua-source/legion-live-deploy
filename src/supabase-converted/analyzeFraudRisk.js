/* eslint-disable no-undef */
// ═══ CONVERTED: analyzeFraudRisk ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
const FRAUD_LIMITS = { HIGH_VALUE: 5000, DAILY_LIMIT: 10000, CHARGEBACK_MAX: 3, HOURLY_PURCHASES: 5 };

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userEmail, amount, paymentIntentId } = await req.json();
    if (!userEmail || !amount) return Response.json({ error: 'Missing fields' }, { status: 400 });
    let riskScore = 0, flags = [];
    if (amount > FRAUD_LIMITS.HIGH_VALUE) { riskScore += 40; flags.push(`HIGH_VALUE:$${amount}`); }
    const { data: users } = await supabase.from('user').select('chargeback_count').eq('email', userEmail).limit(1);
    if ((users||[])[0]?.chargeback_count >= FRAUD_LIMITS.CHARGEBACK_MAX) { riskScore += 50; flags.push(`CB:${users[0].chargeback_count}`); }
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: dayPurchases } = await supabase.from('currency_purchase').select('price_usd,created_date').eq('user_email', userEmail).gte('created_date', oneDayAgo).limit(100);
    const dailyTotal = (dayPurchases||[]).reduce((s, p) => s + (p.price_usd||0), 0) + amount;
    if (dailyTotal > FRAUD_LIMITS.DAILY_LIMIT) { riskScore += 35; flags.push(`DAILY:$${dailyTotal.toFixed(2)}`); }
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const hourly = (dayPurchases||[]).filter(p => new Date(p.created_date) > new Date(oneHourAgo));
    if (hourly.length >= FRAUD_LIMITS.HOURLY_PURCHASES) { riskScore += 25; flags.push(`HOURLY:${hourly.length+1}`); }
    const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';
    await supabase.from('wallet_audit_log').insert({ user_email: userEmail, action: 'fraud_check', amount_denarii: Math.floor(amount*180), new_balance: 0, related_entity_id: paymentIntentId||'unknown', reason: `${riskLevel} (${riskScore}) | ${flags.join(', ')}`, timestamp_utc: new Date().toISOString() }).catch(() => {});
    return Response.json({ riskScore, riskLevel, flags, requiresReview: riskScore > 40, shouldBlock: riskScore > 70 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});