import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FanBadge, { getBadgeTier } from './FanBadge';

const THRESHOLD = 100;

export default function EntranceEffect({ viewer, onDone }) {
  const tier = getBadgeTier(viewer?.total_gifted || 0);

  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!viewer || (viewer.total_gifted || 0) < THRESHOLD) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -56 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -56 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="absolute top-16 left-0 right-0 z-50 flex justify-center pointer-events-none"
      >
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${tier.color}1A, ${tier.color}08)`,
            border: `1px solid ${tier.color}40`,
            boxShadow: `0 0 30px ${tier.color}28`,
            backdropFilter: 'blur(16px)',
          }}
        >
          {viewer.avatar_url ? (
            <img src={viewer.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border-2"
              style={{ borderColor: tier.color }} />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-lg shrink-0 border-2"
              style={{ backgroundColor: tier.color + '35', borderColor: tier.color }}
            >
              {viewer.name?.[0] || "?"}
            </div>
          )}
          <div>
            <p className="text-white font-black text-sm leading-none" style={{ fontFamily: "Syne, sans-serif" }}>
              {viewer.name || "Someone"} joined
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <FanBadge totalDenarii={viewer.total_gifted || 0} size="sm" showLabel />
            </div>
          </div>
          <motion.span
            animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-3xl ml-1"
          >
            {tier.badge}
          </motion.span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}