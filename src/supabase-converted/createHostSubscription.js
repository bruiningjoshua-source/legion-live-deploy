/* eslint-disable no-undef */
// ═══ CONVERTED: createHostSubscription ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

async function checkIdempotency(supabase, key) {
  const { data: logs } = await supabase.from('wallet_audit_log').select('reason').eq('user_email', key.split(':')[0]).eq('action', 'idempotency_record').eq('related_entity_id', key).limit(1);
  if ((logs||[])[0]) return { isDuplicate: true, originalId: (logs[0].reason||'').replace('session:', '') };
  return { isDuplicate: false };
}
async function recordIdempotency(supabase, key, sessionId) {
  await supabase.from('wallet_audit_log').insert({ user_email: key.split(':')[0], action: 'idempotency_record', amount_denarii: 0, new_balance: 0, related_entity_id: key, reason: `session:${sessionId}`, timestamp_utc: new Date().toISOString() }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: users } = await supabase.from('user').select('isSuspended,tos_accepted').eq('email', user.email).limit(1);
    if ((users||[])[0]?.isSuspended) return Response.json({ error: 'Account suspended' }, { status: 403 });
    if (!(users||[])[0]?.tos_accepted) return Response.json({ error: 'TOS required', tos_required: true }, { status: 403 });

    const { plan, creatorId, csrfToken } = await req.json();
    if (!plan || !['monthly', 'yearly'].includes(plan)) return Response.json({ error: 'Invalid plan' }, { status: 400 });
    if (!csrfToken || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF' }, { status: 403 });

    const { data: existingSubs } = await supabase.from('creator_subscription').select('id').eq('user_email', user.email).eq('status', 'active').limit(1);
    if ((existingSubs||[]).length) return Response.json({ error: 'You already have an active host subscription' }, { status: 400 });

    const prices = { monthly: { amount: 500, interval: 'month', name: 'Legion Host — Monthly' }, yearly: { amount: 1200, interval: 'year', name: 'Legion Host — Yearly' } };
    const selectedPrice = prices[plan];
    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:host_sub_${plan}:${selectedPrice.amount}:${hourTs}`;
    const idem = await checkIdempotency(supabase, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true, originalId: idem.originalId }, { status: 409 });

    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    stripeCustomer = existingCustomers.data[0] || await stripe.customers.create({ email: user.email, name: user.email });

    const origin = req.headers.get('origin') || 'https://legionlive.com';
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id, payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: selectedPrice.name }, unit_amount: selectedPrice.amount, recurring: { interval: selectedPrice.interval } }, quantity: 1 }],
      mode: 'subscription', success_url: `${origin}/Profile?subscription=success`, cancel_url: `${origin}/Profile?subscription=cancelled`,
      metadata: { user_email: user.email, creator_id: creatorId || '', plan_type: plan, subscription_type: 'host_subscription' },
      subscription_data: { metadata: { user_email: user.email, creator_id: creatorId || '', plan_type: plan } }
    });

    await recordIdempotency(supabase, idempotencyKey, session.id);
    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[createHostSubscription] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});