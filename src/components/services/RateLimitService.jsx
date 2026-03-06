/**
 * RateLimitService — Client-side rate limiting for chat and gift spam prevention.
 * Mirrors what a mature platform does at the edge layer.
 */

class RateLimitService {
  constructor() {
    this.buckets = {};
  }

  /**
   * Check if an action is allowed under rate limits.
   * @param {string} key - Unique key (e.g., "chat:user@email.com")
   * @param {number} maxActions - Max actions in window
   * @param {number} windowMs - Time window in milliseconds
   * @returns {{ allowed: boolean, retryAfterMs: number }}
   */
  check(key, maxActions, windowMs) {
    const now = Date.now();
    if (!this.buckets[key]) {
      this.buckets[key] = [];
    }

    // Purge expired entries
    this.buckets[key] = this.buckets[key].filter(ts => now - ts < windowMs);

    if (this.buckets[key].length >= maxActions) {
      const oldest = this.buckets[key][0];
      return { allowed: false, retryAfterMs: windowMs - (now - oldest) };
    }

    this.buckets[key].push(now);
    return { allowed: true, retryAfterMs: 0 };
  }

  /** Chat: max 5 messages per 5 seconds */
  checkChat(userEmail) {
    return this.check(`chat:${userEmail}`, 5, 5000);
  }

  /** Gifts: max 10 gift sends per 10 seconds */
  checkGiftSend(userEmail) {
    return this.check(`gift:${userEmail}`, 10, 10000);
  }

  /** Follow: max 20 follows per minute */
  checkFollow(userEmail) {
    return this.check(`follow:${userEmail}`, 20, 60000);
  }

  /** Reset all buckets for a user (on logout) */
  reset(userEmail) {
    Object.keys(this.buckets).forEach(key => {
      if (key.includes(userEmail)) delete this.buckets[key];
    });
  }
}

export default new RateLimitService();