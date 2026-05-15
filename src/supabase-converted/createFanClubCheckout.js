/* eslint-disable no-undef */
// ═══ CONVERTED: createFanClubCheckout ═══
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

    const { creator_id, tier, price_usd, tier_name, perks, csrfToken } = await req.json();
    if (!creator_id || !tier || !price_usd) return Response.json({ error: 'Missing fields' }, { status: 400 });
    if (!csrfToken || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF' }, { status: 403 });

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:fanclub_${creator_id}_${tier}:${price_usd}:${hourTs}`;
    const idem = await checkIdempotency(supabase, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true }, { status: 409 });

    const { data: creators } = await supabase.from('creator').select('display_name,user_email').eq('id', creator_id).limit(1);
    if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
    if (creators[0].user_email === user.email) return Response.json({ error: 'Cannot join own fan club' }, { status: 400 });

    const { data: existing } = await supabase.from('fan_club_membership').select('id').eq('user_email', user.email).eq('creator_id', creator_id).eq('status', 'active').limit(1);
    if ((existing||[]).length) return Response.json({ error: 'Already a member' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://legionlive.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `${creators[0].display_name} — ${tier_name||'Fan Club'}` }, unit_amount: Math.round(price_usd * 100), recurring: { interval: 'month' } }, quantity: 1 }],
      mode: 'subscription', customer_email: user.email,
      success_url: `${origin}/FanClubs?success=true&creator_id=${creator_id}`, cancel_url: `${origin}/FanClubs?cancelled=true`,
      metadata: { type: 'fan_club_membership', creator_id, user_email: user.email, tier: tier.toString(), tier_name: tier_name||'', price_usd: price_usd.toString() }
    });

    await recordIdempotency(supabase, idempotencyKey, session.id);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('[createFanClubCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});