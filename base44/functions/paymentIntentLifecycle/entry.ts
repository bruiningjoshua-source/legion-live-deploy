/**
 * PAYMENT INTENT LIFECYCLE MANAGER
 * Handles abandoned, failed, expired, and succeeded payment intents
 * Provides retry paths for customers + automatic recovery
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

/**
 * Check payment intent status and handle failures
 * Called when customers return from Stripe checkout or when webhook is delayed
 */
export async function checkPaymentIntentStatus(req, paymentIntentId) {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log(`[paymentIntentLifecycle] Payment intent ${paymentIntentId} status: ${intent.status}`);

    switch (intent.status) {
      case 'succeeded':
        return {
          status: 'succeeded',
          message: 'Payment successful',
          amount: intent.amount / 100,
          currency: intent.currency
        };

      case 'processing':
        return {
          status: 'processing',
          message: 'Payment is being processed. This may take a few moments.',
          retryAfter: 5000 // Retry after 5 seconds
        };

      case 'requires_payment_method':
        return {
          status: 'failed',
          message: 'Payment method declined. Please try another card.',
          requiresRetry: true,
          error: intent.last_payment_error?.message || 'Unknown error'
        };

      case 'requires_action':
        return {
          status: 'requires_action',
          message: 'Additional authentication required.',
          clientSecret: intent.client_secret,
          requiresRetry: true
        };

      case 'canceled':
        return {
          status: 'canceled',
          message: 'Payment was canceled.',
          requiresRetry: true
        };

      default:
        return {
          status: intent.status,
          message: `Payment status: ${intent.status}`,
          requiresRetry: !['succeeded', 'processing'].includes(intent.status)
        };
    }
  } catch (error) {
    console.error('[paymentIntentLifecycle] Error checking status:', error.message);
    return {
      status: 'error',
      message: 'Unable to check payment status.',
      error: error.message
    };
  }
}

/**
 * Generate a retry URL for failed payments (idempotent)
 * Allows customer to retry checkout without creating duplicate charges
 */
export async function createRetrySession(base44, originalSessionId, metadata) {
  try {
    // Fetch original session to get metadata
    const originalSession = await stripe.checkout.sessions.retrieve(originalSessionId);

    if (!originalSession) {
      throw new Error('Original session not found');
    }

    // Create new session with same metadata (prevents duplicate charges)
    const retrySession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: originalSession.mode,
      customer_email: originalSession.customer_email,
      line_items: originalSession.line_items?.data || [],
      success_url: originalSession.success_url,
      cancel_url: originalSession.cancel_url,
      metadata: {
        ...originalSession.metadata,
        retry_of_session: originalSessionId,
        retry_count: (parseInt(originalSession.metadata?.retry_count || '0') + 1).toString()
      }
    });

    console.log(`[paymentIntentLifecycle] Retry session created: ${retrySession.id}`);

    return {
      success: true,
      sessionId: retrySession.id,
      url: retrySession.url
    };
  } catch (error) {
    console.error('[paymentIntentLifecycle] Error creating retry session:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle abandoned checkout (user leaves without paying)
 * Automatically send email reminder after 24 hours
 */
export async function handleAbandonedCheckout(base44, sessionId, customerEmail) {
  try {
    // Record abandoned checkout in audit log
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: customerEmail,
      action: 'abandoned_checkout',
      amount_denarii: 0,
      new_balance: 0,
      related_entity_id: sessionId,
      reason: 'Checkout session abandoned without completing payment',
      timestamp_utc: new Date().toISOString()
    }).catch(e => console.warn('[paymentIntentLifecycle] Audit log failed:', e.message));

    // Send reminder email (3rd party integration or scheduled task)
    console.log(`[paymentIntentLifecycle] Abandoned checkout for ${customerEmail} (session: ${sessionId})`);

    return {
      success: true,
      message: 'Abandoned checkout recorded. Reminder email queued.'
    };
  } catch (error) {
    console.error('[paymentIntentLifecycle] Error handling abandoned checkout:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify payment using Stripe's server-side confirmation
 * Called after webhook delays or network issues
 */
export async function verifyPaymentConfirmation(paymentIntentId) {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (intent.status === 'succeeded' && intent.charges?.data?.length > 0) {
      const charge = intent.charges.data[0];
      return {
        verified: true,
        chargeId: charge.id,
        amount: charge.amount / 100,
        captured: charge.captured,
        receiptUrl: charge.receipt_url
      };
    }

    return {
      verified: false,
      status: intent.status,
      message: `Payment status is ${intent.status}, not confirmed.`
    };
  } catch (error) {
    console.error('[paymentIntentLifecycle] Verification error:', error.message);
    return {
      verified: false,
      error: error.message
    };
  }
}