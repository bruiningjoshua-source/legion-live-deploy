/**
 * GiftQueueManager — Prevents gift animation render overload.
 * Queues incoming gifts, limits concurrent animations, prioritizes by tier.
 * Prevents GPU stalls and mobile crashes from rapid gift spam.
 */

const TIER_PRIORITY = {
  divine: 6, prestige: 5, legendary: 4, epic: 3, rare: 2, uncommon: 1, common: 0, normal: 0,
};

const MAX_CONCURRENT = 3;         // Max animations rendering at once
const QUEUE_MAX_SIZE = 20;        // Max queued gifts before dropping low-tier
const COOLDOWN_MS = 300;          // Min gap between starting animations

class GiftQueueManagerService {
  constructor() {
    this._queue = [];
    this._active = [];
    this._listeners = new Set();
    this._lastStart = 0;
    this._processing = false;
  }

  /** Enqueue a gift for animation */
  enqueue(gift, sender, quantity = 1) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      gift,
      sender,
      quantity,
      priority: TIER_PRIORITY[gift.tier] ?? 0,
      enqueuedAt: Date.now(),
    };

    this._queue.push(entry);

    // Sort by priority desc (highest-tier gifts animate first)
    this._queue.sort((a, b) => b.priority - a.priority);

    // Drop low-priority overflow
    while (this._queue.length > QUEUE_MAX_SIZE) {
      this._queue.pop(); // remove lowest priority
    }

    this._processNext();
    return entry.id;
  }

  /** Called when an animation finishes */
  complete(id) {
    this._active = this._active.filter(e => e.id !== id);
    this._processNext();
  }

  /** Get current animations to render */
  getActive() {
    return this._active;
  }

  /** Get queue depth for UI indicators */
  getQueueDepth() {
    return this._queue.length;
  }

  /** Subscribe to active-list changes */
  onChange(cb) {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  /** Clear everything (stream end, page nav) */
  clear() {
    this._queue = [];
    this._active = [];
    this._notify();
  }

  /** @private */
  _processNext() {
    if (this._active.length >= MAX_CONCURRENT) return;
    if (this._queue.length === 0) return;

    const now = Date.now();
    if (now - this._lastStart < COOLDOWN_MS) {
      if (!this._processing) {
        this._processing = true;
        setTimeout(() => {
          this._processing = false;
          this._processNext();
        }, COOLDOWN_MS - (now - this._lastStart));
      }
      return;
    }

    const next = this._queue.shift();
    if (!next) return;

    this._active.push(next);
    this._lastStart = Date.now();
    this._notify();

    // Continue draining if capacity allows
    if (this._active.length < MAX_CONCURRENT && this._queue.length > 0) {
      setTimeout(() => this._processNext(), COOLDOWN_MS);
    }
  }

  /** @private */
  _notify() {
    const state = { active: [...this._active], queueDepth: this._queue.length };
    for (const cb of this._listeners) {
      try { cb(state); } catch (_) {}
    }
  }
}

const GiftQueue = new GiftQueueManagerService();
export default GiftQueue;