/* eslint-disable no-undef */
// ═══ CONVERTED: contentModerationAppeal ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, contentId, contentType, appealReason, appealId, decision, moderatorReason } = await req.json();
    const sanitize = (str) => typeof str !== 'string' ? '' : str.trim().replace(/[<>"'`]/g, '').substring(0, 2000);

    if (action === 'create_appeal') {
      const reason = sanitize(appealReason);
      if (!contentId || !contentType || reason.length < 20) return Response.json({ error: 'Reason must be 20+ chars' }, { status: 400 });
      const { data: appeal } = await supabase.from('wallet_audit_log').insert({ user_email: user.email, action: 'moderation_appeal', amount_denarii: 0, new_balance: 0, reason, related_entity_id: JSON.stringify({ contentId: String(contentId), contentType: String(contentType), appealDate: Date.now() }), timestamp_utc: new Date().toISOString() }).select().single();
      await supabase.from('notification').insert({ user_email: 'admin', type: 'appeal_submitted', title: 'Content Moderation Appeal', message: `${user.email} appealed ${contentType} #${contentId}`, is_read: false }).catch(() => {});
      return Response.json({ success: true, appealId: appeal?.id, message: 'Appeal submitted. Review within 48 hours.' });
    }

    if (action === 'respond_appeal') {
      const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
      if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });
      if (!appealId || !decision) return Response.json({ error: 'Missing fields' }, { status: 400 });
      const { data: appeals } = await supabase.from('wallet_audit_log').select('*').eq('id', appealId).eq('action', 'moderation_appeal').limit(1);
      if ((appeals||[])[0]) {
        const appealData = JSON.parse(appeals[0].related_entity_id || '{}');
        await supabase.from('wallet_audit_log').insert({ user_email: appeals[0].user_email, action: 'appeal_resolved', amount_denarii: 0, new_balance: 0, reason: `Appeal ${decision}: ${moderatorReason||''}`, related_entity_id: JSON.stringify({ ...appealData, decision, resolvedDate: Date.now() }), timestamp_utc: new Date().toISOString() });
        await supabase.from('notification').insert({ user_email: appeals[0].user_email, type: 'appeal_resolved', title: `Appeal ${decision.charAt(0).toUpperCase() + decision.slice(1)}`, message: decision === 'overturned' ? 'Your content is restored.' : 'Your appeal has been reviewed.', is_read: false }).catch(() => {});
      }
      return Response.json({ success: true });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});