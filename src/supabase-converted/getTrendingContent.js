/* eslint-disable no-undef */
// ═══ CONVERTED: getTrendingContent ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const { limit = 12, type = 'streams' } = await req.json().catch(() => ({}));

    if (type === 'streams') {
      const { data: featured } = await supabase.from('stream').select('*').eq('status', 'live').eq('is_featured', true).order('viewer_count', { ascending: false }).limit(limit);
      if ((featured||[]).length < limit) {
        const { data: additional } = await supabase.from('stream').select('*').eq('status', 'live').order('viewer_count', { ascending: false }).limit(limit - (featured||[]).length);
        return Response.json({ trending: [...(featured||[]), ...(additional||[])].slice(0, limit), type: 'streams' });
      }
      return Response.json({ trending: featured || [], type: 'streams' });
    }
    if (type === 'creators') {
      const { data: creators } = await supabase.from('creator').select('*').eq('is_live', true).order('follower_count', { ascending: false }).limit(limit);
      return Response.json({ trending: creators || [], type: 'creators' });
    }
    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});