/**
 * CHECK PAYMENT STATUS
 * Webhook fallback - verify payment confirmation
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) {
      return Response.json({ error: 'Missing paymentIntentId' }, { status: 400 });
    }

    // Look for payment confirmation in audit logs
    const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { related_entity_id: paymentIntentId },
      null,
      1
    );

    if (logs.length > 0) {
      return Response.json({
        status: 'confirmed',
        message: 'Payment confirmed',
        processedAt: logs[0].timestamp_utc
      });
    }

    return Response.json({
      status: 'pending',
      message: 'Payment still processing',
      retryAfter: 5000
    });
  } catch (error) {
    console.error('[checkPaymentStatus]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});