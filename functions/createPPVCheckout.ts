import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';
import { generateIdempotencyKey, checkIdempotency, recordIdempotency } from './idempotencyManager.js';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

const MISSING_VARS = ['STRIPE_SECRET_KEY'].filter(v => !Deno.env.get(v));
if (MISSING_VARS.length > 0) console.error('[STARTUP] CRITICAL: Missing env vars:', MISSING_VARS.join(', '));

async function checkPersistentRateLimit(base44, email, fnName, maxCount, windowMs) {
  const now = Date.now();
  const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
    { user_email: email, action: 'rate_limit_check', reason: { $regex: `.*${fnName}.*` } },
    '-timestamp_utc', 1
  ).catch(() => []);
  const record = logs[0];
  let count = 1;
  let resetAt = now + windowMs;
  if (record) {
    const data = JSON.parse(record.related_entity_id || '{}');
    if (now < data.resetAt) { count = (data.count || 0) + 1; resetAt = data.resetAt; }
  }
  if (count > maxCount) return { allowed: false, retryAfter: Math.ceil((resetAt - now) / 1000) };
  base44.asServiceRole.entities.WalletAuditLog.create({
    user_email: email, action: 'rate_limit_check', amount_denarii: 0, new_balance: 0,
    related_entity_id: JSON.stringify({ count, resetAt }), reason: `rate_limit:${fnName}`,
    timestamp_utc: new Date().toISOString()
  }).catch(() => {});
  return { allowed: true };
}

Deno.serve(async (req) => {
  if (MISSING_VARS.length > 0) return Response.json({ error: 'Payment service temporarily unavailable' }, { status: 503 });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const users = await base44.asServiceRole.entities.User.filter({ email: user.email }, null, 1).catch(() => []);
    if (users[0]?.isSuspended) return Response.json({ error: `Account suspended: ${users[0].suspensionReason || 'Policy violation'}` }, { status: 403 });

    const { event_id, csrfToken } = await req.json();
    if (!event_id || typeof event_id !== 'string' || event_id.length > 100) return Response.json({ error: 'Invalid event_id' }, { status: 400 });
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });

    const rateCheck = await checkPersistentRateLimit(base44, user.email, 'createPPVCheckout', 3, 3600000);
    if (!rateCheck.allowed) return Response.json({ error: 'Rate limited: 3 PPV purchases per hour', retryAfter: rateCheck.retryAfter }, { status: 429 });

    const events = await base44.asServiceRole.entities.PPVEvent.filter({ id: event_id }, null, 1);
    const ppvEvent = events[0];
    if (!ppvEvent) return Response.json({ error: 'Event not found' }, { status: 404 });
    if (!ppvEvent.price_usd || ppvEvent.price_usd <= 0 || ppvEvent.price_usd > 100) return Response.json({ error: 'Event has invalid price' }, { status: 400 });

    const idempotencyKey = await generateIdempotencyKey(user.email, `ppv_${event_id}`, ppvEvent.price_usd);
    const idempotencyCheck = await checkIdempotency(base44, idempotencyKey);
    if (idempotencyCheck.isDuplicate) return Response.json({ duplicate: true, originalId: idempotencyCheck.originalId, message: 'Duplicate PPV checkout' }, { status: 409 });

    const existingTickets = await base44.asServiceRole.entities.PPVTicket.filter({ event_id, user_email: user.email, status: 'valid' }, null, 1);
    if (existingTickets.length > 0) return Response.json({ error: 'You already have a ticket' }, { status: 400 });
    if (ppvEvent.max_tickets && (ppvEvent.ticket_count || 0) >= ppvEvent.max_tickets) return Response.json({ error: 'Event is sold out' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: ppvEvent.title || 'PPV Event', description: `PPV Event Ticket${ppvEvent.category ? ' — ' + ppvEvent.category : ''}` }, unit_amount: Math.round(ppvEvent.price_usd * 100) }, quantity: 1 }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/PPVEvents?success=true&event_id=${event_id}`,
      cancel_url: `${origin}/PPVEvents?cancelled=true`,
      metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID"), event_id, user_email: user.email, type: 'ppv_ticket' }
    });

    await recordIdempotency(base44, idempotencyKey, session.id);
    console.log('[createPPVCheckout] Session:', session.id, user.email, '→ event:', ppvEvent.title);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('[createPPVCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});