/* eslint-disable no-undef */
// ═══ CONVERTED: paymentIntentHandler ═══
// NOTE: Was export-only module. Converted to action-based edge function.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const { action, paymentIntentId, sessionId, userEmail } = await req.json();

    if (action === 'check_status') {
      const { data: logs } = await supabase.from('wallet_audit_log').select('timestamp_utc').eq('related_entity_id', paymentIntentId).limit(1);
      if ((logs||[])[0]) return Response.json({ status: 'confirmed', processedAt: logs[0].timestamp_utc });
      return Response.json({ status: 'pending', message: 'Still processing. Check back shortly.', retryAfter: 5000 });
    }
    if (action === 'log_abandoned') {
      await supabase.from('wallet_audit_log').insert({ user_email: userEmail, action: 'abandoned_checkout', amount_denarii: 0, new_balance: 0, related_entity_id: sessionId, reason: 'Checkout abandoned', timestamp_utc: new Date().toISOString() }).catch(() => {});
      return Response.json({ success: true });
    }
    if (action === 'mark_recoverable') {
      await supabase.from('wallet_audit_log').insert({ user_email: userEmail, action: 'payment_retry_eligible', amount_denarii: 0, new_balance: 0, related_entity_id: paymentIntentId, reason: 'Payment failed - retry eligible', timestamp_utc: new Date().toISOString() }).catch(() => {});
      return Response.json({ success: true });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});