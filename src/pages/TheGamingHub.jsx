import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Gamepad2,
  TrendingUp,
  Users,
  Radio,
  Grid,
  List,
  Flame,
  Clock,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';
import GamingStreamCard from '@/components/gaming/GamingStreamCard';
import FeaturedGameCarousel from '@/components/gaming/FeaturedGameCarousel';
import GameCategoryGrid from '@/components/gaming/GameCategoryGrid';
import LiveChannelsSidebar from '@/components/gaming/LiveChannelsSidebar';

const GAMING_CATEGORIES = [
  'All',
  'FPS',
  'RPG',
  'Strategy',
  'MOBA',
  'Fighting',
  'Racing',
  'Sports',
  'Indie',
  'Retro',
  'VR',
  'Mobile'
];

const CONSOLE_PLATFORMS = [
  { name: 'PC', icon: '💻', color: 'bg-blue-600' },
  { name: 'PlayStation', icon: '🎮', color: 'bg-blue-700' },
  { name: 'Xbox', icon: '🎯', color: 'bg-green-700' },
  { name: 'Nintendo', icon: '🔴', color: 'bg-red-700' },
  { name: 'Mobile', icon: '📱', color: 'bg-purple-700' },
  { name: 'VR', icon: '🥽', color: 'bg-indigo-700' }
];

export default function TheGamingHub() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedGame, setSelectedGame] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('live');
  const [sortBy, setSortBy] = useState('viewers');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['gaming-streams'],
    queryFn: () => base44.entities.Stream.filter({ 
      category: 'gaming', 
      status: 'live' 
    }, '-viewer_count', 100),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['gaming-creators'],
    queryFn: () => base44.entities.Creator.filter({ 
      category: 'gaming' 
    }, '-follower_count', 50),
    staleTime: 5 * 60 * 1000
  });

  // Fetch user's followed creators
  const { data: follows = [] } = useQuery({
    queryKey: ['my-follows', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user?.email
  });

  const followedCreatorIds = useMemo(() => follows.map(f => f.followed_id), [follows]);

  const creatorMap = useMemo(() =>
    creators.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {}), [creators]
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

      // Tab-based filtering
      if (activeTab === 'following') {
        return matchesSearch && matchesCategory && matchesPlatform && matchesGame && followedCreatorIds.includes(stream.creator_id);
      }

      return matchesSearch && matchesCategory && matchesPlatform && matchesGame;
    });

    // Sorting
    if (sortBy === 'viewers') {
      result.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
    } else if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    return result;
  }, [streams, searchQuery, selectedCategory, selectedPlatform, selectedGame, creatorMap, activeTab, followedCreatorIds, sortBy]);

  const totalLiveViewers = useMemo(() => 
    streams.reduce((sum, s) => sum + (s.viewer_count || 0), 0), 
    [streams]
  );

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="flex">
        {/* Sidebar */}
        <LiveChannelsSidebar 
          streams={streams} 
          creators={creatorMap} 
          followedCreators={followedCreatorIds}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Featured Carousel */}
            <FeaturedGameCarousel streams={streams} creators={creatorMap} />

            {/* Header with Stats */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-400 to-pink-400 mb-2 flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Gamepad2 className="w-8 h-8 text-purple-400" />
                  </motion.div>
                  Gaming Hub
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-300 font-medium">{streams.filter(s => s.status === 'live').length} Live</span>
                  </span>
                  <span className="text-white/50">{totalLiveViewers.toLocaleString()} viewers</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Link to={createPageUrl('GoLive')}>
                  <PremiumButton variant="premium" leftIcon={<Radio className="w-4 h-4" />}>
                    Go Live
                  </PremiumButton>
                </Link>
              </div>
            </motion.div>

            {/* Game Categories */}
            <GameCategoryGrid onSelectGame={setSelectedGame} selectedGame={selectedGame} />

            {/* Search & Filters */}
            <GlassCard className="mb-6" padding="p-4" glowColor="purple">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/50" />
                  <Input
                    placeholder="Search streams, games, creators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50 rounded-xl"
                  />
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSortBy(sortBy === 'viewers' ? 'recent' : 'viewers')}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    {sortBy === 'viewers' ? <TrendingUp className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-purple-300 hover:bg-purple-500/20 transition-colors"
                  >
                    {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                  </motion.button>
                </div>
              </div>

              {/* Platform Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pt-4 scrollbar-hide">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedPlatform('All')}
                  className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all text-sm font-medium ${
                    selectedPlatform === 'All'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  All Platforms
                </motion.button>
                {CONSOLE_PLATFORMS.map(platform => (
                  <motion.button
                    key={platform.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPlatform(selectedPlatform === platform.name ? 'All' : platform.name)}
                    className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 text-sm font-medium ${
                      selectedPlatform === platform.name
                        ? `${platform.color} text-white shadow-lg`
                        : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <span>{platform.icon}</span>
                    {platform.name}
                  </motion.button>
                ))}
              </div>
            </GlassCard>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl mb-6">
                <TabsList className="bg-transparent p-0 gap-1">
                  <TabsTrigger 
                    value="live" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Live Channels
                  </TabsTrigger>
                  <TabsTrigger 
                    value="following" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Following
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Content Grid */}
              <TabsContent value="live" className="mt-0">
                {streamsLoading ? (
                  <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="rounded-2xl bg-white/5 overflow-hidden">
                        <Skeleton className="aspect-video bg-white/10" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-4 w-3/4 bg-white/10" />
                          <Skeleton className="h-3 w-1/2 bg-white/10" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredStreams.length > 0 ? (
                  <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    <AnimatePresence>
                      {filteredStreams.map((stream, i) => (
                        <motion.div
                          key={stream.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                          <GamingStreamCard 
                            stream={stream} 
                            creator={creatorMap[stream.creator_id]}
                            viewMode={viewMode}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <GlassCard className="text-center py-16" glowColor="purple">
                    <Gamepad2 className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-xl mb-2">No Streams Found</h3>
                    <p className="text-white/50 mb-6">Try adjusting your filters or check back later</p>
                    <Link to={createPageUrl('GoLive')}>
                      <PremiumButton variant="premium" leftIcon={<Radio className="w-4 h-4" />}>
                        Be the First to Stream
                      </PremiumButton>
                    </Link>
                  </GlassCard>
                )}
              </TabsContent>

              <TabsContent value="following" className="mt-0">
                {filteredStreams.length > 0 ? (
                  <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    {filteredStreams.map((stream, i) => (
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
                      >
                        <GamingStreamCard 
                          stream={stream} 
                          creator={creatorMap[stream.creator_id]}
                          viewMode={viewMode}
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <GlassCard className="text-center py-16" glowColor="purple">
                    <Heart className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-xl mb-2">No Followed Channels Live</h3>
                    <p className="text-white/50 mb-6">Follow some gaming streamers to see them here when they go live!</p>
                    <Link to={createPageUrl('Explore')}>
                      <PremiumButton variant="secondary" leftIcon={<Users className="w-4 h-4" />}>
                        Discover Streamers
                      </PremiumButton>
                    </Link>
                  </GlassCard>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}