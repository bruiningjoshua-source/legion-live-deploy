import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// KYC verification statuses
const KYC_STATUS = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// Payout thresholds that require KYC
const KYC_THRESHOLDS = {
  PAYOUT_AMOUNT: 100,        // USD - require KYC for payouts over $100
  CUMULATIVE_EARNINGS: 600,   // USD - IRS 1099 threshold
  MONTHLY_VOLUME: 500        // USD - monthly transaction volume
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { action } = data;

    switch (action) {
      case 'check_status': {
        // Check user's KYC status
        const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
        const creator = creators[0];
        
        if (!creator) {
          return Response.json({ 
            kycRequired: false, 
            status: KYC_STATUS.NOT_STARTED,
            message: 'No creator profile found'
          });
        }

        // Check earnings thresholds
        const monetization = await base44.entities.CreatorMonetization.filter(
          { user_email: user.email }, null, 1
        );
        const earnings = monetization[0]?.total_earnings_usd || 0;
        
        const kycRequired = earnings >= KYC_THRESHOLDS.CUMULATIVE_EARNINGS;
        
        return Response.json({
          kycRequired,
          status: creator.kyc_status || KYC_STATUS.NOT_STARTED,
          earnings,
          threshold: KYC_THRESHOLDS.CUMULATIVE_EARNINGS,
          message: kycRequired 
            ? 'KYC verification required for payouts' 
            : 'KYC not currently required'
        });
      }

      case 'submit': {
        // Submit KYC information
        const { 
          fullLegalName, 
          dateOfBirth, 
          address, 
          taxId,
          documentType,
          documentUrl 
        } = data;

        // Validate required fields
        if (!fullLegalName || !dateOfBirth || !address || !taxId) {
          return Response.json({ 
            error: 'Missing required fields' 
          }, { status: 400 });
        }

        // Update creator with KYC data
        const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
        if (!creators[0]) {
          return Response.json({ error: 'Creator profile not found' }, { status: 404 });
        }

        await base44.entities.Creator.update(creators[0].id, {
          kyc_status: KYC_STATUS.PENDING,
          kyc_submitted_at: new Date().toISOString(),
          kyc_data: {
            fullLegalName,
            dateOfBirth,
            address,
            taxIdLast4: taxId.slice(-4), // Only store last 4 digits
            documentType,
            documentUrl
          }
        });

        // Log for admin review
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'kyc_submission',
          metric_name: 'pending_review',
          metric_value: 1,
          metadata: {
            creatorId: creators[0].id,
            userEmail: user.email,
            timestamp: new Date().toISOString()
          }
        });

        return Response.json({
          success: true,
          status: KYC_STATUS.PENDING,
          message: 'KYC submission received. Review typically takes 1-3 business days.'
        });
      }

      case 'admin_review': {
        // Admin-only: Review KYC submission
        if (user.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { creatorId, approved, rejectionReason } = data;
        
        const newStatus = approved ? KYC_STATUS.VERIFIED : KYC_STATUS.REJECTED;
        
        await base44.asServiceRole.entities.Creator.update(creatorId, {
          kyc_status: newStatus,
          kyc_reviewed_at: new Date().toISOString(),
          kyc_rejection_reason: rejectionReason || null
        });

        return Response.json({
          success: true,
          status: newStatus,
          message: approved ? 'KYC approved' : 'KYC rejected'
        });
      }

      case 'check_payout_eligibility': {
        // Check if user can receive a payout
        const { amount } = data;
        
        const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
        const creator = creators[0];
        
        if (!creator) {
          return Response.json({ 
            eligible: false, 
            reason: 'No creator profile found' 
          });
        }

        // Check if KYC is required and verified
        if (amount >= KYC_THRESHOLDS.PAYOUT_AMOUNT) {
          if (creator.kyc_status !== KYC_STATUS.VERIFIED) {
            return Response.json({
              eligible: false,
              reason: 'KYC verification required for payouts over $' + KYC_THRESHOLDS.PAYOUT_AMOUNT,
              kycStatus: creator.kyc_status || KYC_STATUS.NOT_STARTED
            });
          }
        }

        // Check for payout method
        const payoutMethods = await base44.entities.CreatorPayoutMethod.filter(
          { creator_id: creator.id, is_verified: true }, null, 1
        );
        
        if (payoutMethods.length === 0) {
          return Response.json({
            eligible: false,
            reason: 'No verified payout method on file'
          });
        }

        return Response.json({
          eligible: true,
          kycStatus: creator.kyc_status,
          payoutMethod: payoutMethods[0].method_type
        });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('KYC verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});