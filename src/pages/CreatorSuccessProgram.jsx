import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  Users,
  DollarSign,
  TrendingUp,
  Gift,
  Video,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Crown,
  Zap,
  Share2,
  MessageCircle,
  Star,
  Trophy,
  Rocket
} from 'lucide-react';
import { motion } from 'framer-motion';

const tiers = [
  {
    name: 'Starter',
    icon: Circle,
    color: 'from-slate-500 to-slate-600',
    followers: '0-99',
    monthlyEarnings: '$0-100',
    split: '50%',
    requirements: ['Complete profile', 'First stream', 'Monetization enabled'],
    perks: ['Basic analytics', 'Standard gifts', 'Chat features']
  },
  {
    name: 'Bronze',
    icon: Star,
    color: 'from-amber-700 to-amber-800',
    followers: '100-499',
    monthlyEarnings: '$100-400',
    split: '55%',
    requirements: ['100+ followers', '10+ hours streamed', '20+ average viewers'],
    perks: ['Priority support', 'Custom emotes (3)', 'Bronze badge']
  },
  {
    name: 'Silver',
    icon: Zap,
    color: 'from-slate-400 to-slate-500',
    followers: '500-1,999',
    monthlyEarnings: '$400-1,200',
    split: '60%',
    requirements: ['500+ followers', '40+ hours streamed', '50+ average viewers'],
    perks: ['Featured placement', 'Custom emotes (10)', 'Silver badge', 'Raid priority']
  },
  {
    name: 'Gold',
    icon: Crown,
    color: 'from-yellow-500 to-amber-600',
    followers: '2,000-9,999',
    monthlyEarnings: '$1,200-4,000',
    split: '65%',
    requirements: ['2,000+ followers', '100+ hours streamed', '100+ average viewers'],
    perks: ['Homepage feature', 'Custom emotes (25)', 'Gold badge', 'Dedicated manager']
  },
  {
    name: 'Platinum',
    icon: Trophy,
    color: 'from-purple-500 to-pink-600',
    followers: '10,000+',
    monthlyEarnings: '$4,000+',
    split: '70%',
    requirements: ['10,000+ followers', '500+ hours streamed', '500+ average viewers'],
    perks: ['Top creator status', 'Unlimited emotes', 'Platinum badge', 'Revenue bonuses', 'Brand deals access']
  }
];

const growthStrategies = [
  {
    title: 'Consistent Streaming Schedule',
    icon: Calendar,
    impact: 'High',
    description: 'Stream at the same times weekly so followers know when to tune in.',
    tips: [
      'Pick 3-5 days per week minimum',
      'Stream for 2-4 hours each session',
      'Announce schedule on social media',
      'Use stream reminders feature'
    ],
    expectedGrowth: '+15-25% followers/month'
  },
  {
    title: 'Cross-Platform Promotion',
    icon: Share2,
    impact: 'High',
    description: 'Leverage TikTok, YouTube Shorts, and Instagram Reels to drive traffic.',
    tips: [
      'Clip best moments from streams',
      'Post 2-3 clips daily on other platforms',
      'Include call-to-action to follow on Legion',
      'Use trending sounds and hashtags'
    ],
    expectedGrowth: '+30-50% new viewers/month'
  },
  {
    title: 'Community Engagement',
    icon: MessageCircle,
    impact: 'Medium',
    description: 'Build relationships with viewers to increase retention and gifting.',
    tips: [
      'Remember regular viewers by name',
      'Respond to chat messages actively',
      'Create viewer shoutouts',
      'Host community game nights'
    ],
    expectedGrowth: '+20% gift revenue'
  },
  {
    title: 'Collaboration & Raids',
    icon: Users,
    impact: 'Medium',
    description: 'Partner with other creators to cross-pollinate audiences.',
    tips: [
      'Raid other creators after your streams',
      'Host multi-panel streams weekly',
      'Join PK battles for exposure',
      'Create collab content'
    ],
    expectedGrowth: '+10-20% new followers per collab'
  },
  {
    title: 'Gift Incentives',
    icon: Gift,
    impact: 'High',
    description: 'Create compelling reasons for viewers to send gifts.',
    tips: [
      'Set gift goals with rewards',
      'Do special content when goals are hit',
      'Thank gifters personally on stream',
      'Create gift leaderboards'
    ],
    expectedGrowth: '+40-60% gift revenue'
  },
  {
    title: 'Content Quality',
    icon: Video,
    impact: 'High',
    description: 'Invest in production quality to stand out.',
    tips: [
      'Good lighting (ring light minimum)',
      'Clear audio (USB mic recommended)',
      'Stable internet (wired if possible)',
      'Engaging overlays and alerts'
    ],
    expectedGrowth: '+25% viewer retention'
  }
];

