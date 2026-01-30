import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[stripeConnectOnboard] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, creatorId } = await req.json();

    if (!creatorId) {
      return Response.json({ error: 'Missing creatorId' }, { status: 400 });
    }

    // Verify user owns this creator profile
    const creators = await base44.entities.Creator.filter({ id: creatorId, user_email: user.email }, null, 1);
    if (!creators[0]) {
      console.error('[stripeConnectOnboard] Creator not found or not owned by user');
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }

    const creator = creators[0];
    const origin = req.headers.get('origin') || 'https://app.base44.com';

    if (action === 'create_account') {
      // Check if creator already has a Stripe Connect account
      const existingMethods = await base44.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect' },
        null,
        1
      );

      let stripeAccountId;

      if (existingMethods[0]?.stripe_account_id) {
        stripeAccountId = existingMethods[0].stripe_account_id;
        console.log('[stripeConnectOnboard] Using existing Stripe account:', stripeAccountId);
      } else {
        // Create new Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          },
          business_type: 'individual',
          metadata: {
            base44_app_id: Deno.env.get("BASE44_APP_ID"),
            creator_id: creatorId,
            user_email: user.email
          }
        });

        stripeAccountId = account.id;
        console.log('[stripeConnectOnboard] Created Stripe account:', stripeAccountId);

        // Save the payout method
        await base44.entities.CreatorPayoutMethod.create({
          creator_id: creatorId,
          user_email: user.email,
          method_type: 'stripe_connect',
          identifier: user.email,
          stripe_account_id: stripeAccountId,
          stripe_onboarding_complete: false,
          stripe_payouts_enabled: false,
          is_default: true,
          is_verified: false,
          display_name: 'Stripe (Bank Transfer)'
        });
      }

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/Profile?stripe_refresh=true`,
        return_url: `${origin}/Profile?stripe_success=true`,
        type: 'account_onboarding'
      });

      console.log('[stripeConnectOnboard] Onboarding link created');
      return Response.json({ url: accountLink.url, accountId: stripeAccountId });
    }

    if (action === 'check_status') {
      const methods = await base44.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect' },
        null,
        1
      );

      if (!methods[0]?.stripe_account_id) {
        return Response.json({ status: 'not_started' });
      }

      const account = await stripe.accounts.retrieve(methods[0].stripe_account_id);
      
      const isComplete = account.details_submitted;
      const payoutsEnabled = account.payouts_enabled;

      // Update the payout method status
      if (isComplete !== methods[0].stripe_onboarding_complete || payoutsEnabled !== methods[0].stripe_payouts_enabled) {
        await base44.entities.CreatorPayoutMethod.update(methods[0].id, {
          stripe_onboarding_complete: isComplete,
          stripe_payouts_enabled: payoutsEnabled,
          is_verified: payoutsEnabled
        });
      }

      console.log('[stripeConnectOnboard] Status check:', { isComplete, payoutsEnabled });
      return Response.json({
        status: payoutsEnabled ? 'active' : isComplete ? 'pending_verification' : 'incomplete',
        details_submitted: isComplete,
        payouts_enabled: payoutsEnabled,
        account_id: methods[0].stripe_account_id
      });
    }

    if (action === 'create_login_link') {
      const methods = await base44.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect' },
        null,
        1
      );

      if (!methods[0]?.stripe_account_id) {
        return Response.json({ error: 'No Stripe account found' }, { status: 404 });
      }

      const loginLink = await stripe.accounts.createLoginLink(methods[0].stripe_account_id);
      return Response.json({ url: loginLink.url });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[stripeConnectOnboard] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});