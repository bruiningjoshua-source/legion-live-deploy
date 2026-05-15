/* eslint-disable no-undef */
// ═══ CONVERTED: adminMonetizationBypass ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') || '').split(',').map(e => e.trim()).filter(Boolean);

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
    if (profile?.role !== 'admin' || !ADMIN_EMAILS.includes(user.email)) return Response.json({ error: 'Unauthorized' }, { status: 403 });

    const { creatorId } = await req.json();
    const { data: creators } = await supabase.from('creator').select('*').eq('id', creatorId).limit(1);
    const creator = (creators || [])[0];
    if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });

    const { data: subs } = await supabase.from('creator_subscription').select('id').eq('creator_id', creatorId).eq('status', 'active').limit(1);
    if (!(subs || []).length) {
      await supabase.from('creator_subscription').insert({
        creator_id: creatorId, plan_type: 'admin_lifetime', status: 'active',
        start_date: new Date().toISOString(), expiry_date: new Date(2099, 12, 31).toISOString(),
        auto_renew: false, admin_activated: true
      });
      return Response.json({ success: true, message: 'Monetization activated with admin privileges', creator: creator.display_name, activatedBy: user.email });
    }
    return Response.json({ success: true, message: 'Creator already monetized', creator: creator.display_name });
  } catch (error) {
    console.error('Monetization bypass error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});