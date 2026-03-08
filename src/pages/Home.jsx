import React, { useState, useMemo, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCurrentUser, useLiveStreams, useCreators } from '@/components/hooks/useStreamData';
import RecommendationEngine from '@/components/services/RecommendationEngine';
import PullToRefresh from '@/components/shared/PullToRefresh';
import ForgeStamp from '@/components/shared/ForgeStamp';
import { fmt } from '@/components/core/legion';
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
  Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import TrendingSection from '@/components/shared/TrendingSection';
import CreatorsYouMayLike from '@/components/home/CreatorsYouMayLike';

// Memoized quick access card
const QuickAccessCard = memo(function QuickAccessCard({ item, index }) {
  return (
    <Link to={createPageUrl(item.to)}>
      <div className="h-full group cursor-pointer bg-gradient-to-br from-white/[0.06] to-white/[0.02] hover:from-white/[0.1] hover:to-white/[0.04] backdrop-blur-md border border-white/[0.1] hover:border-white/[0.15] rounded-2xl p-4 transition-all duration-300 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30">
        <div className="flex flex-col items-center text-center gap-3">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg shadow-black/30 group-hover:scale-110 transition-transform duration-300`}>
            <item.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{item.title}</p>
            <p className="text-white/45 text-[10px] font-medium">{item.desc}</p>
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
  { to: 'GamesExpo', icon: Gamepad2, title: 'Games Expo', desc: 'Arcade • AI Builder', color: 'purple', gradient: 'from-purple-500 to-violet-600' },
  { to: 'AffiliateHub', icon: ShoppingBag, title: 'Affiliate Hub', desc: 'Products • Brands', color: 'green', gradient: 'from-emerald-500 to-green-600' }
];

const TAB_ITEMS = [
  { value: 'personalized', icon: Heart, label: 'For You' },
  { value: 'trending', icon: TrendingUp, label: 'Trending' },
  { value: 'featured', icon: Trophy, label: 'Featured' }
];

const TabAnimation = memo(function TabAnimation({ children }) {
  return <div>{children}</div>;
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
      <h3 className="text-white font-semibold text-lg mb-2">No Streams Live</h3>
      <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">No one is streaming right now. Be the first to go live and grow your audience!</p>
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
    <div className="min-h-screen pt-16 pb-24 bg-gradient-to-b from-black via-slate-950 to-black">
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Hero Header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-amber-400/10 backdrop-blur-xl border border-amber-500/30 rounded-full px-4 py-2 mb-4 shadow-lg shadow-amber-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span className="text-amber-300 text-[11px] font-bold tracking-widest uppercase">✦ Platform Live</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-1 animate-gradient-x drop-shadow-lg">
            Legion Live
          </h1>
          <p className="text-white/50 text-sm sm:text-base font-semibold tracking-wide">Stream • Compete • Earn</p>
          
          <div className="flex items-center justify-center gap-6 mt-8 px-4 py-4 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 backdrop-blur-sm border border-amber-500/10 rounded-2xl max-w-2xl mx-auto">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-amber-400">{fmt.count(streams.length)}</p>
              <p className="text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-0.5">Live Now</p>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-white">{fmt.count(creators.length)}</p>
              <p className="text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-0.5">Creators</p>
            </div>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-black text-amber-400">60%</p>
              <p className="text-white/40 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mt-0.5">Creator Cut</p>
            </div>
          </div>
          <div className="flex justify-center mt-3">
            <ForgeStamp variant="badge" />
          </div>
        </div>
        
        {/* Quick Access */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-12 max-w-4xl mx-auto">
          {QUICK_ACCESS_ITEMS.map((item, i) => (
            <QuickAccessCard key={item.to} item={item} index={i} />
          ))}
        </div>

        {/* Creators You May Like */}
        <CreatorsYouMayLike user={user} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex justify-center">
            <div className="inline-flex bg-gradient-to-r from-white/[0.08] to-white/[0.03] backdrop-blur-xl border border-white/[0.12] p-1.5 rounded-2xl min-w-max shadow-lg shadow-black/20">
              {TAB_ITEMS.map((tab) => (
                <TabsList key={tab.value} className="bg-transparent p-0">
                  <TabsTrigger 
                    value={tab.value}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-white/90 data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:shadow-white/20 rounded-xl px-5 py-2 text-white/50 hover:text-white/80 transition-all duration-300 text-sm font-semibold"
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
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
                  <div className="text-center py-16">
                    <Sparkles className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-1">No Featured Streams</h3>
                    <p className="text-white/35 text-sm">Appears when creators reach 100+ viewers.</p>
                  </div>
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