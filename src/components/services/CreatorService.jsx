/**
 * CreatorService — Centralized creator profile operations.
 * Equivalent to a dedicated user/creator microservice.
 */
import { base44 } from '@/api/base44Client';

class CreatorService {
  /** Get or create a creator profile */
  async getOrCreate(userEmail, displayName, category) {
    if (!userEmail) return null;
    const creators = await base44.entities.Creator.filter({ user_email: userEmail }, null, 1);
    if (creators.length > 0) return creators[0];

    return base44.entities.Creator.create({
      user_email: userEmail,
      display_name: displayName || 'New Creator',
      category: category || 'other',
    });
  }

  /** Get a creator by ID */
  async getById(creatorId) {
    if (!creatorId) return null;
    const creators = await base44.entities.Creator.filter({ id: creatorId }, null, 1);
    return creators[0] || null;
  }

  /** Set creator live status */
  async setLive(creatorId, streamId) {
    return base44.entities.Creator.update(creatorId, {
      is_live: true,
      current_stream_id: streamId,
    });
  }

  /** Set creator offline */
  async setOffline(creatorId) {
    return base44.entities.Creator.update(creatorId, {
      is_live: false,
      current_stream_id: null,
    });
  }

  /** Check if creator has active monetization subscription */
  async hasActiveSubscription(userEmail) {
    if (!userEmail) return false;
    const subs = await base44.entities.CreatorSubscription.filter(
      { user_email: userEmail, status: 'active' }, '-created_date', 1
    );
    return subs[0] || null;
  }
}

export default new CreatorService();