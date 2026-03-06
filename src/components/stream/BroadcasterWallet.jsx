import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Gift, ChevronUp, ChevronDown, Coins } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BroadcasterWallet({ totalEarnings = 0, sessionEarnings = 0, giftsReceived = 0, creatorId }) {
  const [minimized, setMinimized] = useState(true);
  const [earnings, setEarnings] = useState({ session: sessionEarnings, total: totalEarnings, gifts: giftsReceived });

  // Sync from props
  useEffect(() => {
    setEarnings({ session: sessionEarnings, total: totalEarnings, gifts: giftsReceived });
  }, [sessionEarnings, totalEarnings, giftsReceived]);

  // Real-time gift updates
  useEffect(() => {
    if (!creatorId) return;
    const unsub = base44.entities.GiftTransaction.subscribe((event) => {
      if (event.type === 'create' && event.data.receiver_creator_id === creatorId) {
        setEarnings(prev => ({
          ...prev,
          session: prev.session + (event.data.total_as_value || 0),
          gifts: prev.gifts + 1
        }));
      }
    });
    return unsub;
  }, [creatorId]);

  const denariiToUsd = (d) => (d / 100).toFixed(2);

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <AnimatePresence mode="wait">
        {minimized ? (
          <motion.button
            key="min"
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            onClick={() => setMinimized(false)}
            className="bg-black/60 backdrop-blur-md border border-amber-500/20 rounded-full px-3 py-1.5 flex items-center gap-2"
          >
            <span className="text-sm">🪙</span>
            <span className="text-amber-300 font-bold text-xs">{earnings.session.toLocaleString()}</span>
            <ChevronDown className="w-3 h-3 text-white/30" />
          </motion.button>
        ) : (
          <motion.div
            key="exp"
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 min-w-[130px]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-[10px] uppercase tracking-wider font-medium">Earnings</span>
              <button onClick={() => setMinimized(true)} className="text-white/30 hover:text-white/60">
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs">Session</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm">🪙</span>
                  <span className="text-white font-bold text-xs">{earnings.session.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs">Gifts</span>
                <span className="text-white/70 text-xs">{earnings.gifts}</span>
              </div>
              <div className="h-px bg-white/[0.06] my-1" />
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs">Total</span>
                <span className="text-amber-300 font-bold text-xs">{earnings.total.toLocaleString()}</span>
              </div>
              <div className="text-right">
                <span className="text-green-400/70 text-[10px]">≈ ${denariiToUsd(earnings.total)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}