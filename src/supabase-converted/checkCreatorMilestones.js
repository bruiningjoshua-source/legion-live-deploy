/* eslint-disable no-undef */
// ═══ CONVERTED: checkCreatorMilestones ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: creators } = await supabase.from('creator').select('*').eq('user_email', user.email).limit(1);
    const creator = (creators||[])[0];
    if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });

    const milestones = [];
    const checkMilestone = async (type, value, reward, title, msg, extra = {}) => {
      const { data: existing } = await supabase.from('creator_milestone').select('id').eq('creator_email', user.email).eq('milestone_type', type).eq('milestone_value', value).limit(1);
      if (!(existing||[]).length) {
        const { data: m } = await supabase.from('creator_milestone').insert({ creator_email: user.email, milestone_type: type, milestone_value: value, achieved_date: new Date().toISOString(), reward_unlocked: reward, reward_applied: true, ...extra }).select().single();
        milestones.push(m);
        await supabase.from('notification').insert({ user_email: user.email, type: 'milestone_unlocked', title, message: msg, is_read: false }).catch(() => {});
      }
    };

    if (creator.follower_count >= 1000) await checkMilestone('followers', 1000, 'custom_overlay', '🎉 1,000 Followers!', 'Custom overlay tools unlocked!');
    if (creator.follower_count >= 10000) await checkMilestone('followers', 10000, 'revenue_boost', '⭐ 10,000 Followers!', '+10% earnings for 30 days!', { boost_percentage: 10, boost_duration_days: 30, boost_expires: new Date(Date.now() + 86400000 * 30).toISOString() });

    const { data: streams } = await supabase.from('stream').select('id').eq('creator_id', user.email).eq('status', 'ended');
    if ((streams||[]).length >= 50) await checkMilestone('streams', 50, 'theme_pack', '🎬 50 Streams!', 'Exclusive theme packs unlocked!');
    if (creator.total_earnings_denarii >= 325000) await checkMilestone('earnings', 5000, 'featured', '💰 $5,000 Earned!', 'Featured on homepage for 1 week!');

    return Response.json({ success: true, newMilestones: milestones.length, milestones });
  } catch (error) {
    console.error('[checkCreatorMilestones] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});