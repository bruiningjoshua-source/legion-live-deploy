/**
 * RATE LIMITING SYSTEM
 * Per-user, per-endpoint rate limits with sliding window
 */

const buckets = new Map(); // email -> { endpoint -> [timestamps] }

function getKey(email, endpoint) {
  return `${email}:${endpoint}`;
}

function pruneOldRequests(timestamps, windowMs) {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter(ts => ts > cutoff);
}

export function checkRateLimit(email, endpoint, maxRequests, windowMs = 60000) {
  if (!email || !endpoint) return { allowed: false, reason: 'Missing email or endpoint' };

  const key = getKey(email, endpoint);
  let timestamps = buckets.get(key) || [];

  // Prune old requests
  timestamps = pruneOldRequests(timestamps, windowMs);

  if (timestamps.length >= maxRequests) {
    const retryAfter = Math.ceil((timestamps[0] + windowMs - Date.now()) / 1000);
    return {
      allowed: false,
      reason: `Rate limit exceeded (${maxRequests} per ${Math.round(windowMs / 1000)}s)`,
      retryAfter
    };
  }

  // Add current request
  timestamps.push(Date.now());
  buckets.set(key, timestamps);

  return { allowed: true };
}

// Periodic cleanup (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of buckets) {
    const pruned = pruneOldRequests(timestamps, 300000); // Keep 5 min window
    if (pruned.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, pruned);
    }
  }
}, 300000);

// Predefined rate limits for key endpoints
export const RATE_LIMITS = {
  sendGift: { maxRequests: 10, windowMs: 10000 }, // 10 per 10s
  sendTip: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  follow: { maxRequests: 20, windowMs: 60000 }, // 20 per minute
  unfollow: { maxRequests: 20, windowMs: 60000 },
  chatMessage: { maxRequests: 30, windowMs: 60000 }, // 30 per minute
  videoUpload: { maxRequests: 3, windowMs: 3600000 }, // 3 per hour
  createStream: { maxRequests: 5, windowMs: 3600000 }, // 5 per hour
  payout: { maxRequests: 1, windowMs: 86400000 }, // 1 per day
  kycSubmit: { maxRequests: 1, windowMs: 3600000 }, // 1 per hour
  updateProfile: { maxRequests: 10, windowMs: 60000 } // 10 per minute
};

// Check multiple limits at once
export function checkMultipleLimits(email, endpoints) {
  for (const endpoint of endpoints) {
    const limit = RATE_LIMITS[endpoint];
    if (limit) {
      const check = checkRateLimit(email, endpoint, limit.maxRequests, limit.windowMs);
      if (!check.allowed) return check;
    }
  }
  return { allowed: true };
}