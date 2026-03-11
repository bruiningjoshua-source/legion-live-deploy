import React, { useState, useMemo, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCurrentUser, useLiveStreams, useCreators } from '@/components/hooks/useStreamData';
import RecommendationEngine from '@/components/services/RecommendationEngine';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { fmt } from '@/components/core/legion';
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Radio, TrendingUp, Heart, Trophy, Film, Gamepad2,
  ShoppingBag, Sparkles, Sword, MessageSquare, ChevronRight,
} from 'lucide-react';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import TrendingSection from '@/components/shared/TrendingSection';
import CreatorsYouMayLike from '@/components/home/CreatorsYouMayLike';

// ── Platform Hubs ─────────────────────────────────────────────────────────────
const PLATFORM_HUBS = [
  {
    to: 'Explore',
    icon: Radio,
    title: 'Live Streams',
    subtitle: 'Solo · PK · Multi-Host',
    gradient: 'from-red-600/80 to-rose-700/60',
    border: 'border-red-500/25',
    glow: 'shadow-red-500/10',
    badge: 'LIVE',
    badgeColor: 'bg-red-500',
  },
  {
    to: 'TheAmphitheatre',
    icon: Film,
    title: 'The Colosseum',
    subtitle: 'Videos · Shorts · Music',
    gradient: 'from-blue-600/80 to-cyan-700/60',
    border: 'border-blue-500/25',
    glow: 'shadow-blue-500/10',
    badge: 'WATCH',
    badgeColor: 'bg-blue-500',
  },
  {
    to: 'TheGamingHub',
    icon: Gamepad2,
    title: 'Gaming Arena',
    subtitle: 'Live Gaming · Streams',
    gradient: 'from-purple-600/80 to-violet-700/60',
    border: 'border-purple-500/25',
    glow: 'shadow-purple-500/10',
    badge: 'ARENA',
    badgeColor: 'bg-purple-500',
  },
  {
    to: 'GamesExpo',
    icon: Sword,
    title: 'Games Expo',
    subtitle: 'Arcade · AI Builder',
    gradient: 'from-amber-600/80 to-orange-700/60',
    border: 'border-amber-500/25',
    glow: 'shadow-amber-500/10',
    badge: 'PLAY',
    badgeColor: 'bg-amber-500',
  },
  {
    to: 'CommunityForums',
    icon: MessageSquare,
    title: 'The Senate',
    subtitle: 'Forums · Discussions',
    gradient: 'from-cyan-600/80 to-teal-700/60',
    border: 'border-cyan-500/25',
    glow: 'shadow-cyan-500/10',
    badge: 'FORUM',
    badgeColor: 'bg-cyan-500',
  },
  {
    to: 'AffiliateHub',
    icon: ShoppingBag,
    title: 'Merchant Hub',
    subtitle: 'Brands · Affiliate',
    gradient: 'from-emerald-600/80 to-green-700/60',
    border: 'border-emerald-500/25',
    glow: 'shadow-emerald-500/10',
    badge: 'EARN',
    badgeColor: 'bg-emerald-500',
  },
];

const PlatformCard = memo(function PlatformCard({ hub }) {
  const Icon = hub.icon;
  return (
    <Link to={createPageUrl(hub.to)}>
      <div className={`group relative h-full overflow-hidden rounded-2xl border ${hub.border} bg-gradient-to-br ${hub.gradient} shadow-lg ${hub.glow} hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer`}>
        {/* Stone texture overlay */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=20')] bg-cover bg-center opacity-5 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="relative p-4 flex flex-col h-full min-h-[110px]">
          <div className="flex items-start justify-between mb-auto">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className={`${hub.badgeColor} text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest`}>
              {hub.badge}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-white font-bold text-sm leading-tight">{hub.title}</p>
            <p className="text-white/50 text-[10px] mt-0.5 font-medium">{hub.subtitle}</p>
          </div>
        </div>

        {/* Right-arrow hint */}
        <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
});

const StreamSkeleton = memo(function StreamSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className={`aspect-[9/16] w-full rounded-2xl bg-white/5 ${i >= 4 ? 'hidden md:block' : ''} ${i >= 6 ? 'hidden lg:block' : ''}`} />
      ))}
    </div>
  );
});

