/**
 * REQUEST SIGNER
 * Generates request signatures for sensitive operations (payouts, withdrawals)
 * Ensures request integrity by signing with timestamp + payload
 */

export async function generateRequestSignature(payload, email, timestamp) {
  const message = `${email}:${timestamp}:${JSON.stringify(payload)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createSignedRequest(payload, email) {
  const timestamp = Date.now();
  const signature = await generateRequestSignature(payload, email, timestamp);
  
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