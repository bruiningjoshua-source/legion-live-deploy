import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[createHostSubscription] Unauthorized - no user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, creatorId } = await req.json();

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      console.error('[createHostSubscription] Invalid plan:', plan);
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    console.log('[createHostSubscription] Creating subscription for:', user.email, 'Plan:', plan);

    // Price configuration - $5/mo or $12/year (80% savings)
    const prices = {
      monthly: {
        amount: 500, // $5.00
        interval: 'month',
        name: 'Legion Host - Monthly'
      },
      yearly: {
        amount: 1200, // $12.00 - massive savings
        interval: 'year',
        name: 'Legion Host - Yearly'
      }
    };

    const selectedPrice = prices[plan];

    // Create Stripe customer if needed
    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: {
          base44_app_id: Deno.env.get("BASE44_APP_ID"),
          user_email: user.email
        }
      });
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedPrice.name,
            description: 'Unlock monetization features: Go live, receive gifts, cash out earnings'
          },
          unit_amount: selectedPrice.amount,
          recurring: {
            interval: selectedPrice.interval
          }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/Profile?subscription=success`,
      cancel_url: `${req.headers.get('origin')}/Profile?subscription=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        creator_id: creatorId || '',
        plan_type: plan,
        subscription_type: 'host_subscription'
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get("BASE44_APP_ID"),
          user_email: user.email,
          creator_id: creatorId || '',
          plan_type: plan
        }
      }
    });

    console.log('[createHostSubscription] Checkout session created:', session.id);

    return Response.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('[createHostSubscription] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});