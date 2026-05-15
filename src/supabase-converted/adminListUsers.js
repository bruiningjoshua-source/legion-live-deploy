/* eslint-disable no-undef */
// ═══ CONVERTED: adminListUsers ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
const AUTHORIZED_ADMINS = (Deno.env.get('ADMIN_EMAILS') || '').split(',').map(e => e.trim()).filter(Boolean);

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
    if (profile?.role !== 'admin' || !AUTHORIZED_ADMINS.includes(user.email)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { data: users } = await supabase.from('user').select('*').order('created_date', { ascending: false }).limit(100);
    return Response.json({ users: users || [] });
  } catch (error) {
    console.error('[adminListUsers] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});