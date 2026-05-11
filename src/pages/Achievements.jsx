import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, Lock, Eye, Users, Video, Sparkles, Award, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';

export default function AchievementsPage() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: achievements = [], isLoading: achievementsLoading } = useQuery({
    queryKey: ['all-achievements'],
    queryFn: () => base44.entities.Achievement.filter({ is_active: true }, 'category', 100)
  });

  const { data: userAchievements = [], isLoading: userAchievementsLoading } = useQuery({
    queryKey: ['user-achievements', user?.email],
    queryFn: () => base44.entities.UserAchievement.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

  const isLoading = achievementsLoading || userAchievementsLoading;

  const unlockedIds = userAchievements.map(ua => ua.achievement_id);
  
  const categories = ['viewer', 'creator', 'social', 'milestone', 'special'];
  
  const rarityColors = {
    common: 'from-gray-500 to-gray-600',
    uncommon: 'from-green-500 to-green-600',
    rare: 'from-blue-500 to-blue-600',
    epic: 'from-purple-500 to-purple-600',
    legendary: 'from-amber-500 to-amber-600'
  };

  const rarityBorders = {
    common: 'border-gray-500/30',
    uncommon: 'border-green-500/30',
    rare: 'border-blue-500/30',
    epic: 'border-purple-500/30',
    legendary: 'border-amber-500/30 animate-pulse'
  };

  const categoryIcons = {
    viewer: Eye,
    creator: Video,
    social: Users,
    milestone: Trophy,
    special: Star
  };

  const unlockedCount = userAchievements.filter(ua => ua.unlocked_at).length;
  const totalPoints = userAchievements.reduce((sum, ua) => {
    const achievement = achievements.find(a => a.id === ua.achievement_id);
    return sum + (achievement?.points_reward || 0);
  }, 0);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 mb-6 shadow-2xl shadow-amber-500/30"
          >
            <Trophy className="w-12 h-12 text-white drop-shadow-lg" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-3">
            Achievements
          </h1>
          <p className="text-white/60">Unlock achievements by engaging with the platform</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <GlassCard delay={0} glowColor="amber" className="text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p className="text-3xl font-black text-white">{unlockedCount}</p>
            <p className="text-white/50 text-sm">Unlocked</p>
          </GlassCard>
          <GlassCard delay={0.1} glowColor="purple" className="text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <p className="text-3xl font-black text-white">{totalPoints > 999 ? (totalPoints / 1000).toFixed(1) + 'K' : totalPoints}</p>
            <p className="text-white/50 text-sm">Points</p>
          </GlassCard>
          <GlassCard delay={0.2} glowColor="green" className="text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-3xl font-black text-white">
              {achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0}%
            </p>
            <p className="text-white/50 text-sm">Complete</p>
          </GlassCard>
        </div>

        {/* Recently Unlocked Section */}
        {userAchievements.filter(ua => ua.unlocked_at).length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Recently Unlocked
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {userAchievements
                .filter(ua => ua.unlocked_at)
                .sort((a, b) => new Date(b.unlocked_at) - new Date(a.unlocked_at))
                .slice(0, 5)
                .map(ua => {
                  const achievement = achievements.find(a => a.id === ua.achievement_id);
                  if (!achievement) return null;
                  return (
                    <motion.div
                      key={ua.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br ${rarityColors[achievement.rarity]} min-w-[140px] text-center`}
                    >
                      <span className="text-3xl block mb-2">{achievement.icon || '🏆'}</span>
                      <p className="text-white font-bold text-sm truncate">{achievement.name}</p>
                      <p className="text-white/70 text-xs mt-1">
                        {format(new Date(ua.unlocked_at), 'MMM d')}
                      </p>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Achievement Categories */}
        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl overflow-x-auto">
              <TabsList className="bg-transparent p-0 gap-1 flex-nowrap">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/60 whitespace-nowrap"
                >
                  All
                </TabsTrigger>
                {categories.map(cat => {
                  const Icon = categoryIcons[cat];
                  return (
                    <TabsTrigger 
                      key={cat} 
                      value={cat} 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/60 capitalize gap-1.5 whitespace-nowrap"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          {['all', ...categories].map(category => (
            <TabsContent key={category} value={category}>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements
                  .filter(a => category === 'all' || a.category === category)
                  .map((achievement, index) => {
                    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
                    const isUnlocked = !!userAchievement?.unlocked_at;
                    const progress = userAchievement?.progress || 0;

                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.25 }}
                      >
                        <GlassCard 
                          padding="p-0" 
                          animate={false}
                          hover={isUnlocked}
                          className={`relative overflow-hidden ${
                            isUnlocked ? '' : 'opacity-60 grayscale-[30%]'
                          }`}
                        >
                          {/* Rarity gradient bar */}
                          <div className={`h-1.5 bg-gradient-to-r ${rarityColors[achievement.rarity]}`} />
                          
                          <div className="p-5">
                            <div className="flex items-start gap-4">
                              <motion.div 
                                whileHover={isUnlocked ? { scale: 1.1, rotate: 5 } : {}}
                                className={`relative p-4 rounded-2xl ${
                                  isUnlocked 
                                    ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} shadow-lg`
                                    : 'bg-white/5'
                                }`}
                              >
                                {isUnlocked ? (
                                  <span className="text-3xl drop-shadow-lg">{achievement.icon || '🏆'}</span>
                                ) : (
                                  <Lock className="w-7 h-7 text-white/30" />
                                )}
                                
                                {/* Sparkle effect for unlocked */}
                                {isUnlocked && (
                                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-white animate-pulse" />
                                )}
                              </motion.div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold text-lg ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                                  {achievement.name}
                                </h3>
                                <p className={`text-sm mt-1 line-clamp-2 ${isUnlocked ? 'text-white/60' : 'text-white/30'}`}>
                                  {achievement.description}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                              <Badge className={`capitalize text-xs font-bold ${
                                isUnlocked 
                                  ? `bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white border-0`
                                  : 'bg-white/5 text-white/40 border-white/10'
                              }`}>
                                {achievement.rarity}
                              </Badge>
                              {achievement.points_reward > 0 && (
                                <span className={`text-sm flex items-center gap-1.5 font-medium ${
                                  isUnlocked ? 'text-amber-400' : 'text-white/30'
                                }`}>
                                  <Star className="w-4 h-4" />
                                  {achievement.points_reward} pts
                                </span>
                              )}
                            </div>

                            {/* Progress bar for in-progress achievements */}
                            {!isUnlocked && achievement.requirement_value && (
                              <div className="mt-4">
                                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                                  <span>Progress</span>
                                  <span className="font-medium">{progress} / {achievement.requirement_value}</span>
                                </div>
                                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(progress / achievement.requirement_value) * 100}%` }}
                                    transition={{ duration: 0.5, delay: index * 0.05 }}
                                    className={`h-full bg-gradient-to-r ${rarityColors[achievement.rarity]} rounded-full`}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Unlock date */}
                            {isUnlocked && userAchievement?.unlocked_at && (
                              <p className="text-white/30 text-xs mt-4 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Unlocked {format(new Date(userAchievement.unlocked_at), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                {achievements.filter(a => category === 'all' || a.category === category).length === 0 && (
                  <GlassCard className="text-center py-16 col-span-full">
                    <Trophy className="w-16 h-16 text-amber-500/20 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">No Achievements Yet</h3>
                    <p className="text-white/50">Start engaging with the platform to unlock achievements!</p>
                  </GlassCard>
                )}
              </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}