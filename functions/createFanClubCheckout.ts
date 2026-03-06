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
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creator_id, tier, price_usd, tier_name, perks } = await req.json();

    if (!creator_id || !tier || !price_usd) {
      return Response.json({ error: 'Missing required fields: creator_id, tier, price_usd' }, { status: 400 });
    }

    if (typeof price_usd !== 'number' || price_usd < 0.50 || price_usd > 1000) {
      return Response.json({ error: 'Price must be between $0.50 and $1,000' }, { status: 400 });
    }

    // Self-subscription prevention
    let creators;
    try {
      creators = await base44.asServiceRole.entities.Creator.filter({ id: creator_id }, null, 1);
    } catch (e) {
      console.error('[createFanClubCheckout] Creator lookup failed:', e.message);
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (!creators[0]) {
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (creators[0].user_email === user.email) {
      return Response.json({ error: 'You cannot subscribe to your own fan club' }, { status: 400 });
    }

    // Existing membership check
    const existingMemberships = await base44.asServiceRole.entities.FanClubMembership.filter({
      user_email: user.email,
      creator_id,
      status: 'active'
    }, null, 1);

    if (existingMemberships.length > 0) {
      return Response.json({ error: 'You already have an active membership' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${creators[0].display_name} — ${tier_name || 'Fan Club'}`,
            description: Array.isArray(perks) ? perks.join(', ') : 'Fan Club Membership',
          },
          unit_amount: Math.round(price_usd * 100),
          recurring: { interval: 'month' }
        },
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: user.email,
      success_url: `${origin}/FanClubs?success=true&creator_id=${creator_id}`,
      cancel_url: `${origin}/FanClubs?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        type: 'fan_club_membership',
        creator_id,
        user_email: user.email,
        tier: tier.toString(),
        tier_name: tier_name || '',
        price_usd: price_usd.toString()
      }
    });

    console.log('[createFanClubCheckout] Session:', session.id, user.email, '→', creators[0].display_name, '@', price_usd);

    return Response.json({
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('[createFanClubCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});