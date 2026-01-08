import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Users, Eye, Swords, Crown, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StreamCard({ stream, creator }) {
  const streamTypeStyles = {
    solo: { label: 'LIVE', color: 'bg-red-500' },
    multi_panel: { label: 'PANEL', color: 'bg-purple-500' },
    pk_battle: { label: 'PK BATTLE', color: 'bg-orange-500' }
  };

  const typeConfig = streamTypeStyles[stream.stream_type] || streamTypeStyles.solo;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={createPageUrl(`WatchStream?id=${stream.id}`)}>
        <div className="relative group cursor-pointer">
          {/* Thumbnail Container - Portrait optimized */}
          <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-br from-stone-800 to-stone-900 border border-amber-600/20 group-hover:border-amber-500/50 transition-all shadow-xl">
            {stream.thumbnail_url ? (
              <img 
                src={stream.thumbnail_url} 
                alt={stream.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-6xl opacity-50">🏛️</div>
              </div>
            )}

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Live Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Badge className={`${typeConfig.color} text-white border-0 font-bold animate-pulse`}>
                <span className="w-2 h-2 bg-white rounded-full mr-1.5 animate-ping" />
                {typeConfig.label}
              </Badge>
              {stream.is_featured && (
                <Badge className="bg-amber-500 text-white border-0">
                  <Star className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>

            {/* Viewer Count */}
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="bg-black/60 text-white border-0">
                <Eye className="w-3 h-3 mr-1" />
                {(stream.viewer_count || 0).toLocaleString()}
              </Badge>
            </div>

            {/* PK Battle Indicator */}
            {stream.stream_type === 'pk_battle' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-orange-500 rounded-full p-3 animate-bounce shadow-lg shadow-orange-500/50">
                  <Swords className="w-6 h-6 text-white" />
                </div>
              </div>
            )}

            {/* Stream Info */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-semibold text-lg line-clamp-1 mb-2">{stream.title}</h3>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-400 overflow-hidden">
                  {creator?.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-100 font-medium text-sm truncate">{creator?.display_name || 'Legionnaire'}</span>
                    {creator?.is_verified && (
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <span className="text-amber-400/70 text-xs capitalize">{stream.category?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}