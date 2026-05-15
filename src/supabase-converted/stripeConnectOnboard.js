/* eslint-disable no-undef */
// ═══ CONVERTED: stripeConnectOnboard ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, creatorId } = await req.json();
    if (!creatorId) return Response.json({ error: 'Missing creatorId' }, { status: 400 });

    const { data: creators } = await supabase.from('creator').select('*').eq('id', creatorId).eq('user_email', user.email).limit(1);
    if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
    const origin = req.headers.get('origin') || 'https://legionlive.com';

    if (action === 'create_account') {
      const { data: existingMethods } = await supabase.from('creator_payout_method').select('stripe_account_id').eq('creator_id', creatorId).eq('method_type', 'stripe_connect').limit(1);
      let stripeAccountId;
      if ((existingMethods||[])[0]?.stripe_account_id) { stripeAccountId = existingMethods[0].stripe_account_id; }
      else {
        const account = await stripe.accounts.create({ type: 'express', country: 'US', email: user.email, capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, business_type: 'individual', metadata: { creator_id: creatorId, user_email: user.email } });
        stripeAccountId = account.id;
        await supabase.from('creator_payout_method').insert({ creator_id: creatorId, user_email: user.email, method_type: 'stripe_connect', identifier: user.email, stripe_account_id: stripeAccountId, stripe_onboarding_complete: false, stripe_payouts_enabled: false, is_default: true, is_verified: false, display_name: 'Bank Account (Stripe Connect)' });
        await supabase.from('creator').update({ kyc_status: 'pending', kyc_submitted_at: new Date().toISOString() }).eq('id', creatorId);
      }
      const link = await stripe.accountLinks.create({ account: stripeAccountId, refresh_url: `${origin}/Profile?stripe_refresh=true&creator_id=${creatorId}`, return_url: `${origin}/Profile?stripe_success=true&creator_id=${creatorId}`, type: 'account_onboarding', collect: 'eventually_due' });
      return Response.json({ url: link.url, accountId: stripeAccountId });
    }

    if (action === 'check_status') {
      const { data: methods } = await supabase.from('creator_payout_method').select('*').eq('creator_id', creatorId).eq('method_type', 'stripe_connect').limit(1);
      if (!(methods||[])[0]?.stripe_account_id) return Response.json({ status: 'not_started' });
      const account = await stripe.accounts.retrieve(methods[0].stripe_account_id);
      if (account.details_submitted !== methods[0].stripe_onboarding_complete || account.payouts_enabled !== methods[0].stripe_payouts_enabled) {
        await supabase.from('creator_payout_method').update({ stripe_onboarding_complete: account.details_submitted, stripe_payouts_enabled: account.payouts_enabled, is_verified: account.payouts_enabled }).eq('id', methods[0].id);
        await supabase.from('creator').update({ kyc_status: account.payouts_enabled ? 'verified' : account.details_submitted ? 'pending' : 'not_started' }).eq('id', creatorId);
      }
      return Response.json({ status: account.payouts_enabled ? 'active' : account.details_submitted ? 'pending_verification' : 'incomplete', details_submitted: account.details_submitted, payouts_enabled: account.payouts_enabled, account_id: methods[0].stripe_account_id });
    }

    if (action === 'resume_onboarding') {
      const { data: methods } = await supabase.from('creator_payout_method').select('stripe_account_id').eq('creator_id', creatorId).eq('method_type', 'stripe_connect').limit(1);
      if (!(methods||[])[0]?.stripe_account_id) return Response.json({ error: 'No Stripe account' }, { status: 404 });
      const link = await stripe.accountLinks.create({ account: methods[0].stripe_account_id, refresh_url: `${origin}/Profile?stripe_refresh=true`, return_url: `${origin}/Profile?stripe_success=true`, type: 'account_onboarding', collect: 'eventually_due' });
      return Response.json({ url: link.url });
    }

    if (action === 'create_login_link') {
      const { data: methods } = await supabase.from('creator_payout_method').select('stripe_account_id').eq('creator_id', creatorId).eq('method_type', 'stripe_connect').limit(1);
      if (!(methods||[])[0]?.stripe_account_id) return Response.json({ error: 'No Stripe account' }, { status: 404 });
      const link = await stripe.accounts.createLoginLink(methods[0].stripe_account_id);
      return Response.json({ url: link.url });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[stripeConnectOnboard]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});