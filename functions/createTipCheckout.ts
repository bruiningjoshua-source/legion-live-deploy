import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// Rate limiting: 5 tips per minute per user
const tipBuckets = new Map();
function checkTipRate(email) {
  const now = Date.now();
  const bucket = tipBuckets.get(email);
  if (!bucket || now > bucket.resetAt) {
    tipBuckets.set(email, { count: 1, resetAt: now + 60000 });
    return { allowed: true };
  }
  bucket.count++;
  if (bucket.count > 5) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

// Fraud detection for tips
const tipHistory = new Map();
function detectTipFraud(email, amount) {
  if (!tipHistory.has(email)) {
    tipHistory.set(email, { tips: [], chargebacks: [] });
  }
  const history = tipHistory.get(email);
  const now = Date.now();
  const oneDayAgo = now - 86400000;
  
  history.tips = history.tips.filter(t => t.timestamp > oneDayAgo);
  const total24h = history.tips.reduce((sum, t) => sum + t.amount, 0);
  
  let riskScore = 0;
  const flags = [];
  
  if (total24h + amount > 5000) {
    riskScore += 25;
    flags.push('high_tip_velocity_24h');
  }
  if (amount > 2000) {
    riskScore += 20;
    flags.push('unusually_large_tip');
  }
  
  history.tips.push({ amount, timestamp: now });
  return { isSuspicious: riskScore >= 50, riskScore, flags };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[createTipCheckout] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId, amount, message, streamId, isAnonymous, csrfToken } = await req.json();

    // Input validation
    if (!creatorId || !amount) {
      return Response.json({ error: 'Creator ID and amount are required' }, { status: 400 });
    }
    if (typeof creatorId !== 'string' || creatorId.length > 100) {
      return Response.json({ error: 'Invalid creator ID' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount < 1 || amount > 5000) {
      return Response.json({ error: 'Tip amount must be between $1 and $5,000' }, { status: 400 });
    }
    if (message && (typeof message !== 'string' || message.length > 500)) {
      return Response.json({ error: 'Message must be under 500 characters' }, { status: 400 });
    }

    // CSRF validation
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Rate limiting
    const rateCheck = checkTipRate(user.email);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Rate limited: 5 tips per minute', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    // Fraud detection
    const fraud = detectTipFraud(user.email, amount);
    if (fraud.isSuspicious) {
      console.warn(`[createTipCheckout] FRAUD FLAG for ${user.email}:`, fraud.flags);
    }

    // Self-tip prevention
    let creators;
    try {
      creators = await base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1);
    } catch (e) {
      console.error('[createTipCheckout] Creator lookup failed:', e.message);
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (!creators[0]) {
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }
    if (creators[0].user_email === user.email) {
      return Response.json({ error: 'You cannot tip yourself' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const successUrl = streamId
      ? `${origin}/WatchStream?id=${streamId}&tip_success=true`
      : `${origin}/CreatorProfile?id=${creatorId}&tip_success=true`;
    const cancelUrl = streamId
      ? `${origin}/WatchStream?id=${streamId}&tip_cancelled=true`
      : `${origin}/CreatorProfile?id=${creatorId}&tip_cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tip for ${creators[0].display_name}`,
            description: message ? message.substring(0, 200).replace(/<[^>]*>/g, '') : 'Support this creator'
          },
          unit_amount: Math.round(amount * 100)
        },
        quantity: 1
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        creator_id: creatorId,
        sender_email: user.email,
        amount_usd: amount.toString(),
        message: (message || '').substring(0, 500).replace(/<[^>]*>/g, ''),
        stream_id: streamId || '',
        is_anonymous: isAnonymous ? 'true' : 'false',
        purchase_type: 'tip',
        risk_score: fraud.riskScore.toString()
      }
    });

    console.log('[createTipCheckout] Session:', session.id, '$', amount, '→', creators[0].display_name);

    return Response.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[createTipCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});