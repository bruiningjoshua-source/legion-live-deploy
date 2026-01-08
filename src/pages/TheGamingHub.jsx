import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('live');

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
        creatorMap[stream.creator_id]?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || stream.tags?.includes(selectedCategory);
      const matchesPlatform = selectedPlatform === 'All' || stream.tags?.includes(selectedPlatform);

      return matchesSearch && matchesCategory && matchesPlatform;
    });

    result.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
    return result;
  }, [streams, searchQuery, selectedCategory, selectedPlatform, creatorMap]);

  const GamingStreamCard = ({ stream }) => {
    const creator = creatorMap[stream.creator_id];
    const platform = stream.tags?.find(t => 
      CONSOLE_PLATFORMS.some(p => p.name === t)
    ) || 'PC';

    return (
      <motion.div whileHover={{ scale: 1.05 }} className="group cursor-pointer">
        <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
          <div className="relative aspect-video bg-gradient-to-br from-stone-800 to-stone-900 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all">
            {stream.thumbnail_url ? (
              <img
                src={stream.thumbnail_url}
                alt={stream.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">🎮</div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-amber-500/90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform">
                  <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
              <Badge className="bg-red-500 text-white border-0 animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-ping" />
                LIVE
              </Badge>
              {platform && (
                <Badge className="bg-purple-600 text-white border-0 text-xs">
                  {platform}
                </Badge>
              )}
            </div>

            {/* Viewer Count */}
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-black/60 text-white border-0">
                <Eye className="w-3 h-3 mr-1" />
                {(stream.viewer_count || 0).toLocaleString()}
              </Badge>
            </div>

            {/* Creator Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-white font-semibold line-clamp-2 text-sm mb-2">{stream.title}</h3>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 overflow-hidden">
                  {creator?.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                  )}
                </div>
                <span className="text-amber-100 text-xs font-medium truncate">{creator?.display_name}</span>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2 flex items-center gap-3">
              <Gamepad2 className="w-8 h-8 text-amber-400" />
              Gaming Hub
            </h1>
            <p className="text-amber-400/70">Multi-platform gaming streams with console & VR support</p>
          </div>

          {user && (
            <Link to={createPageUrl('GoLive')}>
              <Button className="bg-amber-600 hover:bg-amber-700 hidden sm:flex">
                <Radio className="w-4 h-4 mr-2" />
                Go Live
              </Button>
            </Link>
          )}
        </div>

        {/* Search & Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/50" />
              <Input
                placeholder="Search streams, games, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 focus:border-amber-500 rounded-xl"
              />
            </div>
            <Button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              variant="outline"
              size="icon"
              className="border-amber-600/20 text-amber-400 hover:bg-amber-800/20"
            >
              {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </Button>
          </div>

          {/* Platform Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CONSOLE_PLATFORMS.map(platform => (
              <button
                key={platform.name}
                onClick={() => setSelectedPlatform(platform.name)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${
                  selectedPlatform === platform.name
                    ? `${platform.color} text-white`
                    : 'bg-stone-800/50 text-amber-300 hover:bg-amber-800/20'
                }`}
              >
                <span>{platform.icon}</span>
                {platform.name}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {GAMING_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-800/50 text-amber-300 hover:bg-amber-800/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {streamsLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-xl bg-stone-800" />
            ))}
          </div>
        ) : filteredStreams.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            <AnimatePresence>
              {filteredStreams.map((stream, i) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <GamingStreamCard stream={stream} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
            <Gamepad2 className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
            <h3 className="text-amber-100 font-semibold text-lg mb-2">No Streams Found</h3>
            <p className="text-amber-400/60">Try adjusting your filters or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
}