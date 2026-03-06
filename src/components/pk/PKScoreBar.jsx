import React from 'react';
import { motion } from 'framer-motion';

export default function PKScoreBar({ hostScore, opponentScore }) {
  const total = (hostScore || 0) + (opponentScore || 0);
  const hostPct = total > 0 ? ((hostScore || 0) / total) * 100 : 50;
  const opponentPct = total > 0 ? ((opponentScore || 0) / total) * 100 : 50;

  return (
    <div className="w-full mt-3">
      <div className="flex justify-between text-[10px] font-bold mb-1 px-1">
        <span className="text-blue-400">{(hostScore || 0).toLocaleString()}</span>
        <span className="text-red-400">{(opponentScore || 0).toLocaleString()}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-stone-800/80 border border-white/10 flex">
        <motion.div
          animate={{ width: `${hostPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="bg-gradient-to-r from-blue-600 to-blue-400 relative"
        >
          {hostPct > 15 && (
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              {hostPct.toFixed(0)}%
            </span>
          )}
        </motion.div>
        <motion.div
          animate={{ width: `${opponentPct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          className="bg-gradient-to-r from-red-400 to-red-600 relative"
        >
          {opponentPct > 15 && (
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              {opponentPct.toFixed(0)}%
            </span>
          )}
        </motion.div>
      </div>
    </div>
  );
}