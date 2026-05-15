/* eslint-disable no-undef */
// ═══ CONVERTED: gdprCompliance ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, marketing, analytics, thirdParty } = await req.json();

    if (action === 'export_data') {
      const [walletRes, streamsRes, txnsRes] = await Promise.all([
        supabase.from('wallet').select('*').eq('user_email', user.email).limit(1),
        supabase.from('stream').select('*').eq('creator_id', user.email).order('created_date', { ascending: false }).limit(100),
        supabase.from('gift_transaction').select('*').eq('sender_email', user.email).order('created_date', { ascending: false }).limit(100),
      ]);
      return Response.json({ success: true, data: { profile: user, wallet: (walletRes.data||[])[0], streams: streamsRes.data||[], transactions: txnsRes.data||[], exportDate: new Date().toISOString() } });
    }

    if (action === 'delete_account') {
      const { data: users } = await supabase.from('user').select('id').eq('email', user.email).limit(1);
      if ((users||[])[0]) await supabase.from('user').update({ email: `deleted_${Date.now()}@deleted.local`, full_name: 'Deleted User', isSuspended: true, suspensionReason: 'GDPR account deletion' }).eq('id', users[0].id);
      const { data: creators } = await supabase.from('creator').select('id').eq('user_email', user.email).limit(1);
      if ((creators||[])[0]) await supabase.from('creator').update({ display_name: 'Deleted Creator', bio: null, avatar_url: null }).eq('id', creators[0].id);
      return Response.json({ success: true, message: 'Account deleted and anonymized.' });
    }

    if (action === 'consent_preferences') {
      const { data: users } = await supabase.from('user').select('id').eq('email', user.email).limit(1);
      if ((users||[])[0]) await supabase.from('user').update({ consent_preferences: JSON.stringify({ marketing, analytics, thirdParty, date: Date.now() }) }).eq('id', users[0].id);
      return Response.json({ success: true });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});