import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Tv, Gamepad2, Users, ShoppingBag, Radio, TrendingUp,
  Flame, ChevronRight, Eye, Sword, Star, Zap
} from 'lucide-react';

const hubs = [
  {
    name: 'The Colosseum',
    sub: 'Live Streams',
    path: 'TheAmphitheatre',
    icon: Tv,
    gradient: 'from-red-600/20 via-red-500/10 to-transparent',
    border: 'border-red-500/20',
    glow: 'shadow-red-500/10',
    accent: 'text-red-400',
    badge: 'LIVE',
    badgeColor: 'bg-red-500',
  },
  {
    name: 'Gaming Arena',
    sub: 'Tournaments & Games',
    path: 'GamesExpo',
    icon: Gamepad2,
    gradient: 'from-violet-600/20 via-violet-500/10 to-transparent',
    border: 'border-violet-500/20',
    glow: 'shadow-violet-500/10',
    accent: 'text-violet-400',
    badge: 'ARENA',
    badgeColor: 'bg-violet-600',
  },
  {
    name: 'The Senate',
    sub: 'Forums & Community',
    path: 'CommunityForums',
    icon: Users,
    gradient: 'from-sky-600/20 via-sky-500/10 to-transparent',
    border: 'border-sky-500/20',
    glow: 'shadow-sky-500/10',
    accent: 'text-sky-400',
    badge: 'FORUM',
    badgeColor: 'bg-sky-600',
  },
  {
    name: 'Merchant Hub',
    sub: 'Affiliate & Brands',
    path: 'AffiliateHub',
    icon: ShoppingBag,
    gradient: 'from-emerald-600/20 via-emerald-500/10 to-transparent',
    border: 'border-emerald-500/20',
    glow: 'shadow-emerald-500/10',
    accent: 'text-emerald-400',
    badge: 'EARN',
    badgeColor: 'bg-emerald-600',
  },
];

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } },
};

export default function Home() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ['home-live-streams'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 8),
    staleTime: 60 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['home-top-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 8),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen text-white">

      {/* Hero */}
      <section className="relative pt-20 pb-10 px-4 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-1/4 w-[200px] h-[200px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-screen-xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            {/* Welcome line */}
            {user && (
              <p className="text-white/40 text-sm mb-3 font-medium">
                Welcome back, <span className="text-amber-400">{user.full_name?.split(' ')[0]}</span>
              </p>
            )}

            {/* Hero title */}
            <h1 className="font-black text-3xl sm:text-5xl tracking-tight leading-none mb-3">
              <span className="text-white">LEGION</span>
              <span className="text-amber-400">LIVE</span>
            </h1>
            <p className="text-white/40 text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
              The premier Roman-inspired streaming empire. Battle. Create. Conquer.
            </p>

            {/* CTA row */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <Link to={createPageUrl('GoLive')}>
                <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-semibold text-sm px-5 h-10 rounded-xl transition-all shadow-lg shadow-red-500/25">
                  <Radio className="w-4 h-4" />
                  Go Live
                </button>
              </Link>
              <Link to={createPageUrl('TheAmphitheatre')}>
                <button className="flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] active:scale-95 text-white font-medium text-sm px-5 h-10 rounded-xl border border-white/[0.1] transition-all">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Watch Live
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Platform hubs grid */}
          <motion.div
            variants={stagger.container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {hubs.map(({ name, sub, path, icon: Icon, gradient, border, glow, accent, badge, badgeColor }) => (
              <motion.div key={name} variants={stagger.item}>
                <Link to={createPageUrl(path)}>
                  <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${gradient} border ${border} hover:border-opacity-50 shadow-lg ${glow} hover:shadow-xl transition-all duration-300 group overflow-hidden active:scale-[0.97]`}>
                    {/* Background texture */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/[0.02] rounded-2xl" />

                    <div className={`w-10 h-10 rounded-xl bg-white/[0.07] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-5 h-5 ${accent}`} />
                    </div>

                    <span className={`inline-block text-[9px] font-bold tracking-widest ${badgeColor} text-white px-2 py-0.5 rounded-md mb-2`}>
                      {badge}
                    </span>

                    <p className="text-white font-bold text-sm leading-tight">{name}</p>
                    <p className="text-white/40 text-xs mt-0.5">{sub}</p>

                    <ChevronRight className={`w-4 h-4 ${accent} absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300`} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Live right now */}
      {liveStreams.length > 0 && (
        <section className="px-4 pb-8">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-white font-bold text-base">Live Right Now</h2>
              </div>
              <Link to={createPageUrl('TheAmphitheatre')} className="flex items-center gap-1 text-amber-400 text-sm hover:text-amber-300 transition-colors">
                See all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {liveStreams.slice(0, 6).map((stream) => (
                <Link key={stream.id} to={createPageUrl('WatchStream') + `?id=${stream.id}`} className="flex-shrink-0">
                  <div className="w-44 group">
                    {/* Thumbnail */}
                    <div className="relative w-44 h-28 rounded-xl bg-white/[0.05] border border-white/[0.08] overflow-hidden mb-2">
                      {stream.thumbnail_url ? (
                        <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-900/40 to-black flex items-center justify-center">
                          <Tv className="w-8 h-8 text-white/20" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                      </div>
                      {stream.viewer_count > 0 && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
                          <Eye className="w-2.5 h-2.5" />
                          {stream.viewer_count.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <p className="text-white text-xs font-medium truncate">{stream.title}</p>
                    <p className="text-white/40 text-[10px] truncate mt-0.5">{stream.creator_id}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Creators */}
      {creators.length > 0 && (
        <section className="px-4 pb-12">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h2 className="text-white font-bold text-base">Top Creators</h2>
              </div>
              <Link to={createPageUrl('Explore')} className="flex items-center gap-1 text-amber-400 text-sm hover:text-amber-300 transition-colors">
                Browse <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {creators.slice(0, 8).map((creator) => (
                <Link key={creator.id} to={createPageUrl('CreatorProfile') + `?id=${creator.id}`} className="flex-shrink-0">
                  <div className="flex flex-col items-center gap-2 w-16 group">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/[0.08] group-hover:border-amber-500/40 transition-colors">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">{creator.display_name?.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      {creator.is_live && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 border-2 border-[#0d0d10] flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        </div>
                      )}
                    </div>
                    <p className="text-white/70 text-[10px] font-medium text-center truncate w-full">{creator.display_name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}