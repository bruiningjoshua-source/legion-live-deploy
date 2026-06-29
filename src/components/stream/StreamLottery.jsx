/**
 * StreamLottery — Rewritten per Legion Live spec.
 *
 * Host clicks lotto icon → chooses type:
 *   share_stream  — viewers share the stream link to enter
 *   send_gift     — viewers send a gift to enter
 *   password      — viewers enter a password the host announces in chat
 *
 * Reward: 10–10,000 Denarii, deducted from HOST wallet when winner is drawn.
 * Host sets reward amount and duration. Viewer entry is free (barrier is the action).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Play, StopCircle, Share2, Gift, Lock, Check, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const LOTTO_TYPES = [
  {
    id: 'share_stream',
    label: 'Share Stream',
    icon: Share2,
    color: '#3b82f6',
    description: 'Viewers share your stream link to enter',
    howToEnter: 'Share the stream link — your entry is confirmed automatically',
  },
  {
    id: 'send_gift',
    label: 'Send Gift',
    icon: Gift,
    color: '#f5a623',
    description: 'Viewers send any gift to enter',
    howToEnter: 'Send any gift during the lottery window to enter',
  },
  {
    id: 'password',
    label: 'Password',
    icon: Lock,
    color: '#8b5cf6',
    description: 'Viewers enter a secret password you announce',
    howToEnter: 'Type the password the host announced to enter',
  },
];

const REWARD_PRESETS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export default function StreamLottery({ streamId, streamUrl, isHost, onClose, onGiftSent }) {
  const qc           = useQueryClient();
  const timerRef     = useRef(null);
  const shareUrlRef  = useRef(`${window.location.origin}/watch/${streamId}`);

  const [phase, setPhase]         = useState('type');     // type | config | open | drawing | winner
  const [lottoType, setLottoType] = useState(null);
  const [reward, setReward]       = useState(500);
  const [duration, setDuration]   = useState(120);
  const [password, setPassword]   = useState('');
  const [timeLeft, setTimeLeft]   = useState(0);
  const [entries, setEntries]     = useState([]);
  const [winner, setWinner]       = useState(null);
  const [myEntry, setMyEntry]     = useState(false);
  const [pwInput, setPwInput]     = useState('');
  const [copied, setCopied]       = useState(false);

  const { data: user }   = useQuery({ queryKey:['current-user'], queryFn:()=>base44.auth.me() });
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.email],
    queryFn:  () => base44.entities.Wallet.filter({ user_email: user?.email }),
    enabled:  !!user?.email,
    select:   d => d[0],
  });

  const balance  = wallet?.denarii_balance || 0;
  const canAfford = balance >= reward;
  const typeData  = LOTTO_TYPES.find(t => t.id === lottoType);

  // ── Auto-enter on gift send (send_gift type) ─────────────────────────────────
  useEffect(() => {
    if (lottoType === 'send_gift' && phase === 'open' && onGiftSent) {
      // Parent calls this whenever a gift is sent during the lottery
      onGiftSent(() => { if (!myEntry) enterLottery(); });
    }
  }, [lottoType, phase, onGiftSent, myEntry, enterLottery]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'open') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); drawWinner(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const startLottery = () => {
    if (!canAfford) { toast.error(`Need ${reward.toLocaleString()} Denarii to fund this lottery`); return; }
    if (lottoType === 'password' && !password.trim()) { toast.error('Set a password first'); return; }
    setEntries([]); setWinner(null); setMyEntry(false);
    setTimeLeft(duration); setPhase('open');
    toast.success(`🎟️ Lottery open! ${typeData?.description}`);
  };

  const enterLottery = useCallback((nameOverride) => {
    if (myEntry) { toast('Already entered!'); return; }
    const name = nameOverride || user?.full_name || user?.email?.split('@')[0] || 'Anonymous';
    setEntries(e => [...e, { name, email: user?.email, id: Date.now() }]);
    setMyEntry(true);
    toast.success('🎟️ You\'re entered!');
  }, [myEntry, user]);

  const submitPassword = () => {
    if (pwInput.trim().toLowerCase() === password.trim().toLowerCase()) {
      enterLottery();
    } else {
      toast.error('Wrong password');
    }
  };

  const drawWinner = useCallback(async () => {
    setPhase('drawing');
    if (entries.length === 0) {
      toast.info('No entries — lottery cancelled');
      setPhase('type'); return;
    }
    // Animate shuffle for 3s
    let count = 0;
    const interval = setInterval(() => {
      setWinner(entries[Math.floor(Math.random() * entries.length)]);
      count++;
      if (count > 20) {
        clearInterval(interval);
        const final = entries[Math.floor(Math.random() * entries.length)];
        setWinner(final);
        setPhase('winner');
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 },
          colors: ['#f5a623','#ef4444','#8b5cf6','#10b981','#fff'] });
        // Deduct from host wallet
        base44.functions.invoke('sendGift', {
          streamId, giftId: 'lottery_reward', quantity: 1,
          reason: `Lottery reward: ${reward.toLocaleString()} Denarii → ${final.name}`,
          amountDenarii: reward,
        }).catch(() => {});
        toast.success(`🏆 ${final.name} wins ${reward.toLocaleString()} Denarii!`, { duration: 8000 });
        qc.invalidateQueries({ queryKey: ['wallet', user?.email] });
      }
    }, 120);
  }, [entries, reward, streamId, user?.email, qc]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrlRef.current);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
        transition={{type:'spring',damping:30,stiffness:300}}
        className="w-full max-w-sm bg-[#0a0a14] rounded-3xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/8 sticky top-0 bg-[#0a0a14] z-10">
          <div>
            <h2 className="ll-heading text-white text-lg">🎟️ Stream Lottery</h2>
            <p className="text-white/35 text-xs">
              {phase === 'type'    ? 'Choose lottery type' :
               phase === 'config'  ? `${typeData?.label} · Set reward` :
               phase === 'open'    ? `${entries.length} entries · ${fmt(timeLeft)}` :
               phase === 'drawing' ? 'Drawing winner…' : '🏆 We have a winner!'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl ll-card flex items-center justify-center ll-interactive">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {/* ── STEP 1: Choose Type ── */}
          {phase === 'type' && (
            <>
              <p className="ll-label text-white/30">How do viewers enter?</p>
              <div className="space-y-2">
                {LOTTO_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setLottoType(t.id); setPhase('config'); }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl ll-interactive text-left transition-all"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1.5px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background:`${t.color}22`, border:`1px solid ${t.color}44` }}>
                      <t.icon className="w-5 h-5" style={{ color: t.color }} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{t.label}</p>
                      <p className="text-white/40 text-xs mt-0.5">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── STEP 2: Config ── */}
          {phase === 'config' && isHost && (
            <>
              {/* Reward amount */}
              <div>
                <p className="ll-label text-white/30 mb-3">Reward Amount (from your wallet)</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {REWARD_PRESETS.map(r => (
                    <button key={r} onClick={() => setReward(r)}
                      className="py-2.5 rounded-xl text-sm font-bold ll-interactive transition-all"
                      style={{
                        background: reward === r ? 'rgba(245,166,35,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${reward === r ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        color: reward === r ? '#f5a623' : 'rgba(255,255,255,0.6)',
                      }}>
                      {r >= 1000 ? `${r/1000}K` : r}🪙
                    </button>
                  ))}
                </div>
                {/* Custom amount */}
                <input type="number" min={10} max={10000} value={reward}
                  onChange={e => setReward(Math.max(10, Math.min(10000, Number(e.target.value))))}
                  className="ll-input py-2.5 text-sm" placeholder="Custom amount (10–10,000)" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-white/30 text-xs">Your balance: {balance.toLocaleString()} Denarii</p>
                  {!canAfford && <p className="text-red-400 text-xs">Insufficient balance</p>}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="ll-label text-white/30 mb-2">Duration</p>
                <div className="grid grid-cols-4 gap-2">
                  {[[30,'30s'],[60,'1m'],[120,'2m'],[300,'5m']].map(([s, l]) => (
                    <button key={s} onClick={() => setDuration(s)}
                      className="py-2 rounded-xl text-xs font-bold ll-interactive"
                      style={{
                        background: duration === s ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${duration === s ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        color: duration === s ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password field if type=password */}
              {lottoType === 'password' && (
                <div>
                  <p className="ll-label text-white/30 mb-2">Secret Password</p>
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    className="ll-input py-2.5 text-sm" placeholder="Announce this in chat" />
                  <p className="text-white/25 text-[10px] mt-1.5">
                    Announce this password verbally — viewers type it to enter
                  </p>
                </div>
              )}

              {/* Share link preview */}
              {lottoType === 'share_stream' && (
                <div className="ll-card-inset p-3">
                  <p className="text-white/40 text-xs mb-1.5">Viewers share this link:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white/60 text-xs flex-1 truncate font-mono">{shareUrlRef.current}</p>
                    <button onClick={copyLink} className="ll-interactive">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/30" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setPhase('type')}
                  className="px-4 py-3 rounded-2xl ll-card text-white/50 text-sm font-semibold ll-interactive">
                  ← Back
                </button>
                <button onClick={startLottery} disabled={!canAfford}
                  className="flex-1 py-3 rounded-2xl font-bold text-sm ll-interactive disabled:opacity-40"
                  style={{ background:'linear-gradient(135deg,#f5a623,#e6891e)', color:'#000' }}>
                  <Play className="w-4 h-4 inline mr-1.5" />Open Lottery
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Open ── */}
          {phase === 'open' && (
            <>
              {/* Timer */}
              <div className="ll-card p-4 text-center"
                style={{ borderColor: timeLeft < 20 ? 'rgba(239,68,68,0.4)' : `${typeData?.color}33` }}>
                <div className="ll-display text-5xl mb-1"
                  style={{ color: timeLeft < 20 ? '#ef4444' : typeData?.color }}>{fmt(timeLeft)}</div>
                <p className="text-white font-semibold">{typeData?.label} Lottery</p>
                <p className="text-amber-400 font-bold text-sm mt-1">🏆 {reward.toLocaleString()} Denarii</p>
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: typeData?.color, width:`${(timeLeft/duration)*100}%`, transition:'width 1s linear' }} />
                </div>
              </div>

              {/* Entry method for viewers */}
              {!isHost && !myEntry && (
                <div className="ll-card p-4">
                  <p className="text-white/50 text-xs mb-3">{typeData?.howToEnter}</p>
                  {lottoType === 'share_stream' && (
                    <button onClick={() => {
                      navigator.share
                        ? navigator.share({ title:'Join my stream on Legion Live!', url: shareUrlRef.current })
                            .then(() => enterLottery())
                            .catch(() => { copyLink(); enterLottery(); })
                        : (() => { copyLink(); enterLottery(); })();
                    }}
                      className="w-full py-3 rounded-2xl font-bold text-sm ll-interactive"
                      style={{ background:`${typeData?.color}22`, border:`1px solid ${typeData?.color}44`, color: typeData?.color }}>
                      <Share2 className="w-4 h-4 inline mr-2" />Share Stream to Enter
                    </button>
                  )}
                  {lottoType === 'send_gift' && (
                    <div className="ll-card-inset p-3 text-center">
                      <p className="text-2xl mb-1.5">🎁</p>
                      <p className="text-white/70 text-sm font-semibold">Send any gift to enter</p>
                      <p className="text-white/35 text-xs mt-1">Your entry is confirmed automatically when your gift goes through</p>
                    </div>
                  )}
                  {lottoType === 'password' && (
                    <div className="space-y-2">
                      <input value={pwInput} onChange={e => setPwInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && submitPassword()}
                        className="ll-input py-2.5 text-sm" placeholder="Enter the password" />
                      <button onClick={submitPassword}
                        className="w-full py-3 rounded-2xl font-bold text-sm ll-interactive"
                        style={{ background:`${typeData?.color}22`, border:`1px solid ${typeData?.color}44`, color: typeData?.color }}>
                        <Lock className="w-4 h-4 inline mr-2" />Submit Password
                      </button>
                    </div>
                  )}
                </div>
              )}

              {myEntry && (
                <div className="ll-card p-3 flex items-center gap-2"
                  style={{ borderColor:'rgba(16,185,129,0.3)', background:'rgba(16,185,129,0.08)' }}>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-emerald-400 text-sm font-semibold">You're entered! Good luck 🍀</p>
                </div>
              )}

              {/* Entry list */}
              {entries.length > 0 && (
                <div>
                  <p className="ll-label text-white/30 mb-2">{entries.length} Entries</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {entries.slice(-8).reverse().map((e, i) => (
                      <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03]">
                        <span className="text-white/70 text-sm truncate flex-1">{e.name}</span>
                        <span className="ll-pill ll-pill-gold text-[10px]">entered</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isHost && (
                <button onClick={() => { clearInterval(timerRef.current); drawWinner(); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold ll-interactive"
                  style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444' }}>
                  <StopCircle className="w-4 h-4 inline mr-1.5" />Draw Now
                </button>
              )}
            </>
          )}

          {/* ── STEP 4: Drawing ── */}
          {phase === 'drawing' && (
            <div className="py-8 text-center space-y-4">
              <motion.div animate={{scale:[1,1.1,1],rotate:[0,5,-5,0]}} transition={{repeat:Infinity,duration:0.3}} className="text-6xl">🥁</motion.div>
              <p className="ll-heading text-white text-xl">Drawing winner…</p>
              {winner && (
                <motion.p key={winner.id} initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
                  className="text-amber-400 font-bold text-lg">{winner.name}</motion.p>
              )}
            </div>
          )}

          {/* ── STEP 5: Winner ── */}
          {phase === 'winner' && winner && (
            <div className="py-6 text-center space-y-4">
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',bounce:0.5}} className="text-7xl">🏆</motion.div>
              <div>
                <p className="text-white/40 text-sm mb-1">Winner</p>
                <p className="ll-heading text-white text-2xl">{winner.name}</p>
              </div>
              <div className="ll-card p-3">
                <p className="text-amber-400 font-bold text-xl">{reward.toLocaleString()} 🪙</p>
                <p className="text-white/30 text-xs mt-0.5">Denarii transferred from host wallet</p>
              </div>
              {isHost && (
                <button onClick={() => { setPhase('type'); setWinner(null); setEntries([]); setLottoType(null); }}
                  className="w-full py-3 rounded-2xl text-sm font-bold ll-interactive"
                  style={{ background:'rgba(245,166,35,0.12)', border:'1px solid rgba(245,166,35,0.3)', color:'#f5a623' }}>
                  Run Another Lottery
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
