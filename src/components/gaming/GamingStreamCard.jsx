import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Eye, Play } from 'lucide-react';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function GamingStreamCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`} className="block group">
      <div className="space-y-2">
        {/* Thumbnail */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 hover:border-purple-400/40 transition-all group" style={{ aspectRatio: '16/9' }}>
          {stream.thumbnail_url ? (
            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-950 to-black flex items-center justify-center">
              <Play className="w-8 h-8 text-white/10" />
            </div>
          )}

          {/* Live badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
            LIVE
          </div>

          {/* Viewer count */}
          {stream.viewer_count > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/80 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
              <Eye className="w-2.5 h-2.5" />{formatCount(stream.viewer_count)}
            </div>
          )}

          {/* Hover play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <Play className="w-4 h-4 text-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="px-0.5">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{stream.title}</p>
          <p className="text-white/50 text-[10px] mt-1">{stream.creator_id}</p>
          {stream.viewer_count > 0 && (
            <p className="text-white/30 text-[10px] mt-0.5">{formatCount(stream.viewer_count)} viewers</p>
          )}
        </div>
      </div>
    </Link>
  );
}