/* eslint-disable no-undef */
// ═══ CONVERTED: requestWithdrawal — Base44 → Supabase Edge Function ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, method } = await req.json();

    if (!amount || amount < 20) {
      return Response.json({ error: 'Minimum withdrawal is $20' }, { status: 400 });
    }

    if (!method || !['bank_account', 'paypal', 'crypto'].includes(method)) {
      return Response.json({ error: 'Invalid payout method' }, { status: 400 });
    }

    // KYC gate
    const { data: creators } = await supabase
      .from('creator')
      .select('kyc_status')
      .eq('user_email', user.email)
      .limit(1);
    if (!(creators || [])[0] || creators[0].kyc_status !== 'verified') {
      return Response.json({ error: 'Identity verification (KYC) required before withdrawals.' }, { status: 403 });
    }

    // Fetch wallet
    const { data: wallets } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_email', user.email)
      .limit(1);
    const wallet = (wallets || [])[0];
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const balanceUsd = (wallet.denarii_balance || 0) / 180 * 0.60;
    if (balanceUsd < amount) {
      return Response.json({ error: `Insufficient balance. Available: $${balanceUsd.toFixed(2)}` }, { status: 400 });
    }

    // Check monetization subscription
    const { data: subs } = await supabase
      .from('creator_subscription')
      .select('id')
      .eq('user_email', user.email)
      .eq('status', 'active')
      .limit(1);
    if (!(subs || []).length) {
      return Response.json({ error: 'Creator Monetization required to withdraw' }, { status: 403 });
    }

    // Check payout method
    const { data: payoutMethods } = await supabase
      .from('creator_payout_method')
      .select('id')
      .eq('creator_email', user.email)
      .eq('method_type', method)
      .eq('is_active', true)
      .limit(1);
    if (!(payoutMethods || []).length) {
      return Response.json({ error: `${method} payout method not configured` }, { status: 400 });
    }

    const feePercent = method === 'crypto' ? 0.02 : 0.01;
    const fee = amount * feePercent;
    const netAmount = amount - fee;

    // Create withdrawal record
    const { data: withdrawal } = await supabase
      .from('creator_payout')
      .insert({
        creator_email: user.email,
        amount_usd: amount,
        fee_usd: fee,
        net_amount_usd: netAmount,
        method_type: method,
        status: 'pending',
        requested_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (!withdrawal) {
      return Response.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
    }

    // Deduct from wallet
    const denariiToDeduct = Math.ceil(amount / (1/180 * 0.60));
    await supabase.from('wallet').update({
      denarii_balance: Math.max(0, (wallet.denarii_balance || 0) - denariiToDeduct)
    }).eq('id', wallet.id);

    // Audit log
    await supabase.from('wallet_audit_log').insert({
      user_email: user.email,
      wallet_id: wallet.id,
      action: 'withdrawal_request',
      amount_denarii: -denariiToDeduct,
      previous_balance: wallet.denarii_balance,
      new_balance: Math.max(0, (wallet.denarii_balance || 0) - denariiToDeduct),
      related_entity_id: withdrawal.id,
      reason: `Withdrawal request: $${amount.toFixed(2)} via ${method} (Fee: $${fee.toFixed(2)})`,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp_utc: new Date().toISOString()
    }).catch(() => null);

    console.log(`[requestWithdrawal] ${user.email} requested $${amount} withdrawal via ${method}`);

    return Response.json({
      success: true,
      withdrawal_id: withdrawal.id,
      amount, fee, net_amount: netAmount,
      method, status: 'pending',
      message: 'Withdrawal request submitted. You will receive funds within 3-5 business days.'
    });

  } catch (error) {
    console.error('[requestWithdrawal] Error:', error);
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
});