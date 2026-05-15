/* eslint-disable no-undef */
// ═══ CONVERTED: suspiciousLoginDetection ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ipAddress, countryCode, deviceFingerprint } = await req.json();
    if (!ipAddress || !deviceFingerprint) return Response.json({ error: 'Missing fields' }, { status: 400 });

    let suspicionScore = 0; const flags = [];
    const { data: userRecord } = await supabase.from('user').select('device_fingerprint').eq('email', user.email).limit(1);
    if ((userRecord||[])[0]?.device_fingerprint && userRecord[0].device_fingerprint !== deviceFingerprint) { suspicionScore += 30; flags.push('New device'); }

    const { data: recentLogins } = await supabase.from('kyc_audit_log').select('id').eq('creator_id', user.email).eq('action', 'login_attempt').gte('timestamp_utc', new Date(Date.now() - 900000).toISOString());
    if ((recentLogins||[]).length > 3) { suspicionScore += 40; flags.push(`${recentLogins.length} logins in 15min`); }

    if (countryCode) {
      const { data: recent } = await supabase.from('payment_risk_assessment').select('country_code').eq('user_email', user.email).gte('assessment_date', new Date(Date.now() - 3600000).toISOString()).order('assessment_date', { ascending: false }).limit(1);
      if ((recent||[])[0]?.country_code && recent[0].country_code !== countryCode) { suspicionScore += 50; flags.push(`Geo-velocity: ${recent[0].country_code}→${countryCode}`); }
    }

    if (suspicionScore > 40) {
      await supabase.from('wallet_audit_log').insert({ user_email: user.email, action: 'suspicious_login', amount_denarii: 0, new_balance: 0, reason: `Score: ${suspicionScore}. ${flags.join(', ')}`, timestamp_utc: new Date().toISOString() }).catch(() => {});
      await supabase.from('notification').insert({ user_email: user.email, type: 'suspicious_login', title: 'Unusual Login Detected', message: `Login from ${countryCode||'Unknown'}. If not you, secure your account.`, is_read: false }).catch(() => {});
    }
    return Response.json({ requiresMfa: suspicionScore > 40, suspicionScore, flags: suspicionScore > 40 ? flags : [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});