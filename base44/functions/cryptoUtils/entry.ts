/**
 * Crypto utilities for KYC data encryption using Deno's Web Crypto API
 * Base64 encoding via manual hex conversion (no external deps)
 */

// Hex to base64 converter
function hexToBase64(hex) {
  return btoa(String.fromCharCode(...hex.match(/../g).map(x => parseInt(x, 16))));
}

function base64ToHex(b64) {
  return atob(b64).split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

// Derive encryption key from user email
async function deriveKey(userEmail, salt = '') {
  const encoder = new TextEncoder();
  const appId = Deno.env.get('BASE44_APP_ID') || 'legion';
  const data = encoder.encode(userEmail + salt + appId);
  
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

    // Convert to hex, then base64
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    const ctHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hexToBase64(ivHex) + '::' + hexToBase64(ctHex);
  } catch (error) {
    console.error('[encryptKYC] Encryption failed:', error.message);
    throw new Error('KYC encryption failed');
  }
}

export async function decryptKYC(encrypted, userEmail) {
  try {
    const key = await deriveKey(userEmail, 'kyc');
    const [ivB64, ctB64] = encrypted.split('::');
    
    const ivHex = base64ToHex(ivB64);
    const ctHex = base64ToHex(ctB64);
    
    const iv = new Uint8Array(ivHex.match(/../g).map(x => parseInt(x, 16)));
    const ciphertext = new Uint8Array(ctHex.match(/../g).map(x => parseInt(x, 16)));

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
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return hexToBase64(hex);
}

// Validate CSRF token
export function validateCSRFToken(tokenFromBody, tokenFromHeader) {
  if (!tokenFromBody || !tokenFromHeader) return false;
  return tokenFromBody === tokenFromHeader;
}