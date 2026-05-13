import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Request a withdrawal from creator earnings
 * Validates balance, minimum amount, and payout method setup
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, method } = await req.json();

    if (!amount || amount < 20) {
      return Response.json({ error: 'Minimum withdrawal is $20' }, { status: 400 });
    }

    if (!method || !['bank_account', 'paypal', 'crypto'].includes(method)) {
      return Response.json({ error: 'Invalid payout method' }, { status: 400 });
    }

    // KYC gate — require verified identity before any withdrawal
    const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1).catch(() => []);
    if (!creators[0] || creators[0].kyc_status !== 'verified') {
      return Response.json({ error: 'Identity verification (KYC) required before withdrawals.' }, { status: 403 });
    }

    // Fetch user wallet
    const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
    const wallet = wallets?.[0];

    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const balanceUsd = (wallet.denarii_balance || 0) / 180 * 0.60;
    if (balanceUsd < amount) {
      return Response.json({ 
        error: `Insufficient balance. Available: $${balanceUsd.toFixed(2)}` 
      }, { status: 400 });
    }

    // Check if creator has monetization subscription
    const subs = await base44.entities.CreatorSubscription?.filter(
      { user_email: user.email, status: 'active' }, null, 1
    ).catch(() => []);

    if (!subs?.length) {
      return Response.json({ error: 'Creator Monetization required to withdraw' }, { status: 403 });
    }

    // Check if payout method is configured
    const payoutMethods = await base44.entities.CreatorPayoutMethod?.filter(
      { creator_email: user.email, method_type: method, is_active: true }, null, 1
    ).catch(() => []);

    if (!payoutMethods?.length) {
      return Response.json({ error: `${method} payout method not configured` }, { status: 400 });
    }

    // Calculate fee (1-2% based on method)
    const feePercent = method === 'crypto' ? 0.02 : 0.01;
    const fee = amount * feePercent;
    const netAmount = amount - fee;

    // Create withdrawal record
    const withdrawal = await base44.entities.CreatorPayout?.create({
      creator_email: user.email,
      amount_usd: amount,
      fee_usd: fee,
      net_amount_usd: netAmount,
      method_type: method,
      status: 'pending',
      requested_date: new Date().toISOString(),
      processed_date: null
    }).catch(() => null);

    if (!withdrawal) {
      return Response.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
    }

    // Deduct from wallet — canonical rate: 180 Denarii/$1, creator earns 60%
    const denariiToDeduct = Math.ceil(amount / (1/180 * 0.60));
    await base44.asServiceRole.entities.Wallet.update(wallet.id, {
      denarii_balance: Math.max(0, (wallet.denarii_balance || 0) - denariiToDeduct)
    }).catch(err => {
      console.error('[requestWithdrawal] Wallet deduction failed:', err);
      throw err;
    });

    // Log to audit (requires service role — WalletAuditLog has admin-only create RLS)
    const auditLog = await base44.asServiceRole.entities.WalletAuditLog.create({
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
      amount: amount,
      fee: fee,
      net_amount: netAmount,
      method: method,
      status: 'pending',
      message: 'Withdrawal request submitted. You will receive funds within 3-5 business days.'
    });

  } catch (error) {
    console.error('[requestWithdrawal] Error:', error);
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
});