import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Target, Trophy, Users, DollarSign, Eye, Gift,
  Plus, Trash2, Edit2, Zap, PartyPopper
} from 'lucide-react';
import { toast } from 'sonner';

const MILESTONE_TYPES = [
  { value: 'tip_total', label: 'Total Tips', icon: <DollarSign className="w-4 h-4" />, unit: 'USD', description: 'Total tip earnings' },
  { value: 'single_tip', label: 'Single Tip', icon: <Gift className="w-4 h-4" />, unit: 'USD', description: 'Single tip amount' },
  { value: 'subscriber_count', label: 'Subscribers', icon: <Users className="w-4 h-4" />, unit: '', description: 'Total subscriber count' },
  { value: 'follower_count', label: 'Followers', icon: <Users className="w-4 h-4" />, unit: '', description: 'Total follower count' },
  { value: 'stream_viewers', label: 'Peak Viewers', icon: <Eye className="w-4 h-4" />, unit: '', description: 'Peak concurrent viewers' },
  { value: 'gift_total', label: 'Total Gifts', icon: <Gift className="w-4 h-4" />, unit: 'Denarii', description: 'Total gift value' },
];

const CELEBRATION_TYPES = [
  { value: 'confetti', label: 'Confetti', icon: '🎊' },
  { value: 'fireworks', label: 'Fireworks', icon: '🎆' },
  { value: 'banner', label: 'Banner', icon: '🎌' },
  { value: 'sound', label: 'Sound Alert', icon: '🔔' },
  { value: 'screen_takeover', label: 'Screen Takeover', icon: '📺' },
];

const PRESET_MILESTONES = [
  { type: 'follower_count', values: [100, 500, 1000, 5000, 10000], prefix: '' },
  { type: 'subscriber_count', values: [10, 50, 100, 500, 1000], prefix: '' },
  { type: 'tip_total', values: [100, 500, 1000, 5000, 10000], prefix: '$' },
];

