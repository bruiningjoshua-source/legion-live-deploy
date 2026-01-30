import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Radio, 
  TrendingUp, 
  Heart,
  Sparkles,
  Trophy,
  Film,
  Gamepad2,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';
import TrendingSection from '@/components/shared/TrendingSection';

export default function Home() {
  const [activeTab, setActiveTab] = useState('personalized');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: personalizedRecs = [], isLoading: recsLoading } = useQuery({
    queryKey: ['recommendations', user?.email],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke('getPersonalizedRecommendations', { limit: 16 });
        return res.data?.recommendations || [];
      } catch (error) {
        console.log('Recommendations unavailable:', error.message);
        return [];
      }
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 50),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 50),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const featuredStreams = streams.filter(s => s.is_featured);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-3"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 5, repeat: Infinity }}
            style={{ backgroundSize: '200% 200%' }}
          >
            Legion Live
          </motion.h1>
          <p className="text-white/60 text-lg">Stream, command, and conquer • Premium Creator Platform</p>
          
          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{streams.filter(s => s.status === 'live').length}</p>
              <p className="text-white/50 text-xs">Live Now</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{creators.length}</p>
              <p className="text-white/50 text-xs">Creators</p>
            </div>
          </div>
        </motion.div>

        {/* Platform Quick Access - Premium Glass Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-5xl mx-auto">
          {[
            { to: 'Explore', icon: Radio, title: 'Live Streams', desc: 'Solo • PK • Group', color: 'red', gradient: 'from-red-500 to-rose-600' },
            { to: 'TheAmphitheatre', icon: Film, title: 'Videos', desc: 'Shorts • Long Form', color: 'blue', gradient: 'from-blue-500 to-cyan-600' },
            { to: 'TheGamingHub', icon: Gamepad2, title: 'Gaming Hub', desc: 'OBS • Streamlabs', color: 'purple', gradient: 'from-purple-500 to-violet-600' },
            { to: 'AffiliateHub', icon: ShoppingBag, title: 'Affiliate Hub', desc: 'Products • Brands', color: 'green', gradient: 'from-emerald-500 to-green-600' }
          ].map((item, i) => (
            <Link key={item.to} to={createPageUrl(item.to)}>
              <GlassCard 
                delay={i * 0.1} 
                glowColor={item.color}
                padding="p-5"
                className="h-full group cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg shadow-${item.color}-500/30`}
                  >
                    <item.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  <div>
                    <p className="text-white font-semibold">{item.title}</p>
                    <p className="text-white/50 text-xs">{item.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex justify-center">
            <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
              {[
                { value: 'personalized', icon: Heart, label: 'For You' },
                { value: 'trending', icon: TrendingUp, label: 'Trending' },
                { value: 'featured', icon: Trophy, label: 'Featured' }
              ].map((tab) => (
                <TabsList key={tab.value} className="bg-transparent p-0">
                  <TabsTrigger 
                    value={tab.value}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25 rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                </TabsList>
              ))}
            </div>
          </div>

          {/* Personalized For You */}
          <TabsContent value="personalized" className="mt-0">
            {recsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] w-full rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : personalizedRecs.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {personalizedRecs.map((stream, i) => (
                  <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-16">
                <Sparkles className="w-16 h-16 text-amber-500/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">Discover Your Feed</h3>
                <p className="text-white/50 mb-6">Watch streams to get personalized recommendations!</p>
                <Link to={createPageUrl('Explore')}>
                  <PremiumButton icon={Radio}>Browse Live Streams</PremiumButton>
                </Link>
              </GlassCard>
            )}
          </TabsContent>

          {/* Trending */}
          <TabsContent value="trending" className="mt-0">
            <TrendingSection />
          </TabsContent>

          {/* Featured */}
          <TabsContent value="featured" className="mt-0">
            {streamsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : featuredStreams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {featuredStreams.map((stream, i) => (
                  <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-16">
                <Trophy className="w-16 h-16 text-amber-500/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">No Featured Streams</h3>
                <p className="text-white/50">Check back soon for featured content!</p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}