import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const INTERESTS = [
  {id:'gaming',   label:'Gaming',   emoji:'🎮'},
  {id:'music',    label:'Music',    emoji:'🎵'},
  {id:'talk',     label:'Talk',     emoji:'🎤'},
  {id:'dance',    label:'Dance',    emoji:'💃'},
  {id:'cooking',  label:'Cooking',  emoji:'🍳'},
  {id:'fitness',  label:'Fitness',  emoji:'💪'},
  {id:'art',      label:'Art',      emoji:'🎨'},
  {id:'comedy',   label:'Comedy',   emoji:'😂'},
  {id:'education',label:'Learning', emoji:'📚'},
  {id:'fashion',  label:'Fashion',  emoji:'👗'},
  {id:'tech',     label:'Tech',     emoji:'💻'},
  {id:'sports',   label:'Sports',   emoji:'⚽'},
];

export default function OnboardingFlow({ user, onComplete }) {
  const queryClient = useQueryClient();
  const [step,     setStep]     = useState(0);
  const [selected, setSelected] = useState([]);
  const btnStyle = { background:'linear-gradient(135deg,#f5a623,#d97706)', fontFamily:'Syne, sans-serif' };

  const completeMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe({ interests: selected }).catch(()=>{});
      const wallets = await base44.entities.Wallet.filter({ user_email:user.email }, null, 1);
      if (wallets[0]) await base44.entities.Wallet.update(wallets[0].id, { denarii_balance:(wallets[0].denarii_balance||0)+50 });
      localStorage.setItem('ll_onboarded','true');
    },
    onSuccess: () => { queryClient.invalidateQueries(['wallet']); onComplete?.(); },
    onError:   () => toast.error('Setup failed. Please try again.'),
  });

  const toggleInterest = id => setSelected(prev => prev.includes(id) ? prev.filter(i=>i!==id) : [...prev,id]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background:"rgba(0,0,0,0.82)", backdropFilter:"blur(8px)" }}>
      <motion.div key={step}
        initial={{ opacity:0, y:30, scale:0.95 }}
        animate={{ opacity:1, y:0,  scale:1    }}
        exit={{    opacity:0, y:-30,scale:0.95 }}
        transition={{ type:"spring", stiffness:300, damping:26 }}
        className="w-full max-w-sm"
      >
        {step === 0 && (
          <div className="rounded-3xl overflow-hidden text-center p-8"
            style={{ background:"#0F0F1A", border:"1px solid rgba(255,255,255,0.08)", boxShadow:"0 0 80px rgba(245,166,35,0.08)" }}>
            <div className="text-7xl mb-4">⚔️</div>
            <h1 className="text-white font-black text-3xl mb-2" style={{ fontFamily:"Syne, sans-serif" }}>Legion Live</h1>
            <p className="text-sm mb-6" style={{ color:"rgba(255,255,255,0.40)" }}>Stream. Gift. Earn. Create.</p>
            <div className="space-y-3 text-left mb-6">
              {[["🎁","Send and receive real-time gifts"],["💰","Earn Denarii for every stream"],["🏆","Compete in PK battles and events"],["🛍️","Shop live on Legion Market"]].map(([icon,text])=>(
                <div key={text} className="flex items-center gap-3"><span className="text-xl">{icon}</span><span className="text-sm" style={{ color:"rgba(255,255,255,0.70)" }}>{text}</span></div>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="w-full py-4 rounded-2xl font-black text-black text-base active:scale-[0.97] transition-transform" style={btnStyle}>
              Let's Go →
            </button>
          </div>
        )}
        {step === 1 && (
          <div className="rounded-3xl overflow-hidden p-6" style={{ background:"#0F0F1A", border:"1px solid rgba(255,255,255,0.08)" }}>
            <h2 className="text-white font-black text-2xl mb-1" style={{ fontFamily:"Syne, sans-serif" }}>What do you love?</h2>
            <p className="text-sm mb-4" style={{ color:"rgba(255,255,255,0.40)" }}>We'll personalise your feed. Pick at least 3.</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {INTERESTS.map(cat => (
                <button key={cat.id} onClick={() => toggleInterest(cat.id)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                  style={{ background:selected.includes(cat.id)?"rgba(245,166,35,0.18)":"rgba(255,255,255,0.04)", borderColor:selected.includes(cat.id)?"rgba(245,166,35,0.55)":"rgba(255,255,255,0.08)", color:selected.includes(cat.id)?"#f5a623":"rgba(255,255,255,0.60)" }}>
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-[10px] font-semibold">{cat.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} disabled={selected.length < 3}
              className="w-full py-4 rounded-2xl font-black text-black text-base disabled:opacity-35 active:scale-[0.97] transition-all" style={btnStyle}>
              Continue ({selected.length}/3 minimum)
            </button>
          </div>
        )}
        {step === 2 && (
          <div className="rounded-3xl overflow-hidden text-center p-8"
            style={{ background:"#0F0F1A", border:"1px solid rgba(245,166,35,0.30)", boxShadow:"0 0 60px rgba(245,166,35,0.10)" }}>
            <motion.div animate={{ scale:[1,1.1,1], rotate:[0,5,-5,0] }} transition={{ duration:1, repeat:2 }} className="text-7xl mb-4">🎁</motion.div>
            <h2 className="text-white font-black text-2xl mb-1" style={{ fontFamily:"Syne, sans-serif" }}>You're ready!</h2>
            <p className="text-sm mb-4" style={{ color:"rgba(255,255,255,0.40)" }}>Welcome to Legion Live. Here is your starter gift.</p>
            <div className="rounded-2xl p-4 mb-5" style={{ background:"rgba(245,166,35,0.10)", border:"1px solid rgba(245,166,35,0.28)" }}>
              <p className="font-black text-3xl" style={{ color:"#f5a623" }}>50 ◆ Denarii</p>
              <p className="text-xs mt-1" style={{ color:"rgba(245,166,35,0.60)" }}>Your starter currency — use it to send gifts!</p>
            </div>
            <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}
              className="w-full py-4 rounded-2xl font-black text-black text-base disabled:opacity-50 active:scale-[0.97] transition-all" style={btnStyle}>
              {completeMutation.isPending ? "Setting up…" : "Start Exploring →"}
            </button>
          </div>
        )}
        <div className="flex justify-center gap-2 mt-4">
          {[0,1,2].map(i=>(
            <div key={i} className="h-1.5 rounded-full transition-all" style={{ width:i===step?24:6, background:i===step?"#f5a623":"rgba(255,255,255,0.2)" }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}