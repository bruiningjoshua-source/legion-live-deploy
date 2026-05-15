/* eslint-disable no-undef */
// ═══ CONVERTED: generateCollabMatches ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: myCreators } = await supabase.from('creator').select('*').eq('user_email', user.email).limit(1);
    const myCreator = (myCreators||[])[0];
    if (!myCreator) return Response.json({ error: 'No creator profile' }, { status: 404 });

    const { data: allCreators } = await supabase.from('creator').select('*').neq('user_email', user.email).order('follower_count', { ascending: false }).limit(200);
    const [outRes, inRes] = await Promise.all([
      supabase.from('collab_match').select('creator_b_id').eq('creator_a_id', user.email),
      supabase.from('collab_match').select('creator_a_id').eq('creator_b_id', user.email),
    ]);
    const existing = new Set([...(outRes.data||[]).map(m => m.creator_b_id), ...(inRes.data||[]).map(m => m.creator_a_id)]);

    const matches = (allCreators||[]).filter(c => !existing.has(c.user_email)).map(c => {
      let score = 0;
      if (c.category === myCreator.category) score += 35;
      const ratio = (myCreator.follower_count||1) > 0 && (c.follower_count||1) > 0 ? Math.min(myCreator.follower_count, c.follower_count) / Math.max(myCreator.follower_count, c.follower_count) : 0.5;
      score += Math.floor(ratio * 25);
      if (myCreator.is_verified && c.is_verified) score += 15;
      score = Math.min(100, Math.max(50, score + Math.floor(Math.random() * 10)));
      return { creator: c, compatibility_score: score, audience_overlap_percent: Math.floor(ratio * 100 * (c.category === myCreator.category ? 0.7 : 0.3)) };
    }).sort((a, b) => b.compatibility_score - a.compatibility_score).slice(0, 5);

    const created = [];
    for (const m of matches) {
      const { data: match } = await supabase.from('collab_match').insert({ creator_a_id: user.email, creator_b_id: m.creator.user_email, compatibility_score: m.compatibility_score, audience_overlap_percent: m.audience_overlap_percent, status: 'suggested' }).select().single();
      created.push(match);
    }
    return Response.json({ matches_created: created.length, matches: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});