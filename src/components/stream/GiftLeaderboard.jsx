import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Crown, TrendingUp } from 'lucide-react';

const RANK_STYLES = {
  1: { bg: 'from-amber-400 via-yellow-400 to-amber-500', icon: '👑', glow: 'shadow-amber-400/40' },
  2: { bg: 'from-gray-300 via-slate-300 to-gray-400', icon: '🥈', glow: 'shadow-gray-400/30' },
  3: { bg: 'from-amber-600 via-orange-600 to-amber-700', icon: '🥉', glow: 'shadow-amber-600/30' }
};

export default function GiftLeaderboard({ streamId, compact = false }) {
  const { data: transactions = [] } = useQuery({
    queryKey: ['gift-leaderboard', streamId],
    queryFn: async () => {
      const txs = await base44.entities.GiftTransaction.filter({ 
        stream_id: streamId 
      }, '-created_date', 200);
      
      // Aggregate by sender
      const senderTotals = {};
      txs.forEach(tx => {
        if (!senderTotals[tx.sender_email]) {
          senderTotals[tx.sender_email] = {
            email: tx.sender_email,
            name: tx.sender_name || tx.sender_email?.split('@')[0],
            total: 0,
            giftCount: 0
          };
        }
        senderTotals[tx.sender_email].total += tx.total_as_value || 0;
        senderTotals[tx.sender_email].giftCount += tx.quantity || 1;
      });

      return Object.values(senderTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    },
    enabled: !!streamId,
    refetchInterval: 5000
  });

  if (transactions.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-black/60 backdrop-blur-xl rounded-xl border border-amber-500/30 p-3"
      >
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-white text-xs font-medium">Top Gifters</span>
        </div>
        <div className="space-y-1.5">
          {transactions.slice(0, 3).map((sender, i) => {
            const rank = i + 1;
            const style = RANK_STYLES[rank] || {};
            return (
              <div key={sender.email} className="flex items-center gap-2">
                <span className="text-sm">{style.icon || `#${rank}`}</span>
                <span className="text-white/80 text-xs truncate flex-1">{sender.name}</span>
                <span className="text-amber-400 text-xs font-bold">🪙{sender.total.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 backdrop-blur-xl rounded-2xl border border-amber-500/30 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/20 to-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/30">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Gift Leaderboard</h3>
              <p className="text-white/50 text-xs">Top supporters this stream</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-amber-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="p-3 space-y-2">
        {transactions.map((sender, i) => {
          const rank = i + 1;
          const style = RANK_STYLES[rank];
          const isTopThree = rank <= 3;

          return (
            <motion.div
              key={sender.email}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 p-2 rounded-xl ${
                isTopThree 
                  ? `bg-gradient-to-r ${style?.bg} ${style?.glow} shadow-lg` 
                  : 'bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isTopThree ? 'bg-black/20' : 'bg-white/10'
              }`}>
                {isTopThree ? (
                  <span className="text-lg">{style?.icon}</span>
                ) : (
                  <span className={`text-sm font-bold ${isTopThree ? 'text-white' : 'text-white/60'}`}>
                    {rank}
                  </span>
                )}
              </div>

              {/* Avatar & Name */}
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isTopThree ? 'text-white' : 'text-white/80'}`}>
                  {sender.name}
                </p>
                <p className={`text-xs ${isTopThree ? 'text-white/70' : 'text-white/40'}`}>
                  {sender.giftCount} gifts
                </p>
              </div>

              {/* Total */}
              <div className="text-right">
                <div className={`flex items-center gap-1 font-bold ${isTopThree ? 'text-white' : 'text-amber-400'}`}>
                  <span className="text-sm">🪙</span>
                  <span>{sender.total.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}