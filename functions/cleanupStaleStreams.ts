import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Cleanup function to end stale streams (streams that are "live" but inactive)
// Can be called manually or via scheduled automation

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can run this cleanup
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find all "live" streams
    const liveStreams = await base44.asServiceRole.entities.Stream.filter(
      { status: 'live' },
      '-created_date',
      100
    );

    console.log('[cleanupStaleStreams] Found', liveStreams.length, 'live streams');

    const staleThreshold = 4 * 60 * 60 * 1000; // 4 hours - streams older than this are considered stale
    const now = new Date();
    let cleanedCount = 0;

    for (const stream of liveStreams) {
      const streamAge = now - new Date(stream.created_date);
      
      // Mark as ended if stream is older than threshold
      if (streamAge > staleThreshold) {
        const durationMin = Math.floor(streamAge / 60000);
        await base44.asServiceRole.entities.Stream.update(stream.id, {
          status: 'ended',
          duration_minutes: durationMin,
          viewer_count: 0
        });

        // Update creator status
        if (stream.creator_id) {
          try {
            await base44.asServiceRole.entities.Creator.update(stream.creator_id, {
              is_live: false,
              current_stream_id: null
            });
          } catch (e) {
            console.warn('[cleanupStaleStreams] Failed to update creator:', stream.creator_id, e.message);
          }
        }

        // Post system end message in chat
        try {
          await base44.asServiceRole.entities.ChatMessage.create({
            stream_id: stream.id,
            sender_email: 'system',
            sender_name: 'System',
            message: 'This stream was automatically ended due to inactivity.',
            message_type: 'system'
          });
        } catch (e) {}

        cleanedCount++;
        console.log('[cleanupStaleStreams] Ended stale stream:', stream.id, 'Age:', durationMin, 'minutes');
      }
    }

    // Also find creators marked as live but with no active stream
    const liveCreators = await base44.asServiceRole.entities.Creator.filter(
      { is_live: true },
      null,
      100
    );

    for (const creator of liveCreators) {
      // Check if they have an actual live stream
      const creatorStreams = await base44.asServiceRole.entities.Stream.filter(
        { creator_id: creator.id, status: 'live' },
        null,
        1
      );

      if (creatorStreams.length === 0) {
        // No live stream, reset creator status
        await base44.asServiceRole.entities.Creator.update(creator.id, {
          is_live: false,
          current_stream_id: null
        });
        console.log('[cleanupStaleStreams] Reset stale creator status:', creator.id);
      }
    }

    return Response.json({ 
      success: true, 
      cleaned_streams: cleanedCount,
      total_live_checked: liveStreams.length
    });
  } catch (error) {
    console.error('[cleanupStaleStreams] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});