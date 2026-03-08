import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-12-18.acacia'
});

// Rate limiting: 3 PPV purchases per hour per user
const ppvBuckets = new Map();
function checkPPVRate(email) {
  const now = Date.now();
  const bucket = ppvBuckets.get(email);
  if (!bucket || now > bucket.resetAt) {
    ppvBuckets.set(email, { count: 1, resetAt: now + 3600000 });
    return { allowed: true };
  }
  bucket.count++;
  if (bucket.count > 3) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

// Fraud detection for PPV
const ppvHistory = new Map();
function detectPPVFraud(email, price) {
  if (!ppvHistory.has(email)) {
    ppvHistory.set(email, { purchases: [] });
  }
  const history = ppvHistory.get(email);
  const now = Date.now();
  const oneDayAgo = now - 86400000;
  
  history.purchases = history.purchases.filter(p => p.timestamp > oneDayAgo);
  const total24h = history.purchases.reduce((sum, p) => sum + p.price, 0);
  
  let riskScore = 0;
  const flags = [];
  
  if (total24h + price > 3000) {
    riskScore += 30;
    flags.push('high_ppv_spending_24h');
  }
  
  history.purchases.push({ price, timestamp: now });
  return { isSuspicious: riskScore >= 50, riskScore, flags };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, csrfToken } = await req.json();

    // Input validation
    if (!event_id || typeof event_id !== 'string' || event_id.length > 100) {
      return Response.json({ error: 'Invalid event_id' }, { status: 400 });
    }

    // CSRF validation
    if (!csrfToken || typeof csrfToken !== 'string' || csrfToken.length < 20) {
      return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Rate limiting
    const rateCheck = checkPPVRate(user.email);
    if (!rateCheck.allowed) {
      return Response.json({ error: 'Rate limited: 3 PPV purchases per hour', retryAfter: rateCheck.retryAfter }, { status: 429 });
    }

    let ppvEvent;
    try {
      const events = await base44.asServiceRole.entities.PPVEvent.filter({ id: event_id }, null, 1);
      ppvEvent = events[0];
    } catch (e) {
      console.error('[createPPVCheckout] Event lookup failed:', e.message);
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!ppvEvent) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!ppvEvent.price_usd || ppvEvent.price_usd <= 0 || ppvEvent.price_usd > 100) {
      return Response.json({ error: 'Event has invalid price' }, { status: 400 });
    }

    // Fraud detection
    const fraud = detectPPVFraud(user.email, ppvEvent.price_usd);
    if (fraud.isSuspicious) {
      console.warn(`[createPPVCheckout] FRAUD FLAG for ${user.email}:`, fraud.flags);
    }

    // Existing ticket check
    const existingTickets = await base44.asServiceRole.entities.PPVTicket.filter({
      event_id,
      user_email: user.email,
      status: 'valid'
    }, null, 1);

    if (existingTickets.length > 0) {
      return Response.json({ error: 'You already have a ticket' }, { status: 400 });
    }

    // Sold out check
    if (ppvEvent.max_tickets && (ppvEvent.ticket_count || 0) >= ppvEvent.max_tickets) {
      return Response.json({ error: 'Event is sold out' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: ppvEvent.title || 'PPV Event',
            description: `PPV Event Ticket${ppvEvent.category ? ' — ' + ppvEvent.category : ''}`,
          },
          unit_amount: Math.round(ppvEvent.price_usd * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      success_url: `${origin}/PPVEvents?success=true&event_id=${event_id}`,
      cancel_url: `${origin}/PPVEvents?cancelled=true`,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        event_id,
        user_email: user.email,
        type: 'ppv_ticket',
        risk_score: fraud.riskScore.toString()
      }
    });

    console.log('[createPPVCheckout] Session:', session.id, user.email, '→ event:', ppvEvent.title, '@', ppvEvent.price_usd);

    return Response.json({
      url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('[createPPVCheckout] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});