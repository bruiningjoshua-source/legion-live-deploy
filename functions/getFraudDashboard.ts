/**
 * GET FRAUD DASHBOARD
 * Admin view of fraud monitoring + manual review queue
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const thirtyMinAgo = new Date(Date.now() - 1800000).toISOString();

    // Recent fraud checks
    const recentFraud = await base44.asServiceRole.entities.WalletAuditLog.filter(
      {
        action: 'fraud_check',
        timestamp_utc: { $gte: thirtyMinAgo }
      },
      '-timestamp_utc',
      50
    );

    // Review cases
    const reviewCases = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { action: 'fraud_review_case' },
      '-timestamp_utc',
      50
    );

    // Flagged users
    const flaggedUsers = await base44.asServiceRole.entities.User.filter(
      { flagged_for_review: true },
      null,
      50
    );

    return Response.json({
      summary: {
        lastUpdated: new Date().toISOString(),
        highRiskTransactions: recentFraud.filter(l => l.reason.includes('HIGH')).length,
        mediumRiskTransactions: recentFraud.filter(l => l.reason.includes('MEDIUM')).length,
        pendingReviews: reviewCases.length,
        flaggedUsers: flaggedUsers.length
      },
      recentTransactions: recentFraud.slice(0, 20).map(l => ({
        id: l.id,
        email: l.user_email,
        timestamp: l.timestamp_utc,
        reason: l.reason,
        amount: l.amount_denarii
      })),
      reviewQueue: reviewCases.slice(0, 20).map(l => ({
        id: l.id,
        email: l.user_email,
        timestamp: l.timestamp_utc,
        reason: l.reason
      })),
      flaggedUsersList: flaggedUsers.slice(0, 20).map(u => ({
        email: u.email,
        name: u.full_name,
        flags: u.flagged_for_review
      }))
    });
  } catch (error) {
    console.error('[getFraudDashboard]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});