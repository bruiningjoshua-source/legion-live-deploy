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

async function fulfillDenarii(db, meta, amountPaid, stripePaymentIntent, stripeSessionId) {
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

  // Audit log — related_entity_id stores the Stripe session ID so checkPaymentStatus
  // and RetryPaymentPanel can correctly match against an in-flight checkout
  await db.from('wallet_audit_logs').insert({
    user_email,
    action:          'purchase',
    amount_denarii:  total,
    reason:          `Bought ${den.toLocaleString()} Denarii${bonus > 0 ? ` + ${bonus.toLocaleString()} bonus` : ''}`,
    related_entity_id: stripeSessionId || stripePaymentIntent || meta.package_id || null,
  });

  // Currency purchase record (matches actual currency_purchases schema)
  await db.from('currency_purchases').insert({
    user_email,
    package_name:           meta.package_name || meta.package_id || 'Denarii Package',
    denarii_amount:         den,
    bonus_denarii:          bonus,
    amount_usd:             amountPaid / 100,
    status:                 'completed',
    stripe_payment_intent:  stripePaymentIntent || null,
    stripe_session_id:      stripeSessionId || null,
  }).catch((e) => console.error('[webhook] currency_purchases insert failed:', e.message));

  console.log(`[webhook] Denarii fulfilled: ${total} denarii`);
}

