import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, Trash2, Save
} from 'lucide-react';
import { toast } from 'sonner';

const TIER_EMOJIS = ['🥉', '🥈', '🥇', '💎', '👑', '⚔️', '🦅', '🏛️', '🔥', '⭐'];
const TIER_COLORS = [
  { name: 'Bronze', value: '#CD7F32' },
  { name: 'Silver', value: '#C0C0C0' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Platinum', value: '#E5E4E2' },
  { name: 'Diamond', value: '#B9F2FF' },
  { name: 'Ruby', value: '#E0115F' },
  { name: 'Emerald', value: '#50C878' },
  { name: 'Purple', value: '#9B59B6' },
];

const DEFAULT_PERKS = [
  { id: 'badge', name: 'Custom Badge', icon: '🏅' },
  { id: 'emotes', name: 'Exclusive Emotes', icon: '😎' },
  { id: 'ad_free', name: 'Ad-Free Viewing', icon: '🚫' },
  { id: 'priority_chat', name: 'Priority Chat', icon: '💬' },
  { id: 'exclusive_content', name: 'Exclusive Content', icon: '🔒' },
  { id: 'direct_message', name: 'Direct Messaging', icon: '✉️' },
  { id: 'shoutout', name: 'Monthly Shoutout', icon: '📣' },
  { id: 'early_access', name: 'Early Access', icon: '⏰' },
];

export default function CustomTierEditor({ creatorId, existingTiers = [], onSave }) {
  const queryClient = useQueryClient();
  const [tiers, setTiers] = useState(existingTiers.length > 0 ? existingTiers : [
    createDefaultTier(1, 'Supporter', 4.99),
    createDefaultTier(2, 'Champion', 9.99),
    createDefaultTier(3, 'Legend', 19.99),
  ]);
  const [editingTier, setEditingTier] = useState(null);

  function createDefaultTier(level, name, price) {
    return {
      tier_level: level,
      display_name: name,
      description: '',
      price_usd: price,
      billing_period: 'monthly',
      badge_emoji: TIER_EMOJIS[level - 1] || '⭐',
      badge_color: TIER_COLORS[level - 1]?.value || '#FFD700',
      perks: DEFAULT_PERKS.slice(0, level + 1),
      ad_free: level >= 2,
      priority_chat: level >= 2,
      exclusive_content: level >= 3,
      direct_messaging: level >= 3,
      monthly_shoutout: level >= 3,
      max_subscribers: null,
      is_active: true,
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing tiers
      for (const existing of existingTiers) {
        await base44.entities.CustomSubscriptionTier.delete(existing.id);
      }
      // Create new tiers
      for (const tier of tiers) {
        await base44.entities.CustomSubscriptionTier.create({
          ...tier,
          creator_id: creatorId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['custom-tiers', creatorId]);
      toast.success('Subscription tiers saved!');
      onSave?.();
    },
    onError: () => toast.error('Failed to save tiers'),
  });

  const addTier = () => {
    const newLevel = tiers.length + 1;
    setTiers([...tiers, createDefaultTier(newLevel, `Tier ${newLevel}`, (newLevel * 5) + 4.99)]);
  };

  const removeTier = (index) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, updates) => {
    setTiers(tiers.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const togglePerk = (tierIndex, perkId) => {
    const tier = tiers[tierIndex];
    const hasPerk = tier.perks?.some(p => p.id === perkId);
    const perk = DEFAULT_PERKS.find(p => p.id === perkId);
    
    updateTier(tierIndex, {
      perks: hasPerk 
        ? tier.perks.filter(p => p.id !== perkId)
        : [...(tier.perks || []), perk]
    });
  };

  return (
    <div className="space-y-6">
      {/* Tier Cards */}
      <div className="grid gap-4">
        <AnimatePresence>
          {tiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-stone-900/60 rounded-2xl border border-amber-600/20 overflow-hidden"
            >
              {/* Tier Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                onClick={() => setEditingTier(editingTier === index ? null : index)}
                style={{ borderLeft: `4px solid ${tier.badge_color}` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tier.badge_emoji}</span>
                  <div>
                    <h4 className="text-amber-100 font-bold">{tier.display_name}</h4>
                    <p className="text-amber-400/60 text-sm">
                      ${tier.price_usd}/{tier.billing_period === 'monthly' ? 'mo' : tier.billing_period === 'quarterly' ? 'qtr' : 'yr'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400/60 text-sm">{tier.perks?.length || 0} perks</span>
                  {tiers.length > 1 && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={(e) => { e.stopPropagation(); removeTier(index); }}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded Editor */}
              <AnimatePresence>
                {editingTier === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-amber-600/10"
                  >
                    <div className="p-6 space-y-6">
                      {/* Basic Info */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-amber-200">Tier Name</Label>
                          <Input
                            value={tier.display_name}
                            onChange={(e) => updateTier(index, { display_name: e.target.value })}
                            className="bg-stone-800 border-amber-600/20 text-amber-100"
                            placeholder="e.g. Centurion, Praetorian"
                          />
                        </div>
                        <div>
                          <Label className="text-amber-200">Price (USD)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={tier.price_usd}
                            onChange={(e) => updateTier(index, { price_usd: parseFloat(e.target.value) })}
                            className="bg-stone-800 border-amber-600/20 text-amber-100"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-amber-200">Billing Period</Label>
                          <Select 
                            value={tier.billing_period} 
                            onValueChange={(v) => updateTier(index, { billing_period: v })}
                          >
                            <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-amber-200">Badge Emoji</Label>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {TIER_EMOJIS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => updateTier(index, { badge_emoji: emoji })}
                                className={`p-2 rounded-lg text-xl transition-all ${
                                  tier.badge_emoji === emoji 
                                    ? 'bg-amber-600 scale-110' 
                                    : 'bg-stone-800 hover:bg-stone-700'
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-amber-200">Badge Color</Label>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {TIER_COLORS.map(color => (
                              <button
                                key={color.value}
                                onClick={() => updateTier(index, { badge_color: color.value })}
                                className={`w-8 h-8 rounded-full transition-all ${
                                  tier.badge_color === color.value ? 'ring-2 ring-white scale-110' : ''
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-amber-200">Description</Label>
                        <Textarea
                          value={tier.description || ''}
                          onChange={(e) => updateTier(index, { description: e.target.value })}
                          className="bg-stone-800 border-amber-600/20 text-amber-100"
                          placeholder="Describe what makes this tier special..."
                          rows={2}
                        />
                      </div>

                      {/* Perks Toggle */}
                      <div>
                        <Label className="text-amber-200 mb-3 block">Included Perks</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {DEFAULT_PERKS.map(perk => {
                            const isActive = tier.perks?.some(p => p.id === perk.id);
                            return (
                              <button
                                key={perk.id}
                                onClick={() => togglePerk(index, perk.id)}
                                className={`p-3 rounded-xl text-left transition-all ${
                                  isActive 
                                    ? 'bg-amber-600/30 border border-amber-500/50' 
                                    : 'bg-stone-800/50 border border-stone-700/50 hover:bg-stone-700/50'
                                }`}
                              >
                                <span className="text-lg">{perk.icon}</span>
                                <p className={`text-xs mt-1 ${isActive ? 'text-amber-200' : 'text-amber-400/60'}`}>
                                  {perk.name}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Exclusivity */}
                      <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl">
                        <div>
                          <p className="text-amber-100 font-medium">Limit Subscribers</p>
                          <p className="text-amber-400/60 text-sm">Create exclusivity with limited spots</p>
                        </div>
                        <Input
                          type="number"
                          value={tier.max_subscribers || ''}
                          onChange={(e) => updateTier(index, { max_subscribers: e.target.value ? parseInt(e.target.value) : null })}
                          className="w-24 bg-stone-700 border-amber-600/20 text-amber-100"
                          placeholder="∞"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Tier Button */}
      {tiers.length < 5 && (
        <Button
          onClick={addTier}
          variant="outline"
          className="w-full border-dashed border-amber-600/30 text-amber-400 hover:bg-amber-600/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Tier
        </Button>
      )}

      {/* Save Button */}
      <Button 
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600"
      >
        <Save className="w-4 h-4 mr-2" />
        {saveMutation.isPending ? 'Saving...' : 'Save All Tiers'}
      </Button>
    </div>
  );
}