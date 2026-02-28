import React, { useState, useMemo, useCallback, memo } from 'react';
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
import { motion } from 'framer-motion';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';
import TrendingSection from '@/components/shared/TrendingSection';

// Memoized quick access card for performance
const QuickAccessCard = memo(function QuickAccessCard({ item, index }) {
  return (
    <Link to={createPageUrl(item.to)}>
      <GlassCard 
        delay={index * 0.08} 
        glowColor={item.color}
        padding="p-4 sm:p-5"
        className="h-full group cursor-pointer"
      >
        <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-105`}>
            <item.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm sm:text-base">{item.title}</p>
            <p className="text-white/50 text-[10px] sm:text-xs">{item.desc}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />
        </div>
      </GlassCard>
    </Link>
  );
});

// Memoized skeleton loader
const StreamSkeleton = memo(function StreamSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-[9/16] w-full rounded-2xl bg-white/5" />
      ))}
    </div>
  );
});

// Quick access items defined outside component to prevent recreation
const QUICK_ACCESS_ITEMS = [
  { to: 'Explore', icon: Radio, title: 'Live Streams', desc: 'Solo • PK • Group', color: 'red', gradient: 'from-red-500 to-rose-600' },
  { to: 'TheAmphitheatre', icon: Film, title: 'Videos', desc: 'Shorts • Long Form', color: 'blue', gradient: 'from-blue-500 to-cyan-600' },
  { to: 'TheGamingHub', icon: Gamepad2, title: 'Gaming Hub', desc: 'OBS • Streamlabs', color: 'purple', gradient: 'from-purple-500 to-violet-600' },
  { to: 'AffiliateHub', icon: ShoppingBag, title: 'Affiliate Hub', desc: 'Products • Brands', color: 'green', gradient: 'from-emerald-500 to-green-600' }
];

const TAB_ITEMS = [
  { value: 'personalized', icon: Heart, label: 'For You' },
  { value: 'trending', icon: TrendingUp, label: 'Trending' },
  { value: 'featured', icon: Trophy, label: 'Featured' }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('personalized');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['streams-live'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 30),
    staleTime: 45 * 1000,
    refetchInterval: 90 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-home'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 30),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Memoize expensive computations
  const creatorMap = useMemo(() => {
    const map = {};
    for (let i = 0; i < creators.length; i++) {
      map[creators[i].id] = creators[i];
    }
    return map;
  }, [creators]);

  const featuredStreams = useMemo(() => streams.filter(s => s.is_featured), [streams]);
  
  const handleTabChange = useCallback((value) => setActiveTab(value), []);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero Header - Optimized with CSS animations */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-2 sm:mb-3 animate-gradient-x">
            Legion Live
          </h1>
          <p className="text-white/60 text-sm sm:text-lg">Stream, command, and conquer</p>
          
          {/* Quick Stats */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-white">{streams.length}</p>
              <p className="text-white/50 text-[10px] sm:text-xs">Live Now</p>
            </div>
            <div className="w-px h-6 sm:h-8 bg-white/20" />
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-white">{creators.length}</p>
              <p className="text-white/50 text-[10px] sm:text-xs">Creators</p>
            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
          .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 4s ease infinite; }
        `}</style>

        {/* Platform Quick Access - Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12 max-w-5xl mx-auto">
          {QUICK_ACCESS_ITEMS.map((item, i) => (
            <QuickAccessCard key={item.to} item={item} index={i} />
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6 sm:space-y-8">
          <div className="flex justify-center overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl min-w-max">
              {TAB_ITEMS.map((tab) => (
                <TabsList key={tab.value} className="bg-transparent p-0">
                  <TabsTrigger 
                    value={tab.value}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg sm:rounded-xl px-3 sm:px-6 py-2 sm:py-2.5 text-white/60 hover:text-white transition-colors text-sm sm:text-base"
                  >
                    <tab.icon className="w-4 h-4 mr-1.5 sm:mr-2" />
                    {tab.label}
                  </TabsTrigger>
                </TabsList>
              ))}
            </div>
          </div>

          {/* For You - Shows all live streams */}
          <TabsContent value="personalized" className="mt-0">
            {streamsLoading ? (
              <StreamSkeleton count={8} />
            ) : streams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {streams.slice(0, 15).map((stream, i) => (
                  <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12 sm:py-16">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">No Live Streams</h3>
                <p className="text-white/50 text-sm mb-6">Be the first to go live!</p>
                <Link to={createPageUrl('GoLive')}>
                  <PremiumButton icon={Radio}>Go Live</PremiumButton>
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
              <StreamSkeleton count={8} />
            ) : featuredStreams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {featuredStreams.map((stream, i) => (
                  <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12 sm:py-16">
                <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">No Featured Streams</h3>
                <p className="text-white/50 text-sm">Check back soon for featured content!</p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}