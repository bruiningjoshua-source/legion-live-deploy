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

    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return Response.json({ error: 'Invalid planType' }, { status: 400 });
    }

    if (!creatorId) {
      return Response.json({ error: 'creatorId is required' }, { status: 400 });
    }

    // Verify creator ownership
    let creators;
    try {
      creators = await base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1);
    } catch (e) {
      console.error('[createCreatorMonetizationCheckout] Creator lookup failed:', e.message);
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (!creators[0] || creators[0].user_email !== user.email) {
      return Response.json({ error: 'You can only activate monetization for your own creator profile' }, { status: 403 });
    }

    const isMonthly = planType === 'monthly';
    const priceId = isMonthly
      ? 'price_1QoGxnKJQ5Xtmx7I1Q8fWUZS'
      : 'price_1QoGxnKJQ5Xtmx7ICuwk3GIr';

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: isMonthly ? 'subscription' : 'payment',
      customer_email: user.email,
      success_url: `${origin}/CreatorMonetization?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/CreatorMonetization?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        creator_id: creatorId,
        user_email: user.email,
        plan_type: planType,
        purchase_type: 'creator_monetization'
      }
    });

    console.log('[createCreatorMonetizationCheckout] Session:', session.id, user.email, planType);

    return Response.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[createCreatorMonetizationCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});