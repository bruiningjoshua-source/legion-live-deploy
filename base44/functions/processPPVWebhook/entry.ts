import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    // Verify webhook signature
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Initialize base44 after webhook verification
    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};

      // Only process PPV ticket purchases
      if (metadata.type !== 'ppv_ticket') {
        return Response.json({ received: true, skipped: 'not ppv ticket' });
      }

      const { event_id, user_email } = metadata;

      if (!event_id || !user_email) {
        console.error('Missing metadata:', metadata);
        return Response.json({ error: 'Missing metadata' }, { status: 400 });
      }

      console.log('Processing PPV ticket purchase:', { event_id, user_email });

      // Create ticket
      const ticket = await base44.asServiceRole.entities.PPVTicket.create({
        user_email,
        event_id,
        purchase_type: 'stripe',
        amount_paid_usd: session.amount_total / 100,
        stripe_payment_id: session.payment_intent,
        status: 'valid',
        access_code: Math.random().toString(36).substring(2, 10).toUpperCase()
      });

      console.log('Ticket created:', ticket.id);

      // Update event ticket count
      const events = await base44.asServiceRole.entities.PPVEvent.filter({ id: event_id }, null, 1);
      if (events[0]) {
        await base44.asServiceRole.entities.PPVEvent.update(event_id, {
          ticket_count: (events[0].ticket_count || 0) + 1
        });
      }

      // Calculate creator earnings (70% to creator)
      const creatorEarnings = (session.amount_total / 100) * 0.7;
      if (events[0]?.creator_id) {
        const creators = await base44.asServiceRole.entities.Creator.filter({ user_email: events[0].creator_id }, null, 1);
        if (creators[0]) {
          await base44.asServiceRole.entities.Creator.update(creators[0].id, {
            total_earnings_denarii: (creators[0].total_earnings_denarii || 0) + Math.floor(creatorEarnings * 100)
          });
        }
      }

      console.log('PPV ticket purchase completed successfully');
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('PPV webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});