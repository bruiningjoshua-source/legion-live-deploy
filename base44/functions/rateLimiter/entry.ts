import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limit configurations
const RATE_LIMITS = {
  'chat': { maxRequests: 30, windowMs: 60000 },      // 30 messages per minute
  'gift': { maxRequests: 20, windowMs: 60000 },      // 20 gifts per minute
  'api': { maxRequests: 100, windowMs: 60000 },      // 100 API calls per minute
  'auth': { maxRequests: 5, windowMs: 300000 },      // 5 auth attempts per 5 minutes
  'report': { maxRequests: 10, windowMs: 3600000 },  // 10 reports per hour
  'upload': { maxRequests: 10, windowMs: 3600000 },  // 10 uploads per hour
  'stream': { maxRequests: 5, windowMs: 3600000 },   // 5 stream starts per hour
  'checkout': { maxRequests: 10, windowMs: 3600000 } // 10 checkouts per hour
};

function getKey(identifier, action) {
  return `${identifier}:${action}`;
}

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

function checkRateLimit(identifier, action) {
  cleanupExpiredEntries();
  
  const config = RATE_LIMITS[action] || RATE_LIMITS['api'];
  const key = getKey(identifier, action);
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now - entry.windowStart > config.windowMs) {
    // Start new window
    entry = {
      count: 1,
      windowStart: now,
      windowMs: config.windowMs
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
      retryAfter: Math.ceil((entry.windowStart + config.windowMs - now) / 1000)
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.windowStart + config.windowMs
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get request data
    const { action, identifier } = await req.json();
    
    if (!action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }
    
    // Get identifier from user if not provided
    let rateLimitIdentifier = identifier;
    if (!rateLimitIdentifier) {
      try {
        const user = await base44.auth.me();
        rateLimitIdentifier = user?.email || req.headers.get('x-forwarded-for') || 'anonymous';
      } catch {
        rateLimitIdentifier = req.headers.get('x-forwarded-for') || 'anonymous';
      }
    }
    
    const result = checkRateLimit(rateLimitIdentifier, action);
    
    const headers = {
      'X-RateLimit-Limit': String(RATE_LIMITS[action]?.maxRequests || RATE_LIMITS['api'].maxRequests),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetAt)
    };
    
    if (!result.allowed) {
      headers['Retry-After'] = String(result.retryAfter);
      return Response.json(
        { 
          error: 'Rate limit exceeded', 
          retryAfter: result.retryAfter,
          resetAt: result.resetAt 
        }, 
        { status: 429, headers }
      );
    }
    
    return Response.json(result, { headers });
    
  } catch (error) {
    console.error('Rate limiter error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});