/* eslint-disable no-undef */
// ═══ CONVERTED: rateLimiter ═══
const rateLimitStore = new Map();
const RATE_LIMITS = { chat: { maxRequests: 30, windowMs: 60000 }, gift: { maxRequests: 20, windowMs: 60000 }, api: { maxRequests: 100, windowMs: 60000 }, auth: { maxRequests: 5, windowMs: 300000 }, checkout: { maxRequests: 10, windowMs: 3600000 } };

Deno.serve(async (req) => {
  try {
    const { action, identifier } = await req.json();
    if (!action) return Response.json({ error: 'Action required' }, { status: 400 });
    const id = identifier || req.headers.get('x-forwarded-for') || 'anonymous';
    const config = RATE_LIMITS[action] || RATE_LIMITS.api;
    const key = `${id}:${action}`;
    const now = Date.now();
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.windowStart > config.windowMs) { entry = { count: 1, windowStart: now, windowMs: config.windowMs }; rateLimitStore.set(key, entry); return Response.json({ allowed: true, remaining: config.maxRequests - 1 }); }
    if (entry.count >= config.maxRequests) { const retryAfter = Math.ceil((entry.windowStart + config.windowMs - now) / 1000); return Response.json({ error: 'Rate limit exceeded', retryAfter }, { status: 429 }); }
    entry.count++; rateLimitStore.set(key, entry);
    return Response.json({ allowed: true, remaining: config.maxRequests - entry.count });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});