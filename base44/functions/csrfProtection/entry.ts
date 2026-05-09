/**
 * CSRF PROTECTION
 * Token generation and validation — DB-persisted via wallet_audit_logs
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const adminClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
);

function secureToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateCSRFToken(sessionId, email) {
  const token = secureToken(32);
  await adminClient.from('wallet_audit_logs').insert({
    user_email:   email,
    action:       'rate_limit_check',
    amount_denarii: 0,
    new_balance:  0,
    reason:       `csrf::${sessionId}::${token}`,
    timestamp_utc: new Date().toISOString(),
  });
  return token;
}

export async function validateCSRFToken(sessionId, token, email) {
  if (!sessionId || !token || !email) return { valid: false, reason: 'Missing fields' };
  const cutoff = new Date(Date.now() - 3_600_000).toISOString();
  const { data, error } = await adminClient
    .from('wallet_audit_logs')
    .select('id')
    .eq('user_email', email)
    .eq('action', 'rate_limit_check')
    .eq('reason', `csrf::${sessionId}::${token}`)
    .gte('timestamp_utc', cutoff)
    .limit(1);
  if (error || !data?.length) return { valid: false, reason: 'Token not found or expired' };
  // Invalidate: delete the used token.
  await adminClient.from('wallet_audit_logs')
    .delete()
    .eq('reason', `csrf::${sessionId}::${token}`);
  return { valid: true };
}

export function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) return decodeURIComponent(cookieValue);
  }
  return null;
}