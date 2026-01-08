import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, value } = await req.json();

    // Get or create engagement record
    const engagements = await base44.entities.UserEngagement.filter({ user_email: user.email }, null, 1);
    let engagement = engagements[0];

    if (!engagement) {
      engagement = await base44.entities.UserEngagement.create({
        user_email: user.email,
        daily_streak: 0,
        experience_points: 0,
        level: 1,
        next_level_xp: 100
      });
    }

    let xpGained = 0;
    let updates = {};

    // Track different actions
    switch (action) {
      case 'watch_time':
        updates.total_watch_time_minutes = (engagement.total_watch_time_minutes || 0) + (value || 1);
        xpGained = Math.floor((value || 1) / 10); // 1 XP per 10 minutes
        break;
      
      case 'send_gift':
        updates.total_gifts_sent = (engagement.total_gifts_sent || 0) + 1;
        xpGained = 10;
        break;
      
      case 'send_message':
        updates.total_comments = (engagement.total_comments || 0) + 1;
        xpGained = 1;
        break;
      
      case 'daily_login':
        xpGained = 25;
        break;
    }

    // Update XP and check level up
    const newXP = (engagement.experience_points || 0) + xpGained;
    let newLevel = engagement.level || 1;
    let nextLevelXP = engagement.next_level_xp || 100;

    while (newXP >= nextLevelXP) {
      newLevel++;
      nextLevelXP = Math.floor(nextLevelXP * 1.5);
    }

    updates.experience_points = newXP;
    updates.level = newLevel;
    updates.next_level_xp = nextLevelXP;

    // Check and unlock achievements
    const achievements = [];
    
    if (!engagement.achievements_unlocked?.includes('first_stream') && updates.total_watch_time_minutes >= 0) {
      achievements.push('first_stream');
    }
    
    if (!engagement.achievements_unlocked?.includes('gift_sender') && updates.total_gifts_sent >= 1) {
      achievements.push('gift_sender');
    }
    
    if (!engagement.achievements_unlocked?.includes('social_butterfly') && updates.total_comments >= 50) {
      achievements.push('social_butterfly');
    }
    
    if (!engagement.achievements_unlocked?.includes('marathon_viewer') && updates.total_watch_time_minutes >= 600) {
      achievements.push('marathon_viewer');
    }
    
    if (!engagement.achievements_unlocked?.includes('loyal_fan') && engagement.daily_streak >= 7) {
      achievements.push('loyal_fan');
    }

    if (achievements.length > 0) {
      updates.achievements_unlocked = [...(engagement.achievements_unlocked || []), ...achievements];
    }

    // Update engagement
    await base44.entities.UserEngagement.update(engagement.id, updates);

    return Response.json({ 
      success: true, 
      xp_gained: xpGained,
      level: newLevel,
      achievements_unlocked: achievements
    });

  } catch (error) {
    console.error('Engagement tracking error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});