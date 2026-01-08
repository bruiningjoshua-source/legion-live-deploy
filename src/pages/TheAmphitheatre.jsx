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
  Play,
  Music,
  Flame,
  TrendingUp,
  Clock,
  Eye,
  Volume2,
  Share2,
  Plus,
  Library,
  ListMusic,
  Grid,
  LayoutList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GENRES = [
  'All',
  'Synthwave',
  'Lo-Fi',
  'Vaporwave',
  'Ambient',
  'House',
  'Chiptune',
  'Hip-Hop',
  'Indie',
  'Pop',
  'Rock',
  'Jazz',
  'Soul',
  'Classical',
  'Latin',
  'Reggae',
  'Trap',
  'Electronic'
];

export default function TheAmphitheatre() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [activeTab, setActiveTab] = useState('music');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: musicVideos = [], isLoading: musicLoading } = useQuery({
    queryKey: ['music-videos'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-created_date', 100),
    staleTime: 5 * 60 * 1000
  });

  const { data: vlogs = [], isLoading: vlogsLoading } = useQuery({
    queryKey: ['vlogs-amphitheatre'],
    queryFn: () => base44.entities.VlogVideo.filter({ is_published: true }, '-created_date', 100),
    staleTime: 5 * 60 * 1000
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-amphitheatre'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 50),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = useMemo(() =>
    creators.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {}), [creators]
  );

  const filteredContent = useMemo(() => {
    let content = [];

    if (activeTab === 'music' || activeTab === 'all') {
      content = [...content, ...musicVideos.map(m => ({
        ...m,
        type: 'music',
        title: m.title,
        thumbnail: m.thumbnail_url,
        creator: creatorMap[m.creator_id],
        views: m.view_count || 0,
        duration: m.duration_seconds || 0
      }))];
    }

    if (activeTab === 'vlogs' || activeTab === 'all') {
      content = [...content, ...vlogs.map(v => ({
        ...v,
        type: 'vlog',
        title: v.title,
        thumbnail: v.thumbnail_url,
        creator: creatorMap[v.creator_id],
        views: v.view_count || 0,
        duration: v.duration_seconds || 0
      }))];
    }

    // Filter by search
    if (searchQuery) {
      content = content.filter(c =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.creator?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by genre
    if (selectedGenre !== 'All') {
      content = content.filter(c => c.category === selectedGenre.toLowerCase());
    }

    // Sort by views (trending)
    content.sort((a, b) => b.views - a.views);

    return content;
  }, [musicVideos, vlogs, searchQuery, selectedGenre, activeTab, creatorMap]);

  const VideoCard = ({ content }) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="group cursor-pointer"
    >
      <Link to={content.type === 'music' ? createPageUrl(`WatchVideo?id=${content.id}`) : '#'}>
        <div className="relative aspect-video bg-gradient-to-br from-stone-800 to-stone-900 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all">
          {content.thumbnail ? (
            <img
              src={content.thumbnail}
              alt={content.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🎵</div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-amber-500/90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform">
                <Play className="w-7 h-7 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>

          {/* Duration */}
          {content.duration > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
              {Math.floor(content.duration / 60)}:{String(content.duration % 60).padStart(2, '0')}
            </div>
          )}

          {/* Type Badge */}
          <div className="absolute top-2 left-2">
            <Badge className={content.type === 'music' ? 'bg-purple-600' : 'bg-blue-600'}>
              {content.type === 'music' ? '♪ Music' : '🎬 Vlog'}
            </Badge>
          </div>
        </div>

        {/* Info */}
        <div className="mt-3">
          <h3 className="text-amber-100 font-semibold line-clamp-2 group-hover:text-amber-300 transition-colors">
            {content.title}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 overflow-hidden flex-shrink-0">
              {content.creator?.avatar_url ? (
                <img src={content.creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 text-sm truncate">{content.creator?.display_name || 'Creator'}</p>
              <p className="text-amber-400/60 text-xs">{content.views.toLocaleString()} views</p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  const isLoading = musicLoading || vlogsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2 flex items-center gap-3">
              <Music className="w-8 h-8 text-amber-400" />
              The Amphitheatre
            </h1>
            <p className="text-amber-400/70">Discover music, vlogs, and long-form content</p>
          </div>

          {user && (
            <Link to={createPageUrl('MusicStudio')}>
              <Button className="bg-amber-600 hover:bg-amber-700 hidden sm:flex">
                <Plus className="w-4 h-4 mr-2" />
                Upload
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
                placeholder="Search videos, creators..."
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
              {viewMode === 'grid' ? <LayoutList className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-amber-600/20 pb-4 overflow-x-auto">
            {[
              { id: 'all', label: 'All', icon: TrendingUp },
              { id: 'music', label: 'Music Videos', icon: Music },
              { id: 'vlogs', label: 'Vlogs', icon: Volume2 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-300 hover:bg-amber-800/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Genre Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedGenre === genre
                    ? 'bg-amber-600 text-white'
                    : 'bg-stone-800/50 text-amber-300 hover:bg-amber-800/20'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-xl bg-stone-800" />
            ))}
          </div>
        ) : filteredContent.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            <AnimatePresence>
              {filteredContent.map((content, i) => (
                <motion.div
                  key={content.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <VideoCard content={content} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
            <Music className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
            <h3 className="text-amber-100 font-semibold text-lg mb-2">No Content Found</h3>
            <p className="text-amber-400/60">Try adjusting your filters or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
}