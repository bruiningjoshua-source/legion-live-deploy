import React, { useState, useMemo, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCurrentUser, useLiveStreams, useCreators } from '@/components/hooks/useStreamData';
import RecommendationEngine from '@/components/services/RecommendationEngine';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { fmt } from '@/components/core/legion';
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, TrendingUp, Heart, Trophy, Film, Gamepad2, ShoppingBag, MessageSquare, Sparkles, Sword } from 'lucide-react';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import TrendingSection from '@/components/shared/TrendingSection';
import CreatorsYouMayLike from '@/components/home/CreatorsYouMayLike';

// ── Platform hub cards ────────────────────────────────────────────────────────
const HUB_ITEMS = [
  {
    to: 'Explore',
    icon: Radio,
    title: 'Live Arena',
    desc: 'Solo · PK · Multi-Host',
    gradient: 'from-red-600 to-rose-700',
    glow: 'shadow-red-500/20',
    border: 'border-red-500/20',
  },
  {
    to: 'TheAmphitheatre',
    icon: Film,
    title: 'The Colosseum',
    desc: 'Videos · Shorts',
    gradient: 'from-blue-600 to-cyan-700',
    glow: 'shadow-blue-500/20',
    border: 'border-blue-500/20',
  },
  {
    to: 'TheGamingHub',
    icon: Gamepad2,
    title: 'Gaming Arena',
    desc: 'Live Gaming Streams',
    gradient: 'from-purple-600 to-violet-700',
    glow: 'shadow-purple-500/20',
    border: 'border-purple-500/20',
  },
  {
    to: 'GamesExpo',
    icon: Sword,
    title: 'Games Expo',
    desc: 'Arcade · AI Builder',
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/20',
    border: 'border-amber-500/20',
  },
  {
    to: 'CommunityForums',
    icon: MessageSquare,
    title: 'The Senate',
    desc: 'Forums · Community',
    gradient: 'from-cyan-600 to-teal-700',
    glow: 'shadow-cyan-500/20',
    border: 'border-cyan-500/20',
  },
  {
    to: 'AffiliateHub',
    icon: ShoppingBag,
    title: 'Merchant Hub',
    desc: 'Brands · Affiliate',
    gradient: 'from-emerald-600 to-green-700',
    glow: 'shadow-emerald-500/20',
    border: 'border-emerald-500/20',
  },
];

