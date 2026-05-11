import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Tv, Gamepad2, Users, ShoppingBag, Radio,
  Flame, ChevronRight, Eye, Star, Film, Mic,
  TrendingUp, Sword, Globe
} from 'lucide-react';

// Platform hub definitions
const hubs = [
  {
    name: 'Live',
    sub: 'Watch & Stream',
    path: 'TheAmphitheatre',
    icon: Tv,
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.35)',
    badge: 'LIVE',
  },
  {
    name: 'Videos',
    sub: 'VOD & Shorts',
    path: 'TheAmphitheatre',
    icon: Film,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.35)',
    badge: 'VOD',
  },
  {
    name: 'Gaming',
    sub: 'Tournaments',
    path: 'GamesExpo',
    icon: Gamepad2,
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.35)',
    badge: 'GG',
  },
  {
    name: 'Shop',
    sub: 'Earn & Buy',
    path: 'AffiliateHub',
    icon: ShoppingBag,
    color: '#10b981',
    glow: 'rgba(16,185,129,0.35)',
    badge: 'EARN',
  },
  {
    name: 'Senate',
    sub: 'Community',
    path: 'CommunityForums',
    icon: Users,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    badge: 'FORUM',
  },
  {
    name: 'Podcasts',
    sub: 'Audio Shows',
    path: 'Podcasts',
    icon: Mic,
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.35)',
    badge: 'POD',
  },
  {
    name: 'Spaces',
    sub: '3D Social World',
    path: 'LegionSpaces',
    icon: Globe,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.35)',
    badge: '3D',
  },
];

