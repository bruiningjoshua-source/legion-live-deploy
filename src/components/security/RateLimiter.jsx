import React, { createContext, useContext, useState, useCallback } from 'react';

const RateLimitContext = createContext(null);

// Client-side rate limiting for UI actions
const rateLimits = {
  chat: { maxRequests: 10, windowMs: 10000 }, // 10 messages per 10 seconds
  gift: { maxRequests: 5, windowMs: 5000 },   // 5 gifts per 5 seconds
  follow: { maxRequests: 3, windowMs: 10000 }, // 3 follows per 10 seconds
  like: { maxRequests: 20, windowMs: 10000 },  // 20 likes per 10 seconds
  report: { maxRequests: 3, windowMs: 60000 }, // 3 reports per minute
  api: { maxRequests: 100, windowMs: 60000 }   // 100 API calls per minute
};

export function RateLimitProvider({ children }) {
  const [requestCounts, setRequestCounts] = useState({});

  const checkRateLimit = useCallback((action) => {
    const limit = rateLimits[action] || rateLimits.api;
    const now = Date.now();
    const key = action;
    
    setRequestCounts(prev => {
      const actionData = prev[key] || { count: 0, windowStart: now };
      
      // Reset window if expired
      if (now - actionData.windowStart > limit.windowMs) {
        return { ...prev, [key]: { count: 1, windowStart: now } };
      }
      
      return { ...prev, [key]: { ...actionData, count: actionData.count + 1 } };
    });

    const currentData = requestCounts[key] || { count: 0, windowStart: now };
    
    if (now - currentData.windowStart <= limit.windowMs && currentData.count >= limit.maxRequests) {
      return { allowed: false, retryAfter: limit.windowMs - (now - currentData.windowStart) };
    }
    
    return { allowed: true };
  }, [requestCounts]);

  const resetLimit = useCallback((action) => {
    setRequestCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[action];
      return newCounts;
    });
  }, []);

  return (
    <RateLimitContext.Provider value={{ checkRateLimit, resetLimit, rateLimits }}>
      {children}
    </RateLimitContext.Provider>
  );
}

export function useRateLimit() {
  const context = useContext(RateLimitContext);
  if (!context) {
    // Return a default implementation if not in provider
    return {
      checkRateLimit: () => ({ allowed: true }),
      resetLimit: () => {},
      rateLimits
    };
  }
  return context;
}

export default RateLimitProvider;