/**
 * FRAUD DETECTION SYSTEM
 * Detect velocity abuse, chargeback patterns, suspicious behavior
 */

const userActivity = new Map(); // email -> { gifts: [], tips: [], chargebacks: [] }

export async function detectFraud(email, activityType, amount, externalData = {}) {
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

    // Flag: 10+ gifts in 1 hour
    if (recentGifts.length >= 10) {
      riskScore += 30;
      flags.push('excessive_gift_velocity_1h');
    }

    // Flag: 50+ gifts in 24 hours
    const last24Gifts = activity.gifts.filter(t => t.timestamp > oneDayAgo);
    if (last24Gifts.length >= 50) {
      riskScore += 20;
      flags.push('excessive_gift_velocity_24h');
    }

    // Log gift
    activity.gifts.push({ amount, timestamp: now });
    activity.gifts = activity.gifts.filter(t => t.timestamp > oneDayAgo); // Keep 24h
  }

  // ── TIP VELOCITY CHECK ──
  if (activityType === 'tip') {
    const recentTips = activity.tips.filter(t => t.timestamp > oneHourAgo);
    const totalRecentTips = recentTips.reduce((sum, t) => sum + t.amount, 0);

    // Flag: $500+ tips in 1 hour
    if (totalRecentTips >= 500) {
      riskScore += 35;
      flags.push('high_tip_velocity_1h');
    }

    // Flag: $1000+ tips in 24 hours
    const last24Tips = activity.tips.filter(t => t.timestamp > oneDayAgo);
    const total24Tips = last24Tips.reduce((sum, t) => sum + t.amount, 0);
    if (total24Tips >= 1000) {
      riskScore += 25;
      flags.push('high_tip_velocity_24h');
    }

    // Flag: Single tip > $5000
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

    // Flag: 2+ chargebacks in 30 days
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
    activity.chargebacks = activity.chargebacks.filter(t => t.timestamp > oneDayAgo - 1728000000); // 20 days for chargebacks
    
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