import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Predict Streamer Churn Risk
 * Identifies creators likely to go inactive based on engagement decay
 * Flags for re-engagement campaigns
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all creators
    const allCreators = await base44.asServiceRole.entities.Creator.filter(
      { is_live: false }, '-follower_count', 5000
    ).catch(() => []);

    const churnPredictions = [];

    for (const creator of allCreators) {
      let churnScore = 0;
      const indicators = [];

      // Indicator 1: Days since last stream
      const streams = await base44.asServiceRole.entities.Stream.filter(
        { creator_id: creator.user_email, status: 'ended' },
        '-created_date',
        1
      ).catch(() => []);

      let daysSinceStream = 999;
      if (streams.length > 0) {
        daysSinceStream = Math.floor((Date.now() - new Date(streams[0].created_date).getTime()) / 86400000);
      }

      if (daysSinceStream > 30) {
        churnScore += 40;
        indicators.push(`Offline for ${daysSinceStream} days`);
      } else if (daysSinceStream > 14) {
        churnScore += 25;
        indicators.push(`Offline for ${daysSinceStream} days`);
      }

      // Indicator 2: Declining viewer count
      if (streams.length > 1) {
        const currentViewers = streams[0].viewer_count || 0;
        const previousViewers = streams[1].viewer_count || 0;
        if (previousViewers > 0 && currentViewers < previousViewers * 0.5) {
          churnScore += 30;
          indicators.push(`Viewer decline: ${previousViewers} → ${currentViewers}`);
        }
      }

      // Indicator 3: No recent subscriptions
      const recentSubs = await base44.asServiceRole.entities.CreatorSubscription.filter(
        { 
          creator_id: creator.user_email,
          created_date: { $gte: new Date(Date.now() - 86400000 * 7).toISOString() }
        }
      ).catch(() => []);

      if (recentSubs.length === 0 && creator.follower_count > 100) {
        churnScore += 20;
        indicators.push('No new subscriptions this week');
      }

      // Indicator 4: Declining tip/gift engagement
      const lastWeekTips = await base44.asServiceRole.entities.GiftTransaction.filter(
        { 
          recipient_email: creator.user_email,
          created_date: { $gte: new Date(Date.now() - 86400000 * 7).toISOString() }
        }
      ).catch(() => []);

      const prevWeekTips = await base44.asServiceRole.entities.GiftTransaction.filter(
        { 
          recipient_email: creator.user_email,
          created_date: { 
            $gte: new Date(Date.now() - 86400000 * 14).toISOString(),
            $lt: new Date(Date.now() - 86400000 * 7).toISOString()
          }
        }
      ).catch(() => []);

      if (prevWeekTips.length > 0 && lastWeekTips.length < prevWeekTips.length * 0.3) {
        churnScore += 25;
        indicators.push(`Gift engagement down: ${prevWeekTips.length} → ${lastWeekTips.length}`);
      }

      // If high churn risk, flag for re-engagement
      if (churnScore > 50) {
        churnPredictions.push({
          creatorEmail: creator.user_email,
          creatorName: creator.display_name,
          churnScore: Math.min(churnScore, 100),
          indicators,
          daysSinceStream,
          followerCount: creator.follower_count
        });

        // Send re-engagement email
        await base44.asServiceRole.functions.invoke('transactionalEmail', {
          action: 'streamer_churn_alert',
          creatorEmail: creator.user_email,
          creatorName: creator.display_name,
          daysSinceStream
        }).catch(() => {});
      }
    }

    // Sort by churn risk descending
    churnPredictions.sort((a, b) => b.churnScore - a.churnScore);

    console.log(`[predictStreamerChurn] Analyzed ${allCreators.length} creators. ${churnPredictions.length} at-risk.`);

    return Response.json({
      totalCreators: allCreators.length,
      atRiskCreators: churnPredictions.length,
      predictions: churnPredictions.slice(0, 50)
    });

  } catch (error) {
    console.error('[predictStreamerChurn] Error:', error.message);
    return Response.json({ 
      error: 'Churn prediction failed',
      code: 'CHURN_PREDICTION_ERROR',
      message: error.message 
    }, { status: 500 });
  }
});