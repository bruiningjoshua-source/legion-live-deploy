import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CEO_AFFILIATES = ['rankincadence@gmail.com'];
const PLATFORM_CUT = 0.10; // 10% to platform
const CEO_CUT = 0.90; // 90% to CEO admin

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, creatorId, productId, earnings } = await req.json();

    // Get all affiliate commissions
    const affiliateEarnings = await base44.asServiceRole.entities.GiftTransaction.list('-created_date', 1000);

    // Calculate total platform affiliate earnings
    const totalEarnings = affiliateEarnings.reduce((sum, txn) => sum + (txn.total_as_value || 0), 0);

    // CEO gets 90% of all earnings, platform gets 10%
    const ceoEarning = totalEarnings * CEO_CUT;
    const platformEarning = totalEarnings * PLATFORM_CUT;

    // Check if user is CEO affiliate
    const isCeoAffiliate = CEO_AFFILIATES.includes(user.email);

    return Response.json({
      isCeoAffiliate,
      totalPlatformEarnings: totalEarnings,
      ceoEarning: ceoEarning,
      platformEarning: platformEarning,
      userEarning: isCeoAffiliate ? ceoEarning : 0,
      message: isCeoAffiliate ? 'CEO-level affiliate earnings applied' : 'Standard affiliate'
    });
  } catch (error) {
    console.error('Affiliate earnings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});