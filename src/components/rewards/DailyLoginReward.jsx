import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Flame, X } from 'lucide-react';

const DAY_REWARDS = [
  { day:1, denarii:10,  emoji:'🌟' },
  { day:2, denarii:15,  emoji:'💫' },
  { day:3, denarii:25,  emoji:'✨' },
  { day:4, denarii:35,  emoji:'🔥' },
  { day:5, denarii:50,  emoji:'💎' },
  { day:6, denarii:75,  emoji:'👑' },
  { day:7, denarii:100, emoji:'⚔️' },
];

export default function DailyLoginReward({ user, onClose, onClaimed }) {
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Fetch existing streak for this user
      const streaks = await base44.entities.WatchStreak.filter({ user_email: user.email }, null, 1);
      const streak = streaks[0] || null;

      // Already claimed today — silently close
      if (streak?.last_watch_date === today) {
        return { alreadyClaimed: true };
      }

      // Calculate new streak
      const prevStreak = streak?.current_streak || 0;
      const newStreak = (streak?.last_watch_date === yesterday) ? prevStreak + 1 : 1;
      const dayIndex = (newStreak - 1) % 7;
      const rewardDenarii = DAY_REWARDS[dayIndex].denarii;

      // Update or create streak record
      if (streak?.id) {
        await base44.entities.WatchStreak.update(streak.id, {
          current_streak: newStreak,
          longest_streak: Math.max(newStreak, streak.longest_streak || 0),
          last_watch_date: today,
          total_days_watched: (streak.total_days_watched || 0) + 1,
        });
      } else {
        await base44.entities.WatchStreak.create({
          user_email: user.email,
          current_streak: 1,
          longest_streak: 1,
          last_watch_date: today,
          total_days_watched: 1,
        });
      }

      // Credit wallet
      const wallets = await base44.entities.Wallet.filter({ user_email: user.email }, null, 1);
      if (wallets[0]) {
        await base44.entities.Wallet.update(wallets[0].id, {
          denarii_balance: (wallets[0].denarii_balance || 0) + rewardDenarii,
        });
      }

      return { newStreak, rewardDenarii, day: dayIndex + 1 };
    },
    onSuccess: (data) => {
      if (data.alreadyClaimed) {
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
                <span className="text-base" style={{ opacity:isFuture?0.3:1 }}>{isPast?"✅":day.emoji}</span>
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
              {claimMutation.isPending ? "Claiming…" : `Claim ${currentReward.emoji} ${currentReward.denarii} Denarii`}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}