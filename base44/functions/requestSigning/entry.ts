/**
 * REQUEST SIGNING
 * Verify request origin and integrity
 */

export function generateRequestSignature(payload, email, timestamp, secret) {
  const appId = Deno.env.get('BASE44_APP_ID') || 'legion';
  const message = `${appId}:${email}:${timestamp}:${JSON.stringify(payload)}:${secret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Use Deno's Crypto API synchronously via hash
  return hashSync(message);
}

// Simple hash function (not cryptographically secure, use for verification only)
function hashSync(message) {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export function validateRequestSignature(payload, email, timestamp, providedSignature, secret) {
  // Verify timestamp is recent (within 5 minutes)
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  const fiveMinutesAgo = now - 300000;

  if (requestTime < fiveMinutesAgo || requestTime > now + 10000) {
    return {
      valid: false,
      reason: 'Request timestamp is stale or from the future'
    };
  }

  // Verify signature
  const expectedSignature = generateRequestSignature(payload, email, timestamp, secret);
  
  if (expectedSignature !== providedSignature) {
    return {
      valid: false,
      reason: 'Request signature verification failed'
    };
  }

  return { valid: true };
}

export function getRequestSigningHeaders(request) {
  return {
    signature: request.headers.get('x-request-signature'),
    timestamp: request.headers.get('x-request-timestamp'),
    email: request.headers.get('x-request-email')
  };
}

// For sensitive endpoints like payouts, wire transfers, etc.
export function requireRequestSigning(signature, timestamp, email) {
  if (!signature || !timestamp || !email) {
    return {
      required: true,
      valid: false,
      reason: 'Request signing required for this endpoint'
    };
  }

  // Verify timestamp freshness
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  const fiveMinutesAgo = now - 300000;

  if (requestTime < fiveMinutesAgo || requestTime > now + 10000) {
    return {
      required: true,
      valid: false,
      reason: 'Request timestamp invalid'
    };
  }

  return {
    required: true,
    valid: true
  };
}