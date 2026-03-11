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

    // TOS enforcement — must accept before any purchase
    const userRecord = await base44.asServiceRole.entities.User.filter({ email: user.email }, null, 1).catch(() => []);
    if (!userRecord[0]?.tos_accepted) {
      return Response.json({ error: 'You must accept the Terms of Service before making purchases.', tos_required: true }, { status: 403 });
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

    // ─── IDEMPOTENCY CHECK ───
    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:denarii:${price}:${hourTs}`;
    
    try {
      const existingCheckouts = await base44.asServiceRole.entities.WalletAuditLog.filter(
        { 
          user_email: user.email,
          action: 'checkout_initiated',
          related_entity_id: { $regex: `.*${packageId}.*` }
        },
        '-timestamp_utc',
        5
      );

      // Check if same amount was checked out in last 5 minutes
      const fiveMinutesAgo = Date.now() - 300000;
      const recentDuplicate = existingCheckouts.find(c => 
        new Date(c.timestamp_utc).getTime() > fiveMinutesAgo &&
        c.reason.includes(`$${price}`)
      );

      if (recentDuplicate) {
        console.log('[createDenariiCheckout] Duplicate checkout detected:', recentDuplicate.related_entity_id);
        return Response.json({
          duplicate: true,
          message: 'This checkout session already exists',
          sessionId: recentDuplicate.related_entity_id
        }, { status: 409 });
      }
    } catch (e) {
      console.warn('[createDenariiCheckout] Idempotency check failed:', e.message);
      // Continue on error
    }

    // ─── FRAUD RISK ANALYSIS ───
    let riskLevel = 'LOW';
    let shouldCreateReview = false;

    try {
      let riskScore = 0;
      const flags = [];

      if (price > 5000) {
        riskScore += 40;
        flags.push(`HIGH_VALUE:$${price}`);
      }

      // Check user chargeback history
      const users = await base44.asServiceRole.entities.User.filter(
        { email: user.email },
        null,
        1
      );

      if (users[0]?.chargeback_count >= 3) {
        riskScore += 50;
        flags.push(`CHARGEBACKS:${users[0].chargeback_count}`);
      }

      // Check daily velocity
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const dayPurchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
        {
          user_email: user.email,
          created_date: { $gte: oneDayAgo }
        },
        null,
        100
      );

      const dailyTotal = dayPurchases.reduce((sum, p) => sum + (p.price_usd || 0), 0) + price;
      if (dailyTotal > 10000) {
        riskScore += 35;
        flags.push(`DAILY:$${dailyTotal.toFixed(2)}`);
      }

      riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';
      shouldCreateReview = riskScore > 40;

      if (shouldCreateReview) {
        try {
          await base44.asServiceRole.entities.WalletAuditLog.create({
            user_email: user.email,
            action: 'fraud_review_case',
            amount_denarii: denarii,
            new_balance: 0,
            reason: `${riskLevel} risk denarii purchase | $${price} | Flags: ${flags.join(', ')}`,
            timestamp_utc: new Date().toISOString()
          }).catch(() => {});
        } catch (e) {
          console.warn('[createDenariiCheckout] Fraud case log failed:', e.message);
        }
      }

      console.log('[createDenariiCheckout] Fraud analysis:', { riskScore, riskLevel, flags });
    } catch (e) {
      console.warn('[createDenariiCheckout] Fraud analysis failed:', e.message);
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
        purchase_type: 'denarii',
        idempotency_key: idempotencyKey,
        fraud_risk_level: riskLevel
      }
    });

    console.log('[createDenariiCheckout] Session created:', session.id, 'for', user.email, '—', denarii, 'denarii @ $', price, '| Risk:', riskLevel);

    // Log checkout initiation for audit + idempotency
    try {
      await base44.asServiceRole.entities.WalletAuditLog.create({
        user_email: user.email,
        action: 'checkout_initiated',
        amount_denarii: denarii,
        new_balance: 0,
        related_entity_id: session.id,
        reason: `Denarii checkout: $${price} | Risk: ${riskLevel} | Key: ${idempotencyKey}`,
        timestamp_utc: new Date().toISOString()
      }).catch(() => {});
    } catch (e) {
      console.warn('[createDenariiCheckout] Audit log failed:', e.message);
    }

    return Response.json({
      sessionId: session.id,
      url: session.url,
      fraudRiskLevel: riskLevel,
      requiresReview: shouldCreateReview
    });
  } catch (error) {
    console.error('[createDenariiCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});