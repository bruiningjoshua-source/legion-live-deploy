/* eslint-disable no-undef */
// ═══ CONVERTED: appointModerator ═══
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

    const { data: existing } = await supabase.from('stream_moderator').select('id').eq('stream_id', streamId).eq('moderator_email', moderatorEmail).eq('is_active', true).limit(1);
    if ((existing||[]).length) return Response.json({ duplicate: true, moderatorId: existing[0].id }, { status: 409 });

    const { data: mod } = await supabase.from('stream_moderator').insert({
      stream_id: streamId, moderator_email: moderatorEmail, appointed_by: user.email,
      appointed_date: new Date().toISOString(), permissions: ['mute_user', 'kick_user', 'timeout_user', 'manage_chat'], is_active: true
    }).select().single();

    return Response.json({ success: true, moderatorId: mod?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});