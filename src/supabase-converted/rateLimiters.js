/* eslint-disable no-undef */
// ═══ CONVERTED: rateLimiters ═══
// Sliding window rate limiter — standalone edge function.
const buckets = new Map();
const RATE_LIMITS = { sendGift: { maxRequests: 10, windowMs: 10000 }, sendTip: { maxRequests: 5, windowMs: 60000 }, follow: { maxRequests: 20, windowMs: 60000 }, chatMessage: { maxRequests: 30, windowMs: 60000 }, payout: { maxRequests: 1, windowMs: 86400000 }, kycSubmit: { maxRequests: 1, windowMs: 3600000 } };

function checkRateLimit(email, endpoint, maxRequests, windowMs) {
  const key = `${email}:${endpoint}`;
  const cutoff = Date.now() - windowMs;
  let timestamps = (buckets.get(key) || []).filter(ts => ts > cutoff);
  if (timestamps.length >= maxRequests) return { allowed: false, retryAfter: Math.ceil((timestamps[0] + windowMs - Date.now()) / 1000) };
  timestamps.push(Date.now()); buckets.set(key, timestamps);
  return { allowed: true };
}

Deno.serve(async (req) => {
  try {
    const { action, email, endpoint } = await req.json();
    if (action === 'check') {
      if (!email || !endpoint) return Response.json({ error: 'email and endpoint required' }, { status: 400 });
      const limit = RATE_LIMITS[endpoint];
      if (!limit) return Response.json({ allowed: true });
      return Response.json(checkRateLimit(email, endpoint, limit.maxRequests, limit.windowMs));
    }
    if (action === 'check_multiple') {
      const { endpoints } = await req.json();
      for (const ep of (endpoints||[])) { const l = RATE_LIMITS[ep]; if (l) { const r = checkRateLimit(email, ep, l.maxRequests, l.windowMs); if (!r.allowed) return Response.json(r); } }
      return Response.json({ allowed: true });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});