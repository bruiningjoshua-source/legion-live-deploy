import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Batch Fraud Analysis Task
 * Runs daily to analyze suspicious transactions and generate review cases
 * Should be triggered by a scheduled automation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Only allow admin or scheduled automation
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[batchFraudAnalysis] Starting daily fraud analysis...');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);

    // Fetch recent currency purchases
    const purchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
      { created_date: { $gte: oneDayAgo.toISOString() } },
      '-created_date',
      500
    ).catch(e => {
      console.warn('[batchFraudAnalysis] Purchase fetch failed:', e.message);
      return [];
    });

    console.log(`[batchFraudAnalysis] Analyzing ${purchases.length} purchases from last 24h`);

    const fraudCases = [];
    const userVelocity = new Map();

    // Calculate velocity metrics for each user
    for (const purchase of purchases) {
      const email = purchase.user_email;
      if (!userVelocity.has(email)) {
        userVelocity.set(email, { count: 0, totalUsd: 0 });
      }
      const metrics = userVelocity.get(email);
      metrics.count += 1;
      metrics.totalUsd += purchase.price_usd || 0;
    }

    // Score and flag suspicious patterns
    for (const [email, metrics] of userVelocity) {
      let riskScore = 0;
      const flags = [];

      // High daily spend
      if (metrics.totalUsd > 5000) {
        riskScore += 30;
        flags.push(`High daily spend: $${metrics.totalUsd.toFixed(2)}`);
      }

      // High transaction frequency
      if (metrics.count > 20) {
        riskScore += 25;
        flags.push(`High frequency: ${metrics.count} purchases`);
      }

      // Check for chargebacks
      const users = await base44.asServiceRole.entities.User.filter(
        { email },
        null,
        1
      ).catch(() => []);

      const chargebackCount = users[0]?.chargeback_count || 0;
      if (chargebackCount >= 2) {
        riskScore += 40;
        flags.push(`Multiple chargebacks: ${chargebackCount}`);
      }

      // Create review case if risk > 50
      if (riskScore > 50) {
        fraudCases.push({
          email,
          riskScore,
          flags,
          timestamp: new Date().toISOString()
        });

        // Create a fraud review notification
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_email: 'admin',
            type: 'fraud_review_case',
            title: `Fraud Alert: ${email}`,
            message: `Risk score: ${riskScore}. Flags: ${flags.join(', ')}`,
            is_read: false,
            created_date: new Date().toISOString()
          });
        } catch (e) {
          console.warn('[batchFraudAnalysis] Notification creation failed:', e.message);
        }
      }
    }

    console.log(`[batchFraudAnalysis] Identified ${fraudCases.length} fraud cases`);

    // Generate daily report
    const report = {
      date: now.toISOString(),
      totalPurchases: purchases.length,
      totalSpend: purchases.reduce((sum, p) => sum + (p.price_usd || 0), 0),
      flaggedUsers: fraudCases.length,
      cases: fraudCases
    };

    // Store report for analytics
    try {
      await base44.asServiceRole.entities.WalletAuditLog.create({
        user_email: 'system',
        action: 'batch_fraud_analysis_complete',
        amount_denarii: 0,
        new_balance: 0,
        reason: `Daily fraud analysis: ${fraudCases.length} cases flagged`,
        related_entity_id: JSON.stringify(report),
        timestamp_utc: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[batchFraudAnalysis] Report logging failed:', e.message);
    }

    console.log('[batchFraudAnalysis] Complete. Report:', JSON.stringify(report));

    return Response.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('[batchFraudAnalysis] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});