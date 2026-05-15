/* eslint-disable no-undef */
// ═══ CONVERTED: detectHighlights ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stream_id, time_window_minutes = 5 } = await req.json();
    if (!stream_id) return Response.json({ error: 'stream_id required' }, { status: 400 });

    const { data: streams } = await supabase.from('stream').select('*').eq('id', stream_id).limit(1);
    const stream = (streams||[])[0];
    if (!stream) return Response.json({ error: 'Stream not found' }, { status: 404 });
    if (stream.creator_id !== user.email && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const windowStart = new Date(Date.now() - time_window_minutes * 60000).toISOString();
    const [giftsRes, msgsRes, hypeRes] = await Promise.all([
      supabase.from('gift_transaction').select('denarii_amount').eq('stream_id', stream_id).gte('created_date', windowStart),
      supabase.from('chat_message').select('id').eq('stream_id', stream_id).gte('created_date', windowStart),
      supabase.from('hype').select('current_level').eq('stream_id', stream_id).eq('is_active', true).limit(1),
    ]);
    const gifts = giftsRes.data||[]; const msgs = msgsRes.data||[]; const hype = (hypeRes.data||[])[0];
    const giftValue = gifts.reduce((s, g) => s + (g.denarii_amount||0), 0);
    const highlights = [];
    if (giftValue > 500) highlights.push({ type: 'gift_surge', excitement_score: Math.min(100, Math.floor(giftValue / 100)), description: `${giftValue} Denarii in gifts!` });
    if (msgs.length > 50) highlights.push({ type: 'chat_spike', excitement_score: Math.min(100, msgs.length), description: `${msgs.length} messages in ${time_window_minutes} min!` });
    if (hype?.current_level >= 3) highlights.push({ type: 'hype_train', excitement_score: hype.current_level * 20, description: `Hype Level ${hype.current_level}!` });
    for (const h of highlights) {
      if (h.excitement_score >= 60) await supabase.from('auto_highlight').insert({ stream_id, creator_id: stream.creator_id, title: h.description, highlight_type: h.type, excitement_score: h.excitement_score, start_timestamp: Math.floor((Date.now() - time_window_minutes * 60000) / 1000), end_timestamp: Math.floor(Date.now() / 1000), duration_seconds: time_window_minutes * 60, is_published: false }).catch(() => {});
    }
    return Response.json({ stream_id, highlights, metrics: { gift_value: giftValue, message_count: msgs.length, viewer_count: stream.viewer_count, hype_level: hype?.current_level||0 } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});