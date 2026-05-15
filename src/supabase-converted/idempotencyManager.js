/* eslint-disable no-undef */
// ═══ CONVERTED: idempotencyManager ═══
// NOTE: Was export-only module. Converted to standalone edge function.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const { action, email, type, amount, key, transactionId } = await req.json();

    if (action === 'generate_key') {
      const hourTs = Math.floor(Date.now() / 3600000);
      return Response.json({ key: `${email}:${type}:${amount}:${hourTs}` });
    }
    if (action === 'check') {
      const { data: logs } = await supabase.from('wallet_audit_log').select('id,timestamp_utc').eq('related_entity_id', key).limit(1);
      if ((logs||[])[0]) return Response.json({ isDuplicate: true, originalId: logs[0].id, processedAt: logs[0].timestamp_utc });
      return Response.json({ isDuplicate: false });
    }
    if (action === 'record') {
      await supabase.from('wallet_audit_log').insert({ user_email: key.split(':')[0], action: 'idempotency_record', amount_denarii: 0, new_balance: 0, related_entity_id: key, reason: `Idempotency for ${transactionId}`, timestamp_utc: new Date().toISOString() }).catch(() => {});
      return Response.json({ success: true });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});