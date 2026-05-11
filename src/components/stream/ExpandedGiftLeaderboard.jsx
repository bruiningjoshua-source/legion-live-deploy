import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Crown, 
  ChevronDown,
  ChevronUp,
  Gift,
  X
} from 'lucide-react';

const RANK_STYLES = {
  1: { bg: 'from-amber-400 via-yellow-400 to-amber-500', icon: '👑', glow: 'shadow-amber-400/50', border: 'border-amber-400' },
  2: { bg: 'from-gray-300 via-slate-300 to-gray-400', icon: '🥈', glow: 'shadow-gray-400/40', border: 'border-gray-400' },
  3: { bg: 'from-amber-600 via-orange-600 to-amber-700', icon: '🥉', glow: 'shadow-amber-600/40', border: 'border-amber-600' }
};

export default function ExpandedGiftLeaderboard({ streamId, onClose }) {
  const [timeFrame, setTimeFrame] = useState('stream'); // 'stream', 'day', 'week', 'all'
  const [expanded, setExpanded] = useState(false);

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ['expanded-gift-leaderboard', streamId, timeFrame],
    queryFn: async () => {
      let filter = { stream_id: streamId };
      
      if (timeFrame === 'day') {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        filter = { created_date: { $gte: dayAgo } };
      } else if (timeFrame === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        filter = { created_date: { $gte: weekAgo } };
      } else if (timeFrame === 'all') {
        filter = {};
      }

      const txs = await base44.entities.GiftTransaction.filter(filter, '-created_date', 500);
      
      // Aggregate by sender
      const senderTotals = {};
      txs.forEach(tx => {
        if (!senderTotals[tx.sender_email]) {
          senderTotals[tx.sender_email] = {
            email: tx.sender_email,
            name: tx.sender_name || tx.sender_email?.split('@')[0],
            total: 0,
            giftCount: 0,
            topGift: null,
            topGiftValue: 0
          };
        }
        senderTotals[tx.sender_email].total += tx.total_as_value || 0;
        senderTotals[tx.sender_email].giftCount += tx.quantity || 1;
        
        if ((tx.total_as_value || 0) > senderTotals[tx.sender_email].topGiftValue) {
          senderTotals[tx.sender_email].topGift = tx.gift_name;
          senderTotals[tx.sender_email].topGiftValue = tx.total_as_value || 0;
        }
      });

      return Object.values(senderTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 50);
    },
    enabled: !!streamId,
    refetchInterval: 5000
  });

  const totalGifted = leaderboard.reduce((sum, l) => sum + l.total, 0);
  const displayList = expanded ? leaderboard : leaderboard.slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-4 md:inset-auto md:right-4 md:top-20 md:w-96 md:max-h-[80vh] bg-black/95 backdrop-blur-2xl rounded-3xl border border-amber-500/30 overflow-hidden z-50 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-b border-amber-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/30">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Gift Leaderboard</h3>
              <p className="text-white/50 text-xs">Top supporters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Filter */}
        <div className="flex gap-2">
          {[
            { id: 'stream', label: 'This Stream' },
            { id: 'day', label: '24h' },
            { id: 'week', label: '7 Days' },
            { id: 'all', label: 'All Time' }
          ].map(tf => (
            <button
              key={tf.id}
              onClick={() => setTimeFrame(tf.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                timeFrame === tf.id
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Total Stats */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Gift className="w-4 h-4" />
            <span>{leaderboard.reduce((sum, l) => sum + l.giftCount, 0).toLocaleString()} gifts</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400 font-bold">
            <span>🪙</span>
            <span>{totalGifted.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayList.length > 0 ? (
          displayList.map((sender, i) => {
            const rank = i + 1;
            const style = RANK_STYLES[rank];
            const isTopThree = rank <= 3;

            return (
              <motion.div
                key={sender.email}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isTopThree 
                    ? `bg-gradient-to-r ${style?.bg} ${style?.glow} shadow-lg` 
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  isTopThree ? 'bg-black/20 text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {isTopThree ? (
                    <span className="text-xl">{style?.icon}</span>
                  ) : (
                    <span className="text-sm">#{rank}</span>
                  )}
                </div>

                {/* Avatar & Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${isTopThree ? 'text-white' : 'text-white/80'}`}>
                    {sender.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={isTopThree ? 'text-white/70' : 'text-white/40'}>
                      {sender.giftCount} gifts
                    </span>
                    {sender.topGift && (
                      <>
                        <span className={isTopThree ? 'text-white/50' : 'text-white/30'}>•</span>
                        <span className={isTopThree ? 'text-white/70' : 'text-white/40'}>
                          Top: {sender.topGift}
                        </span>
                      </>
                    )}
                  </div>
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
          })
        ) : (
          <div className="text-center py-12">
            <Gift className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No gifts yet</p>
          </div>
        )}

        {/* Show More */}
        {leaderboard.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-3 text-center text-amber-400 text-sm font-medium hover:bg-white/5 rounded-xl flex items-center justify-center gap-2"
          >
            {expanded ? (
              <>Show Less <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Show All ({leaderboard.length}) <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}