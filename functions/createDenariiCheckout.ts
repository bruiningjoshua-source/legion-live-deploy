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
      console.error('[createDenariiCheckout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const packageId = String(body.packageId || '').trim();
    const denarii = Number(body.denarii);
    const bonus = Number(body.bonus) || 0;
    const price = Number(body.price);
    const packageName = String(body.packageName || '').trim().substring(0, 100);
    const csrfToken = String(body.csrfToken || '').trim();

    // CSRF validation
    if (!csrfToken || csrfToken.length < 20) {
      console.error('[createDenariiCheckout] Invalid CSRF token');
      return Response.json({ error: 'Invalid security token' }, { status: 403 });
    }

    // Validate all inputs
    if (!packageId || !denarii || !price) {
      console.error('[createDenariiCheckout] Missing fields:', { packageId, denarii, price });
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Number.isFinite(price) || price <= 0 || price > 10000) {
      console.error('[createDenariiCheckout] Invalid price:', price);
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }

    if (!Number.isInteger(denarii) || denarii <= 0 || denarii > 1000000) {
      console.error('[createDenariiCheckout] Invalid denarii:', denarii);
      return Response.json({ error: 'Invalid denarii amount' }, { status: 400 });
    }

    if (!Number.isInteger(bonus) || bonus < 0 || bonus > 1000000) {
      console.error('[createDenariiCheckout] Invalid bonus:', bonus);
      return Response.json({ error: 'Invalid bonus amount' }, { status: 400 });
    }

    // Validate price-to-denarii ratio (260 Denarii/$1 base, allow 200–400 range for bonuses)
    const expectedRatio = denarii / price;
    if (expectedRatio > 400 || expectedRatio < 200) {
      console.error('[createDenariiCheckout] Suspicious ratio:', expectedRatio, { denarii, price });
      return Response.json({ error: 'Invalid package configuration' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: packageName || `${denarii.toLocaleString()} Denarii`,
            description: (bonus && bonus > 0)
              ? `${denarii.toLocaleString()} Denarii + ${bonus.toLocaleString()} Bonus`
              : `${denarii.toLocaleString()} Denarii`
          },
          unit_amount: Math.round(price * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/Wallet?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/Wallet?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        user_email: user.email,
        package_id: packageId,
        package_name: packageName || '',
        denarii_amount: denarii.toString(),
        bonus_denarii: (bonus || 0).toString(),
        vip_points: String(body.vipPoints || 0),
        lotto_tickets: String(body.lottoTickets || 0),
        purchase_type: 'denarii'
      }
    });

    console.log('[createDenariiCheckout] Session created:', session.id, 'for', user.email, '—', denarii, 'denarii @ $', price);

    return Response.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[createDenariiCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});