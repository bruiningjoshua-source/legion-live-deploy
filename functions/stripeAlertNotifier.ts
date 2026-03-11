import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Stripe Webhook Alert Notifier
 * Sends admin notifications for chargebacks and disputes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { 
      event_type,
      user_email,
      charge_id,
      amount_usd,
      dispute_status,
      chargeback_count 
    } = await req.json();

    let title = '';
    let message = '';

    if (event_type === 'charge.dispute.created') {
      title = '⚠️ Chargeback Initiated';
      message = `User ${user_email} initiated a chargeback for $${(amount_usd || 0).toFixed(2)}. Charge ID: ${charge_id}. Denarii reversed.`;
    } else if (event_type === 'charge.dispute.updated') {
      title = `📋 Dispute Status: ${dispute_status}`;
      message = `Dispute ${charge_id} for ${user_email} updated to ${dispute_status}.`;
    } else if (event_type === 'auto_suspend') {
      title = '🚫 User Auto-Suspended';
      message = `${user_email} was automatically suspended after ${chargeback_count} chargebacks. Review account for fraud.`;
    }

    // Create admin notification
    if (title) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: 'admin',
          type: event_type,
          title: title,
          message: message,
          is_read: false,
          created_date: new Date().toISOString()
        });
        console.log(`[stripeAlertNotifier] Alert created: ${title}`);
      } catch (e) {
        console.warn('[stripeAlertNotifier] Failed to create notification:', e.message);
      }
    }

    // Send admin email for critical events
    if (event_type === 'auto_suspend' || (event_type === 'charge.dispute.created' && chargeback_count >= 2)) {
      try {
        await base44.asServiceRole.functions.invoke('transactionalEmail', {
          action: 'send_admin_alert',
          adminEmail: 'admin@legionlive.app',
          alertType: event_type,
          alertMessage: message
        });
      } catch (e) {
        console.warn('[stripeAlertNotifier] Admin email failed:', e.message);
      }
    }

    return Response.json({ 
      success: true,
      alert_sent: !!title
    });

  } catch (error) {
    console.error('[stripeAlertNotifier] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});