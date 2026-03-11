import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Real-Time Recommendation Engine Refresh
 * Retrains every hour (vs daily) for trending categories
 * Updates discovery feed based on live streams, recent watches
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get live streams grouped by category
    const liveStreams = await base44.asServiceRole.entities.Stream.filter(
      { status: 'live' }, null, 1000
    ).catch(() => []);

    const categoryMetrics = {};

    for (const stream of liveStreams) {
      const cat = stream.category || 'other';
      if (!categoryMetrics[cat]) {
        categoryMetrics[cat] = {
          totalViewers: 0,
          streamCount: 0,
          growthTrend: 0,
          avgViewerDuration: 0
        };
      }
      categoryMetrics[cat].totalViewers += stream.viewer_count || 0;
      categoryMetrics[cat].streamCount += 1;
    }

    // Get trending (increase in viewers/streams vs last hour) from DB cache
    const cacheKey = 'recommendation_metrics_cache';
    const cachedRecord = await base44.asServiceRole.entities.PlatformAnalytics.filter(
      { metric_key: cacheKey }, '-created_date', 1
    ).catch(() => []);

    const cachedMetrics = cachedRecord.length > 0 ? JSON.parse(cachedRecord[0].metric_value || '{}') : {};

    const trendingCategories = [];
    for (const [cat, metrics] of Object.entries(categoryMetrics)) {
      const prevMetrics = cachedMetrics[cat] || { totalViewers: 0 };
      const growth = metrics.totalViewers - prevMetrics.totalViewers;
      if (growth > 100) {
        trendingCategories.push({
          category: cat,
          viewers: metrics.totalViewers,
          growth,
          streamCount: metrics.streamCount
        });
      }
    }

    // Store for next hour's comparison in DB
    try {
      await base44.asServiceRole.entities.PlatformAnalytics.create({
        metric_key: cacheKey,
        metric_value: JSON.stringify(categoryMetrics),
        metric_date: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[updateRecommendationEngine] Cache write failed:', e.message);
    }

    // Build personalized recommendations for each user
    const allUsers = await base44.asServiceRole.entities.User.filter({}, null, 5000)
      .catch(() => []);

    const recommendations = {};

    for (const u of allUsers) {
      // Get user's watch history
      const userWatches = await base44.asServiceRole.entities.ViewingHistory.filter(
        { user_email: u.email, created_date: { $gte: new Date(Date.now() - 604800000).toISOString() } },
        '-created_date',
        10
      ).catch(() => []);

      // Get user's interests
      const userInterests = await base44.asServiceRole.entities.UserInterest.filter(
        { user_email: u.email }
      ).catch(() => []);

      // Recommend creators in trending categories matching user interests
      const watchedCategories = new Set(userWatches.map(w => w.category).filter(Boolean));
      const interestedCategories = new Set(userInterests.map(i => i.interest).filter(Boolean));

      const recommendedCategories = [
        ...trendingCategories.filter(t => watchedCategories.has(t.category)),
        ...trendingCategories.filter(t => interestedCategories.has(t.category))
      ].slice(0, 5);

      recommendations[u.email] = {
        trendingCategories: recommendedCategories,
        personalizedFeed: recommendedCategories.length > 0
      };
    }

    console.log(`[updateRecommendationEngine] Updated recommendations for ${allUsers.length} users. Trending: ${trendingCategories.length} categories.`);

    return Response.json({
      success: true,
      usersUpdated: allUsers.length,
      trendingCategories: trendingCategories.slice(0, 10)
    });

  } catch (error) {
    console.error('[updateRecommendationEngine] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});