import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Flame, X } from 'lucide-react';

const DAY_REWARDS = [
  { day:1, denarii:10, label:'Day 1' },
  { day:2, denarii:20, label:'Day 2' },
  { day:3, denarii:30, label:'Day 3' },
  { day:4, denarii:40, label:'Day 4' },
  { day:5, denarii:50, label:'Day 5' },
  { day:6, denarii:60, label:'Day 6' },
  { day:7, denarii:70, label:'Day 7' },
];

export default function DailyLoginReward({ onClose, onClaimed }) {
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);

  const claimMutation = useMutation({
    mutationFn: async () => {
      // Server-authoritative: the streak, reward amount and wallet credit are
      // computed and applied in the claim_daily_reward RPC so the balance can't
      // be tampered with from the client, and the reward is idempotent per day.
      const res = await base44.functions.invoke('claimDailyReward', {});
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.alreadyClaimed) {
        onClose?.();
        return;
      }
      setCurrentDay(data.day);
      queryClient.invalidateQueries({ queryKey: ['user-wallet'] });
      setClaimed(true);
      onClaimed?.();
      toast.success(`Day ${data.newStreak} reward: +${data.rewardDenarii} Denarii!`);
    },
    onError: (err) => {
      console.error('DailyLoginReward claim error:', err);
      toast.error('Could not claim reward: ' + (err?.message || 'Unknown error'));
    },
  });

  const currentReward = DAY_REWARDS[currentDay - 1];

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4"
      style={{ backdropFilter:"blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale:0.85, y:40 }} animate={{ scale:1, y:0 }}
        exit={{ scale:0.85, y:40 }}
        transition={{ type:"spring", stiffness:300, damping:24 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background:"#0F0F1A", border:"1px solid rgba(245,166,35,0.3)", boxShadow:"0 0 60px rgba(245,166,35,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative px-6 pt-6 pb-4 text-center"
          style={{ background:"linear-gradient(180deg, rgba(245,166,35,0.12) 0%, transparent 100%)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-bold text-sm uppercase tracking-widest">Daily Reward</span>
          </div>
          <p className="text-white text-2xl font-black mb-1" style={{ fontFamily:"Syne, sans-serif" }}>
            Day {currentDay} Streak
          </p>
          <p className="text-sm" style={{ color:"rgba(255,255,255,0.40)" }}>Log in every day to earn more Denarii</p>
        </div>
        <div className="px-4 py-4 grid grid-cols-7 gap-1.5">
          {DAY_REWARDS.map((day, i) => {
            const dayNum = i + 1;
            const isPast = dayNum < currentDay;
            const isCurrent = dayNum === currentDay;
            const isFuture = dayNum > currentDay;
            return (
              <div key={day.day} className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-center"
                style={{ background:isCurrent?"rgba(245,166,35,0.18)":isPast?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)", border:isCurrent?"1px solid rgba(245,166,35,0.55)":"1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-base" style={{ opacity:isFuture?0.3:1 }}>{isPast?"✓":"◆"}</span>
                <span className="text-[8px] font-bold" style={{ color:isCurrent?"#f5a623":"rgba(255,255,255,0.3)" }}>D{day.day}</span>
                <span className="text-[8px]" style={{ color:isCurrent?"#fff":"rgba(255,255,255,0.2)" }}>{day.denarii}◆</span>
              </div>
            );
          })}
        </div>
        <div className="px-4 pb-6">
          {claimed ? (
            <div className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
              style={{ background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.30)" }}>
              <span className="text-2xl">✅</span>
              <span className="font-bold" style={{ color:"#34d399" }}>Claimed! +{currentReward.denarii} Denarii</span>
            </div>
          ) : (
            <button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}
              className="w-full py-4 rounded-2xl font-black text-black text-base disabled:opacity-50 active:scale-[0.97] transition-transform"
              style={{ background:"linear-gradient(135deg,#f5a623,#d97706)", fontFamily:"Syne, sans-serif" }}>
              {claimMutation.isPending ? "Claiming…" : `Claim +${currentReward.denarii} Denarii`}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}