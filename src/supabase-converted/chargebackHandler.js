/* eslint-disable no-undef */
// ═══ CONVERTED: chargebackHandler ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.5.0';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2024-12-18.acacia' });

async function gatherEvidence(supabase, email, chargeId) {
  const evidence = {};
  const { data: users } = await supabase.from('user').select('full_name,created_date').eq('email', email).limit(1);
  if ((users||[])[0]) { evidence.customer_name = users[0].full_name; evidence.customer_email_address = email; const days = Math.floor((Date.now() - new Date(users[0].created_date).getTime()) / 86400000); if (days > 30) evidence.product_description = `Active member for ${days} days. `; }
  const { data: purchases } = await supabase.from('currency_purchase').select('id').eq('user_email', email).limit(20);
  if ((purchases||[]).length > 1) evidence.product_description = (evidence.product_description||'') + `${purchases.length} purchases. `;
  const { data: gifts } = await supabase.from('gift_transaction').select('id').eq('sender_email', email).limit(50);
  if ((gifts||[]).length > 0) evidence.product_description = (evidence.product_description||'') + `Used currency for ${gifts.length} gifts. `;
  evidence.refund_policy = 'Virtual currency is non-refundable per ToS. Delivered instantly.';
  await supabase.from('platform_analytics').insert({ metric_type: 'dispute_evidence', metric_name: 'auto_gathered', metric_value: 1, metadata: { charge_id: chargeId, customer_email: email, evidence } }).catch(() => {});
  return evidence;
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const data = await req.json();
    const { action } = data;

    if (action === 'handle_dispute') {
      const dispute = await stripe.disputes.retrieve(data.disputeId);
      const charge = await stripe.charges.retrieve(dispute.charge);
      const email = charge.billing_details?.email || charge.metadata?.email;
      await supabase.from('platform_analytics').insert({ metric_type: 'chargeback', metric_name: dispute.reason, metric_value: dispute.amount / 100, metadata: { dispute_id: data.disputeId, charge_id: dispute.charge, customer_email: email, amount: dispute.amount/100 } });
      const { data: prev } = await supabase.from('platform_analytics').select('id').eq('metric_type', 'chargeback').limit(10);
      if ((prev||[]).length >= 3) await supabase.from('user_ban').insert({ user_email: email, reason: 'Multiple chargebacks', ban_type: 'permanent', automated: true }).catch(() => {});
      const evidence = await gatherEvidence(supabase, email, dispute.charge);
      return Response.json({ success: true, dispute_id: data.disputeId, evidence_gathered: Object.keys(evidence).length > 0 });
    }
    if (action === 'get_disputes') {
      const authHeader = req.headers.get('Authorization') || '';
      const tkn = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(tkn);
      const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
      if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const disputes = await stripe.disputes.list({ limit: 100 });
      return Response.json({ disputes: disputes.data });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});