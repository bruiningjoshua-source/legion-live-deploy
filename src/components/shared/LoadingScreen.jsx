import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [cameraPosition, setCameraPosition] = useState({ z: 100, y: 0 });

  useEffect(() => {
    const phases = [
      setTimeout(() => setPhase(1), 800),   // Camera starts moving
      setTimeout(() => setPhase(2), 1600),  // Gates begin opening
      setTimeout(() => setPhase(3), 2400),  // Soldiers revealed
      setTimeout(() => setPhase(4), 3200),  // Camera settles on shield
      setTimeout(() => setPhase(5), 4000),  // Shield menu ready
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onComplete?.(), 500);
      }, 5000)
    ];

    return () => phases.forEach(clearTimeout);
  }, [onComplete]);

  // Camera zoom animation
  useEffect(() => {
    if (phase >= 1) {
      const interval = setInterval(() => {
        setCameraPosition(prev => ({
          z: Math.max(prev.z - 2, 0),
          y: Math.min(prev.y + 0.5, 10)
        }));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      className="fixed inset-0 bg-stone-950 z-[100] overflow-hidden"
    >
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/40 via-stone-950 to-stone-950" />
      
      {/* Distant mountains */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.3 : 0 }}
        className="absolute inset-x-0 top-[20%] h-32"
      >
        <svg viewBox="0 0 1200 200" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0 200 L100 120 L200 160 L350 80 L500 140 L650 60 L800 130 L950 90 L1100 150 L1200 100 L1200 200 Z" fill="#44403c" />
          <path d="M0 200 L150 140 L300 170 L450 110 L600 160 L750 100 L900 150 L1050 120 L1200 170 L1200 200 Z" fill="#57534e" />
        </svg>
      </motion.div>

      {/* Roman City Gate - Sweeping Camera View */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
        animate={{
          scale: phase >= 1 ? 1 + (cameraPosition.z / 100) * 0.5 : 1.5,
        }}
        transition={{ duration: 0.5 }}
      >
        {/* Gate Structure */}
        <div className="relative w-full max-w-4xl mx-auto">
          {/* Gate Towers */}
          <div className="absolute -left-8 md:-left-16 top-0 bottom-0 flex flex-col items-center">
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="w-16 md:w-24 h-80 bg-gradient-to-b from-stone-600 to-stone-800 rounded-t-lg border-2 border-stone-500 relative"
            >
              {/* Tower details */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-6 bg-stone-900 rounded-t-full" />
              <div className="absolute top-14 inset-x-2 h-2 bg-amber-700/50" />
              <div className="absolute bottom-20 inset-x-2 flex justify-around">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-8 bg-stone-900/50 rounded-t" />
                ))}
              </div>
            </motion.div>
          </div>

          <div className="absolute -right-8 md:-right-16 top-0 bottom-0 flex flex-col items-center">
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="w-16 md:w-24 h-80 bg-gradient-to-b from-stone-600 to-stone-800 rounded-t-lg border-2 border-stone-500 relative"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-6 bg-stone-900 rounded-t-full" />
              <div className="absolute top-14 inset-x-2 h-2 bg-amber-700/50" />
              <div className="absolute bottom-20 inset-x-2 flex justify-around">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-2 h-8 bg-stone-900/50 rounded-t" />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Gate Arch */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="relative mx-auto w-64 md:w-80 h-72 origin-bottom"
          >
            {/* Arch frame */}
            <div className="absolute inset-0 bg-gradient-to-b from-stone-600 to-stone-700 rounded-t-full border-4 border-stone-500">
              {/* SPQR inscription */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 2 ? 1 : 0 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 text-amber-400 font-bold text-xl md:text-2xl tracking-[0.3em]"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                SPQR
              </motion.div>
            </div>

            {/* Gate Interior (dark) */}
            <div className="absolute inset-4 top-8 bg-stone-950 rounded-t-full overflow-hidden">
              {/* Opening Gates */}
              <motion.div
                initial={{ x: '0%' }}
                animate={{ x: phase >= 2 ? '-100%' : '0%' }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="absolute left-0 top-0 w-1/2 h-full bg-gradient-to-r from-amber-900 to-amber-800 border-r-4 border-amber-600"
              >
                {/* Gate decorations */}
                <div className="absolute inset-4 border-2 border-amber-600/50 rounded-tl-full" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-500" />
              </motion.div>
              
              <motion.div
                initial={{ x: '0%' }}
                animate={{ x: phase >= 2 ? '100%' : '0%' }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-amber-900 to-amber-800 border-l-4 border-amber-600"
              >
                <div className="absolute inset-4 border-2 border-amber-600/50 rounded-tr-full" />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-500" />
              </motion.div>

              {/* Soldiers Behind Gates - Revealed when gates open */}
              <AnimatePresence>
                {phase >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-end justify-center pb-4"
                  >
                    {/* Soldier Formation - Cartoon Style */}
                    <div className="flex gap-1 md:gap-2">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="relative"
                        >
                          {/* Soldier body */}
                          <div className="w-6 md:w-8 h-12 md:h-16 bg-gradient-to-b from-red-700 to-red-900 rounded-t-lg relative">
                            {/* Helmet */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 md:w-7 h-4 bg-amber-600 rounded-t-full border border-amber-400">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-3 bg-red-500 rounded-t" />
                            </div>
                            {/* Shield */}
                            <div className="absolute -left-1 top-2 w-3 md:w-4 h-6 md:h-8 bg-red-800 rounded border border-amber-500" />
                            {/* Spear */}
                            <div className="absolute -right-1 top-0 w-0.5 h-14 md:h-18 bg-amber-700">
                              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-3 bg-stone-400 rounded-t" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Ground/Road */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-stone-700 to-stone-600"
          />
        </div>
      </motion.div>

      {/* Shield Menu - Fades in after camera settles */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="absolute inset-0 flex items-center justify-center z-20"
          >
            {/* Glowing backdrop */}
            <motion.div
              animate={{ 
                boxShadow: [
                  '0 0 60px rgba(217,119,6,0.3)',
                  '0 0 100px rgba(217,119,6,0.5)',
                  '0 0 60px rgba(217,119,6,0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-80 h-96 rounded-full bg-gradient-to-b from-amber-900/20 to-transparent blur-3xl"
            />

            {/* Interactive Shield Menu */}
            <motion.div
              animate={phase >= 5 ? { 
                rotateY: [0, 5, 0, -5, 0],
              } : {}}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <svg viewBox="0 0 200 240" className="w-64 h-80 md:w-80 md:h-96 drop-shadow-2xl">
                <defs>
                  <linearGradient id="menuShieldGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="menuShieldRed" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="50%" stopColor="#991b1b" />
                    <stop offset="100%" stopColor="#7f1d1d" />
                  </linearGradient>
                  <filter id="menuGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Shield shape */}
                <path
                  d="M100 10 L180 40 L180 120 Q180 200 100 230 Q20 200 20 120 L20 40 Z"
                  fill="url(#menuShieldRed)"
                  stroke="url(#menuShieldGold)"
                  strokeWidth="6"
                  filter="url(#menuGlow)"
                />
                
                {/* Inner border */}
                <path
                  d="M100 25 L165 50 L165 115 Q165 185 100 210 Q35 185 35 115 L35 50 Z"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity="0.5"
                />

                {/* Center emblem */}
                <circle cx="100" cy="90" r="35" fill="url(#menuShieldGold)" stroke="#78350f" strokeWidth="3"/>
                <circle cx="100" cy="90" r="27" fill="#991b1b" stroke="#fbbf24" strokeWidth="2"/>
                
                {/* Eagle symbol */}
                <g transform="translate(100, 90)">
                  <path d="M-12 -5 Q-20 -15 -15 -5 Q-10 -10 -8 -3 Z" fill="#fbbf24"/>
                  <path d="M12 -5 Q20 -15 15 -5 Q10 -10 8 -3 Z" fill="#fbbf24"/>
                  <circle cx="0" cy="0" r="8" fill="#fbbf24"/>
                  <text y="4" textAnchor="middle" fill="#991b1b" fontSize="8" fontWeight="bold">LL</text>
                </g>

                {/* LEGION LIVE text */}
                <text x="100" y="150" textAnchor="middle" fill="#fcd34d" fontSize="14" fontWeight="bold" letterSpacing="2">
                  LEGION
                </text>
                <text x="100" y="168" textAnchor="middle" fill="#fcd34d" fontSize="11" fontWeight="bold" letterSpacing="4">
                  LIVE
                </text>

                {/* Decorative elements */}
                <path d="M50 185 L60 195 L55 192 L48 205 L55 198 L50 200 Z" fill="#fbbf24" opacity="0.8"/>
                <path d="M150 185 L140 195 L145 192 L152 205 L145 198 L150 200 Z" fill="#fbbf24" opacity="0.8"/>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Text */}
      <motion.div
        className="absolute bottom-20 left-0 right-0 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.p
          className="text-amber-400/80 text-sm md:text-base tracking-wide"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {phase === 0 && "Approaching the Gates..."}
          {phase === 1 && "The City Awaits..."}
          {phase === 2 && "Gates Opening..."}
          {phase === 3 && "Hail, Warrior!"}
          {phase === 4 && "Preparing Your Shield..."}
          {phase >= 5 && "Enter the Arena!"}
        </motion.p>

        {/* Progress Bar */}
        <div className="mt-4 w-48 md:w-64 mx-auto h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 4.5, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 relative"
          >
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          </motion.div>
        </div>

        {/* Motto */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 3 ? 0.6 : 0 }}
          className="mt-4 text-amber-500/50 text-xs tracking-[0.4em] uppercase"
        >
          Veni • Vidi • Streami
        </motion.p>
      </motion.div>
    </motion.div>
  );
}