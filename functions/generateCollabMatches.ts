import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's creator profile
    const myCreators = await base44.asServiceRole.entities.Creator.filter({ user_email: user.email }, null, 1);
    const myCreator = myCreators[0];

    if (!myCreator) {
      return Response.json({ error: 'No creator profile found' }, { status: 404 });
    }

    // Get all other creators
    const allCreators = await base44.asServiceRole.entities.Creator.filter({}, '-follower_count', 200);
    const otherCreators = allCreators.filter(c => c.user_email !== user.email);

    // Get existing matches to avoid duplicates
    const [outgoing, incoming] = await Promise.all([
      base44.asServiceRole.entities.CollabMatch.filter({ creator_a_id: user.email }),
      base44.asServiceRole.entities.CollabMatch.filter({ creator_b_id: user.email })
    ]);
    
    const existingMatchEmails = new Set([
      ...outgoing.map(m => m.creator_b_id),
      ...incoming.map(m => m.creator_a_id)
    ]);

    // Calculate compatibility scores
    const potentialMatches = otherCreators
      .filter(c => !existingMatchEmails.has(c.user_email))
      .map(creator => {
        let score = 0;
        const sharedInterests = [];

        // Same category = high compatibility
        if (creator.category === myCreator.category) {
          score += 35;
          sharedInterests.push(creator.category);
        }

        // Similar follower count (within 2x range)
        const myFollowers = myCreator.follower_count || 0;
        const theirFollowers = creator.follower_count || 0;
        const followerRatio = myFollowers > 0 && theirFollowers > 0 
          ? Math.min(myFollowers, theirFollowers) / Math.max(myFollowers, theirFollowers)
          : 0.5;
        score += Math.floor(followerRatio * 25);

        // Both verified = bonus
        if (myCreator.is_verified && creator.is_verified) {
          score += 15;
        }

        // Content focus overlap
        const myBadges = myCreator.badges || [];
        const theirBadges = creator.badges || [];
        const commonBadges = myBadges.filter(b => theirBadges.includes(b));
        if (commonBadges.length > 0) {
          score += commonBadges.length * 5;
          sharedInterests.push(...commonBadges);
        }

        // Activity level (both active recently)
        if (myCreator.is_live || creator.is_live) {
          score += 10;
        }

        // Calculate audience overlap estimate
        const audienceOverlap = Math.floor(followerRatio * 100 * (creator.category === myCreator.category ? 0.7 : 0.3));

        // Suggest collab type based on category
        let suggestedCollab = 'dual_stream';
        if (['gaming', 'outdoor', 'fitness'].includes(creator.category)) {
          suggestedCollab = Math.random() > 0.5 ? 'pk_battle' : 'challenge';
        } else if (['music', 'talk_show'].includes(creator.category)) {
          suggestedCollab = 'podcast';
        } else if (['art', 'cooking', 'education'].includes(creator.category)) {
          suggestedCollab = 'video_collab';
        }

        // Add some randomness
        score += Math.floor(Math.random() * 10);
        score = Math.min(100, Math.max(50, score)); // Clamp between 50-100

        return {
          creator,
          compatibility_score: score,
          shared_interests: [...new Set(sharedInterests)],
          audience_overlap_percent: audienceOverlap,
          suggested_collab_type: suggestedCollab
        };
      })
      .sort((a, b) => b.compatibility_score - a.compatibility_score);

    // Create top matches
    const topMatches = potentialMatches.slice(0, 5);
    const createdMatches = [];

    for (const match of topMatches) {
      const matchReasons = [
        `Both create ${match.creator.category} content`,
        `${match.audience_overlap_percent}% estimated audience overlap`,
        `Similar channel sizes - great for mutual growth`,
        `Complementary content styles`
      ];

      const newMatch = await base44.asServiceRole.entities.CollabMatch.create({
        creator_a_id: user.email,
        creator_b_id: match.creator.user_email,
        compatibility_score: match.compatibility_score,
        shared_interests: match.shared_interests,
        audience_overlap_percent: match.audience_overlap_percent,
        suggested_collab_type: match.suggested_collab_type,
        match_reason: matchReasons[Math.floor(Math.random() * matchReasons.length)],
        status: 'suggested'
      });

      createdMatches.push(newMatch);
    }

    return Response.json({
      matches_created: createdMatches.length,
      matches: createdMatches,
      total_potential: potentialMatches.length
    });

  } catch (error) {
    console.error('Collab match error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});