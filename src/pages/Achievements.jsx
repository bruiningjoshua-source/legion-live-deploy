import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Star, Lock, Eye, Users, Video, Zap, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';

export default function AchievementsPage() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: achievements = [] } = useQuery({
    queryKey: ['all-achievements'],
    queryFn: () => base44.entities.Achievement.filter({ is_active: true }, 'category', 100)
  });

  const { data: userAchievements = [] } = useQuery({
    queryKey: ['user-achievements', user?.email],
    queryFn: () => base44.entities.UserAchievement.filter({ user_email: user.email }),
    enabled: !!user?.email
  });

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
          {[
            { icon: Trophy, value: unlockedCount, label: 'Unlocked', color: 'amber' },
            { icon: Star, value: totalPoints, label: 'Points', color: 'purple' },
            { icon: Zap, value: `${achievements.length > 0 ? Math.round((unlockedCount / achievements.length) * 100) : 0}%`, label: 'Complete', color: 'green' }
          ].map((stat, i) => (
            <GlassCard key={stat.label} delay={i * 0.1} glowColor={stat.color} className="text-center">
              <stat.icon className={`w-8 h-8 mx-auto mb-2 text-${stat.color}-400`} />
              <p className="text-3xl font-black text-white">{stat.value}</p>
              <p className="text-white/50 text-sm">{stat.label}</p>
            </GlassCard>
          ))}
        </div>

        {/* Achievement Categories */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-stone-800/50 mb-6 flex-wrap h-auto">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            {categories.map(cat => {
              const Icon = categoryIcons[cat];
              return (
                <TabsTrigger key={cat} value={cat} className="flex-1 capitalize gap-1">
                  <Icon className="w-3 h-3" />
                  {cat}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {['all', ...categories].map(category => (
            <TabsContent key={category} value={category}>
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`relative overflow-hidden transition-all ${
                          isUnlocked 
                            ? `bg-stone-800/80 ${rarityBorders[achievement.rarity]}` 
                            : 'bg-stone-900/50 border-stone-700/30 opacity-70'
                        }`}>
                          {/* Rarity gradient bar */}
                          <div className={`h-1 bg-gradient-to-r ${rarityColors[achievement.rarity]}`} />
                          
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-3 rounded-xl ${
                                isUnlocked 
                                  ? `bg-gradient-to-br ${rarityColors[achievement.rarity]}`
                                  : 'bg-stone-800'
                              }`}>
                                {isUnlocked ? (
                                  <span className="text-2xl">{achievement.icon || '🏆'}</span>
                                ) : (
                                  <Lock className="w-6 h-6 text-stone-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className={`font-semibold ${isUnlocked ? 'text-amber-100' : 'text-stone-500'}`}>
                                  {achievement.name}
                                </h3>
                                <p className={`text-sm mt-1 ${isUnlocked ? 'text-amber-400/70' : 'text-stone-600'}`}>
                                  {achievement.description}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                              <Badge className={`capitalize ${
                                isUnlocked 
                                  ? `bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white`
                                  : 'bg-stone-800 text-stone-500'
                              }`}>
                                {achievement.rarity}
                              </Badge>
                              {achievement.points_reward > 0 && (
                                <span className={`text-sm flex items-center gap-1 ${
                                  isUnlocked ? 'text-amber-400' : 'text-stone-600'
                                }`}>
                                  <Star className="w-3 h-3" />
                                  {achievement.points_reward} pts
                                </span>
                              )}
                            </div>

                            {/* Progress bar for in-progress achievements */}
                            {!isUnlocked && achievement.requirement_value && (
                              <div className="mt-3">
                                <div className="flex justify-between text-xs text-stone-500 mb-1">
                                  <span>Progress</span>
                                  <span>{progress} / {achievement.requirement_value}</span>
                                </div>
                                <Progress 
                                  value={(progress / achievement.requirement_value) * 100} 
                                  className="h-1.5 bg-stone-800"
                                />
                              </div>
                            )}

                            {/* Unlock date */}
                            {isUnlocked && userAchievement?.unlocked_at && (
                              <p className="text-amber-400/50 text-xs mt-3">
                                Unlocked {format(new Date(userAchievement.unlocked_at), 'MMM d, yyyy')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}