import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await req.json();

    if (!event_id) {
      return Response.json({ error: 'event_id required' }, { status: 400 });
    }

    // Get the event
    const events = await base44.asServiceRole.entities.PPVEvent.filter({ id: event_id }, null, 1);
    const event = events[0];

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if already has ticket
    const existingTickets = await base44.asServiceRole.entities.PPVTicket.filter({
      event_id,
      user_email: user.email,
      status: 'valid'
    }, null, 1);

    if (existingTickets.length > 0) {
      return Response.json({ error: 'You already have a ticket for this event' }, { status: 400 });
    }

    // Check if sold out
    if (event.max_tickets && event.ticket_count >= event.max_tickets) {
      return Response.json({ error: 'Event is sold out' }, { status: 400 });
    }

    // Create Stripe checkout session
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: event.title,
            description: `PPV Event Ticket - ${event.category}`,
          },
          unit_amount: Math.round(event.price_usd * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/PPVEvents?success=true&event_id=${event_id}`,
      cancel_url: `${origin}/PPVEvents?cancelled=true`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        event_id,
        user_email: user.email,
        type: 'ppv_ticket'
      }
    });

    console.log('PPV checkout session created:', session.id);

    return Response.json({ 
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('PPV checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});