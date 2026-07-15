import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Settings, DollarSign, Users, Percent, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const DEFAULT_CONFIG = {
  config_name: 'default',
  creator_base_share: 0.80,
  platform_base_share: 0.20,
  tier_thresholds: {
    bronze: 1000,
    silver: 2500,
    gold: 5000,
    platinum: 10000
  },
  tier_shares: {
    starter: 0.80,
    bronze: 0.80,
    silver: 0.80,
    gold: 0.80,
    platinum: 0.80
  },
  tip_platform_fee: 0.20,       // Platform takes 20%, creator gets 80%
  gift_platform_fee: 0.40,       // Platform takes 40%, creator gets 60%
  subscription_platform_fee: 0.20, // Platform takes 20%, creator gets 80%
  affiliate_partner_share: 0.90,  // Affiliates get 90%
  referral_bonus_percent: 0.10,
  min_payout_usd: 50,
  is_active: true
};

export default function PayoutConfigManager() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['payout-config'],
    queryFn: async () => {
      const configs = await base44.entities.PlatformPayoutConfig.filter({}, null, 1);
      return configs[0] || null;
    }
  });

  useEffect(() => {
    if (savedConfig) {
      setConfig({
        ...DEFAULT_CONFIG,
        ...savedConfig,
        tier_thresholds: { ...DEFAULT_CONFIG.tier_thresholds, ...savedConfig.tier_thresholds },
        tier_shares: { ...DEFAULT_CONFIG.tier_shares, ...savedConfig.tier_shares }
      });
    }
  }, [savedConfig]);

  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      if (savedConfig?.id) {
        return base44.entities.PlatformPayoutConfig.update(savedConfig.id, configData);
      } else {
        return base44.entities.PlatformPayoutConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-config'] });
      setHasChanges(false);
      toast.success('Payout configuration saved!');
    },
    onError: (err) => {
      toast.error('Failed to save: ' + err.message);
    }
  });

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleNestedChange = (parent, field, value) => {
    setConfig(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const handleReset = () => {
    setConfig(savedConfig || DEFAULT_CONFIG);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Payout Configuration
          </h2>
          <p className="text-white/60 text-sm mt-1">Configure platform and creator revenue splits</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} className="border-white/20 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saveMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/20 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span className="text-amber-200 text-sm">You have unsaved changes</span>
        </motion.div>
      )}

      {/* Fee Structure */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-400" />
            Platform Fees
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tips */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-white/80">Tip Platform Fee</Label>
              <span className="text-amber-400 font-mono">{Math.round(config.tip_platform_fee * 100)}%</span>
            </div>
            <Slider
              value={[config.tip_platform_fee * 100]}
              onValueChange={([v]) => handleChange('tip_platform_fee', v / 100)}
              min={5}
              max={50}
              step={1}
              className="w-full"
            />
            <p className="text-white/40 text-xs mt-1">Creator gets {100 - Math.round(config.tip_platform_fee * 100)}% of tips</p>
          </div>

          {/* Gifts */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-white/80">Gift Platform Fee</Label>
              <span className="text-amber-400 font-mono">{Math.round(config.gift_platform_fee * 100)}%</span>
            </div>
            <Slider
              value={[config.gift_platform_fee * 100]}
              onValueChange={([v]) => handleChange('gift_platform_fee', v / 100)}
              min={10}
              max={60}
              step={1}
              className="w-full"
            />
            <p className="text-white/40 text-xs mt-1">Creator gets {100 - Math.round(config.gift_platform_fee * 100)}% of gift value</p>
          </div>

          {/* Subscriptions */}
          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-white/80">Subscription Platform Fee</Label>
              <span className="text-amber-400 font-mono">{Math.round(config.subscription_platform_fee * 100)}%</span>
            </div>
            <Slider
              value={[config.subscription_platform_fee * 100]}
              onValueChange={([v]) => handleChange('subscription_platform_fee', v / 100)}
              min={10}
              max={50}
              step={1}
              className="w-full"
            />
            <p className="text-white/40 text-xs mt-1">Creator gets {100 - Math.round(config.subscription_platform_fee * 100)}% of subscriptions</p>
          </div>
        </CardContent>
      </Card>

      {/* Tiered Payout System */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            Creator Tier System
          </CardTitle>
          <p className="text-white/50 text-xs">Higher earning creators get better revenue shares</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {['starter', 'bronze', 'silver', 'gold', 'platinum'].map((tier, i) => (
            <div key={tier} className="grid grid-cols-3 gap-4 items-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge className={`
                  ${tier === 'starter' ? 'bg-stone-500' : ''}
                  ${tier === 'bronze' ? 'bg-orange-600' : ''}
                  ${tier === 'silver' ? 'bg-gray-400' : ''}
                  ${tier === 'gold' ? 'bg-amber-500' : ''}
                  ${tier === 'platinum' ? 'bg-cyan-400 text-black' : ''}
                `}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Badge>
              </div>
              
              {tier !== 'starter' && (
                <div>
                  <Label className="text-white/60 text-xs">Threshold ($)</Label>
                  <Input
                    type="number"
                    value={config.tier_thresholds[tier] || 0}
                    onChange={(e) => handleNestedChange('tier_thresholds', tier, parseInt(e.target.value) || 0)}
                    className="bg-white/10 border-white/20 text-white h-8 text-sm"
                  />
                </div>
              )}
              {tier === 'starter' && <div className="text-white/40 text-sm">Default tier</div>}
              
              <div>
                <Label className="text-white/60 text-xs">Creator Share (%)</Label>
                <Input
                  type="number"
                  value={Math.round((config.tier_shares[tier] || 0.5) * 100)}
                  onChange={(e) => handleNestedChange('tier_shares', tier, parseInt(e.target.value) / 100)}
                  className="bg-white/10 border-white/20 text-white h-8 text-sm"
                  min={30}
                  max={90}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Affiliate & Referral */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Affiliate & Referral Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white/80">Affiliate Partner Share (%)</Label>
              <Input
                type="number"
                value={Math.round(config.affiliate_partner_share * 100)}
                onChange={(e) => handleChange('affiliate_partner_share', parseInt(e.target.value) / 100)}
                className="bg-white/10 border-white/20 text-white mt-1"
                min={50}
                max={90}
              />
              <p className="text-white/40 text-xs mt-1">Platform gets {100 - Math.round(config.affiliate_partner_share * 100)}%</p>
            </div>
            <div>
              <Label className="text-white/80">Referral Bonus (%)</Label>
              <Input
                type="number"
                value={Math.round(config.referral_bonus_percent * 100)}
                onChange={(e) => handleChange('referral_bonus_percent', parseInt(e.target.value) / 100)}
                className="bg-white/10 border-white/20 text-white mt-1"
                min={5}
                max={25}
              />
              <p className="text-white/40 text-xs mt-1">Bonus on referred user spending</p>
            </div>
          </div>
          
          <div>
            <Label className="text-white/80">Minimum Payout (USD)</Label>
            <Input
              type="number"
              value={config.min_payout_usd}
              onChange={(e) => handleChange('min_payout_usd', parseInt(e.target.value) || 50)}
              className="bg-white/10 border-white/20 text-white mt-1 max-w-xs"
              min={10}
              max={500}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-gradient-to-br from-amber-900/20 to-stone-900 border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-base">Revenue Split Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white/60 text-xs">$100 Tip</p>
              <p className="text-green-400 font-bold">${(100 * (1 - config.tip_platform_fee)).toFixed(0)}</p>
              <p className="text-white/40 text-xs">to creator</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white/60 text-xs">$100 Gift</p>
              <p className="text-green-400 font-bold">${(100 * (1 - config.gift_platform_fee)).toFixed(0)}</p>
              <p className="text-white/40 text-xs">to creator</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white/60 text-xs">$100 Sub</p>
              <p className="text-green-400 font-bold">${(100 * (1 - config.subscription_platform_fee)).toFixed(0)}</p>
              <p className="text-white/40 text-xs">to creator</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <p className="text-white/60 text-xs">Gold Tier</p>
              <p className="text-amber-400 font-bold">{Math.round((config.tier_shares.gold || 0.65) * 100)}%</p>
              <p className="text-white/40 text-xs">creator share</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}