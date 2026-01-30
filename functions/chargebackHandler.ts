import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

// Chargeback response strategies
const CHARGEBACK_STRATEGIES = {
  ACCEPT: 'accept',      // Accept the chargeback
  CONTEST: 'contest',    // Contest with evidence
  PARTIAL_REFUND: 'partial_refund'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const data = await req.json();
    const { action } = data;

    switch (action) {
      case 'handle_dispute': {
        // Called from Stripe webhook when dispute is created
        const { disputeId } = data;
        
        const dispute = await stripe.disputes.retrieve(disputeId);
        const chargeId = dispute.charge;
        const paymentIntentId = dispute.payment_intent;
        
        // Get charge details
        const charge = await stripe.charges.retrieve(chargeId);
        const customerEmail = charge.billing_details?.email || charge.metadata?.email;
        
        // Log the dispute
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'chargeback',
          metric_name: dispute.reason,
          metric_value: dispute.amount / 100,
          metadata: {
            dispute_id: disputeId,
            charge_id: chargeId,
            customer_email: customerEmail,
            amount: dispute.amount / 100,
            currency: dispute.currency,
            reason: dispute.reason,
            status: dispute.status,
            created_at: new Date().toISOString()
          }
        });

        // Check user's chargeback history
        const previousChargebacks = await base44.asServiceRole.entities.PlatformAnalytics.filter(
          { metric_type: 'chargeback', 'metadata.customer_email': customerEmail },
          '-created_date',
          10
        );

        // Auto-ban users with multiple chargebacks
        if (previousChargebacks.length >= 3) {
          await base44.asServiceRole.entities.UserBan.create({
            user_email: customerEmail,
            reason: 'Multiple chargebacks detected',
            ban_type: 'permanent',
            automated: true
          });

          // Notify admin
          await base44.asServiceRole.entities.PlatformAnalytics.create({
            metric_type: 'security_alert',
            metric_name: 'auto_ban_chargeback',
            metric_value: 1,
            metadata: {
              user_email: customerEmail,
              chargeback_count: previousChargebacks.length + 1,
              action: 'permanent_ban'
            }
          });
        }

        // Prepare evidence for contesting
        const evidence = await gatherDisputeEvidence(base44, customerEmail, chargeId);

        return Response.json({
          success: true,
          dispute_id: disputeId,
          recommendation: previousChargebacks.length >= 2 ? CHARGEBACK_STRATEGIES.ACCEPT : CHARGEBACK_STRATEGIES.CONTEST,
          evidence_gathered: Object.keys(evidence).length > 0
        });
      }

      case 'submit_evidence': {
        // Submit evidence to contest a dispute
        const { disputeId, additionalEvidence } = data;
        
        // Get stored evidence
        const storedEvidence = await base44.asServiceRole.entities.PlatformAnalytics.filter(
          { metric_type: 'dispute_evidence', 'metadata.dispute_id': disputeId },
          '-created_date',
          1
        );

        const evidence = storedEvidence[0]?.metadata?.evidence || {};
        
        // Update dispute with evidence
        await stripe.disputes.update(disputeId, {
          evidence: {
            ...evidence,
            ...additionalEvidence
          }
        });

        // Log submission
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'dispute_action',
          metric_name: 'evidence_submitted',
          metric_value: 1,
          metadata: {
            dispute_id: disputeId,
            submitted_at: new Date().toISOString()
          }
        });

        return Response.json({ success: true, message: 'Evidence submitted' });
      }

      case 'get_disputes': {
        // Admin only - list all disputes
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const disputes = await stripe.disputes.list({ limit: 100 });
        
        return Response.json({ disputes: disputes.data });
      }

      case 'get_user_chargebacks': {
        // Get chargebacks for a specific user (admin only)
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { userEmail } = data;
        const chargebacks = await base44.asServiceRole.entities.PlatformAnalytics.filter(
          { metric_type: 'chargeback', 'metadata.customer_email': userEmail },
          '-created_date',
          50
        );

        return Response.json({ chargebacks });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Chargeback handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function gatherDisputeEvidence(base44, customerEmail, chargeId) {
  const evidence = {};

  try {
    // Get user account info
    const users = await base44.asServiceRole.entities.User.filter(
      { email: customerEmail }, null, 1
    );
    
    if (users[0]) {
      evidence.customer_name = users[0].full_name;
      evidence.customer_email_address = customerEmail;
      
      // Account age as proof of legitimate customer
      const accountAge = Date.now() - new Date(users[0].created_date).getTime();
      const daysSinceCreation = Math.floor(accountAge / (1000 * 60 * 60 * 24));
      
      if (daysSinceCreation > 30) {
        evidence.product_description = `Customer has been an active member for ${daysSinceCreation} days. `;
      }
    }

    // Get transaction history
    const purchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
      { user_email: customerEmail, status: 'completed' },
      '-created_date',
      20
    );

    if (purchases.length > 1) {
      evidence.product_description += `Customer has made ${purchases.length} successful purchases. `;
    }

    // Get usage history (proof of service delivery)
    const giftsGiven = await base44.asServiceRole.entities.GiftTransaction.filter(
      { sender_email: customerEmail },
      '-created_date',
      50
    );

    if (giftsGiven.length > 0) {
      evidence.product_description += `Customer has used the purchased virtual currency to send ${giftsGiven.length} gifts. `;
    }

    // Service policy
    evidence.refund_policy = 'Virtual currency purchases are non-refundable as stated in our Terms of Service. Purchased currency can only be used within the platform for virtual gifts and is delivered instantly upon purchase.';
    
    evidence.service_documentation = 'Digital goods (virtual currency) delivered instantly at time of purchase. Customer used the purchased credits within the platform.';

  } catch (error) {
    console.error('Error gathering evidence:', error);
  }

  // Store evidence for later use
  await base44.asServiceRole.entities.PlatformAnalytics.create({
    metric_type: 'dispute_evidence',
    metric_name: 'auto_gathered',
    metric_value: 1,
    metadata: {
      charge_id: chargeId,
      customer_email: customerEmail,
      evidence,
      gathered_at: new Date().toISOString()
    }
  });

  return evidence;
}