import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';

export default function PKTimer({ startedAt, durationMinutes, onTimeUp }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const endTime = new Date(startedAt).getTime() + (durationMinutes || 5) * 60 * 1000;

    const tick = () => {
      const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0 && onTimeUp) onTimeUp();
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt, durationMinutes]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 30 && remaining > 0;

  return (
    <motion.div
      animate={isUrgent ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={isUrgent ? { duration: 0.5, repeat: Infinity } : {}}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-white font-mono font-bold text-lg shadow-lg ${
        isUrgent
          ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-red-500/50'
          : 'bg-gradient-to-r from-amber-600 to-amber-500 shadow-amber-500/30'
      }`}
    >
      <Timer className="w-4 h-4" />
      {mins}:{String(secs).padStart(2, '0')}
    </motion.div>
  );
}