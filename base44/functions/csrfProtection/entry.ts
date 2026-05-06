/**
 * CSRF PROTECTION
 * Token generation and validation — DB-persisted via wallet_audit_logs
 */

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

function generateSecureToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function storeCSRFToken(token, userEmail) {
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await supabaseAdmin.from('wallet_audit_logs').insert({
    user_email: userEmail,
    action: 'rate_limit_check',
    amount_denarii: 0,
    new_balance: 0,
    reason: `csrf_token:${token}`,
    timestamp_utc: new Date().toISOString(),
  });
}

async function validateCSRFToken(token, userEmail) {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from('wallet_audit_logs')
    .select('id')
    .eq('user_email', userEmail)
    .eq('action', 'rate_limit_check')
    .like('reason', `csrf_token:${token}`)
    .gte('timestamp_utc', cutoff)
    .limit(1);
  return (data?.length || 0) > 0;
}

export async function generateCSRFToken(sessionId, email) {
  const token = generateSecureToken(32);
  await storeCSRFToken(token, email);
  return token;
}

export async function validateCSRFTokenForSession(sessionId, token, email) {
  const isValid = await validateCSRFToken(token, email);

  if (!isValid) {
    return { valid: false, reason: 'CSRF token invalid or expired' };
  }

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