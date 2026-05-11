import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all creator data in parallel
    const [creators, followers, giftTxns, streams] = await Promise.all([
      base44.entities.Creator.filter({ user_email: user.email }, null, 1),
      base44.entities.Follow.filter({ creator_email: user.email }, '-created_date', 500),
      base44.entities.GiftTransaction.filter({ creator_email: user.email }, '-created_date', 500),
      base44.entities.Stream.filter({ creator_id: user.email, platform_type: 'legion_live' }, '-created_date', 100),
    ]);

    const creator = creators[0] || null;

    // Build audience graph — top gifters
    const gifterMap = {};
    giftTxns.forEach(g => {
      if (!g.sender_email) return;
      if (!gifterMap[g.sender_email]) {
        gifterMap[g.sender_email] = { email: g.sender_email, name: g.sender_name || '', total: 0, count: 0 };
      }
      gifterMap[g.sender_email].total += g.amount_denarii || 0;
      gifterMap[g.sender_email].count++;
    });
    const topGifters = Object.values(gifterMap).sort((a, b) => b.total - a.total).slice(0, 100);

    const exportPayload = {
      exported_at:    new Date().toISOString(),
      creator_email:  user.email,
      display_name:   creator?.display_name,
      follower_count: followers.length,
      total_streams:  streams.length,
      total_earnings: giftTxns.reduce((s, g) => s + (g.amount_denarii || 0), 0),
      followers:      followers.map(f => ({ follower_email: f.follower_email, created_date: f.created_date })),
      top_gifters:    topGifters,
      streams:        streams.map(s => ({ id: s.id, title: s.title, viewer_count: s.viewer_count, status: s.status, created_date: s.created_date })),
      data_format:    'Legion Live Creator Data Export v1.0',
      rights:         'This data belongs to the creator. Legion Live does not claim ownership.',
    };

    return Response.json(exportPayload);
  } catch (error) {
    console.error('[creatorDataExport] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});