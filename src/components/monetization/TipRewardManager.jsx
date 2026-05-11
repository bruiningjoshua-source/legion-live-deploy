import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Heart, Sparkles, 
  Plus, Trash2, Edit2, Save
} from 'lucide-react';
import { toast } from 'sonner';

const REWARD_TYPES = [
  { value: 'message', label: 'Thank You Message', icon: '💬', description: 'Custom message displayed on stream' },
  { value: 'shoutout', label: 'Live Shoutout', icon: '📣', description: 'Verbal shoutout during stream' },
  { value: 'emote_unlock', label: 'Emote Unlock', icon: '😎', description: 'Unlock exclusive emote' },
  { value: 'badge', label: 'Special Badge', icon: '🏅', description: 'Temporary special badge' },
  { value: 'exclusive_content', label: 'Exclusive Content', icon: '🔓', description: 'Access to exclusive content' },
  { value: 'custom', label: 'Custom Reward', icon: '⭐', description: 'Define your own reward' },
];

const ANIMATION_TYPES = [
  { value: 'none', label: 'None', icon: '➖' },
  { value: 'confetti', label: 'Confetti', icon: '🎊' },
  { value: 'fireworks', label: 'Fireworks', icon: '🎆' },
  { value: 'hearts', label: 'Hearts', icon: '💕' },
  { value: 'stars', label: 'Stars', icon: '✨' },
  { value: 'custom', label: 'Custom', icon: '🎨' },
];

const PRESET_TIERS = [
  { min: 1, max: 4.99, name: 'Small Tip', emoji: '☕', color: '#6B7280' },
  { min: 5, max: 19.99, name: 'Medium Tip', emoji: '🌟', color: '#3B82F6' },
  { min: 20, max: 49.99, name: 'Large Tip', emoji: '💎', color: '#8B5CF6' },
  { min: 50, max: 99.99, name: 'Super Tip', emoji: '👑', color: '#F59E0B' },
  { min: 100, max: null, name: 'Mega Tip', emoji: '🔥', color: '#EF4444' },
];

