import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// ─── Idempotency: DB-backed (cold-start safe), memory is fast-path only ───
const processedEventsCache = new Map(); // eventId → timestamp (fast path only)

// ─── Fraud detection for purchases ───
const purchaseHistory = new Map(); // email -> { purchases: [], chargebacks: [] }

function validatePurchaseAmount(amount, email) {
  if (!purchaseHistory.has(email)) {
    purchaseHistory.set(email, { purchases: [], chargebacks: [] });
  }

  const history = purchaseHistory.get(email);
  const now = Date.now();
  const oneDayAgo = now - 86400000;

  // Prune old purchases
  history.purchases = history.purchases.filter(p => p.timestamp > oneDayAgo);

  // Check: $1000+ in 24 hours
  const totalLast24 = history.purchases.reduce((sum, p) => sum + p.amount, 0);
  if (totalLast24 + amount > 10000) {
    console.warn(`[stripeWebhook] High purchase velocity for ${email}: ${totalLast24 + amount} in 24h`);
  }

  // Check: Single purchase > $5000 (needs manual review)
  if (amount > 5000) {
    console.warn(`[stripeWebhook] HIGH VALUE PURCHASE: ${email} - $${amount}`);
  }

  history.purchases.push({ amount, timestamp: now });
  return true;
}