function HubIcon({ hub }) {
  const Icon = hub.icon;
  return (
    <Link to={createPageUrl(hub.path)}>
      <motion.div
        whileTap={{ scale: 0.92 }}
        className="flex flex-col items-center gap-2 group"
      >
        {/* Icon bubble — black with crimson icon */}
        <div
          className="w-16 h-16 rounded-[22px] flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:scale-105 bg-black border border-amber-600/30"
          style={{
            boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,119,6,0.2)`,
          }}
        >
          <Icon className="w-7 h-7 text-amber-500 relative z-10 drop-shadow-sm" />
        </div>
        {/* Label */}
        <div className="text-center">
          <p className="text-white text-xs font-semibold leading-tight">{hub.name}</p>
          <p className="text-white/40 text-[10px] leading-tight">{hub.sub}</p>
        </div>
      </motion.div>
    </Link>
  );
}

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ['home-live-streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live', platform_type: 'legion_live' }, '-viewer_count', 8),
    staleTime: 60 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['home-top-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 8),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen text-white relative">

      {/* ── Roman Cinematic Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Deep base */}
        <div className="absolute inset-0 bg-[#0a0608]" />
        {/* Warm gold ambient top */}
        <div className="absolute top-0 left-0 right-0 h-[55vh] bg-gradient-to-b from-[#3d1a00]/60 via-[#1a0800]/40 to-transparent" />
        {/* Red crimson side glow */}
        <div className="absolute top-0 right-0 w-1/2 h-[40vh] bg-gradient-to-bl from-[#7a0000]/30 to-transparent" />
        {/* Gold center beacon */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-[#c8800020] blur-[80px]" />
        {/* Subtle column texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, #d97706 0px, transparent 1px, transparent 80px, #d97706 81px)`,
            backgroundSize: '80px 100%',
          }}
        />
        {/* Bottom fade to app dark */}
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#09090b] to-transparent" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10">

        {/* Hero Header */}
        <section className="pt-20 pb-6 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {user && (
              <p className="text-amber-400/70 text-sm mb-2 font-medium">
                Ave, <span className="text-amber-300 font-bold">{user.full_name?.split(' ')[0]}</span>
              </p>
            )}

            {/* Logo mark */}
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Sword className="w-4 h-4 text-white" />
              </div>
              <h1 className="font-black text-4xl tracking-tight text-white drop-shadow-lg" style={{ textShadow: '0 0 40px rgba(245,158,11,0.4)' }}>
                LEGION<span className="text-amber-400">LIVE</span>
              </h1>
            </div>
            <p className="text-white/35 text-xs tracking-[0.2em] uppercase">Stream · Create · Conquer</p>

            {/* CTAs */}
            <div className="flex items-center justify-center gap-3 mt-5">
              <Link to={createPageUrl('GoLive')}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-2 text-white font-bold text-sm px-6 h-11 rounded-2xl transition-all shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
                  }}
                >
                  <Radio className="w-4 h-4" />
                  Go Live
                </motion.button>
              </Link>
              <Link to={createPageUrl('TheAmphitheatre')}>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-2 text-white/80 font-semibold text-sm px-5 h-11 rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm hover:bg-white/[0.1] transition-all"
                >
                  <Flame className="w-4 h-4 text-amber-400" />
                  Watch Live
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ── Platform Hub Grid (the redesigned menu) ── */}
        <section className="px-6 pb-8">
          <div className="max-w-sm mx-auto">
            {/* Top row: 4 icons */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-4 gap-4 justify-items-center mb-5"
            >
              {hubs.slice(0, 4).map(hub => (
                <HubIcon key={hub.name} hub={hub} />
              ))}
            </motion.div>
            {/* Bottom row: 3 icons */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="grid grid-cols-3 gap-5 justify-items-center"
            >
              {hubs.slice(4, 7).map(hub => (
                <HubIcon key={hub.name} hub={hub} />
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Live Right Now ── */}
        {liveStreams.length > 0 && (
          <section className="px-4 pb-6">
            <div className="max-w-screen-xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="text-white font-bold text-sm">Live Right Now</h2>
                </div>
                <Link to={createPageUrl('TheAmphitheatre')} className="flex items-center gap-1 text-amber-400 text-xs font-medium hover:text-amber-300">
                  See all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {liveStreams.slice(0, 6).map((stream) => (
                  <Link key={stream.id} to={createPageUrl('WatchStream') + `?id=${stream.id}`} className="flex-shrink-0">
                    <div className="w-40 group">
                      <div className="relative w-40 h-24 rounded-xl bg-white/[0.05] border border-white/[0.08] overflow-hidden mb-1.5">
                        {stream.thumbnail_url ? (
                          <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-900/40 to-black flex items-center justify-center">
                            <Tv className="w-6 h-6 text-white/20" />
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                          <span className="w-1 h-1 rounded-full bg-white" />LIVE
                        </div>
                        {stream.viewer_count > 0 && (
                          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/70 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
                            <Eye className="w-2.5 h-2.5" />{stream.viewer_count.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <p className="text-white text-[11px] font-semibold truncate">{stream.title}</p>
                      <p className="text-white/40 text-[10px] truncate">{stream.creator_id}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Top Creators ── */}
        {creators.length > 0 && (
          <section className="px-4 pb-16">
            <div className="max-w-screen-xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <h2 className="text-white font-bold text-sm">Top Creators</h2>
                </div>
                <Link to={createPageUrl('Explore')} className="flex items-center gap-1 text-amber-400 text-xs font-medium hover:text-amber-300">
                  Browse <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
                {creators.slice(0, 8).map((creator) => (
                  <Link key={creator.id} to={createPageUrl('CreatorProfile') + `?id=${creator.id}`} className="flex-shrink-0">
                    <div className="flex flex-col items-center gap-1.5 w-14 group">
                      <div className="relative">
                        <div className="w-13 h-13 w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/[0.08] group-hover:border-amber-500/50 transition-colors">
                          {creator.avatar_url ? (
                            <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                              <span className="text-white font-bold">{creator.display_name?.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        {creator.is_live && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-[#0a0608]" />
                        )}
                      </div>
                      <p className="text-white/60 text-[10px] font-medium text-center truncate w-full">{creator.display_name}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}