import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Target, 
  Plus, 
  Coins,
  Trophy,
  Sparkles,
  X,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

export default function TippingGoalWidget({ streamId, creatorId, isCreator, wallet }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', goal_amount_denarii: 1000, reward_description: '' });
  const queryClient = useQueryClient();

  const { data: activeGoal } = useQuery({
    queryKey: ['tipping-goal', streamId],
    queryFn: async () => {
      const goals = await base44.entities.TippingGoal.filter({ 
        stream_id: streamId, 
        status: 'active' 
      }, null, 1);
      return goals[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 5000
  });

  const progressPercent = activeGoal 
    ? Math.min((activeGoal.current_amount_denarii / activeGoal.goal_amount_denarii) * 100, 100)
    : 0;

  const isCompleted = progressPercent >= 100;

  const createGoalMutation = useMutation({
    mutationFn: async (data) => {
      const goal = await base44.entities.TippingGoal.create({
        ...data,
        creator_id: creatorId,
        stream_id: streamId,
        current_amount_denarii: 0,
        contributors: []
      });
      return goal;
    },
    onSuccess: () => {
      toast.success('Tipping goal created!');
      setShowCreate(false);
      setNewGoal({ title: '', goal_amount_denarii: 1000, reward_description: '' });
      queryClient.invalidateQueries({ queryKey: ['tipping-goal'] });
    }
  });

  const contributeToGoal = async (amount) => {
    if (!activeGoal || !wallet) return;
    
    await base44.entities.TippingGoal.update(activeGoal.id, {
      current_amount_denarii: (activeGoal.current_amount_denarii || 0) + amount,
      contributors: [
        ...(activeGoal.contributors || []),
        { email: wallet.user_email, amount, timestamp: new Date().toISOString() }
      ]
    });
    
    queryClient.invalidateQueries({ queryKey: ['tipping-goal'] });
  };

  if (!activeGoal && !isCreator) return null;

  return (
    <div className="relative">
      {activeGoal ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <span className="text-white font-semibold">{activeGoal.title}</span>
            </div>
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 bg-emerald-500 px-2.5 py-1 rounded-lg"
              >
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-medium">Complete!</span>
              </motion.div>
            )}
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-white/60">Progress</span>
              <span className="text-amber-300 font-medium">
                {activeGoal.current_amount_denarii?.toLocaleString()} / {activeGoal.goal_amount_denarii?.toLocaleString()} 🪙
              </span>
            </div>
            <div className="relative">
              <Progress value={progressPercent} className="h-4 bg-white/10" />
              {isCompleted && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-emerald-500/50 to-green-500/50 rounded-full"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </div>
          </div>

          {/* Reward */}
          {activeGoal.reward_description && (
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-white/70">{activeGoal.reward_description}</span>
            </div>
          )}

          {/* Top Contributors */}
          {activeGoal.contributors?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-white/50 text-xs mb-2">Top Contributors</p>
              <div className="flex -space-x-2">
                {activeGoal.contributors.slice(-5).reverse().map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xs text-white font-bold ring-2 ring-[#0a0a0c]"
                    title={`${c.email?.split('@')[0]} - ${c.amount} 🪙`}
                  >
                    {c.email?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : isCreator ? (
        <>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Set Tipping Goal</span>
          </motion.button>

          {/* Create Modal */}
          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                onClick={() => setShowCreate(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GlassCard className="w-full max-w-md" glowColor="amber">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white">Create Tipping Goal</h2>
                      <button onClick={() => setShowCreate(false)} className="text-white/50 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Goal Title</label>
                        <Input
                          value={newGoal.title}
                          onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                          placeholder="e.g., Dance challenge at 5000!"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Target Amount (Denarii)</label>
                        <Input
                          type="number"
                          value={newGoal.goal_amount_denarii}
                          onChange={(e) => setNewGoal({ ...newGoal, goal_amount_denarii: parseInt(e.target.value) || 0 })}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Reward/What Happens</label>
                        <Input
                          value={newGoal.reward_description}
                          onChange={(e) => setNewGoal({ ...newGoal, reward_description: e.target.value })}
                          placeholder="e.g., I'll do a backflip!"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <PremiumButton variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">
                        Cancel
                      </PremiumButton>
                      <PremiumButton
                        onClick={() => createGoalMutation.mutate(newGoal)}
                        loading={createGoalMutation.isPending}
                        disabled={!newGoal.title || !newGoal.goal_amount_denarii}
                        className="flex-1"
                        leftIcon={<Target className="w-4 h-4" />}
                      >
                        Create Goal
                      </PremiumButton>
                    </div>
                  </GlassCard>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}