import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, createCipheriv, randomInt } from 'node:crypto';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ─── ZegoCloud token (token04) generation ──────────────────────────────────
const aesGcmEncrypt = (plainText, key) => {
  if (key.length !== 32) throw new Error('Secret must be exactly 32 bytes');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), nonce);
  const encrypted = cipher.update(plainText, 'utf8');
  const final = cipher.final();
  const authTag = cipher.getAuthTag();
  return { encryptBuf: Buffer.concat([encrypted, final, authTag]), nonce };
};

const generateZegoToken04 = (appId, userId, secret, effectiveTimeInSeconds, payload) => {
  if (!appId || typeof appId !== 'number') throw new Error('appId must be a number');
  if (!userId || typeof userId !== 'string' || userId.length > 64) throw new Error('userId invalid');
  if (!secret || typeof secret !== 'string' || secret.length !== 32) throw new Error('secret must be 32 bytes');
  if (!(effectiveTimeInSeconds > 0)) throw new Error('effectiveTimeInSeconds must be positive');

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: randomInt(-2147483648, 2147483647),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: payload || '',
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
};

const generateZegoSignature = (appId, serverSecret) => {
  const signatureNonce = randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const str = String(appId) + signatureNonce + serverSecret + String(timestamp);
  const signature = createHash('md5').update(str, 'utf8').digest('hex');
  return { signature, signatureNonce, timestamp };
};

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

// User-context client: queries run as the signed-in user with RLS enforced.
const getSupabase = (event) => {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase environment is not configured');
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: event.headers.authorization || event.headers.Authorization || `Bearer ${key}`,
      },
    },
  });
};

// Service-role client: privileged operations that must act across all rows.
// It must NOT forward the user's Authorization header — PostgREST resolves the
// active role from the JWT, so a forwarded user token would silently demote the
// service role back to the ordinary authenticated user (and re-enable RLS).
const getServiceClient = () => {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const getCurrentUser = async (supabase, event) => {
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data } = await supabase.auth.getUser(token);
  return data?.user || null;
};

