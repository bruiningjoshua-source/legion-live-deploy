/**
 * SpinWheelOverlay — BIGO-style in-stream spin wheel.
 *
 * HOST controls: configure prizes, set Denarii cost, start/stop.
 * VIEWER experience: buy a spin, watch the wheel, claim prize.
 *
 * Prizes are stored in stream.spin_wheel_config (JSON column).
 * Results written to gift_transactions with reason='spin_wheel'.
 * The spin result is server-authoritative — client animation only.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Settings, Play, Square, Coins, Trophy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// ── Default prize pool ─────────────────────────────────────────────────────
const DEFAULT_PRIZES = [
  { id:'p1', label:'100 Denarii',  value:100,  color:'#f5a623', type:'denarii',  weight:30 },
  { id:'p2', label:'50 Denarii',   value:50,   color:'#e63946', type:'denarii',  weight:25 },
  { id:'p3', label:'500 Denarii',  value:500,  color:'#8b5cf6', type:'denarii',  weight:10 },
  { id:'p4', label:'VIP Badge',    value:1,    color:'#06b6d4', type:'vip',      weight:15 },
  { id:'p5', label:'Try Again',    value:0,    color:'#374151', type:'retry',    weight:12 },
  { id:'p6', label:'1000 Denarii', value:1000, color:'#10b981', type:'denarii',  weight:5  },
  { id:'p7', label:'Shoutout',     value:1,    color:'#ec4899', type:'shoutout', weight:2  },
  { id:'p8', label:'200 Denarii',  value:200,  color:'#f59e0b', type:'denarii',  weight:1  },
];

// ── Weighted random prize selection (server-side authoritative) ────────────
function pickPrize(prizes) {
  const total = prizes.reduce((s, p) => s + (p.weight || 1), 0);
  let r = Math.random() * total;
  for (const p of prizes) {
    r -= (p.weight || 1);
    if (r <= 0) return p;
  }
  return prizes[prizes.length - 1];
}

// ── Canvas wheel renderer ──────────────────────────────────────────────────
function WheelCanvas({ prizes, rotation, size = 280 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !prizes.length) return;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size / 2 - 8;
    const arc = (Math.PI * 2) / prizes.length;

    ctx.clearRect(0, 0, size, size);

    prizes.forEach((prize, i) => {
      const start = i * arc + rotation - Math.PI / 2;
      const end = start + arc;

      // Segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size < 240 ? 9 : 11}px "DM Sans", sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
      ctx.fillText(prize.label, r - 10, 4);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a14';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f5a623';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', cx, cy);
  }, [prizes, rotation, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-full" />;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function SpinWheelOverlay({ streamId, creatorId, user, wallet, isCreator, onClose }) {
  const queryClient = useQueryClient();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const rotationRef = useRef(0);
  const animRef = useRef(null);

  // Load wheel config from stream
  const { data: stream } = useQuery({
    queryKey: ['stream-wheel', streamId],
    queryFn: () => base44.entities.Stream.filter({ id: streamId }, null, 1).then(r => r[0]),
    enabled: !!streamId,
    staleTime: 30_000,
  });

  const prizes = stream?.spin_wheel_config?.prizes || DEFAULT_PRIZES;
  const costDenarii = stream?.spin_wheel_config?.cost || 200;
  const isActive = stream?.spin_wheel_config?.active !== false;

  const canAfford = (wallet?.denarii_balance || 0) >= costDenarii;

  // ── Spin mutation ──────────────────────────────────────────────────────
  const spinMutation = useMutation({
    mutationFn: async () => {
      if (!canAfford) throw new Error(`Need ${costDenarii} Denarii to spin`);
      if (isSpinning) throw new Error('Already spinning');

      // Server picks the prize (authoritative)
      const prize = pickPrize(prizes);
      const prizeIndex = prizes.findIndex(p => p.id === prize.id);

      // Deduct cost from viewer wallet
      await base44.functions.invoke('sendGift', {
        giftId: null,
        quantity: 1,
        creatorId,
        streamId,
        amountDenarii: costDenarii,
        reason: 'spin_wheel',
      });

      // Credit prize if it has value
      if (prize.type === 'denarii' && prize.value > 0) {
        await base44.entities.Wallet.filter({ user_email: user.email }, null, 1).then(async ([w]) => {
          if (w) await base44.entities.Wallet.update(w.id, {
            denarii_balance: (w.denarii_balance || 0) + prize.value
          });
        });
      }

      // Log to gift transactions
      await base44.entities.GiftTransaction.create({
        stream_id: streamId,
        sender_email: user.email,
        sender_name: user.full_name || 'Viewer',
        receiver_email: creatorId,
        gift_id: null,
        quantity: 1,
        total_as_value: costDenarii,
        reason: `spin_wheel:${prize.id}`,
        prize_won: prize.label,
      }).catch(() => {});

      return { prize, prizeIndex };
    },
    onSuccess: ({ prize, prizeIndex }) => {
      // Animate wheel to land on prize
      const arcPerSlice = (Math.PI * 2) / prizes.length;
      const targetAngle = -(prizeIndex * arcPerSlice) + Math.PI / 2;
      const fullSpins = (5 + Math.random() * 3) * Math.PI * 2;
      const finalRotation = rotationRef.current + fullSpins + targetAngle - rotationRef.current % (Math.PI * 2);

      const start = performance.now();
      const duration = 4000;
      const startRot = rotationRef.current;

      setIsSpinning(true);
      setResult(null);

      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentRot = startRot + (finalRotation - startRot) * eased;
        rotationRef.current = currentRot;
        setRotation(currentRot);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          setIsSpinning(false);
          setResult(prize);
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['gift-leaderboard'] });
          if (prize.type === 'shoutout') {
            toast.success(`🎉 You won a shoutout! The host will call your name!`);
          } else if (prize.type === 'denarii' && prize.value > 0) {
            toast.success(`🎰 You won ${prize.value.toLocaleString()} Denarii!`, { duration: 5000 });
          } else if (prize.type === 'retry') {
            toast(`😔 Try again!`);
          }
        }
      };
      animRef.current = requestAnimationFrame(animate);
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  // ── Host config mutation ───────────────────────────────────────────────
  const [editCost, setEditCost] = useState(costDenarii);
  const configMutation = useMutation({
    mutationFn: async ({ active }) => {
      await base44.entities.Stream.update(stream?.id, {
        spin_wheel_config: {
          ...(stream?.spin_wheel_config || {}),
          prizes,
          cost: editCost,
          active,
        }
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stream-wheel'] }); toast.success('Wheel updated'); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-4 px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative w-full max-w-sm ll-card p-5 space-y-4"
        style={{ background:'#0a0a14', border:'1px solid rgba(245,166,35,0.25)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="ll-heading text-lg text-white">🎰 Spin the Wheel</h2>
            <p className="text-white/40 text-xs">Cost: {costDenarii.toLocaleString()} Denarii per spin</p>
          </div>
          <div className="flex items-center gap-2">
            {isCreator && (
              <button onClick={() => setShowConfig(v => !v)}
                className="w-8 h-8 ll-card-inset rounded-xl flex items-center justify-center ll-interactive">
                <Settings className="w-4 h-4 text-white/50" />
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 ll-card-inset rounded-xl flex items-center justify-center ll-interactive">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        {/* Host config panel */}
        <AnimatePresence>
          {showConfig && isCreator && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
              className="ll-card-inset p-3 space-y-3 overflow-hidden">
              <p className="ll-label text-white/30">Wheel Settings</p>
              <div>
                <p className="text-white/50 text-xs mb-1">Spin cost (Denarii)</p>
                <input type="number" value={editCost} onChange={e => setEditCost(Number(e.target.value))}
                  className="ll-input h-9 text-sm" min={50} step={50} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => configMutation.mutate({ active: true })}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#34d399' }}>
                  <Play className="w-3 h-3" /> Activate
                </button>
                <button onClick={() => configMutation.mutate({ active: false })}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  style={{ background:'rgba(230,57,70,0.1)', border:'1px solid rgba(230,57,70,0.25)', color:'#ff6b78' }}>
                  <Square className="w-3 h-3" /> Pause
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wheel */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Pointer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
              <div className="w-0 h-0" style={{
                borderLeft:'8px solid transparent',
                borderRight:'8px solid transparent',
                borderTop:'20px solid #f5a623',
                filter:'drop-shadow(0 0 8px rgba(245,166,35,0.8))',
              }} />
            </div>
            <div className={`transition-transform duration-75 ${isSpinning ? '' : ''}`}>
              <WheelCanvas prizes={prizes} rotation={rotation} size={260} />
            </div>
            {/* Glow when spinning */}
            {isSpinning && (
              <div className="absolute inset-0 rounded-full animate-pulse"
                style={{ boxShadow:'0 0 40px rgba(245,166,35,0.4)' }} />
            )}
          </div>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ scale:0.7, opacity:0 }}
                animate={{ scale:1, opacity:1 }}
                exit={{ opacity:0 }}
                className="text-center px-4 py-3 rounded-2xl"
                style={{ background:`${result.color}22`, border:`1px solid ${result.color}55` }}>
                <p className="text-white font-black text-lg">🎉 {result.label}!</p>
                {result.type === 'denarii' && result.value > 0 && (
                  <p className="text-white/60 text-xs mt-0.5">+{result.value.toLocaleString()} added to your wallet</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spin button */}
          {(!isCreator) && (
            <div className="w-full">
              {!canAfford ? (
                <div className="text-center">
                  <p className="text-white/40 text-xs mb-2">Need {costDenarii.toLocaleString()} Denarii</p>
                  <p className="text-amber-400/60 text-xs">You have {(wallet?.denarii_balance || 0).toLocaleString()}</p>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => spinMutation.mutate()}
                  disabled={isSpinning || spinMutation.isPending || !isActive}
                  className="w-full py-3.5 rounded-2xl font-black text-base text-black disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: isSpinning ? 'rgba(245,166,35,0.4)' : 'linear-gradient(135deg,#f5a623,#e6950a)', boxShadow: '0 4px 20px rgba(245,166,35,0.35)' }}>
                  {isSpinning ? (
                    <><RefreshCw className="w-5 h-5 animate-spin" /> Spinning…</>
                  ) : (
                    <>🎰 Spin for {costDenarii.toLocaleString()} 🪙</>
                  )}
                </motion.button>
              )}
            </div>
          )}

          {isCreator && !showConfig && (
            <p className="text-white/30 text-xs text-center">
              {isActive ? '✅ Wheel is live — viewers can spin' : '⏸ Wheel is paused'}
            </p>
          )}
        </div>

        {/* Prize list */}
        <div className="ll-card-inset p-3">
          <p className="ll-label text-white/25 mb-2">Prizes</p>
          <div className="grid grid-cols-2 gap-1.5">
            {prizes.map(p => (
              <div key={p.id} className="flex items-center gap-2 py-1">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="text-white/55 text-xs">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
