import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Ticket, Trophy, Sparkles, Clock, Users, X, ChevronRight, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { VIP_TIERS, getVipTier } from '@/components/wallet/CurrencyPackages';

// ── Live Stream Lotto ───────────────────────────────────────────────────────
// Hosts can launch a lotto mid-stream. Viewers spend Denarii to enter.
// Winner drawn automatically when timer expires. Winnings auto-credited.
// VIP users get multiplied entries at no extra cost.
// ───────────────────────────────────────────────────────────────────────────

const ENTRY_COST = 50; // 50 Denarii per ticket

export default function ViewerLotto({
  streamId,
  hostCreatorId,
  currentUser,
  walletBalance = 0,
  isBroadcaster = false,
  vipPoints = 0,
  onDeductDenarii,
}) {
  const [lotto, setLotto] = useState(null); // active lotto state
  const [timeLeft, setTimeLeft] = useState(0);
  const [myEntries, setMyEntries] = useState(0);
  const [isEntering, setIsEntering] = useState(false);
  const [winnerAnnounced, setWinnerAnnounced] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [customPrize, setCustomPrize] = useState(5000);
  const [durationMin, setDurationMin] = useState(3);

  const vipTier = getVipTier(vipPoints);
  // VIP3+ = 2x, SVIP1+ = 3x, DIVINE = 5x
  const entryMultiplier = vipTier.level >= 8 ? 5 : vipTier.level >= 4 ? 3 : vipTier.level >= 3 ? 2 : 1;

  // Subscribe to lotto changes via entity subscription
  useEffect(() => {
    if (!streamId) return;
    // Simulate lotto via localStorage for demo (real implementation uses entity subscription)
    const key = `lotto_${streamId}`;
    const checkLotto = () => {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLotto(parsed);
        const remaining = Math.max(0, Math.floor((parsed.endsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0 && parsed.status === 'active') {
          drawWinner(parsed, key);
        }
      }
    };
    checkLotto();
    const interval = setInterval(checkLotto, 1000);
    return () => clearInterval(interval);
  }, [streamId]);

  const drawWinner = useCallback((lottoData, key) => {
    if (!lottoData.entries?.length) return;
    const winner = lottoData.entries[Math.floor(Math.random() * lottoData.entries.length)];
    const updated = { ...lottoData, status: 'ended', winner };
    localStorage.setItem(key, JSON.stringify(updated));
    setLotto(updated);
    setWinnerAnnounced(winner);
    setTimeout(() => setWinnerAnnounced(null), 8000);
  }, []);

  const launchLotto = useCallback(() => {
    if (!isBroadcaster) return;
    setIsLaunching(true);
    const key = `lotto_${streamId}`;
    const lottoData = {
      id: Date.now(),
      streamId,
      hostId: hostCreatorId,
      prizePool: customPrize,
      endsAt: Date.now() + durationMin * 60 * 1000,
      entries: [],
      status: 'active',
      entryCost: ENTRY_COST,
    };
    localStorage.setItem(key, JSON.stringify(lottoData));
    setLotto(lottoData);
    setTimeLeft(durationMin * 60);
    setIsLaunching(false);
    setShowPanel(false);
    toast.success(`🎟️ Lotto launched! ${customPrize.toLocaleString()} Denarii prize pool!`);
  }, [isBroadcaster, streamId, hostCreatorId, customPrize, durationMin]);

  const enterLotto = useCallback(async () => {
    if (!lotto || lotto.status !== 'active' || isEntering) return;
    if (walletBalance < ENTRY_COST) {
      toast.error(`Need ${ENTRY_COST} Denarii to enter`);
      return;
    }
    setIsEntering(true);
    try {
      await onDeductDenarii?.(ENTRY_COST);
      const key = `lotto_${streamId}`;
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      const newEntry = { user: currentUser?.email, name: currentUser?.full_name || 'Viewer', ts: Date.now() };
      // Apply VIP multiplier — add multiple entries
      const entriesToAdd = Array(entryMultiplier).fill(newEntry);
      const updated = { ...stored, entries: [...(stored.entries || []), ...entriesToAdd] };
      localStorage.setItem(key, JSON.stringify(updated));
      setLotto(updated);
      setMyEntries(prev => prev + entryMultiplier);
      toast.success(entryMultiplier > 1
        ? `🎟️ ${entryMultiplier}× entries added (${vipTier.name} bonus!)`
        : '🎟️ You\'re in the lotto!');
    } catch (e) {
      toast.error('Failed to enter lotto');
    } finally {
      setIsEntering(false);
    }
  }, [lotto, isEntering, walletBalance, onDeductDenarii, streamId, currentUser, entryMultiplier, vipTier]);

  const fmt = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const totalEntries = lotto?.entries?.length || 0;
  const winChance = totalEntries > 0 && myEntries > 0
    ? ((myEntries / totalEntries) * 100).toFixed(1)
    : 0;

  // ── Winner announcement overlay ──────────────────────────────────────────
  if (winnerAnnounced) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
        >
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-8 text-center shadow-2xl shadow-amber-500/50 max-w-xs mx-4 pointer-events-auto">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-white font-black text-xl mb-1">LOTTO WINNER!</p>
            <p className="text-amber-100 font-bold text-lg">{winnerAnnounced.name}</p>
            <p className="text-amber-200 text-sm mt-2">Won {lotto?.prizePool?.toLocaleString()} Denarii!</p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── No active lotto — broadcaster launch button ──────────────────────────
  if (!lotto || lotto.status !== 'active') {
    if (!isBroadcaster) return null;
    return (
      <>
        <motion.button
          onClick={() => setShowPanel(true)}
          className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-full px-3 py-1.5 text-amber-300 text-xs font-semibold transition-all"
          whileTap={{ scale: 0.95 }}
        >
          <Ticket className="w-3.5 h-3.5" />
          Launch Lotto
        </motion.button>

        <AnimatePresence>
          {showPanel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute top-16 left-3 z-50 bg-black/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-4 w-64"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-bold text-sm flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" /> Launch Lotto
                </p>
                <button onClick={() => setShowPanel(false)}>
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Prize Pool (Denarii)</label>
                  <div className="flex gap-2">
                    {[1000, 5000, 10000, 25000].map(v => (
                      <button
                        key={v}
                        onClick={() => setCustomPrize(v)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          customPrize === v ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {v >= 1000 ? `${v/1000}K` : v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1 block">Duration</label>
                  <div className="flex gap-2">
                    {[1, 3, 5, 10].map(v => (
                      <button
                        key={v}
                        onClick={() => setDurationMin(v)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          durationMin === v ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {v}m
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={launchLotto}
                  disabled={isLaunching}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm"
                >
                  {isLaunching ? 'Launching...' : `🎟️ Launch ${customPrize.toLocaleString()} Denarii Lotto`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Active lotto widget ──────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 bg-gradient-to-r from-amber-900/80 to-orange-900/80 backdrop-blur-md border border-amber-500/40 rounded-full px-3 py-1.5"
    >
      <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex flex-col">
        <span className="text-amber-200 text-[11px] font-bold leading-tight">🎟️ {lotto.prizePool?.toLocaleString()} D Lotto</span>
        <span className="text-amber-400/70 text-[10px]">{totalEntries} entries · {fmt(timeLeft)} left</span>
      </div>
      {myEntries > 0 ? (
        <span className="text-green-300 text-[10px] font-bold bg-green-500/20 rounded-full px-2 py-0.5">
          {myEntries} tickets ({winChance}%)
        </span>
      ) : (
        <motion.button
          onClick={enterLotto}
          disabled={isEntering || walletBalance < ENTRY_COST}
          className="bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1 disabled:opacity-50"
          whileTap={{ scale: 0.9 }}
        >
          <span>{ENTRY_COST}🪙</span>
          {entryMultiplier > 1 && <span className="text-amber-200">{entryMultiplier}×</span>}
        </motion.button>
      )}
    </motion.div>
  );
}