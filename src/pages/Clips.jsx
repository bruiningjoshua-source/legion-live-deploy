import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors, Play, Eye, Heart, Search, TrendingUp, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

export default function ClipsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: clips = [], isLoading } = useQuery({
    queryKey: ['all-clips', sortBy],
    queryFn: () => base44.entities.Clip.list(
      sortBy === 'recent' ? '-created_date' : '-view_count',
      100
    )
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['clip-creators', clips.map(c => c.creator_id)],
    queryFn: async () => {
      const creatorIds = [...new Set(clips.map(c => c.creator_id))];
      const results = await Promise.all(
        creatorIds.map(async (id) => {
          const c = await base44.entities.Creator.filter({ user_email: id }, null, 1);
          return c[0];
        })
      );
      return results.filter(Boolean);
    },
    enabled: clips.length > 0
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.user_email] = c;
    return acc;
  }, {});

  const myClips = clips.filter(c => c.clipper_email === user?.email);
  const featuredClips = clips.filter(c => c.is_featured);
  
  const filteredClips = clips.filter(c =>
    c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    creatorMap[c.creator_id]?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ClipCard = ({ clip, index }) => {
    const creator = creatorMap[clip.creator_id];

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.25 }}
      >
        <Card className="bg-stone-800/50 border-amber-600/20 overflow-hidden hover:border-amber-500/40 transition-all group">
          <div className="relative aspect-video">
            {clip.thumbnail_url ? (
              <img
                src={clip.thumbnail_url}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <div className="w-full h-full bg-stone-700 flex items-center justify-center">
                <Scissors className="w-12 h-12 text-amber-400/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-12 h-12 text-white" />
            </div>
            {clip.duration_seconds && (
              <Badge className="absolute bottom-2 right-2 bg-black/80 text-white">
                {clip.duration_seconds}s
              </Badge>
            )}
            {clip.is_featured && (
              <Badge className="absolute top-2 left-2 bg-amber-600 text-white">
                Featured
              </Badge>
            )}
          </div>
          <CardContent className="p-3">
            <h3 className="text-amber-100 font-medium line-clamp-2 mb-2">{clip.title}</h3>
            
            <Link 
              to={createPageUrl(`CreatorProfile?id=${creator?.id}`)}
              className="flex items-center gap-2 mb-2"
            >
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} className="w-6 h-6 rounded-full" alt="" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-600/30 flex items-center justify-center">
                  <User className="w-3 h-3 text-amber-400" />
                </div>
              )}
              <span className="text-amber-400/70 text-sm hover:text-amber-300">
                {creator?.display_name || 'Unknown'}
              </span>
            </Link>

            <div className="flex items-center justify-between text-xs text-amber-400/50">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {clip.view_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {clip.like_count || 0}
                </span>
              </div>
              <span>{formatDistanceToNow(new Date(clip.created_date), { addSuffix: true })}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050508] pb-12">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Scissors className="w-8 h-8 text-amber-400" />
            <h1 className="text-3xl font-bold text-amber-100">Clips</h1>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
            <Input
              placeholder="Search clips..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-stone-800/50 border-amber-600/30 text-amber-100"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'recent' ? 'default' : 'outline'}
              onClick={() => setSortBy('recent')}
              className={sortBy === 'recent' ? 'bg-amber-600' : 'border-amber-600/30'}
            >
              <Clock className="w-4 h-4 mr-1" />
              Recent
            </Button>
            <Button
              variant={sortBy === 'popular' ? 'default' : 'outline'}
              onClick={() => setSortBy('popular')}
              className={sortBy === 'popular' ? 'bg-amber-600' : 'border-amber-600/30'}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Popular
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-stone-800/50 mb-6">
            <TabsTrigger value="all">All Clips</TabsTrigger>
            <TabsTrigger value="featured">Featured</TabsTrigger>
            {user && <TabsTrigger value="my">My Clips</TabsTrigger>}
          </TabsList>

          <TabsContent value="all">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="aspect-video bg-stone-800/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClips.map((clip, index) => (
                  <ClipCard key={clip.id} clip={clip} index={index} />
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="p-12 text-center">
                  <Scissors className="w-16 h-16 mx-auto mb-4 text-amber-400/30" />
                  <h2 className="text-xl font-semibold text-amber-100 mb-2">No clips found</h2>
                  <p className="text-amber-400/70">
                    {searchQuery ? 'Try a different search term' : 'Be the first to create a clip!'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="featured">
            {featuredClips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredClips.map((clip, index) => (
                  <ClipCard key={clip.id} clip={clip} index={index} />
                ))}
              </div>
            ) : (
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardContent className="p-12 text-center">
                  <Scissors className="w-16 h-16 mx-auto mb-4 text-amber-400/30" />
                  <h2 className="text-xl font-semibold text-amber-100 mb-2">No featured clips</h2>
                  <p className="text-amber-400/70">Featured clips will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {user && (
            <TabsContent value="my">
              {myClips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myClips.map((clip, index) => (
                    <ClipCard key={clip.id} clip={clip} index={index} />
                  ))}
                </div>
              ) : (
                <Card className="bg-stone-800/30 border-amber-600/20">
                  <CardContent className="p-12 text-center">
                    <Scissors className="w-16 h-16 mx-auto mb-4 text-amber-400/30" />
                    <h2 className="text-xl font-semibold text-amber-100 mb-2">No clips yet</h2>
                    <p className="text-amber-400/70">
                      Click the clip button while watching a stream to create clips
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}