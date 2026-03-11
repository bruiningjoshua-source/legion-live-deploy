import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, X, Gift, Share2, KeyRound, Trophy, Clock, Users, Coins, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getVipTier } from '@/components/wallet/CurrencyPackages';

// ── Stream Lotto v2 ─────────────────────────────────────────────────────────
// Host or creator funds a prize (50–1000 or custom Denarii).
// Viewers enter by:
//   "gift"     — sending a specific gift the host selected
//   "share"    — tapping the Share button (honour system / tracked)
//   "password" — typing the correct keyword in chat / lotto panel
// Winner drawn when timer ends. Winnings auto-credited.
// VIP users get multiplied entries.
// ───────────────────────────────────────────────────────────────────────────

const ENTRY_TYPES = [
  { id: 'gift',     label: 'Send a Gift',       icon: Gift,     desc: 'Viewer must send the selected gift' },
  { id: 'share',    label: 'Share Stream',       icon: Share2,   desc: 'Viewer taps Share to enter' },
  { id: 'password', label: 'Secret Password',    icon: KeyRound, desc: 'Viewer types keyword to enter' },
];

const QUICK_PRIZES = [50, 100, 250, 500, 1000];

const COMMON_GIFTS = [
  { id: 'rose',      name: 'Rose',       icon: '🌹', cost: 5 },
  { id: 'heart',     name: 'Heart',      icon: '❤️', cost: 10 },
  { id: 'crown',     name: 'Crown',      icon: '👑', cost: 50 },
  { id: 'diamond',   name: 'Diamond',    icon: '💎', cost: 100 },
  { id: 'rocket',    name: 'Rocket',     icon: '🚀', cost: 200 },
  { id: 'legion',    name: 'Legion',     icon: '⚔️', cost: 500 },
];

