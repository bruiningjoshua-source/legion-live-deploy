import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Retrieve creator's withdrawal history
 * Returns all past and pending withdrawals
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limit = 50, offset = 0 } = await req.json();

    // Fetch withdrawal history (sorted by most recent first)
    const withdrawals = await base44.entities.CreatorPayout?.filter(
      { creator_email: user.email },
      '-requested_date',
      limit
    ).catch(() => []);

    if (!withdrawals) {
      return Response.json({
        withdrawals: [],
        total: 0,
        pending_total: 0,
        completed_total: 0
      });
    }

    // Calculate summaries
    const stats = withdrawals.reduce(
      (acc, w) => ({
        total: acc.total + 1,
        pending_total: acc.pending_total + (w.status === 'pending' ? (w.amount_usd || 0) : 0),
        completed_total: acc.completed_total + (w.status === 'completed' ? (w.amount_usd || 0) : 0),
        processing_count: acc.processing_count + (w.status === 'processing' ? 1 : 0)
      }),
      { total: 0, pending_total: 0, completed_total: 0, processing_count: 0 }
    );

    console.log(`[getWithdrawalHistory] Retrieved ${withdrawals.length} withdrawals for ${user.email}`);

    return Response.json({
      withdrawals: withdrawals.map(w => ({
        id: w.id,
        amount: w.amount_usd,
        fee: w.fee_usd,
        net_amount: w.net_amount_usd,
        method: w.method_type,
        status: w.status,
        requested_date: w.requested_date,
        processed_date: w.processed_date,
        created_date: w.created_date
      })),
      ...stats
    });

  } catch (error) {
    console.error('[getWithdrawalHistory] Error:', error);
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
});