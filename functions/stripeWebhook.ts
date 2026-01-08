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

        // Handle Denarii Purchase
        if (metadata.purchase_type === 'denarii' && metadata.user_email) {
          const denariiAmount = parseInt(metadata.denarii_amount);
          const bonusDenarii = parseInt(metadata.bonus_denarii || 0);
          const totalDenarii = denariiAmount + bonusDenarii;

          // Update wallet
          const wallets = await base44.asServiceRole.entities.Wallet.filter(
            { user_email: metadata.user_email },
            null,
            1
          );

          if (wallets[0]) {
            await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
              denarii_balance: (wallets[0].denarii_balance || 0) + totalDenarii,
              total_spent: (wallets[0].total_spent || 0) + (session.amount_total / 100)
            });
          } else {
            await base44.asServiceRole.entities.Wallet.create({
              user_email: metadata.user_email,
              denarii_balance: totalDenarii,
              total_spent: session.amount_total / 100
            });
          }

          // Create purchase record
          await base44.asServiceRole.entities.CurrencyPurchase.create({
            user_email: metadata.user_email,
            package_name: metadata.package_id,
            denarii_amount: denariiAmount,
            bonus_denarii: bonusDenarii,
            price_usd: session.amount_total / 100,
            payment_method: 'stripe',
            transaction_id: session.payment_intent,
            status: 'completed'
          });

          console.log('[stripeWebhook] Denarii purchase completed:', totalDenarii, 'for', metadata.user_email);
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

      default:
        console.log('[stripeWebhook] Unhandled event type:', event.type);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[stripeWebhook] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});