import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Users, Coins, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';

export default function GameTournamentCard({ tournament, onClick }) {
  const prizeFirst = (tournament.prize_pool_denarii * (tournament.prize_distribution?.first_place_percent || 50)) / 100;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <GlassCard glowColor={tournament.status === 'live' ? 'red' : 'amber'} padding="p-0" className="overflow-hidden">
        {/* Banner */}
        {tournament.banner_url && (
          <div className="h-32 bg-cover bg-center relative">
            <img src={tournament.banner_url} alt={tournament.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="text-white font-bold text-lg">{tournament.title}</h3>
              <p className="text-white/50 text-xs">{tournament.game_type}</p>
            </div>
            {tournament.status === 'live' && (
              <span className="px-2 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold animate-pulse">
                LIVE
              </span>
            )}
          </div>

          {/* Prize Pool */}
          <div className="flex items-center gap-2 mb-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex-1">
              <p className="text-white/50 text-xs">Prize Pool</p>
              <p className="text-amber-300 font-bold">{tournament.prize_pool_denarii.toLocaleString()} Denarii</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-xs">1st Place</p>
              <p className="text-green-400 font-bold text-sm">{prizeFirst.toLocaleString()}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 mb-3 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{tournament.participants?.length || 0} / {tournament.max_participants} participants</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>{format(new Date(tournament.start_time), 'MMM d, h:mm a')}</span>
            </div>
          </div>

          <button className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors">
            <span className="flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4" />
              {tournament.status === 'live' ? 'Watch Tournament' : 'Learn More'}
            </span>
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
}