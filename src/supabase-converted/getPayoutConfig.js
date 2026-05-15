/* eslint-disable no-undef */
// ═══ CONVERTED: getPayoutConfig ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_CONFIG = {
  creator_base_share: 0.50, platform_base_share: 0.50,
  tier_thresholds: { bronze: 1000, silver: 2500, gold: 5000, platinum: 10000 },
  tier_shares: { starter: 0.50, bronze: 0.50, silver: 0.50, gold: 0.50, platinum: 0.50 },
  tip_platform_fee: 0.50, gift_platform_fee: 0.50, subscription_platform_fee: 0.50,
  affiliate_partner_share: 0.90, referral_bonus_percent: 0.10, min_payout_usd: 50
};

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const { data: configs } = await supabase.from('payout_config').select('*').eq('config_name', 'default').eq('is_active', true).limit(1);
    const config = (configs||[])[0] || DEFAULT_CONFIG;
    return Response.json({ success: true, config: { ...DEFAULT_CONFIG, ...config } });
  } catch (error) {
    return Response.json({ success: true, config: DEFAULT_CONFIG });
  }
});