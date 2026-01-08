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
      console.error('[createTipCheckout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, amount, message, streamId, isAnonymous } = await req.json();

    if (!creatorId || !amount || amount < 1) {
      console.error('[createTipCheckout] Invalid data');
      return Response.json({ error: 'Invalid tip data' }, { status: 400 });
    }

    console.log('[createTipCheckout] Tip:', amount, 'to creator:', creatorId);

    // Get creator info
    const creators = await base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1);
    const creator = creators[0];

    if (!creator) {
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tip for ${creator.display_name}`,
            description: message || 'Support this creator'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/WatchStream/${streamId || ''}?tip_success=true`,
      cancel_url: `${req.headers.get('origin')}/WatchStream/${streamId || ''}?tip_cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        creator_id: creatorId,
        sender_email: user.email,
        amount_usd: amount.toString(),
        message: message || '',
        stream_id: streamId || '',
        is_anonymous: isAnonymous ? 'true' : 'false',
        purchase_type: 'tip'
      }
    });

    console.log('[createTipCheckout] Session created:', session.id);

    return Response.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('[createTipCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});