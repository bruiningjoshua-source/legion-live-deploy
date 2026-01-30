import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Gift,
  Crown,
  DollarSign,
  Target,
  Sparkles,
  Check,
  Plus,
  Star,
  Zap
} from 'lucide-react';
import OnboardingTooltip, { OnboardingBanner } from './OnboardingTooltip';

const DEFAULT_TIERS = [
  { 
    tier_name: 'bronze', 
    display_name: 'Supporter',
    price_usd: 4.99,
    perks: ['Ad-free viewing', 'Supporter badge', 'Exclusive emotes'],
    badge_icon: '⭐',
    badge_color: '#cd7f32'
  },
  { 
    tier_name: 'silver', 
    display_name: 'VIP', 
    price_usd: 9.99,
    perks: ['All Bronze perks', 'Priority chat', 'Monthly shoutout'],
    badge_icon: '💎',
    badge_color: '#c0c0c0'
  },
  { 
    tier_name: 'gold', 
    display_name: 'Elite',
    price_usd: 24.99,
    perks: ['All Silver perks', 'Private Discord', '1-on-1 monthly call'],
    badge_icon: '👑',
    badge_color: '#ffd700'
  }
];

export default function MonetizationSetupStep({ data, onChange }) {
  const [showGoalSetup, setShowGoalSetup] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  const toggleFeature = (feature) => {
    onChange({ ...data, [feature]: !data[feature] });
  };

  const enableSubscriptions = () => {
    onChange({ 
      ...data, 
      subscriptions_enabled: true,
      tiers: DEFAULT_TIERS
    });
  };

  const setGiftGoal = () => {
    if (goalName && goalAmount) {
      onChange({
        ...data,
        gift_goal: {
          goal_name: goalName,
          target_denarii: parseInt(goalAmount),
          current_denarii: 0,
          is_active: true
        }
      });
      setShowGoalSetup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Set Up Monetization</h2>
        <p className="text-white/60">Choose how you want to earn from your streams</p>
      </div>

      <OnboardingBanner
        title="You Keep 70%"
        content="Legion Live creators keep 70% of all earnings from gifts, tips, and subscriptions!"
        variant="success"
        icon={DollarSign}
      />

      {/* Virtual Gifts */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">Virtual Gifts</h3>
                  <OnboardingTooltip
                    title="Virtual Gifts"
                    content="Viewers can send you animated gifts during your streams. Each gift has a coin value that converts to real earnings."
                    tips={[
                      'Gift animations show on your stream',
                      'Higher-tier gifts earn more',
                      'Gifts boost your visibility'
                    ]}
                  />
                </div>
                <p className="text-white/50 text-sm">Receive animated gifts from viewers</p>
              </div>
            </div>
            <Switch
              checked={data.gifts_enabled}
              onCheckedChange={() => toggleFeature('gifts_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Direct Tips */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">Direct Tips</h3>
                  <OnboardingTooltip
                    title="Direct Tips"
                    content="Allow viewers to send you direct monetary tips. Tips can include custom messages."
                    tips={[
                      'Set minimum tip amounts',
                      'Tips show on stream',
                      'No platform fees on tips'
                    ]}
                  />
                </div>
                <p className="text-white/50 text-sm">Accept cash tips from supporters</p>
              </div>
            </div>
            <Switch
              checked={data.tips_enabled}
              onCheckedChange={() => toggleFeature('tips_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card className={`border ${data.subscriptions_enabled ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/10'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">Subscriptions</h3>
                  <OnboardingTooltip
                    title="Subscriptions"
                    content="Create tiered subscription levels with exclusive perks. Subscribers pay monthly for special benefits."
                    tips={[
                      'Recurring monthly income',
                      'Build a loyal community',
                      'Offer exclusive content'
                    ]}
                  />
                </div>
                <p className="text-white/50 text-sm">Monthly subscriber tiers with perks</p>
              </div>
            </div>
            <Switch
              checked={data.subscriptions_enabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  enableSubscriptions();
                } else {
                  onChange({ ...data, subscriptions_enabled: false, tiers: [] });
                }
              }}
            />
          </div>

          {/* Tier Preview */}
          {data.subscriptions_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 pt-4 border-t border-white/10"
            >
              <p className="text-white/60 text-xs mb-2">Default tiers (customizable later):</p>
              {DEFAULT_TIERS.map((tier, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tier.badge_icon}</span>
                    <span className="text-white text-sm">{tier.display_name}</span>
                  </div>
                  <span className="text-amber-400 font-medium">${tier.price_usd}/mo</span>
                </div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Gift Goal */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium">Gift Goal</h3>
                <OnboardingTooltip
                  title="Gift Goal"
                  content="Set a visible goal for your viewers to help you reach. Great for equipment upgrades, events, or milestones."
                  tips={[
                    'Motivates viewers to gift',
                    'Shows progress on stream',
                    'Creates excitement'
                  ]}
                />
              </div>
              <p className="text-white/50 text-sm">Set a target for viewers to help you reach</p>
            </div>
          </div>

          {data.gift_goal?.is_active ? (
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-300 font-medium">{data.gift_goal.goal_name}</span>
                <span className="text-amber-400">{data.gift_goal.target_denarii} coins</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...data, gift_goal: null })}
                className="text-white/60"
              >
                Remove Goal
              </Button>
            </div>
          ) : showGoalSetup ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <Input
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Goal name (e.g., New microphone)"
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="Target amount (coins)"
                className="bg-white/10 border-white/20 text-white"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowGoalSetup(false)}
                  variant="ghost"
                  className="flex-1 text-white/60"
                >
                  Cancel
                </Button>
                <Button
                  onClick={setGiftGoal}
                  className="flex-1 bg-amber-600"
                  disabled={!goalName || !goalAmount}
                >
                  Set Goal
                </Button>
              </div>
            </motion.div>
          ) : (
            <Button
              onClick={() => setShowGoalSetup(true)}
              variant="outline"
              className="w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Set a Gift Goal
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}