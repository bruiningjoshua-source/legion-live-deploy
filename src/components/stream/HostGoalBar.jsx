/**
 * HostGoalBar — Denarii goal bar for stream hosts.
 * Host sets a goal + reward label. Progress updates in real-time.
 * Triggers celebration when goal is reached.
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Edit2, Check, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

export default function HostGoalBar({ streamId, isHost, currentTotal = 0, onGoalUpdate }) {
  const [goal, setGoal]         = useState(null);   // { amount, label }
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState({ amount: 1000, label: '🎉 Special performance!' });
  const [celebrated, setCelebrated] = useState(false);

  const progress   = goal ? Math.min(100, (currentTotal / goal.amount) * 100) : 0;
  const isComplete = goal && currentTotal >= goal.amount;

  useEffect(() => {
    if (isComplete && !celebrated && goal) {
      setCelebrated(true);
      confetti({ particleCount: 150, spread: 90, origin:{y:0.6}, colors:['#f5a623','#fff','#ef4444'] });
      toast.success(`🎉 Goal reached! ${goal.label}`, { duration: 8000 });
    }
  }, [isComplete, celebrated, goal]);

  const saveGoal = () => {
    if (!draft.amount || !draft.label.trim()) return;
    setGoal({ ...draft });
    setCelebrated(false);
    setEditing(false);
    onGoalUpdate?.({ amount: draft.amount, label: draft.label });
    toast.success('Goal set!');
  };

  if (!isHost && !goal) return null;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {editing && isHost ? (
          <motion.div key="edit" initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
            className="ll-card p-3 space-y-2">
            <p className="ll-label text-white/30">Set Stream Goal</p>
            <div className="flex gap-2">
              <input type="number" value={draft.amount}
                onChange={e=>setDraft(d=>({...d,amount:Number(e.target.value)}))}
                className="ll-input py-2 w-28 text-sm" placeholder="Amount" />
              <span className="text-white/40 text-sm self-center">🪙</span>
            </div>
            <input value={draft.label} onChange={e=>setDraft(d=>({...d,label:e.target.value}))}
              className="ll-input py-2 text-sm w-full" placeholder="Reward label (e.g. 🎵 Live song request)" />
            <div className="flex gap-2">
              <button onClick={saveGoal}
                className="flex-1 py-2 rounded-xl text-sm font-bold ll-interactive"
                style={{background:'rgba(245,166,35,0.2)',border:'1px solid rgba(245,166,35,0.4)',color:'#f5a623'}}>
                <Check className="w-4 h-4 inline mr-1" />Set Goal
              </button>
              <button onClick={()=>setEditing(false)}
                className="px-3 py-2 rounded-xl ll-card ll-interactive">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </motion.div>
        ) : goal ? (
          <motion.div key="active" initial={{opacity:0}} animate={{opacity:1}}
            className="px-3 py-2 rounded-xl"
            style={{
              background: isComplete ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.5)',
              border: `1px solid ${isComplete ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
              backdropFilter: 'blur(8px)',
            }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {isComplete
                  ? <Zap className="w-3 h-3 text-emerald-400" />
                  : <Target className="w-3 h-3 text-amber-400" />}
                <span className="text-white text-xs font-semibold truncate max-w-[160px]">
                  {isComplete ? '✅ ' : ''}{goal.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-amber-400 text-xs font-bold">
                  {currentTotal.toLocaleString()} / {goal.amount.toLocaleString()}🪙
                </span>
                {isHost && (
                  <button onClick={()=>setEditing(true)} className="ll-interactive">
                    <Edit2 className="w-3 h-3 text-white/30" />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{width:0}}
                animate={{width:`${progress}%`}}
                transition={{duration:0.5,ease:'easeOut'}}
                className="h-full rounded-full"
                style={{
                  background: isComplete
                    ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : 'linear-gradient(90deg,#f5a623,#ffc156)',
                  boxShadow: isComplete ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(245,166,35,0.4)',
                }} />
            </div>
          </motion.div>
        ) : isHost ? (
          <motion.button key="empty" onClick={()=>setEditing(true)}
            className="w-full py-2 px-3 rounded-xl ll-interactive flex items-center gap-2"
            style={{background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(255,255,255,0.12)'}}>
            <Target className="w-3.5 h-3.5 text-white/30" />
            <span className="text-white/35 text-xs">+ Set a stream goal</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
