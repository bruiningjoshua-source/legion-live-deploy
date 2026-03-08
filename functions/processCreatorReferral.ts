import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, referralCode, referredEmail } = await req.json();

    if (action === 'generate') {
      // Generate unique referral code for creator
      const code = `${user.email.split('@')[0].toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      
      const referral = await base44.asServiceRole.entities.CreatorReferral.create({
        referrer_id: user.email,
        referral_code: code,
        referrer_reward_denarii: 5000,
        referred_reward_denarii: 5000
      });

      return Response.json({ code, referralId: referral.id });
    }

    if (action === 'redeem') {
      // Redeem referral code on signup
      if (!referralCode) {
        return Response.json({ error: 'Invalid referral code' }, { status: 400 });
      }

      const referrals = await base44.asServiceRole.entities.CreatorReferral.filter(
        { referral_code: referralCode }, null, 1
      );

      if (referrals.length === 0) {
        return Response.json({ error: 'Referral code not found' }, { status: 404 });
      }

      const referral = referrals[0];
      if (referral.status !== 'pending') {
        return Response.json({ error: 'Referral already redeemed' }, { status: 400 });
      }

      // Update referral
      await base44.asServiceRole.entities.CreatorReferral.update(referral.id, {
        referred_email: user.email,
        status: 'signed_up',
        signup_date: new Date().toISOString()
      });

      // Create 70% guarantee for referred creator
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);

      await base44.asServiceRole.entities.CreatorGuarantee.create({
        creator_id: user.email,
        guarantee_type: 'referral_onboard',
        guaranteed_share_percent: 70,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        referred_by: referral.referrer_id
      });

      // Bonus: 5k Denarii to referred creator's wallet
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { user_email: user.email }, null, 1
      );

      if (wallets.length > 0) {
        await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
          denarii_balance: (wallets[0].denarii_balance || 0) + 5000
        });
      }

      return Response.json({
        success: true,
        message: '70% creator share guaranteed for 3 months + 5,000 Denarii bonus',
        referrerEmail: referral.referrer_id
      });
    }

    if (action === 'claim_reward') {
      // Referrer claims 5k Denarii bonus
      const referrals = await base44.asServiceRole.entities.CreatorReferral.filter(
        { referrer_id: user.email, reward_claimed: false, status: 'signed_up' }, null, 100
      );

      if (referrals.length === 0) {
        return Response.json({ error: 'No unclaimed rewards' }, { status: 400 });
      }

      const referral = referrals[0];

      // Add to referrer's wallet
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { user_email: user.email }, null, 1
      );

      if (wallets.length > 0) {
        await base44.asServiceRole.entities.Wallet.update(wallets[0].id, {
          denarii_balance: (wallets[0].denarii_balance || 0) + referral.referrer_reward_denarii
        });
      }

      // Mark as claimed
      await base44.asServiceRole.entities.CreatorReferral.update(referral.id, {
        reward_claimed: true,
        claimed_date: new Date().toISOString()
      });

      return Response.json({
        success: true,
        reward: referral.referrer_reward_denarii,
        message: `+${referral.referrer_reward_denarii} Denarii added to wallet`
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[processCreatorReferral]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});