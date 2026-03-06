import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// ─── Idempotency: track processed event IDs ───
const processedEvents = new Map(); // eventId → timestamp
const IDEMPOTENCY_WINDOW = 3600000; // 1 hour

// Periodic cleanup
setInterval(() => {
  const cutoff = Date.now() - IDEMPOTENCY_WINDOW;
  for (const [key, ts] of processedEvents) {
    if (ts < cutoff) processedEvents.delete(key);
  }
}, 600000);

Deno.serve(async (req) => {
  let eventId = 'unknown';
  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      console.error('[stripeWebhook] No stripe-signature header');
      return Response.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[stripeWebhook] STRIPE_WEBHOOK_SECRET not configured');
      return Response.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('[stripeWebhook] Signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    eventId = event.id;

    // Idempotency check
    if (processedEvents.has(eventId)) {
      console.log('[stripeWebhook] Duplicate event skipped:', eventId);
      return Response.json({ received: true, duplicate: true });
    }
    processedEvents.set(eventId, Date.now());

    console.log('[stripeWebhook] Processing:', event.type, eventId);

    switch (event.type) {

      // ═══════════════════════════════════════════
      // CHECKOUT COMPLETED
      // ═══════════════════════════════════════════
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata || {};
        console.log('[stripeWebhook] Checkout completed:', session.id, JSON.stringify(metadata));

        // ── Creator Monetization ──
        if (metadata.purchase_type === 'creator_monetization' && metadata.creator_id) {
          const planType = metadata.plan_type;
          const startDate = new Date();
          const expiryDate = new Date();
          if (planType === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          }

          const userEmail = metadata.user_email || session.customer_email || '';
          const existingSubs = await base44.asServiceRole.entities.CreatorSubscription.filter(
            { creator_id: metadata.creator_id, status: 'active' }, null, 1
          );

          if (existingSubs[0]) {
            await base44.asServiceRole.entities.CreatorSubscription.update(existingSubs[0].id, {
              plan_type: planType,
              user_email: userEmail,
              stripe_subscription_id: session.subscription || session.payment_intent,
              stripe_customer_id: session.customer,
              start_date: startDate.toISOString(),
              expiry_date: expiryDate.toISOString(),
              auto_renew: planType === 'monthly'
            });
          } else {
            await base44.asServiceRole.entities.CreatorSubscription.create({
              creator_id: metadata.creator_id,
              user_email: userEmail,
              plan_type: planType,
              status: 'active',
              stripe_subscription_id: session.subscription || session.payment_intent,
              stripe_customer_id: session.customer,
              start_date: startDate.toISOString(),
              expiry_date: expiryDate.toISOString(),
              auto_renew: planType === 'monthly'
            });
          }
          console.log('[stripeWebhook] Creator monetization activated:', metadata.creator_id, planType);
        }

        // ── Tip ──
        if (metadata.purchase_type === 'tip' && metadata.creator_id) {
          const amount = parseFloat(metadata.amount_usd);
          if (isNaN(amount) || amount <= 0) {
            console.error('[stripeWebhook] Invalid tip amount:', metadata.amount_usd);
            break;
          }

          await base44.asServiceRole.entities.Tip.create({
            sender_email: metadata.sender_email,
            receiver_creator_id: metadata.creator_id,
            amount_usd: amount,
            message: metadata.message || '',
            stream_id: metadata.stream_id || '',
            is_anonymous: metadata.is_anonymous === 'true',
            stripe_payment_intent: session.payment_intent
          });

          let tipPlatformFee = 0.15;
          try {
            const configs = await base44.asServiceRole.entities.PayoutConfig.filter(
              { config_name: 'default', is_active: true }, null, 1
            );
            if (configs[0]?.tip_platform_fee) tipPlatformFee = configs[0].tip_platform_fee;
          } catch (e) {
            console.warn('[stripeWebhook] PayoutConfig fetch failed, using default:', e.message);
          }

          const creators = await base44.asServiceRole.entities.Creator.filter({ id: metadata.creator_id }, null, 1);
          if (creators[0]) {
            const creatorEarning = amount * (1 - tipPlatformFee);
            const earningInDenarii = Math.floor(creatorEarning * 100);
            await base44.asServiceRole.entities.Creator.update(metadata.creator_id, {
              total_earnings_denarii: (creators[0].total_earnings_denarii || 0) + earningInDenarii
            });
            console.log('[stripeWebhook] Tip processed: $', amount, '→', earningInDenarii, 'denarii (fee:', tipPlatformFee, ')');
          }
        }

        // ── Denarii Purchase ──
        if (metadata.purchase_type === 'denarii' && metadata.user_email) {
          const denariiAmount = parseInt(metadata.denarii_amount) || 0;
          const bonusDenarii = parseInt(metadata.bonus_denarii) || 0;
          const totalDenarii = denariiAmount + bonusDenarii;
          const priceUsd = (session.amount_total || 0) / 100;

          if (denariiAmount <= 0) {
            console.error('[stripeWebhook] Invalid denarii amount:', metadata.denarii_amount);
            break;
          }

          // Duplicate payment intent guard
          const existingPurchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
            { stripe_payment_intent: session.payment_intent }, null, 1
          );
          if (existingPurchases.length > 0) {
            console.log('[stripeWebhook] Duplicate payment intent:', session.payment_intent);
            break;
          }

          const wallets = await base44.asServiceRole.entities.Wallet.filter(
            { user_email: metadata.user_email }, null, 1
          );

          if (wallets[0]) {
            await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
              denarii_balance: (wallets[0].denarii_balance || 0) + totalDenarii,
              total_spent: (wallets[0].total_spent || 0) + priceUsd
            });
          } else {
            await base44.asServiceRole.entities.Wallet.create({
              user_email: metadata.user_email,
              denarii_balance: totalDenarii,
              sestertii_balance: 0,
              as_balance: 0,
              total_spent: priceUsd,
              vip_level: 0
            });
          }

          await base44.asServiceRole.entities.CurrencyPurchase.create({
            user_email: metadata.user_email,
            package_name: metadata.package_id || metadata.package_name || 'Denarii Package',
            denarii_amount: denariiAmount,
            bonus_denarii: bonusDenarii,
            price_usd: priceUsd,
            stripe_payment_intent: session.payment_intent
          });

          console.log('[stripeWebhook] Denarii purchased:', totalDenarii, 'for', metadata.user_email);
        }

        // ── Host Subscription ──
        if (metadata.subscription_type === 'host_subscription' && metadata.user_email) {
          const planType = metadata.plan_type;
          const startDate = new Date();
          const expiryDate = new Date();
          if (planType === 'yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          await base44.asServiceRole.entities.CreatorSubscription.create({
            user_email: metadata.user_email,
            creator_id: metadata.creator_id || '',
            plan_type: planType,
            status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            current_period_start: startDate.toISOString(),
            current_period_end: expiryDate.toISOString()
          });
          console.log('[stripeWebhook] Host subscription created:', metadata.user_email, planType);
        }

        // ── Fan Club Membership ──
        if (metadata.type === 'fan_club_membership' && metadata.user_email) {
          const startDate = new Date();
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);

          await base44.asServiceRole.entities.FanClubMembership.create({
            user_email: metadata.user_email,
            creator_id: metadata.creator_id,
            tier: parseInt(metadata.tier) || 1,
            tier_name: metadata.tier_name || 'Member',
            status: 'active',
            stripe_subscription_id: session.subscription,
            start_date: startDate.toISOString(),
            expiry_date: expiryDate.toISOString(),
            price_usd: parseFloat(metadata.price_usd) || 0
          });
          console.log('[stripeWebhook] Fan club membership created:', metadata.user_email, '→', metadata.creator_id);
        }

        // ── PPV Ticket ──
        if (metadata.type === 'ppv_ticket' && metadata.user_email) {
          await base44.asServiceRole.entities.PPVTicket.create({
            event_id: metadata.event_id,
            user_email: metadata.user_email,
            status: 'valid',
            stripe_payment_intent: session.payment_intent,
            purchased_at: new Date().toISOString()
          });

          // Increment ticket count
          try {
            const events = await base44.asServiceRole.entities.PPVEvent.filter({ id: metadata.event_id }, null, 1);
            if (events[0]) {
              await base44.asServiceRole.entities.PPVEvent.update(metadata.event_id, {
                ticket_count: (events[0].ticket_count || 0) + 1
              });
            }
          } catch (e) {
            console.warn('[stripeWebhook] PPV ticket count update failed:', e.message);
          }
          console.log('[stripeWebhook] PPV ticket created:', metadata.event_id, metadata.user_email);
        }

        // ── Brand Campaign ──
        if (metadata.campaign_id) {
          await base44.asServiceRole.entities.BrandCampaign.update(metadata.campaign_id, {
            status: 'active',
            stripe_payment_intent: session.payment_intent,
            payment_amount: (session.amount_total || 0) / 100
          });

          if (metadata.brand_partner_id) {
            try {
              const partners = await base44.asServiceRole.entities.BrandPartner.filter(
                { id: metadata.brand_partner_id }, null, 1
              );
              if (partners[0]) {
                await base44.asServiceRole.entities.BrandPartner.update(metadata.brand_partner_id, {
                  total_spent: (partners[0].total_spent || 0) + ((session.amount_total || 0) / 100)
                });
              }
            } catch (e) {
              console.warn('[stripeWebhook] Brand partner update failed:', e.message);
            }
          }
          console.log('[stripeWebhook] Campaign activated:', metadata.campaign_id);
        }
        break;
      }

      // ═══════════════════════════════════════════
      // SUBSCRIPTION EVENTS
      // ═══════════════════════════════════════════
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('[stripeWebhook] Subscription updated:', subscription.id, subscription.status);

        const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
          { stripe_subscription_id: subscription.id }, null, 1
        );

        if (subs[0]) {
          const statusMap = { active: 'active', past_due: 'past_due', canceled: 'cancelled', unpaid: 'past_due' };
          const newStatus = statusMap[subscription.status] || subs[0].status;

          await base44.asServiceRole.entities.CreatorSubscription.update(subs[0].id, {
            status: newStatus,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
          console.log('[stripeWebhook] Subscription status →', newStatus);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('[stripeWebhook] Subscription deleted:', subscription.id);

        const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
          { stripe_subscription_id: subscription.id }, null, 1
        );

        if (subs[0]) {
          await base44.asServiceRole.entities.CreatorSubscription.update(subs[0].id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          });
        }

        // Also check fan club memberships
        const memberships = await base44.asServiceRole.entities.FanClubMembership.filter(
          { stripe_subscription_id: subscription.id }, null, 1
        );
        if (memberships[0]) {
          await base44.asServiceRole.entities.FanClubMembership.update(memberships[0].id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.error('[stripeWebhook] Invoice payment failed:', invoice.id, 'subscription:', invoice.subscription);

        if (invoice.subscription) {
          const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
            { stripe_subscription_id: invoice.subscription }, null, 1
          );
          if (subs[0]) {
            await base44.asServiceRole.entities.CreatorSubscription.update(subs[0].id, {
              status: 'past_due'
            });
            console.log('[stripeWebhook] Subscription marked past_due:', subs[0].id);
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        console.log('[stripeWebhook] Payment succeeded:', event.data.object.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        console.error('[stripeWebhook] Payment failed:', event.data.object.id, event.data.object.last_payment_error?.message);
        break;
      }

      default:
        console.log('[stripeWebhook] Unhandled event type:', event.type);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('[stripeWebhook] Fatal error processing event', eventId, ':', error.message, error.stack);
    return Response.json({ error: 'Internal processing error' }, { status: 500 });
  }
});