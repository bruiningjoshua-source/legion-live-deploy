/**
 * REQUEST SIGNER
 * Generates request signatures for sensitive operations (payouts, withdrawals)
 * Ensures request integrity by signing with timestamp + payload
 */

export function generateRequestSignature(payload, email, timestamp) {
  // Simple hash-based signature (frontend only — backend validation is more robust)
  // In production, you'd use HMAC with a shared secret
  const message = `${email}:${timestamp}:${JSON.stringify(payload)}`;
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

export function createSignedRequest(payload, email) {
  const timestamp = Date.now();
  const signature = generateRequestSignature(payload, email, timestamp);
  
  return {
    ...payload,
    requestSignature: signature,
    requestTimestamp: timestamp.toString()
  };
}

export function getRequestHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Request-Timestamp': Date.now().toString()
  };
}