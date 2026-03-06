/**
 * FollowService — Centralized social/follow operations.
 * Equivalent to a dedicated social microservice.
 */
import { base44 } from '@/api/base44Client';

class FollowService {
  /** Check if a user follows a creator */
  async isFollowing(userEmail, creatorId) {
    if (!userEmail || !creatorId) return false;
    const follows = await base44.entities.Follow.filter(
      { follower_email: userEmail, following_creator_id: creatorId }, null, 1
    );
    return follows.length > 0;
  }

  /** Toggle follow state */
  async toggleFollow(userEmail, creatorId, currentlyFollowing) {
    if (!userEmail) throw new Error('Please sign in');

    if (currentlyFollowing) {
      const follows = await base44.entities.Follow.filter(
        { follower_email: userEmail, following_creator_id: creatorId }, null, 1
      );
      if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
    } else {
      await base44.entities.Follow.create({
        follower_email: userEmail,
        following_creator_id: creatorId,
      });
    }
  }
}

export default new FollowService();