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
      console.error('[createTipCheckout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, amount, message, streamId, isAnonymous } = await req.json();

    if (!creatorId || !amount) {
      return Response.json({ error: 'Creator ID and amount are required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount < 1 || amount > 5000) {
      return Response.json({ error: 'Tip amount must be between $1 and $5,000' }, { status: 400 });
    }

    // Self-tip prevention
    let creators;
    try {
      creators = await base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1);
    } catch (e) {
      console.error('[createTipCheckout] Creator lookup failed:', e.message);
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (!creators[0]) {
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (creators[0].user_email === user.email) {
      return Response.json({ error: 'You cannot tip yourself' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const successUrl = streamId
      ? `${origin}/WatchStream?id=${streamId}&tip_success=true`
      : `${origin}/CreatorProfile?id=${creatorId}&tip_success=true`;
    const cancelUrl = streamId
      ? `${origin}/WatchStream?id=${streamId}&tip_cancelled=true`
      : `${origin}/CreatorProfile?id=${creatorId}&tip_cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tip for ${creators[0].display_name}`,
            description: message ? message.substring(0, 200) : 'Support this creator'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        creator_id: creatorId,
        sender_email: user.email,
        amount_usd: amount.toString(),
        message: (message || '').substring(0, 500),
        stream_id: streamId || '',
        is_anonymous: isAnonymous ? 'true' : 'false',
        purchase_type: 'tip'
      }
    });

    console.log('[createTipCheckout] Session:', session.id, '$', amount, '→', creators[0].display_name);

    return Response.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[createTipCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});