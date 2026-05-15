/* eslint-disable no-undef */
// ═══ CONVERTED: forecastCreatorPayouts ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: creators } = await supabase.from('creator').select('*').eq('user_email', user.email).limit(1);
    const creator = (creators||[])[0];
    if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });

    const { data: kycTiers } = await supabase.from('creator_kyc_tier').select('*').eq('creator_email', user.email).limit(1);
    const kycTier = (kycTiers||[])[0] || {};
    const sharePercentage = ({ 'tier_0_under500': 0.55, 'tier_1_500_5k': 0.60, 'tier_2_5k_plus': 0.65 })[kycTier.tier] || 0.60;

    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 86400000 * 60).toISOString();

    const [recentSubsRes, prevSubsRes, recentTipsRes, prevTipsRes] = await Promise.all([
      supabase.from('creator_subscription').select('tier').eq('creator_id', user.email).gte('created_date', thirtyDaysAgo),
      supabase.from('creator_subscription').select('tier').eq('creator_id', user.email).gte('created_date', sixtyDaysAgo).lt('created_date', thirtyDaysAgo),
      supabase.from('gift_transaction').select('total_as_value').eq('recipient_email', user.email).gte('created_date', thirtyDaysAgo),
      supabase.from('gift_transaction').select('total_as_value').eq('recipient_email', user.email).gte('created_date', sixtyDaysAgo).lt('created_date', thirtyDaysAgo),
    ]);

    const tierPrices = { basic: 2.99, premium: 4.99, vip: 9.99 };
    const recentSubRev = (recentSubsRes.data||[]).reduce((s, sub) => s + (tierPrices[sub.tier]||0), 0);
    const prevSubRev = (prevSubsRes.data||[]).reduce((s, sub) => s + (tierPrices[sub.tier]||0), 0);
    const recentTipUsd = (recentTipsRes.data||[]).reduce((s, t) => s + ((t.total_as_value||0)/65), 0);
    const prevTipUsd = (prevTipsRes.data||[]).reduce((s, t) => s + ((t.total_as_value||0)/65), 0);

    const subGrowth = prevSubRev > 0 ? (recentSubRev - prevSubRev) / prevSubRev : 0.1;
    const tipGrowth = prevTipUsd > 0 ? (recentTipUsd - prevTipUsd) / prevTipUsd : 0;
    const projectedSub = recentSubRev * (1 + subGrowth);
    const projectedTip = recentTipUsd * (1 + tipGrowth);
    const totalGross = projectedSub + projectedTip;
    const payout = totalGross * sharePercentage;

    return Response.json({
      success: true,
      forecast: {
        totalProjectedUsd: payout.toFixed(2),
        revenueShare: (sharePercentage * 100).toFixed(0) + '%',
        breakdown: { subscriptions: projectedSub.toFixed(2), tips: projectedTip.toFixed(2) },
        trends: { subscriptionGrowth: (subGrowth * 100).toFixed(1) + '%', tippingGrowth: (tipGrowth * 100).toFixed(1) + '%' },
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});