/* eslint-disable no-undef */
// ═══ CONVERTED: removeModerator ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamId, moderatorEmail } = await req.json();
    if (!streamId || !moderatorEmail) return Response.json({ error: 'Missing fields' }, { status: 400 });

    const { data: streams } = await supabase.from('stream').select('creator_id').eq('id', streamId).limit(1);
    if (!(streams||[])[0] || streams[0].creator_id !== user.email) return Response.json({ error: 'Not authorized' }, { status: 403 });

    const { data: mods } = await supabase.from('stream_moderator').select('id').eq('stream_id', streamId).eq('moderator_email', moderatorEmail).eq('is_active', true).limit(1);
    if (!(mods||[]).length) return Response.json({ duplicate: true, message: 'Not a moderator' }, { status: 409 });

    await supabase.from('stream_moderator').update({ is_active: false }).eq('id', mods[0].id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});