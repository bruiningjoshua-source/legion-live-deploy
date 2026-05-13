/**
 * FRAUD DETECTION SYSTEM
 * Detect velocity abuse, chargeback patterns, suspicious behavior
 * Uses database persistence via WalletAuditLog so state survives cold starts
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── HTTP Handler (so direct invocations don't hang) ──
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const { action, user_email, amount, activity_type } = body;

    if (action === 'check' && user_email) {
      const result = await detectFraud(user_email, activity_type || 'gift', amount || 0, {}, base44);
      return Response.json(result);
    }

    if (action === 'status') {
      return Response.json({
        cached_users: userActivity.size,
        cache_warmed: cacheWarmed,
        thresholds: FRAUD_THRESHOLDS
      });
    }

    return Response.json({ error: 'Provide action: "check" or "status"' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// In-memory cache (warm layer); DB is the source of truth on cold start
const userActivity = new Map();
let cacheWarmed = false;

async function warmCache(base44) {
  if (cacheWarmed) return;
  try {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { action: 'fraud_flag' },
      '-timestamp_utc',
      200
    );
    for (const log of logs) {
      if (!log.user_email) continue;
      try {
        const data = JSON.parse(log.related_entity_id || '{}');
        if (!userActivity.has(log.user_email)) {
          userActivity.set(log.user_email, { gifts: [], tips: [], chargebacks: [] });
        }
        const activity = userActivity.get(log.user_email);
        const ts = new Date(log.timestamp_utc || log.created_date).getTime();
        if (data.type === 'gift') activity.gifts.push({ amount: data.amount || 0, timestamp: ts });
        if (data.type === 'tip') activity.tips.push({ amount: data.amount || 0, timestamp: ts });
        if (data.type === 'chargeback') activity.chargebacks.push({ timestamp: ts });
      } catch (e) { /* skip malformed entries */ }
    }
    cacheWarmed = true;
  } catch (e) {
    console.warn('[fraudDetection] Cache warm failed:', e.message);
  }
}

export async function detectFraud(email, activityType, amount, externalData = {}, base44 = null) {
  if (base44) await warmCache(base44);

  if (!userActivity.has(email)) {
    userActivity.set(email, { gifts: [], tips: [], chargebacks: [] });
  }

  const activity = userActivity.get(email);
  const now = Date.now();
  const oneDayAgo = now - 86400000;
  const oneHourAgo = now - 3600000;

  let riskScore = 0;
  const flags = [];

  // ── GIFT VELOCITY CHECK ──
  if (activityType === 'gift') {
    const recentGifts = activity.gifts.filter(t => t.timestamp > oneHourAgo);

    if (recentGifts.length >= 10) {
      riskScore += 30;
      flags.push('excessive_gift_velocity_1h');
    }

    const last24Gifts = activity.gifts.filter(t => t.timestamp > oneDayAgo);
    if (last24Gifts.length >= 50) {
      riskScore += 20;
      flags.push('excessive_gift_velocity_24h');
    }

    activity.gifts.push({ amount, timestamp: now });
    activity.gifts = activity.gifts.filter(t => t.timestamp > oneDayAgo);
  }

  // ── TIP VELOCITY CHECK ──
  if (activityType === 'tip') {
    const recentTips = activity.tips.filter(t => t.timestamp > oneHourAgo);
    const totalRecentTips = recentTips.reduce((sum, t) => sum + t.amount, 0);

    if (totalRecentTips >= 500) {
      riskScore += 35;
      flags.push('high_tip_velocity_1h');
    }

    const last24Tips = activity.tips.filter(t => t.timestamp > oneDayAgo);
    const total24Tips = last24Tips.reduce((sum, t) => sum + t.amount, 0);
    if (total24Tips >= 1000) {
      riskScore += 25;
      flags.push('high_tip_velocity_24h');
    }

    if (amount > 5000) {
      riskScore += 15;
      flags.push('high_single_tip_amount');
    }

    activity.tips.push({ amount, timestamp: now });
    activity.tips = activity.tips.filter(t => t.timestamp > oneDayAgo);
  }

  // ── CHARGEBACK HISTORY ──
  if (activityType === 'chargeback') {
    activity.chargebacks.push({ timestamp: now });

    const last30Days = activity.chargebacks.filter(t => t.timestamp > now - 2592000000).length;
    if (last30Days >= 2) {
      riskScore += 50;
      flags.push('repeat_chargeback_pattern');
    }

    activity.chargebacks = activity.chargebacks.filter(t => t.timestamp > now - 2592000000);
  }

  // ── PURCHASE AMOUNT ANOMALY ──
  if (externalData.avgSpend && amount > externalData.avgSpend * 5) {
    riskScore += 20;
    flags.push('unusually_large_purchase');
  }

  // ── NEW ACCOUNT VELOCITY ──
  if (externalData.accountAgeHours && externalData.accountAgeHours < 24 && amount > 100) {
    riskScore += 25;
    flags.push('new_account_high_spending');
  }

  // Persist to DB so state survives cold starts
  if (base44 && (riskScore > 0 || flags.length > 0)) {
    base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: email,
      action: 'fraud_flag',
      amount_denarii: Math.floor(amount * 180),
      new_balance: 0,
      related_entity_id: JSON.stringify({ type: activityType, amount, riskScore }),
      reason: `Fraud check: score ${riskScore} | ${flags.join(', ') || 'clean'}`,
      timestamp_utc: new Date().toISOString()
    }).catch(e => console.warn('[fraudDetection] Audit write failed:', e.message));
  }

  return {
    isSuspicious: riskScore >= 50,
    riskScore: Math.min(100, riskScore),
    flags,
    recommendation: riskScore >= 80 ? 'block' : riskScore >= 50 ? 'review' : 'allow'
  };
}

// Cleanup old activity every hour
setInterval(() => {
  const oneDayAgo = Date.now() - 86400000;
  for (const [email, activity] of userActivity) {
    activity.gifts = activity.gifts.filter(t => t.timestamp > oneDayAgo);
    activity.tips = activity.tips.filter(t => t.timestamp > oneDayAgo);
    activity.chargebacks = activity.chargebacks.filter(t => t.timestamp > oneDayAgo - 1728000000);
    
    if (activity.gifts.length === 0 && activity.tips.length === 0 && activity.chargebacks.length === 0) {
      userActivity.delete(email);
    }
  }
}, 3600000);

export const FRAUD_THRESHOLDS = {
  gift_per_hour: 10,
  gift_per_day: 50,
  tip_per_hour_usd: 500,
  tip_per_day_usd: 1000,
  single_tip_max: 5000,
  chargeback_threshold_days: 30,
  chargeback_max: 2,
  new_account_threshold_hours: 24,
  new_account_spend_max: 100
};