const TAB_ITEMS = [
  { value: 'personalized', icon: Heart,      label: 'For You'  },
  { value: 'trending',     icon: TrendingUp, label: 'Trending' },
  { value: 'featured',     icon: Trophy,     label: 'Featured' },
];

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

  const { data: userProfile = {} } = useQuery({
    queryKey: ['user-profile-rec', user?.email],
    queryFn: () => RecommendationEngine.buildUserProfile(user.email),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const creatorMap = useMemo(() => {
    const map = {};
    creators.forEach(c => { map[c.id] = c; });
    return map;
  }, [creators]);

  const personalizedStreams = useMemo(() =>
    RecommendationEngine.rankStreams(streams, userProfile),
    [streams, userProfile]
  );

  const featuredStreams = useMemo(() =>
    streams.filter(s => (s.viewer_count || 0) > 100 || s.is_featured)
      .sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0))
      .slice(0, 10),
    [streams]
  );

  const renderStreamGrid = (list) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {list.map((stream, i) => (
        <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
      ))}
    </div>
  );

  const renderEmptyLive = () => (
    <div className="text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
        <Radio className="w-8 h-8 text-amber-500/40" />
      </div>
      <h3 className="text-white font-bold text-lg mb-2">No Streams Live</h3>
      <p className="text-white/35 text-sm mb-6 max-w-xs mx-auto">The arena is empty. Be the first to enter and grow your following.</p>
      <Link to={createPageUrl('GoLive')}>
        <button className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl px-6 py-2.5 text-sm font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 mx-auto">
          <Radio className="w-4 h-4" /> Enter the Arena
        </button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* ── Hero ── */}
          <div className="text-center pt-8 pb-6 sm:pt-10 sm:pb-8">
            {/* Live indicator */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 mb-5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
              </span>
              <span className="text-amber-400/80 text-[10px] font-black uppercase tracking-[0.2em]">Platform Active</span>
            </div>

            {/* Title — Roman carved lettering style */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-1">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600">
                LEGION
              </span>
              <span className="text-white/90 ml-3">LIVE</span>
            </h1>
            <p className="text-amber-600/60 text-xs font-bold tracking-[0.35em] uppercase mb-6">
              SENATUS POPULUSQUE ROMANUS · MMXXVI
            </p>

            {/* Stats bar */}
            <div className="inline-flex items-center gap-8 px-6 py-3 bg-gradient-to-r from-amber-900/20 via-stone-900/30 to-amber-900/20 border border-amber-700/20 rounded-2xl">
              <div className="text-center">
                <p className="text-xl font-black text-amber-400">{fmt.count(streams.length)}</p>
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-0.5">Live Now</p>
              </div>
              <div className="w-px h-8 bg-amber-700/30" />
              <div className="text-center">
                <p className="text-xl font-black text-white">{fmt.count(creators.length)}</p>
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-0.5">Creators</p>
              </div>
              <div className="w-px h-8 bg-amber-700/30" />
              <div className="text-center">
                <p className="text-xl font-black text-amber-400">60%</p>
                <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest mt-0.5">Creator Cut</p>
              </div>
            </div>
          </div>

          {/* ── Platform Hubs Grid ── */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
              <span className="text-amber-600/50 text-[10px] font-black tracking-[0.3em] uppercase">Platforms</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PLATFORM_HUBS.map(hub => (
                <PlatformCard key={hub.to} hub={hub} />
              ))}
            </div>
          </section>

          {/* ── Creators You May Like ── */}
          <CreatorsYouMayLike user={user} />

          {/* ── Live Feed Tabs ── */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/30" />
              <span className="text-amber-600/50 text-[10px] font-black tracking-[0.3em] uppercase">Live Arena</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/30" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
              <div className="flex justify-center">
                <TabsList className="inline-flex bg-amber-900/20 border border-amber-700/25 p-1 rounded-xl gap-0.5 h-auto">
                  {TAB_ITEMS.map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-500/30 data-[state=active]:shadow-none rounded-lg px-4 py-2 text-white/40 hover:text-white/70 transition-all text-sm font-semibold"
                    >
                      <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="personalized" className="mt-0">
                {streamsLoading ? <StreamSkeleton /> :
                  personalizedStreams.length > 0 ? renderStreamGrid(personalizedStreams.slice(0, 15)) : renderEmptyLive()
                }
              </TabsContent>

              <TabsContent value="trending" className="mt-0">
                <TrendingSection />
              </TabsContent>

              <TabsContent value="featured" className="mt-0">
                {streamsLoading ? <StreamSkeleton /> :
                  featuredStreams.length >= 3 ? renderStreamGrid(featuredStreams) : (
                    <div className="text-center py-16">
                      <Sparkles className="w-10 h-10 text-amber-500/20 mx-auto mb-4" />
                      <h3 className="text-white font-bold text-lg mb-1">No Featured Streams</h3>
                      <p className="text-white/30 text-sm">Appears when creators reach 100+ viewers.</p>
                    </div>
                  )
                }
              </TabsContent>
            </Tabs>
          </section>

        </div>
      </PullToRefresh>
    </div>
  );
}