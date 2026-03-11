import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * GDPR Compliance Manager
 * Handles data export, right-to-deletion, consent tracking
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json();

    if (action === 'export_data') {
      // Export user's personal data as JSON
      const userData = {
        profile: user,
        wallet: null,
        streams: null,
        transactions: null,
        exportDate: new Date().toISOString(),
        exportedBy: user.email
      };

      // Get wallet
      const wallets = await base44.asServiceRole.entities.Wallet.filter(
        { user_email: user.email }, null, 1
      ).catch(() => []);
      userData.wallet = wallets[0] || null;

      // Get streams
      const streams = await base44.asServiceRole.entities.Stream.filter(
        { creator_id: user.email }, '-created_date', 100
      ).catch(() => []);
      userData.streams = streams;

      // Get transactions
      const transactions = await base44.asServiceRole.entities.GiftTransaction.filter(
        { sender_email: user.email }, '-created_date', 100
      ).catch(() => []);
      userData.transactions = transactions;

      console.log(`[gdprCompliance] Data export for ${user.email}`);

      return Response.json({
        success: true,
        data: userData,
        filename: `${user.email}_data_export_${Date.now()}.json`
      });
    }

    if (action === 'delete_account') {
      // Soft-delete: anonymize personal data, keep transaction history for compliance
      const updateData = {
        email: `deleted_${Date.now()}@deleted.local`,
        full_name: 'Deleted User',
        isSuspended: true,
        suspensionReason: 'User requested account deletion (GDPR)'
      };

      // Update user record
      const users = await base44.asServiceRole.entities.User.filter(
        { email: user.email }, null, 1
      ).catch(() => []);

      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, updateData);
      }

      // Anonymize creator profile
      const creators = await base44.asServiceRole.entities.Creator.filter(
        { user_email: user.email }, null, 1
      ).catch(() => []);

      if (creators.length > 0) {
        await base44.asServiceRole.entities.Creator.update(creators[0].id, {
          display_name: 'Deleted Creator',
          bio: null,
          avatar_url: null
        });
      }

      console.log(`[gdprCompliance] Account deletion for ${user.email}`);

      return Response.json({
        success: true,
        message: 'Your account has been deleted. Your data is anonymized but transaction history is retained for regulatory compliance.'
      });
    }

    if (action === 'consent_preferences') {
      const { marketing, analytics, thirdParty } = await req.json();

      // Store consent preferences
      const users = await base44.asServiceRole.entities.User.filter(
        { email: user.email }, null, 1
      ).catch(() => []);

      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          consent_preferences: JSON.stringify({ marketing, analytics, thirdParty, date: Date.now() })
        }).catch(() => {});
      }

      return Response.json({ success: true, message: 'Consent preferences saved' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[gdprCompliance] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});