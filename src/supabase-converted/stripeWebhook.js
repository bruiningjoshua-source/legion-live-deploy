/* eslint-disable no-undef */
// ═══ CONVERTED: stripeWebhook — Base44 → Supabase Edge Function ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

const processedEventsCache = new Map();
const purchaseHistory = new Map();

function validatePurchaseAmount(amount, email) {
  if (!purchaseHistory.has(email)) purchaseHistory.set(email, { purchases: [], chargebacks: [] });
  const history = purchaseHistory.get(email);
  const now = Date.now();
  history.purchases = history.purchases.filter(p => p.timestamp > now - 86400000);
  const totalLast24 = history.purchases.reduce((sum, p) => sum + p.amount, 0);
  if (totalLast24 + amount > 10000) console.warn(`[stripeWebhook] High velocity for ${email}: ${totalLast24 + amount}`);
  if (amount > 5000) console.warn(`[stripeWebhook] HIGH VALUE: ${email} - $${amount}`);
  history.purchases.push({ amount, timestamp: now });
  return true;
}

setInterval(() => {
  const cutoff = Date.now() - 3600000;
  for (const [key, ts] of processedEventsCache) {
    if (ts < cutoff) processedEventsCache.delete(key);
  }
}, 600000);

Deno.serve(async (req) => {
  let eventId = 'unknown';
  try {
    // NOTE: Stripe webhooks don't carry a user JWT — use service role directly
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) return Response.json({ error: 'Missing signature' }, { status: 400 });

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return Response.json({ error: 'Webhook not configured' }, { status: 500 });

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('[stripeWebhook] Signature failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    eventId = event.id;

    // Idempotency: memory cache
    if (processedEventsCache.has(eventId)) {
      return Response.json({ received: true, duplicate: true });
    }
    // Idempotency: DB check
    const { data: existingLogs } = await supabase
      .from('wallet_audit_log')
      .select('id')
      .eq('action', 'webhook_processed')
      .eq('related_entity_id', eventId)
      .limit(1);
    if ((existingLogs || []).length > 0) {
      processedEventsCache.set(eventId, Date.now());
      return Response.json({ received: true, duplicate: true });
    }
    processedEventsCache.set(eventId, Date.now());
    await supabase.from('wallet_audit_log').insert({
      user_email: 'system', action: 'webhook_processed', amount_denarii: 0, new_balance: 0,
      related_entity_id: eventId, reason: `Stripe webhook: ${event.type}`,
      timestamp_utc: new Date().toISOString()
    }).catch(() => {});

    console.log('[stripeWebhook] Processing:', event.type, eventId);

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata || {};
        console.log('[stripeWebhook] Checkout completed:', session.id, JSON.stringify(metadata));

        // ── Creator Monetization ──
        if (metadata.purchase_type === 'creator_monetization' && metadata.creator_id) {
          const planType = metadata.plan_type;
          const startDate = new Date();
          const expiryDate = new Date();
          if (planType === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
          else expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          const userEmail = metadata.user_email || session.customer_email || '';

          const { data: existingSubs } = await supabase
            .from('creator_subscription')
            .select('*')
            .eq('creator_id', metadata.creator_id)
            .eq('status', 'active')
            .limit(1);

          if ((existingSubs || [])[0]) {
            await supabase.from('creator_subscription').update({
              plan_type: planType, user_email: userEmail,
              stripe_subscription_id: session.subscription || session.payment_intent,
              stripe_customer_id: session.customer,
              start_date: startDate.toISOString(), expiry_date: expiryDate.toISOString(),
              auto_renew: planType === 'monthly'
            }).eq('id', existingSubs[0].id);
          } else {
            await supabase.from('creator_subscription').insert({
              creator_id: metadata.creator_id, user_email: userEmail,
              plan_type: planType, status: 'active',
              stripe_subscription_id: session.subscription || session.payment_intent,
              stripe_customer_id: session.customer,
              start_date: startDate.toISOString(), expiry_date: expiryDate.toISOString(),
              auto_renew: planType === 'monthly'
            });
          }
          console.log('[stripeWebhook] Creator monetization activated:', metadata.creator_id);
        }

        // ── Tip ──
        if (metadata.purchase_type === 'tip' && metadata.creator_id) {
          const amount = parseFloat(metadata.amount_usd);
          if (isNaN(amount) || amount <= 0) break;

          await supabase.from('tip').insert({
            sender_email: metadata.sender_email, receiver_creator_id: metadata.creator_id,
            amount_usd: amount, message: metadata.message || '',
            stream_id: metadata.stream_id || '', is_anonymous: metadata.is_anonymous === 'true',
            stripe_payment_intent: session.payment_intent
          });

          let tipPlatformFee = 0.15;
          const { data: configs } = await supabase
            .from('payout_config')
            .select('tip_platform_fee')
            .eq('config_name', 'default')
            .eq('is_active', true)
            .limit(1);
          if ((configs || [])[0]?.tip_platform_fee) tipPlatformFee = configs[0].tip_platform_fee;

          const { data: creators } = await supabase.from('creator').select('*').eq('id', metadata.creator_id).limit(1);
          if ((creators || [])[0]) {
            const creatorEarningUsd = amount * (1 - tipPlatformFee);
            const earningInDenarii = Math.floor(creatorEarningUsd * 180);
            await supabase.from('creator').update({
              total_earnings_denarii: (creators[0].total_earnings_denarii || 0) + earningInDenarii
            }).eq('id', metadata.creator_id);
            const { data: cw } = await supabase.from('wallet').select('*').eq('user_email', creators[0].user_email).limit(1);
            if ((cw || [])[0]) {
              await supabase.from('wallet').update({
                denarii_balance: (cw[0].denarii_balance || 0) + earningInDenarii
              }).eq('id', cw[0].id);
            }
          }
        }

        // ── Denarii Purchase ──
        if (metadata.purchase_type === 'denarii' && metadata.user_email) {
          const denariiAmount = parseInt(metadata.denarii_amount) || 0;
          const priceUsd = (session.amount_total || 0) / 100;
          if (denariiAmount <= 0 || denariiAmount > 1000000 || priceUsd < 0.99 || priceUsd > 100000) break;

          validatePurchaseAmount(priceUsd, metadata.user_email);

          // Server-side bonus calculation
          let bonusDenarii = 0;
          if (priceUsd >= 100) bonusDenarii = Math.floor(denariiAmount * 0.35);
          else if (priceUsd >= 50) bonusDenarii = Math.floor(denariiAmount * 0.25);
          else if (priceUsd >= 20) bonusDenarii = Math.floor(denariiAmount * 0.20);
          else if (priceUsd >= 10) bonusDenarii = Math.floor(denariiAmount * 0.15);
          else if (priceUsd >= 5) bonusDenarii = Math.floor(denariiAmount * 0.12);
          else bonusDenarii = Math.floor(denariiAmount * 0.10);
          const totalDenarii = denariiAmount + bonusDenarii;

          // Duplicate guard
          const { data: existingPurchases } = await supabase
            .from('currency_purchase')
            .select('id')
            .eq('stripe_payment_intent', session.payment_intent)
            .limit(1);
          if ((existingPurchases || []).length > 0) break;

          const { data: wallets } = await supabase.from('wallet').select('*').eq('user_email', metadata.user_email).limit(1);
          const vipPointsAwarded = Math.floor(priceUsd * 10);
          const lottoTicketsAwarded = Math.floor(priceUsd / 10);

          const VIP_THRESHOLDS = [0, 500, 1500, 4000, 10000, 25000, 60000, 150000, 500000];

          if ((wallets || [])[0]) {
            const w = wallets[0];
            const newVipPoints = (w.vip_points || 0) + vipPointsAwarded;
            let newVipLevel = 0;
            for (let i = VIP_THRESHOLDS.length - 1; i >= 0; i--) {
              if (newVipPoints >= VIP_THRESHOLDS[i]) { newVipLevel = i; break; }
            }
            await supabase.from('wallet').update({
              denarii_balance: (w.denarii_balance || 0) + totalDenarii,
              total_spent: (w.total_spent || 0) + priceUsd,
              total_purchased_usd: (w.total_purchased_usd || 0) + priceUsd,
              vip_points: newVipPoints, vip_level: newVipLevel,
              lotto_tickets: (w.lotto_tickets || 0) + lottoTicketsAwarded,
            }).eq('id', w.id);
          } else {
            await supabase.from('wallet').insert({
              user_email: metadata.user_email, denarii_balance: totalDenarii,
              sestertii_balance: 0, as_balance: 0,
              total_spent: priceUsd, total_purchased_usd: priceUsd,
              vip_points: vipPointsAwarded, vip_level: 0, lotto_tickets: lottoTicketsAwarded,
            });
          }

          await supabase.from('currency_purchase').insert({
            user_email: metadata.user_email,
            package_name: metadata.package_id || metadata.package_name || 'Denarii Package',
            denarii_amount: denariiAmount, bonus_denarii: bonusDenarii,
            price_usd: priceUsd, stripe_payment_intent: session.payment_intent,
            conversion_rate: denariiAmount / priceUsd,
            vip_multiplier_applied: 1.0, timestamp_usd_per_denarii: 1 / 180
          });

          console.log('[stripeWebhook] Denarii purchased:', totalDenarii, 'for', metadata.user_email);

          // Send email (call transactionalEmail function)
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transactionalEmail`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`
            },
            body: JSON.stringify({
              action: 'send_purchase_confirmation',
              userEmail: metadata.user_email,
              userName: metadata.user_name || metadata.user_email,
              orderId: session.payment_intent,
              itemName: metadata.package_name || 'Denarii Package',
              amount: priceUsd.toFixed(2)
            })
          }).catch(e => console.warn('[stripeWebhook] Email failed:', e.message));
        }

        // ── Host Subscription ──
        if (metadata.subscription_type === 'host_subscription' && metadata.user_email) {
          const planType = metadata.plan_type;
          const startDate = new Date();
          const expiryDate = new Date();
          if (planType === 'yearly') expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          else expiryDate.setMonth(expiryDate.getMonth() + 1);

          await supabase.from('creator_subscription').insert({
            user_email: metadata.user_email, creator_id: metadata.creator_id || '',
            plan_type: planType, status: 'active',
            stripe_subscription_id: session.subscription, stripe_customer_id: session.customer,
            current_period_start: startDate.toISOString(), current_period_end: expiryDate.toISOString()
          });
        }

        // ── Fan Club ──
        if (metadata.type === 'fan_club_membership' && metadata.user_email) {
          const startDate = new Date();
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);
          await supabase.from('fan_club_membership').insert({
            user_email: metadata.user_email, creator_id: metadata.creator_id,
            tier: parseInt(metadata.tier) || 1, tier_name: metadata.tier_name || 'Member',
            status: 'active', stripe_subscription_id: session.subscription,
            start_date: startDate.toISOString(), expiry_date: expiryDate.toISOString(),
            price_usd: parseFloat(metadata.price_usd) || 0
          });
        }

        // ── PPV Ticket ──
        if (metadata.type === 'ppv_ticket' && metadata.user_email) {
          await supabase.from('ppv_ticket').insert({
            event_id: metadata.event_id, user_email: metadata.user_email,
            status: 'valid', stripe_payment_intent: session.payment_intent,
            purchased_at: new Date().toISOString()
          });
          const { data: events } = await supabase.from('ppv_event').select('ticket_count').eq('id', metadata.event_id).limit(1);
          if ((events || [])[0]) {
            await supabase.from('ppv_event').update({
              ticket_count: (events[0].ticket_count || 0) + 1
            }).eq('id', metadata.event_id);
          }
        }

        // ── Brand Campaign ──
        if (metadata.campaign_id) {
          await supabase.from('brand_campaign').update({
            status: 'active', stripe_payment_intent: session.payment_intent,
            payment_amount: (session.amount_total || 0) / 100
          }).eq('id', metadata.campaign_id);
          if (metadata.brand_partner_id) {
            const { data: partners } = await supabase.from('brand_partner').select('total_spent').eq('id', metadata.brand_partner_id).limit(1);
            if ((partners || [])[0]) {
              await supabase.from('brand_partner').update({
                total_spent: (partners[0].total_spent || 0) + ((session.amount_total || 0) / 100)
              }).eq('id', metadata.brand_partner_id);
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { data: subs } = await supabase
          .from('creator_subscription')
          .select('*')
          .eq('stripe_subscription_id', subscription.id)
          .limit(1);
        if ((subs || [])[0]) {
          const statusMap = { active: 'active', past_due: 'past_due', canceled: 'cancelled', unpaid: 'past_due' };
          await supabase.from('creator_subscription').update({
            status: statusMap[subscription.status] || subs[0].status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          }).eq('id', subs[0].id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { data: subs } = await supabase
          .from('creator_subscription')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .limit(1);
        if ((subs || [])[0]) {
          await supabase.from('creator_subscription').update({
            status: 'cancelled', cancelled_at: new Date().toISOString()
          }).eq('id', subs[0].id);
        }
        const { data: memberships } = await supabase
          .from('fan_club_membership')
          .select('id')
          .eq('stripe_subscription_id', subscription.id)
          .limit(1);
        if ((memberships || [])[0]) {
          await supabase.from('fan_club_membership').update({
            status: 'cancelled', cancelled_at: new Date().toISOString()
          }).eq('id', memberships[0].id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const { data: subs } = await supabase
            .from('creator_subscription')
            .select('id')
            .eq('stripe_subscription_id', invoice.subscription)
            .limit(1);
          if ((subs || [])[0]) {
            await supabase.from('creator_subscription').update({ status: 'past_due' }).eq('id', subs[0].id);
          }
        }
        break;
      }

      case 'payment_intent.succeeded':
        console.log('[stripeWebhook] Payment succeeded:', event.data.object.id);
        break;

      case 'payment_intent.payment_failed':
        console.error('[stripeWebhook] Payment failed:', event.data.object.id);
        break;

      case 'charge.dispute.created': {
        const charge = event.data.object;
        console.error('[stripeWebhook] Chargeback:', charge.id, 'amount:', charge.amount / 100);

        // Alert (call stripeAlertNotifier)
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/stripeAlertNotifier`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}` },
          body: JSON.stringify({ event_type: 'charge.dispute.created', charge_id: charge.id, amount_usd: charge.amount / 100 })
        }).catch(() => {});

        const { data: purchases } = await supabase
          .from('currency_purchase')
          .select('*')
          .eq('stripe_payment_intent', charge.payment_intent)
          .limit(1);

        if ((purchases || [])[0]) {
          const purchase = purchases[0];
          const userEmail = purchase.user_email;
          const denarii = purchase.denarii_amount + (purchase.bonus_denarii || 0);

          const { data: wallets } = await supabase.from('wallet').select('*').eq('user_email', userEmail).limit(1);
          if ((wallets || [])[0]) {
            const oldBalance = wallets[0].denarii_balance || 0;
            const newBalance = Math.max(0, oldBalance - denarii);
            await supabase.from('wallet').update({ denarii_balance: newBalance }).eq('id', wallets[0].id);

            await supabase.from('wallet_audit_log').insert({
              user_email: userEmail, wallet_id: wallets[0].id,
              action: 'chargeback', amount_denarii: -denarii,
              previous_balance: oldBalance, new_balance: newBalance,
              related_entity_id: purchase.id, reason: `Chargeback dispute: ${charge.id}`,
              timestamp_utc: new Date().toISOString()
            }).catch(() => {});
          }

          const { data: users } = await supabase.from('user').select('*').eq('email', userEmail).limit(1);
          if ((users || [])[0]) {
            const newCount = (users[0].chargeback_count || 0) + 1;
            const shouldSuspend = newCount >= 3;
            await supabase.from('user').update({
              flagged_for_chargeback: true, chargeback_count: newCount,
              ...(shouldSuspend ? { isSuspended: true, suspensionReason: '3+ chargebacks' } : {})
            }).eq('id', users[0].id);

            if (shouldSuspend) {
              console.error(`[stripeWebhook] AUTO-SUSPENDED ${userEmail} — ${newCount} chargebacks`);
              await supabase.from('notification').insert({
                user_email: 'admin', type: 'chargeback_auto_suspend',
                title: 'User Auto-Suspended: 3+ Chargebacks',
                message: `${userEmail} suspended after ${newCount} chargebacks. Dispute: ${charge.id}`,
                is_read: false
              }).catch(() => {});
            }

            // Send chargeback email
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transactionalEmail`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}` },
              body: JSON.stringify({
                action: 'send_chargeback_notice', userEmail,
                userName: users[0].full_name || userEmail,
                chargeId: charge.id, reversedAmount: denarii
              })
            }).catch(() => {});
          }
        }
        break;
      }

      default:
        console.log('[stripeWebhook] Unhandled:', event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] Fatal error:', eventId, error.message);
    return Response.json({ error: 'Internal processing error' }, { status: 500 });
  }
});