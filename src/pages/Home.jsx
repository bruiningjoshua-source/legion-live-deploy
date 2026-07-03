import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Flame, ChevronRight, Radio, Gamepad2, Compass, ShoppingBag, Users, Mic2, Film } from 'lucide-react';

const ICON_MAP = { Radio, Gamepad2, Compass, ShoppingBag, Users, Mic2, Film };
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';

const HUBS = [
  { name:'Watch',    sub:'Live Streams', path:'TheAmphitheatre', icon:'Radio',    color:'#ef4444', badge:'WATCH' },
  { name:'Gaming',   sub:'Tournaments',path:'GamesExpo',       icon:'Gamepad2', color:'#3b82f6', badge:'GG'   },
  { name:'Discover', sub:'Explore',    path:'Explore',         icon:'Compass',  color:'#8b5cf6', badge:'NEW'  },
  { name:'Shop',     sub:'Earn',       path:'AffiliateHub',    icon:'ShoppingBag',color:'#10b981',badge:'EARN' },
  { name:'Senate',   sub:'Community',  path:'CommunityForums', icon:'Users',    color:'#f59e0b', badge:'TALK' },
  { name:'Sounds',   sub:'Podcasts',   path:'Podcasts',        icon:'Mic2',     color:'#ec4899', badge:'POD'  },
];

const CATS = ['All','Gaming','Music','Talk Show','Dance','Fitness','Art','Comedy'];

const stagger = { hidden:{}, show:{ transition:{ staggerChildren:0.04 } } };
const item    = { hidden:{ opacity:0, y:10 }, show:{ opacity:1, y:0, transition:{ duration:0.25 } } };

export default function Home() {
  const [cat, setCat] = useState('All');

  const { data: streams = [], isLoading } = useQuery({
    queryKey:['streams-home'],
    queryFn: () => base44.entities.Stream.filter({ status:'live' }, '-viewer_count', 30),
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: 1,
  });

  const { data: user } = useQuery({
    queryKey:['current-user'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  const filtered = useMemo(() => {
    if (cat === 'All') return streams;
    return streams.filter(s => s.category?.toLowerCase() === cat.toLowerCase().replace(' ','_'));
  }, [streams, cat]);

  return (
    <div className="ll-page-enter min-h-screen bg-[#050508] pb-24">

      {/* ── Hero greeting ──────────────────────────────────────── */}
      <div className="relative px-4 pt-4 pb-4 overflow-hidden">
        <div className="ll-glow-gold -top-20 -left-20" />
        <div className="relative">
          <p className="ll-label text-white/30 mb-0.5">
            {new Date().toLocaleDateString('en-US',{ weekday:'long' }).toUpperCase()} · {streams.length > 0 ? `${streams.length} LIVE` : 'LIVE'}
          </p>
          <h1 className="ll-display text-[28px] text-white">
            {user?.full_name ? `Hey, ${user.full_name.split(' ')[0]}` : 'Legion Live'}
            <span className="ll-gold-text">.</span>
          </h1>
        </div>
      </div>

      {/* ── Hub grid ───────────────────────────────────────────── */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {HUBS.map((hub, i) => (
            <Link key={hub.name} to={createPageUrl(hub.path)}>
              <motion.div
                whileTap={{ scale: 0.93 }}
                transition={{ type:'spring', stiffness:500, damping:25 }}
                className="ll-interactive relative overflow-hidden p-3 rounded-xl flex flex-col min-h-[104px]"
                style={{
                  background: 'linear-gradient(145deg, #1a1510 0%, #12100a 100%)',
                  border: '1px solid rgba(200,135,26,0.2)',
                  boxShadow: 'inset 0 1px 0 rgba(200,135,26,0.1), inset 0 -1px 0 rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.4)',
                }}
              >
                {/* Badge */}
                <div className="absolute top-1.5 right-2">
                  <span className="text-[8px] font-bold tracking-widest" style={{ color: 'rgba(200,135,26,0.7)', fontFamily: "'Cinzel', serif" }}>{hub.badge}</span>
                </div>
                {/* Icon */}
                {(() => { const Icon = ICON_MAP[hub.icon]; return (
                  <div className="w-7 h-7 mb-2 flex items-center justify-center rounded-lg" style={{ background: 'rgba(200,135,26,0.12)', border: '1px solid rgba(200,135,26,0.2)' }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: '#c8871a' }} />
                  </div>
                ); })()}
                <div className="mt-auto">
                  <p className="font-bold text-xs leading-tight truncate" style={{ color: '#e8dcc8', fontFamily: "'Cinzel', serif" }}>{hub.name}</p>
                  <p className="text-[9px] font-medium mt-0.5 truncate" style={{ color: 'rgba(200,135,26,0.5)' }}>{hub.sub}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Live now section ───────────────────────────────────── */}
      <div className="px-4">
        {/* Header */}
        <div className="ll-section-header">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="ll-section-title">Live Now</span>
          </div>
          <Link to={createPageUrl('Explore')} className="ll-section-action flex items-center gap-0.5">
            See all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-4 pb-0.5">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className="shrink-0 ll-interactive px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: cat === c ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${cat === c ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: cat === c ? '#ffc156' : 'rgba(255,255,255,0.5)',
              }}>
              {c}
            </button>
          ))}
        </div>

        {/* Stream grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_,i) => (
              <div key={i} className="aspect-[9/16] ll-skeleton rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl ll-card flex items-center justify-center mb-3">
              <Radio className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-white/40 font-medium text-sm">No live streams right now</p>
            <p className="text-white/20 text-xs mt-1">Check back soon or explore creators</p>
            <Link to={createPageUrl('Explore')}
              className="mt-4 px-5 py-2 rounded-full text-xs font-bold ll-interactive"
              style={{ background:'rgba(245,166,35,0.12)', border:'1px solid rgba(245,166,35,0.3)', color:'#f5a623' }}>
              Explore Creators
            </Link>
          </div>
        ) : (
          <motion.div
            variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-2 gap-3">
            {filtered.slice(0, 12).map((stream, i) => (
              <motion.div key={stream.id} variants={item}>
                <PremiumStreamCard stream={stream} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Trending up CTA */}
        {!isLoading && filtered.length > 0 && (
          <Link to={createPageUrl('Explore')}>
            <div className="mt-4 ll-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl ll-card-inset flex items-center justify-center">
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Explore more</p>
                  <p className="text-white/35 text-xs">Creators, clips & VODs</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
