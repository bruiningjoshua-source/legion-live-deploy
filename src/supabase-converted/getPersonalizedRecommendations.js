/* eslint-disable no-undef */
// ═══ CONVERTED: getPersonalizedRecommendations ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { limit = 20 } = await req.json().catch(() => ({}));
    const [viewRes, likeRes, followRes] = await Promise.all([
      supabase.from('viewing_history').select('*').eq('user_email', user.email).order('created_date', { ascending: false }).limit(50),
      supabase.from('content_like').select('*').eq('user_email', user.email).order('created_date', { ascending: false }).limit(50),
      supabase.from('follow').select('following_creator_id').eq('follower_email', user.email).limit(100),
    ]);
    const catPrefs = {}, creatorPrefs = {};
    (viewRes.data||[]).forEach(v => { if (v.category) catPrefs[v.category] = (catPrefs[v.category]||0) + (v.engagement_score||1); if (v.creator_id) creatorPrefs[v.creator_id] = (creatorPrefs[v.creator_id]||0) + 1; });
    (likeRes.data||[]).forEach(l => { if (l.category) catPrefs[l.category] = (catPrefs[l.category]||0) + 2; });
    const followedIds = (followRes.data||[]).map(f => f.following_creator_id);

    const { data: liveStreams } = await supabase.from('stream').select('*').eq('status', 'live').order('viewer_count', { ascending: false }).limit(100);
    const scored = (liveStreams||[]).map(s => {
      let score = 0;
      if (followedIds.includes(s.creator_id)) score += 50;
      if (catPrefs[s.category]) score += catPrefs[s.category] * 10;
      score += (s.viewer_count||0) / 10;
      if (s.is_featured) score += 30;
      return { ...s, recommendation_score: score };
    }).sort((a, b) => b.recommendation_score - a.recommendation_score).slice(0, limit);

    return Response.json({ recommendations: scored, preferences: { categories: Object.entries(catPrefs).sort(([,a],[,b]) => b-a).slice(0,5).map(([c]) => c) } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});