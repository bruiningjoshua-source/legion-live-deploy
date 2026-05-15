/* eslint-disable no-undef */
// ═══ CONVERTED: updateRecommendationEngine ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });

    const { data: liveStreams } = await supabase.from('stream').select('category,viewer_count').eq('status', 'live').limit(1000);
    const categoryMetrics = {};
    for (const s of (liveStreams||[])) { const cat = s.category||'other'; if (!categoryMetrics[cat]) categoryMetrics[cat] = { totalViewers: 0, streamCount: 0 }; categoryMetrics[cat].totalViewers += s.viewer_count||0; categoryMetrics[cat].streamCount++; }

    const { data: cached } = await supabase.from('platform_analytics').select('metric_value').eq('metric_key', 'recommendation_metrics_cache').order('created_date', { ascending: false }).limit(1);
    const prev = cached?.[0]?.metric_value ? JSON.parse(cached[0].metric_value) : {};
    const trending = [];
    for (const [cat, m] of Object.entries(categoryMetrics)) { const growth = m.totalViewers - (prev[cat]?.totalViewers||0); if (growth > 100) trending.push({ category: cat, viewers: m.totalViewers, growth, streamCount: m.streamCount }); }

    await supabase.from('platform_analytics').insert({ metric_key: 'recommendation_metrics_cache', metric_value: JSON.stringify(categoryMetrics), metric_date: new Date().toISOString() }).catch(() => {});

    return Response.json({ success: true, trendingCategories: trending.slice(0, 10) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});