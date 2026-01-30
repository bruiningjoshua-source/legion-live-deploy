import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const DEFAULT_CONFIG = {
  creator_base_share: 0.50,
  platform_base_share: 0.50,
  tier_thresholds: { bronze: 1000, silver: 2500, gold: 5000, platinum: 10000 },
  tier_shares: { starter: 0.50, bronze: 0.55, silver: 0.60, gold: 0.65, platinum: 0.70 },
  tip_platform_fee: 0.15,
  gift_platform_fee: 0.30,
  subscription_platform_fee: 0.30,
  affiliate_partner_share: 0.75,
  referral_bonus_percent: 0.10,
  min_payout_usd: 50
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch active config
    const configs = await base44.asServiceRole.entities.PayoutConfig.filter(
      { config_name: 'default', is_active: true },
      null,
      1
    );
    
    const config = configs[0] || DEFAULT_CONFIG;
    
    // Merge with defaults to ensure all fields exist
    const mergedConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      tier_thresholds: { ...DEFAULT_CONFIG.tier_thresholds, ...(config.tier_thresholds || {}) },
      tier_shares: { ...DEFAULT_CONFIG.tier_shares, ...(config.tier_shares || {}) }
    };
    
    return Response.json({ success: true, config: mergedConfig });
  } catch (error) {
    console.error('[getPayoutConfig] Error:', error.message);
    // Return defaults on error to prevent app breakage
    return Response.json({ success: true, config: DEFAULT_CONFIG });
  }
});