import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  PURCHASE_CONFIRMATION: 'purchase_confirmation',
  PAYOUT_PROCESSED: 'payout_processed',
  ACCOUNT_WARNING: 'account_warning',
  ACCOUNT_SUSPENDED: 'account_suspended',
  NEW_FOLLOWER: 'new_follower',
  STREAM_REMINDER: 'stream_reminder',
  WEEKLY_DIGEST: 'weekly_digest',
  KYC_REQUIRED: 'kyc_required',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected'
};

function getEmailTemplate(templateName, data) {
  const templates = {
    welcome: {
      subject: 'Welcome to Legion Live! 🎮',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1f; color: #f5f5f5; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d97706; margin: 0;">Welcome to Legion Live!</h1>
          </div>
          <p>Hey ${data.name || 'there'}!</p>
          <p>Welcome to Legion Live, the ultimate live streaming platform. We're thrilled to have you join our community!</p>
          <h3 style="color: #d97706;">Here's what you can do:</h3>
          <ul>
            <li>🎥 Watch live streams from amazing creators</li>
            <li>💝 Send virtual gifts to support your favorites</li>
            <li>💬 Chat and connect with the community</li>
            <li>📺 Start your own broadcasts (with a creator subscription)</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.loginUrl || 'https://legionlive.com'}" style="background: #d97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Explore Legion Live</a>
          </div>
          <p style="color: #888; font-size: 12px;">If you have any questions, our support team is here to help!</p>
        </div>
      `
    },

    purchase_confirmation: {
      subject: 'Purchase Confirmed - Legion Live',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1f; color: #f5f5f5; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin: 0;">✓ Purchase Confirmed</h1>
          </div>
          <p>Hey ${data.name || 'there'}!</p>
          <p>Your purchase has been completed successfully.</p>
          <div style="background: #2a2a35; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #d97706;">Order Details</h3>
            <p><strong>Order ID:</strong> ${data.orderId}</p>
            <p><strong>Item:</strong> ${data.itemName}</p>
            <p><strong>Amount:</strong> $${data.amount}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <p>Your virtual currency has been added to your wallet and is ready to use!</p>
          <p style="color: #888; font-size: 12px;">Questions about your purchase? Contact support@legionlive.com</p>
        </div>
      `
    },

    payout_processed: {
      subject: 'Payout Processed - Legion Live',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1f; color: #f5f5f5; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin: 0;">💰 Payout Processed</h1>
          </div>
          <p>Hey ${data.name || 'Creator'}!</p>
          <p>Great news! Your payout has been processed.</p>
          <div style="background: #2a2a35; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #d97706;">Payout Details</h3>
            <p><strong>Amount:</strong> $${data.amount}</p>
            <p><strong>Method:</strong> ${data.payoutMethod}</p>
            <p><strong>Reference:</strong> ${data.reference}</p>
            <p><strong>Expected Arrival:</strong> ${data.expectedArrival || '3-5 business days'}</p>
          </div>
          <p>Keep creating amazing content! Your fans appreciate you.</p>
        </div>
      `
    },

    account_warning: {
      subject: '⚠️ Account Warning - Legion Live',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1f; color: #f5f5f5; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #f59e0b; margin: 0;">⚠️ Account Warning</h1>
          </div>
          <p>Hey ${data.name || 'there'},</p>
          <p>We've detected activity on your account that violates our Community Guidelines.</p>
          <div style="background: #3a2a1f; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p><strong>Violation:</strong> ${data.violationType}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Details:</strong> ${data.details}</p>
          </div>
          <p>This is a warning. Continued violations may result in account suspension.</p>
          <p>Please review our <a href="${data.guidelinesUrl || '#'}" style="color: #d97706;">Community Guidelines</a>.</p>
        </div>
      `
    },

    account_suspended: {
      subject: '🚫 Account Suspended - Legion Live',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1f; color: #f5f5f5; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ef4444; margin: 0;">🚫 Account Suspended</h1>
          </div>
          <p>Hey ${data.name || 'there'},</p>
          <p>Your Legion Live account has been suspended due to violations of our Terms of Service.</p>
          <div style="background: #3a1f1f; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p><strong>Duration:</strong> ${data.duration || 'Permanent'}</p>
          </div>
          <p>If you believe this was a mistake, you can appeal by contacting appeals@legionlive.com</p>
        </div>
      `
    },

    kyc_required: {
      subject: 'Verification Required - Legion Live',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1f; color: #f5f5f5; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d97706; margin: 0;">📋 Verification Required</h1>
          </div>
          <p>Hey ${data.name || 'Creator'}!</p>
          <p>Congratulations on reaching $${data.earnings || 600} in earnings! To continue receiving payouts, we need to verify your identity.</p>
          <p>This is required by law for tax reporting purposes.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.verificationUrl || '#'}" style="background: #d97706; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Complete Verification</a>
          </div>
          <p style="color: #888; font-size: 12px;">Your information is encrypted and secure.</p>
        </div>
      `
    },

    weekly_digest: {
      subject: 'Your Weekly Recap - Legion Live',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1f; color: #f5f5f5; padding: 40px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d97706; margin: 0;">📊 Your Weekly Recap</h1>
          </div>
          <p>Hey ${data.name || 'Creator'}!</p>
          <p>Here's how your week went on Legion Live:</p>
          <div style="background: #2a2a35; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span>👀 Views</span>
              <strong style="color: #22c55e;">${data.views || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span>👥 New Followers</span>
              <strong style="color: #22c55e;">+${data.newFollowers || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span>🎁 Gifts Received</span>
              <strong style="color: #22c55e;">${data.giftsReceived || 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>💰 Earnings</span>
              <strong style="color: #22c55e;">${data.earnings || '0'} Denarii</strong>
            </div>
          </div>
          <p>Keep up the great work! Your community loves you. ❤️</p>
        </div>
      `
    }
  };

  return templates[templateName] || { subject: 'Legion Live', html: '<p>Message from Legion Live</p>' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const data = await req.json();
    const { action } = data;

    switch (action) {
      case 'send': {
        const { templateName, recipientEmail, templateData } = data;
        
        const template = getEmailTemplate(templateName, templateData);
        
        // Send email using Core integration
        await base44.integrations.Core.SendEmail({
          to: recipientEmail,
          subject: template.subject,
          body: template.html
        });

        // Log email sent
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'email_sent',
          metric_name: templateName,
          metric_value: 1,
          metadata: {
            recipient: recipientEmail,
            template: templateName,
            sent_at: new Date().toISOString()
          }
        });

        return Response.json({ success: true, message: 'Email sent' });
      }

      case 'send_bulk': {
        // Admin only - send bulk emails
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { templateName, recipientEmails, templateData } = data;
        let sent = 0;
        let failed = 0;

        for (const email of recipientEmails) {
          try {
            const template = getEmailTemplate(templateName, { ...templateData, email });
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: template.subject,
              body: template.html
            });
            sent++;
          } catch (e) {
            failed++;
            console.error(`Failed to send to ${email}:`, e);
          }
        }

        return Response.json({ success: true, sent, failed });
      }

      case 'send_welcome': {
        const { userEmail, userName } = data;
        const template = getEmailTemplate('welcome', { name: userName });
        
        await base44.integrations.Core.SendEmail({
          to: userEmail,
          subject: template.subject,
          body: template.html
        });

        return Response.json({ success: true });
      }

      case 'send_purchase_confirmation': {
        const { userEmail, userName, orderId, itemName, amount } = data;
        const template = getEmailTemplate('purchase_confirmation', {
          name: userName,
          orderId,
          itemName,
          amount
        });

        await base44.integrations.Core.SendEmail({
          to: userEmail,
          subject: template.subject,
          body: template.html
        });

        return Response.json({ success: true });
      }

      case 'send_payout_notification': {
        const { creatorEmail, creatorName, amount, payoutMethod, reference } = data;
        const template = getEmailTemplate('payout_processed', {
          name: creatorName,
          amount,
          payoutMethod,
          reference
        });

        await base44.integrations.Core.SendEmail({
          to: creatorEmail,
          subject: template.subject,
          body: template.html
        });

        return Response.json({ success: true });
      }

      case 'send_weekly_digest': {
        // Send weekly digest to all creators
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const creators = await base44.asServiceRole.entities.Creator.list('-follower_count', 1000);
        let sent = 0;

        for (const creator of creators) {
          try {
            // Get creator stats for the week
            // In production, calculate actual stats
            const template = getEmailTemplate('weekly_digest', {
              name: creator.display_name,
              views: Math.floor(Math.random() * 1000),
              newFollowers: Math.floor(Math.random() * 50),
              giftsReceived: Math.floor(Math.random() * 100),
              earnings: Math.floor(Math.random() * 500)
            });

            await base44.integrations.Core.SendEmail({
              to: creator.user_email,
              subject: template.subject,
              body: template.html
            });
            sent++;
          } catch (e) {
            console.error(`Failed to send digest to ${creator.user_email}:`, e);
          }
        }

        return Response.json({ success: true, sent });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Transactional email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});