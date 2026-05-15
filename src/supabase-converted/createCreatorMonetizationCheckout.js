/* eslint-disable no-undef */
// ═══ CONVERTED: createCreatorMonetizationCheckout ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), { apiVersion: '2024-12-18.acacia' });

async function checkIdempotency(supabase, key) {
  const { data: logs } = await supabase.from('wallet_audit_log').select('reason').eq('user_email', key.split(':')[0]).eq('action', 'idempotency_record').eq('related_entity_id', key).limit(1);
  if ((logs||[])[0]) return { isDuplicate: true, originalId: (logs[0].reason||'').replace('session:', '') };
  return { isDuplicate: false };
}
async function recordIdempotency(supabase, key, sessionId) {
  await supabase.from('wallet_audit_log').insert({ user_email: key.split(':')[0], action: 'idempotency_record', amount_denarii: 0, new_balance: 0, related_entity_id: key, reason: `session:${sessionId}`, timestamp_utc: new Date().toISOString() }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: users } = await supabase.from('user').select('isSuspended,suspensionReason').eq('email', user.email).limit(1);
    if ((users||[])[0]?.isSuspended) return Response.json({ error: `Account suspended` }, { status: 403 });

    const { planType, creatorId } = await req.json();
    if (!planType || !['monthly', 'yearly'].includes(planType)) return Response.json({ error: 'Invalid planType' }, { status: 400 });
    if (!creatorId) return Response.json({ error: 'creatorId required' }, { status: 400 });

    const { data: creators } = await supabase.from('creator').select('user_email').eq('id', creatorId).limit(1);
    if (!(creators||[])[0] || creators[0].user_email !== user.email) return Response.json({ error: 'You can only activate monetization for your own profile' }, { status: 403 });

    const priceAmount = planType === 'monthly' ? 5 : 12;
    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:creator_monetization_${planType}:${priceAmount}:${hourTs}`;
    const idem = await checkIdempotency(supabase, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true, originalId: idem.originalId }, { status: 409 });

    const isMonthly = planType === 'monthly';
    const priceId = isMonthly ? 'price_1QoGxnKJQ5Xtmx7I1Q8fWUZS' : 'price_1QoGxnKJQ5Xtmx7ICuwk3GIr';
    const origin = req.headers.get('origin') || 'https://legionlive.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], line_items: [{ price: priceId, quantity: 1 }],
      mode: isMonthly ? 'subscription' : 'payment', customer_email: user.email,
      success_url: `${origin}/CreatorMonetization?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${origin}/CreatorMonetization?cancelled=true`,
      metadata: { creator_id: creatorId, user_email: user.email, plan_type: planType, purchase_type: 'creator_monetization' }
    });

    await recordIdempotency(supabase, idempotencyKey, session.id);
    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[createCreatorMonetizationCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});