export default function TipRewardManager({ creatorId }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newReward, setNewReward] = useState({
    min_amount_usd: 5,
    max_amount_usd: null,
    message_template: 'Thank you {tipper_name} for the ${amount} tip! 🎉',
    reward_type: 'message',
    reward_value: '',
    animation_type: 'confetti',
    sound_url: '',
    is_active: true,
  });

  const { data: rewards = [], isLoading } = useQuery({
    queryKey: ['tip-rewards', creatorId],
    queryFn: () => base44.entities.TipRewardMessage.filter({ creator_id: creatorId }, 'min_amount_usd'),
    enabled: !!creatorId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TipRewardMessage.create({ ...data, creator_id: creatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tip-rewards', creatorId] });
      setShowCreate(false);
      resetForm();
      toast.success('Tip reward created!');
    },
    onError: () => toast.error('Failed to create reward'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TipRewardMessage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tip-rewards', creatorId] });
      setEditingId(null);
      toast.success('Reward updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TipRewardMessage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tip-rewards', creatorId] });
      toast.success('Reward deleted');
    },
  });

  const resetForm = () => {
    setNewReward({
      min_amount_usd: 5,
      max_amount_usd: null,
      message_template: 'Thank you {tipper_name} for the ${amount} tip! 🎉',
      reward_type: 'message',
      reward_value: '',
      animation_type: 'confetti',
      sound_url: '',
      is_active: true,
    });
  };

  const applyPreset = (preset) => {
    setNewReward({
      ...newReward,
      min_amount_usd: preset.min,
      max_amount_usd: preset.max,
      message_template: `${preset.emoji} {tipper_name} sent a ${preset.name}! Thank you for $\{amount}!`,
      animation_type: preset.min >= 50 ? 'fireworks' : preset.min >= 20 ? 'confetti' : 'hearts',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-amber-100 font-bold text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Tip Reward Messages
          </h3>
          <p className="text-amber-400/60 text-sm">Customize thank you messages for different tip amounts</p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-pink-600 hover:bg-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reward Tier
        </Button>
      </div>

      {/* Quick Presets */}
      {!showCreate && rewards.length === 0 && (
        <div className="bg-stone-900/50 rounded-xl p-6 border border-amber-600/20">
          <p className="text-amber-200 font-medium mb-3">Quick Setup - Choose a preset tier to get started</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_TIERS.map((preset, i) => (
              <Button
                key={i}
                variant="outline"
                onClick={() => { applyPreset(preset); setShowCreate(true); }}
                className="border-amber-600/30 text-amber-200 hover:bg-amber-600/20"
              >
                <span className="mr-2">{preset.emoji}</span>
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Reward List */}
      <div className="space-y-3">
        {rewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            isEditing={editingId === reward.id}
            onEdit={() => setEditingId(reward.id)}
            onSave={(data) => updateMutation.mutate({ id: reward.id, data })}
            onCancel={() => setEditingId(null)}
            onDelete={() => deleteMutation.mutate(reward.id)}
            onToggle={() => updateMutation.mutate({ id: reward.id, data: { is_active: !reward.is_active } })}
          />
        ))}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-stone-900 rounded-xl border border-pink-600/30 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <h4 className="text-amber-100 font-bold">Create Tip Reward</h4>

              {/* Amount Range */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-amber-200">Minimum Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newReward.min_amount_usd}
                    onChange={(e) => setNewReward({ ...newReward, min_amount_usd: parseFloat(e.target.value) })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
                <div>
                  <Label className="text-amber-200">Maximum Amount ($) - optional</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newReward.max_amount_usd || ''}
                    onChange={(e) => setNewReward({ ...newReward, max_amount_usd: e.target.value ? parseFloat(e.target.value) : null })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                    placeholder="No limit"
                  />
                </div>
              </div>

              {/* Message Template */}
              <div>
                <Label className="text-amber-200">Message Template</Label>
                <Textarea
                  value={newReward.message_template}
                  onChange={(e) => setNewReward({ ...newReward, message_template: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                  placeholder="Use {tipper_name}, {amount}, {creator_name}"
                  rows={2}
                />
                <p className="text-amber-400/40 text-xs mt-1">
                  Available: {'{tipper_name}'}, {'{amount}'}, {'{creator_name}'}
                </p>
              </div>

              {/* Reward Type */}
              <div>
                <Label className="text-amber-200">Reward Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {REWARD_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setNewReward({ ...newReward, reward_type: type.value })}
                      className={`p-3 rounded-xl text-left transition-all ${
                        newReward.reward_type === type.value
                          ? 'bg-pink-600/30 border border-pink-500/50'
                          : 'bg-stone-800/50 border border-stone-700/50 hover:bg-stone-700/50'
                      }`}
                    >
                      <span className="text-xl">{type.icon}</span>
                      <p className="text-xs text-amber-200 mt-1">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation */}
              <div>
                <Label className="text-amber-200">On-Screen Animation</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ANIMATION_TYPES.map(anim => (
                    <button
                      key={anim.value}
                      onClick={() => setNewReward({ ...newReward, animation_type: anim.value })}
                      className={`px-4 py-2 rounded-lg transition-all ${
                        newReward.animation_type === anim.value
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-800 text-amber-200 hover:bg-stone-700'
                      }`}
                    >
                      <span className="mr-2">{anim.icon}</span>
                      {anim.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-amber-600/20">
                <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createMutation.mutate(newReward)}
                  disabled={createMutation.isPending || !newReward.message_template}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Reward
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RewardCard({ reward, isEditing, onEdit, onSave, onCancel, onDelete, onToggle }) {
  const [editData, setEditData] = useState(reward);
  const tier = PRESET_TIERS.find(t => reward.min_amount_usd >= t.min && (!t.max || reward.min_amount_usd <= t.max));

  if (isEditing) {
    return (
      <motion.div layout className="bg-stone-900 rounded-xl border border-pink-600/30 p-5">
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-amber-200">Min Amount ($)</Label>
              <Input
                type="number"
                value={editData.min_amount_usd}
                onChange={(e) => setEditData({ ...editData, min_amount_usd: parseFloat(e.target.value) })}
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>
            <div>
              <Label className="text-amber-200">Max Amount ($)</Label>
              <Input
                type="number"
                value={editData.max_amount_usd || ''}
                onChange={(e) => setEditData({ ...editData, max_amount_usd: e.target.value ? parseFloat(e.target.value) : null })}
                className="bg-stone-800 border-amber-600/20 text-amber-100"
              />
            </div>
          </div>
          <div>
            <Label className="text-amber-200">Message</Label>
            <Textarea
              value={editData.message_template}
              onChange={(e) => setEditData({ ...editData, message_template: e.target.value })}
              className="bg-stone-800 border-amber-600/20 text-amber-100"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={() => onSave(editData)} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layout
      className={`rounded-xl border overflow-hidden transition-all ${
        reward.is_active 
          ? 'bg-stone-900/60 border-amber-600/20' 
          : 'bg-stone-900/30 border-stone-700/30 opacity-60'
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${tier?.color}20` }}
        >
          {tier?.emoji || '💰'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-100 font-bold">
              ${reward.min_amount_usd}{reward.max_amount_usd ? ` - $${reward.max_amount_usd}` : '+'}
            </span>
            <span className="text-amber-400/40 text-xs">
              {ANIMATION_TYPES.find(a => a.value === reward.animation_type)?.icon}
            </span>
          </div>
          <p className="text-amber-400/70 text-sm truncate">{reward.message_template}</p>
          <p className="text-amber-400/40 text-xs mt-1">Triggered {reward.times_triggered || 0} times</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={reward.is_active} onCheckedChange={onToggle} />
          <Button size="icon" variant="ghost" onClick={onEdit} className="text-amber-400">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="text-red-400">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}