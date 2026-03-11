import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Check & Unlock Creator Milestones
 * Automatically awards boosts, themes, overlays when milestones hit
 * Triggers retention & engagement rewards
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

    const milestones = [];

    // Milestone 1: 1000 followers → Custom overlay
    if (creator.follower_count >= 1000) {
      const existing = await base44.asServiceRole.entities.CreatorMilestone.filter(
        { creator_email: user.email, milestone_type: 'followers', milestone_value: 1000 }, null, 1
      ).catch(() => []);

      if (existing.length === 0) {
        const m = await base44.asServiceRole.entities.CreatorMilestone.create({
          creator_email: user.email,
          milestone_type: 'followers',
          milestone_value: 1000,
          achieved_date: new Date().toISOString(),
          reward_unlocked: 'custom_overlay',
          reward_applied: true
        });
        milestones.push(m);

        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'milestone_unlocked',
          title: '🎉 Milestone: 1,000 Followers!',
          message: 'You\'ve unlocked custom overlay tools. Personalize your stream today!',
          is_read: false,
          created_date: new Date().toISOString()
        }).catch(() => {});
      }
    }

    // Milestone 2: 10k followers → Revenue boost +10% for 30 days
    if (creator.follower_count >= 10000) {
      const existing = await base44.asServiceRole.entities.CreatorMilestone.filter(
        { creator_email: user.email, milestone_type: 'followers', milestone_value: 10000 }, null, 1
      ).catch(() => []);

      if (existing.length === 0) {
        const boostExpires = new Date(Date.now() + 86400000 * 30);
        const m = await base44.asServiceRole.entities.CreatorMilestone.create({
          creator_email: user.email,
          milestone_type: 'followers',
          milestone_value: 10000,
          achieved_date: new Date().toISOString(),
          reward_unlocked: 'revenue_boost',
          reward_applied: true,
          boost_percentage: 10,
          boost_duration_days: 30,
          boost_expires: boostExpires.toISOString()
        });
        milestones.push(m);

        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'milestone_unlocked',
          title: '⭐ Milestone: 10,000 Followers!',
          message: 'Congratulations! Your earnings are boosted +10% for 30 days. Thank you for growing the platform!',
          is_read: false,
          created_date: new Date().toISOString()
        }).catch(() => {});
      }
    }

    // Milestone 3: 50 streams → Theme pack
    const streams = await base44.asServiceRole.entities.Stream.filter(
      { creator_id: user.email, status: 'ended' }
    ).catch(() => []);

    if (streams.length >= 50) {
      const existing = await base44.asServiceRole.entities.CreatorMilestone.filter(
        { creator_email: user.email, milestone_type: 'streams', milestone_value: 50 }, null, 1
      ).catch(() => []);

      if (existing.length === 0) {
        const m = await base44.asServiceRole.entities.CreatorMilestone.create({
          creator_email: user.email,
          milestone_type: 'streams',
          milestone_value: 50,
          achieved_date: new Date().toISOString(),
          reward_unlocked: 'theme_pack',
          reward_applied: true
        });
        milestones.push(m);

        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'milestone_unlocked',
          title: '🎬 Milestone: 50 Streams!',
          message: 'You\'re a streaming pro! Unlock exclusive theme packs for your profile.',
          is_read: false,
          created_date: new Date().toISOString()
        }).catch(() => {});
      }
    }

    // Milestone 4: $5k earnings → Featured spotlight
    if (creator.total_earnings_denarii >= 325000) { // ~$5k in denarii
      const existing = await base44.asServiceRole.entities.CreatorMilestone.filter(
        { creator_email: user.email, milestone_type: 'earnings', milestone_value: 5000 }, null, 1
      ).catch(() => []);

      if (existing.length === 0) {
        const m = await base44.asServiceRole.entities.CreatorMilestone.create({
          creator_email: user.email,
          milestone_type: 'earnings',
          milestone_value: 5000,
          achieved_date: new Date().toISOString(),
          reward_unlocked: 'featured',
          reward_applied: true
        });
        milestones.push(m);

        await base44.asServiceRole.entities.Notification.create({
          user_email: user.email,
          type: 'milestone_unlocked',
          title: '💰 Milestone: $5,000 Earned!',
          message: 'Featured on the platform homepage for 1 week. Your success inspires us!',
          is_read: false,
          created_date: new Date().toISOString()
        }).catch(() => {});
      }
    }

    console.log(`[checkCreatorMilestones] ${user.email}: ${milestones.length} new milestones unlocked`);

    return Response.json({
      success: true,
      newMilestones: milestones.length,
      milestones
    });

  } catch (error) {
    console.error('[checkCreatorMilestones] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});