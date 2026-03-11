import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Gamepad2, TrendingUp, Users, Radio,
  Grid, List, Flame, Clock, Heart, Sword,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GamingStreamCard from '@/components/gaming/GamingStreamCard';
import FeaturedGameCarousel from '@/components/gaming/FeaturedGameCarousel';
import GameCategoryGrid from '@/components/gaming/GameCategoryGrid';
import LiveChannelsSidebar from '@/components/gaming/LiveChannelsSidebar';

const CONSOLE_PLATFORMS = [
  { name: 'All',         icon: '⚔️', style: '' },
  { name: 'PC',          icon: '💻', style: '' },
  { name: 'PlayStation', icon: '🎮', style: '' },
  { name: 'Xbox',        icon: '🎯', style: '' },
  { name: 'Nintendo',    icon: '🔴', style: '' },
  { name: 'Mobile',      icon: '📱', style: '' },
  { name: 'VR',          icon: '🥽', style: '' },
];

export default function TheGamingHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedGame, setSelectedGame] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('live');
  const [sortBy, setSortBy] = useState('viewers');

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['gaming-streams'],
    queryFn: () => base44.entities.Stream.filter({ category: 'gaming', status: 'live' }, '-viewer_count', 100),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['gaming-creators'],
    queryFn: () => base44.entities.Creator.filter({ category: 'gaming' }, '-follower_count', 50),
    staleTime: 5 * 60 * 1000,
  });

  const { data: follows = [] } = useQuery({
    queryKey: ['my-follows', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user?.email,
  });

  const followedCreatorIds = useMemo(() => follows.map(f => f.followed_id), [follows]);

  const creatorMap = useMemo(() =>
    creators.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [creators]
  );

  const filteredStreams = useMemo(() => {
    let result = streams.filter(stream => {
      const matchesSearch = !searchQuery ||
        stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stream.game_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creatorMap[stream.creator_id]?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || stream.tags?.includes(selectedCategory);
      const matchesPlatform = selectedPlatform === 'All' || stream.tags?.includes(selectedPlatform);
      const matchesGame = !selectedGame || stream.game_title?.toLowerCase().includes(selectedGame.toLowerCase());

      if (activeTab === 'following') {
        return matchesSearch && matchesCategory && matchesPlatform && matchesGame && followedCreatorIds.includes(stream.creator_id);
      }
      return matchesSearch && matchesCategory && matchesPlatform && matchesGame;
    });

    if (sortBy === 'viewers') result.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
    else if (sortBy === 'recent') result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return result;
  }, [streams, searchQuery, selectedCategory, selectedPlatform, selectedGame, creatorMap, activeTab, followedCreatorIds, sortBy]);

  const totalViewers = useMemo(() => streams.reduce((s, st) => s + (st.viewer_count || 0), 0), [streams]);

  const StreamGrid = ({ list }) => (
    streamsLoading ? (
      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-amber-700/15" style={{ background: 'rgba(15,12,6,0.6)' }}>
            <Skeleton className="aspect-video bg-amber-900/20" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4 bg-amber-900/20" />
              <Skeleton className="h-3 w-1/2 bg-amber-900/20" />
            </div>
          </div>
        ))}
      </div>
    ) : list.length > 0 ? (
      <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
        <AnimatePresence>
          {list.map((stream, i) => (
            <motion.div
              key={stream.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
            >
              <GamingStreamCard stream={stream} creator={creatorMap[stream.creator_id]} viewMode={viewMode} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    ) : (
      <div className="text-center py-20 rounded-2xl border border-amber-700/15" style={{ background: 'rgba(15,12,6,0.5)' }}>
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
          <Gamepad2 className="w-8 h-8 text-amber-500/30" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">No Streams Found</h3>
        <p className="text-white/30 text-sm mb-5">Adjust your filters or be the first to stream</p>
        <Link to={createPageUrl('GoLive')}>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 font-bold text-sm transition-all mx-auto">
            <Radio className="w-4 h-4" /> Go Live
          </button>
        </Link>
      </div>
    )
  );

  return (
    <div className="min-h-screen pt-16 pb-24" style={{ background: 'linear-gradient(180deg, #0c0906 0%, #0f0c08 40%, #0a0804 100%)' }}>
      <div className="flex">
        {/* Sidebar */}
        <LiveChannelsSidebar streams={streams} creators={creatorMap} followedCreators={followedCreatorIds} />

        {/* Main */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">

            {/* Featured Carousel */}
            <FeaturedGameCarousel streams={streams} creators={creatorMap} />

            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1 mb-2">
                  <Sword className="w-3 h-3 text-purple-400/70" />
                  <span className="text-purple-400/70 text-[10px] font-black uppercase tracking-widest">Gaming Arena · MMXXVI</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black">
                  <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-200 via-purple-400 to-purple-600">GAMING</span>
                  <span className="text-white/80 ml-3">ARENA</span>
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-red-300/80 text-xs font-bold">{streams.filter(s => s.status === 'live').length} Live</span>
                  </span>
                  <span className="text-white/30 text-xs">{totalViewers.toLocaleString()} viewers</span>
                </div>
              </div>
              <Link to={createPageUrl('GoLive')}>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 font-bold text-sm transition-all">
                  <Radio className="w-4 h-4" /> Go Live
                </button>
              </Link>
            </div>

            {/* Game categories */}
            <GameCategoryGrid onSelectGame={setSelectedGame} selectedGame={selectedGame} />

            {/* Search & Filter bar */}
            <div className="rounded-2xl border border-amber-700/20 p-4 mb-6" style={{ background: 'rgba(15,12,6,0.7)' }}>
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                  <Input
                    placeholder="Search streams, games, creators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 bg-amber-900/15 border-amber-700/25 text-white placeholder:text-white/25 focus:border-amber-500/40 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy(s => s === 'viewers' ? 'recent' : 'viewers')}
                    className="w-10 h-10 rounded-xl bg-amber-900/20 border border-amber-700/25 text-amber-500/60 hover:text-amber-400 flex items-center justify-center transition-all"
                    title={sortBy === 'viewers' ? 'Sort by Recent' : 'Sort by Viewers'}
                  >
                    {sortBy === 'viewers' ? <TrendingUp className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                    className="w-10 h-10 rounded-xl bg-amber-900/20 border border-amber-700/25 text-amber-500/60 hover:text-amber-400 flex items-center justify-center transition-all"
                  >
                    {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Platform pills */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {CONSOLE_PLATFORMS.map(platform => (
                  <button
                    key={platform.name}
                    onClick={() => setSelectedPlatform(platform.name)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      selectedPlatform === platform.name
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-white/[0.04] text-white/40 border-white/[0.08] hover:text-white/70 hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="text-sm">{platform.icon}</span>
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="bg-amber-900/20 border border-amber-700/25 p-1 rounded-xl h-auto gap-0.5 mb-5">
                <TabsTrigger value="live" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30 rounded-lg px-5 py-2 text-white/40 hover:text-white/70 text-sm font-bold transition-all">
                  <Flame className="w-3.5 h-3.5 mr-1.5" /> Live Channels
                </TabsTrigger>
                <TabsTrigger value="following" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border data-[state=active]:border-purple-500/30 rounded-lg px-5 py-2 text-white/40 hover:text-white/70 text-sm font-bold transition-all">
                  <Heart className="w-3.5 h-3.5 mr-1.5" /> Following
                </TabsTrigger>
              </TabsList>

              <TabsContent value="live" className="mt-0">
                <StreamGrid list={filteredStreams} />
              </TabsContent>

              <TabsContent value="following" className="mt-0">
                {filteredStreams.length > 0 ? (
                  <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    {filteredStreams.map((stream, i) => (
                      <motion.div key={stream.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <GamingStreamCard stream={stream} creator={creatorMap[stream.creator_id]} viewMode={viewMode} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 rounded-2xl border border-amber-700/15" style={{ background: 'rgba(15,12,6,0.5)' }}>
                    <Heart className="w-10 h-10 text-purple-500/20 mx-auto mb-3" />
                    <h3 className="text-white font-bold mb-1">No Followed Channels Live</h3>
                    <p className="text-white/30 text-sm">Follow gaming streamers to see them here</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}