// Based on industry research: loyal supporters spend $25-35/month on average across platforms
// Casual: $5-15, Regular/Loyal: $20-40, Super fans: $50-100+, Whales: $200-1000+
const earningsCalculator = [
  { supporters: 10, avgSpend: 30, monthly: 150, yearly: 1800 },
  { supporters: 20, avgSpend: 30, monthly: 300, yearly: 3600 },
  { supporters: 30, avgSpend: 30, monthly: 450, yearly: 5400 },
  { supporters: 50, avgSpend: 30, monthly: 750, yearly: 9000 },
  { supporters: 75, avgSpend: 30, monthly: 1125, yearly: 13500 },
  { supporters: 100, avgSpend: 30, monthly: 1500, yearly: 18000 }
];

const milestones = [
  { followers: 50, reward: 'Starter Badge', bonus: null },
  { followers: 100, reward: 'Bronze Tier', bonus: '+5% revenue share' },
  { followers: 250, reward: '3 Custom Emotes', bonus: null },
  { followers: 500, reward: 'Silver Tier', bonus: '+5% revenue share' },
  { followers: 1000, reward: 'Featured Creator', bonus: 'Homepage spotlight' },
  { followers: 2000, reward: 'Gold Tier', bonus: '+5% revenue share' },
  { followers: 5000, reward: 'Partner Manager', bonus: 'Dedicated support' },
  { followers: 10000, reward: 'Platinum Tier', bonus: '+5% revenue share' }
];

