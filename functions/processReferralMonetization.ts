import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find referral record where this user was referred
    const referrals = await base44.asServiceRole.entities.ReferralCode.filter(
      { referred_creator_id: user.email, status: 'onboarded' },
      null,
      1
    );

    if (!referrals || referrals.length === 0) {
      return Response.json({ success: false, message: 'No referral found' }, { status: 200 });
    }

    const referralRecord = referrals[0];

    // Update referral to monetized
    const now = new Date();
    const revenueShareExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await base44.asServiceRole.entities.ReferralCode.update(referralRecord.id, {
      status: 'monetized',
      monetized_date: now.toISOString(),
      revenue_share_expires_at: revenueShareExpires.toISOString()
    });

    // Award new creator bonus
    if (!referralRecord.referred_bonus_claimed) {
      await base44.asServiceRole.entities.MonetizationBonus.create({
        creator_id: user.email,
        bonus_type: 'referral',
        amount_usd: referralRecord.referred_bonus_amount || 50,
        description: `Referral bonus from ${referralRecord.referrer_name || 'a creator'}`,
        conditions: 'Activated monetization from referral link',
        expires_at: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
      });

      await base44.asServiceRole.entities.ReferralCode.update(referralRecord.id, {
        referred_bonus_claimed: true
      });
    }

    // Award referrer bonus (if not already claimed)
    if (!referralRecord.referrer_bonus_claimed) {
      await base44.asServiceRole.entities.MonetizationBonus.create({
        creator_id: referralRecord.referrer_creator_id,
        bonus_type: 'referral',
        amount_usd: referralRecord.referrer_bonus_amount || 50,
        description: `Referral bonus - ${user.email} activated monetization`,
        conditions: 'Referred creator activated monetization',
        expires_at: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    console.log(
      `Referral monetization processed: ${user.email} from referrer ${referralRecord.referrer_creator_id}`
    );

    return Response.json({
      success: true,
      referrerBonus: referralRecord.referrer_bonus_amount || 50,
      referredBonus: referralRecord.referred_bonus_amount || 50,
      revenueShare: referralRecord.revenue_share_percentage || 5
    });
  } catch (error) {
    console.error('Referral monetization error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});