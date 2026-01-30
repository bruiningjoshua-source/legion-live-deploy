import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Eye, Play, Users, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GamingStreamCard({ stream, creator, viewMode = 'grid' }) {
  const isLive = stream.status === 'live';
  
  if (viewMode === 'list') {
    return (
      <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
        <motion.div 
          whileHover={{ scale: 1.01, x: 4 }}
          whileTap={{ scale: 0.99 }}
          className="flex gap-4 p-4 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] hover:bg-white/[0.06] hover:border-purple-500/30 transition-all"
        >
          {/* Thumbnail */}
          <div className="relative w-52 aspect-video rounded-xl overflow-hidden flex-shrink-0">
            {stream.thumbnail_url ? (
              <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center text-4xl">🎮</div>
            )}
            {isLive && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-500 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-xs font-bold">LIVE</span>
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-lg">
              <Eye className="w-3.5 h-3.5 text-white/80" />
              <span className="text-white text-xs font-medium">{(stream.viewer_count || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <h3 className="text-white font-semibold truncate mb-2 text-lg">{stream.title}</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 overflow-hidden ring-2 ring-purple-500/30">
                {creator?.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                )}
              </div>
              <span className="text-white/80 font-medium">{creator?.display_name || 'Unknown'}</span>
              {creator?.is_verified && <CheckCircle className="w-4 h-4 text-purple-400 fill-purple-400/20" />}
            </div>
            <div className="flex gap-2 flex-wrap">
              {stream.game_title && (
                <span className="inline-flex items-center gap-1.5 bg-purple-500/20 text-purple-200 px-3 py-1 rounded-lg text-xs font-medium">
                  🎮 {stream.game_title}
                </span>
              )}
              {stream.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="bg-white/5 text-white/50 px-2.5 py-1 rounded-lg text-xs">{tag}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
      <motion.div 
        whileHover={{ y: -6 }} 
        whileTap={{ scale: 0.98 }}
        className="group cursor-pointer"
      >
        <div className="relative aspect-video bg-white/[0.03] rounded-2xl overflow-hidden border border-white/[0.08] hover:border-purple-500/40 transition-all shadow-xl hover:shadow-purple-500/20">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.div 
              initial={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/50 group-hover:scale-100 transition-transform duration-300"
              style={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </motion.div>
          </div>

          {/* Live Badge */}
          {isLive && (
            <div className="absolute top-3 left-3">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 bg-red-500 px-3 py-1.5 rounded-xl shadow-lg shadow-red-500/40"
              >
                <motion.span 
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
              </motion.div>
            </div>
          )}

          {/* Viewer count */}
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
              <Eye className="w-3.5 h-3.5 text-white/80" />
              <span className="text-white text-xs font-medium">{(stream.viewer_count || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Game badge */}
          {stream.game_title && (
            <div className="absolute bottom-16 left-3">
              <span className="inline-flex items-center gap-1.5 bg-purple-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-medium">
                🎮 {stream.game_title}
              </span>
            </div>
          )}

          {/* Creator info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
            <h3 className="text-white font-semibold line-clamp-1 mb-2">{stream.title}</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 overflow-hidden ring-2 ring-purple-500/40">
                {creator?.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/90 text-sm font-medium truncate">{creator?.display_name}</span>
                {creator?.is_verified && <CheckCircle className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />}
              </div>
              {creator?.follower_count > 1000 && (
                <span className="text-white/40 text-xs ml-auto">{Math.floor(creator.follower_count / 1000)}K</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}