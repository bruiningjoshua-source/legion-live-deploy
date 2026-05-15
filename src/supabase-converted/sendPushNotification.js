/* eslint-disable no-undef */
// ═══ CONVERTED: sendPushNotification ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const data = await req.json();
    const { action, recipientEmail, notificationType, title, body, data: notificationData, creatorId, streamId, notificationId } = data;

    switch (action) {
      case 'send_single': {
        const { data: users } = await supabase.from('user').select('push_notifications_enabled,notification_preferences').eq('email', recipientEmail).limit(1);
        const u = (users||[])[0];
        if (!u?.push_notifications_enabled) return Response.json({ success: false, reason: 'Notifications disabled' });
        await supabase.from('platform_analytics').insert({ metric_type: 'notification', metric_name: notificationType, metric_value: 1, metadata: { recipient_email: recipientEmail, title, body, data: notificationData, sent_at: new Date().toISOString(), read: false } });
        return Response.json({ success: true });
      }
      case 'notify_followers': {
        if (!creatorId || !streamId) return Response.json({ error: 'Missing fields' }, { status: 400 });
        const { data: creators } = await supabase.from('creator').select('display_name').eq('id', creatorId).limit(1);
        if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
        const { data: followers } = await supabase.from('follow').select('follower_email').eq('following_id', creatorId).limit(1000);
        let notified = 0;
        for (const f of (followers||[])) {
          await supabase.from('platform_analytics').insert({ metric_type: 'notification', metric_name: 'stream_started', metric_value: 1, metadata: { recipient_email: f.follower_email, title: `${creators[0].display_name} is live!`, body: `Watch now`, data: { streamId, creatorId }, sent_at: new Date().toISOString(), read: false } }).catch(() => {});
          notified++;
        }
        return Response.json({ success: true, notified, total: (followers||[]).length });
      }
      case 'get_notifications': {
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const { data: notifications } = await supabase.from('platform_analytics').select('*').eq('metric_type', 'notification').order('created_date', { ascending: false }).limit(50);
        const filtered = (notifications||[]).filter(n => n.metadata?.recipient_email === user.email);
        return Response.json({ notifications: filtered });
      }
      default: return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});