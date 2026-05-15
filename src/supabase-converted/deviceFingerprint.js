/* eslint-disable no-undef */
// ═══ CONVERTED: deviceFingerprint ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

async function generateFingerprint(ua, lang, tz, screen, webgl) {
  const combined = `${ua}|${lang}|${tz}|${screen}|${webgl}`;
  const data = new TextEncoder().encode(combined);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { userAgent, acceptLanguage, timezone, screenResolution, webglRenderer } = await req.json();
    if (!userAgent || !acceptLanguage || !timezone) return Response.json({ error: 'Missing params' }, { status: 400 });

    const fingerprint = await generateFingerprint(userAgent, acceptLanguage, timezone, screenResolution || 'unknown', webglRenderer || 'unknown');
    const { data: users } = await supabase.from('user').select('id').eq('email', user.email).limit(1);
    if ((users||[])[0]) await supabase.from('user').update({ device_fingerprint: fingerprint, device_fingerprint_updated: new Date().toISOString() }).eq('id', users[0].id);

    return Response.json({ fingerprint, message: 'Device fingerprint recorded' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});