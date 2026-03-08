/**
 * FRAUD DETECTION & ADMIN DASHBOARD HANDLER
 * Real-time fraud monitoring + manual review queue
 * Tracks: high-value purchases, chargeback patterns, velocity abuse
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FRAUD_THRESHOLDS = {
  HIGH_SINGLE_PURCHASE: 5000,      // $5000 single purchase = manual review
  DAILY_SPENDING_LIMIT: 10000,     // $10k/day = flag velocity abuse
  CHARGEBACK_LIMIT: 3,              // 3+ chargebacks = account suspension
  VELOCITY_THRESHOLD: 5,            // 5+ purchases in 1 hour = suspicious
};

export async function analyzeTransactionRisk(base44, transaction) {
  const {
    userEmail,
    amount,
    type,
    paymentIntentId,
    metadata = {}
  } = transaction;

  let riskScore = 0;
  let flags = [];

  // HIGH-VALUE PURCHASE CHECK
  if (amount > FRAUD_THRESHOLDS.HIGH_SINGLE_PURCHASE) {
    riskScore += 40;
    flags.push(`HIGH_VALUE: $${amount}`);
  }

  // CHARGEBACK HISTORY CHECK
  try {
    const users = await base44.asServiceRole.entities.User.filter(
      { email: userEmail },
      null,
      1
    );

    if (users[0]?.chargeback_count >= FRAUD_THRESHOLDS.CHARGEBACK_LIMIT) {
      riskScore += 50;
      flags.push(`CHARGEBACK_HISTORY: ${users[0].chargeback_count} chargebacks`);
    }

    if (users[0]?.flagged_for_chargeback) {
      riskScore += 30;
      flags.push('FLAGGED_FOR_CHARGEBACK');
    }
  } catch (e) {
    console.warn('[fraudDashboardHandler] User lookup failed:', e.message);
  }

  // DAILY VELOCITY CHECK
  try {
    const cutoff = new Date(Date.now() - 86400000); // 24 hours ago
    const dailyPurchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
      {
        user_email: userEmail,
        created_date: { $gte: cutoff.toISOString() }
      },
      null,
      100
    );

    const dailyTotal = dailyPurchases.reduce((sum, p) => sum + p.price_usd, 0) + amount;

    if (dailyTotal > FRAUD_THRESHOLDS.DAILY_SPENDING_LIMIT) {
      riskScore += 35;
      flags.push(`VELOCITY_DAILY: $${dailyTotal.toFixed(2)}`);
    }

    // HOUR-LEVEL VELOCITY (rapid purchases)
    const lastHourCutoff = new Date(Date.now() - 3600000);
    const hourlyPurchases = dailyPurchases.filter(
      p => new Date(p.created_date) > lastHourCutoff
    );

    if (hourlyPurchases.length >= FRAUD_THRESHOLDS.VELOCITY_THRESHOLD) {
      riskScore += 25;
      flags.push(`VELOCITY_HOUR: ${hourlyPurchases.length + 1} purchases`);
    }
  } catch (e) {
    console.warn('[fraudDashboardHandler] Purchase history lookup failed:', e.message);
  }

  // GEOGRAPHIC / IP ANOMALY (future enhancement)
  // if (newCountry && previousCountries.includes(newCountry) === false) {
  //   riskScore += 15;
  //   flags.push('NEW_COUNTRY');
  // }

  const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';

  // Log to fraud audit trail
  try {
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: userEmail,
      action: 'fraud_analysis',
      amount_denarii: Math.floor(amount * 180),
      new_balance: 0, // Not updating balance here
      related_entity_id: paymentIntentId,
      reason: `Fraud check: ${riskLevel} risk | Score: ${riskScore} | Flags: ${flags.join(', ')}`,
      timestamp_utc: new Date().toISOString()
    }).catch(e => console.warn('[fraudDashboardHandler] Audit log failed:', e.message));
  } catch (e) {
    console.warn('[fraudDashboardHandler] Failed to log fraud analysis:', e.message);
  }

  return {
    riskScore,
    riskLevel,
    flags,
    requiresManualReview: riskScore > 40,
    shouldBlock: riskScore > 70
  };
}

/**
 * Create a manual review case for high-risk transactions
 */
export async function createFraudReviewCase(base44, transaction, riskAnalysis) {
  try {
    // Create a structured record in a hypothetical FraudCase entity
    // For now, log to audit trail and flag user
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: transaction.userEmail,
      action: 'fraud_review_required',
      amount_denarii: Math.floor(transaction.amount * 180),
      new_balance: 0,
      related_entity_id: transaction.paymentIntentId,
      reason: `MANUAL REVIEW CASE | Risk: ${riskAnalysis.riskLevel} | Score: ${riskAnalysis.riskScore} | Details: ${JSON.stringify(riskAnalysis.flags)}`,
      timestamp_utc: new Date().toISOString()
    });

    // Flag user for admin review
    const users = await base44.asServiceRole.entities.User.filter(
      { email: transaction.userEmail },
      null,
      1
    );

    if (users[0]) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        flagged_for_review: true,
        review_flags: (users[0].review_flags || '') + ` | FRAUD: ${riskAnalysis.riskLevel}`
      }).catch(e => console.warn('[fraudDashboardHandler] User flag failed:', e.message));
    }

    return {
      success: true,
      caseId: transaction.paymentIntentId,
      message: `Manual review case created: ${riskAnalysis.riskLevel} risk`
    };
  } catch (error) {
    console.error('[fraudDashboardHandler] Error creating review case:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get dashboard data for admin fraud monitoring
 */
export async function getFraudDashboardData(base44) {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 1800000).toISOString();

    // High-risk transactions from last 30 minutes
    const recentFraudLogs = await base44.asServiceRole.entities.WalletAuditLog.filter(
      {
        action: 'fraud_analysis',
        timestamp_utc: { $gte: thirtyMinutesAgo }
      },
      '-timestamp_utc',
      50
    );

    // Manual review cases pending
    const reviewCases = await base44.asServiceRole.entities.WalletAuditLog.filter(
      {
        action: 'fraud_review_required'
      },
      '-timestamp_utc',
      100
    );

    // Users with chargebacks
    const flaggedUsers = await base44.asServiceRole.entities.User.filter(
      {
        flagged_for_chargeback: true
      },
      null,
      50
    );

    // Count summary
    const highRiskCount = recentFraudLogs.filter(
      l => l.reason.includes('HIGH risk')
    ).length;

    const mediumRiskCount = recentFraudLogs.filter(
      l => l.reason.includes('MEDIUM risk')
    ).length;

    return {
      summary: {
        lastUpdated: new Date().toISOString(),
        highRiskTransactions: highRiskCount,
        mediumRiskTransactions: mediumRiskCount,
        pendingReviews: reviewCases.length,
        flaggedUsers: flaggedUsers.length
      },
      recentTransactions: recentFraudLogs.slice(0, 20),
      reviewQueue: reviewCases.slice(0, 20),
      flaggedUsersList: flaggedUsers
    };
  } catch (error) {
    console.error('[fraudDashboardHandler] Error fetching dashboard data:', error.message);
    return {
      error: error.message,
      summary: {
        highRiskTransactions: 0,
        mediumRiskTransactions: 0,
        pendingReviews: 0,
        flaggedUsers: 0
      }
    };
  }
}