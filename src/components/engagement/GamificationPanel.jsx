import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Flame, 
  Gift,
  Clock,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const achievements = [
  { id: 'first_stream', name: 'First Watch', icon: '👁️', xp: 50, description: 'Watch your first stream' },
  { id: 'gift_sender', name: 'Generous Soul', icon: '🎁', xp: 100, description: 'Send your first gift' },
  { id: 'social_butterfly', name: 'Social Butterfly', icon: '💬', xp: 75, description: 'Send 50 chat messages' },
  { id: 'marathon_viewer', name: 'Marathon Viewer', icon: '⏱️', xp: 200, description: 'Watch 10 hours total' },
  { id: 'loyal_fan', name: 'Loyal Fan', icon: '🔥', xp: 150, description: 'Maintain a 7-day streak' },
  { id: 'whale', name: 'Whale', icon: '🐋', xp: 500, description: 'Send 1000 denarii in gifts' },
  { id: 'super_fan', name: 'Super Fan', icon: '⭐', xp: 300, description: 'Follow 10 creators' }
];

export default function GamificationPanel({ user }) {
  const queryClient = useQueryClient();

  const { data: engagement } = useQuery({
    queryKey: ['user-engagement', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const results = await base44.entities.UserEngagement.filter({ user_email: user.email }, null, 1);
      if (results[0]) return results[0];
      return base44.entities.UserEngagement.create({
        user_email: user.email,
        daily_streak: 0,
        experience_points: 0,
        level: 1,
        next_level_xp: 100
      });
    },
    enabled: !!user?.email,
    staleTime: 60 * 1000
  });

  const { data: dailyReward } = useQuery({
    queryKey: ['daily-reward', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const today = new Date().toISOString().split('T')[0];
      const rewards = await base44.entities.DailyReward.filter({ 
        user_email: user.email,
        claimed: false
      }, '-created_date', 1);
      return rewards[0];
    },
    enabled: !!user?.email,
    staleTime: 30 * 1000
  });

  const claimDailyReward = useMutation({
    mutationFn: async () => {
      if (!dailyReward) return;
      
      // Update wallet
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      if (wallets[0]) {
        await base44.entities.Wallet.update(wallets[0].id, {
          denarii_balance: (wallets[0].denarii_balance || 0) + dailyReward.reward_denarii
        });
      }

      // Mark claimed
      await base44.entities.DailyReward.update(dailyReward.id, {
        claimed: true,
        claim_date: new Date().toISOString()
      });

      // Update streak
      await base44.entities.UserEngagement.update(engagement.id, {
        daily_streak: (engagement.daily_streak || 0) + 1,
        last_activity_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['daily-reward']);
      queryClient.invalidateQueries(['user-engagement']);
      queryClient.invalidateQueries(['user-wallet']);
      toast.success(`Claimed ${dailyReward.reward_denarii} Denarii! 🪙`);
    }
  });

  if (!engagement) return null;

  const levelProgress = (engagement.experience_points / engagement.next_level_xp) * 100;
  const unlockedAchievements = achievements.filter(a => 
    engagement.achievements_unlocked?.includes(a.id)
  );

  return (
    <div className="space-y-4">
      {/* Daily Streak & Level */}
      <Card className="bg-gradient-to-br from-amber-900/30 to-stone-900/30 border-amber-600/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-amber-100 font-bold text-2xl">{engagement.daily_streak || 0}</p>
                <p className="text-amber-400/70 text-xs">Day Streak</p>
              </div>
            </div>
            <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
              Lv. {engagement.level}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-amber-400/70">
              <span>XP Progress</span>
              <span>{engagement.experience_points} / {engagement.next_level_xp}</span>
            </div>
            <Progress value={levelProgress} className="h-2 bg-stone-800" />
          </div>
        </CardContent>
      </Card>

      {/* Daily Reward */}
      {dailyReward && (
        <Card className="bg-gradient-to-br from-green-900/30 to-stone-900/30 border-green-600/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-amber-100 font-semibold">Daily Reward</p>
                  <p className="text-green-400 text-sm">+{dailyReward.reward_denarii} 🪙</p>
                </div>
              </div>
              <Button 
                onClick={() => claimDailyReward.mutate()}
                disabled={claimDailyReward.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Claim
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardHeader>
          <CardTitle className="text-amber-100 text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Achievements ({unlockedAchievements.length}/{achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((achievement, i) => {
              const unlocked = engagement.achievements_unlocked?.includes(achievement.id);
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-2 rounded-lg border text-center ${
                    unlocked 
                      ? 'bg-amber-900/30 border-amber-500/30' 
                      : 'bg-stone-900/30 border-stone-700/30 opacity-50'
                  }`}
                  title={achievement.description}
                >
                  <div className="text-2xl mb-1">{achievement.icon}</div>
                  <p className="text-amber-100 text-xs font-semibold truncate">{achievement.name}</p>
                  <p className="text-amber-400/70 text-[10px]">+{achievement.xp} XP</p>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card className="bg-stone-800/30 border-amber-600/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-amber-100 font-bold text-sm">{Math.floor((engagement.total_watch_time_minutes || 0) / 60)}h</p>
              <p className="text-amber-400/60 text-xs">Watched</p>
            </div>
            <div>
              <Gift className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-amber-100 font-bold text-sm">{engagement.total_gifts_sent || 0}</p>
              <p className="text-amber-400/60 text-xs">Gifts Sent</p>
            </div>
            <div>
              <MessageCircle className="w-4 h-4 text-purple-400 mx-auto mb-1" />
              <p className="text-amber-100 font-bold text-sm">{engagement.total_comments || 0}</p>
              <p className="text-amber-400/60 text-xs">Messages</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}