import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Clock, Play, Shuffle, ListVideo } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RecommendedVideos({ 
  currentVideoId, 
  currentVideo,
  autoplay,
  onAutoplayChange,
  onVideoSelect 
}) {
  // Fetch all published videos
  const { data: allVideos = [], isLoading } = useQuery({
    queryKey: ['recommended-videos-pool'],
    queryFn: () => base44.entities.VlogVideo.filter({ 
      is_published: true, 
      review_status: 'approved',
      visibility: 'public'
    }, '-view_count', 100),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Fetch music content
  const { data: musicVideos = [] } = useQuery({
    queryKey: ['recommended-music-pool'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-play_count', 50),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Fetch creators for display names
  const { data: creators = [] } = useQuery({
    queryKey: ['creators-map'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const creatorMap = useMemo(() => 
    creators.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [creators]
  );

  // Build recommended list based on current video
  const recommendedVideos = useMemo(() => {
    const currentCategory = currentVideo?.category || currentVideo?.genre;
    const currentTags = currentVideo?.tags || [];
    const currentCreatorId = currentVideo?.creator_id;

    // Combine and normalize
    const allContent = [
      ...allVideos.map(v => ({ ...v, contentType: 'video' })),
      ...musicVideos.filter(m => m.is_music_video).map(m => ({ 
        ...m, 
        contentType: 'music',
        view_count: m.play_count,
        thumbnail_url: m.cover_url
      }))
    ].filter(v => v.id !== currentVideoId);

    // Score each video for relevance
    const scored = allContent.map(video => {
      let score = 0;
      
      // Same category = high relevance
      if (video.category === currentCategory || video.genre === currentCategory) {
        score += 50;
      }
      
      // Same creator = medium-high relevance
      if (video.creator_id === currentCreatorId) {
        score += 30;
      }
      
      // Matching tags
      const videoTags = video.tags || [];
      const matchingTags = videoTags.filter(t => currentTags.includes(t)).length;
      score += matchingTags * 10;
      
      // Popularity boost
      score += Math.min((video.view_count || 0) / 1000, 20);
      
      // Recency boost
      const daysOld = (Date.now() - new Date(video.created_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld < 7) score += 15;
      else if (daysOld < 30) score += 5;
      
      return { ...video, relevanceScore: score };
    });

    // Sort by relevance, then shuffle within similar scores for variety
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return scored.slice(0, 20);
  }, [allVideos, musicVideos, currentVideoId, currentVideo]);

  // Get "Up Next" video (first in recommendations)
  const upNextVideo = recommendedVideos[0];

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getVideoUrl = (video) => {
    if (video.contentType === 'music') {
      return createPageUrl(`WatchVideo?id=${video.id}&type=music`);
    }
    return createPageUrl(`WatchVideo?id=${video.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32 bg-stone-800" />
          <Skeleton className="h-6 w-20 bg-stone-800" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton className="w-40 h-24 rounded-lg bg-stone-800 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full bg-stone-800" />
              <Skeleton className="h-3 w-3/4 bg-stone-800" />
              <Skeleton className="h-3 w-1/2 bg-stone-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Autoplay Toggle */}
      <div className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg border border-amber-600/20">
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-amber-400" />
          <span className="text-amber-100 text-sm font-medium">Autoplay</span>
        </div>
        <Switch 
          checked={autoplay} 
          onCheckedChange={onAutoplayChange}
          className="data-[state=checked]:bg-amber-600"
        />
      </div>

      {/* Up Next */}
      {upNextVideo && (
        <div className="bg-stone-800/30 rounded-lg border border-amber-600/30 overflow-hidden">
          <div className="p-3 border-b border-amber-600/20">
            <div className="flex items-center justify-between">
              <span className="text-amber-100 font-semibold text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-red-500" />
                Up Next
              </span>
              {autoplay && (
                <Badge className="bg-red-600/20 text-red-300 border-red-500/30 text-xs">
                  Auto-playing
                </Badge>
              )}
            </div>
          </div>
          <Link 
            to={getVideoUrl(upNextVideo)}
            onClick={() => onVideoSelect?.(upNextVideo)}
            className="block p-3 hover:bg-stone-700/30 transition-colors"
          >
            <div className="flex gap-3">
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-stone-900 shrink-0">
                {upNextVideo.thumbnail_url ? (
                  <img 
                    src={upNextVideo.thumbnail_url} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-amber-400/30" />
                  </div>
                )}
                {upNextVideo.duration_seconds && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {formatDuration(upNextVideo.duration_seconds)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-amber-100 font-medium text-sm line-clamp-2 mb-1">
                  {upNextVideo.title}
                </h4>
                <p className="text-amber-400/60 text-xs mb-1">
                  {creatorMap[upNextVideo.creator_id]?.display_name || 'Unknown'}
                </p>
                <p className="text-amber-400/50 text-xs">
                  {formatViews(upNextVideo.view_count)} views
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-2">
        <h3 className="text-amber-100 font-semibold text-sm px-1">Recommended</h3>
        {recommendedVideos.slice(1).map((video, i) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
          >
            <Link 
              to={getVideoUrl(video)}
              onClick={() => onVideoSelect?.(video)}
              className="flex gap-2 p-2 rounded-lg hover:bg-stone-800/50 transition-colors group"
            >
              <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-stone-900 shrink-0">
                {video.thumbnail_url ? (
                  <img 
                    src={video.thumbnail_url} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-amber-400/30" />
                  </div>
                )}
                {video.duration_seconds && (
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                    {formatDuration(video.duration_seconds)}
                  </span>
                )}
                {video.contentType === 'music' && (
                  <Badge className="absolute top-1 left-1 bg-purple-600/90 text-white text-xs py-0 px-1">
                    ♪
                  </Badge>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-amber-100 text-sm font-medium line-clamp-2 mb-1 group-hover:text-amber-200">
                  {video.title}
                </h4>
                <p className="text-amber-400/60 text-xs mb-0.5 truncate">
                  {creatorMap[video.creator_id]?.display_name || video.artist || 'Unknown'}
                </p>
                <div className="flex items-center gap-2 text-amber-400/50 text-xs">
                  <span>{formatViews(video.view_count)} views</span>
                  {video.category && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{video.category.replace('_', ' ')}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {recommendedVideos.length === 0 && (
        <div className="text-center py-8 text-amber-400/50">
          <Shuffle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No recommendations yet</p>
        </div>
      )}
    </div>
  );
}