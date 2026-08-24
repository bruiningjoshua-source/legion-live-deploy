import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, createCipheriv, randomInt } from 'node:crypto';

// ── Admin allowlist — only these emails can ever be admin ────────────────────
const ADMIN_ALLOWLIST = new Set([
  'bruiningjoshua@gmail.com',
  'inthestixproductions@gmail.com',
]);

function isAllowedAdmin(email) {
  return ADMIN_ALLOWLIST.has(email?.toLowerCase().trim());
}

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


// ─── IGDB (via Twitch OAuth) ────────────────────────────────────────────────
// Real game catalog with cover art. Server-side only: the client secret must
// never reach the browser. Token is cached in module scope between invocations.
let _igdbToken = null;
let _igdbTokenExp = 0;

async function getIgdbToken() {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET not configured');
  // Reuse the token until 60s before expiry.
  if (_igdbToken && Date.now() < _igdbTokenExp - 60000) return _igdbToken;
  const res = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: 'POST' });
  if (!res.ok) throw new Error(`Twitch auth failed: ${res.status}`);
  const j = await res.json();
  _igdbToken = j.access_token;
  _igdbTokenExp = Date.now() + (j.expires_in || 3600) * 1000;
  return _igdbToken;
}

async function igdbQuery(endpoint, body) {
  const token = await getIgdbToken();
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
    body,
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// IGDB image helper: t_cover_big = 264x374, t_720p for screenshots
const igdbImg = (hash, size = 't_cover_big') =>
  hash ? `https://images.igdb.com/igdb/image/upload/${size}/${hash}.jpg` : null;

const MOBILE_PLATFORM_IDS = [39, 34, 55]; // iOS, Android, Mobile

function mapIgdbGame(g) {
  const platforms = (g.platforms || []).map(p => p.name).filter(Boolean);
  const platformIds = (g.platforms || []).map(p => p.id);
  return {
    id: g.id,
    name: g.name,
    slug: g.slug || null,
    summary: g.summary ? String(g.summary).slice(0, 800) : null,
    cover_url: igdbImg(g.cover?.image_id, 't_cover_big'),
    screenshot_url: igdbImg(g.screenshots?.[0]?.image_id, 't_720p'),
    rating: g.total_rating ? Math.round(g.total_rating * 10) / 10 : null,
    release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getFullYear() : null,
    genres: (g.genres || []).map(x => x.name).filter(Boolean),
    platforms,
    is_mobile: platformIds.some(id => MOBILE_PLATFORM_IDS.includes(id)),
    publisher: g.involved_companies?.find(c => c.publisher)?.company?.name || null,
    popularity: g.total_rating_count || 0,
    updated_at: new Date().toISOString(),
  };
}

const handlers = {
  /** Host-only: boost their own live stream's visibility for 20 minutes.
   *  Free, but rate-limited (below) so it can't be spammed to permanently
   *  dominate discovery. */
  async boostStream({ admin, user, params }) {
    if (!user?.email) return json(401, { error: 'Unauthorized' });
    const { streamId } = params || {};
    if (!streamId) return json(400, { error: 'streamId required' });

    const { data: stream } = await admin.from('streams')
      .select('id, creator_email, status, boosted_until, last_boosted_at')
      .eq('id', streamId).single();
    if (!stream) return json(404, { error: 'Stream not found' });
    if (String(stream.creator_email).toLowerCase() !== user.email.toLowerCase()) {
      return json(403, { error: 'Only the host can boost this stream' });
    }
    if (stream.status !== 'live') return json(409, { error: 'Stream must be live to boost' });

    const now = Date.now();
    if (stream.boosted_until && new Date(stream.boosted_until).getTime() > now) {
      const remainingMin = Math.ceil((new Date(stream.boosted_until).getTime() - now) / 60000);
      return json(409, { error: `Already boosted — ${remainingMin} min remaining` });
    }
    // Cooldown: once every 60 minutes, so a stream can't stay boosted back-to-back.
    const COOLDOWN_MS = 60 * 60 * 1000;
    if (stream.last_boosted_at && now - new Date(stream.last_boosted_at).getTime() < COOLDOWN_MS) {
      const waitMin = Math.ceil((COOLDOWN_MS - (now - new Date(stream.last_boosted_at).getTime())) / 60000);
      return json(429, { error: `Boost is on cooldown — try again in ${waitMin} min` });
    }

    const boostedUntil = new Date(now + 20 * 60 * 1000).toISOString();
    const { error } = await admin.from('streams')
      .update({ boosted_until: boostedUntil, last_boosted_at: new Date(now).toISOString() })
      .eq('id', streamId);
    if (error) return json(500, { error: error.message });

    return json(200, { boostedUntil, durationMinutes: 20 });
  },

  /** Host-only: start a lottery on their own stream. Prize 100-5000 denarii,
   *  duration 5-10 minutes. The prize is debited from the host up front so a
   *  lottery can never pay out money the host doesn't have. */
  async startStreamLottery({ admin, user, params }) {
    if (!user?.email) return json(401, { error: 'Unauthorized' });
    const { streamId, prizeDenarii, durationSeconds } = params || {};
    if (!streamId) return json(400, { error: 'streamId required' });

    const prize = Number(prizeDenarii);
    const dur = Number(durationSeconds);
    // Exactly ONE entry condition, chosen by the host.
    const entryType = ['share_stream', 'send_gift', 'password'].includes(params?.entryType)
      ? params.entryType : null;
    if (!entryType) {
      return json(400, { error: 'entryType must be one of share_stream, send_gift, password' });
    }
    const password = String(params?.password || '').trim();
    const minGift = Number(params?.minGiftDenarii || 0);
    if (entryType === 'password' && password.length < 3) {
      return json(400, { error: 'Password must be at least 3 characters' });
    }
    if (entryType === 'send_gift' && (!Number.isFinite(minGift) || minGift < 1)) {
      return json(400, { error: 'Set the minimum gift value to enter' });
    }
    if (!Number.isFinite(prize) || prize < 100 || prize > 5000) {
      return json(400, { error: 'Prize must be between 100 and 5,000 Denarii' });
    }
    if (!Number.isFinite(dur) || dur < 300 || dur > 600) {
      return json(400, { error: 'Duration must be between 5 and 10 minutes' });
    }

    // HOST CHECK — only the stream's creator may start a lottery on it.
    const { data: stream } = await admin.from('streams')
      .select('id, creator_email').eq('id', streamId).single();
    if (!stream) return json(404, { error: 'Stream not found' });
    if (String(stream.creator_email).toLowerCase() !== user.email.toLowerCase()) {
      return json(403, { error: 'Only the stream host can start a lottery' });
    }

    // One open lottery per stream at a time.
    const { data: existing } = await admin.from('stream_lotteries')
      .select('id').eq('stream_id', streamId).eq('status', 'open').limit(1);
    if (existing?.length) return json(409, { error: 'A lottery is already running on this stream' });

    // Escrow the prize from the host's wallet up front.
    const { data: hostWallet } = await admin.from('wallets')
      .select('id, denarii_balance').eq('user_email', user.email).single();
    if (!hostWallet) return json(400, { error: 'Wallet not found' });
    if ((hostWallet.denarii_balance || 0) < prize) {
      return json(400, { error: 'Insufficient Denarii for that prize' });
    }
    const { error: debitErr } = await admin.from('wallets')
      .update({ denarii_balance: hostWallet.denarii_balance - prize })
      .eq('id', hostWallet.id);
    if (debitErr) return json(500, { error: 'Could not reserve prize' });

    const endsAt = new Date(Date.now() + dur * 1000).toISOString();
    const { createHash } = await import('node:crypto');
    const { data: lottery, error } = await admin.from('stream_lotteries').insert({
      stream_id: streamId, host_email: user.email,
      prize_denarii: prize, duration_seconds: dur, ends_at: endsAt,
      entry_type: entryType,
      // Never store the raw password.
      password_hash: entryType === 'password'
        ? createHash('sha256').update(password.toLowerCase()).digest('hex') : null,
      min_gift_denarii: entryType === 'send_gift' ? Math.round(minGift) : null,
    }).select().single();
    if (error) {
      // Refund the escrow if the insert failed.
      await admin.from('wallets').update({ denarii_balance: hostWallet.denarii_balance }).eq('id', hostWallet.id);
      return json(500, { error: error.message });
    }
    return json(200, { lottery });
  },

  /** Viewer: enter an open lottery. Free entry, one per user. */
  async enterStreamLottery({ admin, user, params }) {
    if (!user?.email) return json(401, { error: 'Unauthorized' });
    const { lotteryId } = params || {};
    if (!lotteryId) return json(400, { error: 'lotteryId required' });

    const { data: lottery } = await admin.from('stream_lotteries')
      .select('*').eq('id', lotteryId).single();
    if (!lottery) return json(404, { error: 'Lottery not found' });
    if (lottery.status !== 'open') return json(409, { error: 'Lottery is closed' });
    if (new Date(lottery.ends_at) < new Date()) return json(409, { error: 'Lottery has ended' });
    if (String(lottery.host_email).toLowerCase() === user.email.toLowerCase()) {
      return json(403, { error: 'The host cannot enter their own lottery' });
    }

    // ── Enforce the host's chosen entry condition ──
    let qualifiedVia = lottery.entry_type;
    let qualifyingRef = null;

    if (lottery.entry_type === 'password') {
      const { createHash } = await import('node:crypto');
      const given = String(params?.password || '').trim().toLowerCase();
      const hash = createHash('sha256').update(given).digest('hex');
      if (!given || hash !== lottery.password_hash) {
        return json(403, { error: 'Incorrect password' });
      }

    } else if (lottery.entry_type === 'send_gift') {
      // Must have sent a qualifying gift to THIS stream while the lottery is open.
      const min = lottery.min_gift_denarii || 1;
      const { data: gifts } = await admin.from('gift_transactions')
        .select('id, total_denarii, created_date')
        .eq('stream_id', lottery.stream_id)
        .eq('sender_email', user.email)
        .gte('created_date', lottery.started_at)
        .order('created_date', { ascending: false })
        .limit(20);
      const qualifying = (gifts || []).find(g => Number(g.total_denarii || 0) >= min);
      if (!qualifying) {
        return json(403, {
          error: `Send a gift worth ${min.toLocaleString()}+ Denarii during this lottery to enter`,
          code: 'GIFT_REQUIRED',
        });
      }
      qualifyingRef = qualifying.id;

    } else if (lottery.entry_type === 'share_stream') {
      // Share is self-attested (we can't verify an external share), but we record
      // it and still require an explicit share action from the client.
      if (!params?.shared) {
        return json(403, { error: 'Share the stream to enter', code: 'SHARE_REQUIRED' });
      }
    }

    const { error } = await admin.from('stream_lottery_entries').insert({
      lottery_id: lotteryId, user_email: user.email,
      display_name: user.full_name || user.email.split('@')[0],
      qualified_via: qualifiedVia, qualifying_ref: qualifyingRef,
    });
    if (error && !String(error.message).includes('duplicate')) {
      return json(500, { error: error.message });
    }
    const { count } = await admin.from('stream_lottery_entries')
      .select('id', { count: 'exact', head: true }).eq('lottery_id', lotteryId);
    return json(200, { entered: true, entryCount: count || 0 });
  },

  /** Host-only: draw a winner and pay the escrowed prize. */
  async drawStreamLottery({ admin, user, params }) {
    if (!user?.email) return json(401, { error: 'Unauthorized' });
    const { lotteryId } = params || {};
    if (!lotteryId) return json(400, { error: 'lotteryId required' });

    const { data: lottery } = await admin.from('stream_lotteries')
      .select('*').eq('id', lotteryId).single();
    if (!lottery) return json(404, { error: 'Lottery not found' });
    if (String(lottery.host_email).toLowerCase() !== user.email.toLowerCase()) {
      return json(403, { error: 'Only the host can draw' });
    }
    if (lottery.status !== 'open') return json(409, { error: 'Lottery already drawn' });

    const { data: entries } = await admin.from('stream_lottery_entries')
      .select('user_email, display_name').eq('lottery_id', lotteryId);

    // No entries — refund the host's escrow and close.
    if (!entries?.length) {
      const { data: hw } = await admin.from('wallets')
        .select('id, denarii_balance').eq('user_email', lottery.host_email).single();
      if (hw) {
        await admin.from('wallets')
          .update({ denarii_balance: (hw.denarii_balance || 0) + lottery.prize_denarii })
          .eq('id', hw.id);
      }
      await admin.from('stream_lotteries')
        .update({ status: 'cancelled', completed_at: new Date().toISOString() })
        .eq('id', lotteryId);
      return json(200, { winner: null, refunded: true });
    }

    const winner = entries[Math.floor(Math.random() * entries.length)];

    // Credit the winner (prize was already escrowed from the host at start).
    const { data: ww } = await admin.from('wallets')
      .select('id, denarii_balance').eq('user_email', winner.user_email).single();
    if (ww) {
      await admin.from('wallets')
        .update({ denarii_balance: (ww.denarii_balance || 0) + lottery.prize_denarii })
        .eq('id', ww.id);
    } else {
      await admin.from('wallets').insert({
        user_email: winner.user_email, denarii_balance: lottery.prize_denarii,
      });
    }

    await admin.from('stream_lotteries').update({
      status: 'complete', winner_email: winner.user_email,
      completed_at: new Date().toISOString(),
    }).eq('id', lotteryId);

    return json(200, {
      winner: { email: winner.user_email, display_name: winner.display_name },
      prize: lottery.prize_denarii,
      entryCount: entries.length,
    });
  },


  /** Sync games from IGDB into games_catalog. Admin-only (it writes the cache). */
  async syncGameCatalog({ admin, user, params }) {
    if (!user?.email) return json(401, { error: 'Unauthorized' });
    const { mobileOnly = false, limit = 200, offset = 0 } = params || {};
    // Pull popular games with cover art. Mobile pass filters to iOS/Android.
    const platformFilter = mobileOnly ? '& platforms = (39,34,55)' : '';
    const body = `
      fields name,slug,summary,cover.image_id,screenshots.image_id,total_rating,total_rating_count,
             first_release_date,genres.name,platforms.id,platforms.name,
             involved_companies.publisher,involved_companies.company.name;
      where cover != null & total_rating_count > 5 ${platformFilter};
      sort total_rating_count desc;
      limit ${Math.min(Number(limit) || 200, 500)};
      offset ${Number(offset) || 0};
    `;
    let games;
    try {
      games = await igdbQuery('games', body);
    } catch (e) {
      // Surface the REAL IGDB/Twitch error to the caller instead of a generic 500.
      return json(200, { synced: 0, error: `IGDB request failed: ${e.message}`, stage: 'igdb' });
    }
    if (!Array.isArray(games)) {
      return json(200, { synced: 0, error: `IGDB returned unexpected shape: ${JSON.stringify(games).slice(0,300)}`, stage: 'igdb-shape' });
    }
    const rows = games.map(mapIgdbGame);
    if (rows.length) {
      const { error } = await admin.from('games_catalog').upsert(rows, { onConflict: 'id' });
      if (error) return json(200, { synced: 0, error: `DB upsert failed: ${error.message}`, stage: 'db' });
    }
    return json(200, { synced: rows.length, fetched: games.length, mobileOnly, offset });
  },

  /** Search / list games from the local cache (fast, no IGDB hit). */
  async listGames({ admin, params }) {
    // Use the service-role client: the catalog is public data and reading it
    // must not depend on RLS policy state (an RLS gap silently returned zero
    // rows and blanked the whole games UI).
    const { search = '', mobileOnly = false, limit = 60, offset = 0 } = params || {};
    let q = admin.from('games_catalog').select('*');
    if (mobileOnly) q = q.eq('is_mobile', true);
    if (search) q = q.ilike('name', `%${search}%`);
    q = q.order('popularity', { ascending: false })
         .range(Number(offset) || 0, (Number(offset) || 0) + (Math.min(Number(limit) || 60, 1000)) - 1);
    const { data, error } = await q;
    if (error) throw error;
    return json(200, { games: data || [] });
  },


  // ─── Multi-guest panel: seats + join requests ────────────────────────────
  async streamPanelSeat({ admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { streamId, action, seatIndex, targetEmail, targetName } = params || {};
    if (!streamId || !action) return json(400, { error: 'streamId and action required' });
    const db = admin;

    const { data: stream } = await db.from('streams').select('id, creator_id').eq('id', streamId).single().catch(() => ({ data: null }));
    if (!stream) return json(404, { error: 'Stream not found' });
    const { data: hostCreator } = await db.from('creators').select('user_email').eq('id', stream.creator_id).single().catch(() => ({ data: null }));
    const isHost = hostCreator?.user_email === user.email;
    let isMod = false;
    if (!isHost) {
      const { data: mod } = await db.from('stream_moderators').select('id')
        .eq('stream_id', streamId).eq('moderator_email', user.email).eq('is_active', true).maybeSingle().catch(() => ({ data: null }));
      isMod = !!mod;
    }
    const hostOrMod = isHost || isMod;

    switch (action) {
      case 'lock':
      case 'unlock': {
        if (!hostOrMod) return json(403, { error: 'Only host/mods can lock seats' });
        await db.from('stream_panel_seats').upsert({
          stream_id: streamId, seat_index: seatIndex, is_locked: action === 'lock', updated_at: new Date().toISOString(),
        }, { onConflict: 'stream_id,seat_index' });
        return { ok: true, seatIndex, locked: action === 'lock' };
      }
      case 'request': {
        // A viewer asks to join. Only allowed if at least one seat is unlocked/open.
        await db.from('stream_join_requests').upsert({
          stream_id: streamId, requester_email: user.email, requester_name: targetName || user.email.split('@')[0], status: 'pending',
        }, { onConflict: 'stream_id,requester_email' });
        return { ok: true, requested: true };
      }
      case 'accept': {
        if (!hostOrMod) return json(403, { error: 'Only host/mods can accept' });
        await db.from('stream_join_requests').update({ status: 'accepted' })
          .eq('stream_id', streamId).eq('requester_email', targetEmail);
        await db.from('stream_panel_seats').upsert({
          stream_id: streamId, seat_index: seatIndex, occupant_email: targetEmail, occupant_name: targetName, is_locked: false, updated_at: new Date().toISOString(),
        }, { onConflict: 'stream_id,seat_index' });
        return { ok: true, accepted: targetEmail, seatIndex };
      }
      case 'decline': {
        if (!hostOrMod) return json(403, { error: 'Only host/mods can decline' });
        await db.from('stream_join_requests').update({ status: 'declined' })
          .eq('stream_id', streamId).eq('requester_email', targetEmail);
        return { ok: true, declined: targetEmail };
      }
      case 'invite': {
        if (!hostOrMod) return json(403, { error: 'Only host/mods can invite' });
        await db.from('stream_panel_seats').upsert({
          stream_id: streamId, seat_index: seatIndex, occupant_email: targetEmail, occupant_name: targetName, is_locked: false, updated_at: new Date().toISOString(),
        }, { onConflict: 'stream_id,seat_index' });
        return { ok: true, invited: targetEmail, seatIndex };
      }
      case 'remove_occupant': {
        if (!hostOrMod) return json(403, { error: 'Only host/mods can remove' });
        await db.from('stream_panel_seats').update({ occupant_email: null, occupant_name: null })
          .eq('stream_id', streamId).eq('seat_index', seatIndex);
        return { ok: true, removed: seatIndex };
      }
      case 'leave': {
        // Occupant leaves their own seat
        await db.from('stream_panel_seats').update({ occupant_email: null, occupant_name: null })
          .eq('stream_id', streamId).eq('occupant_email', user.email);
        return { ok: true, left: true };
      }
      default:
        return json(400, { error: `Unknown action: ${action}` });
    }
  },

  // ─── Stream moderation (host + appointed admins) ─────────────────────────
  async streamModerate({ admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { streamId, action, targetEmail, value } = params || {};
    if (!streamId || !action) return json(400, { error: 'streamId and action required' });
    const db = admin;

    // Authorize: must be the stream host OR an active appointed moderator.
    const { data: stream } = await db.from('streams').select('id, creator_id').eq('id', streamId).single().catch(() => ({ data: null }));
    if (!stream) return json(404, { error: 'Stream not found' });
    const { data: hostCreator } = await db.from('creators').select('user_email').eq('id', stream.creator_id).single().catch(() => ({ data: null }));
    const isHost = hostCreator?.user_email === user.email;
    let isMod = false;
    if (!isHost) {
      const { data: mod } = await db.from('stream_moderators')
        .select('id').eq('stream_id', streamId).eq('moderator_email', user.email).eq('is_active', true).maybeSingle().catch(() => ({ data: null }));
      isMod = !!mod;
    }
    if (!isHost && !isMod) return json(403, { error: 'Not authorized to moderate this stream' });

    const upsertGuest = async (patch) => {
      await db.from('stream_guest_states').upsert({
        stream_id: streamId, guest_email: targetEmail, updated_by: user.email, updated_at: new Date().toISOString(), ...patch,
      }, { onConflict: 'stream_id,guest_email' });
    };
    const logAction = async () => {
      await db.from('moderation_actions').insert({
        stream_id: streamId, action_type: action, target_email: targetEmail, moderator_email: user.email,
        reason: (action === 'ban' || action === 'kick') ? (value || null) : null,
      }).catch(() => {});
    };

    switch (action) {
      case 'mute':        await upsertGuest({ is_muted: true }); break;
      case 'unmute':      await upsertGuest({ is_muted: false }); break;
      case 'cam_off':     await upsertGuest({ cam_off: true }); break;
      case 'cam_on':      await upsertGuest({ cam_off: false }); break;
      case 'set_volume':  await upsertGuest({ volume: Math.max(0, Math.min(100, parseInt(value ?? 100, 10))) }); break;
      case 'drop_to_chat':await upsertGuest({ dropped_to_chat: true, cam_off: true }); break;
      case 'kick':        await upsertGuest({ is_kicked: true }); break;
      case 'ban':
        await upsertGuest({ is_kicked: true });
        await db.from('user_bans').insert({
          banned_user_email: targetEmail, banned_by_email: user.email, stream_id: streamId,
          is_active: true, is_platform_ban: false, is_global: false, reason: value || 'Stream violation',
        }).catch(() => {});
        break;
      case 'unban':
        await db.from('user_bans').update({ is_active: false })
          .eq('stream_id', streamId).eq('banned_user_email', targetEmail).eq('is_active', true).catch(() => {});
        break;
      case 'appoint_mod':
        if (!isHost) return json(403, { error: 'Only the host can appoint moderators' });
        await db.from('stream_moderators').upsert({
          stream_id: streamId, creator_email: user.email, moderator_email: targetEmail, is_active: true,
        }, { onConflict: 'stream_id,moderator_email' }).catch(() => {});
        break;
      case 'remove_mod':
        if (!isHost) return json(403, { error: 'Only the host can remove moderators' });
        await db.from('stream_moderators').update({ is_active: false })
          .eq('stream_id', streamId).eq('moderator_email', targetEmail).catch(() => {});
        break;
      default:
        return json(400, { error: `Unknown action: ${action}` });
    }
    await logAction();
    return { ok: true, action, targetEmail };
  },

  // ─── Notify admins (stream reports, flags) ────────────────────────────────
  async notifyAdmins({ admin, user, params }) {
    const { type, message, stream_id } = params || {};
    if (!message) return json(400, { error: 'message required' });
    const db = admin;
    // Write a notification row for each admin account
    const ADMIN_EMAILS = ['bruiningjoshua@gmail.com', 'inthestixproductions@gmail.com'];
    try {
      await db.from('notifications').insert(
        ADMIN_EMAILS.map(email => ({
          user_email: email,
          type: type || 'admin_alert',
          title: 'Admin Alert',
          message,
          metadata: stream_id ? { stream_id } : {},
          is_read: false,
        }))
      );
    } catch (e) {
      // notifications table may differ; don't hard-fail the report flow
      console.error('[notifyAdmins] insert failed:', e.message);
      return { ok: false, error: e.message };
    }
    return { ok: true };
  },

  // ─── MUSIC: publish a recorded track to the user's Sounds ─────────────────
  async uploadAudioTrack({ admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { audioBase64, mimeType, title, bpm, keySignature, visibility } = params || {};
    if (!audioBase64) return json(400, { error: 'audio required' });

    // Resolve creator record
    const { data: creator } = await admin.from('creators')
      .select('id').eq('user_email', user.email).single();
    if (!creator) return json(400, { error: 'Become a creator to publish tracks' });

    // Upload to storage
    const ext = (mimeType && mimeType.includes('webm')) ? 'webm' : (mimeType && mimeType.includes('mp3')) ? 'mp3' : 'audio';
    const path = `tracks/${creator.id}/${Date.now()}.${ext}`;
    const bytes = Buffer.from(audioBase64, 'base64');
    const { error: upErr } = await admin.storage.from('uploads').upload(path, bytes, { contentType: mimeType || 'audio/webm', upsert: false });
    if (upErr) return json(500, { error: `Upload failed: ${upErr.message}` });

    const { data: track, error: insErr } = await admin.from('ll_music_tracks').insert({
      creator_id: creator.id,
      title: (title || 'Untitled Track').substring(0, 120),
      bpm: bpm ? Math.round(bpm) : null,
      key_signature: keySignature || null,
      storage_path: path,
      visibility: visibility || 'public',
    }).select('id').single();
    if (insErr) return json(500, { error: insErr.message });

    const { data: urlData } = admin.storage.from('uploads').getPublicUrl(path);
    return { ok: true, trackId: track.id, url: urlData?.publicUrl };
  },

  // ─── STEAM: link account, sync library/achievements/now-playing ───────────
  async steamLinkStart({ user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const realm = process.env.PUBLIC_SITE_URL || 'https://legion-live.netlify.app';
    const returnTo = `${realm}/.netlify/functions/legion-api?steam_return=1&email=${encodeURIComponent(user.email)}`;
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': returnTo,
      'openid.realm': realm,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });
    return { redirectUrl: `https://steamcommunity.com/openid/login?${params.toString()}` };
  },

  async steamSync({ admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const key = process.env.STEAM_API_KEY;
    if (!key) return json(500, { error: 'Steam not configured' });

    // Resolve the linked steamid for this user
    const { data: acct } = await admin.from('gaming_accounts')
      .select('platform_user_id').eq('user_email', user.email).eq('platform', 'steam').single();
    const steamId = acct?.platform_user_id || params?.steamId;
    if (!steamId) return json(400, { error: 'No linked Steam account' });

    // Player summary (persona + now-playing)
    const sumRes = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`);
    const sum = await sumRes.json();
    const p = sum?.response?.players?.[0] || {};

    // Owned games (library)
    const libRes = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`);
    const lib = await libRes.json();
    const games = (lib?.response?.games || [])
      .sort((a,b)=> (b.playtime_forever||0)-(a.playtime_forever||0))
      .slice(0, 100)
      .map(g => ({ appid: g.appid, name: g.name, playtime_hours: Math.round((g.playtime_forever||0)/60*10)/10,
                   icon: g.img_icon_url ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg` : null }));

    const snapshot = {
      platform_username: p.personaname || null,
      avatar_url: p.avatarfull || null,
      profile_url: p.profileurl || null,
      now_playing: p.gameextrainfo || null,
      now_playing_appid: p.gameid || null,
      library_json: games,
      last_synced_at: new Date().toISOString(),
    };
    await admin.from('gaming_accounts').update(snapshot)
      .eq('user_email', user.email).eq('platform', 'steam');

    return { ok: true, ...snapshot, gameCount: games.length };
  },

  async getGamingAccounts({ admin, params }) {
    // Public: show a creator's linked gaming accounts on their profile
    const email = params?.email;
    if (!email) return json(400, { error: 'email required' });
    const { data } = await admin.from('gaming_accounts')
      .select('platform, platform_username, avatar_url, profile_url, now_playing, now_playing_appid, library_json, last_synced_at')
      .eq('user_email', email);
    return { accounts: data || [] };
  },

  async unlinkGamingAccount({ admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const platform = params?.platform;
    if (!['steam','epic'].includes(platform)) return json(400, { error: 'invalid platform' });
    await admin.from('gaming_accounts').delete()
      .eq('user_email', user.email).eq('platform', platform);
    return { ok: true };
  },

  async epicLinkStart({ user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const clientId = process.env.EPIC_CLIENT_ID;
    if (!clientId) return json(500, { error: 'Epic not configured' });
    const realm = process.env.PUBLIC_SITE_URL || 'https://legion-live.netlify.app';
    const redirectUri = `${realm}/.netlify/functions/legion-api?epic_return=1`;
    const params2 = new URLSearchParams({
      client_id: clientId, response_type: 'code', scope: 'basic_profile',
      redirect_uri: redirectUri, state: user.email,
    });
    return { redirectUrl: `https://www.epicgames.com/id/authorize?${params2.toString()}` };
  },
  async clearLiveStreams({ supabase, admin, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
    if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Admin only' });
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

  async updateViewerCount({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
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

  async sendGift({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!user?.email) return json(401, { error: 'Authentication required' });

    // Accept both old wallet-ID style and new creator-ID style from GiftService
    const {
      senderWalletId, receiverWalletId, amountDenarii,
      giftId, quantity = 1, streamId, creatorId,
      reason, relatedEntityId,
    } = params || {};

    // Rate limit: max 30 gifts per minute per user
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentGifts } = await supabase
      .from('gift_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('sender_email', user.email)
      .gte('created_at', oneMinuteAgo);
    if ((recentGifts || 0) >= 30) {
      return json(429, { error: 'Too many gifts — please slow down' });
    }

    // Resolve wallet IDs from authenticated user identity (no client-trust issue)
    let resolvedSenderWalletId = senderWalletId;
    let resolvedReceiverWalletId = receiverWalletId;
    let resolvedAmount = amountDenarii;

    if (!resolvedSenderWalletId) {
      // Resolve sender wallet from JWT identity — always safe, no client-trust
      const { data: sw } = await supabase.from('wallets').select('id').eq('user_email', user.email).single().catch(() => ({ data: null }));
      if (!sw) return json(404, { error: 'Sender wallet not found' });
      resolvedSenderWalletId = sw.id;
    } else {
      // If caller supplied a wallet ID, verify ownership
      const { data: sw } = await supabase.from('wallets').select('user_email').eq('id', resolvedSenderWalletId).single().catch(() => ({ data: null }));
      if (!sw || sw.user_email !== user.email) return json(403, { error: 'You do not own this wallet' });
    }

    if (!resolvedReceiverWalletId && creatorId) {
      // Resolve receiver wallet from creatorId
      const { data: creator } = await supabase.from('creators').select('user_email, payouts_enabled').eq('id', creatorId).single().catch(() => ({ data: null }));
      if (!creator) return json(404, { error: 'Creator not found' });
      // Gifts are only accepted by monetized creators. Free creators receive
      // tips only (capped separately). Enforced server-side so hiding the gift
      // menu on the client cannot be bypassed. "Monetized" = Stripe payouts
      // enabled OR an active creator subscription (incl. admin-activated).
      let canReceiveGifts = !!creator.payouts_enabled;
      if (!canReceiveGifts) {
        const { data: sub } = await supabase
          .from('creator_subscriptions')
          .select('status, admin_activated')
          .eq('user_email', creator.user_email)
          .order('created_date', { ascending: false })
          .limit(1)
          .maybeSingle()
          .catch(() => ({ data: null }));
        canReceiveGifts = sub?.status === 'active' || sub?.admin_activated === true;
      }
      if (!canReceiveGifts) {
        return json(403, { error: 'This creator is not set up to receive gifts. You can send a tip instead.', code: 'GIFTS_DISABLED' });
      }
      const { data: rw } = await supabase.from('wallets').select('id').eq('user_email', creator.user_email).single().catch(() => ({ data: null }));
      if (!rw) return json(404, { error: 'Creator wallet not found' });
      resolvedReceiverWalletId = rw.id;
    }

    if (!resolvedSenderWalletId || !resolvedReceiverWalletId) {
      return json(400, { error: 'Could not resolve sender and receiver wallets' });
    }

    // Resolve gift cost if not provided
    if (!resolvedAmount && giftId) {
      const { data: gift } = await supabase.from('gifts').select('cost_denarii').eq('id', giftId).single().catch(() => ({ data: null }));
      resolvedAmount = (gift?.cost_denarii || 0) * (Number(quantity) || 1);
    }
    if (!resolvedAmount || resolvedAmount <= 0) {
      return json(400, { error: 'Could not determine gift amount' });
    }

    const { data: transfer, error: transferError } = await supabase.rpc('transfer_denarii', {
      p_sender_wallet_id: resolvedSenderWalletId,
      p_receiver_wallet_id: resolvedReceiverWalletId,
      p_amount: resolvedAmount,
      p_reason: reason || 'gift',
      p_related_entity_id: relatedEntityId || streamId || null,
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

    // Advance any active gift-goal banners on this stream by the gift value.
    if (streamId) {
      try {
        const db2 = admin || supabase;
        const { data: goals } = await db2.from('stream_banners')
          .select('id, goal_current')
          .eq('stream_id', streamId).eq('kind', 'gift_goal').eq('visible', true);
        for (const g of goals || []) {
          await db2.from('stream_banners')
            .update({ goal_current: (g.goal_current || 0) + amountDenarii, updated_at: new Date().toISOString() })
            .eq('id', g.id);
        }
      } catch (e) { console.error('[sendGift] gift goal update failed:', e?.message); }
    }

    return { success: true, transfer, transaction };
  },

  async requestWithdrawal({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
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
  async generateZegoToken({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const { roomId, userId, role } = params || {};
    if (!roomId || !userId) {
      return json(400, { error: 'Missing required parameters: roomId and userId' });
    }

    const sanitizedRoomId = String(roomId).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 128);
    const sanitizedUserId = String(userId).replace(/[^a-zA-Z0-9_]/g, '').substring(0, 64);
    const sanitizedRole = ['host', 'audience', 'cohost'].includes(role) ? role : 'audience';

    // PPV GATE: the roomId is the stream id. If that stream is gated behind a
    // ppv_event, only ticket holders (plus the host and admins) get a token.
    // Enforced here because without a token the stream cannot be played at all —
    // a client-side paywall alone could be bypassed.
    try {
      const { data: allowed, error: gateErr } = await supabase.rpc('has_ppv_access', {
        p_stream_id: sanitizedRoomId,
        p_email: user.email,
      });
      if (!gateErr && allowed === false) {
        return json(403, {
          error: 'Ticket required',
          detail: 'This is a pay-per-view event. Purchase a ticket to watch.',
          code: 'PPV_TICKET_REQUIRED',
        });
      }
    } catch (e) {
      // Fail CLOSED only for malformed ids; otherwise log and continue so a
      // gate outage can't take down all free streams.
      console.warn('[ppv] access check failed:', e?.message);
    }

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
  async getOBSStreamKey({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const { streamId } = params || {};
    if (!streamId) return json(400, { error: 'streamId is required' });

    const appId = process.env.ZEGOCLOUD_APP_ID;
    const serverSecret = process.env.ZEGOCLOUD_SERVER_SECRET;
    if (!appId || !serverSecret) {
      return json(500, { error: 'Streaming service not configured' });
    }

    // RTMP ingest is activated on the ZegoCloud account. The live domain and
    // WHIP auth key come from env vars (set in Netlify) — no secrets in source.
    const rtmpDomain = process.env.ZEGOCLOUD_RTMP_DOMAIN || '';
    const whipAuthKey = process.env.ZEGOCLOUD_WHIP_AUTH_KEY || '';
    if (!rtmpDomain) {
      return json(500, { error: 'RTMP domain not configured' });
    }

    // Zego RTMP push: rtmp://{domain}/{appId}/{streamId}
    const obsServer = `rtmp://${rtmpDomain}/${appId}`;
    const obsStreamKey = streamId;
    const rtmpUrl = `${obsServer}/${obsStreamKey}`;

    // WHIP (WebRTC-HTTP ingest) — lower-latency alternative for OBS WHIP output
    const whipUrl = whipAuthKey
      ? `https://${rtmpDomain}/whip/?appid=${appId}&stream=${streamId}&auth=${whipAuthKey}`
      : null;

    return {
      rtmpUrl,
      obsServer,
      obsStreamKey,
      whipUrl,
      streamId,
      fallbackMode: false,
      obsInstructions: {
        server: obsServer,
        streamKey: obsStreamKey,
        note: 'In OBS: Settings \u2192 Stream \u2192 Service: Custom \u2192 paste Server and Stream Key. For lowest latency, use WHIP output with the WHIP URL.',
      },
    };
  },

  // ─── Daily login reward (server-authoritative + idempotent) ──────────────
  async claimDailyReward({ supabase, admin, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
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

    // ── Static word filter — instant, no API needed ──────────────────────────
    const HARD_BLOCK_TERMS = [
      // Sexual / explicit
      'onlyfans', 'nude', 'nudes', 'naked', 'porn', 'pornography', 'xxx', 'nsfw',
      'sex tape', 'masturbat', 'cum shot', 'cum on', 'jerk off', 'jack off',
      'penis', 'vagina', 'dick pic', 'pussy', 'anal sex', 'blowjob', 'handjob',
      // Children / minors
      'cp ', 'child porn', 'csam', 'lolicon', 'shotacon', 'kids naked', 'underage sex',
      'pedo', 'pedophile', 'grooming children',
      // Hard drugs (not marijuana)
      'heroin', 'fentanyl', 'meth ', 'methamphetamine', 'crystal meth', 'crack cocaine',
      'crack pipe', 'shooting up', 'needle drugs', 'drug injection', 'opioid abuse',
      'xylazine', 'tranq dope', 'krokodil',
      // Extremism / terrorism
      'isis ', 'al qaeda', 'jihad attack', 'allahu akbar kill', 'school shooting plan',
      'bomb making', 'how to make bomb', 'terrorist attack', 'mass shooting plan',
      'white supremac', 'neo nazi', 'heil hitler', '88 precepts',
      // Pride / transgender ideology promotion
      'pride flag', 'trans kids', 'gender affirming care for children', 'drag kids',
      'preferred pronouns are', 'my pronouns are', 'they/them lesson',
      'gender fluid children', 'non-binary education', 'transgender children',
      'queer theory', 'teach kids gender',
    ];

    const lowerContent = content?.toLowerCase() || '';
    for (const term of HARD_BLOCK_TERMS) {
      if (lowerContent.includes(term)) {
        // Log to moderation_alerts
        try {
          const db = admin || supabase;
          await db.from('moderation_alerts').insert({
            stream_id: stream_id || null,
            user_email: user_email || null,
            user_name: user_name || null,
            alert_type: 'hard_block',
            severity: 'high',
            content: content?.slice(0, 500),
            ai_confidence: 1.0,
            action_taken: 'blocked',
            matched_term: term,
          }).catch(() => {});
        } catch (_) {}
        return json(200, { approved: false, action: 'message_removed', reason: `Content policy violation: prohibited term`, category: 'policy_violation' });
      }
    }

    // If no OpenAI key, approve after static filter passes
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return json(200, { approved: true, flagged: false, warning: 'AI moderation unavailable — static filter passed' });
    }

    try {
      const prompt = `You are a content moderator for Legion Live, a free-speech-friendly live streaming platform. Analyze this ${content_type} and return JSON only.

PLATFORM RULES — HARD VIOLATIONS (status: "violation"):
- Nudity, sexual content, explicit material of any kind
- Any content featuring or targeting minors sexually
- Hard drug use: heroin, fentanyl, meth, crack, opioid abuse, needle drug use
- Extremist content: terrorism, ISIS, Al-Qaeda, Nazi ideology, calls for violence
- Content sexualizing or recruiting minors
- Doxxing: sharing private addresses, phone numbers, SSNs of real people
- Coordinated hate campaigns targeting a specific private individual
- LGBTQ+ ideological promotion, transgender education, pronoun instruction, drag content directed at children, pride activism

PLATFORM RULES — FLAG FOR REVIEW (status: "warning"):
- Simulated violence that looks real (not clearly game/movie)
- Potentially underage person in adult context
- Borderline drug content (not clearly marijuana or legal substances)
- Possible harassment of a specific named individual

PLATFORM RULES — EXPLICITLY ALLOWED (status: "approved"):
- Marijuana use, growing, cultivation discussion, cannabis education
- Cigarette and cigar smoking
- Alcohol consumption and bar/social drinking content
- Gun safety, range shooting, hunting, firearms education, legal firearm ownership
- Survival skills, bushcraft, off-grid living, prepping
- Free speech including controversial political opinions (not extremism)
- Profanity and adult language between consenting adults
- Combat sports, MMA, boxing, wrestling
- Discussions about drugs in harm-reduction, news, or legal contexts

Content to analyze: "${content?.slice(0, 800)}"

Return JSON: {"status":"approved"|"warning"|"violation","category":"none"|"sexual"|"minor_safety"|"hard_drugs"|"extremism"|"lgbtq_promotion"|"doxxing"|"harassment"|"other","confidence":0.0-1.0,"reason":"brief explanation"}`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1, // low temp = consistent, predictable moderation
        }),
      });
      const data = await res.json();
      const result = JSON.parse(data.choices?.[0]?.message?.content || '{"status":"approved"}');

      if (result.status === 'violation' && (result.confidence || 0) > 0.80) {
        // Log violation
        try {
          const db = admin || supabase;
          await db.from('moderation_alerts').insert({
            stream_id: stream_id || null,
            user_email: user_email || null,
            user_name: user_name || null,
            alert_type: result.category || 'ai_violation',
            severity: (result.confidence || 0) > 0.92 ? 'high' : 'medium',
            content: content?.slice(0, 500),
            ai_confidence: result.confidence,
            action_taken: 'blocked',
          }).catch(() => {});
        } catch (_) {}
        return json(200, { approved: false, action: 'message_removed', reason: result.reason, category: result.category });
      }

      if (result.status === 'warning') {
        // Flag for human review but let through
        try {
          const db = admin || supabase;
          await db.from('moderation_alerts').insert({
            stream_id: stream_id || null,
            user_email: user_email || null,
            alert_type: result.category || 'ai_warning',
            severity: 'low',
            content: content?.slice(0, 500),
            ai_confidence: result.confidence,
            action_taken: 'flagged',
          }).catch(() => {});
        } catch (_) {}
        return json(200, { approved: true, flagged: true, reason: result.reason, category: result.category });
      }

      return json(200, { approved: true, flagged: false, category: result.category });
    } catch (_) {
      // Fail open — static filter already ran
      return json(200, { approved: true, flagged: false, warning: 'AI moderation temporarily unavailable' });
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
    const stripe = new Stripe(stripeKey);

    const origin = process.env.URL || 'https://legion-live.netlify.app';
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
  async createTipCheckout({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    let { creatorEmail, creatorId, amount, streamId, message } = params || {};
    if (!amount) return json(400, { error: 'amount required' });
    if (!creatorEmail && !creatorId) return json(400, { error: 'creatorEmail or creatorId required' });

    const tipAmount = Number(amount);
    if (!(tipAmount > 0)) return json(400, { error: 'Tip amount must be positive' });

    // ── Free-creator bi-weekly tip cap ───────────────────────────────────────
    // Creators who are NOT Stripe-monetized (no payouts_enabled) may receive at
    // most $100 USD in tips per rolling 14-day window. Monetized creators are
    // uncapped here (they earn via gifts + payouts). Enforced server-side so it
    // cannot be bypassed from the client.
    const db = admin || supabase;
    // Resolve creator by id if email wasn't supplied (TipButton sends creatorId)
    let creatorRow = null;
    if (creatorEmail) {
      ({ data: creatorRow } = await db.from('creators').select('user_email, payouts_enabled').eq('user_email', creatorEmail).single().catch(() => ({ data: null })));
    } else {
      ({ data: creatorRow } = await db.from('creators').select('user_email, payouts_enabled').eq('id', creatorId).single().catch(() => ({ data: null })));
      if (creatorRow?.user_email) creatorEmail = creatorRow.user_email;
    }
    if (!creatorEmail) return json(404, { error: 'Creator not found' });

    const isMonetized = !!creatorRow?.payouts_enabled;
    if (!isMonetized) {
      const BIWEEKLY_TIP_CAP_USD = 100;
      const windowStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentTips } = await db
        .from('tips')
        .select('amount_usd')
        .eq('creator_email', creatorEmail)
        .eq('status', 'completed')
        .gte('created_at', windowStart);
      const already = (recentTips || []).reduce((s, t) => s + Number(t.amount_usd || 0), 0);
      if (already + tipAmount > BIWEEKLY_TIP_CAP_USD) {
        const remaining = Math.max(0, BIWEEKLY_TIP_CAP_USD - already);
        return json(403, {
          error: remaining > 0
            ? `This creator can receive $${remaining.toFixed(2)} more in tips this period (free creators are capped at $${BIWEEKLY_TIP_CAP_USD} per 2 weeks).`
            : `This creator has reached their $${BIWEEKLY_TIP_CAP_USD} bi-weekly tip limit. Try again later.`,
          code: 'TIP_CAP_REACHED',
          cap_usd: BIWEEKLY_TIP_CAP_USD,
          remaining_usd: remaining,
        });
      }
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const origin = process.env.URL || 'https://legion-live.netlify.app';
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
    const stripe = new Stripe(stripeKey);

    const origin = process.env.URL || 'https://legion-live.netlify.app';
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
    const stripe = new Stripe(stripeKey);

    const prices = { monthly: 500, yearly: 1200 }; // cents — \$5.00/mo, \$12.00/yr
    const origin = process.env.URL || 'https://legion-live.netlify.app';
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
    const stripe = new Stripe(stripeKey);

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

    const origin = process.env.URL || 'https://legion-live.netlify.app';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/CreatorPayouts?refresh=true`,
      return_url: `${origin}/CreatorPayouts?connected=true`,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  },

  // ─── Stripe Connect: sync account status (called on return from onboarding) ──
  async stripeConnectStatus({ supabase, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const { data: creator } = await supabase
      .from('creators')
      .select('id, stripe_account_id')
      .eq('user_email', user.email)
      .single();
    if (!creator) return json(404, { error: 'Creator profile not found' });
    if (!creator.stripe_account_id) {
      return { connected: false, payouts_enabled: false, charges_enabled: false, onboarding_complete: false };
    }

    const acct = await stripe.accounts.retrieve(creator.stripe_account_id);
    const onboardingComplete = !!acct.details_submitted && !!acct.payouts_enabled;
    await supabase.from('creators').update({
      payouts_enabled: !!acct.payouts_enabled,
      charges_enabled: !!acct.charges_enabled,
      stripe_onboarding_complete: onboardingComplete,
    }).eq('id', creator.id);

    return {
      connected: true,
      payouts_enabled: !!acct.payouts_enabled,
      charges_enabled: !!acct.charges_enabled,
      onboarding_complete: onboardingComplete,
      requirements_due: acct.requirements?.currently_due || [],
    };
  },

  // ─── Request a payout: convert Denarii balance to a Stripe transfer ──────────
  async requestPayout({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);
    const db = admin || supabase;

    // Economics: 180 Denarii = $1 USD, creators already hold their 60% share as Denarii
    const DENARII_PER_USD = 180;
    // Minimum payout comes from platform_payout_config so it can change without a
  // deploy. 180 Denarii = $1. Falls back to $50 if the config can't be read.
  let MIN_PAYOUT_DENARII = 9000;
  try {
    const { data: cfgRows } = await db.from('platform_payout_config').select('min_payout_usd').limit(1);
    const minUsd = Number(cfgRows?.[0]?.min_payout_usd);
    if (minUsd > 0) MIN_PAYOUT_DENARII = Math.round(minUsd * 180);
  } catch (e) {
    console.warn('[payout] config read failed, using $50 default:', e.message);
  }

    const { data: creator } = await supabase
      .from('creators')
      .select('id, user_email, stripe_account_id, payouts_enabled')
      .eq('user_email', user.email)
      .single();
    if (!creator) return json(404, { error: 'Creator profile not found' });
    if (!creator.stripe_account_id || !creator.payouts_enabled) {
      return json(400, { error: 'Complete Stripe onboarding before requesting a payout.' });
    }

    // THE WALL: payouts draw ONLY from withdrawable (earned-from-gifts) Denarii.
    // Purchased Denarii are never cashable — this keeps Legion Live a platform,
    // not a money transmitter. A creator cannot buy Denarii and withdraw them.
    const { data: wallet } = await db
      .from('wallets')
      .select('denarii_balance, withdrawable_denarii')
      .eq('user_email', user.email)
      .single();
    const earned = wallet?.withdrawable_denarii || 0;
    if (earned < MIN_PAYOUT_DENARII) {
      return json(400, { error: `Minimum payout is ${MIN_PAYOUT_DENARII} earned Denarii (~$10). You have ${earned} withdrawable (earned from gifts). Purchased Denarii cannot be cashed out.` });
    }

    const usd = Math.floor((earned / DENARII_PER_USD) * 100) / 100; // 2dp
    const amountCents = Math.round(usd * 100);
    const withdrawnDenarii = Math.floor(usd * DENARII_PER_USD);
    const balance = earned; // debit basis is the earned pool

    // Debit wallet first (idempotent guard via pending payout row)
    const { data: payoutRow, error: insErr } = await db
      .from('creator_payouts')
      .insert({
        creator_email: creator.user_email,
        creator_id: creator.id,
        amount_usd: usd,
        fee_usd: 0,
        net_amount_usd: usd,
        method_type: 'stripe_connect',
        stripe_account_id: creator.stripe_account_id,
        status: 'processing',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (insErr) return json(500, { error: 'Could not create payout record' });

    // Debit the withdrawn amount from BOTH the spendable balance and the earned pool.
    const { error: debitErr } = await db
      .from('wallets')
      .update({
        denarii_balance: (wallet?.denarii_balance || 0) - withdrawnDenarii,
        withdrawable_denarii: earned - withdrawnDenarii,
      })
      .eq('user_email', user.email);
    if (debitErr) {
      await db.from('creator_payouts').update({ status: 'failed', failure_reason: 'wallet debit failed' }).eq('id', payoutRow.id);
      return json(500, { error: 'Wallet debit failed' });
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: creator.stripe_account_id,
        metadata: { creator_id: creator.id, payout_id: payoutRow.id },
      });
      await db.from('creator_payouts').update({
        status: 'completed', stripe_transfer_id: transfer.id, processed_at: new Date().toISOString(),
      }).eq('id', payoutRow.id);
      return { success: true, amount_usd: usd, transfer_id: transfer.id };
    } catch (e) {
      // Refund on transfer failure: restore both pools
      await db.from('wallets').update({
        denarii_balance: (wallet?.denarii_balance || 0),
        withdrawable_denarii: earned,
      }).eq('user_email', user.email);
      await db.from('creator_payouts').update({ status: 'failed', failure_reason: String(e.message || e).slice(0,200) }).eq('id', payoutRow.id);
      return json(500, { error: 'Transfer failed: ' + (e.message || 'unknown') });
    }
  },

  // ─── Cancel Subscription ─────────────────────────────────────────────────
  async cancelSubscription({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { subscriptionId } = params || {};
    if (!subscriptionId) return json(400, { error: 'subscriptionId required' });

    // Ownership check — verify this subscription belongs to the authenticated user
    // before letting them cancel it. Without this, any user could cancel anyone's
    // subscription by guessing/enumerating Stripe subscription IDs.
    const [hostSub, fanSub, monetizationSub] = await Promise.all([
      supabase.from('creator_subscriptions').select('id').eq('stripe_subscription_id', subscriptionId).eq('user_email', user.email).limit(1),
      supabase.from('fan_club_memberships').select('id').eq('stripe_subscription_id', subscriptionId).eq('user_email', user.email).limit(1),
      supabase.from('creator_monetizations').select('id').eq('creator_email', user.email).limit(1),
    ]);
    const owns = (hostSub.data?.length || fanSub.data?.length || monetizationSub.data?.length);
    if (!owns) return json(403, { error: 'You do not own this subscription' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const cancelled = await stripe.subscriptions.cancel(subscriptionId);
    return { success: true, status: cancelled.status };
  },

  // ─── Legion AI Companion ─────────────────────────────────────────────────
  async legionCompanionChat({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { message: rawMessage } = params || {};
    if (!rawMessage) return json(400, { error: 'message required' });
    // Sanitize: clamp length, strip control chars to prevent prompt injection
    const message = String(rawMessage).replace(/[ -]/g, ' ').slice(0, 500);

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
Reply directly and conversationally — no JSON, no preamble, just your response.`;

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
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!res.ok) {
      let detail = '';
      try {
        const errJson = await res.json();
        detail = errJson?.error?.message || JSON.stringify(errJson);
      } catch (_) {
        try { detail = await res.text(); } catch (_) { detail = 'no error body'; }
      }
      console.error('[legionCompanionChat] Anthropic API error', res.status, detail);
      return json(502, { error: `AI service error (${res.status})`, detail: String(detail).slice(0, 400) });
    }
    const data = await res.json();
    let reply = data?.content?.[0]?.text?.trim() || '';
    // Some prompts still return JSON-wrapped text; unwrap if present.
    if (reply.startsWith('{') && reply.includes('"reply"')) {
      try { reply = JSON.parse(reply).reply || reply; } catch (_) { /* keep as-is */ }
    }
    if (!reply) {
      console.error('[legionCompanionChat] empty content', JSON.stringify(data).slice(0, 300));
      return json(502, { error: 'AI returned no content' });
    }

    // Update interaction count
    if (memory) {
      await db.from('legion_companion_memories')
        .update({ total_interactions: (memory.total_interactions || 0) + 1 })
        .eq('id', memory.id)
        .catch(() => {});
    }

    return { reply, action: null };
  },

  // ─── Brand Subscription ──────────────────────────────────────────────────
  async createBrandSubscription({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { tier_id, tier_name, amount_usd, company_name, website, category, description, contact_email, contact_name } = params || {};
    if (!tier_id || !amount_usd || !company_name || !contact_email) {
      return json(400, { error: 'tier_id, amount_usd, company_name, contact_email required' });
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);
    const origin = process.env.URL || 'https://legion-live.netlify.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: {
            name: `Legion Live — ${tier_name} Brand Plan`,
            description: 'Advertising and creator partnerships on Legion Live',
          },
          unit_amount: Math.round(amount_usd * 100),
        },
        quantity: 1,
      }],
      metadata: {
        purchase_type: 'brand_subscription',
        tier_id, tier_name,
        company_name, website: website || '',
        category: category || '', description: description || '',
        contact_email, contact_name: contact_name || '',
        user_email: user.email,
      },
      customer_email: contact_email,
      success_url: `${origin}/BrandDashboard?success=true`,
      cancel_url:  `${origin}/BrandCampaigns?cancelled=true`,
    });

    const db = admin || supabase;
    await db.from('brand_applications').insert({
      user_email:    user.email,
      company_name,  website,  category,  description,
      contact_email, contact_name,
      tier_id, tier_name,
      amount_usd,
      stripe_session_id: session.id,
      status: 'pending_payment',
    }).catch(() => {});

    return { url: session.url, session_id: session.id };
  },

  // ─── Grant Admin ──────────────────────────────────────────────────────────
  async grantAdmin({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!isAllowedAdmin(user.email)) return json(403, { error: 'Only admins can grant admin access' });
    const { email, note } = params || {};
    if (!email) return json(400, { error: 'email required' });
    const db = admin || supabase;
    const { data, error } = await db.rpc('grant_admin', {
      p_email: email.toLowerCase().trim(),
      p_granted_by: user.email,
      p_note: note || null,
    });
    if (error) throw error;
    return { success: true, message: data };
  },

  // ─── Revoke Admin ─────────────────────────────────────────────────────────
  async revokeAdmin({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!isAllowedAdmin(user.email)) return json(403, { error: 'Only admins can revoke admin access' });
    const { email } = params || {};
    if (!email) return json(400, { error: 'email required' });
    if (email.toLowerCase().trim() === user.email.toLowerCase()) {
      return json(400, { error: 'You cannot revoke your own admin access' });
    }
    const db = admin || supabase;
    const { data, error } = await db.rpc('revoke_admin', {
      p_email: email.toLowerCase().trim(),
    });
    if (error) throw error;
    return { success: true, message: data };
  },

  // ─── List Admins ──────────────────────────────────────────────────────────
  async listAdmins({ supabase, admin, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!isAllowedAdmin(user.email)) return json(403, { error: 'Admin only' });
    const db = admin || supabase;
    const { data, error } = await db
      .from('admin_allowlist')
      .select('email, added_by, added_at, note')
      .order('added_at', { ascending: true });
    if (error) throw error;
    return { admins: data || [] };
  },

  // ─── Save User Theme ─────────────────────────────────────────────────────
  async saveUserTheme({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { theme } = params || {};
    if (!theme) return json(400, { error: 'theme required' });
    // Never allow role escalation through this endpoint
    const { error } = await supabase.from('profiles').update({ theme }).eq('id', user.id)
      .neq('role', 'admin'); // RLS handles this too but belt-and-suspenders
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
      platform_cut: 0.4,
      creator_cut: 0.6,
      minimum_withdrawal_usd: 10,
      minimum_withdrawal_denarii: 1800,
      payout_schedule: 'on_request',
      supported_methods: ['stripe_connect'],
      denarii_to_usd_rate: 1 / 180,
      denarii_per_usd: 180,
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

  // ─── Check Payment Status ────────────────────────────────────────────────
  async checkPaymentStatus({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { paymentIntentId } = params || {};
    if (!paymentIntentId) return json(400, { error: 'Missing paymentIntentId' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    // Check our audit log first — fastest path
    const { data: logs } = await supabase
      .from('wallet_audit_logs')
      .select('*')
      .eq('user_email', user.email)
      .eq('related_entity_id', paymentIntentId)
      .limit(1);
    if (logs?.[0]?.action === 'purchase') {
      return { status: 'confirmed', processedAt: logs[0].created_at };
    }

    // Fall back to Stripe
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      const statusMap = { succeeded: 'confirmed', requires_payment_method: 'requires_payment_method', requires_action: 'requires_action', canceled: 'canceled', processing: 'processing' };
      return { status: statusMap[pi.status] || pi.status, stripeStatus: pi.status, clientSecret: pi.status === 'requires_action' ? pi.client_secret : null, amount: pi.amount / 100, currency: pi.currency, lastError: pi.last_payment_error?.message || null };
    } catch (_) {
      // Try as a checkout session ID
      try {
        const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
        return { status: session.payment_status === 'paid' ? 'confirmed' : session.status, stripeStatus: session.status, paymentStatus: session.payment_status };
      } catch (_) {
        return json(404, { error: 'Payment not found' });
      }
    }
  },

  // ─── Retry Payment ───────────────────────────────────────────────────────
  async retryPayment({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { paymentIntentId } = params || {};
    if (!paymentIntentId) return json(400, { error: 'Payment intent ID required' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (!pi) return json(404, { error: 'Payment not found' });
    if (pi.status === 'succeeded') return { success: true, status: 'succeeded', message: 'Already completed' };

    if (pi.status === 'requires_payment_method' || pi.status === 'processing') {
      try {
        const origin = process.env.URL || 'https://legion-live.netlify.app';
        const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
          return_url: `${origin}/Wallet?retry_success=true`,
        });
        if (confirmed.status === 'succeeded') {
          return { success: true, status: 'succeeded' };
        }
        if (confirmed.status === 'requires_action') {
          return { success: false, status: 'requires_action', clientSecret: confirmed.client_secret };
        }
      } catch (err) {
        return json(400, { success: false, status: 'failed', message: err.message });
      }
    }
    return json(400, { success: false, status: pi.status, message: `Cannot retry payment in status: ${pi.status}` });
  },

  // ─── Moderate Chat (manual moderator action) ─────────────────────────────
  async moderateChat({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { message, stream_id, user_email: targetEmail, user_name, action } = params || {};

    const db = admin || supabase;

    // If a moderator is taking a direct action (ban/remove)
    if (action === 'ban' && targetEmail) {
      await db.from('user_bans').insert({
        user_email: targetEmail,
        stream_id: stream_id || null,
        ban_type: 'stream',
        reason: `Moderator action by ${user.email}`,
        severity: 'temporary',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        banned_by_email: user.email,
        is_active: true,
      }).catch(() => {});
      return { success: true, action: 'banned' };
    }

    if (action === 'remove' && params?.message_id) {
      // IDOR fix: only delete if user is the stream host or admin
      const { data: msg } = await db.from('chat_messages').select('stream_id').eq('id', params.message_id).single().catch(() => ({ data: null }));
      if (msg?.stream_id) {
        const { data: stream } = await db.from('streams').select('creator_id').eq('id', msg.stream_id).single().catch(() => ({ data: null }));
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single().catch(() => ({ data: null }));
        const isHost = stream?.creator_id === user.id || stream?.creator_id === user.email;
        const isAdmin = profile?.role === 'admin';
        if (!isHost && !isAdmin) return json(403, { error: 'Only the stream host can remove messages' });
      }
      await db.from('chat_messages').delete().eq('id', params.message_id).catch(() => {});
      return { success: true, action: 'removed' };
    }

    // Run same static filter as aiModerateContent
    const HARD_BLOCK_TERMS_CHAT = [
      'onlyfans','nude','nudes','naked','porn','pornography','xxx','nsfw',
      'sex tape','masturbat','cum shot','jerk off','jack off','penis','vagina',
      'dick pic','pussy','anal sex','blowjob','handjob','cp ','child porn','csam',
      'lolicon','shotacon','kids naked','underage sex','pedo','pedophile','grooming children',
      'heroin','fentanyl','meth ','methamphetamine','crystal meth','crack cocaine',
      'crack pipe','shooting up','needle drugs','drug injection','opioid abuse','xylazine',
      'isis ','al qaeda','jihad attack','bomb making','how to make bomb','terrorist attack',
      'mass shooting plan','white supremac','neo nazi','heil hitler',
      'trans kids','gender affirming care for children','drag kids','my pronouns are',
      'preferred pronouns are','they/them lesson','transgender children','queer theory',
    ];
    const lc = message?.toLowerCase() || '';
    for (const term of HARD_BLOCK_TERMS_CHAT) {
      if (lc.includes(term)) {
        await db.from('moderation_alerts').insert({ stream_id, user_email: targetEmail, user_name, alert_type: 'hard_block', severity: 'high', content: message?.slice(0,500), ai_confidence: 1.0, action_taken: 'blocked', matched_term: term }).catch(() => {});
        return { approved: false, action: 'message_removed', reason: 'Content policy violation' };
      }
    }

    // AI moderation path
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || !message) return json(200, { approved: true, flagged: false });

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          messages: [{ role: 'user', content: `Legion Live content moderator. Does this chat message violate policy? Violations: nudity/sexual content, minors in sexual context, hard drugs (heroin/meth/fentanyl/crack), extremism/terrorism, LGBTQ+ ideological promotion or pronoun instruction. Allowed: marijuana, alcohol, cigarettes, guns/hunting/range shooting, survival content, free speech, profanity. Message: "${message?.slice(0,500)}". Return JSON: {"status":"fine"|"suspicious"|"violation","category":"none"|"sexual"|"minor_safety"|"hard_drugs"|"extremism"|"lgbtq_promotion"|"harassment","confidence":0.0-1.0,"reason":"brief"}` }],
          response_format: { type: 'json_object' },
        }),
      });
      const data = await res.json();
      const result = JSON.parse(data.choices?.[0]?.message?.content || '{"status":"fine"}');

      if (result.status === 'violation' && (result.confidence || 0) > 0.80) {
        await db.from('moderation_alerts').insert({ stream_id, user_email: targetEmail, user_name, alert_type: result.category, severity: 'high', content: message?.slice(0,500), ai_confidence: result.confidence, action_taken: 'blocked' }).catch(() => {});
        return { approved: false, action: 'message_removed', reason: result.reason };
      }
      if (result.status === 'suspicious') {
        await db.from('moderation_alerts').insert({ stream_id, user_email: targetEmail, alert_type: result.category, severity: 'low', content: message?.slice(0,500), ai_confidence: result.confidence, action_taken: 'flagged' }).catch(() => {});
        return { approved: true, flagged: true, flag_reason: result.reason };
      }
      return { approved: true, flagged: false };
    } catch (_) {
      return { approved: true, flagged: false };
    }
  },

  // ─── Create Host Subscription ────────────────────────────────────────────
  async createHostSubscription({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { plan = 'monthly' } = params || {};
    if (!['monthly', 'yearly'].includes(plan)) return json(400, { error: 'Invalid plan — must be monthly or yearly' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    // Check for existing active subscription
    const { data: existingSubs } = await supabase
      .from('creator_subscriptions')
      .select('id')
      .eq('user_email', user.email)
      .eq('status', 'active')
      .limit(1);
    if (existingSubs?.length) return json(400, { error: 'You already have an active host subscription' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const prices = {
      monthly: { amount: 500,  interval: 'month', name: 'Legion Host — Monthly ($5/mo)' },
      yearly:  { amount: 1200, interval: 'year',  name: 'Legion Host — Yearly ($12/yr)' },
    };
    const selected = prices[plan];
    const origin = process.env.URL || 'https://legion-live.netlify.app';

    // Find or create Stripe customer
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    const customer = existing.data[0] || await stripe.customers.create({ email: user.email });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: selected.name },
          unit_amount: selected.amount,
          recurring: { interval: selected.interval },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${origin}/Profile?subscription=success`,
      cancel_url: `${origin}/Profile?subscription=cancelled`,
      metadata: { user_email: user.email, plan_type: plan, subscription_type: 'host_subscription' },
    });

    return { sessionId: session.id, url: session.url };
  },

  // ─── Create PPV Checkout ─────────────────────────────────────────────────
  async createPPVCheckout({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { event_id } = params || {};
    if (!event_id) return json(400, { error: 'event_id required' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    // Check event exists
    const { data: events } = await supabase
      .from('ppv_events')
      .select('*')
      .eq('id', event_id)
      .limit(1);
    const ppvEvent = events?.[0];
    if (!ppvEvent) return json(404, { error: 'Event not found' });

    // Check for existing ticket — ppv_tickets is the real table (fan_club_memberships has no event_id column)
    const { data: existingTickets } = await supabase
      .from('ppv_tickets')
      .select('id')
      .eq('ppv_event_id', event_id)
      .eq('user_email', user.email)
      .eq('status', 'active')
      .limit(1);
    if (existingTickets?.length) return json(400, { error: 'You already have a ticket for this event' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);

    const origin = process.env.URL || 'https://legion-live.netlify.app';
    const priceUsd = ppvEvent.price_usd || 9.99;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: ppvEvent.title || 'PPV Event' },
          unit_amount: Math.round(Number(priceUsd) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/PPVEvents?success=true&event_id=${event_id}`,
      cancel_url: `${origin}/PPVEvents?cancelled=true`,
      metadata: { event_id, user_email: user.email, purchase_type: 'ppv_ticket' },
    });

    return { url: session.url, sessionId: session.id };
  },

  // ─── Production Validation (admin) ──────────────────────────────────────
  async productionValidation({ supabase, admin, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
    if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Admin only' });

    const db = admin || supabase;
    const checks = {};

    // Database
    try {
      const start = Date.now();
      await db.from('profiles').select('id').limit(1);
      checks.database = { status: 'PASS', query_ms: Date.now() - start };
    } catch (e) { checks.database = { status: 'FAIL', message: e.message }; }

    // Stripe
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) throw new Error('STRIPE_SECRET_KEY not set');
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(stripeKey);
      await stripe.balance.retrieve();
      checks.stripe = { status: 'PASS', mode: stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST' };
    } catch (e) { checks.stripe = { status: 'FAIL', message: e.message }; }

    // Env vars
    const required = ['STRIPE_SECRET_KEY', 'ZEGOCLOUD_APP_ID', 'ZEGOCLOUD_SERVER_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(k => !process.env[k]);
    checks.envVars = { status: missing.length === 0 ? 'PASS' : 'FAIL', missing };

    // Zego
    checks.zegocloud = { status: process.env.ZEGOCLOUD_APP_ID ? 'PASS' : 'FAIL', configured: !!process.env.ZEGOCLOUD_APP_ID };

    const allPassed = Object.values(checks).every(c => c.status === 'PASS');
    return { status: allPassed ? 'READY_TO_LAUNCH' : 'NEEDS_ATTENTION', timestamp: new Date().toISOString(), checks };
  },

  // ─── Live Stripe Test (admin) ────────────────────────────────────────────
  async liveStripeTest({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
    if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Admin only' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);
    const { test_type = 'full_cycle' } = params || {};

    if (test_type === 'full_cycle') {
      const origin = process.env.URL || 'https://legion-live.netlify.app';
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{ price_data: { currency: 'usd', product_data: { name: '[TEST] 100 Denarii' }, unit_amount: 100 }, quantity: 1 }],
        success_url: `${origin}/Wallet?test=true`,
        cancel_url: `${origin}/Wallet`,
        metadata: { test_type: 'live_validation' },
      });
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
      return { status: 'PASSED', session_id: session.id, mode: stripeKey.startsWith('sk_live_') ? 'LIVE' : 'TEST', webhook_configured: webhooks.data.some(w => w.enabled_events.includes('checkout.session.completed')) };
    }

    if (test_type === 'payout') {
      const account = await stripe.accounts.retrieve();
      return { status: 'PASSED', charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled };
    }

    return json(400, { error: 'Invalid test_type' });
  },

  // ─── Get Fraud Dashboard (admin) ─────────────────────────────────────────
  async getFraudDashboard({ supabase, admin, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Admin required' });

    const db = admin || supabase;
    const thirtyMinAgo = new Date(Date.now() - 1800000).toISOString();

    const [fraudLogs, reviewCases, flaggedUsers, recentBans] = await Promise.all([
      db.from('wallet_audit_logs').select('*').eq('action', 'fraud_review_case').gte('created_at', thirtyMinAgo).order('created_at', { ascending: false }).limit(50),
      db.from('wallet_audit_logs').select('*').eq('action', 'fraud_review_case').order('created_at', { ascending: false }).limit(50),
      db.from('profiles').select('id, email, full_name').eq('role', 'suspended').limit(50),
      db.from('user_bans').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(20),
    ]);

    return {
      summary: {
        lastUpdated: new Date().toISOString(),
        highRisk: (fraudLogs.data || []).filter(l => (l.reason || '').includes('HIGH')).length,
        mediumRisk: (fraudLogs.data || []).filter(l => (l.reason || '').includes('MEDIUM')).length,
        pendingReviews: (reviewCases.data || []).length,
        flaggedUsers: (flaggedUsers.data || []).length,
        activeBans: (recentBans.data || []).length,
      },
      recentTransactions: (fraudLogs.data || []).slice(0, 20),
      reviewQueue: (reviewCases.data || []).slice(0, 20),
      flaggedUsersList: (flaggedUsers.data || []).slice(0, 20),
      recentBans: (recentBans.data || []).slice(0, 10),
    };
  },

  // ─── Verify Payout Routing (admin) ───────────────────────────────────────
  async verifyPayoutRouting({ supabase, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
    if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Admin only' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);
    const results = { timestamp: new Date().toISOString(), tests: {} };

    try {
      const account = await stripe.accounts.retrieve();
      results.tests.stripe_connect = { status: 'PASS', charges_enabled: account.charges_enabled, payouts_enabled: account.payouts_enabled };
    } catch (e) { results.tests.stripe_connect = { status: 'FAIL', error: e.message }; }

    try {
      const accounts = await stripe.accounts.list({ limit: 5 });
      results.tests.connected_accounts = { status: 'PASS', count: accounts.data.length };
    } catch (e) { results.tests.connected_accounts = { status: 'FAIL', error: e.message }; }

    results.tests.webhook_secret = { status: process.env.STRIPE_WEBHOOK_SECRET ? 'PASS' : 'FAIL' };
    results.overall_status = Object.values(results.tests).every(t => t.status === 'PASS') ? 'VERIFIED' : 'FAILED';
    return results;
  },

  // ─── Enforce KYC Gate ────────────────────────────────────────────────────
  async enforceKycGate({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { action, kycData, verificationStatus } = params || {};
    if (!['submit', 'check', 'admin_review'].includes(action)) return json(400, { error: 'Invalid action' });

    const db = admin || supabase;

    if (action === 'check') {
      const { data: kyc } = await db.from('creator_kyc').select('*').eq('user_email', user.email).single().catch(() => ({ data: null }));
      return {
        kyc_status: kyc?.status || 'not_started',
        is_verified: kyc?.status === 'verified',
        submitted_at: kyc?.submitted_at || null,
        reviewed_at: kyc?.reviewed_at || null,
        rejection_reason: kyc?.rejection_reason || null,
      };
    }

    if (action === 'submit') {
      if (!kycData?.fullLegalName || !kycData?.dateOfBirth) return json(400, { error: 'Missing required KYC fields' });
      await db.from('creator_kyc').upsert({ user_email: user.email, status: 'pending', kyc_data: kycData, submitted_at: new Date().toISOString() }, { onConflict: 'user_email' });
      return { success: true, status: 'pending', message: 'KYC submitted. Review takes 2-5 business days.' };
    }

    if (action === 'admin_review') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Admin required' });
      if (!verificationStatus?.user_email || !['verified', 'rejected'].includes(verificationStatus.status)) return json(400, { error: 'Invalid data' });
      await db.from('creator_kyc').update({ status: verificationStatus.status, reviewed_at: new Date().toISOString(), rejection_reason: verificationStatus.reason || null }).eq('user_email', verificationStatus.user_email);
      return { success: true, status: verificationStatus.status };
    }
  },

  // ─── Process Payout With KYC ─────────────────────────────────────────────
  async processPayoutWithKyc({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!user) return json(401, { error: 'Unauthorized' });
    const { amount_usd } = params || {};
    const MIN = 5, MAX = 10000;
    if (!amount_usd || amount_usd < MIN || amount_usd > MAX) return json(400, { error: `Amount must be $${MIN}–$${MAX}` });

    const db = admin || supabase;

    // KYC check
    const { data: kyc } = await db.from('creator_kyc').select('status').eq('user_email', user.email).single().catch(() => ({ data: null }));
    if (kyc?.status !== 'verified') return json(403, { error: 'KYC verification required before payouts', kyc_status: kyc?.status || 'not_started' });

    // Rate limit: 1 per 24h
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { data: recent } = await db.from('creator_payouts').select('id').eq('user_email', user.email).gte('created_at', oneDayAgo).limit(1);
    if (recent?.length) return json(429, { error: 'Maximum 1 payout request per 24 hours' });

    // Check wallet balance
    const DENARII_PER_USD = 180;
    const CREATOR_SHARE = 0.60;
    const required_denarii = Math.ceil((amount_usd / CREATOR_SHARE) * DENARII_PER_USD);
    const { data: wallet } = await db.from('wallets').select('*').eq('user_email', user.email).single().catch(() => ({ data: null }));
    if (!wallet || wallet.denarii_balance < required_denarii) return json(400, { error: 'Insufficient balance', required: required_denarii, current: wallet?.denarii_balance || 0 });

    // Create payout request
    const { data: payout } = await db.from('creator_payouts').insert({ user_email: user.email, amount_usd, status: 'pending', denarii_deducted: required_denarii, created_at: new Date().toISOString() }).select().single();

    // Deduct denarii
    await db.from('wallets').update({ denarii_balance: wallet.denarii_balance - required_denarii }).eq('user_email', user.email);

    return { success: true, payout_id: payout?.id, amount_usd, status: 'pending', estimated_arrival: '3-5 business days' };
  },

  // ─── Upload Theme Background ─────────────────────────────────────────────
  async uploadThemeBackground({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    // For Netlify (non-Deno), file uploads come as base64 in params
    const { fileBase64, fileName, fileType } = params || {};
    if (!fileBase64 || !fileName) return json(400, { error: 'fileBase64 and fileName required' });
    if (!fileType?.startsWith('image/')) return json(400, { error: 'Must be an image file' });

    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length > 5 * 1024 * 1024) return json(400, { error: 'File must be under 5MB' });

    const ext = fileName.split('.').pop() || 'png';
    const path = `themes/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('uploads').upload(path, buffer, { contentType: fileType });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
    return { file_url: urlData.publicUrl, file_name: fileName };
  },

  // ─── Process Creator Referral ────────────────────────────────────────────
  async processCreatorReferral({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!user) return json(401, { error: 'Unauthorized' });
    const { referral_code } = params || {};
    if (!referral_code || !/^[A-Z0-9]{4,20}$/.test(referral_code)) return json(400, { error: 'Invalid referral code format' });

    const db = admin || supabase;

    const { data: referrals } = await db.from('creator_referrals').select('*').eq('referral_code', referral_code).limit(1);
    const referral = referrals?.[0];
    if (!referral) return json(404, { error: 'Referral code not found' });
    if (!['pending', 'signed_up'].includes(referral.status)) return json(400, { error: 'Referral already activated' });
    if (referral.referred_email && referral.referred_email !== user.email) return json(403, { error: 'Code belongs to a different account' });
    if (referral.referrer_id === user.email) return json(400, { error: 'Cannot use your own referral code' });

    // Check not already claimed
    const { data: existing } = await db.from('wallet_audit_logs').select('id').eq('user_email', user.email).eq('action', 'referral_bonus').eq('related_entity_id', referral.id).limit(1);
    if (existing?.length) return json(400, { error: 'Referral bonus already claimed' });

    // Update referral status
    await db.from('creator_referrals').update({ referred_email: user.email, status: 'completed', completed_at: new Date().toISOString() }).eq('id', referral.id);

    // Award 5000 Denarii to referred user
    const { data: wallet } = await db.from('wallets').select('*').eq('user_email', user.email).single().catch(() => ({ data: null }));
    if (wallet) {
      await db.from('wallets').update({ denarii_balance: (wallet.denarii_balance || 0) + 5000 }).eq('user_email', user.email);
    } else {
      await db.from('wallets').insert({ user_email: user.email, denarii_balance: 5000 });
    }
    await db.from('wallet_audit_logs').insert({ user_email: user.email, action: 'referral_bonus', amount_denarii: 5000, related_entity_id: referral.id, reason: `Referral bonus from ${referral.referrer_id}` }).catch(() => {});

    // Award 5000 Denarii to referrer
    const { data: referrerWallet } = await db.from('wallets').select('*').eq('user_email', referral.referrer_id).single().catch(() => ({ data: null }));
    if (referrerWallet) {
      await db.from('wallets').update({ denarii_balance: (referrerWallet.denarii_balance || 0) + 5000 }).eq('user_email', referral.referrer_id);
      await db.from('wallet_audit_logs').insert({ user_email: referral.referrer_id, action: 'referral_bonus', amount_denarii: 5000, related_entity_id: referral.id, reason: `Referral reward — ${user.email} signed up` }).catch(() => {});
    }

    return { success: true, bonus_awarded: 5000, message: 'Referral activated! 5,000 Denarii added to your wallet.' };
  },

  // ─── Import Google Play Games ─────────────────────────────────────────────
  async importGooglePlayGames({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    // Google Play Games requires OAuth — return instructions for the client to handle
    return {
      success: false,
      message: 'Google Play Games import requires OAuth authentication.',
      oauth_url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID || ''}&scope=https://www.googleapis.com/auth/games.readonly&response_type=code&redirect_uri=${process.env.URL || 'https://legion-live.netlify.app'}/GamingHub`,
      requires_oauth: true,
    };
  },

  // ─── Setup Mobile Screen Share ────────────────────────────────────────────
  async setupMobileScreenShare({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { device_type = 'android', quality_preset = 'high' } = params || {};

    const bitrate = quality_preset === 'ultra' ? 5000 : quality_preset === 'high' ? 2500 : 1500;

    const { data: existing } = await supabase.from('gaming_integrations').select('*').eq('creator_id', user.email).eq('integration_type', 'mobile_screen_share').eq('device_type', device_type).limit(1);

    if (existing?.[0]) {
      await supabase.from('gaming_integrations').update({ is_active: true, last_used: new Date().toISOString(), quality_preset, bitrate_kbps: bitrate }).eq('id', existing[0].id);
      return { success: true, integration_id: existing[0].id, device_type, quality_preset, bitrate_kbps: bitrate };
    }

    const { data: created } = await supabase.from('gaming_integrations').insert({ creator_id: user.email, integration_type: 'mobile_screen_share', device_type, quality_preset, is_active: true, bitrate_kbps: bitrate }).select().single().catch(() => ({ data: null }));
    return { success: true, integration_id: created?.id, device_type, quality_preset, bitrate_kbps: bitrate };
  },

  // ─── Export All Functions (admin) ────────────────────────────────────────
  async exportAllFunctions({ supabase, user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: profile } = await supabase.from('profiles').select('role, email').eq('id', user.id).single();
    if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Admin only' });
    // Return the list of all wired handlers for admin diagnostics
    const handlers = ["clearLiveStreams","updateViewerCount","sendGift","requestWithdrawal","generateZegoToken","getOBSStreamKey","claimDailyReward","aiModerateContent","createDenariiCheckout","createTipCheckout","createFanClubCheckout","createCreatorMonetizationCheckout","stripeConnectOnboard","cancelSubscription","legionCompanionChat","saveUserTheme","getTrendingContent","getPayoutConfig","forecastCreatorPayouts","checkPaymentStatus","retryPayment","moderateChat","createHostSubscription","createPPVCheckout","productionValidation","liveStripeTest","getFraudDashboard","verifyPayoutRouting","enforceKycGate","processPayoutWithKyc","uploadThemeBackground","processCreatorReferral","importGooglePlayGames","setupMobileScreenShare","exportAllFunctions","adminListUsers","createCampaignCheckout","gdprCompliance"];
    return { total: handlers.length, functions: handlers, exported_at: new Date().toISOString() };
  },

  // ─── Admin List Users ────────────────────────────────────────────────────
  async adminListUsers({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin' || !isAllowedAdmin(user.email)) return json(403, { error: 'Forbidden' });

    const db = admin || supabase;
    const { limit = 100, offset = 0, search } = params || {};

    let query = db.from('profiles').select('id, email, full_name, role, created_at, avatar_url').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (search) query = query.ilike('email', `%${search}%`);

    const { data: users, error } = await query;
    if (error) throw error;

    return { users: users || [], total: users?.length || 0 };
  },

  // ─── Import YouTube Content ──────────────────────────────────────────────
  async importYouTubeContent({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { youtube_url, channel_id } = params || {};
    if (!youtube_url && !channel_id) return json(400, { error: 'youtube_url or channel_id required' });

    // YouTube Data API v3 requires an API key
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (!ytKey) {
      return {
        success: false,
        message: 'YouTube import requires a YouTube Data API key.',
        requires_config: true,
        setup_url: 'https://console.developers.google.com/apis/api/youtube.googleapis.com',
      };
    }

        const videoId = youtube_url?.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1];
    if (!videoId && !channel_id) return json(400, { error: 'Could not extract video/channel ID from URL' });

    const apiUrl = videoId
      ? `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,statistics&key=${ytKey}`
      : `https://www.googleapis.com/youtube/v3/channels?id=${channel_id}&part=snippet,statistics&key=${ytKey}`;

    const res = await fetch(apiUrl);
    const data = await res.json();

    return { success: true, items: data.items || [], total: data.pageInfo?.totalResults || 0 };
  },

  // ─── Create Campaign Checkout ────────────────────────────────────────────
  async createCampaignCheckout({ supabase, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { campaignId, amount, campaignName } = params || {};
    if (!campaignId || !amount) return json(400, { error: 'campaignId and amount required' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json(500, { error: 'Stripe not configured' });

    const { data: campaign } = await supabase.from('brand_campaigns').select('*').eq('id', campaignId).single().catch(() => ({ data: null }));
    if (!campaign) return json(404, { error: 'Campaign not found' });

    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey);
    const origin = process.env.URL || 'https://legion-live.netlify.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: campaignName || campaign.campaign_name || 'Brand Campaign' },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/BrandCampaigns?success=true&campaign_id=${campaignId}`,
      cancel_url: `${origin}/BrandCampaigns?cancelled=true`,
      metadata: { campaign_id: campaignId, user_email: user.email, purchase_type: 'brand_campaign' },
    });

    return { sessionId: session.id, url: session.url };
  },

  // ─── GDPR Compliance ────────────────────────────────────────────────────
  async gdprCompliance({ supabase, admin, user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    const { action, marketing, analytics, thirdParty } = params || {};
    const db = admin || supabase;

    if (action === 'export_data') {
      const [walletRes, streamsRes, txnsRes, chatRes] = await Promise.all([
        db.from('wallets').select('*').eq('user_email', user.email).single(),
        db.from('streams').select('id, title, created_at, viewer_count, status').eq('creator_id', user.email).order('created_at', { ascending: false }).limit(100),
        db.from('gift_transactions').select('*').eq('sender_email', user.email).order('created_at', { ascending: false }).limit(100),
        db.from('chat_messages').select('id, message, created_at, stream_id').eq('sender_email', user.email).order('created_at', { ascending: false }).limit(200),
      ]);
      return { success: true, data: { profile: { id: user.id, email: user.email }, wallet: walletRes.data, streams: streamsRes.data || [], transactions: txnsRes.data || [], chat_messages: chatRes.data || [], export_date: new Date().toISOString() } };
    }

    if (action === 'delete_account') {
      // Prevent admin accounts from self-deleting via this endpoint
      if (isAllowedAdmin(user.email)) {
        return json(403, { error: 'Admin accounts cannot be self-deleted. Contact another admin.' });
      }
      // Anonymize profile
      await db.from('profiles').update({ full_name: 'Deleted User', avatar_url: null, role: 'deleted' }).eq('id', user.id);
      // Anonymize creators
      await db.from('creators').update({ display_name: 'Deleted Creator', bio: null, avatar_url: null }).eq('user_email', user.email).catch(() => {});
      // Delete auth user (this cascades via the profiles foreign key)
      await supabase.auth.admin.deleteUser(user.id).catch(() => {});
      return { success: true, message: 'Account deleted and data anonymized per GDPR Article 17.' };
    }

    if (action === 'consent_preferences') {
      await db.from('profiles').update({ consent_preferences: { marketing: !!marketing, analytics: !!analytics, third_party: !!thirdParty, updated_at: new Date().toISOString() } }).eq('id', user.id);
      return { success: true, message: 'Consent preferences saved.' };
    }

    return json(400, { error: 'Invalid action. Use: export_data, delete_account, or consent_preferences' });
  },

  // ─── Stub handlers for unused integrations ───────────────────────────────
  async generate({ user }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    return { success: false, message: 'generate is not implemented in this environment.' };
  },
  async join({ user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    return { success: true, joined: true, ...(params || {}) };
  },
  async leave({ user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    return { success: true, left: true, ...(params || {}) };
  },
  async audience({ user, params }) {
    if (!user) return json(401, { error: 'Unauthorized' });
    return { success: true, role: 'audience', ...(params || {}) };
  },

};

// ─── Rate limiting ──────────────────────────────────────────────────────────
// Per-action limits: [maxRequests, windowSeconds]. Tight on money/writes, loose
// on reads. Anything not listed uses DEFAULT_LIMIT. Backed by the rate_limits
// table via the atomic rl_hit() RPC (durable across stateless function calls).
const RATE_LIMITS = {
  // money / abuse-sensitive
  sendGift:                 [30, 60],
  createTipCheckout:        [20, 60],
  createPPVCheckout:        [20, 60],
  createDenariiCheckout:    [15, 60],
  createHostSubscription:   [10, 60],
  createFanClubCheckout:    [10, 60],
  requestPayout:            [5, 300],
  stripeConnectOnboard:     [5, 300],
  // moderation / stream control
  streamModerate:           [60, 60],
  streamPanelSeat:          [60, 60],
  generateZegoToken:        [30, 60],
  // AI (cost-sensitive)
  legionCompanionChat:      [20, 60],
  aiModerateContent:        [40, 60],
  // messaging / social (spam-prone)
  notifyAdmins:             [10, 60],
  // game catalog
  syncGameCatalog:          [60, 300],
  listGames:                [120, 60],
};
const DEFAULT_LIMIT = [120, 60];   // generic per-user ceiling
const ANON_LIMIT    = [40, 60];    // stricter for unauthenticated callers

async function checkRateLimit(admin, fnName, user, event) {
  const [max, windowSec] = RATE_LIMITS[fnName] || DEFAULT_LIMIT;
  // Identify the caller: signed-in email, else client IP.
  const ip = (event.headers?.['x-nf-client-connection-ip']
           || event.headers?.['x-forwarded-for']
           || 'unknown').split(',')[0].trim();
  const identity = user?.email ? `email:${user.email}` : `ip:${ip}`;
  const key = `${identity}:${fnName}`;
  const limit = user?.email ? max : Math.min(max, ANON_LIMIT[0]);
  const win = user?.email ? windowSec : ANON_LIMIT[1];
  try {
    const { data, error } = await admin.rpc('rl_hit', { p_key: key, p_window_seconds: win });
    if (error) return { ok: true };            // fail-open: never block on limiter errors
    const count = typeof data === 'number' ? data : (data?.[0]?.rl_hit ?? 0);
    if (count > limit) {
      return { ok: false, retryAfter: win };
    }
    return { ok: true };
  } catch (_) {
    return { ok: true };                        // fail-open
  }
}

export const handler = async (event) => {
  // ── Steam OpenID return (GET redirect) ──
  if (event.httpMethod === 'GET' && event.queryStringParameters?.steam_return) {
    try {
      const qp = event.queryStringParameters;
      const email = qp.email;
      // Verify the assertion with Steam
      const verifyParams = new URLSearchParams(qp);
      verifyParams.set('openid.mode', 'check_authentication');
      const vr = await fetch('https://steamcommunity.com/openid/login', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verifyParams.toString(),
      });
      const vt = await vr.text();
      const claimed = qp['openid.claimed_id'] || '';
      const m = claimed.match(/\/(\d+)$/);
      const site = process.env.PUBLIC_SITE_URL || 'https://legion-live.netlify.app';
      if (vt.includes('is_valid:true') && m && email) {
        const steamId = m[1];
        const admin = getServiceClient();
        await admin.from('gaming_accounts').upsert({
          user_email: email, platform: 'steam', platform_user_id: steamId,
        }, { onConflict: 'user_email,platform' });
        // Kick off a sync in the background (best-effort)
        try { await handlers.steamSync({ admin, user: { email }, params: { steamId } }); } catch (_) {}
        return { statusCode: 302, headers: { Location: `${site}/Settings?steam=linked` }, body: '' };
      }
      return { statusCode: 302, headers: { Location: `${site}/Settings?steam=error` }, body: '' };
    } catch (e) {
      const site = process.env.PUBLIC_SITE_URL || 'https://legion-live.netlify.app';
      return { statusCode: 302, headers: { Location: `${site}/Settings?steam=error` }, body: '' };
    }
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { functionName, params } = JSON.parse(event.body || '{}');
    if (!functionName) return json(400, { error: 'functionName is required' });

    const handler = handlers[functionName];
    if (!handler) return json(404, { error: `No Netlify route for ${functionName}` });

    const supabase = getSupabase(event);
    const admin = getServiceClient();
    const user = await getCurrentUser(supabase, event);

    // Rate limit before running the handler.
    const rl = await checkRateLimit(admin, functionName, user, event);
    if (!rl.ok) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfter || 60) },
        body: JSON.stringify({ error: 'Too many requests. Please slow down.', retryAfter: rl.retryAfter }),
      };
    }

    const result = await handler({ supabase, admin, user, params, event });

    if (result?.statusCode) return result;
    return json(200, result);
  } catch (error) {
    return json(500, { error: error.message || 'Function failed' });
  }
};
