import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Production cleanup: ends stale streams, resets orphaned creators, expires old bans
// Runs every 30 minutes via scheduled automation
// Rate-limit safe: includes delays between batched API calls

const delay = (ms) => new Promise(r => setTimeout(r, ms));

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
      { status: 'live' }, '-created_date', 100
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
        await delay(200); // Rate-limit protection

        if (stream.creator_id) {
          try {
            await base44.asServiceRole.entities.Creator.update(stream.creator_id, {
              is_live: false,
              current_stream_id: null
            });
            await delay(200);
          } catch (e) {
            console.warn('[cleanup] Creator reset failed:', stream.creator_id, e.message);
          }
        }

        cleanedStreams++;
        console.log('[cleanup] Ended stale stream:', stream.id, '— age:', durationMin, 'min');
      }
    }

    await delay(300);

    // ── 2. Reset orphaned creators (marked live but no live stream) ──
    const liveCreators = await base44.asServiceRole.entities.Creator.filter(
      { is_live: true }, null, 100
    );

    for (const creator of liveCreators) {
      const creatorStreams = await base44.asServiceRole.entities.Stream.filter(
        { creator_id: creator.id, status: 'live' }, null, 1
      );
      await delay(150);
      if (creatorStreams.length === 0) {
        await base44.asServiceRole.entities.Creator.update(creator.id, {
          is_live: false,
          current_stream_id: null
        });
        resetCreators++;
        console.log('[cleanup] Reset orphaned creator:', creator.id, creator.display_name);
        await delay(200);
      }
    }

    await delay(300);

    // ── 3. Expire temporary bans that have passed ──
    try {
      const activeBans = await base44.asServiceRole.entities.UserBan.filter(
        { is_active: true }, null, 100
      );
      for (const ban of activeBans) {
        if (ban.expires_at && new Date(ban.expires_at) < now) {
          await base44.asServiceRole.entities.UserBan.update(ban.id, { is_active: false });
          expiredBans++;
          await delay(150);
        }
      }
    } catch (e) {
      console.warn('[cleanup] Ban expiry check failed:', e.message);
    }

    await delay(300);

    // ── 4. Clean up viewer counts on ended streams (zero out any stuck counts) ──
    try {
      const recentEndedStreams = await base44.asServiceRole.entities.Stream.filter(
        { status: 'ended' }, '-updated_date', 30
      );
      let fixedCounts = 0;
      for (const s of recentEndedStreams) {
        if (s.viewer_count > 0) {
          await base44.asServiceRole.entities.Stream.update(s.id, { viewer_count: 0 });
          fixedCounts++;
          await delay(150);
        }
      }
      if (fixedCounts > 0) console.log('[cleanup] Reset', fixedCounts, 'stuck viewer counts');
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