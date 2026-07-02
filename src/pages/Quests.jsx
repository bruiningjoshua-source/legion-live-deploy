import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Gift, 
  CheckCircle, 
  Star,
  Flame,
  Trophy,
  Coins,
  Sparkles,
  Calendar,
  Eye,
  Heart,
  MessageSquare,
  Radio,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const QUEST_ICONS = {
  watch_minutes: Eye,
  send_gifts: Gift,
  follow_creators: Heart,
  send_messages: MessageSquare,
  earn_points: Coins,
  go_live: Radio,
  get_followers: Users,
  complete_quests: Target
};

const QUEST_TYPE_COLORS = {
  daily: { bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', text: 'text-amber-300', icon: Flame },
  weekly: { bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-300', icon: Calendar },
  special: { bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', text: 'text-purple-300', icon: Sparkles },
  milestone: { bg: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/30', text: 'text-emerald-300', icon: Trophy }
};

function QuestCard({ quest, userQuest, onClaim }) {
  const Icon = QUEST_ICONS[quest.requirement_type] || Target;
  const typeStyle = QUEST_TYPE_COLORS[quest.quest_type] || QUEST_TYPE_COLORS.daily;
  const TypeIcon = typeStyle.icon;
  
  const progress = userQuest?.progress || 0;
  const progressPercent = Math.min((progress / quest.requirement_value) * 100, 100);
  const isCompleted = userQuest?.status === 'completed' || userQuest?.status === 'claimed';
  const isClaimed = userQuest?.status === 'claimed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      <GlassCard 
        className={`relative overflow-hidden ${isClaimed ? 'opacity-60' : ''}`}
        glowColor={isCompleted ? 'green' : 'amber'}
      >
        {/* Type Badge */}
        <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${typeStyle.bg} ${typeStyle.border} border`}>
          <TypeIcon className={`w-3.5 h-3.5 ${typeStyle.text}`} />
          <span className={`text-xs font-medium ${typeStyle.text} capitalize`}>{quest.quest_type}</span>
        </div>

        <div className="flex gap-4">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${typeStyle.bg} flex items-center justify-center shrink-0`}>
            {quest.icon ? (
              <span className="text-2xl">{quest.icon}</span>
            ) : (
              <Icon className={`w-7 h-7 ${typeStyle.text}`} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold mb-1 pr-24">{quest.title}</h3>
            <p className="text-white/50 text-sm mb-3 line-clamp-2">{quest.description}</p>
            
            {/* Progress */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/60">Progress</span>
                <span className={isCompleted ? 'text-emerald-400' : 'text-white/80'}>
                  {progress} / {quest.requirement_value}
                </span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-2 bg-white/10"
              />
            </div>

            {/* Rewards & Action */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {quest.reward_denarii > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-500/20 px-2.5 py-1 rounded-lg">
                    <span className="text-sm">🪙</span>
                    <span className="text-amber-300 text-sm font-medium">+{quest.reward_denarii}</span>
                  </div>
                )}
                {quest.reward_xp > 0 && (
                  <div className="flex items-center gap-1.5 bg-purple-500/20 px-2.5 py-1 rounded-lg">
                    <Star className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-purple-300 text-sm font-medium">+{quest.reward_xp} XP</span>
                  </div>
                )}
              </div>

              {isCompleted && !isClaimed && (
                <PremiumButton
                  size="sm"
                  variant="premium"
                  onClick={() => onClaim(quest, userQuest)}
                  leftIcon={<Gift className="w-4 h-4" />}
                >
                  Claim
                </PremiumButton>
              )}
              {isClaimed && (
                <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Claimed
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function Quests() {
  const [activeTab, setActiveTab] = useState('daily');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ['quests'],
    queryFn: () => base44.entities.Quest.filter({ is_active: true }, 'sort_order', 100)
  });

  const { data: userQuests = [] } = useQuery({
    queryKey: ['user-quests', user?.email],
    queryFn: () => base44.entities.UserQuest.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const { data: wallet } = useQuery({
    queryKey: ['user-wallet', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      return wallets[0] || null;
    },
    enabled: !!user?.email
  });

  const userQuestMap = useMemo(() => 
    userQuests.reduce((acc, uq) => { acc[uq.quest_id] = uq; return acc; }, {}),
    [userQuests]
  );

  const claimMutation = useMutation({
    mutationFn: async ({ quest, userQuest }) => {
      // Server-authoritative: validates completion + computes reward server-side.
      // Client can no longer set its own balance.
      const { data, error } = await base44.rpc('claim_quest_reward', { p_user_quest_id: userQuest.id });
      if (error) throw new Error(error.message || 'Claim failed');
      return { quest, userQuest, result: data };
    },
    onSuccess: ({ quest }) => {
      toast.success(`🎉 Claimed ${quest.reward_denarii} Denarii!`);
      queryClient.invalidateQueries({ queryKey: ['user-quests'] });
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
    }
  });

  const filteredQuests = useMemo(() => 
    quests.filter(q => q.quest_type === activeTab),
    [quests, activeTab]
  );

  const stats = useMemo(() => {
    const completed = userQuests.filter(uq => uq.status === 'completed' || uq.status === 'claimed').length;
    const claimed = userQuests.filter(uq => uq.status === 'claimed').length;
    const totalRewards = quests
      .filter(q => userQuestMap[q.id]?.status === 'claimed')
      .reduce((sum, q) => sum + (q.reward_denarii || 0), 0);
    return { completed, claimed, totalRewards };
  }, [userQuests, quests, userQuestMap]);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="inline-block mb-4"
          >
            <Target className="w-16 h-16 text-amber-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 mb-2">
            Daily Quests
          </h1>
          <p className="text-white/50">Complete challenges to earn Denarii & XP</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <GlassCard className="text-center !p-4" glowColor="amber">
            <div className="text-3xl font-bold text-amber-300">{stats.completed}</div>
            <div className="text-white/50 text-sm">Completed</div>
          </GlassCard>
          <GlassCard className="text-center !p-4" glowColor="green">
            <div className="text-3xl font-bold text-emerald-300">{stats.claimed}</div>
            <div className="text-white/50 text-sm">Claimed</div>
          </GlassCard>
          <GlassCard className="text-center !p-4" glowColor="purple">
            <div className="text-3xl font-bold text-purple-300 flex items-center justify-center gap-1">
              <span className="text-xl">🪙</span>
              {formatCount(stats.totalRewards)}
            </div>
            <div className="text-white/50 text-sm">Earned</div>
          </GlassCard>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl mb-6 w-full">
            <TabsList className="bg-transparent p-0 gap-1 w-full grid grid-cols-4">
              {['daily', 'weekly', 'special', 'milestone'].map(type => {
                const style = QUEST_TYPE_COLORS[type];
                const TypeIcon = style.icon;
                const count = quests.filter(q => q.quest_type === type).length;
                return (
                  <TabsTrigger 
                    key={type}
                    value={type} 
                    className={`data-[state=active]:bg-gradient-to-r data-[state=active]:${style.bg} data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-4 py-2.5 text-white/60 hover:text-white transition-all capitalize`}
                  >
                    <TypeIcon className="w-4 h-4 mr-2" />
                    {type} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {['daily', 'weekly', 'special', 'milestone'].map(type => (
            <TabsContent key={type} value={type} className="mt-0 space-y-4">
              {filteredQuests.length > 0 ? (
                filteredQuests.map((quest, i) => (
                  <motion.div
                    key={quest.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
                  >
                    <QuestCard
                      quest={quest}
                      userQuest={userQuestMap[quest.id]}
                      onClaim={(q, uq) => claimMutation.mutate({ quest: q, userQuest: uq })}
                    />
                  </motion.div>
                ))
              ) : (
                <GlassCard className="text-center py-12">
                  <Target className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No {type} quests available</h3>
                  <p className="text-white/50">Check back soon for new challenges!</p>
                </GlassCard>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}