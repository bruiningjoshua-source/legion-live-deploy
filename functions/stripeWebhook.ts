import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      console.error('[stripeWebhook] No signature provided');
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event;
    try {
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        console.warn('[stripeWebhook] No webhook secret configured, skipping verification');
        event = JSON.parse(body);
      } else {
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret
        );
      }
    } catch (err) {
      console.error('[stripeWebhook] Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('[stripeWebhook] Event received:', event.type, event.id);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const metadata = session.metadata;

        console.log('[stripeWebhook] Checkout completed:', session.id, metadata);

        // Handle Creator Monetization Subscription
        if (metadata.purchase_type === 'creator_monetization' && metadata.creator_id) {
          const planType = metadata.plan_type;
          const creatorId = metadata.creator_id;

          const startDate = new Date();
          const expiryDate = new Date();
          if (planType === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          }

          // Create or update creator subscription
          const existingSubs = await base44.asServiceRole.entities.CreatorSubscription.filter(
            { creator_id: creatorId, status: 'active' },
            null,
            1
          );

          if (existingSubs[0]) {
            await base44.asServiceRole.entities.CreatorSubscription.update(existingSubs[0].id, {
              plan_type: planType,
              stripe_subscription_id: session.subscription || session.payment_intent,
              stripe_customer_id: session.customer,
              start_date: startDate.toISOString(),
              expiry_date: expiryDate.toISOString(),
              auto_renew: planType === 'monthly'
            });
          } else {
            await base44.asServiceRole.entities.CreatorSubscription.create({
              creator_id: creatorId,
              plan_type: planType,
              status: 'active',
              stripe_subscription_id: session.subscription || session.payment_intent,
              stripe_customer_id: session.customer,
              start_date: startDate.toISOString(),
              expiry_date: expiryDate.toISOString(),
              auto_renew: planType === 'monthly'
            });
          }

          console.log('[stripeWebhook] Creator monetization activated:', creatorId);
        }

        // Handle Tip
        if (metadata.purchase_type === 'tip' && metadata.creator_id) {
          const amount = parseFloat(metadata.amount_usd);

          // Create tip record
          await base44.asServiceRole.entities.Tip.create({
            sender_email: metadata.sender_email,
            receiver_creator_id: metadata.creator_id,
            amount_usd: amount,
            message: metadata.message,
            stream_id: metadata.stream_id,
            is_anonymous: metadata.is_anonymous === 'true',
            stripe_payment_intent: session.payment_intent
          });

          // Update creator earnings
          const creators = await base44.asServiceRole.entities.Creator.filter(
            { id: metadata.creator_id },
            null,
            1
          );
          if (creators[0]) {
            const platformFee = amount * 0.15; // 15% platform fee
            const creatorEarning = amount - platformFee;
            const earningInDenarii = Math.floor(creatorEarning * 100); // $1 = 100 denarii

            await base44.asServiceRole.entities.Creator.update(metadata.creator_id, {
              total_earnings_denarii: (creators[0].total_earnings_denarii || 0) + earningInDenarii
            });
          }

          console.log('[stripeWebhook] Tip processed:', amount, 'for creator:', metadata.creator_id);
        }

        // Handle Denarii Purchase
        if (metadata.purchase_type === 'denarii' && metadata.user_email) {
          const denariiAmount = parseInt(metadata.denarii_amount) || 0;
          const bonusDenarii = parseInt(metadata.bonus_denarii) || 0;
          const totalDenarii = denariiAmount + bonusDenarii;
          const priceUsd = (session.amount_total || 0) / 100;

          console.log('[stripeWebhook] Processing denarii purchase:', {
            user_email: metadata.user_email,
            denariiAmount,
            bonusDenarii,
            totalDenarii,
            priceUsd
          });

          // Check for duplicate payment intent
          const existingPurchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
            { stripe_payment_intent: session.payment_intent },
            null,
            1
          );

          if (existingPurchases.length > 0) {
            console.log('[stripeWebhook] Duplicate payment intent, skipping:', session.payment_intent);
            break;
          }

          // Update wallet
          const wallets = await base44.asServiceRole.entities.Wallet.filter(
            { user_email: metadata.user_email },
            null,
            1
          );

          console.log('[stripeWebhook] Found wallet:', wallets[0]?.id, 'Current balance:', wallets[0]?.denarii_balance);

          if (wallets[0]) {
            const newBalance = (wallets[0].denarii_balance || 0) + totalDenarii;
            const newSpent = (wallets[0].total_spent || 0) + priceUsd;
            
            await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
              denarii_balance: newBalance,
              total_spent: newSpent
            });
            
            console.log('[stripeWebhook] Updated wallet balance:', newBalance);
          } else {
            const newWallet = await base44.asServiceRole.entities.Wallet.create({
              user_email: metadata.user_email,
              denarii_balance: totalDenarii,
              sestertii_balance: 0,
              as_balance: 0,
              total_spent: priceUsd,
              vip_level: 0
            });
            console.log('[stripeWebhook] Created new wallet:', newWallet.id);
          }

          // Create purchase record
          await base44.asServiceRole.entities.CurrencyPurchase.create({
            user_email: metadata.user_email,
            package_name: metadata.package_id || metadata.package_name || 'Denarii Package',
            denarii_amount: denariiAmount,
            bonus_denarii: bonusDenarii,
            price_usd: priceUsd,
            stripe_payment_intent: session.payment_intent,
            status: 'completed'
          });

          console.log('[stripeWebhook] Denarii purchase completed:', totalDenarii, 'for', metadata.user_email);
        }

        // Handle Host Subscription
        if (metadata.subscription_type === 'host_subscription' && metadata.user_email) {
          const planType = metadata.plan_type;
          const creatorId = metadata.creator_id;

          const startDate = new Date();
          const expiryDate = new Date();
          if (planType === 'yearly') {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          } else {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          }

          // Create host subscription record
          await base44.asServiceRole.entities.CreatorSubscription.create({
            user_email: metadata.user_email,
            creator_id: creatorId || '',
            plan_type: planType,
            status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            current_period_start: startDate.toISOString(),
            current_period_end: expiryDate.toISOString()
          });

          console.log('[stripeWebhook] Host subscription created:', metadata.user_email, planType);
        }

        // Handle Brand Campaign
        if (metadata.campaign_id) {
          // Update campaign status and payment info
          await base44.asServiceRole.entities.BrandCampaign.update(metadata.campaign_id, {
            status: 'active',
            stripe_payment_intent: session.payment_intent,
            payment_amount: session.amount_total / 100
          });

          // Update brand partner total spent
          const partners = await base44.asServiceRole.entities.BrandPartner.filter(
            { id: metadata.brand_partner_id }, 
            null, 
            1
          );
          if (partners[0]) {
            await base44.asServiceRole.entities.BrandPartner.update(metadata.brand_partner_id, {
              total_spent: (partners[0].total_spent || 0) + (session.amount_total / 100)
            });
          }

          console.log('[stripeWebhook] Campaign updated:', metadata.campaign_id);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log('[stripeWebhook] Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.error('[stripeWebhook] Payment failed:', paymentIntent.id);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('[stripeWebhook] Subscription updated:', subscription.id, subscription.status);
        
        // Find and update the subscription record
        const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
          { stripe_subscription_id: subscription.id },
          null,
          1
        );
        
        if (subs[0]) {
          const status = subscription.status === 'active' ? 'active' : 
                        subscription.status === 'past_due' ? 'past_due' : 
                        subscription.status === 'canceled' ? 'cancelled' : subs[0].status;
          
          await base44.asServiceRole.entities.CreatorSubscription.update(subs[0].id, {
            status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          });
          console.log('[stripeWebhook] Subscription status updated:', subs[0].id, status);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('[stripeWebhook] Subscription deleted:', subscription.id);
        
        const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
          { stripe_subscription_id: subscription.id },
          null,
          1
        );
        
        if (subs[0]) {
          await base44.asServiceRole.entities.CreatorSubscription.update(subs[0].id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          });
          console.log('[stripeWebhook] Subscription cancelled:', subs[0].id);
        }
        break;
      }

      default:
        console.log('[stripeWebhook] Unhandled event type:', event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});