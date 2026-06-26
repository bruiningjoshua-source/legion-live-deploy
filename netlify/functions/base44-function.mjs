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

  async updateViewerCount({ supabase, admin, params }) {
    const { streamId, action } = params || {};
    if (!streamId || !['join', 'leave'].includes(action)) {
      return json(400, { error: 'streamId and action (join|leave) are required' });
    }

    // Use service role for cross-user writes; fall back to user client if unavailable
    const db = admin || supabase;
    const delta = action === 'join' ? 1 : -1;

    // Atomic increment/decrement — no read-then-write race condition
    const { data, error } = await db.rpc('increment_viewer_count', {
      p_stream_id: streamId,
      p_delta: delta,
    });

    if (error) {
      // RPC not deployed yet — fall back to a best-effort update
      const { data: stream } = await db
        .from('streams')
        .select('viewer_count')
        .eq('id', streamId)
        .single();
      const current = stream?.viewer_count || 0;
      const { data: updated, error: updateErr } = await db
        .from('streams')
        .update({ viewer_count: Math.max(0, current + delta) })
        .eq('id', streamId)
        .select('viewer_count')
        .single();
      if (updateErr) throw updateErr;
      return { success: true, viewerCount: updated.viewer_count, atomic: false };
    }

    return { success: true, viewerCount: data, atomic: true };
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
  // ─── AI Chat Moderation ──────────────────────────────────────────────────
  async aiModerateContent({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { content_type, content, stream_id, user_email, user_name } = params || {};

    // Check active bans first
    try {
      const db = admin || supabase;
      const { data: bans } = await db
        .from('user_bans')
        .select('*')
        .eq('user_email', user_email)
        .eq('is_active', true)
        .limit(5);
      const now = new Date();
      const activeBan = (bans || []).find(b => !b.expires_at || new Date(b.expires_at) > now);
      if (activeBan) {
        return json(200, { approved: false, action: 'banned', reason: `Banned until ${activeBan.expires_at || 'indefinitely'}` });
      }
    } catch (_) { /* bans table may not exist yet — fail open */ }

    // If no OpenAI key, approve and move on (fail open)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return json(200, { approved: true, flagged: false, warning: 'Moderation unavailable' });
    }

    try {
      const prompt = `You are a content moderator for a live streaming platform. Analyze this ${content_type}: "${content}". Return JSON only: {"status":"approved","category":"none","severity":"none","confidence":0.99,"reason":"ok","safe_for_minors":true}`;
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } }),
      });
      const data = await res.json();
      const result = JSON.parse(data.choices?.[0]?.message?.content || '{"status":"approved"}');
      const approved = result.status === 'approved' || result.status === 'warning';
      return json(200, { approved, flagged: result.status === 'warning', reason: result.reason, category: result.category });
    } catch (_) {
      return json(200, { approved: true, flagged: false, warning: 'Moderation temporarily unavailable' });
    }
  },

  // ─── Stripe: Buy Denarii ─────────────────────────────────────────────────
  async createDenariiCheckout({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { packageId, denarii, bonus = 0, price, packageName, vipPoints = 0, lottoTickets = 0 } = params || {};
    if (!packageId || !denarii || !price) return json(400, { error: 'Missing required fields' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const origin = process.env.URL || 'https://legionlive.app';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: packageName || `${Number(denarii).toLocaleString()} Denarii`,
            description: bonus > 0 ? `${Number(denarii).toLocaleString()} + ${Number(bonus).toLocaleString()} Bonus Denarii` : undefined,
          },
          unit_amount: Math.round(Number(price) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/Wallet?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/Wallet?cancelled=true`,
      metadata: {
        user_email: user.email,
        package_id: packageId,
        denarii_amount: String(denarii),
        bonus_denarii: String(bonus),
        vip_points: String(vipPoints),
        lotto_tickets: String(lottoTickets),
        purchase_type: 'denarii',
      },
    });

    return { sessionId: session.id, url: session.url };
  },

  // ─── Stripe: Tip Checkout ────────────────────────────────────────────────
  async createTipCheckout({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { creatorEmail, amount, streamId, message } = params || {};
    if (!creatorEmail || !amount) return json(400, { error: 'creatorEmail and amount required' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const origin = process.env.URL || 'https://legionlive.app';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Tip to ${creatorEmail}`, description: message || undefined },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/WatchStream?id=${streamId || ''}&tip=true`,
      cancel_url: `${origin}/WatchStream?id=${streamId || ''}`,
      metadata: { user_email: user.email, creator_email: creatorEmail, stream_id: streamId || '', purchase_type: 'tip', message: message || '' },
    });

    return { sessionId: session.id, url: session.url };
  },

  // ─── Stripe: Fan Club Checkout ───────────────────────────────────────────
  async createFanClubCheckout({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { creatorEmail, tier = 'basic', priceMonthly = 4.99 } = params || {};
    if (!creatorEmail) return json(400, { error: 'creatorEmail required' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const origin = process.env.URL || 'https://legionlive.app';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${creatorEmail} Fan Club — ${tier}` },
          unit_amount: Math.round(Number(priceMonthly) * 100),
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: user.email,
      success_url: `${origin}/FanClubs?joined=true`,
      cancel_url: `${origin}/FanClubs`,
      metadata: { user_email: user.email, creator_email: creatorEmail, tier, purchase_type: 'fan_club' },
    });

    return { sessionId: session.id, url: session.url };
  },

  // ─── Stripe: Creator Monetization Checkout ───────────────────────────────
  async createCreatorMonetizationCheckout({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { plan = 'monthly' } = params || {};

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const prices = { monthly: 999, yearly: 9900 }; // cents
    const origin = process.env.URL || 'https://legionlive.app';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Legion Live Creator — ${plan === 'yearly' ? 'Annual' : 'Monthly'}` },
          unit_amount: prices[plan] || 999,
          recurring: { interval: plan === 'yearly' ? 'year' : 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: user.email,
      success_url: `${origin}/CreatorMonetization?activated=true`,
      cancel_url: `${origin}/CreatorMonetization`,
      metadata: { user_email: user.email, purchase_type: 'creator_monetization', plan },
    });

    return { sessionId: session.id, url: session.url };
  },

  // ─── Stripe: Stripe Connect Onboard ─────────────────────────────────────
  async stripeConnectOnboard({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const { data: creator } = await supabase
      .from('creators')
      .select('id, stripe_account_id')
      .eq('user_email', user.email)
      .single();

    if (!creator) return json(404, { error: 'Creator profile not found' });

    let accountId = creator.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express', email: user.email });
      accountId = account.id;
      await supabase.from('creators').update({ stripe_account_id: accountId }).eq('id', creator.id);
    }

    const origin = process.env.URL || 'https://legionlive.app';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/CreatorPayouts?refresh=true`,
      return_url: `${origin}/CreatorPayouts?connected=true`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  },

  // ─── Cancel Subscription ─────────────────────────────────────────────────
  async cancelSubscription({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { subscriptionId } = params || {};
    if (!subscriptionId) return json(400, { error: 'subscriptionId required' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const cancelled = await stripe.subscriptions.cancel(subscriptionId);
    return { success: true, status: cancelled.status };
  },

  // ─── Legion AI Companion ─────────────────────────────────────────────────
  async legionCompanionChat({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { message } = params || {};
    if (!message) return json(400, { error: 'message required' });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return json(500, { error: 'AI companion not configured' });

    const db = admin || supabase;

    // Load companion memory
    const { data: memories } = await db
      .from('legion_companion_memories')
      .select('*')
      .eq('creator_email', user.email)
      .limit(1);
    const memory = memories?.[0];

    const systemPrompt = `You are Legion, an AI companion and advisor for a live streaming creator on Legion Live.
Creator: ${user.email}. ${memory?.conversation_summary ? `Context: ${memory.conversation_summary}` : ''}
Be concise, warm, and actionable. You help creators grow their audience, earn more, and improve streams.
Reply in JSON: { "reply": "your response here" }`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: `${systemPrompt}\n\nCreator: "${message}"` }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || '{"reply":"Sorry, I could not respond right now."}';
    let reply = 'I could not respond right now.';
    try {
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
      reply = parsed.reply || reply;
    } catch (_) { reply = text; }

    // Update interaction count
    if (memory) {
      await db.from('legion_companion_memories')
        .update({ total_interactions: (memory.total_interactions || 0) + 1 })
        .eq('id', memory.id)
        .catch(() => {});
    }

    return { reply, action: null };
  },

  // ─── Save User Theme ─────────────────────────────────────────────────────
  async saveUserTheme({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { theme } = params || {};
    if (!theme) return json(400, { error: 'theme required' });
    const { error } = await supabase.from('profiles').update({ theme }).eq('id', user.id);
    if (error) throw error;
    return { success: true };
  },

  // ─── Get Trending Content ────────────────────────────────────────────────
  async getTrendingContent({ supabase, params }) {
    const { limit = 20, category } = params || {};
    let query = supabase
      .from('streams')
      .select('id, title, viewer_count, creator_id, category, thumbnail_url, created_at')
      .eq('status', 'live')
      .order('viewer_count', { ascending: false })
      .limit(Number(limit));
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    return { streams: data || [] };
  },

  // ─── Get Payout Config ───────────────────────────────────────────────────
  async getPayoutConfig({ supabase, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    return {
      platform_cut: 0.5,
      creator_cut: 0.5,
      minimum_withdrawal_usd: 20,
      payout_schedule: 'weekly',
      supported_methods: ['stripe_connect', 'paypal'],
      denarii_to_usd_rate: 0.01,
    };
  },

  // ─── Forecast Creator Payouts ────────────────────────────────────────────
  async forecastCreatorPayouts({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: creator } = await supabase
      .from('creators')
      .select('id, total_earnings')
      .eq('user_email', user.email)
      .single();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: txns } = await supabase
      .from('gift_transactions')
      .select('amount_denarii, created_at')
      .eq('receiver_email', user.email)
      .gte('created_at', thirtyDaysAgo);
    const total30d = (txns || []).reduce((s, t) => s + (t.amount_denarii || 0), 0);
    const projected = (total30d / 30) * 30 * 0.01 * 0.5; // denarii → USD → creator cut
    return { projected_usd: projected.toFixed(2), period_days: 30, total_denarii_30d: total30d };
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
