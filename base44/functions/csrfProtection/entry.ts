/**
 * CSRF PROTECTION
 * Token generation and validation
 */

const sessionTokens = new Map(); // sessionId -> { token, email, expiresAt }
const TOKEN_EXPIRY = 3600000; // 1 hour

function generateSecureToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateCSRFToken(sessionId, email) {
  const token = generateSecureToken(32);
  const expiresAt = Date.now() + TOKEN_EXPIRY;

  sessionTokens.set(sessionId, {
    token,
    email,
    expiresAt
  });

  return token;
}

export function validateCSRFToken(sessionId, token, email) {
  const stored = sessionTokens.get(sessionId);

  if (!stored) {
    return { valid: false, reason: 'No CSRF token found for session' };
  }

  if (Date.now() > stored.expiresAt) {
    sessionTokens.delete(sessionId);
    return { valid: false, reason: 'CSRF token expired' };
  }

  if (stored.email !== email) {
    return { valid: false, reason: 'CSRF token email mismatch' };
  }

  if (stored.token !== token) {
    return { valid: false, reason: 'CSRF token invalid' };
  }

  // Invalidate token after use
  sessionTokens.delete(sessionId);

  return { valid: true };
}

export function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) return decodeURIComponent(cookieValue);
  }
  return null;
}

// Cleanup expired tokens every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of sessionTokens) {
    if (now > data.expiresAt) {
      sessionTokens.delete(sessionId);
    }
  }
}, 600000);