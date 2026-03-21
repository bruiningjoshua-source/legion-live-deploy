import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Admin-only: Force-clear ALL live streams and reset platform state
// Use for maintenance or emergency situations

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[clearLiveStreams] Admin', user.email, 'initiated full platform clear');

    // End all live streams
    const liveStreams = await base44.asServiceRole.entities.Stream.filter({ status: 'live' }, null, 500);
    for (const stream of liveStreams) {
      await base44.asServiceRole.entities.Stream.update(stream.id, {
        status: 'ended',
        duration_minutes: Math.floor((Date.now() - new Date(stream.created_date).getTime()) / 60000),
        viewer_count: 0
      });
    }

    // Reset all live creators
    const liveCreators = await base44.asServiceRole.entities.Creator.filter({ is_live: true }, null, 500);
    for (const creator of liveCreators) {
      await base44.asServiceRole.entities.Creator.update(creator.id, {
        is_live: false,
        current_stream_id: null
      });
    }

    // End live collaborations
    let collabCount = 0;
    try {
      const liveCollabs = await base44.asServiceRole.entities.CollabProject.filter({ status: 'live' }, null, 200);
      for (const collab of liveCollabs) {
        await base44.asServiceRole.entities.CollabProject.update(collab.id, {
          status: 'completed',
          ended_at: new Date().toISOString()
        });
      }
      collabCount = liveCollabs.length;
    } catch (e) {
      console.warn('[clearLiveStreams] Collab cleanup failed:', e.message);
    }

    // End active PK battles
    let pkCount = 0;
    try {
      const activePKs = await base44.asServiceRole.entities.PKBattle.filter({ status: 'active' }, null, 100);
      for (const pk of activePKs) {
        await base44.asServiceRole.entities.PKBattle.update(pk.id, {
          status: 'completed',
          ended_at: new Date().toISOString()
        });
      }
      pkCount = activePKs.length;
    } catch (e) {
      console.warn('[clearLiveStreams] PK cleanup failed:', e.message);
    }

    const result = {
      success: true,
      cleared: {
        streams: liveStreams.length,
        creators: liveCreators.length,
        collaborations: collabCount,
        pk_battles: pkCount
      },
      initiated_by: user.email
    };

    console.log('[clearLiveStreams] Complete:', JSON.stringify(result));
    return Response.json(result);

  } catch (error) {
    console.error('[clearLiveStreams] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});