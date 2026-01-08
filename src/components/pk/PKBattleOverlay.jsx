import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Timer, Crown, Flame, Trophy } from 'lucide-react';

export default function PKBattleOverlay({ 
  hostCreator, 
  opponentCreator, 
  hostScore, 
  opponentScore, 
  timeRemaining,
  status 
}) {
  const total = (hostScore || 0) + (opponentScore || 0);
  const hostPercent = total > 0 ? (hostScore / total) * 100 : 50;
  const opponentPercent = total > 0 ? (opponentScore / total) * 100 : 50;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const winner = status === 'completed' 
    ? (hostScore > opponentScore ? 'host' : opponentScore > hostScore ? 'opponent' : 'tie')
    : null;

  return (
    <div className="absolute top-0 left-0 right-0 z-20">
      {/* VS Header */}
      <div className="bg-gradient-to-b from-black/80 via-black/60 to-transparent p-4">
        {/* Timer and VS Badge */}
        <div className="flex items-center justify-center mb-4">
          {status === 'active' && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 rounded-full px-6 py-2 shadow-lg shadow-red-500/40"
            >
              <Timer className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-xl font-mono">{formatTime(timeRemaining)}</span>
            </motion.div>
          )}
          
          {status === 'completed' && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 rounded-full px-6 py-2">
              <Trophy className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-xl">BATTLE ENDED</span>
            </div>
          )}
        </div>

        {/* Creators */}
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Host */}
          <div className={`flex items-center gap-3 ${winner === 'host' ? 'animate-pulse' : ''}`}>
            <div className={`relative ${winner === 'host' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black' : ''} rounded-full`}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-3 border-blue-400 overflow-hidden">
                {hostCreator?.avatar_url ? (
                  <img src={hostCreator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                )}
              </div>
              {winner === 'host' && (
                <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <p className="text-blue-400 font-bold text-lg">{hostCreator?.display_name || 'Host'}</p>
              <motion.p 
                key={hostScore}
                initial={{ scale: 1.5, color: '#60a5fa' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-white font-bold text-2xl"
              >
                {(hostScore || 0).toLocaleString()}
              </motion.p>
            </div>
          </div>

          {/* VS Badge */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative"
          >
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 rounded-full p-4 shadow-lg shadow-red-500/50">
              <Swords className="w-8 h-8 text-white" />
            </div>
            <Flame className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 text-orange-400 animate-pulse" />
          </motion.div>

          {/* Opponent */}
          <div className={`flex items-center gap-3 flex-row-reverse ${winner === 'opponent' ? 'animate-pulse' : ''}`}>
            <div className={`relative ${winner === 'opponent' ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black' : ''} rounded-full`}>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-3 border-red-400 overflow-hidden">
                {opponentCreator?.avatar_url ? (
                  <img src={opponentCreator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                )}
              </div>
              {winner === 'opponent' && (
                <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-400" />
              )}
            </div>
            <div className="text-right">
              <p className="text-red-400 font-bold text-lg">{opponentCreator?.display_name || 'Challenger'}</p>
              <motion.p 
                key={opponentScore}
                initial={{ scale: 1.5, color: '#f87171' }}
                animate={{ scale: 1, color: '#ffffff' }}
                className="text-white font-bold text-2xl"
              >
                {(opponentScore || 0).toLocaleString()}
              </motion.p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mt-4">
          <div className="h-4 rounded-full overflow-hidden bg-stone-800 border border-stone-600 flex">
            <motion.div
              animate={{ width: `${hostPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-r from-blue-500 to-blue-400 relative"
            >
              {hostPercent > 50 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                  {hostPercent.toFixed(0)}%
                </span>
              )}
            </motion.div>
            <motion.div
              animate={{ width: `${opponentPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-gradient-to-r from-red-400 to-red-500 relative"
            >
              {opponentPercent > 50 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white">
                  {opponentPercent.toFixed(0)}%
                </span>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}