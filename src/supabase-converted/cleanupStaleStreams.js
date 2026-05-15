/* eslint-disable no-undef */
// ═══ CONVERTED: cleanupStaleStreams ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  const startTime = Date.now();
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token).catch(() => ({ data: { user: null } }));
    if (user !== null) {
      const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
      if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000;
    let cleanedStreams = 0, resetCreators = 0, expiredBans = 0;

    const { data: liveStreams } = await supabase.from('stream').select('*').eq('status', 'live').order('created_date', { ascending: false }).limit(100);
    for (const stream of (liveStreams || [])) {
      const age = now.getTime() - new Date(stream.created_date).getTime();
      if (age > STALE_THRESHOLD_MS) {
        await supabase.from('stream').update({ status: 'ended', duration_minutes: Math.floor(age / 60000), viewer_count: 0 }).eq('id', stream.id);
        await delay(200);
        if (stream.creator_id) {
          await supabase.from('creator').update({ is_live: false, current_stream_id: null }).eq('id', stream.creator_id).catch(() => {});
          await delay(200);
        }
        cleanedStreams++;
      }
    }
    await delay(300);

    const { data: liveCreators } = await supabase.from('creator').select('*').eq('is_live', true).limit(100);
    for (const creator of (liveCreators || [])) {
      const { data: cs } = await supabase.from('stream').select('id').eq('creator_id', creator.id).eq('status', 'live').limit(1);
      await delay(150);
      if (!(cs || []).length) {
        await supabase.from('creator').update({ is_live: false, current_stream_id: null }).eq('id', creator.id);
        resetCreators++;
        await delay(200);
      }
    }
    await delay(300);

    const { data: activeBans } = await supabase.from('user_ban').select('*').eq('is_active', true).limit(100);
    for (const ban of (activeBans || [])) {
      if (ban.expires_at && new Date(ban.expires_at) < now) {
        await supabase.from('user_ban').update({ is_active: false }).eq('id', ban.id);
        expiredBans++;
        await delay(150);
      }
    }

    const { data: endedStreams } = await supabase.from('stream').select('id,viewer_count').eq('status', 'ended').order('updated_date', { ascending: false }).limit(30);
    for (const s of (endedStreams || [])) {
      if (s.viewer_count > 0) { await supabase.from('stream').update({ viewer_count: 0 }).eq('id', s.id); await delay(150); }
    }

    return Response.json({ success: true, cleaned_streams: cleanedStreams, reset_creators: resetCreators, expired_bans: expiredBans, duration_ms: Date.now() - startTime });
  } catch (error) {
    console.error('[cleanup] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});