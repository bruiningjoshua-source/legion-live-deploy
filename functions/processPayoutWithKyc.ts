import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * SECURITY + REVENUE FIX: Process payouts with KYC enforcement
 * - Verifies KYC status before allowing withdrawal
 * - Validates payout amount against creator guarantee earnings
 * - Logs all payout requests to audit trail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount_usd } = await req.json();

    if (!amount_usd || amount_usd <= 0) {
      return Response.json({ error: 'Invalid payout amount' }, { status: 400 });
    }

    if (amount_usd > 100000) {
      return Response.json({ error: 'Payout amount exceeds limit' }, { status: 400 });
    }

    // ── Get creator profile ──
    const creators = await base44.asServiceRole.entities.Creator.filter(
      { user_email: user.email }, null, 1
    );
    const creator = creators[0];

    if (!creator) {
      return Response.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    // SECURITY FIX: Enforce KYC verification before payout
    if (creator.kyc_status !== 'verified') {
      return Response.json({
        error: 'KYC verification required before payout',
        kyc_status: creator.kyc_status,
        details: 'Submit KYC documentation to enable withdrawals'
      }, { status: 403 });
    }

    // ── Get creator guarantee (if applicable) ──
    const guarantees = await base44.asServiceRole.entities.CreatorGuarantee.filter(
      {
        creator_id: user.email,
        is_active: true,
        start_date: { $lte: new Date().toISOString() },
        end_date: { $gte: new Date().toISOString() }
      },
      null,
      1
    );

    // REVENUE FIX: Calculate actual earnings with guarantee
    const baseEarnings = (creator.total_earnings_denarii || 0) / 180; // Convert to USD (180 Denarii/$1)
    const guaranteeEarnings = guarantees[0] ? guarantees[0].earnings_during_guarantee || 0 : 0;

    // Payout can only be withdrawn from actual earnings
    const availableForPayout = baseEarnings + guaranteeEarnings;

    if (availableForPayout < amount_usd) {
      return Response.json({
        error: 'Insufficient earnings for payout',
        requested: amount_usd,
        available: availableForPayout,
        pending_guarantee_end: guarantees[0]?.end_date || null
      }, { status: 400 });
    }

    // ── Create payout record ──
    const payout = await base44.asServiceRole.entities.CreatorPayout.create({
      creator_id: user.email,
      amount_usd: amount_usd,
      status: 'pending_review',
      requested_at: new Date().toISOString(),
      kyc_verified: true
    });

    // ── Log payout request to audit ──
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: user.email,
      action: 'admin_adjustment', // Using as payout type
      amount_denarii: -Math.floor(amount_usd * 180),
      previous_balance: creator.total_earnings_denarii || 0,
      new_balance: (creator.total_earnings_denarii || 0) - Math.floor(amount_usd * 180),
      related_entity_id: payout.id,
      reason: `Payout request: $${amount_usd} USD (KYC verified)`,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      timestamp_utc: new Date().toISOString()
    }).catch(e => console.warn('[processPayoutWithKyc] Audit log failed:', e.message));

    console.log(`[processPayoutWithKyc] ${user.email} requested payout: $${amount_usd} USD (KYC verified, available: $${availableForPayout})`);

    return Response.json({
      success: true,
      payout_id: payout.id,
      amount_usd: amount_usd,
      status: 'pending_review',
      message: 'Payout request submitted. You will receive funds within 3-5 business days.',
      guarantee_active: !!guarantees[0],
      guarantee_end_date: guarantees[0]?.end_date || null
    });

  } catch (error) {
    console.error('[processPayoutWithKyc] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});