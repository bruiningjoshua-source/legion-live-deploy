import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { randomBytes, createCipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

// ─── Production ZegoCloud Token Generator (Token04 / AES-256-GCM) ───

function makeNonce() {
  const min = -Math.pow(2, 31);
  const max = Math.pow(2, 31) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function aesGcmEncrypt(plainText, key) {
  if (key.length !== 32) throw new Error('Secret must be exactly 32 bytes');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), nonce);
  cipher.setAutoPadding(true);
  const encrypted = cipher.update(plainText, 'utf8');
  const final = cipher.final();
  const authTag = cipher.getAuthTag();
  return { encryptBuf: Buffer.concat([encrypted, final, authTag]), nonce };
}

function generateToken04(appId, userId, secret, effectiveTimeInSeconds, payload) {
  if (!appId || typeof appId !== 'number') throw new Error('appId must be a number');
  if (!userId || typeof userId !== 'string' || userId.length > 64) throw new Error('userId invalid');
  if (!secret || typeof secret !== 'string' || secret.length !== 32) throw new Error('secret must be 32 bytes');
  if (!(effectiveTimeInSeconds > 0)) throw new Error('effectiveTimeInSeconds must be positive');

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: makeNonce(),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || ''
  };

  const { encryptBuf, nonce } = aesGcmEncrypt(JSON.stringify(tokenInfo), secret);

  const b1 = Buffer.alloc(8);
  const b2 = Buffer.alloc(2);
  const b3 = Buffer.alloc(2);
  const b4 = Buffer.alloc(1);
  b1.writeBigInt64BE(BigInt(tokenInfo.expire), 0);
  b2.writeUInt16BE(nonce.length, 0);
  b3.writeUInt16BE(encryptBuf.length, 0);
  b4.writeUInt8(1, 0);

  return '04' + Buffer.concat([b1, b2, nonce, b3, encryptBuf, b4]).toString('base64');
}

// ─── Rate limiter: prevent token spam ───
const tokenRequests = new Map(); // userId → { count, resetAt }
const MAX_TOKENS_PER_MINUTE = 10;

function checkRateLimit(userId) {
  const now = Date.now();
  const record = tokenRequests.get(userId);
  if (!record || now > record.resetAt) {
    tokenRequests.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  record.count++;
  if (record.count > MAX_TOKENS_PER_MINUTE) return false;
  return true;
}

// Periodic cleanup of stale rate-limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokenRequests) {
    if (now > val.resetAt) tokenRequests.delete(key);
  }
}, 120000);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[ZegoToken] Unauthorized: No user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { roomId, userId, role } = body;

    if (!roomId || !userId) {
      console.error('[ZegoToken] Missing params:', { roomId, userId, role });
      return Response.json({ error: 'Missing required parameters: roomId and userId' }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedRoomId = String(roomId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 128);
    const sanitizedUserId = String(userId).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
    const sanitizedRole = ['host', 'audience', 'cohost'].includes(role) ? role : 'audience';

    if (!sanitizedRoomId || !sanitizedUserId) {
      return Response.json({ error: 'Invalid roomId or userId after sanitization' }, { status: 400 });
    }

    // Rate limit
    if (!checkRateLimit(user.email)) {
      console.warn('[ZegoToken] Rate limited:', user.email);
      return Response.json({ error: 'Too many token requests. Please wait.' }, { status: 429 });
    }

    const appId = Deno.env.get('ZEGOCLOUD_APP_ID');
    const serverSecret = Deno.env.get('ZEGOCLOUD_SERVER_SECRET');

    if (!appId || !serverSecret) {
      console.error('[ZegoToken] Missing env vars — appId:', !!appId, 'secret:', !!serverSecret);
      return Response.json({ error: 'Streaming service not configured' }, { status: 500 });
    }

    // Privilege map: host/cohost can publish, audience cannot
    const canPublish = sanitizedRole === 'host' || sanitizedRole === 'cohost';
    const payload = JSON.stringify({
      room_id: sanitizedRoomId,
      privilege: {
        1: 1,                       // Login room
        2: canPublish ? 1 : 0       // Publish stream
      },
      stream_id_list: null
    });

    // 2-hour token for hosts, 1-hour for viewers
    const ttlSeconds = canPublish ? 7200 : 3600;

    const token = generateToken04(
      parseInt(appId),
      sanitizedUserId,
      serverSecret,
      ttlSeconds,
      payload
    );

    console.log('[ZegoToken] Generated for room:', sanitizedRoomId, 'user:', sanitizedUserId, 'role:', sanitizedRole, 'ttl:', ttlSeconds);

    return Response.json({
      token,
      appId: parseInt(appId),
      userId: sanitizedUserId,
      roomId: sanitizedRoomId,
      role: sanitizedRole,
      expiresIn: ttlSeconds
    });

  } catch (error) {
    console.error('[ZegoToken] Error:', error.message, error.stack);
    return Response.json({ error: 'Token generation failed' }, { status: 500 });
  }
});