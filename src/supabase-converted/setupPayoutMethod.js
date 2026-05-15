/* eslint-disable no-undef */
// ═══ CONVERTED: setupPayoutMethod ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { method_type, account_holder_name, account_details, is_default } = await req.json();
    if (!['bank_account', 'paypal', 'crypto'].includes(method_type)) return Response.json({ error: 'Invalid payout method' }, { status: 400 });
    if (method_type === 'bank_account' && (!account_holder_name || !account_details?.routing_number || !account_details?.account_number)) return Response.json({ error: 'Bank account requires routing and account numbers' }, { status: 400 });
    if (method_type === 'paypal' && !account_details?.paypal_email) return Response.json({ error: 'PayPal method requires email address' }, { status: 400 });
    if (method_type === 'crypto' && (!account_details?.wallet_address || !account_details?.coin_type)) return Response.json({ error: 'Crypto requires wallet address and coin type' }, { status: 400 });

    const { data: existing } = await supabase.from('creator_payout_method').select('*').eq('creator_email', user.email).eq('method_type', method_type).limit(1);
    let payoutMethod;
    if ((existing || [])[0]) {
      const { data: updated } = await supabase.from('creator_payout_method').update({ account_holder_name, account_details, is_default: is_default || false }).eq('id', existing[0].id).select().single();
      payoutMethod = updated;
    } else {
      const { data: created } = await supabase.from('creator_payout_method').insert({ creator_email: user.email, method_type, account_holder_name, account_details, is_default: is_default || false, is_active: true }).select().single();
      payoutMethod = created;
    }
    if (is_default) {
      await supabase.from('creator_payout_method').update({ is_default: false }).eq('creator_email', user.email).neq('method_type', method_type);
    }
    return Response.json({ success: true, method_id: payoutMethod?.id, method_type, is_default, message: `${method_type} payout method successfully configured` });
  } catch (error) {
    console.error('[setupPayoutMethod] Error:', error);
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
});