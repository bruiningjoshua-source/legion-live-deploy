import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// Rate limiting: 1 host subscription per day per user
const hostBuckets = new Map();
function checkHostSubRate(email) {
  const now = Date.now();
  const bucket = hostBuckets.get(email);
  if (!bucket || now > bucket.resetAt) {
    hostBuckets.set(email, { count: 1, resetAt: now + 86400000 });
    return { allowed: true };
  }
  bucket.count++;
  if (bucket.count > 1) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[createHostSubscription] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, creatorId, csrfToken } = await req.json();

    // Input validation
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return Response.json({ error: 'Invalid plan. Must be "monthly" or "yearly".' }, { status: 400 });
    }
    if (creatorId && (typeof creatorId !== 'string' || creatorId.length > 100)) {
      return Response.json({ error: 'Invalid creatorId' }, { status: 400 });
    }

    // CSRF validation
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Rate limiting
    const rateCheck = checkHostSubRate(user.email);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Rate limited: 1 host subscription per day', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    // Check for existing active subscription
    const existingSubs = await base44.asServiceRole.entities.CreatorSubscription.filter({
      user_email: user.email,
      status: 'active'
    }, '-created_date', 1);

    if (existingSubs.length > 0) {
      return Response.json({ error: 'You already have an active host subscription' }, { status: 400 });
    }

    const prices = {
      monthly: { amount: 500, interval: 'month', name: 'Legion Host — Monthly' },
      yearly: { amount: 1200, interval: 'year', name: 'Legion Host — Yearly' }
    };

    const selectedPrice = prices[plan];

    // Get or create Stripe customer
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

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: selectedPrice.name,
            description: 'Unlock monetization: Go live, receive gifts, cash out earnings'
          },
          unit_amount: selectedPrice.amount,
          recurring: { interval: selectedPrice.interval }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${origin}/Profile?subscription=success`,
      cancel_url: `${origin}/Profile?subscription=cancelled`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        creator_id: creatorId || '',
        plan_type: plan,
        subscription_type: 'host_subscription',
        timestamp: Date.now().toString()
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get("BASE44_APP_ID"),
          user_email: user.email,
          creator_id: creatorId || '',
          plan_type: plan,
          timestamp: Date.now().toString()
        }
      }
    });

    console.log('[createHostSubscription] Session:', session.id, user.email, plan);

    return Response.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[createHostSubscription] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});