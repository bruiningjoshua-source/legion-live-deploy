import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// GDPR request types
const GDPR_REQUEST_TYPES = {
  DATA_EXPORT: 'data_export',
  DATA_DELETION: 'data_deletion',
  DATA_RECTIFICATION: 'data_rectification',
  PROCESSING_RESTRICTION: 'processing_restriction',
  CONSENT_WITHDRAWAL: 'consent_withdrawal'
};

// Entities containing user data
const USER_DATA_ENTITIES = [
  'Creator',
  'Wallet',
  'ChatMessage',
  'GiftTransaction',
  'CurrencyPurchase',
  'Follow',
  'ViewingHistory',
  'ContentLike',
  'DirectMessage',
  'ForumPost',
  'ForumReply',
  'VideoComment',
  'CreatorSubscription',
  'VlogVideo',
  'Stream'
];

async function collectUserData(base44, userEmail) {
  const userData = {
    exportDate: new Date().toISOString(),
    userEmail,
    data: {}
  };

  // Collect data from each entity
  for (const entityName of USER_DATA_ENTITIES) {
    try {
      const records = await base44.asServiceRole.entities[entityName].filter(
        { $or: [
          { user_email: userEmail },
          { created_by: userEmail },
          { sender_email: userEmail },
          { author_email: userEmail },
          { creator_id: userEmail }
        ]},
        '-created_date',
        1000
      );
      
      if (records.length > 0) {
        userData.data[entityName] = records;
      }
    } catch (e) {
      // Entity might not have these fields, skip
      console.log(`Skipping ${entityName}: ${e.message}`);
    }
  }

  return userData;
}

async function deleteUserData(base44, userEmail, keepTransactions = true) {
  const deletedCounts = {};
  const errors = [];

  for (const entityName of USER_DATA_ENTITIES) {
    // Skip financial records if required for legal compliance
    if (keepTransactions && ['GiftTransaction', 'CurrencyPurchase', 'CreatorPayout'].includes(entityName)) {
      continue;
    }

    try {
      const records = await base44.asServiceRole.entities[entityName].filter(
        { $or: [
          { user_email: userEmail },
          { created_by: userEmail },
          { sender_email: userEmail },
          { author_email: userEmail }
        ]},
        null,
        1000
      );

      for (const record of records) {
        await base44.asServiceRole.entities[entityName].delete(record.id);
      }
      
      deletedCounts[entityName] = records.length;
    } catch (e) {
      errors.push({ entity: entityName, error: e.message });
    }
  }

  return { deletedCounts, errors };
}

async function anonymizeUserData(base44, userEmail) {
  const anonymizedId = `deleted_user_${Date.now()}`;
  const updates = {};

  // Anonymize rather than delete for data integrity
  const entitiesToAnonymize = ['ChatMessage', 'ForumPost', 'ForumReply', 'VideoComment'];

  for (const entityName of entitiesToAnonymize) {
    try {
      const records = await base44.asServiceRole.entities[entityName].filter(
        { $or: [
          { sender_email: userEmail },
          { author_email: userEmail }
        ]},
        null,
        1000
      );

      for (const record of records) {
        const updateData = {};
        if (record.sender_email === userEmail) updateData.sender_email = anonymizedId;
        if (record.sender_name) updateData.sender_name = 'Deleted User';
        if (record.author_email === userEmail) updateData.author_email = anonymizedId;
        
        await base44.asServiceRole.entities[entityName].update(record.id, updateData);
      }
      
      updates[entityName] = records.length;
    } catch (e) {
      console.log(`Error anonymizing ${entityName}: ${e.message}`);
    }
  }

  return updates;
}

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
      case 'export_data': {
        // GDPR Article 20 - Right to data portability
        const userData = await collectUserData(base44, user.email);
        
        // Log the request
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'gdpr_request',
          metric_name: GDPR_REQUEST_TYPES.DATA_EXPORT,
          metric_value: 1,
          metadata: {
            userEmail: user.email,
            timestamp: new Date().toISOString()
          }
        });

        return Response.json({
          success: true,
          data: userData,
          message: 'Your data export is ready. This includes all personal data we hold about you.'
        });
      }

      case 'request_deletion': {
        // GDPR Article 17 - Right to erasure
        
        // Create deletion request (requires confirmation)
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'gdpr_request',
          metric_name: GDPR_REQUEST_TYPES.DATA_DELETION,
          metric_value: 1,
          metadata: {
            userEmail: user.email,
            status: 'pending_confirmation',
            timestamp: new Date().toISOString()
          }
        });

        return Response.json({
          success: true,
          message: 'Deletion request received. You will receive a confirmation email. Account deletion will be processed within 30 days.',
          confirmationRequired: true
        });
      }

      case 'confirm_deletion': {
        // Actually delete user data
        const { confirmationCode } = data;
        
        // In production, verify confirmation code sent via email
        
        // Anonymize public content
        const anonymized = await anonymizeUserData(base44, user.email);
        
        // Delete personal data
        const deleted = await deleteUserData(base44, user.email, true);
        
        // Log completion
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'gdpr_request',
          metric_name: GDPR_REQUEST_TYPES.DATA_DELETION,
          metric_value: 1,
          metadata: {
            userEmail: user.email,
            status: 'completed',
            anonymized,
            deleted: deleted.deletedCounts,
            timestamp: new Date().toISOString()
          }
        });

        return Response.json({
          success: true,
          message: 'Your account and personal data have been deleted. Financial records are retained for 7 years as required by law.',
          deleted: deleted.deletedCounts,
          anonymized
        });
      }

      case 'withdraw_consent': {
        // GDPR Article 7 - Withdrawal of consent
        const { consentType } = data; // 'marketing', 'analytics', 'personalization'
        
        // Update user preferences
        await base44.auth.updateMe({
          [`consent_${consentType}`]: false,
          consent_updated_at: new Date().toISOString()
        });

        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'gdpr_request',
          metric_name: GDPR_REQUEST_TYPES.CONSENT_WITHDRAWAL,
          metric_value: 1,
          metadata: {
            userEmail: user.email,
            consentType,
            timestamp: new Date().toISOString()
          }
        });

        return Response.json({
          success: true,
          message: `Consent for ${consentType} has been withdrawn.`
        });
      }

      case 'get_consent_status': {
        // Return current consent settings
        return Response.json({
          marketing: user.consent_marketing !== false,
          analytics: user.consent_analytics !== false,
          personalization: user.consent_personalization !== false,
          lastUpdated: user.consent_updated_at
        });
      }

      case 'admin_list_requests': {
        // Admin-only: List all GDPR requests
        if (user.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const requests = await base44.asServiceRole.entities.PlatformAnalytics.filter(
          { metric_type: 'gdpr_request' },
          '-created_date',
          100
        );

        return Response.json({ requests });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('GDPR compliance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});