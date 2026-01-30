import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Shuffle, 
  Clock, 
  Music, 
  Film, 
  Flame,
  Sparkles,
  ChevronRight,
  ListVideo
} from 'lucide-react';
import { motion } from 'framer-motion';

const PLAYLIST_TYPES = [
  { id: 'trending', label: 'Trending Now', icon: Flame, color: 'from-red-500 to-orange-500' },
  { id: 'new', label: 'Fresh Uploads', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  { id: 'music', label: 'Music Mix', icon: Music, color: 'from-green-500 to-teal-500' },
  { id: 'long', label: 'Deep Dives', icon: Clock, color: 'from-blue-500 to-indigo-500' },
  { id: 'random', label: 'Lucky Mix', icon: Shuffle, color: 'from-amber-500 to-yellow-500' },
];

export default function AutoPlaylist({ category, userInterests }) {
  const [selectedType, setSelectedType] = useState('trending');

  const { data: videos = [] } = useQuery({
    queryKey: ['auto-playlist-videos'],
    queryFn: () => base44.entities.VlogVideo.filter({ 
      is_published: true, 
      review_status: 'approved',
      visibility: 'public'
    }, '-created_date', 200),
    staleTime: 5 * 60 * 1000
  });

  const { data: musicVideos = [] } = useQuery({
    queryKey: ['auto-playlist-music'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-play_count', 100),
    staleTime: 5 * 60 * 1000
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['creators-map-playlist'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = useMemo(() => 
    creators.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [creators]
  );

  // Generate playlists based on type
  const playlist = useMemo(() => {
    let items = [];

    switch (selectedType) {
      case 'trending':
        items = [...videos]
          .sort((a, b) => {
            const scoreA = (a.view_count || 0) + (a.like_count || 0) * 3;
            const scoreB = (b.view_count || 0) + (b.like_count || 0) * 3;
            return scoreB - scoreA;
          })
          .slice(0, 25);
        break;

      case 'new':
        items = [...videos]
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
          .slice(0, 25);
        break;

      case 'music':
        const musicContent = musicVideos
          .filter(m => m.is_music_video || m.video_url)
          .map(m => ({
            ...m,
            contentType: 'music',
            thumbnail_url: m.cover_url,
            view_count: m.play_count
          }));
        items = musicContent.slice(0, 25);
        break;

      case 'long':
        items = [...videos]
          .filter(v => (v.duration_seconds || 0) > 600) // > 10 min
          .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
          .slice(0, 25);
        break;

      case 'random':
        const shuffled = [...videos].sort(() => Math.random() - 0.5);
        items = shuffled.slice(0, 25);
        break;

      default:
        items = videos.slice(0, 25);
    }

    return items.map(v => ({
      ...v,
      creator: creatorMap[v.creator_id]
    }));
  }, [selectedType, videos, musicVideos, creatorMap]);

  const totalDuration = useMemo(() => {
    const seconds = playlist.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  }, [playlist]);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoUrl = (video, index) => {
    const baseUrl = video.contentType === 'music' 
      ? `WatchVideo?id=${video.id}&type=music`
      : `WatchVideo?id=${video.id}`;
    return createPageUrl(baseUrl);
  };

  const currentPlaylistConfig = PLAYLIST_TYPES.find(p => p.id === selectedType);

  return (
    <div className="bg-stone-800/30 rounded-xl border border-amber-600/20 overflow-hidden">
      {/* Playlist Header */}
      <div className={`p-4 bg-gradient-to-r ${currentPlaylistConfig?.color || 'from-amber-500 to-orange-500'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ListVideo className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{currentPlaylistConfig?.label || 'Mix'}</h3>
              <p className="text-white/70 text-sm">{playlist.length} videos • {totalDuration}</p>
            </div>
          </div>
          {playlist.length > 0 && (
            <Link to={getVideoUrl(playlist[0], 0)}>
              <Button className="bg-white/20 hover:bg-white/30 text-white gap-2">
                <Play className="w-4 h-4" />
                Play All
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Playlist Type Selector */}
      <div className="flex gap-2 p-3 overflow-x-auto border-b border-amber-600/10">
        {PLAYLIST_TYPES.map(type => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                selectedType === type.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-700/50 text-amber-300/70 hover:bg-stone-700 hover:text-amber-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Playlist Items */}
      <ScrollArea className="h-[400px]">
        <div className="p-2">
          {playlist.map((video, index) => (
            <Link key={video.id} to={getVideoUrl(video, index)}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-700/30 transition-colors group"
              >
                <span className="text-amber-400/50 text-xs w-5 text-center font-mono">
                  {index + 1}
                </span>
                
                <div className="relative w-24 aspect-video rounded overflow-hidden bg-stone-900 shrink-0">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-5 h-5 text-amber-400/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  {video.duration_seconds && (
                    <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  )}
                  {video.contentType === 'music' && (
                    <Badge className="absolute top-0.5 left-0.5 bg-purple-600/90 text-white text-[10px] py-0 px-1">
                      ♪
                    </Badge>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-amber-100 text-sm font-medium line-clamp-2 group-hover:text-amber-200">
                    {video.title}
                  </h4>
                  <p className="text-amber-400/60 text-xs truncate">
                    {video.creator?.display_name || video.artist || 'Unknown'}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-amber-400/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </motion.div>
            </Link>
          ))}

          {playlist.length === 0 && (
            <div className="text-center py-12 text-amber-400/50">
              <ListVideo className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No videos available for this mix</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}