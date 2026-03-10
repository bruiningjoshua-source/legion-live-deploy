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

    const { creator_id, tier, price_usd, tier_name, perks, csrfToken } = await req.json();
    if (!creator_id || !tier || !price_usd) return Response.json({ error: 'Missing required fields' }, { status: 400 });
    if (typeof creator_id !== 'string' || creator_id.length > 100) return Response.json({ error: 'Invalid creator_id' }, { status: 400 });
    if (typeof tier !== 'number' || tier < 1 || tier > 5) return Response.json({ error: 'Tier must be 1-5' }, { status: 400 });
    if (typeof price_usd !== 'number' || price_usd < 0.50 || price_usd > 1000) return Response.json({ error: 'Price must be between $0.50 and $1,000' }, { status: 400 });
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const rateCheck = await checkDbRateLimit(base44, user.email, 'createFanClubCheckout', 5, 86400000);
    if (!rateCheck.allowed) return Response.json({ error: 'Rate limited: 5 fan clubs per day', retryAfter: rateCheck.retryAfter }, { status: 429 });

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:fanclub_${creator_id}_${tier}:${price_usd}:${hourTs}`;
    const idem = await checkIdempotency(base44, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true, originalId: idem.originalId, message: 'Duplicate fan club checkout within the hour' }, { status: 409 });

    const creators = await base44.asServiceRole.entities.Creator.filter({ id: creator_id }, null, 1);
    if (!creators[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
    if (creators[0].user_email === user.email) return Response.json({ error: 'You cannot subscribe to your own fan club' }, { status: 400 });

    const existingMemberships = await base44.asServiceRole.entities.FanClubMembership.filter({ user_email: user.email, creator_id, status: 'active' }, null, 1);
    if (existingMemberships.length > 0) return Response.json({ error: 'You already have an active membership' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `${creators[0].display_name} — ${tier_name || 'Fan Club'}`, description: Array.isArray(perks) ? perks.join(', ') : 'Fan Club Membership' }, unit_amount: Math.round(price_usd * 100), recurring: { interval: 'month' } }, quantity: 1 }],
      mode: 'subscription', customer_email: user.email,
      success_url: `${origin}/FanClubs?success=true&creator_id=${creator_id}`,
      cancel_url: `${origin}/FanClubs?cancelled=true`,
      metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID"), type: 'fan_club_membership', creator_id, user_email: user.email, tier: tier.toString(), tier_name: tier_name || '', price_usd: price_usd.toString() }
    });

    await recordIdempotency(base44, idempotencyKey, session.id);
    console.log('[createFanClubCheckout] Session:', session.id, user.email, '→', creators[0].display_name, '@', price_usd);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('[createFanClubCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});