import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Atomic viewer count update — prevents race conditions from concurrent joins/leaves.
 * Uses service role to bypass RLS and guarantee consistency.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId, action } = await req.json();

    if (!streamId || !['join', 'leave'].includes(action)) {
      return Response.json({ error: 'Invalid parameters: streamId and action (join|leave) required' }, { status: 400 });
    }

    // Fetch current stream state with service role (bypasses RLS)
    const streams = await base44.asServiceRole.entities.Stream.filter({ id: streamId }, null, 1);
    const stream = streams[0];

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (stream.status !== 'live' && action === 'join') {
      return Response.json({ error: 'Stream is not live' }, { status: 400 });
    }

    // Re-fetch immediately before write to minimise race-condition window
    const freshStreams = await base44.asServiceRole.entities.Stream.filter({ id: streamId }, null, 1);
    const fresh = freshStreams[0] || stream;
    const currentCount = fresh.viewer_count || 0;
    let newCount;

    if (action === 'join') {
      newCount = currentCount + 1;
      const peakViewers = Math.max(fresh.peak_viewers || 0, newCount);
      await base44.asServiceRole.entities.Stream.update(streamId, {
        viewer_count: newCount,
        peak_viewers: peakViewers,
      });
      console.log(`[viewerCount] JOIN stream=${streamId} user=${user.email} count=${currentCount}→${newCount} peak=${peakViewers}`);
    } else {
      newCount = Math.max(0, currentCount - 1);
      await base44.asServiceRole.entities.Stream.update(streamId, {
        viewer_count: newCount,
      });
      console.log(`[viewerCount] LEAVE stream=${streamId} user=${user.email} count=${currentCount}→${newCount}`);
    }

    return Response.json({ viewerCount: newCount, action });
  } catch (error) {
    console.error('[viewerCount] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});