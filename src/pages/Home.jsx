import React, { useState, useMemo, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCurrentUser, useLiveStreams, useCreators } from '@/components/hooks/useStreamData';
import RecommendationEngine from '@/components/services/RecommendationEngine';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Radio, 
  TrendingUp, 
  Heart,
  Trophy,
  Film,
  Gamepad2,
  ShoppingBag,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import GlassCard from '@/components/shared/GlassCard';
import TrendingSection from '@/components/shared/TrendingSection';
import CreatorsYouMayLike from '@/components/home/CreatorsYouMayLike';

// Memoized quick access card
const QuickAccessCard = memo(function QuickAccessCard({ item, index }) {
  return (
    <Link to={createPageUrl(item.to)}>
      <div className="h-full group cursor-pointer bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl p-4 transition-all duration-200">
        <div className="flex flex-col items-center text-center gap-2">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
            <item.icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{item.title}</p>
            <p className="text-white/35 text-[10px]">{item.desc}</p>
          </div>
        </div>
      </div>
    </Link>
  );
});

// Responsive skeleton loader: 2 on mobile, 3 on tablet, 4 on desktop
const StreamSkeleton = memo(function StreamSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className={`aspect-[9/16] w-full rounded-2xl bg-white/5 ${
          i >= 4 ? 'hidden md:block' : ''
        } ${i >= 6 ? 'hidden lg:block' : ''}`} />
      ))}
    </div>
  );
});

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

// Tab content animation wrapper
const TabAnimation = memo(function TabAnimation({ children, tabKey }) {
  return (
    <motion.div
      key={tabKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
});

export default function Home() {
  const [activeTab, setActiveTab] = useState('personalized');
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['streams-live'] }),
      queryClient.invalidateQueries({ queryKey: ['creators-home'] }),
      queryClient.invalidateQueries({ queryKey: ['user-profile-rec'] }),
    ]);
  }, [queryClient]);

  const { data: user } = useCurrentUser();
  const { data: streams = [], isLoading: streamsLoading } = useLiveStreams();
  const { data: creators = [] } = useCreators();

  // Build user profile for recommendation engine
  const { data: userProfile = {} } = useQuery({
    queryKey: ['user-profile-rec', user?.email],
    queryFn: () => RecommendationEngine.buildUserProfile(user.email),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const creatorMap = useMemo(() => {
    const map = {};
    for (let i = 0; i < creators.length; i++) {
      map[creators[i].id] = creators[i];
    }
    return map;
  }, [creators]);

  // For You: ML-lite recommendation engine scoring
  const personalizedStreams = useMemo(() => {
    return RecommendationEngine.rankStreams(streams, userProfile);
  }, [streams, userProfile]);

  // Featured: streams with >100 viewers, sorted by viewer count
  const featuredStreams = useMemo(() => {
    const featured = streams.filter(s => (s.viewer_count || 0) > 100 || s.is_featured);
    return featured.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0)).slice(0, 10);
  }, [streams]);

  const handleTabChange = useCallback((value) => setActiveTab(value), []);

  const renderStreamGrid = (streamList) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {streamList.map((stream, i) => (
        <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
      ))}
    </div>
  );

  const renderEmptyLive = () => (
    <div className="text-center py-16 px-6">
      <Radio className="w-12 h-12 text-white/15 mx-auto mb-4" />
      <h3 className="text-white font-semibold text-lg mb-1">No Streams Live</h3>
      <p className="text-white/40 text-sm mb-6">Be the first to go live</p>
      <div className="flex items-center justify-center gap-3">
        <Link to={createPageUrl('GoLive')}>
          <Button className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 gap-2">
            <Radio className="w-4 h-4" /> Go Live
          </Button>
        </Link>
        <Link to={createPageUrl('TheAmphitheatre')}>
          <Button variant="ghost" className="text-white/50 hover:text-white rounded-full px-6 gap-2">
            <Film className="w-4 h-4" /> Videos
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-1">
            Legion Live
          </h1>
          <p className="text-white/40 text-sm sm:text-base">Stream. Compete. Earn.</p>
          
          <div className="flex items-center justify-center gap-5 mt-4">
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold text-white">{streams.length}</p>
              <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider">Live</p>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div className="text-center">
              <p className="text-lg sm:text-xl font-bold text-white">{creators.length}</p>
              <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider">Creators</p>
            </div>
          </div>
        </div>
        
        {/* Quick Access */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-8 sm:mb-10 max-w-4xl mx-auto">
          {QUICK_ACCESS_ITEMS.map((item, i) => (
            <QuickAccessCard key={item.to} item={item} index={i} />
          ))}
        </div>

        {/* Creators You May Like */}
        <CreatorsYouMayLike user={user} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
          <div className="flex justify-center">
            <div className="inline-flex bg-white/[0.04] border border-white/[0.06] p-1 rounded-xl min-w-max">
              {TAB_ITEMS.map((tab) => (
                <TabsList key={tab.value} className="bg-transparent p-0">
                  <TabsTrigger 
                    value={tab.value}
                    className="data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow rounded-lg px-4 py-1.5 text-white/40 hover:text-white/70 transition-colors text-sm"
                  >
                    <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                    {tab.label}
                  </TabsTrigger>
                </TabsList>
              ))}
            </div>
          </div>

          {/* For You */}
          <TabsContent value="personalized" className="mt-0">
            <TabAnimation tabKey="personalized">
              {streamsLoading ? <StreamSkeleton /> : 
                personalizedStreams.length > 0 ? renderStreamGrid(personalizedStreams.slice(0, 15)) : renderEmptyLive()
              }
            </TabAnimation>
          </TabsContent>

          {/* Trending */}
          <TabsContent value="trending" className="mt-0">
            <TabAnimation tabKey="trending">
              <TrendingSection />
            </TabAnimation>
          </TabsContent>

          {/* Featured */}
          <TabsContent value="featured" className="mt-0">
            <TabAnimation tabKey="featured">
              {streamsLoading ? <StreamSkeleton /> :
                featuredStreams.length >= 3 ? renderStreamGrid(featuredStreams) : (
                  <GlassCard className="text-center py-12 sm:py-16">
                    <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-amber-500/30 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-base sm:text-lg mb-2">No Featured Streams Right Now</h3>
                    <p className="text-white/50 text-sm">Featured streams appear when creators get 100+ viewers.</p>
                  </GlassCard>
                )
              }
            </TabAnimation>
          </TabsContent>
        </Tabs>
      </div>
      </PullToRefresh>
    </div>
  );
}