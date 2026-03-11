import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Analyze Creator Subscription Churn
 * Tracks MRR, cohort retention, predicts cancellation risk
 * Flags at-risk creators for retention campaigns
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Analyze all active creator subscriptions
    const activeSubscriptions = await base44.asServiceRole.entities.CreatorSubscription.filter(
      { status: 'active' }, '-created_date', 1000
    ).catch(() => []);

    const churnAnalysis = {};
    let totalMrr = 0;
    let atRiskCount = 0;

    for (const sub of activeSubscriptions) {
      const creatorEmail = sub.user_email;
      if (!churnAnalysis[creatorEmail]) {
        churnAnalysis[creatorEmail] = {
          subscriptions: 0,
          mrr: 0,
          avgMonthlyRevenue: 0,
          lastStreamDate: null,
          daysSinceStream: null,
          churnRiskScore: 0,
          churnFactors: []
        };
      }

      const monthlyPrice = sub.tier === 'premium' ? 4.99 : sub.tier === 'vip' ? 9.99 : 2.99;
      churnAnalysis[creatorEmail].subscriptions += 1;
      churnAnalysis[creatorEmail].mrr += monthlyPrice;
      totalMrr += monthlyPrice;

      // Check last stream date
      const streams = await base44.asServiceRole.entities.Stream.filter(
        { creator_id: creatorEmail, status: 'ended' },
        '-created_date',
        1
      ).catch(() => []);

      if (streams.length > 0) {
        const lastStream = new Date(streams[0].created_date);
        const daysSince = Math.floor((Date.now() - lastStream.getTime()) / 86400000);
        churnAnalysis[creatorEmail].lastStreamDate = streams[0].created_date;
        churnAnalysis[creatorEmail].daysSinceStream = daysSince;

        // Churn risk: no stream in 14+ days
        if (daysSince > 14) {
          churnAnalysis[creatorEmail].churnRiskScore += 30;
          churnAnalysis[creatorEmail].churnFactors.push(`No stream in ${daysSince} days`);
        }
      } else {
        // Never streamed
        churnAnalysis[creatorEmail].churnRiskScore += 50;
        churnAnalysis[creatorEmail].churnFactors.push('Never streamed');
      }

      // Check gift/tip velocity (engagement decay)
      const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
      const recentTips = await base44.asServiceRole.entities.GiftTransaction.filter(
        { 
          recipient_email: creatorEmail,
          created_date: { $gte: thirtyDaysAgo }
        }
      ).catch(() => []);

      if (recentTips.length < 3) {
        churnAnalysis[creatorEmail].churnRiskScore += 25;
        churnAnalysis[creatorEmail].churnFactors.push(`Low engagement: ${recentTips.length} tips/month`);
      }

      // Overall risk assessment
      if (churnAnalysis[creatorEmail].churnRiskScore > 40) {
        atRiskCount += 1;

        // Create at-risk notification
        await base44.asServiceRole.entities.Notification.create({
          user_email: creatorEmail,
          type: 'churn_risk_alert',
          title: 'We Miss You! 🎬',
          message: 'Your subscribers are waiting. Stream today to keep them engaged!',
          is_read: false,
          created_date: new Date().toISOString()
        }).catch(() => {});
      }
    }

    console.log(`[analyzeCreatorChurn] Analyzed ${activeSubscriptions.length} subscriptions. ${atRiskCount} at-risk creators.`);

    return Response.json({
      totalMrr: totalMrr.toFixed(2),
      totalSubscriptions: activeSubscriptions.length,
      atRiskCreators: atRiskCount,
      churnAnalysis
    });

  } catch (error) {
    console.error('[analyzeCreatorChurn] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});