export default function MilestoneAlertManager({ creatorId }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newMilestone, setNewMilestone] = useState({
    milestone_type: 'follower_count',
    threshold_value: 100,
    alert_title: '🎉 Milestone Reached!',
    alert_message: 'We just hit {value} {milestone}! Thank you all! 🙏',
    celebration_type: 'confetti',
    auto_message_template: '',
    reward_subscribers: false,
    subscriber_reward: '',
    is_active: true,
    is_recurring: false,
  });

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['milestones', creatorId],
    queryFn: () => base44.entities.MilestoneAlert.filter({ creator_id: creatorId }, 'threshold_value'),
    enabled: !!creatorId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MilestoneAlert.create({ ...data, creator_id: creatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['milestones', creatorId]);
      setShowCreate(false);
      resetForm();
      toast.success('Milestone alert created!');
    },
    onError: () => toast.error('Failed to create milestone'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MilestoneAlert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['milestones', creatorId]);
      setEditingId(null);
      toast.success('Milestone updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MilestoneAlert.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['milestones', creatorId]);
      toast.success('Milestone deleted');
    },
  });

  const resetForm = () => {
    setNewMilestone({
      milestone_type: 'follower_count',
      threshold_value: 100,
      alert_title: '🎉 Milestone Reached!',
      alert_message: 'We just hit {value} {milestone}! Thank you all! 🙏',
      celebration_type: 'confetti',
      auto_message_template: '',
      reward_subscribers: false,
      subscriber_reward: '',
      is_active: true,
      is_recurring: false,
    });
  };

  const applyPreset = (type, value) => {
    const typeInfo = MILESTONE_TYPES.find(t => t.value === type);
    setNewMilestone({
      ...newMilestone,
      milestone_type: type,
      threshold_value: value,
      alert_title: `🎉 ${value.toLocaleString()} ${typeInfo?.label}!`,
      alert_message: `We just hit {value} {milestone}! Thank you all for your support! 🙏`,
    });
    setShowCreate(true);
  };

  const pendingMilestones = milestones.filter(m => m.is_active && !m.is_triggered);
  const triggeredMilestones = milestones.filter(m => m.is_triggered);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-amber-100 font-bold text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Milestone Alerts
          </h3>
          <p className="text-amber-400/60 text-sm">Set up automated celebrations when you hit goals</p>
        </div>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Milestone
        </Button>
      </div>

      {/* Quick Presets */}
      {!showCreate && pendingMilestones.length === 0 && (
        <div className="bg-stone-900/50 rounded-xl p-6 border border-amber-600/20">
          <p className="text-amber-200 font-medium mb-4">Quick Setup - Popular milestones</p>
          <div className="space-y-4">
            {PRESET_MILESTONES.map(preset => {
              const typeInfo = MILESTONE_TYPES.find(t => t.value === preset.type);
              return (
                <div key={preset.type}>
                  <p className="text-amber-400/60 text-sm mb-2 flex items-center gap-2">
                    {typeInfo?.icon} {typeInfo?.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {preset.values.map(value => (
                      <Button
                        key={value}
                        size="sm"
                        variant="outline"
                        onClick={() => applyPreset(preset.type, value)}
                        className="border-amber-600/30 text-amber-200 hover:bg-amber-600/20"
                      >
                        {preset.prefix}{value.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Milestones */}
      {pendingMilestones.length > 0 && (
        <div>
          <h4 className="text-amber-200 text-sm font-medium mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" /> Upcoming Milestones
          </h4>
          <div className="space-y-3">
            {pendingMilestones.map(milestone => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onEdit={() => setEditingId(milestone.id)}
                onDelete={() => deleteMutation.mutate(milestone.id)}
                onToggle={() => updateMutation.mutate({ id: milestone.id, data: { is_active: !milestone.is_active } })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Triggered Milestones */}
      {triggeredMilestones.length > 0 && (
        <div>
          <h4 className="text-green-400/80 text-sm font-medium mb-3 flex items-center gap-2">
            <PartyPopper className="w-4 h-4" /> Achieved Milestones
          </h4>
          <div className="space-y-2">
            {triggeredMilestones.slice(0, 5).map(milestone => (
              <div key={milestone.id} className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg border border-green-600/20">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏆</span>
                  <div>
                    <p className="text-green-300 font-medium">{milestone.alert_title}</p>
                    <p className="text-green-400/60 text-xs">
                      Achieved {milestone.triggered_at ? new Date(milestone.triggered_at).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                </div>
                <Badge className="bg-green-600/20 text-green-300">Completed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-stone-900 rounded-xl border border-yellow-600/30 overflow-hidden"
          >
            <div className="p-6 space-y-6">
              <h4 className="text-amber-100 font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Create Milestone Alert
              </h4>

              {/* Milestone Type */}
              <div>
                <Label className="text-amber-200">Milestone Type</Label>
                <Select 
                  value={newMilestone.milestone_type} 
                  onValueChange={(v) => setNewMilestone({ ...newMilestone, milestone_type: v })}
                >
                  <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100 mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MILESTONE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          {type.icon} {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Threshold Value */}
              <div>
                <Label className="text-amber-200">
                  Target Value ({MILESTONE_TYPES.find(t => t.value === newMilestone.milestone_type)?.unit || ''})
                </Label>
                <Input
                  type="number"
                  value={newMilestone.threshold_value}
                  onChange={(e) => setNewMilestone({ ...newMilestone, threshold_value: parseInt(e.target.value) })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                />
              </div>

              {/* Alert Title & Message */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-amber-200">Alert Title</Label>
                  <Input
                    value={newMilestone.alert_title}
                    onChange={(e) => setNewMilestone({ ...newMilestone, alert_title: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />
                </div>
                <div>
                  <Label className="text-amber-200">Celebration Type</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {CELEBRATION_TYPES.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setNewMilestone({ ...newMilestone, celebration_type: c.value })}
                        className={`px-3 py-2 rounded-lg transition-all ${
                          newMilestone.celebration_type === c.value
                            ? 'bg-yellow-600 text-white'
                            : 'bg-stone-800 text-amber-200 hover:bg-stone-700'
                        }`}
                      >
                        {c.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-amber-200">Alert Message</Label>
                <Textarea
                  value={newMilestone.alert_message}
                  onChange={(e) => setNewMilestone({ ...newMilestone, alert_message: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                  placeholder="Use {value}, {milestone}, {creator_name}"
                  rows={2}
                />
                <p className="text-amber-400/40 text-xs mt-1">
                  Available: {'{value}'}, {'{milestone}'}, {'{creator_name}'}
                </p>
              </div>

              {/* Auto Message */}
              <div>
                <Label className="text-amber-200">Auto-Post Message (optional)</Label>
                <Textarea
                  value={newMilestone.auto_message_template}
                  onChange={(e) => setNewMilestone({ ...newMilestone, auto_message_template: e.target.value })}
                  className="bg-stone-800 border-amber-600/20 text-amber-100"
                  placeholder="Message to automatically post when milestone is hit"
                  rows={2}
                />
              </div>

              {/* Subscriber Reward */}
              <div className="p-4 bg-stone-800/50 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 font-medium">Reward Subscribers</p>
                    <p className="text-amber-400/60 text-sm">Give subscribers a bonus when this milestone is hit</p>
                  </div>
                  <Switch 
                    checked={newMilestone.reward_subscribers}
                    onCheckedChange={(v) => setNewMilestone({ ...newMilestone, reward_subscribers: v })}
                  />
                </div>
                {newMilestone.reward_subscribers && (
                  <Input
                    value={newMilestone.subscriber_reward}
                    onChange={(e) => setNewMilestone({ ...newMilestone, subscriber_reward: e.target.value })}
                    className="bg-stone-700 border-amber-600/20 text-amber-100"
                    placeholder="e.g. Exclusive emote unlock, Badge, etc."
                  />
                )}
              </div>

              {/* Recurring */}
              <div className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl">
                <div>
                  <p className="text-amber-100 font-medium">Recurring Milestone</p>
                  <p className="text-amber-400/60 text-sm">Can be triggered multiple times (e.g. every 100 followers)</p>
                </div>
                <Switch 
                  checked={newMilestone.is_recurring}
                  onCheckedChange={(v) => setNewMilestone({ ...newMilestone, is_recurring: v })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-amber-600/20">
                <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createMutation.mutate(newMilestone)}
                  disabled={createMutation.isPending || !newMilestone.alert_title}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Create Milestone
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MilestoneCard({ milestone, onEdit, onDelete, onToggle }) {
  const typeInfo = MILESTONE_TYPES.find(t => t.value === milestone.milestone_type);
  const celebrationInfo = CELEBRATION_TYPES.find(c => c.value === milestone.celebration_type);

  return (
    <motion.div 
      layout
      className={`rounded-xl border overflow-hidden transition-all ${
        milestone.is_active 
          ? 'bg-stone-900/60 border-amber-600/20' 
          : 'bg-stone-900/30 border-stone-700/30 opacity-60'
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-yellow-600/20 flex items-center justify-center">
          {typeInfo?.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-100 font-bold">{milestone.alert_title}</span>
            <span className="text-lg">{celebrationInfo?.icon}</span>
          </div>
          <p className="text-amber-400/70 text-sm">
            {typeInfo?.label}: {milestone.threshold_value.toLocaleString()} {typeInfo?.unit}
          </p>
          {milestone.reward_subscribers && (
            <Badge variant="outline" className="mt-1 text-xs border-green-600/30 text-green-300">
              <Gift className="w-3 h-3 mr-1" /> Subscriber Reward
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={milestone.is_active} onCheckedChange={onToggle} />
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