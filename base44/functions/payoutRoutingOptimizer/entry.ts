import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Payout Routing Optimizer
 * Recommends bank (bulk/ACH) vs PayPal (small) based on amount & creator profile
 * Optimizes fees and processing time
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { withdrawalAmount } = await req.json();
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      return Response.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
    }

    // Get creator payout history
    const payoutMethods = await base44.asServiceRole.entities.CreatorPayoutMethod.filter(
      { creator_email: user.email }
    ).catch(() => []);

    // Get recent payouts
    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
    const recentPayouts = await base44.asServiceRole.entities.CreatorPayout.filter(
      { creator_email: user.email, created_date: { $gte: thirtyDaysAgo } }
    ).catch(() => []);

    // Payout fee structure
    const strategies = [];

    // Strategy 1: Bank (ACH) - Good for amounts $100+
    if (withdrawalAmount >= 100) {
      const bankFee = 0.50; // Flat fee
      strategies.push({
        method: 'bank_ach',
        name: 'Bank Transfer (ACH)',
        fee: bankFee,
        netAmount: withdrawalAmount - bankFee,
        processingTime: '3-5 business days',
        recommendedFor: 'Bulk payouts, recurring transfers',
        percentageFee: ((bankFee / withdrawalAmount) * 100).toFixed(2) + '%',
        pros: ['Lowest fees', 'Bulk processing', 'No limits'],
        cons: ['Slower', 'Requires bank info']
      });
    }

    // Strategy 2: PayPal - Good for amounts $20-$200
    if (withdrawalAmount >= 20 && withdrawalAmount <= 200) {
      const paypalFee = withdrawalAmount * 0.02 + 0.30; // 2% + $0.30
      strategies.push({
        method: 'paypal',
        name: 'PayPal Instant',
        fee: paypalFee,
        netAmount: withdrawalAmount - paypalFee,
        processingTime: 'Instant',
        recommendedFor: 'Quick payouts, smaller amounts',
        percentageFee: ((paypalFee / withdrawalAmount) * 100).toFixed(2) + '%',
        pros: ['Instant', 'No bank info needed', 'Convenient'],
        cons: ['Higher fees', 'Withdrawal limits']
      });
    }

    // Strategy 3: Cryptocurrency - For tech-savvy creators
    const cryptoFee = withdrawalAmount * 0.01; // 1%
    strategies.push({
      method: 'crypto',
      name: 'USDC (Polygon)',
      fee: cryptoFee,
      netAmount: withdrawalAmount - cryptoFee,
      processingTime: '1-2 minutes',
      recommendedFor: 'Tech users, international',
      percentageFee: '1.00%',
      pros: ['Fast', 'Low fees', 'Global'],
      cons: ['Volatility', 'Wallet needed', 'Tax complexity']
    });

    // Recommend best strategy
    let recommendation = strategies[0];
    if (withdrawalAmount >= 500) {
      recommendation = strategies.find(s => s.method === 'bank_ach') || strategies[0];
    } else if (withdrawalAmount >= 50) {
      recommendation = strategies.find(s => s.method === 'paypal') || strategies[0];
    }

    console.log(`[payoutRoutingOptimizer] Recommended ${recommendation.method} for $${withdrawalAmount}`);

    return Response.json({
      withdrawalAmount,
      recommendation,
      strategies: strategies.sort((a, b) => a.fee - b.fee)
    });

  } catch (error) {
    console.error('[payoutRoutingOptimizer] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});