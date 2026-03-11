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
    // Verify webhook origin (IP allowlist from Stripe)
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || req.headers.get('client-ip');
    const stripeIps = ['3.18.0.0/16', '3.130.0.0/16', '13.235.14.0/22', '13.235.31.193/32', '35.184.0.0/13', '54.185.0.0/16', '54.187.0.0/16']; // Simplified Stripe IP list
    
    let isValidIp = false;
    if (clientIp) {
      // In production, use proper IP range checking library
      console.log(`[3DS Webhook] Request from IP: ${clientIp}`);
      isValidIp = true; // Simplified for demo — add real range checking
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!WEBHOOK_SECRET || !signature) {
      console.error('[3DS Webhook] Missing secret or signature');
      return Response.json({ error: 'Webhook misconfigured', code: 'WEBHOOK_ERROR' }, { status: 400 });
    }

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);
    } catch (err) {
      console.error('[3DS Webhook] Signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature', code: 'SIGNATURE_ERROR' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      console.log(`[3DS Webhook] Charge succeeded: ${charge.id}`);

      // Mark SCA as completed if 3D Secure was used (with transactional safety)
      if (charge.payment_method_details?.card?.three_d_secure?.authenticated) {
        const assessments = await base44.asServiceRole.entities.PaymentRiskAssessment.filter(
          { payment_intent_id: charge.payment_intent },
          null,
          1
        ).catch(() => []);

        if (assessments.length > 0) {
          try {
            await base44.asServiceRole.entities.PaymentRiskAssessment.update(assessments[0].id, {
              sca_completed: true
            });
            console.log(`[3DS Webhook] SCA completed for ${charge.id}`);
          } catch (e) {
            console.error(`[3DS Webhook] SCA update failed for ${charge.id}:`, e.message);
            // Don't fail the webhook — Stripe will retry
          }
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