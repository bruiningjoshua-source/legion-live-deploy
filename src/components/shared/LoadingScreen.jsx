import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function LoadingScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  const Soldier = ({ delay, offset }) => (
    <motion.div
      initial={{ x: offset, opacity: 0 }}
      animate={{ x: offset, opacity: 1 }}
      transition={{ delay, duration: 0.6 }}
      className="text-4xl"
    >
      🛡️
    </motion.div>
  );

  const formations = [
    { x: -120, delay: 0 },
    { x: -80, delay: 0.1 },
    { x: -40, delay: 0.2 },
    { x: 0, delay: 0.3 },
    { x: 40, delay: 0.2 },
    { x: 80, delay: 0.1 },
    { x: 120, delay: 0 }
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-gradient-to-b from-stone-950 via-amber-950/30 to-stone-950 z-50 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent"
        />
      </div>

      {/* Decorative rays */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, rotate: i * 45 }}
          animate={{ opacity: [0, 0.4, 0], rotate: i * 45 }}
          transition={{ delay: 1, duration: 2, repeat: Infinity }}
          className="absolute w-96 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"
          style={{
            top: '50%',
            left: '50%',
            transformOrigin: 'left center',
            transform: `rotate(${i * 45}deg)`
          }}
        />
      ))}

      <div className="relative z-10">
        {/* Logo/Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-7xl mb-6 filter drop-shadow-lg"
        >
          🏛️
        </motion.div>

        {/* Legion Formation */}
        <div className="flex items-center justify-center gap-2 mb-12 h-20">
          {formations.map((formation, i) => (
            <Soldier key={i} delay={formation.delay} offset={formation.x} />
          ))}
        </div>

        {/* Main Text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-amber-100 mb-2 tracking-wider">
            LEGION LIVE
          </h1>
          <p className="text-amber-400/80 text-lg mb-1">Where Creators Command</p>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
          className="mt-8 text-center space-y-2 text-sm text-amber-300/70"
        >
          <div className="flex items-center justify-center gap-2">
            <span>📡</span>
            <span>Live Streaming</span>
            <span>•</span>
            <span>🎁</span>
            <span>Gifts & Rewards</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span>🤝</span>
            <span>Collaborations</span>
            <span>•</span>
            <span>💰</span>
            <span>Monetization</span>
          </div>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="mt-8"
        >
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full" />
        </motion.div>
      </div>

      {/* Bottom text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.5 }}
        className="absolute bottom-8 text-amber-400/50 text-xs tracking-widest"
      >
        INITIALIZING PLATFORM...
      </motion.p>
    </motion.div>
  );
}