/* eslint-disable no-undef */
// ═══ CONVERTED: getWithdrawalHistory ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { limit = 50 } = await req.json();
    const { data: withdrawals } = await supabase.from('creator_payout').select('*').eq('creator_email', user.email).order('requested_date', { ascending: false }).limit(limit);
    if (!(withdrawals || []).length) return Response.json({ withdrawals: [], total: 0, pending_total: 0, completed_total: 0 });

    const stats = withdrawals.reduce((acc, w) => ({
      total: acc.total + 1,
      pending_total: acc.pending_total + (w.status === 'pending' ? (w.amount_usd || 0) : 0),
      completed_total: acc.completed_total + (w.status === 'completed' ? (w.amount_usd || 0) : 0),
      processing_count: acc.processing_count + (w.status === 'processing' ? 1 : 0)
    }), { total: 0, pending_total: 0, completed_total: 0, processing_count: 0 });

    return Response.json({
      withdrawals: withdrawals.map(w => ({ id: w.id, amount: w.amount_usd, fee: w.fee_usd, net_amount: w.net_amount_usd, method: w.method_type, status: w.status, requested_date: w.requested_date, processed_date: w.processed_date, created_date: w.created_date })),
      ...stats
    });
  } catch (error) {
    console.error('[getWithdrawalHistory] Error:', error);
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
});