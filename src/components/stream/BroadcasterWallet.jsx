import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Gift, Coins } from 'lucide-react';

export default function BroadcasterWallet({ totalEarnings = 0, sessionEarnings = 0, giftsReceived = 0 }) {
  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute top-24 left-4 z-20"
    >
      <div className="bg-black/70 backdrop-blur-md border border-amber-500/30 rounded-xl p-3 min-w-[140px]">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-500/20">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-amber-200 text-xs font-semibold">Earnings</span>
        </div>
        
        {/* Session Earnings */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-400/70 text-xs">This Stream</span>
          <div className="flex items-center gap-1">
            <span className="text-amber-300 text-lg">🪙</span>
            <span className="text-white font-bold text-sm">{sessionEarnings}</span>
          </div>
        </div>
        
        {/* Gifts Count */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-400/70 text-xs">Gifts</span>
          <div className="flex items-center gap-1">
            <Gift className="w-3 h-3 text-pink-400" />
            <span className="text-white font-semibold text-xs">{giftsReceived}</span>
          </div>
        </div>
        
        {/* Total Earnings */}
        <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
          <span className="text-amber-400/70 text-xs">Total</span>
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300 font-bold text-sm">{totalEarnings}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}