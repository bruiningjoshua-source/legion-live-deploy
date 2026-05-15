/* eslint-disable no-undef */
// ═══ CONVERTED: generateZegoToken — Base44 → Supabase Edge Function ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import { randomBytes, createCipheriv } from "node:crypto";
import { Buffer } from "node:buffer";

function makeNonce() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] > 2147483647 ? buf[0] - 4294967296 : buf[0];
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
    app_id: appId, user_id: userId, nonce: makeNonce(),
    ctime: createTime, expire: createTime + effectiveTimeInSeconds,
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

async function checkRateLimit(supabase, email) {
  const now = Date.now();
  const windowMs = 60000;
  const maxCount = 10;
  const { data: logs } = await supabase
    .from('wallet_audit_log')
    .select('*')
    .eq('user_email', email)
    .eq('action', 'rate_limit_check')
    .eq('reason', 'rate_limit:generateZegoToken')
    .order('timestamp_utc', { ascending: false })
    .limit(1);
  const record = (logs || [])[0];
  let count = 1, resetAt = now + windowMs;
  if (record) {
    const data = JSON.parse(record.related_entity_id || '{}');
    if (now < (data.resetAt || 0)) { count = (data.count || 0) + 1; resetAt = data.resetAt; }
  }
  if (count > maxCount) return false;
  supabase.from('wallet_audit_log').insert({
    user_email: email, action: 'rate_limit_check', amount_denarii: 0, new_balance: 0,
    related_entity_id: JSON.stringify({ count, resetAt }), reason: 'rate_limit:generateZegoToken',
    timestamp_utc: new Date().toISOString()
  }).then(() => {}).catch(() => {});
  return true;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { roomId, userId, role } = body;

    if (!roomId || !userId) {
      return Response.json({ error: 'Missing required parameters: roomId and userId' }, { status: 400 });
    }

    const sanitizedRoomId = String(roomId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 128);
    const sanitizedUserId = String(userId).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
    const sanitizedRole = ['host', 'audience', 'cohost'].includes(role) ? role : 'audience';

    if (!sanitizedRoomId || !sanitizedUserId) {
      return Response.json({ error: 'Invalid roomId or userId after sanitization' }, { status: 400 });
    }

    if (!await checkRateLimit(supabase, user.email)) {
      return Response.json({ error: 'Too many token requests. Please wait.' }, { status: 429 });
    }

    const appId = Deno.env.get('ZEGOCLOUD_APP_ID');
    const serverSecret = Deno.env.get('ZEGOCLOUD_SERVER_SECRET');

    if (!appId || !serverSecret) {
      return Response.json({ error: 'Streaming service not configured' }, { status: 500 });
    }

    const canPublish = sanitizedRole === 'host' || sanitizedRole === 'cohost';
    const payload = JSON.stringify({
      room_id: sanitizedRoomId,
      privilege: { 1: 1, 2: canPublish ? 1 : 0 },
      stream_id_list: null
    });

    const ttlSeconds = canPublish ? 7200 : 3600;
    const zegoToken = generateToken04(parseInt(appId), sanitizedUserId, serverSecret, ttlSeconds, payload);

    console.log('[ZegoToken] Generated for room:', sanitizedRoomId, 'user:', sanitizedUserId, 'role:', sanitizedRole);

    return Response.json({
      token: zegoToken,
      appId: parseInt(appId),
      userId: sanitizedUserId,
      roomId: sanitizedRoomId,
      role: sanitizedRole,
      expiresIn: ttlSeconds,
      serverUrl: Deno.env.get('ZEGOCLOUD_SERVER_URL') || ''
    });

  } catch (error) {
    console.error('[ZegoToken] Error:', error.message, error.stack);
    return Response.json({ error: 'Token generation failed' }, { status: 500 });
  }
});