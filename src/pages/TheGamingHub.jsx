import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Gamepad2,
  Play,
  TrendingUp,
  Users,
  Eye,
  Radio,
  Zap,
  Cpu,
  Award,
  Filter,
  Grid,
  List,
  Flame,
  Clock,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <div className="min-h-screen bg-gradient-to-b from-[#0e0e10] via-[#18181b] to-[#0e0e10] pt-16">
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
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                  <Gamepad2 className="w-7 h-7 text-purple-500" />
                  Gaming Hub
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-purple-400 flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    {streams.filter(s => s.status === 'live').length} Live
                  </span>
                  <span className="text-white/50">{totalLiveViewers.toLocaleString()} viewers</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link to={createPageUrl('GamingSetup')}>
                  <Button variant="outline" className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                    <Cpu className="w-4 h-4 mr-2" />
                    Setup
                  </Button>
                </Link>
                <Link to={createPageUrl('GoLive')}>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Radio className="w-4 h-4 mr-2" />
                    Go Live
                  </Button>
                </Link>
              </div>
            </div>

            {/* Game Categories */}
            <GameCategoryGrid onSelectGame={setSelectedGame} selectedGame={selectedGame} />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <TabsList className="bg-stone-800/50 border border-purple-500/20 p-1">
                  <TabsTrigger value="live" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <Flame className="w-4 h-4 mr-2" />
                    Live Channels
                  </TabsTrigger>
                  <TabsTrigger value="following" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                    <Heart className="w-4 h-4 mr-2" />
                    Following
                  </TabsTrigger>
                </TabsList>

                {/* Search & Sort */}
                <div className="flex gap-2">
                  <div className="relative flex-1 md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
                    <Input
                      placeholder="Search streams, games..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-stone-800/50 border-purple-500/20 text-white placeholder:text-white/40 focus:border-purple-500 rounded-lg"
                    />
                  </div>
                  <Button
                    onClick={() => setSortBy(sortBy === 'viewers' ? 'recent' : 'viewers')}
                    variant="outline"
                    className="border-purple-500/20 text-purple-300 hover:bg-purple-500/20"
                  >
                    {sortBy === 'viewers' ? <TrendingUp className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    variant="outline"
                    className="border-purple-500/20 text-purple-300 hover:bg-purple-500/20"
                  >
                    {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Platform Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
                <button
                  onClick={() => setSelectedPlatform('All')}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all text-sm ${
                    selectedPlatform === 'All'
                      ? 'bg-purple-600 text-white'
                      : 'bg-stone-800/50 text-white/70 hover:bg-purple-500/20'
                  }`}
                >
                  All Platforms
                </button>
                {CONSOLE_PLATFORMS.map(platform => (
                  <button
                    key={platform.name}
                    onClick={() => setSelectedPlatform(selectedPlatform === platform.name ? 'All' : platform.name)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 text-sm ${
                      selectedPlatform === platform.name
                        ? `${platform.color} text-white`
                        : 'bg-stone-800/50 text-white/70 hover:bg-purple-500/20'
                    }`}
                  >
                    <span>{platform.icon}</span>
                    {platform.name}
                  </button>
                ))}
              </div>

              {/* Content Grid */}
              <TabsContent value="live" className="mt-0">
                {streamsLoading ? (
                  <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    {[...Array(12)].map((_, i) => (
                      <Skeleton key={i} className="aspect-video rounded-xl bg-stone-800" />
                    ))}
                  </div>
                ) : filteredStreams.length > 0 ? (
                  <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    <AnimatePresence>
                      {filteredStreams.map((stream, i) => (
                        <motion.div
                          key={stream.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
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
                  <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-purple-500/20">
                    <Gamepad2 className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">No Streams Found</h3>
                    <p className="text-white/50 mb-4">Try adjusting your filters or check back later</p>
                    <Link to={createPageUrl('GoLive')}>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Radio className="w-4 h-4 mr-2" />
                        Be the First to Stream
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following" className="mt-0">
                {filteredStreams.length > 0 ? (
                  <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                    {filteredStreams.map((stream, i) => (
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
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
                  <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-purple-500/20">
                    <Heart className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
                    <h3 className="text-white font-semibold text-lg mb-2">No Followed Channels Live</h3>
                    <p className="text-white/50 mb-4">Follow some gaming streamers to see them here when they go live!</p>
                    <Link to={createPageUrl('Explore')}>
                      <Button variant="outline" className="border-purple-500/30 text-purple-300">
                        <Users className="w-4 h-4 mr-2" />
                        Discover Streamers
                      </Button>
                    </Link>
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