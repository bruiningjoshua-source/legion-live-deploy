/* eslint-disable no-undef */
// ═══ CONVERTED: clearLiveStreams ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { data: liveStreams } = await supabase.from('stream').select('*').eq('status', 'live').limit(500);
    for (const stream of (liveStreams || [])) {
      await supabase.from('stream').update({ status: 'ended', duration_minutes: Math.floor((Date.now() - new Date(stream.created_date).getTime()) / 60000), viewer_count: 0 }).eq('id', stream.id);
    }
    const { data: liveCreators } = await supabase.from('creator').select('id').eq('is_live', true).limit(500);
    for (const creator of (liveCreators || [])) {
      await supabase.from('creator').update({ is_live: false, current_stream_id: null }).eq('id', creator.id);
    }
    let collabCount = 0, pkCount = 0;
    const { data: collabs } = await supabase.from('collab_project').select('id').eq('status', 'live').limit(200).catch(() => ({ data: [] }));
    for (const c of (collabs || [])) { await supabase.from('collab_project').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', c.id); collabCount++; }
    const { data: pks } = await supabase.from('pk_battle').select('id').eq('status', 'active').limit(100).catch(() => ({ data: [] }));
    for (const pk of (pks || [])) { await supabase.from('pk_battle').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', pk.id); pkCount++; }

    return Response.json({ success: true, cleared: { streams: (liveStreams||[]).length, creators: (liveCreators||[]).length, collaborations: collabCount, pk_battles: pkCount }, initiated_by: user.email });
  } catch (error) {
    console.error('[clearLiveStreams] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});