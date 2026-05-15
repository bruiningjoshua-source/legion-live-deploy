/* eslint-disable no-undef */
// ═══ CONVERTED: createDenariiCheckout — Base44 → Supabase Edge Function ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      console.error('[createDenariiCheckout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authUser;

    // TOS enforcement
    const { data: userRecords } = await supabase
      .from('user')
      .select('tos_accepted')
      .eq('email', user.email)
      .limit(1);
    if (!(userRecords || [])[0]?.tos_accepted) {
      return Response.json({ error: 'You must accept the Terms of Service before making purchases.', tos_required: true }, { status: 403 });
    }

    const body = await req.json();
    const packageId = String(body.packageId || '').trim();
    const denarii = Number(body.denarii);
    const bonus = Number(body.bonus) || 0;
    const price = Number(body.price);
    const packageName = String(body.packageName || '').trim().substring(0, 100);
    const csrfToken = String(body.csrfToken || '').trim();

    if (!csrfToken || csrfToken.length < 20) {
      return Response.json({ error: 'Invalid security token' }, { status: 403 });
    }

    if (!packageId || !denarii || !price) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Number.isFinite(price) || price <= 0 || price > 10000) {
      return Response.json({ error: 'Invalid price' }, { status: 400 });
    }

    if (!Number.isInteger(denarii) || denarii <= 0 || denarii > 1000000) {
      return Response.json({ error: 'Invalid denarii amount' }, { status: 400 });
    }

    if (!Number.isInteger(bonus) || bonus < 0 || bonus > 1000000) {
      return Response.json({ error: 'Invalid bonus amount' }, { status: 400 });
    }

    const expectedRatio = denarii / price;
    if (expectedRatio > 450 || expectedRatio < 140) {
      return Response.json({ error: 'Invalid package configuration' }, { status: 400 });
    }

    // Idempotency check
    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:denarii:${price}:${hourTs}`;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
      const { data: existingCheckouts } = await supabase
        .from('wallet_audit_log')
        .select('*')
        .eq('user_email', user.email)
        .eq('action', 'checkout_initiated')
        .ilike('related_entity_id', `%${packageId}%`)
        .gte('timestamp_utc', fiveMinutesAgo)
        .order('timestamp_utc', { ascending: false })
        .limit(5);

      const recentDuplicate = (existingCheckouts || []).find(c =>
        c.reason?.includes(`$${price}`)
      );

      if (recentDuplicate) {
        return Response.json({
          duplicate: true,
          message: 'This checkout session already exists',
          sessionId: recentDuplicate.related_entity_id
        }, { status: 409 });
      }
    } catch (e) {
      console.warn('[createDenariiCheckout] Idempotency check failed:', e.message);
    }

    // Fraud risk analysis
    let riskLevel = 'LOW';
    let shouldCreateReview = false;
    try {
      let riskScore = 0;
      const flags = [];
      if (price > 5000) { riskScore += 40; flags.push(`HIGH_VALUE:$${price}`); }

      const { data: users } = await supabase
        .from('user')
        .select('chargeback_count')
        .eq('email', user.email)
        .limit(1);
      if ((users || [])[0]?.chargeback_count >= 3) {
        riskScore += 50; flags.push(`CHARGEBACKS:${users[0].chargeback_count}`);
      }

      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
      const { data: dayPurchases } = await supabase
        .from('currency_purchase')
        .select('price_usd')
        .eq('user_email', user.email)
        .gte('created_date', oneDayAgo);
      const dailyTotal = (dayPurchases || []).reduce((sum, p) => sum + (p.price_usd || 0), 0) + price;
      if (dailyTotal > 10000) { riskScore += 35; flags.push(`DAILY:$${dailyTotal.toFixed(2)}`); }

      riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MEDIUM' : 'LOW';
      shouldCreateReview = riskScore > 40;

      if (shouldCreateReview) {
        await supabase.from('wallet_audit_log').insert({
          user_email: user.email,
          action: 'fraud_review_case',
          amount_denarii: denarii,
          new_balance: 0,
          reason: `${riskLevel} risk denarii purchase | $${price} | Flags: ${flags.join(', ')}`,
          timestamp_utc: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('[createDenariiCheckout] Fraud analysis failed:', e.message);
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || 'https://legionlive.com';

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

    // Audit log
    await supabase.from('wallet_audit_log').insert({
      user_email: user.email,
      action: 'checkout_initiated',
      amount_denarii: denarii,
      new_balance: 0,
      related_entity_id: session.id,
      reason: `Denarii checkout: $${price} | Risk: ${riskLevel} | Key: ${idempotencyKey}`,
      timestamp_utc: new Date().toISOString()
    }).catch(() => {});

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