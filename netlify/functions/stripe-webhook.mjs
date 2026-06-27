/**
 * stripe-webhook.mjs — Netlify function
 *
 * Verifies Stripe signature and fulfils purchases:
 *   denarii             → credits wallet (denarii + bonus + vip_points + lotto_tickets)
 *   tip                 → credits creator wallet, logs tip
 *   fan_club            → creates fan_club_membership row
 *   creator_monetization→ activates creator monetization flag
 *   host_subscription   → creates creator_subscription row
 *   ppv_ticket          → creates ppv_ticket row
 *   brand_campaign      → creates live_campaign row
 *
 * All fulfillments are idempotent via the idempotency_keys table.
 *
 * Setup in Stripe Dashboard:
 *   Webhooks → Add endpoint → https://legion-live.netlify.app/.netlify/functions/stripe-webhook
 *   Events: checkout.session.completed, customer.subscription.deleted
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY        = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET    = process.env.STRIPE_WEBHOOK_SECRET;

function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Idempotency guard ─────────────────────────────────────────────────────────
async function markProcessed(db, key) {
  const { error } = await db.from('idempotency_keys').insert({ key, processed_at: new Date().toISOString() });
  // unique constraint violation means already processed
  return !error;
}

async function alreadyProcessed(db, key) {
  const { data } = await db.from('idempotency_keys').select('key').eq('key', key).limit(1);
  return (data?.length ?? 0) > 0;
}

// ── Fulfilment handlers ───────────────────────────────────────────────────────

async function fulfillDenarii(db, meta, amountPaid) {
  const { user_email, denarii_amount, bonus_denarii, vip_points, lotto_tickets } = meta;
  const den   = Number(denarii_amount)  || 0;
  const bonus = Number(bonus_denarii)   || 0;
  const vip   = Number(vip_points)      || 0;
  const lotto = Number(lotto_tickets)   || 0;
  const total = den + bonus;

  // Get current wallet
  const { data: wallet, error: wErr } = await db
    .from('wallets').select('*').eq('user_email', user_email).single();

  if (wErr || !wallet) {
    // Create wallet if missing (shouldn't happen but safe)
    await db.from('wallets').insert({
      user_email, denarii_balance: total, vip_points: vip, lotto_tickets: lotto,
    });
  } else {
    await db.from('wallets').update({
      denarii_balance: (wallet.denarii_balance || 0) + total,
      vip_points:      (wallet.vip_points      || 0) + vip,
      lotto_tickets:   (wallet.lotto_tickets   || 0) + lotto,
    }).eq('user_email', user_email);
  }

  // Audit log
  await db.from('wallet_audit_logs').insert({
    user_email,
    action:          'purchase',
    amount_denarii:  total,
    reason:          `Bought ${den.toLocaleString()} Denarii${bonus > 0 ? ` + ${bonus.toLocaleString()} bonus` : ''}`,
    related_entity_id: meta.package_id || null,
  });

  // Currency purchase record
  await db.from('currency_purchases').insert({
    user_email,
    package_id:      meta.package_id,
    denarii_amount:  den,
    bonus_denarii:   bonus,
    vip_points:      vip,
    lotto_tickets:   lotto,
    amount_usd:      amountPaid / 100,
    status:          'completed',
    purchased_at:    new Date().toISOString(),
  }).catch(() => {}); // table may have different schema

  console.log(`[webhook] Denarii fulfilled: ${total} → ${user_email}`);
}

async function fulfillTip(db, meta, amountPaid) {
  const { user_email: senderEmail, creator_email, stream_id, message } = meta;

  // Credit creator wallet (50% platform cut)
  const creatorUsd = (amountPaid / 100) * 0.5;
  const creatorDenarii = Math.round(creatorUsd * 180); // $1 = 180 denarii

  const { data: creatorWallet } = await db.from('wallets').select('*').eq('user_email', creator_email).single().catch(() => ({ data: null }));
  if (creatorWallet) {
    await db.from('wallets').update({
      denarii_balance: (creatorWallet.denarii_balance || 0) + creatorDenarii,
    }).eq('user_email', creator_email);
  }

  // Log the tip
  await db.from('tips').insert({
    sender_email:  senderEmail,
    receiver_email: creator_email,
    stream_id:     stream_id || null,
    amount_usd:    amountPaid / 100,
    message:       message || null,
    status:        'completed',
  }).catch(() => {});

  await db.from('wallet_audit_logs').insert({
    user_email:  creator_email,
    action:      'tip_received',
    amount_denarii: creatorDenarii,
    reason:      `Tip from ${senderEmail}${message ? `: "${message.slice(0, 60)}"` : ''}`,
  });

  // Notify creator
  await db.from('notifications').insert({
    user_email:  creator_email,
    type:        'tip_received',
    title:       `💰 You received a $${(amountPaid / 100).toFixed(2)} tip!`,
    message:     `${senderEmail} sent you a tip${message ? `: "${message.slice(0, 80)}"` : ''}`,
    related_entity_id: stream_id || null,
  }).catch(() => {});

  console.log(`[webhook] Tip fulfilled: $${amountPaid / 100} → ${creator_email}`);
}

async function fulfillFanClub(db, meta, stripeSubscriptionId) {
  const { user_email, creator_email, tier } = meta;

  await db.from('fan_club_memberships').upsert({
    user_email,
    creator_email,
    tier:            tier || 'basic',
    status:          'active',
    stripe_subscription_id: stripeSubscriptionId || null,
    started_at:      new Date().toISOString(),
  }, { onConflict: 'user_email,creator_email' });

  // Notify creator
  await db.from('notifications').insert({
    user_email:  creator_email,
    type:        'new_fan_club_member',
    title:       '🎉 New fan club member!',
    message:     `${user_email} joined your fan club (${tier || 'basic'} tier)`,
  }).catch(() => {});

  console.log(`[webhook] Fan club fulfilled: ${user_email} → ${creator_email}`);
}

async function fulfillCreatorMonetization(db, meta, stripeSubscriptionId, plan) {
  const { user_email } = meta;

  await db.from('creator_monetizations').upsert({
    user_email,
    plan:            plan || 'monthly',
    status:          'active',
    stripe_subscription_id: stripeSubscriptionId || null,
    activated_at:    new Date().toISOString(),
  }, { onConflict: 'user_email' }).catch(() => {});

  // Update creator profile
  await db.from('creators').update({
    monetization_enabled: true,
    monetization_plan:    plan || 'monthly',
  }).eq('user_email', user_email).catch(() => {});

  await db.from('notifications').insert({
    user_email,
    type:    'monetization_activated',
    title:   '✅ Creator monetization activated!',
    message: 'You can now earn from gifts, tips, and fan club subscriptions.',
  }).catch(() => {});

  console.log(`[webhook] Creator monetization activated: ${user_email}`);
}

async function fulfillHostSubscription(db, meta, stripeSubscriptionId) {
  const { user_email, plan_type } = meta;

  await db.from('creator_subscriptions').upsert({
    user_email,
    plan:            plan_type || 'monthly',
    status:          'active',
    stripe_subscription_id: stripeSubscriptionId || null,
    started_at:      new Date().toISOString(),
    expires_at:      plan_type === 'yearly'
      ? new Date(Date.now() + 365 * 86400000).toISOString()
      : new Date(Date.now() + 30  * 86400000).toISOString(),
  }, { onConflict: 'user_email' });

  await db.from('creators').update({ is_host: true }).eq('user_email', user_email).catch(() => {});

  await db.from('notifications').insert({
    user_email,
    type:    'host_subscription_activated',
    title:   '🎙️ Host subscription active!',
    message: 'You can now go live on Legion Live.',
  }).catch(() => {});

  console.log(`[webhook] Host subscription fulfilled: ${user_email}`);
}

async function fulfillPPVTicket(db, meta) {
  const { user_email, event_id } = meta;

  await db.from('ppv_tickets').insert({
    user_email,
    event_id,
    status:      'active',
    purchased_at: new Date().toISOString(),
  }).catch(() => {});

  // Grant access flag
  await db.from('fan_club_memberships').upsert({
    user_email,
    event_id,
    type:   'ppv',
    status: 'active',
  }, { onConflict: 'user_email,event_id' }).catch(() => {});

  await db.from('notifications').insert({
    user_email,
    type:    'ppv_ticket_purchased',
    title:   '🎫 PPV ticket confirmed!',
    message: 'Your ticket has been confirmed. You\'ll receive a reminder before the event.',
    related_entity_id: event_id,
  }).catch(() => {});

  console.log(`[webhook] PPV ticket fulfilled: ${user_email} → event ${event_id}`);
}

async function fulfillBrandCampaign(db, meta, amountPaid) {
  const { user_email, campaign_id } = meta;

  await db.from('live_campaigns').update({
    status:     'active',
    paid_at:    new Date().toISOString(),
    amount_usd: amountPaid / 100,
  }).eq('id', campaign_id).catch(() => {});

  await db.from('notifications').insert({
    user_email,
    type:    'campaign_activated',
    title:   '📢 Brand campaign activated!',
    message: 'Your campaign is now live and visible to creators.',
    related_entity_id: campaign_id,
  }).catch(() => {});

  console.log(`[webhook] Brand campaign fulfilled: ${campaign_id}`);
}

async function handleSubscriptionCancelled(db, subscription) {
  const subId = subscription.id;

  // Fan club
  await db.from('fan_club_memberships').update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subId).catch(() => {});

  // Creator monetization
  await db.from('creator_monetizations').update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subId).catch(() => {});

  // Host subscription
  await db.from('creator_subscriptions').update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subId).catch(() => {});

  console.log(`[webhook] Subscription cancelled: ${subId}`);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  if (!STRIPE_SECRET_KEY)        return json(500, { error: 'Stripe not configured' });
  if (!STRIPE_WEBHOOK_SECRET)    return json(500, { error: 'Webhook secret not configured' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json(500, { error: 'Supabase not configured' });

  const { default: Stripe } = await import('stripe');
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

  // ── Verify Stripe signature ──────────────────────────────────────────────
  const sig = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return json(400, { error: `Webhook signature invalid: ${err.message}` });
  }

  const db = getAdmin();

  // ── Idempotency: skip already-processed events ───────────────────────────
  const idempotencyKey = `stripe:${stripeEvent.id}`;
  if (await alreadyProcessed(db, idempotencyKey)) {
    console.log(`[webhook] Already processed: ${stripeEvent.id}`);
    return json(200, { received: true, skipped: true });
  }

  try {
    switch (stripeEvent.type) {

      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        if (session.payment_status !== 'paid' && session.mode !== 'subscription') break;

        const meta          = session.metadata || {};
        const purchaseType  = meta.purchase_type || meta.subscription_type;
        const amountPaid    = session.amount_total || 0;
        const subId         = session.subscription || null;

        console.log(`[webhook] checkout.session.completed: type=${purchaseType} user=${meta.user_email}`);

        switch (purchaseType) {
          case 'denarii':
            await fulfillDenarii(db, meta, amountPaid); break;
          case 'tip':
            await fulfillTip(db, meta, amountPaid); break;
          case 'fan_club':
            await fulfillFanClub(db, meta, subId); break;
          case 'creator_monetization':
            await fulfillCreatorMonetization(db, meta, subId, meta.plan); break;
          case 'host_subscription':
            await fulfillHostSubscription(db, meta, subId); break;
          case 'ppv_ticket':
            await fulfillPPVTicket(db, meta); break;
          case 'brand_campaign':
            await fulfillBrandCampaign(db, meta, amountPaid); break;
          default:
            console.warn(`[webhook] Unknown purchase_type: ${purchaseType}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionCancelled(db, stripeEvent.data.object);
        break;
      }

      case 'invoice.payment_failed': {
        // Mark subscription as past_due
        const invoice = stripeEvent.data.object;
        const subId   = invoice.subscription;
        if (subId) {
          await db.from('creator_subscriptions').update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId).catch(() => {});
          await db.from('fan_club_memberships').update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId).catch(() => {});
        }
        break;
      }

      default:
        console.log(`[webhook] Unhandled event type: ${stripeEvent.type}`);
    }

    // Mark as processed only after successful fulfillment
    await markProcessed(db, idempotencyKey);
    return json(200, { received: true });

  } catch (err) {
    console.error('[webhook] Fulfillment error:', err);
    // Return 500 so Stripe retries (it retries failed webhooks for 3 days)
    return json(500, { error: 'Fulfillment failed', details: err.message });
  }
};
