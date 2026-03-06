import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Trophy, Skull } from 'lucide-react';

export default function PKResultOverlay({ winner, hostCreator, opponentCreator, hostScore, opponentScore, onDismiss }) {
  // 'host' | 'opponent' | 'tie'
  const isTie = winner === 'tie';
  const winnerCreator = winner === 'host' ? hostCreator : winner === 'opponent' ? opponentCreator : null;
  const loserCreator = winner === 'host' ? opponentCreator : winner === 'opponent' ? hostCreator : null;
  const winnerScore = winner === 'host' ? hostScore : opponentScore;
  const loserScore = winner === 'host' ? opponentScore : hostScore;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss?.(), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center px-8 max-w-sm"
      >
        {/* Confetti-like particles */}
        {!isTie && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 opacity-20 pointer-events-none"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 0, x: 0 }}
                animate={{ opacity: [0, 1, 0], y: [-50, -150], x: [0, (i % 2 ? 1 : -1) * (20 + i * 10)] }}
                transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
                className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full"
                style={{ background: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#3b82f6' : '#ef4444' }}
              />
            ))}
          </motion.div>
        )}

        {isTie ? (
          <>
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white mb-2">IT'S A TIE!</h2>
            <p className="text-white/50 text-sm">Both warriors fought equally</p>
          </>
        ) : (
          <>
            {/* Winner */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Crown className="w-12 h-12 text-amber-400 mx-auto mb-2" />
            </motion.div>
            <div className="w-24 h-24 rounded-full mx-auto mb-3 ring-4 ring-amber-400 ring-offset-4 ring-offset-black overflow-hidden bg-gradient-to-br from-amber-400 to-amber-600">
              {winnerCreator?.avatar_url ? (
                <img src={winnerCreator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🏆</div>
              )}
            </div>
            <h2 className="text-3xl font-black text-white mb-1">
              {winnerCreator?.display_name || 'Winner'} WINS!
            </h2>
            <div className="flex items-center justify-center gap-3 mt-2 mb-4">
              <span className="text-2xl font-bold text-amber-400">{(winnerScore || 0).toLocaleString()}</span>
              <span className="text-white/30">vs</span>
              <span className="text-lg font-bold text-white/40">{(loserScore || 0).toLocaleString()}</span>
            </div>

            {/* Loser tag */}
            <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
              <Skull className="w-4 h-4" />
              <span>{loserCreator?.display_name || 'Challenger'} defeated</span>
            </div>
          </>
        )}

        <p className="text-white/20 text-xs mt-6">Tap to dismiss</p>
      </motion.div>
    </motion.div>
  );
}