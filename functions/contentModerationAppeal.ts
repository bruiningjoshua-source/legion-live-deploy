import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Content Moderation Appeals
 * Allows creators to contest content flags/removals
 * Reduces support tickets, builds trust, ensures fairness
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, contentId, contentType, appealReason } = await req.json();

    // Input validation & sanitization
    const sanitize = (str) => {
      if (typeof str !== 'string') return '';
      return str.trim().replace(/[<>\"'`]/g, '').substring(0, 2000);
    };

    if (action === 'create_appeal') {
      const sanitizedReason = sanitize(appealReason);
      const sanitizedContentId = String(contentId).replace(/[^a-zA-Z0-9_-]/g, '');
      const sanitizedType = String(contentType).replace(/[^a-z_]/g, '');

      if (!sanitizedContentId || !sanitizedType || sanitizedReason.length < 20) {
        return Response.json({ 
          error: 'Invalid input: reason must be 20+ chars, content ID & type required',
          code: 'VALIDATION_ERROR'
        }, { status: 400 });
      }

      // Create appeal record with retry logic
      let appeal = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          appeal = await base44.asServiceRole.entities.WalletAuditLog.create({
            user_email: user.email,
            action: 'moderation_appeal',
            amount_denarii: 0,
            new_balance: 0,
            reason: sanitizedReason,
            related_entity_id: JSON.stringify({ contentId: sanitizedContentId, contentType: sanitizedType, appealDate: Date.now() }),
            timestamp_utc: new Date().toISOString()
          });
          break;
        } catch (e) {
          if (attempt === 2) throw new Error(`Appeal creation failed after 3 attempts: ${e.message}`);
          await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
        }
      }

      // Notify moderators
      await base44.asServiceRole.entities.Notification.create({
        user_email: 'admin',
        type: 'appeal_submitted',
        title: 'Content Moderation Appeal',
        message: `${user.email} appealed ${contentType} #${contentId}. Review and respond.`,
        is_read: false,
        created_date: new Date().toISOString()
      }).catch(() => {});

      console.log(`[contentModerationAppeal] Appeal created by ${user.email} for ${contentType} #${contentId}`);

      return Response.json({
        success: true,
        appealId: appeal.id,
        message: 'Your appeal has been submitted. Our team will review within 48 hours.'
      });
    }

    if (action === 'respond_appeal') {
      const { appealId, decision, moderatorReason } = await req.json();

      if (user?.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      if (!appealId || !decision) {
        return Response.json({ error: 'Missing fields' }, { status: 400 });
      }

      // Update appeal status
      const appeals = await base44.asServiceRole.entities.WalletAuditLog.filter(
        { id: appealId, action: 'moderation_appeal' }, null, 1
      ).catch(() => []);

      if (appeals.length > 0) {
        const appeal = appeals[0];
        const appealData = JSON.parse(appeal.related_entity_id || '{}');

        await base44.asServiceRole.entities.WalletAuditLog.create({
          user_email: appeal.user_email,
          action: 'appeal_resolved',
          amount_denarii: 0,
          new_balance: 0,
          reason: `Appeal ${decision}: ${moderatorReason}`,
          related_entity_id: JSON.stringify({ ...appealData, decision, resolvedDate: Date.now() }),
          timestamp_utc: new Date().toISOString()
        });

        // Notify creator of resolution
        const message = decision === 'upheld'
          ? 'Your content moderation has been upheld after review. Thank you for your patience.'
          : decision === 'overturned'
            ? 'Your content moderation has been overturned! Your content is restored.'
            : 'Your moderation appeal has been reviewed.';

        await base44.asServiceRole.entities.Notification.create({
          user_email: appeal.user_email,
          type: 'appeal_resolved',
          title: `Appeal ${decision.charAt(0).toUpperCase() + decision.slice(1)}`,
          message,
          is_read: false,
          created_date: new Date().toISOString()
        }).catch(() => {});
      }

      return Response.json({ success: true, message: 'Appeal resolved' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[contentModerationAppeal] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});