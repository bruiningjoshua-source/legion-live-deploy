import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creator_id, tier, price_usd, tier_name, perks } = await req.json();

    if (!creator_id || !tier || !price_usd) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing active membership
    const existingMemberships = await base44.asServiceRole.entities.FanClubMembership.filter({
      user_email: user.email,
      creator_id,
      status: 'active'
    }, null, 1);

    if (existingMemberships.length > 0) {
      return Response.json({ error: 'You already have an active membership with this creator' }, { status: 400 });
    }

    // Get creator info
    const creators = await base44.asServiceRole.entities.Creator.filter({ id: creator_id }, null, 1);
    const creator = creators[0];

    if (!creator) {
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${creator.display_name} - ${tier_name} Fan Club`,
            description: perks?.join(', ') || 'Fan Club Membership',
          },
          unit_amount: Math.round(price_usd * 100),
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${origin}/FanClubs?success=true&creator_id=${creator_id}`,
      cancel_url: `${origin}/FanClubs?cancelled=true`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        type: 'fan_club_membership',
        creator_id,
        user_email: user.email,
        tier: tier.toString(),
        tier_name,
        price_usd: price_usd.toString()
      }
    });

    console.log('Fan club checkout session created:', session.id);

    return Response.json({ 
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Fan club checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});