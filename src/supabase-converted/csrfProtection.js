/* eslint-disable no-undef */
// ═══ CONVERTED: csrfProtection ═══
// NOTE: Already was using Supabase client. Minimal changes needed.
import { createClient } from 'npm:@supabase/supabase-js@2';

const adminClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_KEY') ?? '');

function secureToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const { action, sessionId, token, email } = await req.json();
    if (action === 'generate') {
      const t = secureToken(32);
      await adminClient.from('wallet_audit_log').insert({ user_email: email, action: 'rate_limit_check', amount_denarii: 0, new_balance: 0, reason: `csrf::${sessionId}::${t}`, timestamp_utc: new Date().toISOString() });
      return Response.json({ token: t });
    }
    if (action === 'validate') {
      if (!sessionId || !token || !email) return Response.json({ valid: false, reason: 'Missing fields' });
      const cutoff = new Date(Date.now() - 3600000).toISOString();
      const { data, error } = await adminClient.from('wallet_audit_log').select('id').eq('user_email', email).eq('action', 'rate_limit_check').eq('reason', `csrf::${sessionId}::${token}`).gte('timestamp_utc', cutoff).limit(1);
      if (error || !data?.length) return Response.json({ valid: false, reason: 'Token not found or expired' });
      await adminClient.from('wallet_audit_log').delete().eq('reason', `csrf::${sessionId}::${token}`);
      return Response.json({ valid: true });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});