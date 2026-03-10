import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

const MISSING_VARS = ['STRIPE_SECRET_KEY'].filter(v => !Deno.env.get(v));
if (MISSING_VARS.length > 0) console.error('[STARTUP] CRITICAL: Missing env vars:', MISSING_VARS.join(', '));

// ── Persistent DB-backed rate limit (survives cold starts) ──
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

// ── DB-backed idempotency ──
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

    const { creatorId, amount, message, streamId, isAnonymous, csrfToken } = await req.json();
    if (!creatorId || !amount) return Response.json({ error: 'Creator ID and amount are required' }, { status: 400 });
    if (typeof creatorId !== 'string' || creatorId.length > 100) return Response.json({ error: 'Invalid creator ID' }, { status: 400 });
    if (typeof amount !== 'number' || amount < 1 || amount > 5000) return Response.json({ error: 'Tip amount must be between $1 and $5,000' }, { status: 400 });
    if (message && (typeof message !== 'string' || message.length > 500)) return Response.json({ error: 'Message must be under 500 characters' }, { status: 400 });
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const rateCheck = await checkDbRateLimit(base44, user.email, 'createTipCheckout', 5, 60000);
    if (!rateCheck.allowed) return Response.json({ error: 'Rate limited: 5 tips per minute', retryAfter: rateCheck.retryAfter }, { status: 429 });

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:tip:${amount}:${hourTs}`;
    const idem = await checkIdempotency(base44, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true, originalId: idem.originalId, message: 'Duplicate tip checkout within the hour' }, { status: 409 });

    const creators = await base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1);
    if (!creators[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
    if (creators[0].user_email === user.email) return Response.json({ error: 'You cannot tip yourself' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const successUrl = streamId ? `${origin}/WatchStream?id=${streamId}&tip_success=true` : `${origin}/CreatorProfile?id=${creatorId}&tip_success=true`;
    const cancelUrl = streamId ? `${origin}/WatchStream?id=${streamId}&tip_cancelled=true` : `${origin}/CreatorProfile?id=${creatorId}&tip_cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `Tip for ${creators[0].display_name}`, description: message ? message.substring(0, 200).replace(/<[^>]*>/g, '') : 'Support this creator' }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      mode: 'payment', customer_email: user.email, success_url: successUrl, cancel_url: cancelUrl,
      metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID"), creator_id: creatorId, sender_email: user.email, amount_usd: amount.toString(), message: (message || '').substring(0, 500).replace(/<[^>]*>/g, ''), stream_id: streamId || '', is_anonymous: isAnonymous ? 'true' : 'false', purchase_type: 'tip' }
    });

    await recordIdempotency(base44, idempotencyKey, session.id);
    console.log('[createTipCheckout] Session:', session.id, '$', amount, '→', creators[0].display_name);
    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[createTipCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});