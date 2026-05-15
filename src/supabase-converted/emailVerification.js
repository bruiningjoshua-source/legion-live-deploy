/* eslint-disable no-undef */
// ═══ CONVERTED: emailVerification ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, verificationCode } = await req.json();
    if (action === 'send_verification') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      // Send via transactional email edge function
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transactionalEmail`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}` },
        body: JSON.stringify({ action: 'send_email_verification', userEmail: user.email, userName: user.email, verificationCode: code })
      }).catch(e => { console.warn('Email failed:', e.message); });
      return Response.json({ message: 'Verification email sent' });
    }
    if (action === 'verify_email') {
      if (!verificationCode || !/^\d{6}$/.test(verificationCode)) return Response.json({ error: 'Invalid code' }, { status: 400 });
      const { data: users } = await supabase.from('user').select('id').eq('email', user.email).limit(1);
      if ((users||[])[0]) await supabase.from('user').update({ email_verified: true, email_verified_at: new Date().toISOString(), withdrawal_eligible: true }).eq('id', users[0].id);
      return Response.json({ message: 'Email verified', withdrawal_eligible: true });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});