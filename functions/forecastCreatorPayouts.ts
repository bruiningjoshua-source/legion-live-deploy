import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Forecast Creator Payouts for Next 30 Days
 * Projects revenue from subscriptions, tips, and ad share
 * Based on historical trends and current growth trajectory
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get creator profile
    const creators = await base44.asServiceRole.entities.Creator.filter(
      { user_email: user.email }, null, 1
    );
    const creator = creators[0];
    if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });

    // Get KYC tier & revenue share %
    const kycTiers = await base44.asServiceRole.entities.CreatorKYCTier.filter(
      { creator_email: user.email }, null, 1
    ).catch(() => []);
    const kycTier = kycTiers[0] || { withdrawal_limit_usd: null };

    // Define revenue share by tier
    const sharePercentage = {
      'tier_0_under500': 0.55,    // 55% for <$500/mo
      'tier_1_500_5k': 0.60,      // 60% for $500-5k
      'tier_2_5k_plus': 0.65      // 65% for $5k+
    }[kycTier.tier] || 0.60;

    // === SUBSCRIPTION REVENUE ===
    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 86400000 * 60).toISOString();

    const recentSubs = await base44.asServiceRole.entities.CreatorSubscription.filter(
      { 
        creator_id: user.email,
        created_date: { $gte: thirtyDaysAgo }
      }
    ).catch(() => []);

    const previousSubs = await base44.asServiceRole.entities.CreatorSubscription.filter(
      { 
        creator_id: user.email,
        created_date: { 
          $gte: sixtyDaysAgo,
          $lt: thirtyDaysAgo
        }
      }
    ).catch(() => []);

    // Sub tiers and pricing (monthly)
    const subTierPrices = { 'basic': 2.99, 'premium': 4.99, 'vip': 9.99 };
    const recentSubRevenue = recentSubs.reduce((sum, s) => sum + (subTierPrices[s.tier] || 0), 0);
    const previousSubRevenue = previousSubs.reduce((sum, s) => sum + (subTierPrices[s.tier] || 0), 0);
    const subGrowthRate = previousSubRevenue > 0 ? (recentSubRevenue - previousSubRevenue) / previousSubRevenue : 0.1; // Default 10% if new
    const projectedSubRevenue = recentSubRevenue * (1 + subGrowthRate);

    // === TIPPING REVENUE ===
    const recentTips = await base44.asServiceRole.entities.GiftTransaction.filter(
      { 
        recipient_email: user.email,
        created_date: { $gte: thirtyDaysAgo }
      }
    ).catch(() => []);

    const previousTips = await base44.asServiceRole.entities.GiftTransaction.filter(
      { 
        recipient_email: user.email,
        created_date: { 
          $gte: sixtyDaysAgo,
          $lt: thirtyDaysAgo
        }
      }
    ).catch(() => []);

    // Convert denarii to USD (65 denarii = $1)
    const recentTipsUsd = recentTips.reduce((sum, t) => sum + ((t.total_as_value || 0) / 65), 0);
    const previousTipsUsd = previousTips.reduce((sum, t) => sum + ((t.total_as_value || 0) / 65), 0);
    const tipGrowthRate = previousTipsUsd > 0 ? (recentTipsUsd - previousTipsUsd) / previousTipsUsd : 0;
    const projectedTipsUsd = recentTipsUsd * (1 + tipGrowthRate);

    // === VIDEO AD SHARE ===
    const recentVideos = await base44.asServiceRole.entities.VlogVideo.filter(
      { 
        creator_id: user.email,
        created_date: { $gte: thirtyDaysAgo },
        ad_revenue: { $gt: 0 }
      }
    ).catch(() => []);

    const previousVideos = await base44.asServiceRole.entities.VlogVideo.filter(
      { 
        creator_id: user.email,
        created_date: { 
          $gte: sixtyDaysAgo,
          $lt: thirtyDaysAgo
        },
        ad_revenue: { $gt: 0 }
      }
    ).catch(() => []);

    const recentAdRevenue = recentVideos.reduce((sum, v) => sum + (v.ad_revenue || 0), 0);
    const previousAdRevenue = previousVideos.reduce((sum, v) => sum + (v.ad_revenue || 0), 0);
    const adGrowthRate = previousAdRevenue > 0 ? (recentAdRevenue - previousAdRevenue) / previousAdRevenue : 0;
    const projectedAdRevenue = recentAdRevenue * (1 + adGrowthRate);

    // === MUSIC STREAM ROYALTIES ===
    const recentMusic = await base44.asServiceRole.entities.Music.filter(
      { 
        creator_id: user.email,
        created_date: { $gte: thirtyDaysAgo }
      }
    ).catch(() => []);

    // Estimate: ~$0.003 per stream on average
    const totalMusicStreams = recentMusic.reduce((sum, m) => sum + (m.play_count || 0), 0);
    const projectedMusicRoyalties = totalMusicStreams * 0.003;

    // === REFERRAL BONUSES ===
    const referralRecords = await base44.asServiceRole.entities.CreatorReferral.filter(
      { 
        referrer_id: user.email,
        status: 'activated',
        claimed_date: { $gte: thirtyDaysAgo }
      }
    ).catch(() => []);

    const projectedReferralBonuses = referralRecords.reduce((sum, r) => sum + (r.referrer_reward_denarii || 0) / 65, 0);

    // === CALCULATE CREATOR PAYOUT (after platform fee) ===
    const totalGrossRevenue = projectedSubRevenue + projectedTipsUsd + projectedAdRevenue + projectedMusicRoyalties + projectedReferralBonuses;
    const creatorPayout = totalGrossRevenue * sharePercentage;

    // === WITHDRAWAL LIMITS ===
    const monthlyLimit = kycTier.withdrawal_limit_usd || null;
    const payoutAfterLimit = monthlyLimit ? Math.min(creatorPayout, monthlyLimit) : creatorPayout;

    // === BUILD DAILY BREAKDOWN ===
    const dailyProjection = [];
    const dailyAvg = creatorPayout / 30;
    for (let day = 1; day <= 30; day++) {
      const variance = (Math.random() - 0.5) * dailyAvg * 0.4; // ±20% variance
      dailyProjection.push({
        day,
        date: new Date(Date.now() + 86400000 * day).toISOString().split('T')[0],
        projectedUsd: Math.max(0, dailyAvg + variance),
        cumulativeUsd: (dailyAvg * day) + (dailyProjection.length > 0 ? dailyProjection[dailyProjection.length - 1].cumulativeUsd : 0)
      });
    }

    // === RISK FACTORS ===
    const riskFactors = [];
    if (subGrowthRate < -0.1) riskFactors.push('Subscription declining');
    if (tipGrowthRate < -0.2) riskFactors.push('Tipping velocity down');
    if (recentSubs.length === 0) riskFactors.push('No new subscriptions this month');
    if (recentTips.length < 5) riskFactors.push('Low engagement (tip count)');

    console.log(`[forecastCreatorPayouts] ${user.email}: Projected $${creatorPayout.toFixed(2)} for next 30 days`);

    return Response.json({
      success: true,
      forecast: {
        totalProjectedUsd: creatorPayout.toFixed(2),
        payoutAfterLimit: payoutAfterLimit.toFixed(2),
        withdrawalLimit: monthlyLimit,
        revenueShare: (sharePercentage * 100).toFixed(0) + '%',
        breakdown: {
          subscriptions: projectedSubRevenue.toFixed(2),
          tips: projectedTipsUsd.toFixed(2),
          videoAdShare: projectedAdRevenue.toFixed(2),
          musicRoyalties: projectedMusicRoyalties.toFixed(2),
          referralBonuses: projectedReferralBonuses.toFixed(2)
        },
        trends: {
          subscriptionGrowth: (subGrowthRate * 100).toFixed(1) + '%',
          tippingGrowth: (tipGrowthRate * 100).toFixed(1) + '%',
          adGrowth: (adGrowthRate * 100).toFixed(1) + '%'
        },
        dailyProjection: dailyProjection.slice(0, 30),
        riskFactors,
        tier: kycTier.tier,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[forecastCreatorPayouts] Error:', error.message);
    return Response.json({ 
      error: 'Payout forecast failed',
      code: 'FORECAST_ERROR',
      message: error.message 
    }, { status: 500 });
  }
});