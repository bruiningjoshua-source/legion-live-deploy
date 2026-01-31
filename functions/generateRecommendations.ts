import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type = 'streams' } = await req.json().catch(() => ({}));

    // Fetch user's watch history, follows, and interests
    const [watchHistory, follows, userInterests] = await Promise.all([
      base44.asServiceRole.entities.WatchHistory.filter({ user_email: user.email }, '-watched_at', 50),
      base44.asServiceRole.entities.Follow.filter({ follower_email: user.email }),
      base44.asServiceRole.entities.UserInterest.filter({ user_email: user.email })
    ]);

    const followedCreatorIds = follows.map(f => f.followed_id);
    const watchedVideoIds = watchHistory.map(h => h.video_id);
    const interests = userInterests.map(i => i.interest);

    let recommendations = [];

    if (type === 'streams') {
      // Get live streams
      const liveStreams = await base44.asServiceRole.entities.Stream.filter(
        { status: 'live' },
        '-viewer_count',
        50
      );

      // Score each stream based on relevance
      recommendations = liveStreams.map(stream => {
        let score = 0;
        
        // Boost for followed creators
        if (followedCreatorIds.includes(stream.creator_id)) {
          score += 50;
        }
        
        // Boost for matching category interests
        if (interests.includes(stream.category)) {
          score += 30;
        }
        
        // Boost for matching tags
        if (stream.tags?.some(tag => interests.includes(tag))) {
          score += 20;
        }
        
        // Viewer count factor (popularity)
        score += Math.min(stream.viewer_count || 0, 100) / 10;
        
        return { ...stream, relevance_score: score };
      });

      // Sort by relevance score
      recommendations.sort((a, b) => b.relevance_score - a.relevance_score);

    } else if (type === 'videos') {
      // Get published videos
      const videos = await base44.asServiceRole.entities.VlogVideo.filter(
        { is_published: true },
        '-view_count',
        100
      );

      // Filter out already watched and score
      recommendations = videos
        .filter(v => !watchedVideoIds.includes(v.id))
        .map(video => {
          let score = 0;
          
          if (followedCreatorIds.includes(video.creator_id)) {
            score += 50;
          }
          
          if (interests.includes(video.category)) {
            score += 30;
          }
          
          if (video.interests?.some(i => interests.includes(i))) {
            score += 25;
          }
          
          // Recency factor
          const daysSinceUpload = (Date.now() - new Date(video.created_date)) / (1000 * 60 * 60 * 24);
          if (daysSinceUpload < 7) score += 20;
          else if (daysSinceUpload < 30) score += 10;
          
          // Engagement factor
          score += Math.min((video.like_count || 0) / 100, 20);
          
          return { ...video, relevance_score: score };
        });

      recommendations.sort((a, b) => b.relevance_score - a.relevance_score);

    } else if (type === 'creators') {
      // Get creators not already followed
      const creators = await base44.asServiceRole.entities.Creator.filter(
        {},
        '-follower_count',
        100
      );

      recommendations = creators
        .filter(c => !followedCreatorIds.includes(c.id) && c.user_email !== user.email)
        .map(creator => {
          let score = 0;
          
          // Category match
          if (interests.includes(creator.category)) {
            score += 40;
          }
          
          // Follower factor
          score += Math.min((creator.follower_count || 0) / 1000, 30);
          
          // Verified bonus
          if (creator.is_verified) {
            score += 15;
          }
          
          // Currently live bonus
          if (creator.is_live) {
            score += 25;
          }
          
          return { ...creator, relevance_score: score };
        });

      recommendations.sort((a, b) => b.relevance_score - a.relevance_score);
    }

    return Response.json({
      recommendations: recommendations.slice(0, 20),
      user_interests: interests,
      followed_count: followedCreatorIds.length
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});