import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Eye, Play, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GamingStreamCard({ stream, creator, viewMode = 'grid' }) {
  const isLive = stream.status === 'live';
  
  if (viewMode === 'list') {
    return (
      <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
        <motion.div 
          whileHover={{ scale: 1.01 }}
          className="flex gap-4 p-3 bg-stone-800/40 rounded-xl border border-purple-500/20 hover:border-purple-500/50 transition-all"
        >
          {/* Thumbnail */}
          <div className="relative w-48 aspect-video rounded-lg overflow-hidden flex-shrink-0">
            {stream.thumbnail_url ? (
              <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-stone-900 flex items-center justify-center text-3xl">🎮</div>
            )}
            {isLive && (
              <Badge className="absolute top-1 left-1 bg-red-600 text-white border-0 text-xs px-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse" />
                LIVE
              </Badge>
            )}
            <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-white text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {(stream.viewer_count || 0).toLocaleString()}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <h3 className="text-white font-semibold truncate mb-1">{stream.title}</h3>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-purple-600 overflow-hidden">
                {creator?.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                )}
              </div>
              <span className="text-purple-300 text-sm">{creator?.display_name || 'Unknown'}</span>
              {creator?.is_verified && <Badge className="bg-blue-500/20 text-blue-300 text-xs border-0">✓</Badge>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {stream.game_title && (
                <Badge className="bg-purple-600/30 text-purple-200 border-0 text-xs">{stream.game_title}</Badge>
              )}
              {stream.tags?.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="border-white/20 text-white/60 text-xs">{tag}</Badge>
              ))}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
      <motion.div whileHover={{ scale: 1.03, y: -4 }} className="group cursor-pointer">
        <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-stone-900 rounded-xl overflow-hidden border border-purple-500/20 hover:border-purple-500/50 transition-all shadow-lg hover:shadow-purple-500/20">
          {stream.thumbnail_url ? (
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-purple-800 to-indigo-900">🎮</div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 bg-purple-600/90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1.5">
            {isLive && (
              <Badge className="bg-red-600 text-white border-0 animate-pulse shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-ping" />
                LIVE
              </Badge>
            )}
          </div>

          {/* Viewer count */}
          <div className="absolute top-2 right-2">
            <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm">
              <Eye className="w-3 h-3 mr-1" />
              {(stream.viewer_count || 0).toLocaleString()}
            </Badge>
          </div>

          {/* Game badge */}
          {stream.game_title && (
            <div className="absolute bottom-12 left-2">
              <Badge className="bg-purple-600/90 text-white border-0 text-xs backdrop-blur-sm">
                🎮 {stream.game_title}
              </Badge>
            </div>
          )}

          {/* Creator info */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
            <h3 className="text-white font-semibold line-clamp-1 text-sm mb-1.5">{stream.title}</h3>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 overflow-hidden ring-2 ring-purple-500/50">
                {creator?.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                )}
              </div>
              <span className="text-purple-200 text-xs font-medium truncate">{creator?.display_name}</span>
              {creator?.follower_count > 1000 && (
                <span className="text-purple-400/60 text-xs">• {Math.floor(creator.follower_count / 1000)}K</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}