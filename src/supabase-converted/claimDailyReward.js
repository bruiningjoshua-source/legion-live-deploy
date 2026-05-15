/* eslint-disable no-undef */
// ═══ CONVERTED: claimDailyReward — Base44 → Supabase Edge Function ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const DAY_REWARDS = [10, 15, 25, 35, 50, 75, 100];

    const { data: streaks } = await supabase
      .from('watch_streak')
      .select('*')
      .eq('user_email', user.email)
      .limit(1);
    const streak = (streaks || [])[0] || null;

    if (streak?.last_watch_date === today) {
      return Response.json({ error: 'Already claimed today', alreadyClaimed: true }, { status: 400 });
    }

    const currentStrk = streak?.current_streak || 0;
    const newStreak = (streak?.last_watch_date === yesterday) ? currentStrk + 1 : 1;
    const dayIndex = (newStreak - 1) % 7;
    const rewardDenarii = DAY_REWARDS[dayIndex];

    if (streak?.id) {
      await supabase.from('watch_streak').update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak || 0),
        last_watch_date: today,
        total_days_watched: (streak.total_days_watched || 0) + 1,
      }).eq('id', streak.id);
    } else {
      await supabase.from('watch_streak').insert({
        user_email: user.email,
        current_streak: 1,
        longest_streak: 1,
        last_watch_date: today,
        total_days_watched: 1,
      });
    }

    // Credit wallet
    const { data: wallets } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_email', user.email)
      .limit(1);
    if ((wallets || [])[0]) {
      await supabase.from('wallet').update({
        denarii_balance: (wallets[0].denarii_balance || 0) + rewardDenarii,
      }).eq('id', wallets[0].id);
    }

    return Response.json({ newStreak, rewardDenarii, day: dayIndex + 1 });
  } catch (error) {
    console.error('claimDailyReward error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});