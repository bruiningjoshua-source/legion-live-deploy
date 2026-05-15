/* eslint-disable no-undef */
// ═══ CONVERTED: cancelSubscription ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subscriptionId, subscriptionDbId } = await req.json();
    if (!subscriptionId || typeof subscriptionId !== 'string') return Response.json({ error: 'Missing subscriptionId' }, { status: 400 });

    let owned = false;
    if (subscriptionDbId) {
      const { data: subs } = await supabase.from('creator_subscription').select('id').eq('id', subscriptionDbId).eq('user_email', user.email).limit(1);
      if ((subs||[])[0]) owned = true;
      if (!owned) { const { data: mems } = await supabase.from('fan_club_membership').select('id').eq('id', subscriptionDbId).eq('user_email', user.email).limit(1); if ((mems||[])[0]) owned = true; }
    } else {
      const { data: subs } = await supabase.from('creator_subscription').select('id').eq('stripe_subscription_id', subscriptionId).eq('user_email', user.email).limit(1);
      if ((subs||[])[0]) owned = true;
    }
    if (!owned) return Response.json({ error: 'Subscription not found or not owned by you' }, { status: 403 });

    const cancelled = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    if (subscriptionDbId) {
      await supabase.from('creator_subscription').update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() }).eq('id', subscriptionDbId).catch(() => {});
      await supabase.from('fan_club_membership').update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() }).eq('id', subscriptionDbId).catch(() => {});
    }

    return Response.json({ success: true, cancel_at: new Date(cancelled.cancel_at * 1000).toISOString(), message: 'Subscription will cancel at end of billing period.' });
  } catch (error) {
    console.error('[cancelSubscription] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});