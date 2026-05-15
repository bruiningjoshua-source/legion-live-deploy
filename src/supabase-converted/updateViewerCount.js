/* eslint-disable no-undef */
// ═══ CONVERTED: updateViewerCount — Base44 → Supabase Edge Function ═══
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

    const { streamId, action } = await req.json();

    if (!streamId || !['join', 'leave'].includes(action)) {
      return Response.json({ error: 'Invalid parameters: streamId and action (join|leave) required' }, { status: 400 });
    }

    const { data: streams } = await supabase
      .from('stream')
      .select('*')
      .eq('id', streamId)
      .limit(1);
    const stream = (streams || [])[0];

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.status !== 'live' && action === 'join') {
      return Response.json({ error: 'Stream is not live' }, { status: 400 });
    }

    // Re-fetch for freshest count
    const { data: freshStreams } = await supabase
      .from('stream')
      .select('*')
      .eq('id', streamId)
      .limit(1);
    const fresh = (freshStreams || [])[0] || stream;
    const currentCount = fresh.viewer_count || 0;
    let newCount;

    if (action === 'join') {
      newCount = currentCount + 1;
      const peakViewers = Math.max(fresh.peak_viewers || 0, newCount);
      await supabase.from('stream').update({
        viewer_count: newCount,
        peak_viewers: peakViewers,
      }).eq('id', streamId);
      console.log(`[viewerCount] JOIN stream=${streamId} user=${user.email} count=${currentCount}→${newCount} peak=${peakViewers}`);
    } else {
      newCount = Math.max(0, currentCount - 1);
      await supabase.from('stream').update({
        viewer_count: newCount,
      }).eq('id', streamId);
      console.log(`[viewerCount] LEAVE stream=${streamId} user=${user.email} count=${currentCount}→${newCount}`);
    }

    return Response.json({ viewerCount: newCount, action });
  } catch (error) {
    console.error('[viewerCount] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});