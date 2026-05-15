/* eslint-disable no-undef */
// ═══ CONVERTED: createCampaignCheckout ═══
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

    const { campaignId, amount, campaignName } = await req.json();
    if (!campaignId || !amount) return Response.json({ error: 'campaignId and amount required' }, { status: 400 });

    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:campaign_${campaignId}:${amount}:${hourTs}`;
    const idem = await checkIdempotency(supabase, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true }, { status: 409 });

    const { data: campaigns } = await supabase.from('brand_campaign').select('campaign_name,brand_partner_id,creator_id').eq('id', campaignId).limit(1);
    if (!(campaigns||[])[0]) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    const origin = req.headers.get('origin') || 'https://legionlive.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: campaignName || `Campaign: ${campaigns[0].campaign_name}` }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      mode: 'payment', customer_email: user.email,
      success_url: `${origin}/BrandCampaigns?success=true`, cancel_url: `${origin}/BrandCampaigns?cancelled=true`,
      metadata: { campaign_id: campaignId, brand_partner_id: campaigns[0].brand_partner_id||'', creator_id: campaigns[0].creator_id||'', user_email: user.email }
    });

    await recordIdempotency(supabase, idempotencyKey, session.id);
    return Response.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[createCampaignCheckout] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});