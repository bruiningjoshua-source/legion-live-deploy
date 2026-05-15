/* eslint-disable no-undef */
// ═══ CONVERTED: cryptoUtils ═══
// Standalone edge function for KYC encryption/decryption and CSRF tokens.

function hexToBase64(hex) { return btoa(String.fromCharCode(...hex.match(/../g).map(x => parseInt(x, 16)))); }
function base64ToHex(b64) { return atob(b64).split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''); }

async function deriveKey(userEmail, salt = '') {
  const encoder = new TextEncoder();
  const data = encoder.encode(userEmail + salt + 'legion');
  const keyMaterial = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: encoder.encode(salt || 'legion-kyc-v1'), iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

Deno.serve(async (req) => {
  try {
    const { action, data, userEmail, encrypted } = await req.json();
    if (action === 'encrypt' && data && userEmail) {
      const key = await deriveKey(userEmail, 'kyc');
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
      const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
      const ctHex = Array.from(new Uint8Array(ct)).map(b => b.toString(16).padStart(2, '0')).join('');
      return Response.json({ encrypted: hexToBase64(ivHex) + '::' + hexToBase64(ctHex) });
    }
    if (action === 'decrypt' && encrypted && userEmail) {
      const key = await deriveKey(userEmail, 'kyc');
      const [ivB64, ctB64] = encrypted.split('::');
      const iv = new Uint8Array(base64ToHex(ivB64).match(/../g).map(x => parseInt(x, 16)));
      const ct = new Uint8Array(base64ToHex(ctB64).match(/../g).map(x => parseInt(x, 16)));
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
      return Response.json({ data: JSON.parse(new TextDecoder().decode(plain)) });
    }
    if (action === 'csrf_token') {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      return Response.json({ token: hexToBase64(hex) });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});