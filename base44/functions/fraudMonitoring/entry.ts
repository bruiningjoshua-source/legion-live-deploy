/**
 * FRAUD MONITORING SERVICE
 * Analyzes transactions + creates manual review queue for admins
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FRAUD_LIMITS = {
  HIGH_VALUE: 5000,          // $5k+ = manual review
  DAILY_LIMIT: 10000,        // $10k/day = flag
  CHARGEBACK_MAX: 3,         // 3+ chargebacks = suspend
  HOURLY_PURCHASES: 5        // 5+ purchases/hour = suspicious
};

/**
 * Analyze transaction risk
 */
export async function analyzeTransactionRisk(base44, userEmail, amount) {
  let riskScore = 0;
  let flags = [];

  if (amount > FRAUD_LIMITS.HIGH_VALUE) {
    riskScore += 40;
    flags.push(`HIGH_VALUE:$${amount}`);
  }

  // Check user chargeback history
  try {
    const users = await base44.asServiceRole.entities.User.filter(
      { email: userEmail },
      null,
      1
    );

    if (users[0]?.chargeback_count >= FRAUD_LIMITS.CHARGEBACK_MAX) {
      riskScore += 50;
      flags.push(`CHARGEBACKS:${users[0].chargeback_count}`);
    }
  } catch (e) {
    console.warn('[fraudMonitoring] User lookup failed:', e.message);
  }

  // Check daily spending
  try {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const dayPurchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
      {
        user_email: userEmail,
        created_date: { $gte: oneDayAgo }
      },
      null,
      100
    );

    const dailyTotal = dayPurchases.reduce((sum, p) => sum + (p.price_usd || 0), 0) + amount;
    if (dailyTotal > FRAUD_LIMITS.DAILY_LIMIT) {
      riskScore += 35;
      flags.push(`DAILY_VELOCITY:$${dailyTotal.toFixed(2)}`);
    }

    // Hourly velocity
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const hourPurchases = dayPurchases.filter(
      p => new Date(p.created_date) > new Date(oneHourAgo)
    );

    if (hourPurchases.length >= FRAUD_LIMITS.HOURLY_PURCHASES) {
      riskScore += 25;
      flags.push(`HOURLY_VELOCITY:${hourPurchases.length + 1}`);
    }
  } catch (e) {
    console.warn('[fraudMonitoring] Purchase history lookup failed:', e.message);
  }

  const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';

  // Log to audit
  try {
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: userEmail,
      action: 'fraud_check',
      amount_denarii: Math.floor(amount * 180),
      new_balance: 0,
      reason: `Fraud risk: ${riskLevel} (score: ${riskScore}) | ${flags.join(', ')}`,
      timestamp_utc: new Date().toISOString()
    }).catch(() => {});
  } catch (e) {
    console.warn('[fraudMonitoring] Audit log failed:', e.message);
  }

  return {
    riskScore,
    riskLevel,
    flags,
    requiresReview: riskScore > 40,
    shouldBlock: riskScore > 70
  };
}

/**
 * Create manual review case
 */
export async function createReviewCase(base44, userEmail, amount, paymentIntentId, riskLevel) {
  try {
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: userEmail,
      action: 'fraud_review_case',
      amount_denarii: Math.floor(amount * 180),
      new_balance: 0,
      related_entity_id: paymentIntentId,
      reason: `Manual review: ${riskLevel} risk | Amount: $${amount}`,
      timestamp_utc: new Date().toISOString()
    });

    // Flag user
    const users = await base44.asServiceRole.entities.User.filter(
      { email: userEmail },
      null,
      1
    );

    if (users[0]) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        flagged_for_review: true
      }).catch(() => {});
    }

    return { success: true, caseId: paymentIntentId };
  } catch (error) {
    console.error('[fraudMonitoring] Error creating case:', error.message);
    return { success: false };
  }
}

/**
 * Get fraud dashboard stats
 */
export async function getFraudStats(base44) {
  try {
    const thirtyMinAgo = new Date(Date.now() - 1800000).toISOString();

    const recentFraud = await base44.asServiceRole.entities.WalletAuditLog.filter(
      {
        action: 'fraud_check',
        timestamp_utc: { $gte: thirtyMinAgo }
      },
      '-timestamp_utc',
      50
    );

    const reviewCases = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { action: 'fraud_review_case' },
      '-timestamp_utc',
      50
    );

    const flaggedUsers = await base44.asServiceRole.entities.User.filter(
      { flagged_for_review: true },
      null,
      50
    );

    return {
      summary: {
        highRiskTransactions: recentFraud.filter(l => l.reason.includes('HIGH')).length,
        mediumRiskTransactions: recentFraud.filter(l => l.reason.includes('MEDIUM')).length,
        pendingReviews: reviewCases.length,
        flaggedUsers: flaggedUsers.length
      },
      recentTransactions: recentFraud.slice(0, 20),
      reviewQueue: reviewCases.slice(0, 20)
    };
  } catch (error) {
    console.error('[fraudMonitoring] Error fetching stats:', error.message);
    return {
      summary: {
        highRiskTransactions: 0,
        mediumRiskTransactions: 0,
        pendingReviews: 0,
        flaggedUsers: 0
      }
    };
  }
}