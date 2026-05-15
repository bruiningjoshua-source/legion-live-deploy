/* eslint-disable no-undef */
// ═══ CONVERTED: createPPVCheckout ═══
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

    const { event_id, csrfToken } = await req.json();
    if (!event_id) return Response.json({ error: 'Invalid event_id' }, { status: 400 });
    if (!csrfToken || csrfToken.length < 20) return Response.json({ error: 'Invalid CSRF' }, { status: 403 });

    const { data: events } = await supabase.from('ppv_event').select('*').eq('id', event_id).limit(1);
    const ppvEvent = (events||[])[0];
    if (!ppvEvent) return Response.json({ error: 'Event not found' }, { status: 404 });

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:ppv_${event_id}:${ppvEvent.price_usd}:${hourTs}`;
    const idem = await checkIdempotency(supabase, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true }, { status: 409 });

    const { data: existingTickets } = await supabase.from('ppv_ticket').select('id').eq('event_id', event_id).eq('user_email', user.email).eq('status', 'valid').limit(1);
    if ((existingTickets||[]).length) return Response.json({ error: 'Already have a ticket' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://legionlive.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: ppvEvent.title || 'PPV Event' }, unit_amount: Math.round(ppvEvent.price_usd * 100) }, quantity: 1 }],
      mode: 'payment', customer_email: user.email,
      success_url: `${origin}/PPVEvents?success=true&event_id=${event_id}`, cancel_url: `${origin}/PPVEvents?cancelled=true`,
      metadata: { event_id, user_email: user.email, type: 'ppv_ticket' }
    });

    await recordIdempotency(supabase, idempotencyKey, session.id);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('[createPPVCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});