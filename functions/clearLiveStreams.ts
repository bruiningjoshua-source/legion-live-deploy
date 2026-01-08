import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all live streams
    const liveStreams = await base44.asServiceRole.entities.Stream.filter(
      { status: 'live' },
      null,
      1000
    );

    // End all live streams
    const streamUpdatePromises = liveStreams.map(stream =>
      base44.asServiceRole.entities.Stream.update(stream.id, {
        status: 'ended',
        duration_minutes: Math.floor((new Date() - new Date(stream.created_date)) / 60000)
      })
    );

    // Get all live creators
    const liveCreators = await base44.asServiceRole.entities.Creator.filter(
      { is_live: true },
      null,
      1000
    );

    // Set creators offline
    const creatorUpdatePromises = liveCreators.map(creator =>
      base44.asServiceRole.entities.Creator.update(creator.id, {
        is_live: false,
        current_stream_id: null
      })
    );

    // Get all live collaboration projects
    const liveCollabs = await base44.asServiceRole.entities.CollabProject.filter(
      { status: 'live' },
      null,
      1000
    );

    // End live collaborations
    const collabUpdatePromises = liveCollabs.map(collab =>
      base44.asServiceRole.entities.CollabProject.update(collab.id, {
        status: 'completed',
        ended_at: new Date().toISOString()
      })
    );

    // Execute all updates in parallel
    await Promise.all([
      ...streamUpdatePromises,
      ...creatorUpdatePromises,
      ...collabUpdatePromises
    ]);

    console.log(`Cleared ${liveStreams.length} streams, ${liveCreators.length} creators, ${liveCollabs.length} collaborations`);

    return Response.json({
      success: true,
      cleared: {
        streams: liveStreams.length,
        creators: liveCreators.length,
        collaborations: liveCollabs.length
      },
      message: 'Platform cleared and ready for launch'
    });
  } catch (error) {
    console.error('Clear live streams error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});