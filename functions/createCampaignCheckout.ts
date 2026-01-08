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
      console.error('[createCampaignCheckout] Unauthorized - no user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId, amount, campaignName } = await req.json();

    if (!campaignId || !amount) {
      console.error('[createCampaignCheckout] Missing required fields', { campaignId, amount });
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[createCampaignCheckout] Creating checkout for campaign:', campaignId, 'Amount:', amount);

    // Get the campaign
    const campaigns = await base44.asServiceRole.entities.BrandCampaign.filter({ id: campaignId }, null, 1);
    const campaign = campaigns[0];

    if (!campaign) {
      console.error('[createCampaignCheckout] Campaign not found:', campaignId);
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: campaignName || `Brand Campaign: ${campaign.campaign_name}`,
            description: `Payment for brand marketing campaign`
          },
          unit_amount: Math.round(amount * 100) // Convert to cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/BrandCampaigns?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.headers.get('origin')}/BrandCampaigns?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        campaign_id: campaignId,
        brand_partner_id: campaign.brand_partner_id,
        creator_id: campaign.creator_id,
        user_email: user.email
      }
    });

    console.log('[createCampaignCheckout] Checkout session created:', session.id);

    return Response.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('[createCampaignCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});