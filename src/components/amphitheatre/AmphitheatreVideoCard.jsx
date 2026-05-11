import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Play, Eye, ThumbsUp, Music, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function AmphitheatreVideoCard({ content, viewMode = 'grid', isShort = false }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (!views) return '0';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const videoUrl = content.type === 'music' 
    ? createPageUrl(`WatchVideo?id=${content.id}&type=music`)
    : createPageUrl(`WatchVideo?id=${content.id}`);

  if (viewMode === 'list') {
    return (
      <Link to={videoUrl}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="flex gap-4 bg-stone-800/30 rounded-xl overflow-hidden border border-amber-600/20 hover:border-amber-500/40 transition-all p-3"
        >
          {/* Thumbnail */}
          <div className="relative w-64 aspect-video bg-stone-900 rounded-lg overflow-hidden flex-shrink-0 group">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-stone-900">
                {content.type === 'music' ? (
                  <Music className="w-10 h-10 text-amber-400/40" />
                ) : (
                  <Play className="w-10 h-10 text-amber-400/40" />
                )}
              </div>
            )}
            
            {/* Play overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-12 h-12 bg-amber-500/90 rounded-full flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>

            {/* Duration */}
            {content.duration_seconds && (
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white font-medium">
                {formatDuration(content.duration_seconds)}
              </div>
            )}

            {/* Type badge */}
            {content.type === 'music' && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-purple-600 border-0 text-xs">♪ Music</Badge>
              </div>
            )}
            {content.video_type === 'short' && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-pink-600 border-0 text-xs">📱 Short</Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <h3 className="text-amber-100 font-semibold line-clamp-2 mb-2 text-lg">{content.title}</h3>
            <p className="text-amber-400/60 text-sm line-clamp-2 mb-3">{content.description}</p>
            
            <div className="flex items-center gap-3">
              <Link 
                to={createPageUrl(`CreatorProfile?id=${content.creator_id}`)}
                className="flex items-center gap-2 hover:opacity-80"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 overflow-hidden flex-shrink-0">
                  {content.creator?.avatar_url ? (
                    <img src={content.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                  )}
                </div>
                <span className="text-amber-300 text-sm flex items-center gap-1">
                  {content.creator?.display_name || 'Creator'}
                  {content.creator?.is_verified && <CheckCircle className="w-3 h-3 text-blue-400" />}
                </span>
              </Link>
              
              <span className="text-amber-400/50">•</span>
              <span className="text-amber-400/60 text-sm flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {formatViews(content.view_count)} views
              </span>
              <span className="text-amber-400/50">•</span>
              <span className="text-amber-400/60 text-sm">
                {content.created_date ? formatDistanceToNow(new Date(content.created_date), { addSuffix: true }) : ''}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Shorts display (vertical)
  if (isShort || content.video_type === 'short') {
    return (
      <Link to={videoUrl}>
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="group cursor-pointer"
        >
          <div className="relative aspect-[9/16] bg-stone-900 rounded-xl overflow-hidden border border-pink-600/30 group-hover:border-pink-500/60 transition-all">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-900/30 to-stone-900">
                <Play className="w-10 h-10 text-pink-400/40" />
              </div>
            )}

            {/* Play overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-pink-500/90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>

            {/* Short badge */}
            <div className="absolute top-2 left-2">
              <Badge className="bg-pink-600 border-0 text-xs">📱</Badge>
            </div>

            {/* Duration */}
            {content.duration_seconds && (
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs text-white font-medium">
                {formatDuration(content.duration_seconds)}
              </div>
            )}

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
              <h3 className="text-white font-semibold text-sm line-clamp-2">{content.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-white/70 text-xs">
                <span>{formatViews(content.view_count)}</span>
                <span>•</span>
                <ThumbsUp className="w-3 h-3" />
                <span>{formatViews(content.like_count)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={videoUrl}>
      <motion.div
        whileHover={{ scale: 1.03 }}
        className="group cursor-pointer"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-stone-900 rounded-xl overflow-hidden border border-amber-600/20 group-hover:border-amber-500/50 transition-all">
          {content.thumbnail_url ? (
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/30 to-stone-900">
              {content.type === 'music' ? (
                <Music className="w-12 h-12 text-amber-400/40" />
              ) : (
                <Play className="w-12 h-12 text-amber-400/40" />
              )}
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 bg-amber-500/90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform">
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>
          </div>

          {/* Duration */}
          {content.duration_seconds && (
            <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white font-medium">
              {formatDuration(content.duration_seconds)}
            </div>
          )}

          {/* Type badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {content.type === 'music' && (
              <Badge className="bg-purple-600 border-0 text-xs">♪ Music</Badge>
            )}
            {content.video_type === 'short' && (
              <Badge className="bg-pink-600 border-0 text-xs">📱 Short</Badge>
            )}
          </div>

          {/* Live badge for creator */}
          {content.creator?.is_live && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-red-500 border-0 text-xs animate-pulse">🔴 LIVE</Badge>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-3 flex gap-3">
          <Link 
            to={createPageUrl(`CreatorProfile?id=${content.creator_id}`)}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 overflow-hidden hover:ring-2 hover:ring-amber-500 transition-all">
              {content.creator?.avatar_url ? (
                <img src={content.creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
              )}
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-amber-100 font-semibold line-clamp-2 text-sm group-hover:text-amber-300 transition-colors">
              {content.title}
            </h3>
            <Link 
              to={createPageUrl(`CreatorProfile?id=${content.creator_id}`)}
              onClick={(e) => e.stopPropagation()}
              className="text-amber-400/70 text-xs hover:text-amber-300 flex items-center gap-1 mt-1"
            >
              {content.creator?.display_name || 'Creator'}
              {content.creator?.is_verified && <CheckCircle className="w-3 h-3 text-blue-400" />}
            </Link>
            <div className="text-amber-400/50 text-xs mt-1 flex items-center gap-1">
              <span>{formatViews(content.view_count)} views</span>
              <span>•</span>
              <span>{content.created_date ? formatDistanceToNow(new Date(content.created_date), { addSuffix: true }) : ''}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}