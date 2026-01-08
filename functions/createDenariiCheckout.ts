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
      console.error('[createDenariiCheckout] Unauthorized - no user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId, denarii, bonus, price, packageName } = await req.json();

    if (!packageId || !denarii || !price) {
      console.error('[createDenariiCheckout] Missing required fields', { packageId, denarii, price });
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[createDenariiCheckout] Creating checkout for:', packageName, 'Price:', price);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: packageName || `${denarii.toLocaleString()} Denarii`,
            description: bonus > 0 
              ? `${denarii.toLocaleString()} Denarii + ${bonus.toLocaleString()} Bonus` 
              : `${denarii.toLocaleString()} Denarii`
          },
          unit_amount: Math.round(price * 100) // Convert to cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/Wallet?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.headers.get('origin')}/Wallet?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        package_id: packageId,
        denarii_amount: denarii.toString(),
        bonus_denarii: (bonus || 0).toString(),
        purchase_type: 'denarii'
      }
    });

    console.log('[createDenariiCheckout] Checkout session created:', session.id);

    return Response.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('[createDenariiCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});