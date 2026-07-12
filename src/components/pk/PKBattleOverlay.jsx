import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Flame } from 'lucide-react';
import PKScoreBar from './PKScoreBar';
import PKTimer from './PKTimer';
import PKResultOverlay from './PKResultOverlay';

export default function PKBattleOverlay({ 
  streamId,
  hostCreator, 
  opponentCreator, 
  initialBattle,
  isBroadcaster,
}) {
  const [battle, setBattle] = useState(initialBattle || null);
  const [showResult, setShowResult] = useState(false);

  // Sync initial data
  useEffect(() => {
    if (initialBattle) setBattle(initialBattle);
  }, [initialBattle?.id, initialBattle?.host_score, initialBattle?.opponent_score, initialBattle?.status]);

  // Real-time subscription for PK score updates
  useEffect(() => {
    if (!streamId) return;
    const unsub = base44.entities.PKBattle.subscribe((event) => {
      if (event.data?.stream_id !== streamId) return;
      if (event.type === 'update' || event.type === 'create') {
        setBattle(event.data);
        if (event.data.status === 'completed') {
          setShowResult(true);
        }
      }
    });
    return unsub;
  }, [streamId]);

  // Real-time subscription for gift transactions to update scores
  useEffect(() => {
    if (!streamId || !battle || battle.status !== 'active') return;
    const unsub = base44.entities.GiftTransaction.subscribe((event) => {
      if (event.type !== 'create' || !event.data?.is_pk_gift) return;
      if (event.data.stream_id !== streamId) return;
      // Re-fetch battle to get server-authoritative scores
      base44.entities.PKBattle.filter({ stream_id: streamId }, '-created_date', 1)
        .then(battles => {
          if (battles[0]) setBattle(battles[0]);
        })
        .catch(() => {});
    });
    return unsub;
  }, [streamId, battle?.id, battle?.status]);

  // Handle timer ending — broadcaster marks battle completed
  const handleTimeUp = useCallback(async () => {
    if (!isBroadcaster || !battle || battle.status === 'completed') return;
    const hostScore = battle.host_score || 0;
    const opponentScore = battle.opponent_score || 0;
    const winnerId = hostScore > opponentScore 
      ? battle.host_creator_id 
      : opponentScore > hostScore 
        ? battle.opponent_creator_id 
        : null;

    await base44.entities.PKBattle.update(battle.id, {
      status: 'completed',
      winner_creator_id: winnerId || '',
      ended_at: new Date().toISOString(),
    });
    setShowResult(true);
  }, [isBroadcaster, battle?.id, battle?.host_score, battle?.opponent_score, battle?.status]);

  if (!battle) return null;

  const hostScore = battle.host_score || 0;
  const opponentScore = battle.opponent_score || 0;
  const winner = battle.status === 'completed' 
    ? (hostScore > opponentScore ? 'host' : opponentScore > hostScore ? 'opponent' : 'tie')
    : null;

  return (
    <>
      <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: 'calc(56px + env(safe-area-inset-top, 0px))' }}>
        <div className="bg-gradient-to-b from-black/60 via-black/35 to-transparent px-3 pt-2 pb-5">
          {/* Timer */}
          <div className="flex justify-center mb-3">
            {battle.status === 'active' && battle.started_at && (
              <PKTimer
                startedAt={battle.started_at}
                durationMinutes={battle.duration_minutes || 5}
                onTimeUp={handleTimeUp}
              />
            )}
            {battle.status === 'pending' && (
              <div className="bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-1.5 text-amber-300 text-sm font-medium">
                Waiting for challenger...
              </div>
            )}
            {battle.status === 'completed' && (
              <div className="bg-gradient-to-r from-amber-600 to-amber-500 rounded-full px-5 py-1.5 text-white font-bold text-sm">
                BATTLE ENDED
              </div>
            )}
          </div>

          {/* Creators row */}
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {/* Host */}
            <div className="flex items-center gap-2">
              <div className={`relative ${winner === 'host' ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black' : ''} rounded-full`}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-blue-400 overflow-hidden">
                  {hostCreator?.avatar_url ? (
                    <img src={hostCreator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-blue-400 font-bold text-xs truncate max-w-[80px]">{hostCreator?.display_name || 'Host'}</p>
                <motion.p 
                  key={hostScore}
                  initial={{ scale: 1.4, color: '#60a5fa' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="text-white font-bold text-lg leading-tight"
                >
                  {hostScore.toLocaleString()}
                </motion.p>
              </div>
            </div>

            {/* VS */}
            <motion.div
              animate={battle.status === 'active' ? { rotate: [0, 5, -5, 0], scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="relative flex-shrink-0"
            >
              <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 rounded-full p-2.5 shadow-lg shadow-red-500/40">
                <Swords className="w-5 h-5 text-white" />
              </div>
              {battle.status === 'active' && (
                <Flame className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 text-orange-400 animate-pulse" />
              )}
            </motion.div>

            {/* Opponent */}
            <div className="flex items-center gap-2 flex-row-reverse">
              <div className={`relative ${winner === 'opponent' ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black' : ''} rounded-full`}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-400 overflow-hidden">
                  {opponentCreator?.avatar_url ? (
                    <img src={opponentCreator.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-red-400 font-bold text-xs truncate max-w-[80px]">{opponentCreator?.display_name || 'Challenger'}</p>
                <motion.p 
                  key={opponentScore}
                  initial={{ scale: 1.4, color: '#f87171' }}
                  animate={{ scale: 1, color: '#ffffff' }}
                  className="text-white font-bold text-lg leading-tight"
                >
                  {opponentScore.toLocaleString()}
                </motion.p>
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="max-w-sm mx-auto">
            <PKScoreBar hostScore={hostScore} opponentScore={opponentScore} />
          </div>
        </div>
      </div>

      {/* Winner/Loser result overlay */}
      <AnimatePresence>
        {showResult && battle.status === 'completed' && (
          <PKResultOverlay
            winner={winner}
            hostCreator={hostCreator}
            opponentCreator={opponentCreator}
            hostScore={hostScore}
            opponentScore={opponentScore}
            onDismiss={() => setShowResult(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}