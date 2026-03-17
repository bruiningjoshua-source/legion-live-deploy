import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Radio, Tv, Eye, ShoppingBag, Gift, Play, Users, ChevronRight, Sparkles } from 'lucide-react';

function LiveShopCard({ stream, creator }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="group relative"
      >
        <div className="relative aspect-[9/14] rounded-2xl overflow-hidden bg-black border border-white/[0.06]">
          {stream.thumbnail_url ? (
            <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-900/40 to-black flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-white/10" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> SHOP LIVE
            </span>
          </div>
          
          {stream.viewer_count > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
              <Eye className="w-2.5 h-2.5" />{stream.viewer_count.toLocaleString()}
            </div>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{creator?.display_name?.charAt(0) || '?'}</span>
                </div>
              )}
              <span className="text-white text-xs font-semibold truncate">{creator?.display_name || 'Creator'}</span>
            </div>
            <p className="text-white/80 text-xs font-medium line-clamp-2 leading-snug">{stream.title}</p>
            
            {/* Product count badge */}
            {stream.tags?.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <ShoppingBag className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-[10px] font-semibold">{stream.tags.length} products</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function AffiliateLiveSection() {
  const { data: liveStreams = [] } = useQuery({
    queryKey: ['affiliate-marketplace-live'],
    queryFn: () => base44.entities.Stream.filter(
      { status: 'live', platform_type: 'affiliate_marketplace' },
      '-viewer_count',
      20
    ),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Also grab regular live streams tagged with shopping
  const { data: shopStreams = [] } = useQuery({
    queryKey: ['affiliate-live-streams-tagged'],
    queryFn: () => base44.entities.AffiliateLiveStream.filter({ status: 'live' }, '-viewer_count', 12),
    staleTime: 30 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['affiliate-live-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 30),
    staleTime: 5 * 60 * 1000,
  });

  const creatorMap = creators.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

  const allLive = [...liveStreams, ...shopStreams.map(s => ({
    ...s,
    creator_id: s.creator_id,
  }))];

  if (allLive.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <Radio className="w-8 h-8 text-emerald-500/40" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">No Live Shopping Streams</h3>
        <p className="text-white/40 text-sm mb-6 max-w-xs mx-auto">
          Be the first to go live and showcase products to your audience
        </p>
        <Link to={createPageUrl('AffiliateGoLive')}>
          <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 h-10 rounded-xl transition-all active:scale-95 shadow-lg shadow-emerald-500/30 mx-auto">
            <Radio className="w-4 h-4" />
            Go Live Shopping
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-white font-bold text-base">Live Shopping</h3>
          <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {allLive.length} LIVE
          </span>
        </div>
        <Link to={createPageUrl('AffiliateGoLive')}>
          <button className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 h-8 rounded-xl transition-all active:scale-95">
            <Radio className="w-3.5 h-3.5" />
            Go Live
          </button>
        </Link>
      </div>

      {/* Live streams grid — TikTok-style vertical cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allLive.map(stream => (
          <LiveShopCard
            key={stream.id}
            stream={stream}
            creator={creatorMap[stream.creator_id]}
          />
        ))}
      </div>
    </div>
  );
}