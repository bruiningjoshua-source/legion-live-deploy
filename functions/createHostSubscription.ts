import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

const MISSING_VARS = ['STRIPE_SECRET_KEY'].filter(v => !Deno.env.get(v));
if (MISSING_VARS.length > 0) console.error('[STARTUP] CRITICAL: Missing env vars:', MISSING_VARS.join(', '));

async function checkDbRateLimit(base44, email, fnName, maxCount, windowMs) {
  const now = Date.now();
  const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
    { user_email: email, action: 'rate_limit_check', reason: `rate_limit:${fnName}` }, '-timestamp_utc', 1
  ).catch(() => []);
  const record = logs[0];
  let count = 1, resetAt = now + windowMs;
  if (record) {
    const data = JSON.parse(record.related_entity_id || '{}');
    if (now < (data.resetAt || 0)) { count = (data.count || 0) + 1; resetAt = data.resetAt; }
  }
  if (count > maxCount) return { allowed: false, retryAfter: Math.ceil((resetAt - now) / 1000) };
  base44.asServiceRole.entities.WalletAuditLog.create({
    user_email: email, action: 'rate_limit_check', amount_denarii: 0, new_balance: 0,
    related_entity_id: JSON.stringify({ count, resetAt }), reason: `rate_limit:${fnName}`,
    timestamp_utc: new Date().toISOString()
  }).catch(() => {});
  return { allowed: true };
}

async function checkIdempotency(base44, key) {
  const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
    { user_email: key.split(':')[0], action: 'idempotency_record', related_entity_id: key }, null, 1
  ).catch(() => []);
  if (logs[0]) return { isDuplicate: true, originalId: logs[0].reason?.replace('session:', '') };
  return { isDuplicate: false };
}
async function recordIdempotency(base44, key, sessionId) {
  await base44.asServiceRole.entities.WalletAuditLog.create({
    user_email: key.split(':')[0], action: 'idempotency_record', amount_denarii: 0, new_balance: 0,
    related_entity_id: key, reason: `session:${sessionId}`, timestamp_utc: new Date().toISOString()
  }).catch(() => {});
}

Deno.serve(async (req) => {
  if (MISSING_VARS.length > 0) return Response.json({ error: 'Payment service temporarily unavailable' }, { status: 503 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await base44.asServiceRole.entities.User.filter({ email: user.email }, null, 1).catch(() => []);
    if (users[0]?.isSuspended) return Response.json({ error: `Account suspended: ${users[0].suspensionReason || 'Policy violation'}` }, { status: 403 });

    const { plan, creatorId, csrfToken } = await req.json();
    if (!plan || !['monthly', 'yearly'].includes(plan)) return Response.json({ error: 'Invalid plan. Must be "monthly" or "yearly".' }, { status: 400 });
    if (creatorId && (typeof creatorId !== 'string' || creatorId.length > 100)) return Response.json({ error: 'Invalid creatorId' }, { status: 400 });
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const rateCheck = await checkDbRateLimit(base44, user.email, 'createHostSubscription', 1, 86400000);
    if (!rateCheck.allowed) return Response.json({ error: 'Rate limited: 1 host subscription per day', retryAfter: rateCheck.retryAfter }, { status: 429 });

    const prices = { monthly: { amount: 500, interval: 'month', name: 'Legion Host — Monthly' }, yearly: { amount: 1200, interval: 'year', name: 'Legion Host — Yearly' } };
    const selectedPrice = prices[plan];

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:host_sub_${plan}:${selectedPrice.amount}:${hourTs}`;
    const idem = await checkIdempotency(base44, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true, originalId: idem.originalId, message: 'Duplicate host subscription checkout within the hour' }, { status: 409 });

    const existingSubs = await base44.asServiceRole.entities.CreatorSubscription.filter({ user_email: user.email, status: 'active' }, '-created_date', 1);
    if (existingSubs.length > 0) return Response.json({ error: 'You already have an active host subscription' }, { status: 400 });

    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    stripeCustomer = existingCustomers.data[0] || await stripe.customers.create({ email: user.email, name: user.full_name || user.email, metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID"), user_email: user.email } });

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id, payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: selectedPrice.name, description: 'Unlock monetization: Go live, receive gifts, cash out earnings' }, unit_amount: selectedPrice.amount, recurring: { interval: selectedPrice.interval } }, quantity: 1 }],
      mode: 'subscription', success_url: `${origin}/Profile?subscription=success`, cancel_url: `${origin}/Profile?subscription=cancelled`,
      metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID"), user_email: user.email, creator_id: creatorId || '', plan_type: plan, subscription_type: 'host_subscription', timestamp: Date.now().toString() },
      subscription_data: { metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID"), user_email: user.email, creator_id: creatorId || '', plan_type: plan, timestamp: Date.now().toString() } }
    });

    await recordIdempotency(base44, idempotencyKey, session.id);
    console.log('[createHostSubscription] Session:', session.id, user.email, plan);
    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[createHostSubscription] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});