import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Search,
  TrendingUp,
  Clock,
  Eye,
  Heart,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';
import formatCount from '@/components/shared/FormatCount';

const categories = [
  { value: 'all', label: 'All' },
  { value: 'tech_reviews', label: 'Tech Reviews' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'food', label: 'Food' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'home_decor', label: 'Home & Decor' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'health_wellness', label: 'Health & Wellness' }
];

export default function Videos() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('shorts');

  const { data: shorts = [] } = useQuery({
    queryKey: ['videos-shorts', selectedCategory],
    queryFn: () => {
      const filter = { video_type: 'short', is_published: true };
      if (selectedCategory !== 'all') filter.category = selectedCategory;
      return base44.entities.VlogVideo.filter(filter, '-view_count', 50);
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  const { data: longForm = [] } = useQuery({
    queryKey: ['videos-long', selectedCategory],
    queryFn: () => {
      const filter = { video_type: 'long_form', is_published: true };
      if (selectedCategory !== 'all') filter.category = selectedCategory;
      return base44.entities.VlogVideo.filter(filter, '-view_count', 50);
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list(null, 100),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  const filterVideos = (videos) => {
    if (!searchQuery) return videos;
    return videos.filter(v => 
      v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredShorts = filterVideos(shorts);
  const filteredLongForm = filterVideos(longForm);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2 flex items-center gap-2">
            <Video className="w-8 h-8 text-amber-400" />
            Videos
          </h1>
          <p className="text-amber-400/70">Discover shorts and long-form content from creators</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/50" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(cat => (
            <Badge
              key={cat.value}
              className={`cursor-pointer transition-all ${
                selectedCategory === cat.value
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800/50 text-amber-300 hover:bg-stone-700/50'
              }`}
              onClick={() => setSelectedCategory(cat.value)}
            >
              {cat.label}
            </Badge>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-stone-800/50 border border-amber-600/20 mb-6">
            <TabsTrigger value="shorts" className="data-[state=active]:bg-amber-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Shorts
              <Badge className="ml-2 bg-amber-500/20">{filteredShorts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="long" className="data-[state=active]:bg-amber-600">
              <Clock className="w-4 h-4 mr-2" />
              Long Form
              <Badge className="ml-2 bg-amber-500/20">{filteredLongForm.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shorts">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredShorts.map((video, i) => (
                <VideoCard key={video.id} video={video} creator={creatorMap[video.creator_id]} index={i} />
              ))}
            </div>
            {filteredShorts.length === 0 && (
              <div className="text-center py-20">
                <Video className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                <p className="text-amber-400/70">No shorts found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="long">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredLongForm.map((video, i) => (
                <VideoCard key={video.id} video={video} creator={creatorMap[video.creator_id]} index={i} />
              ))}
            </div>
            {filteredLongForm.length === 0 && (
              <div className="text-center py-20">
                <Video className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                <p className="text-amber-400/70">No long-form videos found</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function VideoCard({ video, creator, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.25 }}
    >
      <Link to={createPageUrl(`WatchVideo?id=${video.id}`)}>
        <div className="bg-stone-800/30 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer group">
          <div className="relative aspect-[9/16] sm:aspect-video bg-stone-950">
            {video.thumbnail_url ? (
              <img src={video.thumbnail_url} className="w-full h-full object-cover" alt={video.title} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-12 h-12 text-amber-400/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-12 h-12 text-white" />
            </div>
            {video.duration_seconds && (
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                {Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
          <div className="p-3">
            <div className="flex items-start gap-2 mb-2">
              {creator?.avatar_url && (
                <img src={creator.avatar_url} className="w-8 h-8 rounded-full flex-shrink-0" alt="" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-amber-100 font-semibold text-sm line-clamp-2 mb-1">{video.title}</h3>
                <p className="text-amber-400/60 text-xs">{creator?.display_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-amber-400/70">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {formatCount(video.view_count)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {formatCount(video.like_count)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}