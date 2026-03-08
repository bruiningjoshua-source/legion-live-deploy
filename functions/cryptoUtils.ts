/**
 * Crypto utilities for KYC data encryption using Deno's Web Crypto API
 * All operations are async (SubtleCrypto requirement)
 */

// Derive a stable encryption key from user email + app ID
async function deriveKey(userEmail, salt = '') {
  const encoder = new TextEncoder();
  const data = encoder.encode(userEmail + salt + Deno.env.get('BASE44_APP_ID'));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt || 'legion-kyc-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptKYC(data, userEmail) {
  try {
    const key = await deriveKey(userEmail, 'kyc');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    // Return base64-encoded IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[encryptKYC] Encryption failed:', error.message);
    throw new Error('KYC encryption failed');
  }
}

export async function decryptKYC(encrypted, userEmail) {
  try {
    const key = await deriveKey(userEmail, 'kyc');
    const combined = new Uint8Array(atob(encrypted).split('').map(c => c.charCodeAt(0)));
    
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext));
  } catch (error) {
    console.error('[decryptKYC] Decryption failed:', error.message);
    throw new Error('KYC decryption failed');
  }
}

// CSRF token generation
export function generateCSRFToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}

// Validate CSRF token (compare with header token)
export function validateCSRFToken(tokenFromBody, tokenFromHeader) {
  if (!tokenFromBody || !tokenFromHeader) return false;
  return tokenFromBody === tokenFromHeader;
}