import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Gate all payout operations behind KYC verification.
 * Called by CreatorPayoutSettings or withdrawal flows.
 * Only allow payout if kyc_status === 'verified' or user is admin.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admins bypass KYC
    if (user.role === 'admin') {
      return Response.json({ kyc_gated: false, verified: true });
    }

    // Fetch creator record
    const creators = await base44.asServiceRole.entities.Creator.filter(
      { user_email: user.email }, null, 1
    );

    if (!creators[0]) {
      return Response.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    const creator = creators[0];
    const isVerified = creator.kyc_status === 'verified';

    if (!isVerified) {
      return Response.json({
        error: 'KYC verification required to withdraw earnings',
        kyc_status: creator.kyc_status,
        kyc_verified: false,
        message: `Current KYC status: ${creator.kyc_status}. Please complete verification to enable payouts.`
      }, { status: 403 });
    }

    return Response.json({
      kyc_verified: true,
      creator_id: creator.id,
      display_name: creator.display_name
    });

  } catch (error) {
    console.error('[enforceKycGate] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});