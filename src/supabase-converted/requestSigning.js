/* eslint-disable no-undef */
// ═══ CONVERTED: requestSigning ═══
// NOTE: Utility module converted to standalone edge function.

async function signRequest(payload, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyRequest(payload, signature, secret) {
  const expected = await signRequest(payload, secret);
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  try {
    const { action, payload, email, timestamp, signature } = await req.json();
    const secret = Deno.env.get('PAYOUT_SIGNING_SECRET') || 'default-secret';

    if (action === 'sign') {
      const message = `legion:${email}:${timestamp}:${JSON.stringify(payload)}:${secret}`;
      const sig = await signRequest(message, secret);
      return Response.json({ signature: sig });
    }
    if (action === 'verify') {
      const now = Date.now();
      const ts = parseInt(timestamp);
      if (isNaN(ts) || ts < now - 300000 || ts > now + 10000) return Response.json({ valid: false, reason: 'Stale timestamp' });
      const message = `legion:${email}:${timestamp}:${JSON.stringify(payload)}:${secret}`;
      const valid = await verifyRequest(message, signature, secret);
      return Response.json({ valid });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});