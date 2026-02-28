import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { randomBytes, createCipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

// Zegocloud token generation - Token04 format with AES-256-GCM
// Based on official Zegocloud implementation: https://github.com/zegoim/zego_server_assistant

function makeNonce() {
  // Generate int32 range random number
  const min = -Math.pow(2, 31);
  const max = Math.pow(2, 31) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function aesGcmEncrypt(plainText, key) {
  // Key must be 32 bytes for AES-256
  if (key.length !== 32) {
    throw new Error('Secret must be exactly 32 bytes');
  }
  
  // Random 12-byte nonce for GCM
  const nonce = randomBytes(12);
  
  // Create cipher with AES-256-GCM
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), nonce);
  cipher.setAutoPadding(true);
  
  // Encrypt
  const encrypted = cipher.update(plainText, 'utf8');
  const final = cipher.final();
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted data with auth tag
  const encryptBuf = Buffer.concat([encrypted, final, authTag]);
  
  return { encryptBuf, nonce };
}

function generateToken04(appId, userId, secret, effectiveTimeInSeconds, payload) {
  if (!appId || typeof appId !== 'number') {
    throw new Error('appId must be a number');
  }
  if (!userId || typeof userId !== 'string' || userId.length > 64) {
    throw new Error('userId must be a string with max 64 characters');
  }
  if (!secret || typeof secret !== 'string' || secret.length !== 32) {
    throw new Error('secret must be a 32 byte string');
  }
  if (!(effectiveTimeInSeconds > 0)) {
    throw new Error('effectiveTimeInSeconds must be positive');
  }
  
  const VERSION_FLAG = '04';
  const createTime = Math.floor(Date.now() / 1000);
  
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || ''
  };
  
  const plainText = JSON.stringify(tokenInfo);
  console.log('[ZegoToken] Token info:', plainText);
  
  // Encrypt with AES-256-GCM
  const { encryptBuf, nonce } = aesGcmEncrypt(plainText, secret);
  
  // Build token binary:
  // expireTime (8 bytes) + nonceLength (2 bytes) + nonce (12 bytes) + 
  // encryptLength (2 bytes) + encrypted data + mode (1 byte)
  
  const b1 = Buffer.alloc(8); // expire time
  const b2 = Buffer.alloc(2); // nonce length
  const b3 = Buffer.alloc(2); // encrypt length
  const b4 = Buffer.alloc(1); // encryption mode (1 = GCM)
  
  // Write expire time as BigInt64BE
  b1.writeBigInt64BE(BigInt(tokenInfo.expire), 0);
  
  // Write nonce length
  b2.writeUInt16BE(nonce.length, 0);
  
  // Write encrypted data length
  b3.writeUInt16BE(encryptBuf.length, 0);
  
  // Write encryption mode (1 = GCM)
  b4.writeUInt8(1, 0);
  
  // Combine all parts
  const buf = Buffer.concat([b1, b2, nonce, b3, encryptBuf, b4]);
  
  // Return version + base64
  return VERSION_FLAG + buf.toString('base64');
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