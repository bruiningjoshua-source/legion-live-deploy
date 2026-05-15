/* eslint-disable no-undef */
// ═══ CONVERTED: generateRecommendations ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { type = 'streams' } = await req.json().catch(() => ({}));
    const [watchRes, followRes, interestRes] = await Promise.all([
      supabase.from('watch_history').select('video_id').eq('user_email', user.email).order('watched_at', { ascending: false }).limit(50),
      supabase.from('follow').select('followed_id').eq('follower_email', user.email),
      supabase.from('user_interest').select('interest').eq('user_email', user.email),
    ]);
    const followedIds = (followRes.data||[]).map(f => f.followed_id);
    const interests = (interestRes.data||[]).map(i => i.interest);

    if (type === 'streams') {
      const { data: liveStreams } = await supabase.from('stream').select('*').eq('status', 'live').order('viewer_count', { ascending: false }).limit(50);
      const scored = (liveStreams||[]).map(s => {
        let score = 0;
        if (followedIds.includes(s.creator_id)) score += 50;
        if (interests.includes(s.category)) score += 30;
        score += Math.min(s.viewer_count||0, 100) / 10;
        return { ...s, relevance_score: score };
      }).sort((a, b) => b.relevance_score - a.relevance_score);
      return Response.json({ recommendations: scored.slice(0, 20), user_interests: interests });
    }
    if (type === 'creators') {
      const { data: creators } = await supabase.from('creator').select('*').order('follower_count', { ascending: false }).limit(100);
      const scored = (creators||[]).filter(c => !followedIds.includes(c.id) && c.user_email !== user.email).map(c => {
        let score = 0;
        if (interests.includes(c.category)) score += 40;
        score += Math.min((c.follower_count||0) / 1000, 30);
        if (c.is_live) score += 25;
        return { ...c, relevance_score: score };
      }).sort((a, b) => b.relevance_score - a.relevance_score);
      return Response.json({ recommendations: scored.slice(0, 20) });
    }
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});