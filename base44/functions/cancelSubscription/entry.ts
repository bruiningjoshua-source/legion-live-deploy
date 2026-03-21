import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subscriptionId, subscriptionDbId } = await req.json();
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return Response.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    // Verify this subscription belongs to the requesting user before cancelling
    let owned = false;
    if (subscriptionDbId) {
      const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
        { id: subscriptionDbId, user_email: user.email }, null, 1
      ).catch(() => []);
      if (subs[0]) owned = true;

      if (!owned) {
        const memberships = await base44.asServiceRole.entities.FanClubMembership.filter(
          { id: subscriptionDbId, user_email: user.email }, null, 1
        ).catch(() => []);
        if (memberships[0]) owned = true;
      }
    } else {
      // Fallback: check by stripe_subscription_id
      const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
        { stripe_subscription_id: subscriptionId, user_email: user.email }, null, 1
      ).catch(() => []);
      if (subs[0]) owned = true;
    }

    if (!owned) {
      console.warn('[cancelSubscription] User', user.email, 'attempted to cancel subscription they do not own:', subscriptionId);
      return Response.json({ error: 'Subscription not found or not owned by you' }, { status: 403 });
    }

    // Cancel at period end (not immediately) — user retains access until billing cycle ends
    const cancelled = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    console.log('[cancelSubscription] Subscription set to cancel at period end:', subscriptionId, 'user:', user.email);

    // Update DB status to reflect pending cancellation
    if (subscriptionDbId) {
      await base44.asServiceRole.entities.CreatorSubscription.update(subscriptionDbId, {
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString()
      }).catch(() => {});
      await base44.asServiceRole.entities.FanClubMembership.update(subscriptionDbId, {
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString()
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      cancel_at: new Date(cancelled.cancel_at * 1000).toISOString(),
      message: 'Subscription will cancel at end of billing period.'
    });

  } catch (error) {
    console.error('[cancelSubscription] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});