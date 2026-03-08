/**
 * PAYMENT INTENT LIFECYCLE HANDLER
 * Manages abandoned, failed, and verification of payment intents
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Check payment status in database (webhook fallback)
 */
export async function checkPaymentStatus(base44, paymentIntentId) {
  try {
    // Look for payment confirmation in audit logs
    const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { related_entity_id: paymentIntentId },
      null,
      1
    );

    if (logs.length > 0) {
      return {
        status: 'confirmed',
        message: 'Payment confirmed',
        processedAt: logs[0].timestamp_utc
      };
    }

    // Payment not yet confirmed (might still be processing)
    return {
      status: 'pending',
      message: 'Payment is still being processed. Please check back in a few moments.',
      retryAfter: 5000
    };
  } catch (error) {
    console.error('[paymentIntentHandler] Error checking status:', error.message);
    return {
      status: 'error',
      message: 'Unable to verify payment status'
    };
  }
}

/**
 * Log abandoned checkout for follow-up emails
 */
export async function logAbandonedCheckout(base44, sessionId, userEmail) {
  try {
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: userEmail,
      action: 'abandoned_checkout',
      amount_denarii: 0,
      new_balance: 0,
      related_entity_id: sessionId,
      reason: 'Checkout session abandoned without completing payment',
      timestamp_utc: new Date().toISOString()
    });

    return { success: true };
  } catch (e) {
    console.warn('[paymentIntentHandler] Log failed:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Mark payment as recoverable (user can retry)
 */
export async function markPaymentRecoverable(base44, paymentIntentId, userEmail, reason) {
  try {
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: userEmail,
      action: 'payment_retry_eligible',
      amount_denarii: 0,
      new_balance: 0,
      related_entity_id: paymentIntentId,
      reason: `Payment failed - retry eligible: ${reason}`,
      timestamp_utc: new Date().toISOString()
    });

    return { success: true, message: 'Payment marked as retryable' };
  } catch (error) {
    console.error('[paymentIntentHandler] Error marking recoverable:', error.message);
    return { success: false, error: error.message };
  }
}