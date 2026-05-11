import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coins, Gift, Flame, Star, Zap, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChannelPointsPanel({ creatorId, user, streamId }) {
  const queryClient = useQueryClient();
  const [redeemInput, setRedeemInput] = useState('');
  const [selectedReward, setSelectedReward] = useState(null);

  const { data: userPoints } = useQuery({
    queryKey: ['channel-points', user?.email, creatorId],
    queryFn: async () => {
      const points = await base44.entities.ChannelPoints.filter({
        user_email: user.email,
        creator_id: creatorId
      }, null, 1);
      return points[0] || { points_balance: 0, lifetime_earned: 0, watch_streak_days: 0 };
    },
    enabled: !!user?.email && !!creatorId
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ['channel-rewards', creatorId],
    queryFn: () => base44.entities.ChannelPointReward.filter({ creator_id: creatorId, is_enabled: true }),
    enabled: !!creatorId
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ reward, input }) => {
      if (userPoints.points_balance < reward.cost) {
        throw new Error('Not enough points');
      }

      // Deduct points
      await base44.entities.ChannelPoints.update(userPoints.id, {
        points_balance: userPoints.points_balance - reward.cost
      });

      // Update redemption count
      await base44.entities.ChannelPointReward.update(reward.id, {
        redemption_count: (reward.redemption_count || 0) + 1
      });

      // Create notification for creator
      await base44.entities.Notification.create({
        user_email: creatorId,
        type: 'gift',
        title: 'Channel Point Redemption',
        message: `${user.full_name} redeemed "${reward.title}"${input ? `: ${input}` : ''}`,
        from_user_email: user.email,
        from_user_name: user.full_name
      });

      return reward;
    },
    onSuccess: (reward) => {
      queryClient.invalidateQueries({ queryKey: ['channel-points'] });
      toast.success(`Redeemed "${reward.title}"!`);
      setSelectedReward(null);
      setRedeemInput('');
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const rewardIcons = {
    highlight_message: MessageSquare,
    custom_emote: Star,
    vip_badge: Zap,
    shoutout: Gift,
    custom: Flame
  };

  return (
    <Card className="bg-stone-900/80 border-amber-600/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            Channel Points
          </div>
          <Badge className="bg-amber-600/30 text-amber-300">
            {userPoints?.points_balance?.toLocaleString() || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-stone-800/50 rounded-lg p-2 text-center">
            <p className="text-amber-400/70">Lifetime</p>
            <p className="text-amber-100 font-bold">{userPoints?.lifetime_earned?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-stone-800/50 rounded-lg p-2 text-center">
            <p className="text-amber-400/70">Streak</p>
            <p className="text-amber-100 font-bold flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" />
              {userPoints?.watch_streak_days || 0} days
            </p>
          </div>
        </div>

        {/* Rewards */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {rewards.map(reward => {
              const Icon = rewardIcons[reward.reward_type] || Flame;
              const canAfford = (userPoints?.points_balance || 0) >= reward.cost;

              return (
                <motion.div
                  key={reward.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    canAfford 
                      ? 'bg-stone-800/50 border-amber-600/30 hover:border-amber-500/50' 
                      : 'bg-stone-800/30 border-stone-700/30 opacity-60'
                  }`}
                  style={{ backgroundColor: reward.background_color ? `${reward.background_color}20` : undefined }}
                  onClick={() => canAfford && setSelectedReward(reward)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-600/20">
                        <Icon className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-amber-100 font-medium text-sm">{reward.title}</p>
                        {reward.description && (
                          <p className="text-amber-400/60 text-xs">{reward.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge className={canAfford ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-400'}>
                      {reward.cost.toLocaleString()}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}

            {rewards.length === 0 && (
              <div className="text-center py-8 text-amber-400/50">
                <Coins className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No rewards available</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Redeem Modal */}
        <AnimatePresence>
          {selectedReward && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setSelectedReward(null)}
            >
              <Card 
                className="bg-stone-900 border-amber-600/30 w-full max-w-md"
                onClick={e => e.stopPropagation()}
              >
                <CardHeader>
                  <CardTitle className="text-amber-100">Redeem {selectedReward.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-amber-400/80">{selectedReward.description}</p>
                  <p className="text-amber-100">Cost: <span className="text-amber-400 font-bold">{selectedReward.cost}</span> points</p>
                  
                  {selectedReward.requires_input && (
                    <Input
                      placeholder="Enter your message..."
                      value={redeemInput}
                      onChange={e => setRedeemInput(e.target.value)}
                      className="bg-stone-800 border-amber-600/30 text-amber-100"
                    />
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedReward(null)}
                      className="flex-1 border-stone-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => redeemMutation.mutate({ reward: selectedReward, input: redeemInput })}
                      disabled={redeemMutation.isPending || (selectedReward.requires_input && !redeemInput)}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      {redeemMutation.isPending ? 'Redeeming...' : 'Redeem'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}