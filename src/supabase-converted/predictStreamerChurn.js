/* eslint-disable no-undef */
// ═══ CONVERTED: predictStreamerChurn ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const { data: allCreators } = await supabase.from('creator').select('user_email,display_name,follower_count').eq('is_live', false).order('follower_count', { ascending: false }).limit(5000);
    const predictions = [];
    for (const creator of (allCreators||[])) {
      let churnScore = 0; const indicators = [];
      const { data: streams } = await supabase.from('stream').select('created_date,viewer_count').eq('creator_id', creator.user_email).eq('status', 'ended').order('created_date', { ascending: false }).limit(2);
      let daysSince = 999;
      if ((streams||[])[0]) { daysSince = Math.floor((Date.now() - new Date(streams[0].created_date).getTime()) / 86400000); }
      if (daysSince > 30) { churnScore += 40; indicators.push(`Offline ${daysSince}d`); }
      else if (daysSince > 14) { churnScore += 25; indicators.push(`Offline ${daysSince}d`); }
      if (!streams?.length) { churnScore += 50; indicators.push('Never streamed'); }
      if (churnScore > 50) predictions.push({ creatorEmail: creator.user_email, creatorName: creator.display_name, churnScore: Math.min(churnScore, 100), indicators, daysSinceStream: daysSince, followerCount: creator.follower_count });
    }
    predictions.sort((a, b) => b.churnScore - a.churnScore);
    return Response.json({ totalCreators: (allCreators||[]).length, atRiskCreators: predictions.length, predictions: predictions.slice(0, 50) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});