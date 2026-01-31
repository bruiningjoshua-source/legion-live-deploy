import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stream_id, time_window_minutes = 5 } = await req.json();

    if (!stream_id) {
      return Response.json({ error: 'stream_id required' }, { status: 400 });
    }

    // Fetch stream data
    const streams = await base44.asServiceRole.entities.Stream.filter({ id: stream_id }, null, 1);
    const stream = streams[0];

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Verify ownership
    if (stream.creator_id !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const windowStart = new Date(Date.now() - time_window_minutes * 60 * 1000);

    // Fetch recent activity indicators
    const [recentGifts, recentMessages, hype] = await Promise.all([
      base44.asServiceRole.entities.GiftTransaction.filter({
        stream_id,
        created_date: { $gte: windowStart.toISOString() }
      }),
      base44.asServiceRole.entities.ChatMessage.filter({
        stream_id,
        created_date: { $gte: windowStart.toISOString() }
      }),
      base44.asServiceRole.entities.Hype.filter({ stream_id, is_active: true }, null, 1)
    ]);

    const highlights = [];

    // Detect gift surge
    const giftValue = recentGifts.reduce((sum, g) => sum + (g.denarii_amount || 0), 0);
    if (giftValue > 500) {
      highlights.push({
        type: 'gift_surge',
        excitement_score: Math.min(100, Math.floor(giftValue / 100)),
        description: `${giftValue.toLocaleString()} Denarii in gifts!`,
        timestamp: Date.now()
      });
    }

    // Detect chat spike
    if (recentMessages.length > 50) {
      highlights.push({
        type: 'chat_spike',
        excitement_score: Math.min(100, recentMessages.length),
        description: `${recentMessages.length} messages in ${time_window_minutes} minutes!`,
        timestamp: Date.now()
      });
    }

    // Detect viewer peak
    if (stream.viewer_count > (stream.peak_viewer_count || 0) * 0.9) {
      highlights.push({
        type: 'viewer_peak',
        excitement_score: Math.min(100, Math.floor(stream.viewer_count / 10)),
        description: `Peak viewership: ${stream.viewer_count} viewers!`,
        timestamp: Date.now()
      });
    }

    // Detect hype train
    if (hype[0] && hype[0].current_level >= 3) {
      highlights.push({
        type: 'hype_train',
        excitement_score: hype[0].current_level * 20,
        description: `Hype Train Level ${hype[0].current_level}!`,
        timestamp: Date.now()
      });
    }

    // Create auto-highlights for significant moments
    for (const highlight of highlights) {
      if (highlight.excitement_score >= 60) {
        await base44.asServiceRole.entities.AutoHighlight.create({
          stream_id,
          creator_id: stream.creator_id,
          title: highlight.description,
          highlight_type: highlight.type,
          excitement_score: highlight.excitement_score,
          start_timestamp: Math.floor((Date.now() - time_window_minutes * 60 * 1000) / 1000),
          end_timestamp: Math.floor(Date.now() / 1000),
          duration_seconds: time_window_minutes * 60,
          is_published: false
        });
      }
    }

    return Response.json({
      stream_id,
      highlights,
      metrics: {
        gift_value: giftValue,
        message_count: recentMessages.length,
        viewer_count: stream.viewer_count,
        hype_level: hype[0]?.current_level || 0
      }
    });

  } catch (error) {
    console.error('Highlight detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});