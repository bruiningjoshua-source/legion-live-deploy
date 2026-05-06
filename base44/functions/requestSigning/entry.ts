/**
 * REQUEST SIGNING
 * Verify request origin and integrity
 */

async function signRequest(payload, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyRequest(payload, signature, secret) {
  const expected = await signRequest(payload, secret);
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export async function generateRequestSignature(payload, email, timestamp, secret) {
  const appId = Deno.env.get('BASE44_APP_ID') || 'legion';
  const message = `${appId}:${email}:${timestamp}:${JSON.stringify(payload)}:${secret}`;
  return await signRequest(message, secret);
}

export async function validateRequestSignature(payload, email, timestamp, providedSignature, secret) {
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

  // Verify signature using constant-time comparison
  const appId = Deno.env.get('BASE44_APP_ID') || 'legion';
  const message = `${appId}:${email}:${timestamp}:${JSON.stringify(payload)}:${secret}`;
  const isValid = await verifyRequest(message, providedSignature, secret);
  
  if (!isValid) {
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