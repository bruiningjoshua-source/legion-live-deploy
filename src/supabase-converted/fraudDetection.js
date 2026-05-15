/* eslint-disable no-undef */
// ═══ CONVERTED: fraudDetection ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
const userActivity = new Map();

const FRAUD_THRESHOLDS = { gift_per_hour: 10, gift_per_day: 50, tip_per_hour_usd: 500, tip_per_day_usd: 1000, single_tip_max: 5000, chargeback_max: 2, new_account_threshold_hours: 24, new_account_spend_max: 100 };

function detectFraud(email, type, amount, externalData = {}) {
  if (!userActivity.has(email)) userActivity.set(email, { gifts: [], tips: [], chargebacks: [] });
  const activity = userActivity.get(email);
  const now = Date.now(); const oneHour = now - 3600000; const oneDay = now - 86400000;
  let riskScore = 0; const flags = [];

  if (type === 'gift') {
    if (activity.gifts.filter(t => t.timestamp > oneHour).length >= 10) { riskScore += 30; flags.push('gift_velocity_1h'); }
    if (activity.gifts.filter(t => t.timestamp > oneDay).length >= 50) { riskScore += 20; flags.push('gift_velocity_24h'); }
    activity.gifts.push({ amount, timestamp: now }); activity.gifts = activity.gifts.filter(t => t.timestamp > oneDay);
  }
  if (type === 'tip') {
    const hourTotal = activity.tips.filter(t => t.timestamp > oneHour).reduce((s, t) => s + t.amount, 0);
    if (hourTotal >= 500) { riskScore += 35; flags.push('tip_velocity_1h'); }
    if (amount > 5000) { riskScore += 15; flags.push('high_single_tip'); }
    activity.tips.push({ amount, timestamp: now }); activity.tips = activity.tips.filter(t => t.timestamp > oneDay);
  }
  if (type === 'chargeback') { activity.chargebacks.push({ timestamp: now }); if (activity.chargebacks.filter(t => t.timestamp > now - 2592000000).length >= 2) { riskScore += 50; flags.push('repeat_chargeback'); } }
  if (externalData.accountAgeHours && externalData.accountAgeHours < 24 && amount > 100) { riskScore += 25; flags.push('new_account_high_spend'); }

  return { isSuspicious: riskScore >= 50, riskScore: Math.min(100, riskScore), flags, recommendation: riskScore >= 80 ? 'block' : riskScore >= 50 ? 'review' : 'allow' };
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { action, user_email, activity_type, amount } = await req.json();
    if (action === 'check') { const result = detectFraud(user_email, activity_type || 'gift', amount || 0); if (result.riskScore > 0) await supabase.from('wallet_audit_log').insert({ user_email, action: 'fraud_flag', amount_denarii: Math.floor((amount||0)*180), new_balance: 0, related_entity_id: JSON.stringify({ type: activity_type, amount, riskScore: result.riskScore }), reason: `score ${result.riskScore} | ${result.flags.join(', ')}`, timestamp_utc: new Date().toISOString() }).catch(() => {}); return Response.json(result); }
    if (action === 'status') return Response.json({ cached_users: userActivity.size, thresholds: FRAUD_THRESHOLDS });
    return Response.json({ error: 'action: check or status' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});