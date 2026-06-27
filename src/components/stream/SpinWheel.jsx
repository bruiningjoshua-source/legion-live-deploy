/**
 * SpinWheel — BIGO-style animated prize wheel for Legion Live streams.
 * Host configures prizes, viewers spend tickets to spin.
 * Animated Canvas wheel with physics-based deceleration.
 * Fires winner overlay + confetti on land.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, RotateCcw, Settings } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const DEFAULT_PRIZES = [
  { id: '1', label: '500 Denarii',   color: '#f5a623', emoji: '🪙', value: 500,  type: 'denarii'  },
  { id: '2', label: 'Shoutout',      color: '#e63946', emoji: '📢', value: 0,    type: 'shoutout' },
  { id: '3', label: '1000 Denarii',  color: '#8b5cf6', emoji: '💎', value: 1000, type: 'denarii'  },
  { id: '4', label: 'Try Again',     color: '#374151', emoji: '🔄', value: 0,    type: 'retry'    },
  { id: '5', label: 'VIP Badge',     color: '#10b981', emoji: '👑', value: 0,    type: 'vip'      },
  { id: '6', label: '250 Denarii',   color: '#f59e0b', emoji: '🪙', value: 250,  type: 'denarii'  },
  { id: '7', label: 'JACKPOT 5000',  color: '#ef4444', emoji: '🎰', value: 5000, type: 'denarii'  },
  { id: '8', label: 'Fan Badge',     color: '#3b82f6', emoji: '⭐', value: 0,    type: 'badge'    },
];

const TICKET_COST = 50; // Denarii per spin

// ── Canvas wheel renderer ──────────────────────────────────────────────────────
function drawWheel(canvas, prizes, rotation) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r  = cx - 8;
  const arc = (Math.PI * 2) / prizes.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Outer ring glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + 8);
  glow.addColorStop(0, 'rgba(245,166,35,0)');
  glow.addColorStop(1, 'rgba(245,166,35,0.25)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fill();

  prizes.forEach((prize, i) => {
    const startAngle = rotation + i * arc;
    const endAngle   = startAngle + arc;

    // Slice
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = prize.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(10, 180 / prizes.length)}px Inter, sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 4;
    ctx.fillText(prize.emoji + ' ' + prize.label, r - 10, 5);
    ctx.restore();
  });

  // Center hub
  const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
  hubGrad.addColorStop(0, '#fff');
  hubGrad.addColorStop(1, '#e5e7eb');
  ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad; ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2; ctx.stroke();

  // Center L logo
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', cx, cy);
}

// ── Main SpinWheel component ──────────────────────────────────────────────────
export default function SpinWheel({ streamId, isHost, onClose }) {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const spinRef    = useRef({ angle: 0, velocity: 0, spinning: false });

  const [prizes, setPrizes]       = useState(DEFAULT_PRIZES);
  const [winner, setWinner]       = useState(null);
  const [spinning, setSpinning]   = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [newPrize, setNewPrize]   = useState({ label:'', emoji:'🎁', color:'#8b5cf6', value:0, type:'denarii' });
  const [ticketCost, setTicketCost] = useState(TICKET_COST);

  const { data: user } = useQuery({ queryKey:['current-user'], queryFn:()=>base44.auth.me() });
  const { data: wallet } = useQuery({
    queryKey:['wallet', user?.email],
    queryFn: ()=>base44.entities.Wallet.filter({ user_email: user?.email }),
    enabled: !!user?.email,
    select: d=>d[0],
  });

  // Render loop
  const render = useCallback(() => {
    drawWheel(canvasRef.current, prizes, spinRef.current.angle);
    if (spinRef.current.spinning) {
      spinRef.current.angle += spinRef.current.velocity;
      spinRef.current.velocity *= 0.985; // friction
      if (spinRef.current.velocity < 0.003) {
        spinRef.current.spinning = false;
        spinRef.current.velocity = 0;
        // Determine winner
        const normalized = (((-spinRef.current.angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const arc = (Math.PI * 2) / prizes.length;
        const idx = Math.floor(normalized / arc) % prizes.length;
        const won = prizes[idx];
        setWinner(won);
        setSpinning(false);
        // Confetti
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#f5a623','#ef4444','#8b5cf6','#10b981'] });
        // Award prize
        if (won.type === 'denarii' && won.value > 0 && user?.email) {
          base44.functions.invoke('sendGift', { creatorId: user.id, streamId, giftId:'spin_win', quantity:1, reason:`Spin wheel win: ${won.label}`, amountDenarii: -won.value }).catch(()=>{});
        }
        toast.success(`🎉 ${won.emoji} ${won.label}!`, { duration: 5000 });
      }
      rafRef.current = requestAnimationFrame(render);
    }
  }, [prizes, streamId, user]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  const spin = () => {
    if (spinning) return;
    if (!isHost && (wallet?.denarii_balance || 0) < ticketCost) {
      toast.error(`Need ${ticketCost} Denarii to spin`); return;
    }
    setWinner(null); setSpinning(true);
    spinRef.current.spinning = true;
    spinRef.current.velocity = 0.25 + Math.random() * 0.2;
    rafRef.current = requestAnimationFrame(render);
  };

  const addPrize = () => {
    if (!newPrize.label.trim()) return;
    setPrizes(p => [...p, { ...newPrize, id: Date.now().toString() }]);
    setNewPrize({ label:'', emoji:'🎁', color:'#8b5cf6', value:0, type:'denarii' });
  };

  return (
    <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#0a0a14] rounded-3xl border border-white/10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/8">
          <div>
            <h2 className="ll-heading text-white text-lg">🎰 Spin Wheel</h2>
            <p className="text-white/35 text-xs">{ticketCost} Denarii per spin</p>
          </div>
          <div className="flex gap-2">
            {isHost && (
              <button onClick={()=>setShowConfig(v=>!v)}
                className="w-9 h-9 rounded-xl ll-card flex items-center justify-center ll-interactive">
                <Settings className="w-4 h-4 text-white/50" />
              </button>
            )}
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl ll-card flex items-center justify-center ll-interactive">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Config panel */}
        <AnimatePresence>
          {showConfig && isHost && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
              className="overflow-hidden border-b border-white/8">
              <div className="p-4 space-y-3">
                <p className="ll-label text-white/30">Ticket Cost</p>
                <div className="flex items-center gap-2">
                  <input type="number" value={ticketCost} onChange={e=>setTicketCost(Number(e.target.value))}
                    className="ll-input flex-1 py-2" placeholder="50" />
                  <span className="text-white/40 text-sm">Denarii</span>
                </div>
                <p className="ll-label text-white/30 mt-2">Add Prize</p>
                <div className="flex gap-2">
                  <input value={newPrize.emoji} onChange={e=>setNewPrize(p=>({...p,emoji:e.target.value}))}
                    className="ll-input w-14 text-center py-2" maxLength={2} />
                  <input value={newPrize.label} onChange={e=>setNewPrize(p=>({...p,label:e.target.value}))}
                    className="ll-input flex-1 py-2" placeholder="Prize name" />
                  <input type="color" value={newPrize.color} onChange={e=>setNewPrize(p=>({...p,color:e.target.value}))}
                    className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
                </div>
                <div className="flex gap-2">
                  <input type="number" value={newPrize.value} onChange={e=>setNewPrize(p=>({...p,value:Number(e.target.value)}))}
                    className="ll-input flex-1 py-2" placeholder="Denarii value (0 if non-currency)" />
                  <button onClick={addPrize}
                    className="px-4 py-2 rounded-xl text-sm font-bold ll-interactive"
                    style={{background:'rgba(245,166,35,0.2)',border:'1px solid rgba(245,166,35,0.4)',color:'#f5a623'}}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {prizes.map(p=>(
                    <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/4">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{background:p.color}} />
                      <span className="text-white/70 text-xs flex-1">{p.emoji} {p.label}</span>
                      <button onClick={()=>setPrizes(ps=>ps.filter(x=>x.id!==p.id))}
                        className="text-red-400/60 hover:text-red-400 ll-interactive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wheel */}
        <div className="relative p-6 flex flex-col items-center gap-4">
          {/* Pointer */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center"
            style={{transform:'translateX(-50%) translateY(2px)'}}>
            <div className="w-0 h-0"
              style={{borderLeft:'10px solid transparent',borderRight:'10px solid transparent',borderTop:'22px solid #f5a623',filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'}} />
          </div>

          <div className="relative">
            <canvas ref={canvasRef} width={280} height={280}
              className="rounded-full"
              style={{filter: spinning ? 'drop-shadow(0 0 20px rgba(245,166,35,0.4))' : 'none', transition:'filter 0.3s'}} />
          </div>

          {/* Winner banner */}
          <AnimatePresence>
            {winner && (
              <motion.div initial={{opacity:0,y:20,scale:0.8}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,scale:0.8}}
                className="w-full p-4 rounded-2xl text-center"
                style={{background:`${winner.color}22`,border:`2px solid ${winner.color}66`}}>
                <div className="text-3xl mb-1">{winner.emoji}</div>
                <p className="ll-heading text-white text-base">{winner.label}</p>
                {winner.value > 0 && <p className="text-white/50 text-xs mt-0.5">+{winner.value} Denarii awarded</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin button */}
          <button onClick={spin} disabled={spinning}
            className="w-full py-4 rounded-2xl ll-heading text-base ll-interactive transition-all disabled:opacity-50"
            style={{
              background: spinning ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#f5a623,#e6891e)',
              color: spinning ? 'rgba(255,255,255,0.4)' : '#000',
              boxShadow: spinning ? 'none' : '0 4px 24px rgba(245,166,35,0.35)',
            }}>
            {spinning ? (
              <span className="flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin" /> Spinning…
              </span>
            ) : isHost ? '🎰 Test Spin (Free)' : `🎰 Spin — ${ticketCost} Denarii`}
          </button>

          {!isHost && (
            <p className="text-white/25 text-xs text-center">
              Balance: {(wallet?.denarii_balance || 0).toLocaleString()} Denarii
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
