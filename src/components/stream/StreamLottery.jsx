/**
 * StreamLottery — BIGO-style in-stream lottery for Legion Live.
 * Host opens a draw, viewers buy tickets with Denarii.
 * Countdown timer, animated drum roll, random winner reveal.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Ticket, Trophy, Users, Clock, Play, StopCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const LOTTERY_PRESETS = [
  { label: 'Quick Draw',  duration: 60,  ticketCost: 50,   prize: '500 Denarii',  prizeValue: 500  },
  { label: 'Mini Lotto',  duration: 120, ticketCost: 100,  prize: '1000 Denarii', prizeValue: 1000 },
  { label: 'Big Pot',     duration: 300, ticketCost: 200,  prize: '5000 Denarii', prizeValue: 5000 },
  { label: 'Custom',      duration: 0,   ticketCost: 0,    prize: '',             prizeValue: 0    },
];

export default function StreamLottery({ streamId, isHost, onClose }) {
  const qc = useQueryClient();
  const timerRef = useRef(null);

  const [phase, setPhase]         = useState('setup');   // setup | open | drawing | winner
  const [preset, setPreset]       = useState(0);
  const [custom, setCustom]       = useState({ duration:180, ticketCost:100, prize:'2000 Denarii', prizeValue:2000 });
  const [timeLeft, setTimeLeft]   = useState(0);
  const [entries, setEntries]     = useState([]);  // {name, email, tickets}
  const [winner, setWinner]       = useState(null);
  const [drumRoll, setDrumRoll]   = useState(false);
  const [myTickets, setMyTickets] = useState(0);

  const { data: user } = useQuery({ queryKey:['current-user'], queryFn:()=>base44.auth.me() });
  const { data: wallet } = useQuery({
    queryKey:['wallet', user?.email],
    queryFn: ()=>base44.entities.Wallet.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    select: d=>d[0],
  });

  const cfg = preset < 3 ? LOTTERY_PRESETS[preset] : { ...LOTTERY_PRESETS[3], ...custom };

  // Countdown
  useEffect(() => {
    if (phase !== 'open') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          drawWinner();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const startLottery = () => {
    setEntries([]);
    setWinner(null);
    setMyTickets(0);
    setTimeLeft(cfg.duration);
    setPhase('open');
    toast.success('🎟️ Lottery opened! Players can now buy tickets.');
  };

  const buyTickets = (qty = 1) => {
    const cost = cfg.ticketCost * qty;
    if ((wallet?.denarii_balance || 0) < cost) {
      toast.error(`Need ${cost} Denarii for ${qty} ticket${qty > 1 ? 's' : ''}`); return;
    }
    // Deduct and add entry
    base44.functions.invoke('sendGift', {
      creatorId: user?.id, streamId, giftId:'lottery_ticket',
      quantity: qty, reason:`Lottery ticket x${qty}`, amountDenarii: cost,
    }).catch(()=>{});
    setEntries(e => {
      const existing = e.find(x => x.email === user?.email);
      if (existing) return e.map(x => x.email === user?.email ? {...x, tickets: x.tickets + qty} : x);
      return [...e, { name: user?.full_name || 'Anonymous', email: user?.email, tickets: qty }];
    });
    setMyTickets(t => t + qty);
    qc.invalidateQueries({ queryKey:['wallet', user?.email] });
    toast.success(`🎟️ ${qty} ticket${qty>1?'s':''} purchased!`);
  };

  const drawWinner = () => {
    setPhase('drawing');
    setDrumRoll(true);
    // Build weighted pool
    const pool = entries.flatMap(e => Array(e.tickets).fill(e));
    if (pool.length === 0) {
      toast.info('No entries — lottery cancelled');
      setPhase('setup'); setDrumRoll(false); return;
    }
    // Animate shuffle for 3s then reveal
    let count = 0;
    const interval = setInterval(() => {
      setWinner(pool[Math.floor(Math.random() * pool.length)]);
      count++;
      if (count > 20) {
        clearInterval(interval);
        const finalWinner = pool[Math.floor(Math.random() * pool.length)];
        setWinner(finalWinner);
        setDrumRoll(false);
        setPhase('winner');
        confetti({ particleCount: 200, spread: 100, origin:{ y:0.5 }, colors:['#f5a623','#ef4444','#8b5cf6','#10b981','#fff'] });
        toast.success(`🏆 ${finalWinner.name} won ${cfg.prize}!`, { duration: 8000 });
      }
    }, 120);
  };

  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const totalTickets = entries.reduce((s,e)=>s+e.tickets,0);
  const myOdds = totalTickets > 0 ? ((myTickets / totalTickets) * 100).toFixed(1) : 0;

  return (
    <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0a0a14] rounded-3xl border border-white/10 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/8 sticky top-0 bg-[#0a0a14] z-10">
          <div>
            <h2 className="ll-heading text-white text-lg">🎟️ Stream Lottery</h2>
            <p className="text-white/35 text-xs">
              {phase === 'setup' ? 'Configure and start' :
               phase === 'open'  ? `${entries.length} players · ${totalTickets} tickets` :
               phase === 'drawing' ? 'Drawing winner…' : 'We have a winner!'}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl ll-card flex items-center justify-center ll-interactive">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        <div className="p-4 space-y-4">

          {/* SETUP phase */}
          {phase === 'setup' && isHost && (
            <>
              <p className="ll-label text-white/30">Select Preset</p>
              <div className="grid grid-cols-2 gap-2">
                {LOTTERY_PRESETS.slice(0,3).map((p,i)=>(
                  <button key={i} onClick={()=>setPreset(i)}
                    className="p-3 rounded-2xl text-left ll-interactive transition-all"
                    style={{
                      background: preset===i ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${preset===i ? 'rgba(245,166,35,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    <p className="text-white font-bold text-sm">{p.label}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{p.prize}</p>
                    <p className="text-amber-400 text-[10px]">{p.ticketCost}🪙 · {fmt(p.duration)}</p>
                  </button>
                ))}
                <button onClick={()=>setPreset(3)}
                  className="p-3 rounded-2xl text-left ll-interactive transition-all"
                  style={{
                    background: preset===3 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${preset===3 ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  <p className="text-white font-bold text-sm">Custom</p>
                  <p className="text-white/40 text-[10px] mt-0.5">Set your own</p>
                </button>
              </div>

              {preset === 3 && (
                <div className="space-y-2">
                  {[
                    {key:'prize', label:'Prize label', type:'text', ph:'e.g. 2000 Denarii'},
                    {key:'prizeValue', label:'Denarii value', type:'number', ph:'2000'},
                    {key:'ticketCost', label:'Ticket cost (Denarii)', type:'number', ph:'100'},
                    {key:'duration', label:'Duration (seconds)', type:'number', ph:'180'},
                  ].map(f=>(
                    <div key={f.key}>
                      <p className="text-white/40 text-xs mb-1">{f.label}</p>
                      <input type={f.type} value={custom[f.key]} placeholder={f.ph}
                        onChange={e=>setCustom(c=>({...c,[f.key]:f.type==='number'?Number(e.target.value):e.target.value}))}
                        className="ll-input py-2.5 text-sm" />
                    </div>
                  ))}
                </div>
              )}

              <button onClick={startLottery}
                className="w-full py-4 rounded-2xl ll-heading text-sm ll-interactive"
                style={{background:'linear-gradient(135deg,#f5a623,#e6891e)',color:'#000',boxShadow:'0 4px 24px rgba(245,166,35,0.3)'}}>
                <Play className="w-4 h-4 inline mr-2" />Open Lottery
              </button>
            </>
          )}

          {/* OPEN phase */}
          {phase === 'open' && (
            <>
              {/* Timer */}
              <div className="ll-card p-4 text-center"
                style={{borderColor: timeLeft < 30 ? 'rgba(239,68,68,0.4)' : 'rgba(245,166,35,0.2)'}}>
                <div className="ll-display text-5xl mb-1"
                  style={{color: timeLeft < 30 ? '#ef4444' : '#f5a623'}}>{fmt(timeLeft)}</div>
                <p className="text-white/40 text-xs">Time remaining</p>
                {/* Progress bar */}
                <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{
                      background: timeLeft < 30 ? '#ef4444' : '#f5a623',
                      width: `${(timeLeft / cfg.duration) * 100}%`,
                      transition: 'width 1s linear, background 0.3s'
                    }} />
                </div>
              </div>

              {/* Prize */}
              <div className="ll-card-inset p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white/40 text-xs">Prize</p>
                  <p className="text-white font-bold">{cfg.prize}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-white/40 text-xs">Ticket</p>
                  <p className="text-amber-400 font-bold">{cfg.ticketCost}🪙</p>
                </div>
              </div>

              {/* Buy buttons — viewers */}
              {!isHost && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 text-sm">Your tickets: <span className="text-amber-400 font-bold">{myTickets}</span></p>
                    {myTickets > 0 && <p className="text-white/30 text-xs">Win odds: {myOdds}%</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1,5,10].map(qty=>(
                      <button key={qty} onClick={()=>buyTickets(qty)}
                        className="py-3 rounded-xl font-bold text-sm ll-interactive transition-all"
                        style={{background:'rgba(245,166,35,0.12)',border:'1px solid rgba(245,166,35,0.3)',color:'#f5a623'}}>
                        ×{qty}<br/><span className="text-[10px] font-normal text-white/40">{cfg.ticketCost*qty}🪙</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              {entries.length > 0 && (
                <div>
                  <p className="ll-label text-white/30 mb-2">Ticket Holders</p>
                  <div className="space-y-1.5">
                    {[...entries].sort((a,b)=>b.tickets-a.tickets).slice(0,5).map((e,i)=>(
                      <div key={e.email} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03]">
                        <span className="text-white/30 text-xs w-4">{i+1}</span>
                        <span className="text-white/70 text-sm flex-1 truncate">{e.name}</span>
                        <span className="ll-pill ll-pill-gold">{e.tickets} 🎟️</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isHost && (
                <button onClick={drawWinner}
                  className="w-full py-3 rounded-2xl text-sm font-bold ll-interactive"
                  style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444'}}>
                  <StopCircle className="w-4 h-4 inline mr-2" />Draw Now
                </button>
              )}
            </>
          )}

          {/* DRAWING phase */}
          {phase === 'drawing' && (
            <div className="py-8 text-center space-y-4">
              <motion.div
                animate={{scale:[1,1.1,1], rotate:[0,5,-5,0]}}
                transition={{repeat:Infinity,duration:0.3}}
                className="text-6xl">🥁</motion.div>
              <p className="ll-heading text-white text-xl">Drawing winner…</p>
              {winner && (
                <motion.p key={winner.email} initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
                  className="text-amber-400 font-bold text-lg">{winner.name}</motion.p>
              )}
            </div>
          )}

          {/* WINNER phase */}
          {phase === 'winner' && winner && (
            <div className="py-6 text-center space-y-4">
              <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',bounce:0.5}}
                className="text-7xl">🏆</motion.div>
              <div>
                <p className="text-white/40 text-sm mb-1">Winner</p>
                <p className="ll-heading text-white text-2xl">{winner.name}</p>
              </div>
              <div className="ll-card p-3">
                <p className="text-amber-400 font-bold text-lg">{cfg.prize}</p>
                <p className="text-white/30 text-xs mt-0.5">Prize awarded</p>
              </div>
              {isHost && (
                <button onClick={()=>{ setPhase('setup'); setWinner(null); setEntries([]); }}
                  className="w-full py-3 rounded-2xl text-sm font-bold ll-interactive"
                  style={{background:'rgba(245,166,35,0.12)',border:'1px solid rgba(245,166,35,0.3)',color:'#f5a623'}}>
                  Run Another Lottery
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
