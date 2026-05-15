/* eslint-disable no-undef */
// ═══ CONVERTED: payoutRoutingOptimizer ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { withdrawalAmount } = await req.json();
    if (!withdrawalAmount || withdrawalAmount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

    const strategies = [];
    if (withdrawalAmount >= 100) strategies.push({ method: 'bank_ach', name: 'Bank Transfer (ACH)', fee: 0.50, netAmount: withdrawalAmount - 0.50, processingTime: '3-5 business days', pros: ['Lowest fees', 'No limits'], cons: ['Slower'] });
    if (withdrawalAmount >= 20 && withdrawalAmount <= 200) { const fee = withdrawalAmount * 0.02 + 0.30; strategies.push({ method: 'paypal', name: 'PayPal Instant', fee, netAmount: withdrawalAmount - fee, processingTime: 'Instant', pros: ['Instant'], cons: ['Higher fees'] }); }
    const cryptoFee = withdrawalAmount * 0.01;
    strategies.push({ method: 'crypto', name: 'USDC (Polygon)', fee: cryptoFee, netAmount: withdrawalAmount - cryptoFee, processingTime: '1-2 minutes', pros: ['Fast', 'Low fees', 'Global'], cons: ['Wallet needed'] });

    const recommendation = withdrawalAmount >= 500 ? strategies.find(s => s.method === 'bank_ach') : strategies.find(s => s.method === 'paypal') || strategies[0];
    return Response.json({ withdrawalAmount, recommendation: recommendation || strategies[0], strategies: strategies.sort((a, b) => a.fee - b.fee) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});