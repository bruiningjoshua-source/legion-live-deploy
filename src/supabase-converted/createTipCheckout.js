/* eslint-disable no-undef */
// ═══ CONVERTED: createTipCheckout ═══
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

    const { creatorId, amount, message, streamId, isAnonymous, csrfToken } = await req.json();
    if (!creatorId || !amount) return Response.json({ error: 'Creator ID and amount required' }, { status: 400 });
    if (typeof amount !== 'number' || amount < 1 || amount > 5000) return Response.json({ error: 'Tip $1-$5000' }, { status: 400 });
    if (!csrfToken || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF' }, { status: 403 });

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:tip:${amount}:${hourTs}`;
    const idem = await checkIdempotency(supabase, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true }, { status: 409 });

    const { data: creators } = await supabase.from('creator').select('display_name,user_email').eq('id', creatorId).limit(1);
    if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
    if (creators[0].user_email === user.email) return Response.json({ error: 'Cannot tip yourself' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://legionlive.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `Tip for ${creators[0].display_name}` }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      mode: 'payment', customer_email: user.email,
      success_url: streamId ? `${origin}/WatchStream?id=${streamId}&tip_success=true` : `${origin}/CreatorProfile?id=${creatorId}&tip_success=true`,
      cancel_url: streamId ? `${origin}/WatchStream?id=${streamId}` : `${origin}/CreatorProfile?id=${creatorId}`,
      metadata: { creator_id: creatorId, sender_email: user.email, amount_usd: amount.toString(), message: (message||'').substring(0,500), stream_id: streamId||'', is_anonymous: isAnonymous ? 'true' : 'false', purchase_type: 'tip' }
    });

    await recordIdempotency(supabase, idempotencyKey, session.id);
    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[createTipCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});