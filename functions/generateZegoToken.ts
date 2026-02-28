import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHmac } from "node:crypto";

// Zegocloud token generation - Token04 format
// Reference: https://docs.zegocloud.com/article/7646

function makeRandomIv() {
  const str = '0123456789abcdefghijklmnopqrstuvwxyz';
  const result = [];
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(Math.random() * str.length);
    result.push(str.charAt(r));
  }
  return result.join('');
}

function getAlgorithmKey(serverSecret) {
  // Use first 16 bytes of secret as key
  return serverSecret.substring(0, 16);
}

async function aesEncrypt(plainText, key, iv) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const ivData = encoder.encode(iv);
  const plainData = encoder.encode(plainText);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: ivData },
    cryptoKey,
    plainData
  );
  
  return new Uint8Array(encrypted);
}

async function generateToken04(appId, userId, serverSecret, effectiveTimeInSeconds, payload) {
  if (!appId || typeof appId !== 'number') {
    throw new Error('appId must be a number');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId must be a string');
  }
  if (!serverSecret || typeof serverSecret !== 'string' || serverSecret.length !== 32) {
    throw new Error('serverSecret must be a 32 character string');
  }
  
  const createTime = Math.floor(Date.now() / 1000);
  const expireTime = createTime + effectiveTimeInSeconds;
  const nonce = Math.floor(Math.random() * 2147483647);
  
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: nonce,
    ctime: createTime,
    expire: expireTime,
    payload: payload || ''
  };
  
  const plainText = JSON.stringify(tokenInfo);
  const iv = makeRandomIv();
  const key = getAlgorithmKey(serverSecret);
  
  const encryptedBuf = await aesEncrypt(plainText, key, iv);
  
  // Combine: expireTime(8) + ivLength(2) + iv(16) + encryptedLength(2) + encrypted
  const ivBytes = new TextEncoder().encode(iv);
  const resultLen = 8 + 2 + ivBytes.length + 2 + encryptedBuf.length;
  const result = new Uint8Array(resultLen);
  
  // Write expire time (big-endian, 8 bytes for larger numbers but only using 4)
  const view = new DataView(result.buffer);
  view.setUint32(0, 0);
  view.setUint32(4, expireTime);
  
  // Write IV length and IV
  view.setUint16(8, ivBytes.length);
  result.set(ivBytes, 10);
  
  // Write encrypted length and encrypted data
  view.setUint16(10 + ivBytes.length, encryptedBuf.length);
  result.set(encryptedBuf, 12 + ivBytes.length);
  
  // Base64 encode and add version prefix
  const base64 = btoa(String.fromCharCode(...result));
  return '04' + base64;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[ZegoToken] Unauthorized: No user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, userId, role } = await req.json();

    if (!roomId || !userId) {
      console.error('[ZegoToken] Missing params:', { roomId, userId, role });
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const appId = Deno.env.get('ZEGOCLOUD_APP_ID');
    const serverSecret = Deno.env.get('ZEGOCLOUD_SERVER_SECRET');

    console.log('[ZegoToken] Config check - appId:', appId, 'secret length:', serverSecret?.length);

    if (!appId) {
      console.error('[ZegoToken] ZEGOCLOUD_APP_ID not configured');
      return Response.json({ error: 'Zegocloud not configured' }, { status: 500 });
    }

    if (!serverSecret) {
      console.error('[ZegoToken] ZEGOCLOUD_SERVER_SECRET not configured');
      return Response.json({ error: 'Zegocloud server secret not configured' }, { status: 500 });
    }

    // Create payload for room privileges
    const payload = JSON.stringify({
      room_id: roomId,
      privilege: {
        1: 1, // Login room
        2: role === 'host' ? 1 : 0  // Publish stream (only for hosts)
      },
      stream_id_list: null
    });

    // Generate token with 1 hour validity
    const token = await generateToken04(
      parseInt(appId),
      userId,
      serverSecret,
      3600,
      payload
    );

    console.log('[ZegoToken] Token generated successfully for room:', roomId, 'user:', userId, 'role:', role);
    
    return Response.json({ 
      token, 
      appId: parseInt(appId),
      userId,
      roomId
    });

  } catch (error) {
    console.error('[ZegoToken] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});