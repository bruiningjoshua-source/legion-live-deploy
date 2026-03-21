import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Update Creator KYC Tier Based on Earnings
 * Tier 0: <$500/month (no KYC required)
 * Tier 1: $500-$5k/month (light KYC: ID + address)
 * Tier 2: $5k+/month (full KYC: income verification + tax docs)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { creatorEmail } = await req.json();
    if (!creatorEmail) return Response.json({ error: 'Creator email required' }, { status: 400 });

    // Calculate monthly earnings (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
    const recentPayments = await base44.asServiceRole.entities.CurrencyPurchase.filter(
      { 
        user_email: creatorEmail,
        created_date: { $gte: thirtyDaysAgo }
      }
    ).catch(() => []);

    const monthlyEarnings = recentPayments.reduce((sum, p) => {
      // Assume 65% creator share (standard)
      return sum + (p.price_usd * 0.65);
    }, 0);

    // Determine tier
    let tier, requiresKyc, limit;
    if (monthlyEarnings < 500) {
      tier = 'tier_0_under500';
      requiresKyc = false;
      limit = null;
    } else if (monthlyEarnings < 5000) {
      tier = 'tier_1_500_5k';
      requiresKyc = true;
      limit = 2000; // Monthly limit
    } else {
      tier = 'tier_2_5k_plus';
      requiresKyc = true;
      limit = 10000; // Monthly limit
    }

    // Get or create KYC tier record
    const existing = await base44.asServiceRole.entities.CreatorKYCTier.filter(
      { creator_email: creatorEmail }, null, 1
    ).catch(() => []);

    const tierRecord = existing.length > 0 
      ? await base44.asServiceRole.entities.CreatorKYCTier.update(existing[0].id, {
          tier,
          monthly_earnings_usd: monthlyEarnings,
          kyc_required: requiresKyc,
          withdrawal_limit_usd: limit,
          tier_last_updated: new Date().toISOString(),
          withdrawal_blocked: requiresKyc ? true : false
        })
      : await base44.asServiceRole.entities.CreatorKYCTier.create({
          creator_email: creatorEmail,
          tier,
          monthly_earnings_usd: monthlyEarnings,
          kyc_required: requiresKyc,
          withdrawal_limit_usd: limit,
          tier_last_updated: new Date().toISOString(),
          withdrawal_blocked: requiresKyc ? true : false
        });

    // Notify creator if KYC newly required
    if (requiresKyc && existing.length === 0) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: creatorEmail,
        type: 'kyc_required',
        title: 'KYC Verification Required',
        message: tier === 'tier_1_500_5k' 
          ? 'You\'ve reached $500+ in earnings. Please complete identity verification to continue withdrawals.'
          : 'You\'ve reached $5k+ in earnings. Full KYC verification is now required.',
        is_read: false,
        created_date: new Date().toISOString()
      }).catch(() => {});
    }

    console.log(`[updateCreatorKYCTier] ${creatorEmail}: ${tier} ($${monthlyEarnings.toFixed(2)}/mo)`);

    return Response.json({ 
      success: true, 
      tier, 
      monthlyEarnings: monthlyEarnings.toFixed(2),
      requiresKyc 
    });

  } catch (error) {
    console.error('[updateCreatorKYCTier] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});