import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Auth first before touching any data
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { referralCode } = await req.json();

    if (!referralCode) {
      return Response.json({ success: false }, { status: 200 });
    }

    // Find the referral code
    const codes = await base44.asServiceRole.entities.ReferralCode.filter(
      { code: referralCode },
      null,
      1
    );

    if (!codes || codes.length === 0) {
      console.log(`Referral code not found: ${referralCode}`);
      return Response.json({ success: false }, { status: 200 });
    }

    const referralRecord = codes[0];

    // Update referral record with new creator info
    await base44.asServiceRole.entities.ReferralCode.update(referralRecord.id, {
      referred_creator_id: user.email,
      referred_email: user.email,
      status: 'onboarded',
      onboarded_date: new Date().toISOString()
    });

    console.log(`Referral onboarding processed: ${user.email} from ${referralRecord.code}`);

    return Response.json({
      success: true,
      referralCode: referralRecord.code,
      referrerCreatorId: referralRecord.referrer_creator_id
    });
  } catch (error) {
    console.error('Referral onboarding error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});