import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

/**
 * Handle Stripe Webhooks for 3D Secure Payment Confirmations
 * Processes charge.succeeded, payment_intent.succeeded, etc.
 */

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!WEBHOOK_SECRET || !signature) {
      return Response.json({ error: 'Webhook secret or signature missing' }, { status: 400 });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
    } catch (err) {
      console.error('[3DS Webhook] Signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      console.log(`[3DS Webhook] Charge succeeded: ${charge.id}`);

      // Mark SCA as completed if 3D Secure was used
      if (charge.payment_method_details?.card?.three_d_secure?.authenticated) {
        const assessments = await base44.asServiceRole.entities.PaymentRiskAssessment.filter(
          { payment_intent_id: charge.payment_intent },
          null,
          1
        ).catch(() => []);

        if (assessments.length > 0) {
          await base44.asServiceRole.entities.PaymentRiskAssessment.update(assessments[0].id, {
            sca_completed: true
          });
          console.log(`[3DS Webhook] SCA completed for ${charge.id}`);
        }
      }
    }

    if (event.type === 'payment_intent.requires_action') {
      const paymentIntent = event.data.object;
      console.warn(`[3DS Webhook] Payment requires action: ${paymentIntent.id} — 3DS challenge needed`);

      // Notify user via audit log
      const metadata = paymentIntent.metadata || {};
      if (metadata.user_email) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: metadata.user_email,
          type: 'payment_requires_action',
          title: 'Verify Your Payment',
          message: 'Your payment requires additional authentication. Please complete the verification.',
          is_read: false,
          created_date: new Date().toISOString()
        }).catch(() => {});
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('[3DS Webhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});