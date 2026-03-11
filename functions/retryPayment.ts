import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

/**
 * Retry Payment Function
 * Attempts to retry a failed payment or complete an abandoned checkout
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentIntentId } = await req.json();

    if (!paymentIntentId || typeof paymentIntentId !== 'string') {
      return Response.json({ error: 'Payment intent ID required' }, { status: 400 });
    }

    // Fetch payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return Response.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Check if already succeeded
    if (paymentIntent.status === 'succeeded') {
      return Response.json({
        success: true,
        status: 'succeeded',
        message: 'Payment already completed'
      });
    }

    // Check if retryable (requires_payment_method or processing)
    if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'processing') {
      // Confirm the payment intent (will use saved payment method if available)
      try {
        const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
          return_url: `${req.headers.get('origin') || 'https://app.base44.com'}/Wallet?retry_success=true`
        });

        if (confirmed.status === 'succeeded') {
          // Mark failed payment as resolved in audit log
          await base44.asServiceRole.entities.WalletAuditLog.create({
            user_email: user.email,
            action: 'payment_retry_succeeded',
            amount_denarii: 0,
            new_balance: 0,
            related_entity_id: paymentIntentId,
            reason: `Retry successful for ${paymentIntentId}`,
            timestamp_utc: new Date().toISOString()
          }).catch(() => {});

          console.log(`[retryPayment] Retry succeeded: ${paymentIntentId}`);
          return Response.json({
            success: true,
            status: 'succeeded',
            message: 'Payment retry successful'
          });
        } else if (confirmed.status === 'requires_action') {
          return Response.json({
            success: false,
            status: 'requires_action',
            clientSecret: confirmed.client_secret,
            message: '3D Secure or additional authentication required'
          });
        }
      } catch (err) {
        console.warn('[retryPayment] Confirmation failed:', err.message);
        return Response.json({
          success: false,
          status: 'failed',
          message: err.message || 'Retry failed. Contact support.'
        }, { status: 400 });
      }
    }

    // Not retryable
    return Response.json({
      success: false,
      status: paymentIntent.status,
      message: `Payment cannot be retried (status: ${paymentIntent.status})`
    }, { status: 400 });

  } catch (error) {
    console.error('[retryPayment] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});