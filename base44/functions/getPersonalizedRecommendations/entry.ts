import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 20 } = await req.json().catch(() => ({}));

    // Fetch user's viewing history
    const viewingHistory = await base44.entities.ViewingHistory.filter(
      { user_email: user.email },
      '-created_date',
      50
    );

    // Fetch user's liked content
    const likes = await base44.entities.ContentLike.filter(
      { user_email: user.email },
      '-created_date',
      50
    );

    // Get followed creators
    const follows = await base44.entities.Follow.filter(
      { follower_email: user.email },
      null,
      100
    );

    // Extract preferences from history
    const categoryPreferences = {};
    const creatorPreferences = {};

    viewingHistory.forEach(view => {
      if (view.category) {
        categoryPreferences[view.category] = (categoryPreferences[view.category] || 0) + (view.engagement_score || 1);
      }
      if (view.creator_id) {
        creatorPreferences[view.creator_id] = (creatorPreferences[view.creator_id] || 0) + (view.engagement_score || 1);
      }
    });

    likes.forEach(like => {
      if (like.category) {
        categoryPreferences[like.category] = (categoryPreferences[like.category] || 0) + 2;
      }
      if (like.creator_id) {
        creatorPreferences[like.creator_id] = (creatorPreferences[like.creator_id] || 0) + 2;
      }
    });

    // Get followed creators' content
    const followedCreatorIds = follows.map(f => f.following_creator_id);

    // Fetch live streams
    const liveStreams = await base44.asServiceRole.entities.Stream.filter(
      { status: 'live' },
      '-viewer_count',
      100
    );

    // Score and rank recommendations
    const recommendations = liveStreams.map(stream => {
      let score = 0;

      // Boost for followed creator
      if (followedCreatorIds.includes(stream.creator_id)) {
        score += 50;
      }

      // Boost for preferred category
      if (categoryPreferences[stream.category]) {
        score += categoryPreferences[stream.category] * 10;
      }

      // Boost for popular streams
      score += (stream.viewer_count || 0) / 10;

      // Boost for trending (featured)
      if (stream.is_featured) {
        score += 30;
      }

      // Penalize for recently watched
      const viewedBefore = viewingHistory.some(v => v.stream_id === stream.id);
      if (viewedBefore) {
        score *= 0.5;
      }

      return {
        ...stream,
        recommendation_score: score
      };
    });

    // Sort by score and return
    const personalizedRecs = recommendations
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);

    console.log(`Generated ${personalizedRecs.length} personalized recommendations for ${user.email}`);

    return Response.json({
      recommendations: personalizedRecs,
      preferences: {
        categories: Object.entries(categoryPreferences)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([cat]) => cat),
        topFollowedCreators: followedCreatorIds.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});