const HubCard = memo(function HubCard({ item }) {
  const Icon = item.icon;
  return (
    <Link to={createPageUrl(item.to)}>
      <div className={`group cursor-pointer relative overflow-hidden rounded-2xl border ${item.border} bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 shadow-lg ${item.glow} hover:shadow-xl`}>
        {/* Gold shimmer on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-amber-500/5 to-transparent" />
        <div className="relative p-4 flex flex-col items-center text-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{item.title}</p>
            <p className="text-white/40 text-[10px] font-medium mt-0.5">{item.desc}</p>
          </div>
        </div>
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
  { value: 'personalized', icon: Heart,      label: 'For You'   },
  { value: 'trending',     icon: TrendingUp, label: 'Trending'  },
  { value: 'featured',     icon: Trophy,     label: 'Featured'  },
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
    for (const c of creators) map[c.id] = c;
    return map;
  }, [creators]);

  const personalizedStreams = useMemo(() =>
    RecommendationEngine.rankStreams(streams, userProfile),
    [streams, userProfile]
  );

  const featuredStreams = useMemo(() =>
    streams
      .filter(s => (s.viewer_count || 0) > 100 || s.is_featured)
      .sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0))
      .slice(0, 10),
    [streams]
  );

  const renderStreamGrid = (list) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {list.map((s, i) => (
        <PremiumStreamCard key={s.id} stream={s} creator={creatorMap[s.creator_id]} index={i} />
      ))}
    </div>
  );

  const renderEmpty = () => (
    <div className="text-center py-20 px-6">
      {/* Roman archway decoration */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 flex items-center justify-center">
        <Radio className="w-8 h-8 text-amber-500/40" />
      </div>
      <h3 className="text-white font-bold text-xl mb-2">No Streams Live</h3>
      <p className="text-white/40 text-sm mb-8 max-w-xs mx-auto">The arena awaits its champions. Be the first to step into the spotlight.</p>
      <Link to={createPageUrl('GoLive')}>
        <button className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl px-8 py-3 text-sm font-bold shadow-lg shadow-red-500/20 transition-all border border-red-500/30">
          <Radio className="w-4 h-4 inline mr-2" />
          Enter the Arena
        </button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen pt-16 pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <div className="text-center pt-8 pb-10 sm:pt-12 sm:pb-12">
            {/* Live status pill */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 mb-6 shadow-lg shadow-amber-500/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
              </span>
              <span className="text-amber-300 text-[11px] font-bold tracking-widest uppercase">Platform Live</span>
            </div>

            {/* Title — Roman serif-feel */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-2 leading-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 animate-gradient-x">
                Legion Live
              </span>
            </h1>
            <p className="text-white/40 text-sm sm:text-base font-semibold tracking-[0.2em] uppercase mt-2">
              Stream · Compete · Conquer
            </p>

            {/* Stats bar */}
            <div className="flex items-center justify-center gap-6 sm:gap-10 mt-8 px-5 py-4 bg-white/[0.03] backdrop-blur-xl border border-amber-500/10 rounded-2xl max-w-lg mx-auto shadow-inner">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-red-400">{fmt.count(streams.length)}</p>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-0.5">Live Now</p>
              </div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-amber-700/30 to-transparent" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-white">{fmt.count(creators.length)}</p>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-0.5">Creators</p>
              </div>
              <div className="w-px h-8 bg-gradient-to-b from-transparent via-amber-700/30 to-transparent" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-black text-amber-400">60%</p>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mt-0.5">Creator Cut</p>
              </div>
            </div>
          </div>

          {/* ── Platform Hubs ─────────────────────────────────────────────── */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/20" />
              <p className="text-amber-600/60 text-[10px] font-bold uppercase tracking-widest">Legion Platforms</p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/20" />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {HUB_ITEMS.map(item => <HubCard key={item.to} item={item} />)}
            </div>
          </section>

          {/* ── Creators You May Like ─────────────────────────────────────── */}
          <CreatorsYouMayLike user={user} />

          {/* ── Live Stream Tabs ──────────────────────────────────────────── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-700/20" />
              <TabsList className="inline-flex bg-white/[0.05] backdrop-blur-xl border border-amber-500/15 p-1 rounded-2xl gap-1 h-auto shadow-lg">
                {TAB_ITEMS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-4 py-2 text-white/40 hover:text-white/80 transition-all text-xs font-bold flex items-center gap-1.5"
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-700/20" />
            </div>

            <TabsContent value="personalized" className="mt-0">
              {streamsLoading ? <StreamSkeleton /> :
                personalizedStreams.length > 0
                  ? renderStreamGrid(personalizedStreams.slice(0, 15))
                  : renderEmpty()
              }
            </TabsContent>

            <TabsContent value="trending" className="mt-0">
              <TrendingSection />
            </TabsContent>

            <TabsContent value="featured" className="mt-0">
              {streamsLoading ? <StreamSkeleton /> :
                featuredStreams.length >= 3
                  ? renderStreamGrid(featuredStreams)
                  : (
                    <div className="text-center py-16">
                      <Sparkles className="w-12 h-12 text-amber-500/20 mx-auto mb-4" />
                      <h3 className="text-white font-bold text-lg mb-1">No Featured Streams Yet</h3>
                      <p className="text-white/35 text-sm">Featured when creators reach 100+ viewers.</p>
                    </div>
                  )
              }
            </TabsContent>
          </Tabs>

        </div>
      </PullToRefresh>
    </div>
  );
}