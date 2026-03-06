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

    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id is required' }, { status: 400 });
    }

    const events = await base44.asServiceRole.entities.PPVEvent.filter({ id: event_id }, null, 1);
    const ppvEvent = events[0];

    if (!ppvEvent) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!ppvEvent.price_usd || ppvEvent.price_usd <= 0) {
      return Response.json({ error: 'Event has no valid price configured' }, { status: 400 });
    }

    // Existing ticket check
    const existingTickets = await base44.asServiceRole.entities.PPVTicket.filter({
      event_id,
      user_email: user.email,
      status: 'valid'
    }, null, 1);

    if (existingTickets.length > 0) {
      return Response.json({ error: 'You already have a ticket' }, { status: 400 });
    }

    // Sold out check
    if (ppvEvent.max_tickets && (ppvEvent.ticket_count || 0) >= ppvEvent.max_tickets) {
      return Response.json({ error: 'Event is sold out' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: ppvEvent.title || 'PPV Event',
            description: `PPV Event Ticket${ppvEvent.category ? ' — ' + ppvEvent.category : ''}`,
          },
          unit_amount: Math.round(ppvEvent.price_usd * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/PPVEvents?success=true&event_id=${event_id}`,
      cancel_url: `${origin}/PPVEvents?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        event_id,
        user_email: user.email,
        type: 'ppv_ticket'
      }
    });

    console.log('[createPPVCheckout] Session:', session.id, user.email, '→ event:', ppvEvent.title, '@', ppvEvent.price_usd);

    return Response.json({
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('[createPPVCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});