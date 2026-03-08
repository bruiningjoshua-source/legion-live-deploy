/**
 * ANALYZE FRAUD RISK
 * Real-time fraud scoring for transactions
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const FRAUD_LIMITS = {
  HIGH_VALUE: 5000,
  DAILY_LIMIT: 10000,
  CHARGEBACK_MAX: 3,
  HOURLY_PURCHASES: 5
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, amount, paymentIntentId } = await req.json();
    if (!userEmail || !amount) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    let riskScore = 0;
    let flags = [];

    // HIGH-VALUE CHECK
    if (amount > FRAUD_LIMITS.HIGH_VALUE) {
      riskScore += 40;
      flags.push(`HIGH_VALUE:$${amount}`);
    }

    // CHARGEBACK HISTORY
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
      console.warn('[analyzeFraudRisk] User lookup failed:', e.message);
    }

    // DAILY VELOCITY
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
        flags.push(`DAILY:$${dailyTotal.toFixed(2)}`);
      }

      // HOURLY VELOCITY
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const hourPurchases = dayPurchases.filter(
        p => new Date(p.created_date) > new Date(oneHourAgo)
      );

      if (hourPurchases.length >= FRAUD_LIMITS.HOURLY_PURCHASES) {
        riskScore += 25;
        flags.push(`HOURLY:${hourPurchases.length + 1}`);
      }
    } catch (e) {
      console.warn('[analyzeFraudRisk] Purchase history lookup failed:', e.message);
    }

    const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';

    // Log fraud check
    try {
      await base44.asServiceRole.entities.WalletAuditLog.create({
        user_email: userEmail,
        action: 'fraud_check',
        amount_denarii: Math.floor(amount * 180),
        new_balance: 0,
        related_entity_id: paymentIntentId || 'unknown',
        reason: `Fraud check: ${riskLevel} (${riskScore}) | ${flags.join(', ')}`,
        timestamp_utc: new Date().toISOString()
      }).catch(() => {});
    } catch (e) {
      console.warn('[analyzeFraudRisk] Audit log failed:', e.message);
    }

    return Response.json({
      riskScore,
      riskLevel,
      flags,
      requiresReview: riskScore > 40,
      shouldBlock: riskScore > 70
    });
  } catch (error) {
    console.error('[analyzeFraudRisk]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});