export default function CreatorSuccessProgram() {
  const [selectedTier, setSelectedTier] = useState(1);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const getCurrentTierIndex = () => {
    if (!creator) return 0;
    const followers = creator.follower_count || 0;
    if (followers >= 10000) return 4;
    if (followers >= 2000) return 3;
    if (followers >= 500) return 2;
    if (followers >= 100) return 1;
    return 0;
  };

  const currentTierIndex = getCurrentTierIndex();
  const nextMilestone = milestones.find(m => m.followers > (creator?.follower_count || 0));
  const progressToNext = nextMilestone 
    ? Math.min(100, ((creator?.follower_count || 0) / nextMilestone.followers) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 rounded-full px-4 py-2 mb-4"
          >
            <Rocket className="w-4 h-4 text-amber-400" />
            <span className="text-amber-200 text-sm font-medium">Creator Success Program</span>
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-3">
            Your Path to Full-Time Creator
          </h1>
          <p className="text-amber-400/70 max-w-2xl mx-auto">
            Follow our proven roadmap to grow your audience, maximize earnings, and build a sustainable streaming career.
          </p>
        </div>

        {/* Your Progress Card */}
        {creator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <Card className="bg-gradient-to-r from-amber-900/30 to-stone-900 border-amber-500/30">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-amber-400/70 text-sm mb-1">Your Current Level</p>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tiers[currentTierIndex].color} flex items-center justify-center`}>
                        {React.createElement(tiers[currentTierIndex].icon, { className: "w-6 h-6 text-white" })}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-amber-100">{tiers[currentTierIndex].name} Creator</h3>
                        <p className="text-amber-400/60 text-sm">{creator.follower_count || 0} followers • {tiers[currentTierIndex].split} revenue share</p>
                      </div>
                    </div>
                  </div>
                  
                  {nextMilestone && (
                    <div className="flex-1 max-w-md">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-amber-400/70">Next milestone: {nextMilestone.followers} followers</span>
                        <span className="text-amber-200">{creator.follower_count || 0}/{nextMilestone.followers}</span>
                      </div>
                      <Progress value={progressToNext} className="h-2 bg-stone-800" />
                      <p className="text-amber-400/50 text-xs mt-1">
                        Reward: {nextMilestone.reward} {nextMilestone.bonus && `+ ${nextMilestone.bonus}`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs defaultValue="tiers" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 w-full md:w-auto">
            <TabsTrigger value="tiers" className="data-[state=active]:bg-amber-600">
              <Crown className="w-4 h-4 mr-2" />
              Tier Levels
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-amber-600">
              <DollarSign className="w-4 h-4 mr-2" />
              Earnings Calculator
            </TabsTrigger>
            <TabsTrigger value="growth" className="data-[state=active]:bg-amber-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Growth Strategies
            </TabsTrigger>
            <TabsTrigger value="milestones" className="data-[state=active]:bg-amber-600">
              <Target className="w-4 h-4 mr-2" />
              Milestones
            </TabsTrigger>
          </TabsList>

          {/* Tier Levels Tab */}
          <TabsContent value="tiers">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {tiers.map((tier, index) => {
                const Icon = tier.icon;
                const isCurrentTier = index === currentTierIndex;
                return (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className={`h-full transition-all ${
                      isCurrentTier 
                        ? 'bg-gradient-to-b from-amber-900/40 to-stone-900 border-amber-500/50 ring-2 ring-amber-500/30' 
                        : 'bg-stone-800/30 border-amber-600/20 hover:border-amber-500/40'
                    }`}>
                      <CardHeader className="pb-2">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-3`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <CardTitle className="text-amber-100 flex items-center gap-2">
                          {tier.name}
                          {isCurrentTier && (
                            <Badge className="bg-amber-600 text-xs">You</Badge>
                          )}
                        </CardTitle>
                        <p className="text-amber-400/60 text-sm">{tier.followers} followers</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-amber-400/70 text-xs mb-1">Monthly Earnings</p>
                          <p className="text-2xl font-bold text-amber-100">{tier.monthlyEarnings}</p>
                          <p className="text-amber-500 text-sm font-medium">{tier.split} revenue share</p>
                        </div>
                        
                        <div>
                          <p className="text-amber-400/70 text-xs mb-2">Requirements</p>
                          <ul className="space-y-1">
                            {tier.requirements.map((req, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-amber-200/80">
                                <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-amber-400/70 text-xs mb-2">Perks</p>
                          <ul className="space-y-1">
                            {tier.perks.map((perk, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-amber-200/80">
                                <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                {perk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Earnings Calculator Tab */}
          <TabsContent value="earnings">
            {/* Industry Context Card */}
            <Card className="bg-gradient-to-r from-blue-900/30 to-stone-900 border-blue-500/30 mb-6">
              <CardContent className="p-5">
                <h4 className="text-blue-200 font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Industry Data: What Loyal Supporters Spend
                </h4>
                <p className="text-blue-100/80 text-sm mb-4">
                  Based on research across TikTok Live, Twitch, and YouTube, here's what supporters typically spend on their favorite creators:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                    <p className="text-stone-400 text-xs">Casual</p>
                    <p className="text-amber-200 font-bold">$5-15/mo</p>
                  </div>
                  <div className="bg-amber-900/30 rounded-lg p-3 text-center border border-amber-500/30">
                    <p className="text-amber-400 text-xs">Loyal (Average)</p>
                    <p className="text-amber-100 font-bold text-lg">$25-35/mo</p>
                  </div>
                  <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                    <p className="text-stone-400 text-xs">Super Fan</p>
                    <p className="text-amber-200 font-bold">$50-100/mo</p>
                  </div>
                  <div className="bg-stone-800/50 rounded-lg p-3 text-center">
                    <p className="text-stone-400 text-xs">"Whale"</p>
                    <p className="text-amber-200 font-bold">$200+/mo</p>
                  </div>
                </div>
                <p className="text-blue-200/60 text-xs mt-3">
                  Our calculator uses $30/month — the middle of the loyal supporter range — for realistic projections.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  Earnings Potential Calculator
                </CardTitle>
                <p className="text-amber-400/70 text-sm">Based on 50% creator share (increases with tier) • Using $30/mo loyal supporter average</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-600/20">
                        <th className="text-left py-3 px-4 text-amber-400/70 text-sm font-medium">Active Supporters</th>
                        <th className="text-left py-3 px-4 text-amber-400/70 text-sm font-medium">Avg Spend/Month</th>
                        <th className="text-left py-3 px-4 text-amber-400/70 text-sm font-medium">Your Monthly</th>
                        <th className="text-left py-3 px-4 text-amber-400/70 text-sm font-medium">Your Yearly</th>
                        <th className="text-left py-3 px-4 text-amber-400/70 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsCalculator.map((row, index) => (
                        <tr key={index} className="border-b border-amber-600/10 hover:bg-amber-900/10">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-amber-400" />
                              <span className="text-amber-100 font-medium">{row.supporters}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-amber-200">${row.avgSpend}</td>
                          <td className="py-4 px-4">
                            <span className="text-green-400 font-bold">${row.monthly.toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-amber-100 font-bold">${row.yearly.toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={
                              row.monthly >= 1500 ? 'bg-purple-600' :
                              row.monthly >= 500 ? 'bg-yellow-600' :
                              row.monthly >= 150 ? 'bg-slate-500' :
                              'bg-stone-600'
                            }>
                              {row.yearly >= 50000 ? 'Full-Time' :
                               row.yearly >= 20000 ? 'Part-Time' :
                               row.yearly >= 5000 ? 'Side Income' :
                               'Hobby'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-amber-900/20 rounded-xl border border-amber-500/30">
                  <h4 className="text-amber-100 font-medium mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    The 30/30 Goal (Your First Milestone)
                  </h4>
                  <p className="text-amber-200/80 text-sm">
                    <strong className="text-amber-100">30 loyal supporters</strong> spending <strong className="text-amber-100">$30/month</strong> = <strong className="text-green-400">$450/month</strong> in your pocket ($900 gross, 50% to you).
                    This is your first realistic target — achievable in 3-6 months with consistent streaming.
                  </p>
                </div>

                <div className="mt-4 p-4 bg-purple-900/20 rounded-xl border border-purple-500/30">
                  <h4 className="text-purple-100 font-medium mb-2 flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-purple-400" />
                    Platform Revenue Example
                  </h4>
                  <p className="text-purple-200/80 text-sm">
                    <strong className="text-purple-100">50 creators</strong> × <strong className="text-purple-100">30 supporters each</strong> × <strong className="text-purple-100">$30/month</strong> = <strong className="text-green-400">$45,000/month gross</strong>.
                    With 50/50 split: $22,500 to creators, $22,500 to platform. Everyone wins.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Growth Strategies Tab */}
          <TabsContent value="growth">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {growthStrategies.map((strategy, index) => {
                const Icon = strategy.icon;
                return (
                  <motion.div
                    key={strategy.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full bg-stone-800/30 border-amber-600/20 hover:border-amber-500/40 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <CardTitle className="text-amber-100 text-lg">{strategy.title}</CardTitle>
                              <Badge className={
                                strategy.impact === 'High' ? 'bg-green-600/80' : 'bg-amber-600/80'
                              }>
                                {strategy.impact} Impact
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-amber-400/70 text-sm mt-2">{strategy.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-amber-400/70 text-xs mb-2">Action Steps</p>
                          <ul className="space-y-2">
                            {strategy.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-amber-200/80">
                                <ArrowRight className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="pt-3 border-t border-amber-600/20">
                          <p className="text-xs text-amber-400/70">Expected Result</p>
                          <p className="text-green-400 font-medium">{strategy.expectedGrowth}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          {/* Milestones Tab */}
          <TabsContent value="milestones">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  Achievement Milestones
                </CardTitle>
                <p className="text-amber-400/70 text-sm">Unlock rewards as you grow your community</p>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-amber-600/20" />
                  
                  <div className="space-y-6">
                    {milestones.map((milestone, index) => {
                      const isAchieved = (creator?.follower_count || 0) >= milestone.followers;
                      const isNext = !isAchieved && (index === 0 || (creator?.follower_count || 0) >= milestones[index - 1].followers);
                      
                      return (
                        <motion.div
                          key={milestone.followers}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="relative flex items-start gap-4 pl-4"
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 ${
                            isAchieved 
                              ? 'bg-green-500' 
                              : isNext 
                                ? 'bg-amber-500 animate-pulse' 
                                : 'bg-stone-700'
                          }`}>
                            {isAchieved && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                          
                          <div className={`flex-1 p-4 rounded-xl ${
                            isAchieved 
                              ? 'bg-green-900/20 border border-green-500/30' 
                              : isNext 
                                ? 'bg-amber-900/20 border border-amber-500/30' 
                                : 'bg-stone-800/50 border border-stone-700/50'
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-medium ${isAchieved ? 'text-green-200' : 'text-amber-100'}`}>
                                {milestone.followers.toLocaleString()} Followers
                              </h4>
                              {isAchieved && (
                                <Badge className="bg-green-600">Achieved!</Badge>
                              )}
                              {isNext && (
                                <Badge className="bg-amber-600">Next Goal</Badge>
                              )}
                            </div>
                            <p className="text-amber-200/80 text-sm">{milestone.reward}</p>
                            {milestone.bonus && (
                              <p className="text-amber-400 text-xs mt-1">+ {milestone.bonus}</p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CTA */}
        {!creator && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 text-center"
          >
            <Card className="bg-gradient-to-r from-amber-900/40 to-stone-900 border-amber-500/30 p-8">
              <h3 className="text-2xl font-bold text-amber-100 mb-3">Ready to Start Your Journey?</h3>
              <p className="text-amber-400/70 mb-6 max-w-xl mx-auto">
                Join Legion today and start building your streaming career with our creator-first platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to={createPageUrl('GoLive')}>
                  <Button className="bg-amber-600 hover:bg-amber-700 px-8">
                    <Rocket className="w-4 h-4 mr-2" />
                    Start Streaming
                  </Button>
                </Link>
                <Link to={createPageUrl('CreatorMonetization')}>
                  <Button variant="outline" className="border-amber-500/50 text-amber-200 hover:bg-amber-900/30 px-8">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Enable Monetization
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}