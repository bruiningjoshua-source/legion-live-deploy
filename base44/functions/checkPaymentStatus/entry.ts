import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentIntentId } = await req.json();
    if (!paymentIntentId) return Response.json({ error: 'Missing paymentIntentId' }, { status: 400 });

    // Check local audit log first (fast path)
    const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { user_email: user.email, related_entity_id: paymentIntentId }, null, 1
    ).catch(() => []);

    if (logs.length > 0 && logs[0].action === 'purchase') {
      return Response.json({ status: 'confirmed', message: 'Payment confirmed', processedAt: logs[0].timestamp_utc });
    }

    // Query Stripe directly for current status
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (e) {
      // Try as checkout session ID
      try {
        const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
        return Response.json({
          status: session.payment_status === 'paid' ? 'confirmed' : session.status,
          stripeStatus: session.status,
          paymentStatus: session.payment_status,
          clientSecret: null
        });
      } catch {
        return Response.json({ error: 'Payment not found' }, { status: 404 });
      }
    }

    // Map Stripe status to our response
    const statusMap = {
      succeeded: 'confirmed',
      requires_payment_method: 'requires_payment_method',
      requires_action: 'requires_action',
      canceled: 'canceled',
      processing: 'processing',
      requires_capture: 'requires_capture'
    };

    return Response.json({
      status: statusMap[pi.status] || pi.status,
      stripeStatus: pi.status,
      clientSecret: pi.status === 'requires_action' ? pi.client_secret : null,
      amount: pi.amount / 100,
      currency: pi.currency,
      lastError: pi.last_payment_error?.message || null
    });
  } catch (error) {
    console.error('[checkPaymentStatus]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});