const handlers = {
  async clearLiveStreams({ supabase, admin, user }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    // Ending every live stream/creator is a cross-user maintenance operation,
    // so it must run with service-role rights. Under the user's RLS context it
    // would only ever end the caller's own stream. Fall back to the user client
    // only when no service role is configured (best effort).
    const db = admin || supabase;

    const { error: streamError } = await db
      .from('streams')
      .update({ status: 'ended', viewer_count: 0, ended_at: new Date().toISOString() })
      .eq('status', 'live');
    if (streamError) throw streamError;

    const { error: creatorError } = await db
      .from('creators')
      .update({ is_live: false, current_stream_id: null })
      .eq('is_live', true);
    if (creatorError) throw creatorError;

    return { success: true };
  },

  async updateViewerCount({ supabase, params }) {
    const { streamId, viewerCount } = params || {};
    if (!streamId || Number.isNaN(Number(viewerCount))) {
      return json(400, { error: 'streamId and viewerCount are required' });
    }

    const { data, error } = await supabase
      .from('streams')
      .update({ viewer_count: Math.max(0, Number(viewerCount)) })
      .eq('id', streamId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, stream: data };
  },

  async sendGift({ supabase, user, params }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const { senderWalletId, receiverWalletId, amountDenarii, reason, relatedEntityId, giftId, streamId, receiverEmail, receiverCreatorId } = params || {};
    if (!senderWalletId || !receiverWalletId || !amountDenarii) {
      return json(400, { error: 'senderWalletId, receiverWalletId, and amountDenarii are required' });
    }

    const { data: transfer, error: transferError } = await supabase.rpc('transfer_denarii', {
      p_sender_wallet_id: senderWalletId,
      p_receiver_wallet_id: receiverWalletId,
      p_amount: amountDenarii,
      p_reason: reason || 'gift',
      p_related_entity_id: relatedEntityId || null,
    });
    if (transferError) throw transferError;

    const { data: transaction, error: txError } = await supabase
      .from('gift_transactions')
      .insert({
        gift_id: giftId || null,
        stream_id: streamId || null,
        sender_email: user.email,
        receiver_email: receiverEmail || null,
        receiver_creator_id: receiverCreatorId || null,
        amount_denarii: amountDenarii,
        metadata: { reason: reason || 'gift' },
      })
      .select()
      .single();
    if (txError) throw txError;

    return { success: true, transfer, transaction };
  },

  async requestWithdrawal({ supabase, user, params }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const amountDenarii = Number(params?.amount_denarii || params?.amountDenarii);
    if (!amountDenarii || amountDenarii <= 0) {
      return json(400, { error: 'A positive withdrawal amount is required' });
    }

    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id,user_email')
      .eq('user_email', user.email)
      .single();
    if (creatorError) throw creatorError;

    const { data, error } = await supabase
      .from('creator_payouts')
      .insert({
        creator_id: creator.id,
        user_email: user.email,
        amount_denarii: amountDenarii,
        status: 'pending',
        metadata: params || {},
      })
      .select()
      .single();
    if (error) throw error;

    return { success: true, payout: data };
  },

  // ─── Go Live: ZegoCloud streaming token ──────────────────────────────────
  async generateZegoToken({ user, params }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const { roomId, userId, role } = params || {};
    if (!roomId || !userId) {
      return json(400, { error: 'Missing required parameters: roomId and userId' });
    }

    const sanitizedRoomId = String(roomId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 128);
    const sanitizedUserId = String(userId).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
    const sanitizedRole = ['host', 'audience', 'cohost'].includes(role) ? role : 'audience';
    if (!sanitizedRoomId || !sanitizedUserId) {
      return json(400, { error: 'Invalid roomId or userId after sanitization' });
    }

    const appId = process.env.ZEGOCLOUD_APP_ID;
    const serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;
    if (!appId || !serverSecret) {
      return json(500, { error: 'Streaming service not configured' });
    }

    const canPublish = sanitizedRole === 'host' || sanitizedRole === 'cohost';
    const payload = JSON.stringify({
      room_id: sanitizedRoomId,
      privilege: { 1: 1, 2: canPublish ? 1 : 0 },
      stream_id_list: null,
    });
    const ttlSeconds = canPublish ? 7200 : 3600;
    const token = generateZegoToken04(parseInt(appId, 10), sanitizedUserId, serverSecret, ttlSeconds, payload);

    return {
      token,
      appId: parseInt(appId, 10),
      userId: sanitizedUserId,
      roomId: sanitizedRoomId,
      role: sanitizedRole,
      expiresIn: ttlSeconds,
      serverUrl: process.env.ZEGOCLOUD_SERVER_URL || '',
    };
  },

  // ─── Go Live: OBS / RTMP stream key ──────────────────────────────────────
  async getOBSStreamKey({ user, params }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const { streamId } = params || {};
    if (!streamId) return json(400, { error: 'streamId is required' });

    const appId = process.env.ZEGOCLOUD_APP_ID;
    const serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;
    if (!appId || !serverSecret) {
      return json(500, { error: 'Streaming service not configured' });
    }

    const { signature, signatureNonce, timestamp } = generateZegoSignature(parseInt(appId, 10), serverSecret);
    const query = new URLSearchParams({
      Action: 'RTMPDispatchV2',
      AppId: appId,
      Signature: signature,
      SignatureNonce: signatureNonce,
      SignatureVersion: '2.0',
      Timestamp: String(timestamp),
      StreamId: streamId,
      Sequence: String(Date.now()),
      Type: 'push',
    });

    const response = await fetch(`https://rtc-api.zego.im/?${query.toString()}`);
    const data = await response.json();

    if (data.Code !== 0) {
      if (data.Code === 1001 || data.Code === 1002 || data.Code === 1005) {
        return {
          rtmpUrl: null,
          streamKey: streamId,
          fallbackMode: true,
          message: 'RTMP dispatch requires ZegoCloud configuration.',
          obsInstructions: {
            server: 'Contact ZegoCloud support to get your RTMP server URL.',
            streamKey: streamId,
            note: 'Use the WebRTC-based Go Live feature in the meantime.',
          },
        };
      }
      return json(500, { error: data.Message || 'RTMP dispatch failed' });
    }

    const rtmpUrls = data.Data || [];
    const primaryUrl = rtmpUrls[0] || null;
    let obsServer = '';
    let obsStreamKey = streamId;
    if (primaryUrl) {
      const lastSlash = primaryUrl.lastIndexOf('/');
      if (lastSlash > 0) {
        obsServer = primaryUrl.substring(0, lastSlash);
        obsStreamKey = primaryUrl.substring(lastSlash + 1);
      } else {
        obsServer = primaryUrl;
      }
    }

    return {
      rtmpUrl: primaryUrl,
      allUrls: rtmpUrls,
      obsServer,
      obsStreamKey,
      streamId,
      fallbackMode: false,
      obsInstructions: {
        server: obsServer,
        streamKey: obsStreamKey,
        note: 'In OBS: Settings → Stream → Service: Custom → paste Server and Stream Key',
      },
    };
  },

  // ─── Daily login reward (server-authoritative + idempotent) ──────────────
  async claimDailyReward({ supabase, user }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const { data, error } = await supabase.rpc('claim_daily_reward', { p_user_email: user.email });
    if (error) throw error;
    return data;
  },
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { functionName, params } = JSON.parse(event.body || '{}');
    if (!functionName) return json(400, { error: 'functionName is required' });

    const handler = handlers[functionName];
    if (!handler) return json(404, { error: `No Netlify route for ${functionName}` });

    const supabase = getSupabase(event);
    const admin = getServiceClient();
    const user = await getCurrentUser(supabase, event);
    const result = await handler({ supabase, admin, user, params, event });

    if (result?.statusCode) return result;
    return json(200, result);
  } catch (error) {
    return json(500, { error: error.message || 'Function failed' });
  }
};
