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
      console.error('[createCampaignCheckout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId, amount, campaignName } = await req.json();

    if (!campaignId || !amount) {
      return Response.json({ error: 'campaignId and amount are required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount < 1 || amount > 100000) {
      return Response.json({ error: 'Invalid amount' }, { status: 400 });
    }

    let campaigns;
    try {
      campaigns = await base44.asServiceRole.entities.BrandCampaign.filter({ id: campaignId }, null, 1);
    } catch (e) {
      console.error('[createCampaignCheckout] Campaign lookup failed:', e.message);
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (!campaigns[0]) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: campaignName || `Brand Campaign: ${campaigns[0].campaign_name || 'Campaign'}`,
            description: 'Brand marketing campaign payment'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/BrandCampaigns?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/BrandCampaigns?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        campaign_id: campaignId,
        brand_partner_id: campaigns[0].brand_partner_id || '',
        creator_id: campaigns[0].creator_id || '',
        user_email: user.email
      }
    });

    console.log('[createCampaignCheckout] Session:', session.id, campaignId, '@', amount);

    return Response.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[createCampaignCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});