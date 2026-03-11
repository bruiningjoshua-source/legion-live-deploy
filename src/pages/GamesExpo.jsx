import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Gamepad2, Trophy, Zap, Sword, ChevronRight,
  Users, Clock, Star, Flame, Crown, Play, Target
} from 'lucide-react';

const TABS = ['Live Tournaments', 'Upcoming', 'Past Results'];
const GAME_FILTERS = ['All', 'Retro', 'Fighting', 'Shooter', 'Strategy'];

function TournamentCard({ tournament }) {
  const statusColors = {
    live:     { bg: 'bg-red-500/15',    border: 'border-red-500/25',    text: 'text-red-400',    badge: 'bg-red-500' },
    upcoming: { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  badge: 'bg-amber-500' },
    finished: { bg: 'bg-white/[0.03]',  border: 'border-white/[0.07]',  text: 'text-white/40',   badge: 'bg-white/20' },
  };
  const s = statusColors[tournament.status] || statusColors.upcoming;
  const prize = ((tournament.prize_pool_denarii || 0) / 65 * 0.7).toFixed(0);

  return (
    <div className={`relative p-4 rounded-2xl ${s.bg} border ${s.border} hover:border-opacity-60 transition-all duration-200 group active:scale-[0.98]`}>
      {/* Status badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase ${s.badge} text-white px-2 py-0.5 rounded-lg`}>
          {tournament.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          {tournament.status}
        </span>
        <span className="text-white/30 text-[10px]">{tournament.game_type}</span>
      </div>

      <p className="text-white font-bold text-sm mb-1 line-clamp-1">{tournament.title}</p>

      {tournament.description && (
        <p className="text-white/40 text-xs mb-3 line-clamp-2">{tournament.description}</p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1 text-amber-400">
          <Trophy className="w-3.5 h-3.5" />
          <span className="font-semibold">${prize}</span>
        </div>
        {tournament.max_participants && (
          <div className="flex items-center gap-1 text-white/40">
            <Users className="w-3 h-3" />
            <span>{tournament.participants?.length || 0}/{tournament.max_participants}</span>
          </div>
        )}
        {tournament.start_time && (
          <div className="flex items-center gap-1 text-white/40 ml-auto">
            <Clock className="w-3 h-3" />
            <span>{new Date(tournament.start_time).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GamesExpo() {
  const [activeTab, setActiveTab] = useState('Live Tournaments');
  const [gameFilter, setGameFilter] = useState('All');

  const statusMap = {
    'Live Tournaments': 'live',
    'Upcoming': 'upcoming',
    'Past Results': 'finished',
  };

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments', activeTab],
    queryFn: () => base44.entities.GameTournament.filter(
      { status: statusMap[activeTab] },
      '-start_time',
      30
    ),
    staleTime: 60 * 1000,
  });

  const filtered = gameFilter === 'All'
    ? tournaments
    : tournaments.filter(t => t.game_type?.toLowerCase() === gameFilter.toLowerCase());

  return (
    <div className="min-h-screen text-white pt-16 bg-[#09090b]">
      {/* Roman cinematic bg */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#08060d]" />
        <div className="absolute top-0 left-0 right-0 h-[45vh] bg-gradient-to-b from-[#1a0035]/50 via-[#0d0020]/30 to-transparent" />
        <div className="absolute top-0 right-0 w-1/2 h-[40vh] bg-gradient-to-bl from-[#2d0080]/25 to-transparent" />
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full bg-[#7c3aed15] blur-[80px]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#09090b] to-transparent" />
      </div>
      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          {/* Title */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-violet-400" />
              <h1 className="text-white font-bold text-base">Gaming Arena</h1>
            </div>
            <Link to={createPageUrl('GoLive')}>
              <button className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-semibold text-xs px-3 h-8 rounded-xl transition-all">
                <Play className="w-3.5 h-3.5" />
                Host Tournament
              </button>
            </Link>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 mb-3">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                  activeTab === tab
                    ? 'bg-violet-600 text-white'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Game filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {GAME_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setGameFilter(f)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  gameFilter === f
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5 relative z-10">
        {/* Prize pool hero */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-violet-900/30 via-violet-800/10 to-transparent border border-violet-500/20 mb-5 overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <p className="text-violet-400 text-xs font-semibold tracking-widest uppercase mb-1 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" />
              Total Prize Pool
            </p>
            <p className="text-white font-black text-3xl">$10,000+</p>
            <p className="text-white/40 text-xs mt-1">Across all active tournaments</p>
          </div>
        </div>

        {/* Tournament grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Gamepad2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No tournaments in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(t => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}