/**
 * ViewerChallenge — Host posts timed challenges for viewers.
 * "First to send X gifts wins shoutout" etc.
 * Countdown timer, progress tracker, winner claim.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Clock, Trophy, Plus, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const CHALLENGE_TEMPLATES = [
  { icon:'🎁', label:'First to send 10 gifts', type:'gifts',   target:10,  reward:'Shoutout',     duration:60  },
  { icon:'💰', label:'First to send 500 Denarii', type:'denarii', target:500, reward:'VIP badge',   duration:120 },
  { icon:'💬', label:'Most active chatter',    type:'messages',target:20,  reward:'Co-host slot', duration:180 },
  { icon:'🌹', label:'Send a Rose gift',       type:'gift_id', target:1,   reward:'Song request', duration:90  },
];

export default function ViewerChallenge({ streamId, isHost, onClose }) {
  const timerRef = useRef(null);
  const [phase, setPhase]       = useState('setup');
  const [template, setTemplate] = useState(null);
  const [custom, setCustom]     = useState({ label:'', reward:'', target:5, type:'gifts', duration:60 });
  const [timeLeft, setTimeLeft] = useState(0);
  const [entries, setEntries]   = useState({});  // email → progress
  const [winner, setWinner]     = useState(null);
  const [myProgress, setMyProgress] = useState(0);

  const { data: user } = useQuery({ queryKey:['current-user'], queryFn:()=>base44.auth.me() });

  const cfg = template ?? custom;

  useEffect(() => {
    if (phase !== 'active') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          endChallenge();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const startChallenge = () => {
    if (!cfg.label || !cfg.reward) { toast.error('Fill in challenge details'); return; }
    setEntries({});
    setWinner(null);
    setMyProgress(0);
    setTimeLeft(cfg.duration);
    setPhase('active');
    toast.success('⚡ Challenge started!');
  };

  const contribute = () => {
    if (!user?.email) return;
    const email = user.email;
    const name  = user.full_name || email.split('@')[0];
    setEntries(e => {
      const curr = e[email]?.progress || 0;
      const next = curr + 1;
      // Check if winner
      if (next >= cfg.target && !winner) {
        clearInterval(timerRef.current);
        setWinner({ email, name, progress: next });
        setPhase('winner');
        confetti({ particleCount: 150, spread: 80, origin:{y:0.5} });
        toast.success(`🏆 ${name} completed the challenge!`, { duration:6000 });
      }
      return { ...e, [email]: { name, progress: next } };
    });
    setMyProgress(p => p + 1);
  };

  const endChallenge = () => {
    // Pick winner by highest progress
    const sorted = Object.entries(entries).sort(([,a],[,b])=>b.progress-a.progress);
    if (sorted.length > 0) {
      const [email, data] = sorted[0];
      setWinner({ email, ...data });
      setPhase('winner');
      confetti({ particleCount: 100, spread: 70, origin:{y:0.5} });
    } else {
      setPhase('setup');
      toast.info('Challenge ended — no entries');
    }
  };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const topEntries = Object.entries(entries).sort(([,a],[,b])=>b.progress-a.progress).slice(0,5);

  return (
    <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0a0a14] rounded-3xl border border-white/10 overflow-hidden max-h-[88vh] overflow-y-auto">

        <div className="flex items-center justify-between p-4 border-b border-white/8 sticky top-0 bg-[#0a0a14]">
          <h2 className="ll-heading text-white text-lg">⚡ Viewer Challenge</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-xl ll-card flex items-center justify-center ll-interactive">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {phase === 'setup' && (
            <>
              <p className="ll-label text-white/30">Quick Templates</p>
              <div className="space-y-2">
                {CHALLENGE_TEMPLATES.map((t,i)=>(
                  <button key={i} onClick={()=>{ setTemplate(t); }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl ll-interactive text-left transition-all"
                    style={{
                      background: template===t ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.04)',
                      border:`1.5px solid ${template===t ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <span className="text-2xl">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{t.label}</p>
                      <p className="text-white/40 text-xs">Reward: {t.reward} · {fmt(t.duration)}</p>
                    </div>
                    {template===t && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="ll-divider" />
              <p className="ll-label text-white/30">Or Custom</p>
              <input value={custom.label} onChange={e=>{ setTemplate(null); setCustom(c=>({...c,label:e.target.value})); }}
                className="ll-input py-2.5 text-sm" placeholder="Challenge description" />
              <input value={custom.reward} onChange={e=>{ setTemplate(null); setCustom(c=>({...c,reward:e.target.value})); }}
                className="ll-input py-2.5 text-sm" placeholder="Prize / reward" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-white/40 text-xs mb-1">Target</p>
                  <input type="number" value={custom.target} onChange={e=>{ setTemplate(null); setCustom(c=>({...c,target:Number(e.target.value)})); }}
                    className="ll-input py-2 text-sm" />
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Duration (s)</p>
                  <input type="number" value={custom.duration} onChange={e=>{ setTemplate(null); setCustom(c=>({...c,duration:Number(e.target.value)})); }}
                    className="ll-input py-2 text-sm" />
                </div>
              </div>

              {isHost && (
                <button onClick={startChallenge}
                  className="w-full py-4 rounded-2xl ll-heading text-sm ll-interactive"
                  style={{background:'linear-gradient(135deg,#ef4444,#dc2626)',color:'#fff',boxShadow:'0 4px 20px rgba(239,68,68,0.3)'}}>
                  <Zap className="w-4 h-4 inline mr-2" />Launch Challenge
                </button>
              )}
            </>
          )}

          {phase === 'active' && (
            <>
              <div className="ll-card p-4 text-center" style={{borderColor:'rgba(239,68,68,0.3)'}}>
                <div className="ll-display text-4xl text-red-400 mb-1">{fmt(timeLeft)}</div>
                <p className="text-white font-semibold">{cfg.label}</p>
                <p className="text-amber-400 text-sm mt-1">🏆 {cfg.reward}</p>
                <div className="w-full h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <motion.div className="h-full bg-red-500 rounded-full"
                    style={{width:`${(timeLeft/cfg.duration)*100}%`, transition:'width 1s linear'}} />
                </div>
              </div>

              {!isHost && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 text-sm">My progress: <span className="text-amber-400 font-bold">{myProgress}/{cfg.target}</span></p>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                    <motion.div className="h-full bg-amber-500 rounded-full"
                      animate={{width:`${Math.min(100,(myProgress/cfg.target)*100)}%`}}
                      transition={{duration:0.3}} />
                  </div>
                  <button onClick={contribute}
                    className="w-full py-3 rounded-2xl font-bold text-sm ll-interactive"
                    style={{background:'linear-gradient(135deg,#ef4444,#dc2626)',color:'#fff'}}>
                    ⚡ Contribute +1
                  </button>
                </div>
              )}

              {topEntries.length > 0 && (
                <div>
                  <p className="ll-label text-white/30 mb-2">Leaderboard</p>
                  {topEntries.map(([email, data], i)=>(
                    <div key={email} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] mb-1.5">
                      <span className="text-white/30 text-xs w-4">{i+1}</span>
                      <span className="text-white/70 text-sm flex-1 truncate">{data.name}</span>
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full"
                          style={{width:`${Math.min(100,(data.progress/cfg.target)*100)}%`}} />
                      </div>
                      <span className="text-amber-400 text-xs font-bold w-10 text-right">{data.progress}/{cfg.target}</span>
                    </div>
                  ))}
                </div>
              )}

              {isHost && (
                <button onClick={()=>{ clearInterval(timerRef.current); endChallenge(); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold ll-interactive"
                  style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444'}}>
                  End Early
                </button>
              )}
            </>
          )}

          {phase === 'winner' && winner && (
            <div className="py-8 text-center space-y-4">
              <motion.div initial={{scale:0,rotate:-180}} animate={{scale:1,rotate:0}}
                transition={{type:'spring',bounce:0.5}} className="text-7xl">🏆</motion.div>
              <div>
                <p className="text-white/40 text-sm mb-1">Challenge Complete!</p>
                <p className="ll-heading text-white text-2xl">{winner.name}</p>
              </div>
              <div className="ll-card p-3">
                <p className="text-amber-400 font-bold">{cfg.reward}</p>
                <p className="text-white/30 text-xs mt-0.5">Prize awarded</p>
              </div>
              {isHost && (
                <button onClick={()=>{ setPhase('setup'); setTemplate(null); setWinner(null); }}
                  className="w-full py-3 rounded-2xl text-sm font-bold ll-interactive"
                  style={{background:'rgba(245,166,35,0.12)',border:'1px solid rgba(245,166,35,0.3)',color:'#f5a623'}}>
                  New Challenge
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
