/**
 * legion-zego-callback — receives ZegoCloud's server-side "stream created" /
 * "stream closed" callbacks (configured in the ZegoCloud admin console). This
 * is the AUTHORITATIVE way to know an RTMP/OBS feed is actually flowing,
 * rather than trusting the client to say so.
 *
 * Setup required (one-time, in ZegoCloud's console — not something this code
 * can do): set the callback URL to
 *   https://<your-site>/.netlify/functions/legion-zego-callback
 * for both the "stream created" and "stream closed" events.
 *
 * Until that's configured, confirmStreamLive (in legion-api.mjs, called from
 * the streamer's own client via the Zego SDK's roomStreamUpdate event) is the
 * fallback path — this endpoint is the correct one once wired up.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Not configured' });

  const admin = createClient(supabaseUrl, serviceKey);

  try {
    // Zego sends form-encoded, url-encoded values per their docs.
    const params = new URLSearchParams(event.body || '');
    const eventType = params.get('event');           // e.g. 'publish_start' / 'publish_end'
    const streamAlias = params.get('stream_alias') || params.get('stream_sid');

    if (!streamAlias) return json(200, { ok: true, ignored: 'no stream id' });

    if (eventType === 'publish_start' || eventType === 'stream_start') {
      const { data: stream } = await admin.from('streams')
        .select('id, creator_id, status').eq('id', streamAlias).single();
      if (stream && stream.status !== 'live') {
        await admin.from('streams').update({ status: 'live' }).eq('id', streamAlias);
        if (stream.creator_id) {
          await admin.from('creators').update({ is_live: true }).eq('id', stream.creator_id);
        }
      }
    } else if (eventType === 'publish_end' || eventType === 'stream_end') {
      const { data: stream } = await admin.from('streams')
        .select('id, creator_id').eq('id', streamAlias).single();
      if (stream) {
        await admin.from('streams').update({ status: 'ended' }).eq('id', streamAlias);
        if (stream.creator_id) {
          await admin.from('creators').update({ is_live: false }).eq('id', stream.creator_id);
        }
      }
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error('[zego-callback]', e?.message);
    // Always 200 — Zego will retry on non-2xx, which we don't want for a
    // transient DB hiccup on our side.
    return json(200, { ok: false, error: e?.message });
  }
};
