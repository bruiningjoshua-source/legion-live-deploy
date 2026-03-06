/**
 * RecommendationEngine — Client-side ML-lite recommendation system.
 * Scores content based on engagement signals, recency, and user affinity.
 */
import { base44 } from '@/api/base44Client';

class RecommendationEngine {
  /**
   * Score and rank streams for a user's "For You" feed.
   * @param {Array} streams - All live streams
   * @param {Object} userProfile - { interests, followedCreatorIds, viewingHistory }
   * @returns {Array} Sorted streams by relevance score
   */
  rankStreams(streams, userProfile = {}) {
    const { interests = [], followedCreatorIds = new Set(), recentCategories = [] } = userProfile;
    const interestSet = new Set(interests.map(i => i.toLowerCase()));
    const recentCatSet = new Set(recentCategories.map(c => c.toLowerCase()));

    return streams
      .map(stream => {
        let score = 0;

        // Base engagement score (logarithmic to prevent monopoly by top streams)
        const viewers = stream.viewer_count || 0;
        score += Math.log2(viewers + 1) * 10;

        // Recency boost (streams started recently get a bump)
        const ageMinutes = stream.created_date
          ? (Date.now() - new Date(stream.created_date).getTime()) / 60000
          : 999;
        if (ageMinutes < 30) score += 20;
        else if (ageMinutes < 60) score += 10;
        else if (ageMinutes < 120) score += 5;

        // Category affinity
        const cat = (stream.category || '').toLowerCase();
        if (interestSet.has(cat)) score += 30;
        if (recentCatSet.has(cat)) score += 15;

        // Following boost — streams from followed creators rank higher
        if (followedCreatorIds.has(stream.creator_id)) score += 40;

        // Gift velocity — active gifting = engaging stream
        const gifts = stream.total_gifts_received || 0;
        score += Math.log2(gifts + 1) * 5;

        // Featured / verified boost
        if (stream.is_featured) score += 15;

        // Diversity penalty — if we've seen many of same category, reduce
        // (handled at ranking time below)

        return { ...stream, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }

  /**
   * Recommend creators based on social graph + category overlap.
   */
  rankCreators(creators, userProfile = {}) {
    const { followedCreatorIds = new Set(), interests = [] } = userProfile;
    const interestSet = new Set(interests.map(i => i.toLowerCase()));

    return creators
      .filter(c => !followedCreatorIds.has(c.id)) // Exclude already-followed
      .map(creator => {
        let score = 0;

        // Popularity (log scale)
        score += Math.log2((creator.follower_count || 0) + 1) * 5;

        // Category match
        if (interestSet.has((creator.category || '').toLowerCase())) score += 25;

        // Active creator boost
        if (creator.is_live) score += 30;

        // Verified trust signal
        if (creator.is_verified) score += 10;

        // Level/experience
        score += Math.min((creator.level || 1) * 2, 20);

        return { ...creator, _score: score };
      })
      .sort((a, b) => b._score - a._score);
  }

  /**
   * Build user profile from their data for recommendation input.
   */
  async buildUserProfile(userEmail) {
    if (!userEmail) return {};

    const [interests, follows, history] = await Promise.all([
      base44.entities.UserInterest.filter({ user_email: userEmail }).catch(() => []),
      base44.entities.Follow.filter({ follower_email: userEmail }).catch(() => []),
      base44.entities.ViewingHistory.filter({ user_email: userEmail }, '-created_date', 20).catch(() => []),
    ]);

    const followedCreatorIds = new Set(follows.map(f => f.following_creator_id));
    const interestNames = interests.map(i => i.category || i.interest_name).filter(Boolean);
    const recentCategories = history.map(h => h.category).filter(Boolean);

    return {
      interests: interestNames,
      followedCreatorIds,
      recentCategories,
    };
  }
}

export default new RecommendationEngine();