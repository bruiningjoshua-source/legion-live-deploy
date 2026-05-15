/* eslint-disable no-undef */
// ═══ CONVERTED: stripeAlertNotifier ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const { event_type, user_email, charge_id, amount_usd, dispute_status, chargeback_count } = await req.json();
    let title = '', message = '';
    if (event_type === 'charge.dispute.created') { title = '⚠️ Chargeback Initiated'; message = `User ${user_email} chargeback $${(amount_usd||0).toFixed(2)}. Charge: ${charge_id}.`; }
    else if (event_type === 'charge.dispute.updated') { title = `📋 Dispute: ${dispute_status}`; message = `Dispute ${charge_id} → ${dispute_status}.`; }
    else if (event_type === 'auto_suspend') { title = '🚫 User Auto-Suspended'; message = `${user_email} suspended after ${chargeback_count} chargebacks.`; }

    if (title) await supabase.from('notification').insert({ user_email: 'admin', type: event_type, title, message, is_read: false }).catch(() => {});
    if (event_type === 'auto_suspend' || (event_type === 'charge.dispute.created' && chargeback_count >= 2)) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transactionalEmail`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}` }, body: JSON.stringify({ action: 'send_admin_alert', adminEmail: 'admin@legionlive.app', alertType: event_type, alertMessage: message }) }).catch(() => {});
    }
    return Response.json({ success: true, alert_sent: !!title });
  } catch (error) { return Response.json({ error: error.message }, { status: 500 }); }
});