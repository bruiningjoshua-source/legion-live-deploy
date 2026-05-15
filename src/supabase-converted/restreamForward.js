/* eslint-disable no-undef */
// ═══ CONVERTED: restreamForward ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({ action: 'get' }));
    const { action, endpoints } = body;

    if (action === 'get' || !action) {
      return Response.json({ targets: [], rtmp_docs: 'Set your stream key in each platform and paste the RTMP URL here.', supported: ["YouTube Live", "Twitch", "Facebook Live", "TikTok Live", "Kick", "Custom RTMP"] });
    }
    if (action === 'set' && Array.isArray(endpoints)) {
      const { data: creators } = await supabase.from('creator').select('id').eq('user_email', user.email).limit(1);
      if ((creators||[])[0]) {
        await supabase.from('creator').update({ social_links: JSON.stringify({ restream_endpoints: endpoints }) }).eq('id', creators[0].id);
      }
      return Response.json({ success: true, targets: endpoints });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});