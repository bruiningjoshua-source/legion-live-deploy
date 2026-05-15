/* eslint-disable no-undef */
// ═══ CONVERTED: checkSubscription ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
    const { data: subscriptions } = await supabase.from('creator_subscription').select('*').eq('user_email', user.email).eq('status', 'active').limit(1);
    const hasActiveSubscription = (subscriptions || []).length > 0;
    const isAdmin = profile?.role === 'admin';

    return Response.json({ has_access: hasActiveSubscription || isAdmin, has_subscription: hasActiveSubscription, is_admin: isAdmin, subscription: (subscriptions || [])[0] || null });
  } catch (error) {
    console.error('Subscription check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});