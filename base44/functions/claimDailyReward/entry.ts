import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const DAY_REWARDS = [10, 15, 25, 35, 50, 75, 100];

    // Use user context (not service role) so RLS user_email check passes
    let streaks;
    try {
      streaks = await base44.entities.WatchStreak.filter({ user_email: user.email }, null, 1);
    } catch (e) {
      console.error('WatchStreak filter error:', e.message);
      streaks = [];
    }
    const streak = streaks[0] || null;

    // Already claimed today
    if (streak?.last_watch_date === today) {
      return Response.json({ error: 'Already claimed today', alreadyClaimed: true }, { status: 400 });
    }

    // Calculate new streak
    const currentStrk = streak?.current_streak || 0;
    const newStreak = (streak?.last_watch_date === yesterday) ? currentStrk + 1 : 1;
    const dayIndex = (newStreak - 1) % 7;
    const rewardDenarii = DAY_REWARDS[dayIndex];

    // Update or create streak using user context
    if (streak?.id) {
      await base44.entities.WatchStreak.update(streak.id, {
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak || 0),
        last_watch_date: today,
        total_days_watched: (streak.total_days_watched || 0) + 1,
      });
    } else {
      await base44.entities.WatchStreak.create({
        user_email: user.email,
        current_streak: 1,
        longest_streak: 1,
        last_watch_date: today,
        total_days_watched: 1,
      });
    }

    // Update wallet — use service role so we can credit any user
    const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
    if (wallets[0]) {
      await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
        denarii_balance: (wallets[0].denarii_balance || 0) + rewardDenarii,
      });
    }

    return Response.json({ newStreak, rewardDenarii, day: dayIndex + 1 });
  } catch (error) {
    console.error('claimDailyReward error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});