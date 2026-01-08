import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { limit = 12, type = 'streams' } = await req.json().catch(() => ({}));

    if (type === 'streams') {
      // Get trending live streams
      const liveStreams = await base44.asServiceRole.entities.Stream.filter(
        { status: 'live', is_featured: true },
        '-viewer_count',
        limit
      );

      // If not enough featured, fill with popular ones
      if (liveStreams.length < limit) {
        const additional = await base44.asServiceRole.entities.Stream.filter(
          { status: 'live' },
          '-viewer_count',
          limit - liveStreams.length
        );
        return Response.json({
          trending: [...liveStreams, ...additional].slice(0, limit),
          type: 'streams'
        });
      }

      return Response.json({ trending: liveStreams, type: 'streams' });
    }

    if (type === 'collaborations') {
      // Get trending collaborations
      const collabs = await base44.asServiceRole.entities.CollabProject.filter(
        { status: ['scheduled', 'live'] },
        '-total_viewers',
        limit
      );

      return Response.json({ trending: collabs, type: 'collaborations' });
    }

    if (type === 'creators') {
      // Get trending creators
      const creators = await base44.asServiceRole.entities.Creator.filter(
        { is_live: true },
        '-follower_count',
        limit
      );

      return Response.json({ trending: creators, type: 'creators' });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Trending error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});