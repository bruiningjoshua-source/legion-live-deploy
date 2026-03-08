import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
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

    const body = await req.json();
    const { action, creatorId } = body;

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

    // ─── CREATE ACCOUNT ──────────────────────────────────────────────────────
    if (action === 'create_account') {
      const existingMethods = await base44.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect' }, null, 1
      );

      let stripeAccountId;

      if (existingMethods[0]?.stripe_account_id) {
        stripeAccountId = existingMethods[0].stripe_account_id;
        console.log('[stripeConnectOnboard] Using existing Stripe account:', stripeAccountId);
      } else {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          },
          business_type: 'individual',
          individual: {
            email: user.email,
          },
          settings: {
            payouts: {
              schedule: {
                interval: 'daily',
                delay_days: 2
              }
            }
          },
          metadata: {
            base44_app_id: Deno.env.get("BASE44_APP_ID"),
            creator_id: creatorId,
            user_email: user.email
          }
        });

        stripeAccountId = account.id;
        console.log('[stripeConnectOnboard] Created Stripe Express account:', stripeAccountId);

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
          display_name: 'Bank Account (Stripe Connect)'
        });

        // Update KYC status to pending
        await base44.entities.Creator.update(creatorId, {
          kyc_status: 'pending',
          kyc_submitted_at: new Date().toISOString()
        });
      }

      // Create account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/Profile?stripe_refresh=true&creator_id=${creatorId}`,
        return_url: `${origin}/Profile?stripe_success=true&creator_id=${creatorId}`,
        type: 'account_onboarding',
        collect: 'eventually_due'
      });

      console.log('[stripeConnectOnboard] Onboarding link created for:', stripeAccountId);
      return Response.json({ url: accountLink.url, accountId: stripeAccountId });
    }

    // ─── CHECK STATUS ────────────────────────────────────────────────────────
    if (action === 'check_status') {
      const methods = await base44.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect' }, null, 1
      );

      if (!methods[0]?.stripe_account_id) {
        return Response.json({ status: 'not_started' });
      }

      const account = await stripe.accounts.retrieve(methods[0].stripe_account_id);

      const detailsSubmitted = account.details_submitted;
      const payoutsEnabled = account.payouts_enabled;
      const chargesEnabled = account.charges_enabled;

      // Sync status to DB if changed
      if (
        detailsSubmitted !== methods[0].stripe_onboarding_complete ||
        payoutsEnabled !== methods[0].stripe_payouts_enabled
      ) {
        await base44.entities.CreatorPayoutMethod.update(methods[0].id, {
          stripe_onboarding_complete: detailsSubmitted,
          stripe_payouts_enabled: payoutsEnabled,
          is_verified: payoutsEnabled
        });

        // Sync KYC status on creator record
        const kycStatus = payoutsEnabled ? 'verified' : detailsSubmitted ? 'pending' : 'not_started';
        await base44.entities.Creator.update(creatorId, {
          kyc_status: kycStatus,
          kyc_reviewed_at: payoutsEnabled ? new Date().toISOString() : undefined
        });
      }

      // Build requirements summary
      const requirements = account.requirements || {};
      const pendingItems = [
        ...(requirements.currently_due || []),
        ...(requirements.eventually_due || []),
      ];

      console.log('[stripeConnectOnboard] Status:', { detailsSubmitted, payoutsEnabled, chargesEnabled });
      return Response.json({
        status: payoutsEnabled ? 'active' : detailsSubmitted ? 'pending_verification' : 'incomplete',
        details_submitted: detailsSubmitted,
        payouts_enabled: payoutsEnabled,
        charges_enabled: chargesEnabled,
        account_id: methods[0].stripe_account_id,
        pending_requirements: pendingItems.slice(0, 5),
        payout_schedule: account.settings?.payouts?.schedule || { interval: 'daily' },
        default_currency: account.default_currency || 'usd',
      });
    }

    // ─── RESUME ONBOARDING ───────────────────────────────────────────────────
    if (action === 'resume_onboarding') {
      const methods = await base44.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect' }, null, 1
      );

      if (!methods[0]?.stripe_account_id) {
        return Response.json({ error: 'No Stripe account found' }, { status: 404 });
      }

      const accountLink = await stripe.accountLinks.create({
        account: methods[0].stripe_account_id,
        refresh_url: `${origin}/Profile?stripe_refresh=true&creator_id=${creatorId}`,
        return_url: `${origin}/Profile?stripe_success=true&creator_id=${creatorId}`,
        type: 'account_onboarding',
        collect: 'eventually_due'
      });

      return Response.json({ url: accountLink.url });
    }

    // ─── STRIPE DASHBOARD LOGIN LINK ─────────────────────────────────────────
    if (action === 'create_login_link') {
      const methods = await base44.entities.CreatorPayoutMethod.filter(
        { creator_id: creatorId, method_type: 'stripe_connect' }, null, 1
      );

      if (!methods[0]?.stripe_account_id) {
        return Response.json({ error: 'No Stripe account found' }, { status: 404 });
      }

      const loginLink = await stripe.accounts.createLoginLink(methods[0].stripe_account_id);
      console.log('[stripeConnectOnboard] Login link created');
      return Response.json({ url: loginLink.url });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[stripeConnectOnboard] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});