async function fulfillTip(db, meta, amountPaid) {
  const { user_email: senderEmail, creator_email, stream_id, message } = meta;

  // Credit creator wallet (60% creator share, canonical)
  const creatorUsd = (amountPaid / 100) * 0.6;
  const creatorDenarii = Math.round(creatorUsd * 180); // $1 = 180 denarii

  const { data: creatorWallet } = await db.from('wallets').select('*').eq('user_email', creator_email).single().catch(() => ({ data: null }));
  if (creatorWallet) {
    await db.from('wallets').update({
      denarii_balance: (creatorWallet.denarii_balance || 0) + creatorDenarii,
    }).eq('user_email', creator_email);
  }

  // Log the tip (table column is creator_email, not receiver_email)
  await db.from('tips').insert({
    sender_email:  senderEmail,
    creator_email: creator_email,
    stream_id:     stream_id || null,
    amount_usd:    amountPaid / 100,
    amount_denarii: creatorDenarii,
    message:       message || null,
    status:        'completed',
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

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
    metadata: { related_id: stream_id || null },
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  // Advance any active tip-goal banners on this stream by the earned denarii.
  if (stream_id) {
    try {
      const { data: goals } = await db.from('stream_banners')
        .select('id, goal_current, goal_target')
        .eq('stream_id', stream_id).eq('kind', 'tip_goal').eq('visible', true);
      for (const g of goals || []) {
        await db.from('stream_banners')
          .update({ goal_current: (g.goal_current || 0) + creatorDenarii, updated_at: new Date().toISOString() })
          .eq('id', g.id);
      }
    } catch (e) { console.error('[webhook] tip goal update failed:', e?.message); }
  }

  console.log(`[webhook] Tip fulfilled: $${amountPaid / 100}`);
}

async function fulfillFanClub(db, meta, stripeSubscriptionId) {
  const { user_email, creator_email, tier } = meta;

  await db.from('fan_club_memberships').upsert({
    user_email,
    creator_email,
    tier:            tier || 'basic',
    status:          'active',
    stripe_subscription_id: stripeSubscriptionId || null,
    joined_at:       new Date().toISOString(),
  }, { onConflict: 'user_email,creator_email' });

  // Notify creator
  await db.from('notifications').insert({
    user_email:  creator_email,
    type:        'new_fan_club_member',
    title:       '🎉 New fan club member!',
    message:     `${user_email} joined your fan club (${tier || 'basic'} tier)`,
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  console.log('[webhook] Fan club fulfilled');
}

async function fulfillCreatorMonetization(db, meta, stripeSubscriptionId, plan) {
  const { user_email } = meta;

  // creator_monetizations is keyed by creator_email with feature-flag columns, not a plan/status row
  await db.from('creator_monetizations').upsert({
    creator_email: user_email,
    subscriptions_enabled: true,
    tips_enabled: true,
    ppv_enabled: true,
  }, { onConflict: 'creator_email' }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  // ALSO create the active creator_subscriptions row — the gift-eligibility gate
  // (sendGift + WatchStream) checks status='active' here. Without this, paying
  // for monetization would not actually enable the gift menu.
  const planInterval = (plan === 'yearly') ? 'yearly' : 'monthly';
  await db.from('creator_subscriptions').upsert({
    user_email,
    plan_type: planInterval,
    status: 'active',
    started_at: new Date().toISOString(),
    expires_at: planInterval === 'yearly'
      ? new Date(Date.now() + 365 * 86400000).toISOString()
      : new Date(Date.now() + 30  * 86400000).toISOString(),
  }, { onConflict: 'user_email' }).catch((e) => console.error('[webhook] sub row failed:', e?.message));

  await db.from('notifications').insert({
    user_email,
    type:    'monetization_activated',
    title:   '✅ Creator monetization activated!',
    message: 'You can now earn from gifts, tips, and fan club subscriptions.',
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  console.log('[webhook] Creator monetization activated');
}

async function fulfillHostSubscription(db, meta, stripeSubscriptionId) {
  const { user_email, plan_type } = meta;

  await db.from('creator_subscriptions').insert({
    user_email,
    plan_type:       plan_type || 'monthly',
    status:          'active',
    stripe_subscription_id: stripeSubscriptionId || null,
    started_at:      new Date().toISOString(),
    expires_at:      plan_type === 'yearly'
      ? new Date(Date.now() + 365 * 86400000).toISOString()
      : new Date(Date.now() + 30  * 86400000).toISOString(),
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  await db.from('notifications').insert({
    user_email,
    type:    'host_subscription_activated',
    title:   '🎙️ Host subscription active!',
    message: 'You can now go live on Legion Live.',
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  console.log('[webhook] Host subscription fulfilled');
}

async function fulfillPPVTicket(db, meta, amountPaid) {
  const { user_email, event_id } = meta;

  await db.from('ppv_tickets').insert({
    user_email,
    ppv_event_id: event_id,
    amount_usd:   amountPaid / 100,
    status:       'active',
    purchased_at: new Date().toISOString(),
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  await db.from('notifications').insert({
    user_email,
    type:    'ppv_ticket_purchased',
    title:   '🎫 PPV ticket confirmed!',
    message: 'Your ticket has been confirmed. You\'ll receive a reminder before the event.',
    metadata: { related_id: event_id },
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  console.log(`[webhook] PPV ticket fulfilled: event ${event_id}`);
}

async function fulfillBrandCampaign(db, meta, amountPaid) {
  const { user_email, campaign_id } = meta;

  // createCampaignCheckout validates against brand_campaigns — fulfill the same table
  await db.from('brand_campaigns').update({
    status: 'active',
  }).eq('id', campaign_id).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  await db.from('notifications').insert({
    user_email,
    type:    'campaign_activated',
    title:   '📢 Brand campaign activated!',
    message: 'Your campaign is now live and visible to creators.',
    metadata: { related_id: campaign_id },
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  console.log(`[webhook] Brand campaign fulfilled`);
}

async function fulfillBrandSubscription(db, meta, stripeSubscriptionId) {
  const { user_email, contact_email, company_name, tier_id, tier_name } = meta;

  await db.from('brand_applications').update({
    status: 'active',
    stripe_subscription_id: stripeSubscriptionId || null,
    activated_at: new Date().toISOString(),
  }).eq('user_email', user_email).eq('tier_id', tier_id).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  await db.from('notifications').insert({
    user_email,
    type:    'brand_subscription_activated',
    title:   `✅ ${tier_name} plan activated!`,
    message: `${company_name}'s advertising plan is now live. You'll be matched with creators shortly.`,
  }).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  console.log(`[webhook] Brand subscription fulfilled: ${company_name} — ${tier_name}`);
}

async function handleSubscriptionCancelled(db, subscription) {
  const subId = subscription.id;

  // Fan club
  await db.from('fan_club_memberships').update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subId).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  // Creator monetization
  await db.from('creator_monetizations').update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subId).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  // Host subscription
  await db.from('creator_subscriptions').update({ status: 'cancelled' })
    .eq('stripe_subscription_id', subId).catch((e) => console.error('[webhook] insert/update failed:', e?.message));

  console.log('[webhook] Subscription cancelled');
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

        console.log(`[webhook] checkout.session.completed: type=${purchaseType}`);

        switch (purchaseType) {
          case 'denarii':
            await fulfillDenarii(db, meta, amountPaid, session.payment_intent, session.id); break;
          case 'tip':
            await fulfillTip(db, meta, amountPaid); break;
          case 'fan_club':
            await fulfillFanClub(db, meta, subId); break;
          case 'creator_monetization':
            await fulfillCreatorMonetization(db, meta, subId, meta.plan); break;
          case 'host_subscription':
            await fulfillHostSubscription(db, meta, subId); break;
          case 'ppv_ticket':
            await fulfillPPVTicket(db, meta, amountPaid); break;
          case 'brand_campaign':
            await fulfillBrandCampaign(db, meta, amountPaid); break;
          case 'brand_subscription':
            await fulfillBrandSubscription(db, meta, subId); break;
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
            .eq('stripe_subscription_id', subId).catch((e) => console.error('[webhook] insert/update failed:', e?.message));
          await db.from('fan_club_memberships').update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId).catch((e) => console.error('[webhook] insert/update failed:', e?.message));
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
