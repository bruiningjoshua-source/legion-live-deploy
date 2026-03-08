import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * REVENUE FIX: Process creator referral bonuses
 * - Award 5000 Denarii to referrer on referred creator activation
 * - Award 5000 Denarii to referred creator on signup
 * - Apply 70% creator share guarantee for 3 months
 * - Log all referral earnings to audit trail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { referral_code } = await req.json();

    if (!referral_code || !referral_code.match(/^[A-Z0-9]{8,16}$/)) {
      return Response.json({ error: 'Invalid referral code format' }, { status: 400 });
    }

    // ── Check if referrer exists ──
    const referrals = await base44.asServiceRole.entities.CreatorReferral.filter(
      { referral_code: referral_code }, null, 1
    );

    if (!referrals[0]) {
      return Response.json({ error: 'Referral code not found' }, { status: 404 });
    }

    const referral = referrals[0];

    // Check referral status
    if (referral.status !== 'pending' && referral.status !== 'signed_up') {
      return Response.json({
        error: 'This referral has already been activated',
        status: referral.status
      }, { status: 400 });
    }

    if (referral.referred_email && referral.referred_email !== user.email) {
      return Response.json({
        error: 'Referral code belongs to a different email'
      }, { status: 403 });
    }

    // ── Mark referral as signed up (if first time) ──
    if (referral.status === 'pending') {
      await base44.asServiceRole.entities.CreatorReferral.update(referral.id, {
        referred_email: user.email,
        status: 'signed_up',
        signup_date: new Date().toISOString()
      });
    }

    // ── Award 5000 Denarii to referred creator (immediate) ──
    const referredWallets = await base44.asServiceRole.entities.Wallet.filter(
      { user_email: user.email }, null, 1
    );

    if (referredWallets[0]) {
      const oldBalance = referredWallets[0].denarii_balance || 0;
      const newBalance = oldBalance + 5000;

      await base44.asServiceRole.entities.Wallet.update(referredWallets[0].id, {
        denarii_balance: newBalance
      });

      // Log bonus to audit
      await base44.asServiceRole.entities.WalletAuditLog.create({
        user_email: user.email,
        wallet_id: referredWallets[0].id,
        action: 'referral_bonus',
        amount_denarii: 5000,
        previous_balance: oldBalance,
        new_balance: newBalance,
        related_entity_id: referral.id,
        reason: `Referral signup bonus from ${referral.referrer_id}`,
        timestamp_utc: new Date().toISOString()
      }).catch(e => console.warn('[processCreatorReferral] Audit failed:', e.message));

      console.log(`[processCreatorReferral] ${user.email} received 5000 Denarii signup bonus`);
    } else {
      // Create wallet if missing
      await base44.asServiceRole.entities.Wallet.create({
        user_email: user.email,
        denarii_balance: 5000,
        sestertii_balance: 0,
        as_balance: 0
      });
      console.log(`[processCreatorReferral] Created wallet for ${user.email} with 5000 Denarii`);
    }

    // ── Award 5000 Denarii to referrer (if not already claimed) ──
    if (!referral.reward_claimed) {
      const referrerWallets = await base44.asServiceRole.entities.Wallet.filter(
        { user_email: referral.referrer_id }, null, 1
      );

      if (referrerWallets[0]) {
        const oldBalance = referrerWallets[0].denarii_balance || 0;
        const newBalance = oldBalance + 5000;

        await base44.asServiceRole.entities.Wallet.update(referrerWallets[0].id, {
          denarii_balance: newBalance
        });

        // Log referrer bonus
        await base44.asServiceRole.entities.WalletAuditLog.create({
          user_email: referral.referrer_id,
          wallet_id: referrerWallets[0].id,
          action: 'referral_bonus',
          amount_denarii: 5000,
          previous_balance: oldBalance,
          new_balance: newBalance,
          related_entity_id: referral.id,
          reason: `Referral activation bonus: ${user.email} signed up`,
          timestamp_utc: new Date().toISOString()
        }).catch(e => console.warn('[processCreatorReferral] Referrer audit failed:', e.message));

        console.log(`[processCreatorReferral] ${referral.referrer_id} received 5000 Denarii referrer bonus`);
      }

      // Mark reward as claimed
      await base44.asServiceRole.entities.CreatorReferral.update(referral.id, {
        reward_claimed: true,
        claimed_date: new Date().toISOString(),
        status: 'activated'
      });
    }

    // ── Apply 70% creator guarantee for 3 months ──
    const guarantees = await base44.asServiceRole.entities.CreatorGuarantee.filter(
      { creator_id: user.email }, null, 1
    );

    if (!guarantees[0]) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      await base44.asServiceRole.entities.CreatorGuarantee.create({
        creator_id: user.email,
        guarantee_type: 'referral_onboard',
        base_share_percent: 60,
        guaranteed_share_percent: 70,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        referred_by: referral.referrer_id
      });

      console.log(`[processCreatorReferral] ${user.email} enrolled in 70% share guarantee until ${endDate.toISOString()}`);
    }

    return Response.json({
      success: true,
      message: 'Referral activated successfully!',
      bonuses: {
        referred_creator: 5000,
        referrer: 5000
      },
      guarantee: {
        creator_share: 70,
        duration_months: 3,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('[processCreatorReferral] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});