export default function ViewerLotto({
  streamId,
  hostCreatorId,
  currentUser,
  walletBalance = 0,
  isBroadcaster = false,
  vipPoints = 0,
  onDeductDenarii,
}) {
  const [lotto, setLotto] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [myEntries, setMyEntries] = useState(0);
  const [isEntering, setIsEntering] = useState(false);
  const [winnerAnnounced, setWinnerAnnounced] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Launch config
  const [prizeAmount, setPrizeAmount] = useState(500);
  const [customPrize, setCustomPrize] = useState('');
  const [durationMin, setDurationMin] = useState(3);
  const [entryType, setEntryType] = useState('gift');
  const [selectedGift, setSelectedGift] = useState(COMMON_GIFTS[0]);
  const [secretPassword, setSecretPassword] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);

  const vipTier = getVipTier(vipPoints);
  const entryMultiplier = vipTier.level >= 8 ? 5 : vipTier.level >= 4 ? 3 : vipTier.level >= 3 ? 2 : 1;

  const storageKey = `lotto_v2_${streamId}`;

  // ── Poll localStorage for lotto state ──────────────────────────────────
  useEffect(() => {
    if (!streamId) return;
    const check = () => {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      setLotto(parsed);
      const remaining = Math.max(0, Math.floor((parsed.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && parsed.status === 'active') drawWinner(parsed);
    };
    check();
    const iv = setInterval(check, 1000);
    return () => clearInterval(iv);
  }, [streamId]);

  const drawWinner = useCallback((lottoData) => {
    if (!lottoData.entries?.length) {
      const ended = { ...lottoData, status: 'no_entries' };
      localStorage.setItem(storageKey, JSON.stringify(ended));
      setLotto(ended);
      toast.info('Lotto ended with no entries.');
      return;
    }
    const winner = lottoData.entries[Math.floor(Math.random() * lottoData.entries.length)];
    const ended = { ...lottoData, status: 'ended', winner };
    localStorage.setItem(storageKey, JSON.stringify(ended));
    setLotto(ended);
    setWinnerAnnounced(winner);
    setTimeout(() => setWinnerAnnounced(null), 9000);
  }, [storageKey]);

  // ── Host launches lotto ─────────────────────────────────────────────────
  const launchLotto = useCallback(async () => {
    if (!isBroadcaster) return;
    const prize = customPrize ? parseInt(customPrize) : prizeAmount;
    if (!prize || prize < 50 || prize > 500000) {
      toast.error('Prize must be between 50 and 500,000 Denarii');
      return;
    }
    if (entryType === 'password' && !secretPassword.trim()) {
      toast.error('Enter a secret password for viewers');
      return;
    }
    setIsLaunching(true);
    try {
      await onDeductDenarii?.(prize);
      const lottoData = {
        id: Date.now(),
        streamId,
        hostId: hostCreatorId,
        prize,
        endsAt: Date.now() + durationMin * 60 * 1000,
        entries: [],
        status: 'active',
        entryType,
        selectedGift: entryType === 'gift' ? selectedGift : null,
        password: entryType === 'password' ? secretPassword.trim().toLowerCase() : null,
      };
      localStorage.setItem(storageKey, JSON.stringify(lottoData));
      setLotto(lottoData);
      setTimeLeft(durationMin * 60);
      setShowPanel(false);
      setCustomPrize('');
      toast.success(`🎟️ Lotto live! ${prize.toLocaleString()} Denarii prize!`);
    } catch (e) {
      toast.error('Failed to fund lotto');
    } finally {
      setIsLaunching(false);
    }
  }, [isBroadcaster, prizeAmount, customPrize, durationMin, entryType, selectedGift, secretPassword, streamId, hostCreatorId, onDeductDenarii, storageKey]);

  // ── Viewer enters lotto ─────────────────────────────────────────────────
  const enterLotto = useCallback(async (opts = {}) => {
    if (!lotto || lotto.status !== 'active' || isEntering) return;

    if (lotto.entryType === 'password') {
      const guess = (opts.password || passwordInput).trim().toLowerCase();
      if (guess !== lotto.password) {
        toast.error('Wrong password — try again!');
        return;
      }
    }

    if (lotto.entryType === 'gift') {
      // Deduct gift cost from viewer wallet
      const giftCost = lotto.selectedGift?.cost || 5;
      if (walletBalance < giftCost) {
        toast.error(`Need ${giftCost} Denarii to send this gift`);
        return;
      }
      try {
        await onDeductDenarii?.(giftCost);
      } catch {
        toast.error('Failed to send gift');
        return;
      }
    }

    setIsEntering(true);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const alreadyEntered = stored.entries?.some(e => e.user === currentUser?.email);
      if (alreadyEntered && lotto.entryType !== 'gift') {
        toast.info("You've already entered!");
        setIsEntering(false);
        return;
      }
      const entry = {
        user: currentUser?.email,
        name: currentUser?.full_name || 'Viewer',
        ts: Date.now(),
        entryType: lotto.entryType,
      };
      const entriesToAdd = Array(entryMultiplier).fill(entry);
      const updated = { ...stored, entries: [...(stored.entries || []), ...entriesToAdd] };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setLotto(updated);
      setMyEntries(prev => prev + entryMultiplier);
      setPasswordInput('');
      toast.success(entryMultiplier > 1
        ? `🎟️ ${entryMultiplier}× entries! (${vipTier.name} bonus)`
        : '🎟️ You\'re entered!');
    } finally {
      setIsEntering(false);
    }
  }, [lotto, isEntering, walletBalance, onDeductDenarii, storageKey, currentUser, entryMultiplier, vipTier, passwordInput]);

  const handleShare = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Watch this stream!', url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Stream link copied!');
      }
      enterLotto();
    } catch {
      // User cancelled share
    }
  }, [enterLotto]);

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const totalEntries = lotto?.entries?.length || 0;
  const winChance = totalEntries > 0 && myEntries > 0
    ? ((myEntries / totalEntries) * 100).toFixed(1) : 0;

  // ── Winner overlay ──────────────────────────────────────────────────────
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
            <p className="text-amber-200 text-sm mt-2">Won {lotto?.prize?.toLocaleString()} Denarii!</p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── No active lotto ─────────────────────────────────────────────────────
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
              className="absolute top-16 left-3 z-50 bg-black/95 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-4 w-72 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-white font-bold text-sm flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" /> New Lotto
                </p>
                <button onClick={() => setShowPanel(false)}>
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Prize */}
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Prize Pool (Denarii)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {QUICK_PRIZES.map(v => (
                      <button
                        key={v}
                        onClick={() => { setPrizeAmount(v); setCustomPrize(''); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          prizeAmount === v && !customPrize ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {v.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    placeholder="Custom amount..."
                    value={customPrize}
                    onChange={e => setCustomPrize(e.target.value)}
                    min={50}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                  />
                  <p className="text-white/30 text-[10px] mt-1">Min: 50 · Max: 500,000 Denarii</p>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">Duration</label>
                  <div className="flex gap-1.5">
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

                {/* Entry Type */}
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">How Viewers Enter</label>
                  <div className="space-y-1.5">
                    {ENTRY_TYPES.map(et => {
                      const Icon = et.icon;
                      return (
                        <button
                          key={et.id}
                          onClick={() => setEntryType(et.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
                            entryType === et.id
                              ? 'bg-amber-500/30 border border-amber-500/60'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${entryType === et.id ? 'text-amber-400' : 'text-white/40'}`} />
                          <div>
                            <p className={`text-xs font-semibold ${entryType === et.id ? 'text-amber-200' : 'text-white/70'}`}>{et.label}</p>
                            <p className="text-[10px] text-white/30">{et.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gift selector */}
                {entryType === 'gift' && (
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">Required Gift</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {COMMON_GIFTS.map(g => (
                        <button
                          key={g.id}
                          onClick={() => setSelectedGift(g)}
                          className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all ${
                            selectedGift?.id === g.id
                              ? 'bg-amber-500/30 border border-amber-500/60'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-xl">{g.icon}</span>
                          <span className="text-[10px] text-white/60 mt-0.5">{g.name}</span>
                          <span className="text-[10px] text-amber-400">{g.cost}🪙</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Password input */}
                {entryType === 'password' && (
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">Secret Password (share verbally)</label>
                    <input
                      type="text"
                      placeholder="e.g. LEGION2026"
                      value={secretPassword}
                      onChange={e => setSecretPassword(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                <button
                  onClick={launchLotto}
                  disabled={isLaunching}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm disabled:opacity-50"
                >
                  {isLaunching ? 'Funding...' : `🎟️ Fund & Launch Lotto`}
                </button>
                <p className="text-white/25 text-[10px] text-center">
                  Denarii will be deducted from your wallet to fund the prize pool
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Active lotto widget ─────────────────────────────────────────────────
  const entryMeta = ENTRY_TYPES.find(e => e.id === lotto.entryType);
  const EntryIcon = entryMeta?.icon || Ticket;

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-900/80 to-orange-900/80 backdrop-blur-md border border-amber-500/40 rounded-2xl px-3 py-2"
      >
        <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-amber-200 text-[11px] font-bold leading-tight">
            🎟️ {lotto.prize?.toLocaleString()} D Lotto
          </span>
          <span className="text-amber-400/70 text-[10px]">
            {totalEntries} entries · {fmt(timeLeft)}
          </span>
        </div>

        {/* Entry action */}
        {myEntries > 0 ? (
          <span className="text-green-300 text-[10px] font-bold bg-green-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">
            {myEntries} tickets ({winChance}%)
          </span>
        ) : (
          <>
            {lotto.entryType === 'gift' && (
              <motion.button
                onClick={() => enterLotto()}
                disabled={isEntering || walletBalance < (lotto.selectedGift?.cost || 5)}
                className="bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                whileTap={{ scale: 0.9 }}
              >
                <span>{lotto.selectedGift?.icon || '🎁'}</span>
                <span>Send {lotto.selectedGift?.name}</span>
                {entryMultiplier > 1 && <span className="text-amber-200">{entryMultiplier}×</span>}
              </motion.button>
            )}

            {lotto.entryType === 'share' && (
              <motion.button
                onClick={handleShare}
                disabled={isEntering}
                className="bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1 disabled:opacity-50"
                whileTap={{ scale: 0.9 }}
              >
                <Share2 className="w-3 h-3" />
                Share to Enter
              </motion.button>
            )}

            {lotto.entryType === 'password' && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && enterLotto()}
                  className="bg-white/10 border border-white/20 rounded-full px-2 py-0.5 text-white text-[10px] w-24 focus:outline-none focus:border-amber-500/50 placeholder-white/30"
                />
                <motion.button
                  onClick={() => enterLotto()}
                  disabled={isEntering || !passwordInput.trim()}
                  className="bg-purple-500 hover:bg-purple-400 text-white text-[11px] font-bold rounded-full px-2 py-0.5 disabled:opacity-50"
                  whileTap={{ scale: 0.9 }}
                >
                  ✓
                </motion.button>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}