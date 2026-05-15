/* eslint-disable no-undef */
// ═══ CONVERTED: creatorDataExport ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [creatorsRes, followersRes, giftsRes, streamsRes] = await Promise.all([
      supabase.from('creator').select('*').eq('user_email', user.email).limit(1),
      supabase.from('follow').select('follower_email,created_date').eq('creator_email', user.email).order('created_date', { ascending: false }).limit(500),
      supabase.from('gift_transaction').select('*').eq('creator_email', user.email).order('created_date', { ascending: false }).limit(500),
      supabase.from('stream').select('id,title,viewer_count,status,created_date').eq('creator_id', user.email).order('created_date', { ascending: false }).limit(100),
    ]);
    const creator = (creatorsRes.data||[])[0];
    const giftTxns = giftsRes.data||[];
    const gifterMap = {};
    giftTxns.forEach(g => { if (!g.sender_email) return; if (!gifterMap[g.sender_email]) gifterMap[g.sender_email] = { email: g.sender_email, name: g.sender_name||'', total: 0, count: 0 }; gifterMap[g.sender_email].total += g.amount_denarii||0; gifterMap[g.sender_email].count++; });

    return Response.json({
      exported_at: new Date().toISOString(), creator_email: user.email, display_name: creator?.display_name,
      follower_count: (followersRes.data||[]).length, total_streams: (streamsRes.data||[]).length,
      total_earnings: giftTxns.reduce((s, g) => s + (g.amount_denarii||0), 0),
      followers: followersRes.data||[], top_gifters: Object.values(gifterMap).sort((a, b) => b.total - a.total).slice(0, 100), streams: streamsRes.data||[],
      data_format: 'Legion Live Creator Data Export v1.0'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});