/* eslint-disable no-undef */
// ═══ CONVERTED: dynamicTipSuggestions ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamId, creatorId } = await req.json();
    if (!streamId || !creatorId) return Response.json({ error: 'Missing fields' }, { status: 400 });

    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
    const { data: tipTxns } = await supabase.from('gift_transaction').select('total_as_value').eq('recipient_email', creatorId).gte('created_date', thirtyDaysAgo);
    const tipAmounts = (tipTxns||[]).filter(t => t.total_as_value > 0).map(t => t.total_as_value);

    let suggestions = [5, 10, 25];
    if (tipAmounts.length > 0) {
      const freq = {}; tipAmounts.forEach(a => { freq[a] = (freq[a]||0) + 1; });
      const mostCommon = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);
      const avg = Math.round(tipAmounts.reduce((a, b) => a + b, 0) / tipAmounts.length);
      const sorted = [...tipAmounts].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      suggestions = [Math.round(Number(mostCommon)), avg, median + 10, 50].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
    }

    const { data: viewerTips } = await supabase.from('gift_transaction').select('total_as_value').eq('sender_email', user.email).eq('recipient_email', creatorId).order('created_date', { ascending: false }).limit(5);
    if ((viewerTips||[]).length > 0) {
      const last = viewerTips[0].total_as_value || 0;
      suggestions = [last, last * 1.5, Math.max(...suggestions), 100].map(Math.round).filter((v, i, a) => a.indexOf(v) === i);
    }

    return Response.json({ suggestions: suggestions.sort((a, b) => a - b), totalTipsReceived: (tipTxns||[]).length, averageTip: tipAmounts.length ? Math.round(tipAmounts.reduce((a, b) => a + b, 0) / tipAmounts.length) : 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});