import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Gift,
  Users,
  Crown,
  Plus,
  Edit2,
  Target,
  TrendingUp,
  Lock,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

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
    perks: ['All Bronze perks', 'Priority chat', 'Monthly shoutout', 'Behind-the-scenes content'],
    badge_icon: '💎',
    badge_color: '#c0c0c0'
  },
  { 
    tier_name: 'gold', 
    display_name: 'Elite',
    price_usd: 24.99,
    perks: ['All Silver perks', 'Private Discord access', '1-on-1 monthly call', 'Exclusive content vault'],
    badge_icon: '👑',
    badge_color: '#ffd700'
  }
];

export default function CreatorMonetizationPanel({ creator, user }) {
  const queryClient = useQueryClient();
  const [editingTier, setEditingTier] = useState(null);
  const [newPerk, setNewPerk] = useState('');

  const { data: monetization } = useQuery({
    queryKey: ['creator-monetization', creator?.id],
    queryFn: async () => {
      const results = await base44.entities.CreatorMonetization.filter({ 
        creator_id: creator.id 
      }, null, 1);
      return results[0] || null;
    },
    enabled: !!creator?.id
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['subscription-tiers', creator?.id],
    queryFn: () => base44.entities.SubscriptionTier.filter({ creator_id: creator.id }),
    enabled: !!creator?.id
  });

  const { data: earnings } = useQuery({
    queryKey: ['creator-earnings', creator?.id],
    queryFn: async () => {
      const results = await base44.entities.BroadcasterEarnings.filter({ 
        creator_id: creator.id 
      }, null, 1);
      return results[0] || null;
    },
    enabled: !!creator?.id
  });

  const setupMonetizationMutation = useMutation({
    mutationFn: async () => {
      // Create monetization settings
      const monet = await base44.entities.CreatorMonetization.create({
        creator_id: creator.id,
        user_email: user.email,
        monetization_enabled: true,
        gifts_enabled: true,
        subscriptions_enabled: true,
        tips_enabled: true
      });

      // Create default subscription tiers
      for (const tier of DEFAULT_TIERS) {
        await base44.entities.SubscriptionTier.create({
          creator_id: creator.id,
          ...tier
        });
      }

      return monet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-monetization', creator?.id] });
      queryClient.invalidateQueries({ queryKey: ['subscription-tiers', creator?.id] });
      toast.success('Monetization enabled!');
    }
  });

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SubscriptionTier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-tiers', creator?.id] });
      setEditingTier(null);
      toast.success('Tier updated');
    }
  });

  const toggleSettingMutation = useMutation({
    mutationFn: ({ setting, value }) => 
      base44.entities.CreatorMonetization.update(monetization.id, { [setting]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-monetization', creator?.id] });
    }
  });

  const setGiftGoalMutation = useMutation({
    mutationFn: (goal) => 
      base44.entities.CreatorMonetization.update(monetization.id, { gift_goal: goal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-monetization', creator?.id] });
      toast.success('Gift goal set!');
    }
  });

  if (!monetization) {
    return (
      <Card className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-amber-500/30">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Start Earning</h3>
          <p className="text-white/60 mb-4">Enable monetization to receive gifts, tips, and subscriptions from your viewers.</p>
          <Button 
            onClick={() => setupMonetizationMutation.mutate()}
            disabled={setupMonetizationMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-500"
          >
            {setupMonetizationMutation.isPending ? 'Setting up...' : 'Enable Monetization'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Earnings Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Earnings', value: `$${(monetization.total_earnings_usd || 0).toFixed(2)}`, icon: DollarSign, color: 'green' },
          { label: 'Pending Payout', value: `$${(monetization.pending_payout_usd || 0).toFixed(2)}`, icon: TrendingUp, color: 'amber' },
          { label: 'Gifts Received', value: monetization.lifetime_gifts_received || 0, icon: Gift, color: 'pink' },
          { label: 'Active Subs', value: monetization.active_subscribers || 0, icon: Users, color: 'purple' },
        ].map((stat, i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardContent className="p-4 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-2 text-${stat.color}-400`} />
              <div className="text-lg font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/50">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="settings" className="data-[state=active]:bg-amber-600">Settings</TabsTrigger>
          <TabsTrigger value="tiers" className="data-[state=active]:bg-amber-600">Sub Tiers</TabsTrigger>
          <TabsTrigger value="goals" className="data-[state=active]:bg-amber-600">Goals</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Monetization Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'gifts_enabled', label: 'Virtual Gifts', desc: 'Receive virtual gifts from viewers', icon: Gift },
                { key: 'subscriptions_enabled', label: 'Subscriptions', desc: 'Allow viewers to subscribe to you', icon: Crown },
                { key: 'tips_enabled', label: 'Direct Tips', desc: 'Receive direct monetary tips', icon: DollarSign },
                { key: 'paid_content_enabled', label: 'Paid Content', desc: 'Offer exclusive paid content', icon: Lock },
              ].map(setting => (
                <div key={setting.key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <setting.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{setting.label}</p>
                      <p className="text-white/50 text-xs">{setting.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={monetization[setting.key]}
                    onCheckedChange={(value) => toggleSettingMutation.mutate({ setting: setting.key, value })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Revenue Share Info */}
          <Card className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-green-200 font-medium">Your Revenue Share</p>
                  <p className="text-green-100 text-2xl font-bold">{monetization.revenue_share_percent || 70}%</p>
                  <p className="text-green-300/60 text-xs">You keep {monetization.revenue_share_percent || 70}% of all earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tiers Tab */}
        <TabsContent value="tiers" className="space-y-4">
          {tiers.map(tier => (
            <Card key={tier.id} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${tier.badge_color}20` }}
                    >
                      {tier.badge_icon}
                    </div>
                    <div>
                      <p className="text-white font-bold">{tier.display_name || tier.tier_name}</p>
                      <p className="text-amber-400 font-semibold">${tier.price_usd}/month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-300">
                      {tier.subscriber_count || 0} subs
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingTier(editingTier === tier.id ? null : tier.id)}
                      className="text-white/60 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Perks */}
                <div className="space-y-1.5">
                  {tier.perks?.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="w-3.5 h-3.5 text-green-400" />
                      {perk}
                    </div>
                  ))}
                </div>

                {/* Edit Panel */}
                {editingTier === tier.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-white/10 space-y-3"
                  >
                    <div>
                      <label className="text-white/60 text-xs">Display Name</label>
                      <Input
                        defaultValue={tier.display_name}
                        onChange={(e) => updateTierMutation.mutate({ 
                          id: tier.id, 
                          data: { display_name: e.target.value }
                        })}
                        className="bg-white/10 border-white/20 text-white mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs">Price (USD/month)</label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={tier.price_usd}
                        onChange={(e) => updateTierMutation.mutate({ 
                          id: tier.id, 
                          data: { price_usd: parseFloat(e.target.value) }
                        })}
                        className="bg-white/10 border-white/20 text-white mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs">Add Perk</label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={newPerk}
                          onChange={(e) => setNewPerk(e.target.value)}
                          placeholder="New perk..."
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Button
                          size="icon"
                          onClick={() => {
                            if (newPerk.trim()) {
                              updateTierMutation.mutate({
                                id: tier.id,
                                data: { perks: [...(tier.perks || []), newPerk.trim()] }
                              });
                              setNewPerk('');
                            }
                          }}
                          className="bg-amber-600"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Gift Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monetization.gift_goal?.is_active ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-white font-medium">{monetization.gift_goal.goal_name}</p>
                    <div className="flex items-center justify-between text-sm text-white/60 mt-1">
                      <span>{monetization.gift_goal.current_denarii || 0} Denarii</span>
                      <span>{monetization.gift_goal.target_denarii} Denarii</span>
                    </div>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min(100, ((monetization.gift_goal.current_denarii || 0) / monetization.gift_goal.target_denarii) * 100)}%`
                      }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setGiftGoalMutation.mutate({ ...monetization.gift_goal, is_active: false })}
                    className="w-full border-white/20 text-white/70"
                  >
                    Clear Goal
                  </Button>
                </div>
              ) : (
                <GoalSetupForm onSubmit={setGiftGoalMutation.mutate} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoalSetupForm({ onSubmit }) {
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (goalName && targetAmount) {
      onSubmit({
        goal_name: goalName,
        target_denarii: parseInt(targetAmount),
        current_denarii: 0,
        is_active: true
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-white/60 text-sm">Goal Name</label>
        <Input
          value={goalName}
          onChange={(e) => setGoalName(e.target.value)}
          placeholder="e.g., New microphone, 1000 gifts party"
          className="bg-white/10 border-white/20 text-white mt-1"
        />
      </div>
      <div>
        <label className="text-white/60 text-sm">Target Amount (Denarii)</label>
        <Input
          type="number"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="e.g., 10000"
          className="bg-white/10 border-white/20 text-white mt-1"
        />
      </div>
      <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500">
        Set Goal
      </Button>
    </form>
  );
}