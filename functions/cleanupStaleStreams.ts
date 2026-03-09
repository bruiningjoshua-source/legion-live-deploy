import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Production cleanup: ends stale streams, resets orphaned creator statuses, expires old bans
// Runs every 30 minutes via scheduled automation

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled automation calls (no user session) OR admin users
    const user = await base44.auth.me().catch(() => null);
    if (user !== null && user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
    let cleanedStreams = 0;
    let resetCreators = 0;
    let expiredBans = 0;

    // ── 1. End stale streams ──
    const liveStreams = await base44.asServiceRole.entities.Stream.filter(
      { status: 'live' }, '-created_date', 200
    );
    console.log('[cleanup] Found', liveStreams.length, 'live streams');

    for (const stream of liveStreams) {
      const age = now.getTime() - new Date(stream.created_date).getTime();
      if (age > STALE_THRESHOLD_MS) {
        const durationMin = Math.floor(age / 60000);
        await base44.asServiceRole.entities.Stream.update(stream.id, {
          status: 'ended',
          duration_minutes: durationMin,
          viewer_count: 0
        });

        if (stream.creator_id) {
          try {
            await base44.asServiceRole.entities.Creator.update(stream.creator_id, {
              is_live: false,
              current_stream_id: null
            });
          } catch (e) {
            console.warn('[cleanup] Creator reset failed:', stream.creator_id, e.message);
          }
        }

        try {
          await base44.asServiceRole.entities.ChatMessage.create({
            stream_id: stream.id,
            sender_email: 'system',
            sender_name: 'System',
            message: 'This stream was automatically ended due to inactivity.',
            message_type: 'system'
          });
        } catch (e) {}

        cleanedStreams++;
        console.log('[cleanup] Ended stale stream:', stream.id, '— age:', durationMin, 'min');
      }
    }

    // ── 2. Reset orphaned creators (marked live but no live stream) ──
    const liveCreators = await base44.asServiceRole.entities.Creator.filter(
      { is_live: true }, null, 200
    );

    for (const creator of liveCreators) {
      const creatorStreams = await base44.asServiceRole.entities.Stream.filter(
        { creator_id: creator.id, status: 'live' }, null, 1
      );
      if (creatorStreams.length === 0) {
        await base44.asServiceRole.entities.Creator.update(creator.id, {
          is_live: false,
          current_stream_id: null
        });
        resetCreators++;
        console.log('[cleanup] Reset orphaned creator:', creator.id, creator.display_name);
      }
    }

    // ── 3. Expire temporary bans that have passed ──
    try {
      const activeBans = await base44.asServiceRole.entities.UserBan.filter(
        { is_active: true }, null, 200
      );
      for (const ban of activeBans) {
        if (ban.expires_at && new Date(ban.expires_at) < now) {
          await base44.asServiceRole.entities.UserBan.update(ban.id, { is_active: false });
          expiredBans++;
        }
      }
    } catch (e) {
      console.warn('[cleanup] Ban expiry check failed:', e.message);
    }

    // ── 4. Clean up viewer counts on ended streams (zero out any stuck counts) ──
    try {
      const recentEndedStreams = await base44.asServiceRole.entities.Stream.filter(
        { status: 'ended' }, '-updated_date', 50
      );
      for (const s of recentEndedStreams) {
        if (s.viewer_count > 0) {
          await base44.asServiceRole.entities.Stream.update(s.id, { viewer_count: 0 });
        }
      }
    } catch (e) {
      console.warn('[cleanup] Viewer count reset failed:', e.message);
    }

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      cleaned_streams: cleanedStreams,
      reset_creators: resetCreators,
      expired_bans: expiredBans,
      total_live_checked: liveStreams.length,
      duration_ms: duration
    };

    console.log('[cleanup] Completed in', duration, 'ms:', JSON.stringify(result));
    return Response.json(result);

  } catch (error) {
    console.error('[cleanup] Fatal error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});