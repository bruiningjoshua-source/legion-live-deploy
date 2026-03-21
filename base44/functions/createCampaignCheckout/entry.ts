import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

const MISSING_VARS = ['STRIPE_SECRET_KEY'].filter(v => !Deno.env.get(v));
if (MISSING_VARS.length > 0) console.error('[STARTUP] CRITICAL: Missing env vars:', MISSING_VARS.join(', '));

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

    const { campaignId, amount, campaignName } = await req.json();
    if (!campaignId || !amount) return Response.json({ error: 'campaignId and amount are required' }, { status: 400 });
    if (typeof amount !== 'number' || amount < 1 || amount > 100000) return Response.json({ error: 'Invalid amount' }, { status: 400 });

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:campaign_${campaignId}:${amount}:${hourTs}`;
    const idem = await checkIdempotency(base44, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true, originalId: idem.originalId, message: 'Duplicate campaign checkout within the hour' }, { status: 409 });

    const campaigns = await base44.asServiceRole.entities.BrandCampaign.filter({ id: campaignId }, null, 1);
    if (!campaigns[0]) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: campaignName || `Brand Campaign: ${campaigns[0].campaign_name || 'Campaign'}`, description: 'Brand marketing campaign payment' }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      mode: 'payment', customer_email: user.email,
      success_url: `${origin}/BrandCampaigns?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/BrandCampaigns?cancelled=true`,
      metadata: { base44_app_id: Deno.env.get("BASE44_APP_ID"), campaign_id: campaignId, brand_partner_id: campaigns[0].brand_partner_id || '', creator_id: campaigns[0].creator_id || '', user_email: user.email }
    });

    await recordIdempotency(base44, idempotencyKey, session.id);
    console.log('[createCampaignCheckout] Session:', session.id, campaignId, '@', amount);
    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[createCampaignCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});