// Periodic cache cleanup
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  for (const [key, ts] of processedEventsCache) {
    if (ts < cutoff) processedEventsCache.delete(key);
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

    // Idempotency: memory fast-path first
    if (processedEventsCache.has(eventId)) {
      console.log('[stripeWebhook] Duplicate event skipped (cache):', eventId);
      return Response.json({ received: true, duplicate: true });
    }
    // DB check — survives cold starts
    try {
      const existingLogs = await base44.asServiceRole.entities.WalletAuditLog.filter(
        { action: 'webhook_processed', related_entity_id: eventId }, null, 1
      );
      if (existingLogs.length > 0) {
        console.log('[stripeWebhook] Duplicate event skipped (DB):', eventId);
        processedEventsCache.set(eventId, Date.now());
        return Response.json({ received: true, duplicate: true });
      }
    } catch (e) {
      console.warn('[stripeWebhook] Idempotency DB check failed, proceeding:', e.message);
    }
    // Mark processed immediately before any async work
    processedEventsCache.set(eventId, Date.now());
    try {
      await base44.asServiceRole.entities.WalletAuditLog.create({
        user_email: 'system', action: 'webhook_processed', amount_denarii: 0, new_balance: 0,
        related_entity_id: eventId, reason: `Stripe webhook: ${event.type}`,
        timestamp_utc: new Date().toISOString()
      });
    } catch (e) {
      console.warn('[stripeWebhook] Failed to record webhook idempotency:', e.message);
    }

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
            // Platform rate: 260 Denarii per $1 USD sold. Creator earns their share of that.
            const creatorEarningUsd = amount * (1 - tipPlatformFee);
            const earningInDenarii = Math.floor(creatorEarningUsd * 260);
            await base44.asServiceRole.entities.Creator.update(metadata.creator_id, {
              total_earnings_denarii: (creators[0].total_earnings_denarii || 0) + earningInDenarii
            });
            // Also credit spendable wallet
            const creatorWallets = await base44.asServiceRole.entities.Wallet.filter(
              { user_email: creators[0].user_email }, null, 1
            );
            if (creatorWallets[0]) {
              await base44.asServiceRole.entities.Wallet.update(creatorWallets[0].id, {
                denarii_balance: (creatorWallets[0].denarii_balance || 0) + earningInDenarii
              });
            }
            console.log('[stripeWebhook] Tip processed: $', amount, '→', earningInDenarii, 'denarii @ 260:1 rate (fee:', tipPlatformFee, ')');
          }
        }

        // ── Denarii Purchase ──
        if (metadata.purchase_type === 'denarii' && metadata.user_email) {
          const denariiAmount = parseInt(metadata.denarii_amount) || 0;
          const priceUsd = (session.amount_total || 0) / 100;

          // Input validation
          if (denariiAmount <= 0 || denariiAmount > 1000000) {
            console.error('[stripeWebhook] INVALID denarii amount:', metadata.denarii_amount);
            break;
          }
          if (priceUsd < 0.99 || priceUsd > 100000) {
            console.error('[stripeWebhook] INVALID price: $' + priceUsd);
            break;
          }

          // Fraud check
          validatePurchaseAmount(priceUsd, metadata.user_email);

          // REVENUE FIX: Calculate bonus server-side to prevent client-side manipulation
          let bonusDenarii = 0;
          if (priceUsd >= 100) {
            bonusDenarii = Math.floor(denariiAmount * 0.35); // 35% for $100+
          } else if (priceUsd >= 50) {
            bonusDenarii = Math.floor(denariiAmount * 0.25); // 25% for $50+
          } else if (priceUsd >= 20) {
            bonusDenarii = Math.floor(denariiAmount * 0.20); // 20% for $20+
          } else if (priceUsd >= 10) {
            bonusDenarii = Math.floor(denariiAmount * 0.15); // 15% for $10+
          } else if (priceUsd >= 5) {
            bonusDenarii = Math.floor(denariiAmount * 0.12); // 12% for $5+
          } else {
            bonusDenarii = Math.floor(denariiAmount * 0.10); // 10% for <$5
          }

          const totalDenarii = denariiAmount + bonusDenarii;

          // Duplicate payment intent guard (check both payment_intent and session id)
          const existingPurchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
            { stripe_payment_intent: session.payment_intent }, null, 1
          );
          if (existingPurchases.length > 0) {
            console.log('[stripeWebhook] Duplicate payment intent skipped:', session.payment_intent);
            break;
          }

          const wallets = await base44.asServiceRole.entities.Wallet.filter(
            { user_email: metadata.user_email }, null, 1
          );

          // REVENUE FIX: Calculate VIP/lotto server-side (prevent inflation)
          const vipPointsAwarded = Math.floor(priceUsd * 10); // 10 points per $1 (locked)
          const lottoTicketsAwarded = Math.floor(priceUsd / 10); // 1 ticket per $10 (locked)

          if (wallets[0]) {
            const newVipPoints = (wallets[0].vip_points || 0) + vipPointsAwarded;
            // Compute VIP level from points
            const VIP_THRESHOLDS = [0, 500, 1500, 4000, 10000, 25000, 60000, 150000, 500000];
            let newVipLevel = 0;
            for (let i = VIP_THRESHOLDS.length - 1; i >= 0; i--) {
              if (newVipPoints >= VIP_THRESHOLDS[i]) { newVipLevel = i; break; }
            }
            await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
              denarii_balance: (wallets[0].denarii_balance || 0) + totalDenarii,
              total_spent: (wallets[0].total_spent || 0) + priceUsd,
              total_purchased_usd: (wallets[0].total_purchased_usd || 0) + priceUsd,
              vip_points: newVipPoints,
              vip_level: newVipLevel,
              lotto_tickets: (wallets[0].lotto_tickets || 0) + lottoTicketsAwarded,
            });
            console.log('[stripeWebhook] VIP points awarded:', vipPointsAwarded, '→ total', newVipPoints, 'level', newVipLevel);
          } else {
            await base44.asServiceRole.entities.Wallet.create({
              user_email: metadata.user_email,
              denarii_balance: totalDenarii,
              sestertii_balance: 0,
              as_balance: 0,
              total_spent: priceUsd,
              total_purchased_usd: priceUsd,
              vip_points: vipPointsAwarded,
              vip_level: 0,
              lotto_tickets: lottoTicketsAwarded,
            });
          }

          // REVENUE FIX: Record vip_multiplier and conversion rate for audit
          await base44.asServiceRole.entities.CurrencyPurchase.create({
            user_email: metadata.user_email,
            package_name: metadata.package_id || metadata.package_name || 'Denarii Package',
            denarii_amount: denariiAmount,
            bonus_denarii: bonusDenarii,
            price_usd: priceUsd,
            stripe_payment_intent: session.payment_intent,
            conversion_rate: denariiAmount / priceUsd, // Track rate for analytics
            vip_multiplier_applied: 1.0, // Always 1.0 (no multiplier boost at purchase time)
            timestamp_usd_per_denarii: 1 / 260 // Fixed rate: 260 Denarii/$1
          });

          console.log('[stripeWebhook] Denarii purchased:', totalDenarii, 'for', metadata.user_email, '| base:', denariiAmount, '+ bonus:', bonusDenarii, '@ ratio', (denariiAmount / priceUsd).toFixed(0), ':1');

          // Send purchase confirmation email
          try {
            await base44.asServiceRole.functions.invoke('transactionalEmail', {
              action: 'send_purchase_confirmation',
              userEmail: metadata.user_email,
              userName: metadata.user_name || metadata.user_email,
              orderId: session.payment_intent,
              itemName: metadata.package_name || 'Denarii Package',
              amount: priceUsd.toFixed(2)
            });
          } catch (e) {
            console.warn('[stripeWebhook] Purchase email failed:', e.message);
          }
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

      // ═══════════════════════════════════════════
      // CHARGEBACK / DISPUTE HANDLING
      // ═══════════════════════════════════════════
      case 'charge.dispute.created': {
        const charge = event.data.object;
        console.error('[stripeWebhook] Chargeback initiated:', charge.id, 'amount:', charge.amount / 100);

        // Find the related CurrencyPurchase by payment intent
        const purchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
          { stripe_payment_intent: charge.payment_intent }, null, 1
        );

        if (purchases[0]) {
          const purchase = purchases[0];
          const userEmail = purchase.user_email;
          const denarii = purchase.denarii_amount + (purchase.bonus_denarii || 0);

          // Debit the user's wallet (reverse the purchase)
          const wallets = await base44.asServiceRole.entities.Wallet.filter(
            { user_email: userEmail }, null, 1
          );

          if (wallets[0]) {
            const oldBalance = wallets[0].denarii_balance || 0;
            const newBalance = Math.max(0, oldBalance - denarii);
            await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
              denarii_balance: newBalance
            });

            // SECURITY FIX: Log chargeback to audit trail
            await base44.asServiceRole.entities.WalletAuditLog.create({
              user_email: userEmail,
              wallet_id: wallets[0].id,
              action: 'chargeback',
              amount_denarii: -denarii,
              previous_balance: oldBalance,
              new_balance: newBalance,
              related_entity_id: purchase.id,
              reason: `Chargeback dispute: ${charge.id}`,
              timestamp_utc: new Date().toISOString()
            }).catch(e => console.warn('[stripeWebhook] Chargeback audit log failed:', e.message));

            console.log('[stripeWebhook] Chargeback: Reversed', denarii, 'denarii from', userEmail);
          }

          // Flag the user and auto-suspend at 3+ chargebacks
          const users = await base44.asServiceRole.entities.User.filter({ email: userEmail }, null, 1);
          if (users[0]) {
            const newChargebackCount = (users[0].chargeback_count || 0) + 1;
            const shouldSuspend = newChargebackCount >= 3;

            await base44.asServiceRole.entities.User.update(users[0].id, {
              flagged_for_chargeback: true,
              chargeback_count: newChargebackCount,
              ...(shouldSuspend ? { isSuspended: true, suspensionReason: '3+ chargebacks' } : {})
            }).catch(e => console.warn('[stripeWebhook] User flag failed:', e.message));

            if (shouldSuspend) {
              console.error(`[stripeWebhook] AUTO-SUSPENDED ${userEmail} — ${newChargebackCount} chargebacks`);
              // Create admin notification record
              await base44.asServiceRole.entities.Notification.create({
                user_email: 'admin',
                type: 'chargeback_auto_suspend',
                title: 'User Auto-Suspended: 3+ Chargebacks',
                message: `${userEmail} was automatically suspended after ${newChargebackCount} chargebacks. Dispute: ${charge.id}`,
                is_read: false,
                created_date: new Date().toISOString()
              }).catch(e => console.warn('[stripeWebhook] Admin notification failed:', e.message));
            }

            // Send chargeback notification to user
            try {
              await base44.asServiceRole.functions.invoke('transactionalEmail', {
                action: 'send_chargeback_notice',
                userEmail: userEmail,
                userName: users[0].full_name || userEmail,
                chargeId: charge.id,
                reversedAmount: denarii
              });
            } catch (e) {
              console.warn('[stripeWebhook] Chargeback notification email failed:', e.message);
            }
          }
        }
        break;
      }

      case 'charge.dispute.updated': {
        const charge = event.data.object;
        console.error('[stripeWebhook] Dispute status updated:', charge.id, '→', charge.dispute.status);
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