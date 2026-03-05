import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[createCreatorMonetizationCheckout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planType, creatorId } = await req.json();

    if (!planType || !creatorId) {
      console.error('[createCreatorMonetizationCheckout] Missing required fields');
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[createCreatorMonetizationCheckout] Plan:', planType, 'Creator:', creatorId);

    const isMonthly = planType === 'monthly';
    
    // Use your existing Stripe product prices
    const priceId = isMonthly 
      ? 'price_1QoGxnKJQ5Xtmx7I1Q8fWUZS' // $5/month
      : 'price_1QoGxnKJQ5Xtmx7ICuwk3GIr'; // $12/year

    // Create checkout session using existing prices
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: isMonthly ? 'subscription' : 'payment',
      success_url: `${req.headers.get('origin')}/CreatorMonetization?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.headers.get('origin')}/CreatorMonetization?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        creator_id: creatorId,
        user_email: user.email,
        plan_type: planType,
        purchase_type: 'creator_monetization'
      }
    });

    console.log('[createCreatorMonetizationCheckout] Session created:', session.id);

    return Response.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('[createCreatorMonetizationCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});