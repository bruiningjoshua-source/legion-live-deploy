import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const phases = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onComplete?.(), 400);
      }, 3200)
    ];

    return () => phases.forEach(clearTimeout);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      className="fixed inset-0 bg-stone-950 z-[100] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Clean subtle background */}
      <div className="absolute inset-0">
        {/* Subtle radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(217,119,6,0.08)_0%,_transparent_70%)]" />
        
        {/* Animated rays - subtle */}
        <motion.div
          animate={{ rotate: 360, opacity: phase >= 2 ? 0.15 : 0 }}
          transition={{ rotate: { duration: 60, repeat: Infinity, ease: 'linear' }, opacity: { duration: 1 } }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute h-[150%] w-0.5 bg-gradient-to-t from-transparent via-amber-500/30 to-transparent"
              style={{ transform: `rotate(${i * 30}deg)` }}
            />
          ))}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Shield Emblem - Comic/Cartoon Style */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
          className="relative mb-8"
        >
          {/* Glow effect */}
          <motion.div
            animate={{ 
              opacity: phase >= 2 ? [0.3, 0.6, 0.3] : 0,
              scale: phase >= 2 ? [1, 1.1, 1] : 1
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-8 bg-amber-500/20 rounded-full blur-2xl"
          />

          {/* Shield SVG - Cartoon Style */}
          <motion.div
            animate={phase >= 3 ? { 
              scale: [1, 1.05, 1],
            } : {}}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.5 }}
            className="relative"
          >
            <svg viewBox="0 0 120 140" className="w-32 h-36 md:w-40 md:h-44">
              <defs>
                <linearGradient id="shieldGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fcd34d" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id="shieldRed" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <filter id="shieldShadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4"/>
                </filter>
              </defs>
              
              {/* Shield shape */}
              <motion.path
                d="M60 5 L110 25 L110 70 Q110 120 60 135 Q10 120 10 70 L10 25 Z"
                fill="url(#shieldRed)"
                stroke="url(#shieldGold)"
                strokeWidth="4"
                filter="url(#shieldShadow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
              />
              
              {/* Inner border */}
              <path
                d="M60 15 L100 32 L100 68 Q100 110 60 123 Q20 110 20 68 L20 32 Z"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                opacity="0.6"
              />
              
              {/* Center emblem */}
              <motion.g
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
              >
                {/* Eagle wings */}
                <path
                  d="M35 55 Q25 45 20 55 Q30 50 35 60 Z"
                  fill="url(#shieldGold)"
                  stroke="#92400e"
                  strokeWidth="1"
                />
                <path
                  d="M85 55 Q95 45 100 55 Q90 50 85 60 Z"
                  fill="url(#shieldGold)"
                  stroke="#92400e"
                  strokeWidth="1"
                />
                
                {/* Center circle */}
                <circle cx="60" cy="65" r="22" fill="url(#shieldGold)" stroke="#78350f" strokeWidth="2"/>
                <circle cx="60" cy="65" r="16" fill="#991b1b" stroke="#fbbf24" strokeWidth="2"/>
                
                {/* SPQR text */}
                <text x="60" y="70" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="serif">
                  SPQR
                </text>
              </motion.g>
              
              {/* Lightning bolts decoration */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 2 ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <path d="M35 90 L40 100 L35 98 L30 110 L35 102 L30 105 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1"/>
                <path d="M85 90 L80 100 L85 98 L90 110 L85 102 L90 105 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1"/>
              </motion.g>
            </svg>
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center"
        >
          <motion.h1 
            animate={phase >= 3 ? { 
              textShadow: [
                '0 0 20px rgba(251,191,36,0.3)',
                '0 0 40px rgba(251,191,36,0.5)',
                '0 0 20px rgba(251,191,36,0.3)'
              ]
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-4xl md:text-6xl font-black text-amber-100 mb-2 tracking-wider"
            style={{ 
              textShadow: '0 2px 0 #78350f, 0 4px 8px rgba(0,0,0,0.5)',
            }}
          >
            LEGION LIVE
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-amber-400/80 text-lg font-medium tracking-wide"
          >
            {phase === 0 && "Initializing..."}
            {phase === 1 && "Preparing Arena..."}
            {phase === 2 && "Gathering Legion..."}
            {phase === 3 && "Ready for Glory!"}
            {phase >= 4 && "Enter the Arena"}
          </motion.p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div 
          initial={{ opacity: 0, scaleX: 0.9 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 w-64 h-1.5 bg-stone-800 rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.8, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 relative"
          >
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          </motion.div>
        </motion.div>

        {/* Motto */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 0.7 : 0 }}
          transition={{ duration: 0.5 }}
          className="mt-6 text-amber-500/60 text-xs tracking-[0.4em] uppercase font-medium"
        >
          Veni • Vidi • Streami
        </motion.p>
      </div>
    </motion.div>
  );
}