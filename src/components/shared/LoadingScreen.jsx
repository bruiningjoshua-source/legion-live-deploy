import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Phase progression: 0=gather, 1=formation, 2=shield wall, 3=charge, 4=prestige burst
    const phase1 = setTimeout(() => setPhase(1), 700);
    const phase2 = setTimeout(() => setPhase(2), 1400);
    const phase3 = setTimeout(() => setPhase(3), 2100);
    const phase4 = setTimeout(() => setPhase(4), 2800);
    const complete = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 400);
    }, 3800);

    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(phase4);
      clearTimeout(complete);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  // 4 Centurions for shield wall formation
  const centurions = [
    { id: 1, startX: -200, startY: -100, formX: -70, formY: 0, chargeX: 250 },
    { id: 2, startX: -140, startY: 100, formX: -25, formY: 0, chargeX: 290 },
    { id: 3, startX: 140, startY: -100, formX: 25, formY: 0, chargeX: 330 },
    { id: 4, startX: 200, startY: 100, formX: 70, formY: 0, chargeX: 370 },
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      className="fixed inset-0 bg-stone-950 z-[100] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Comic-style dramatic background with rays */}
      <div className="absolute inset-0">
        {/* Radial rays - prestige style */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
            opacity: phase >= 2 ? [0.1, 0.3, 0.1] : 0
          }}
          transition={{ rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, opacity: { duration: 2, repeat: Infinity } }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute h-[200%] w-4 bg-gradient-to-t from-transparent via-amber-500/20 to-transparent"
              style={{ transform: `rotate(${i * 22.5}deg)` }}
            />
          ))}
        </motion.div>

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_rgba(0,0,0,0.8)_100%)]" />
        
        {/* Dust particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                opacity: 0 
              }}
              animate={{ 
                y: [null, Math.random() * -200],
                opacity: phase >= 1 ? [0, 0.6, 0] : 0
              }}
              transition={{ 
                duration: 3 + Math.random() * 2, 
                repeat: Infinity,
                delay: Math.random() * 2 
              }}
              className="absolute w-1 h-1 bg-amber-400/60 rounded-full"
            />
          ))}
        </div>

        {/* Ground dust cloud during charge */}
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 0.6, scaleX: 1 }}
            className="absolute bottom-1/4 left-0 right-0 h-32 bg-gradient-to-t from-amber-900/50 via-amber-800/30 to-transparent blur-xl"
          />
        )}
      </div>

      {/* Comic action lines during charge */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: '200%', opacity: [0, 1, 0] }}
                transition={{ duration: 0.6, delay: i * 0.03 }}
                className="absolute h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                style={{ 
                  top: `${20 + i * 5}%`,
                  width: `${60 + Math.random() * 40}%`
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle ground line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: phase >= 1 ? 1 : 0 }}
        className="absolute bottom-[38%] left-1/4 right-1/4 h-1 bg-gradient-to-r from-transparent via-amber-600/60 to-transparent"
      />

      {/* Roman Legion Formation Animation - Comic Style Centurions */}
      <div className="relative h-64 w-full max-w-md mb-8">
        {centurions.map((centurion, i) => (
          <motion.div
            key={centurion.id}
            initial={{ 
              x: centurion.startX, 
              y: centurion.startY, 
              opacity: 0,
              scale: 0.5
            }}
            animate={{ 
              x: phase >= 3 ? centurion.chargeX : (phase >= 1 ? centurion.formX : centurion.startX),
              y: phase >= 3 ? (i % 2 === 0 ? -10 : 10) : (phase >= 1 ? centurion.formY : centurion.startY),
              opacity: 1,
              scale: phase >= 3 ? 1.2 : (phase >= 2 ? 1.1 : 1),
              rotateY: phase >= 1 ? 0 : 180
            }}
            transition={{ 
              duration: phase >= 3 ? 0.5 : 0.6, 
              delay: phase >= 3 ? i * 0.04 : i * 0.1,
              type: phase >= 3 ? "tween" : "spring",
              stiffness: 80
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            {/* Comic-style Centurion */}
            <div className="relative" style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
              {/* Speed trail during charge */}
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: [0.8, 0], scaleX: [0, 1] }}
                  transition={{ duration: 0.3 }}
                  className="absolute -left-16 top-1/2 -translate-y-1/2 w-20 h-12 bg-gradient-to-r from-amber-400/40 to-transparent blur-sm"
                />
              )}

              {/* Helmet with dramatic crest */}
              <motion.div
                animate={phase >= 3 ? { y: [-3, 3, -3], rotate: [-2, 2, -2] } : {}}
                transition={{ duration: 0.12, repeat: Infinity }}
                className="absolute -top-8 left-1/2 -translate-x-1/2"
              >
                {/* Helmet base - comic style with bold outlines */}
                <div className="relative">
                  <div className="w-12 h-10 bg-gradient-to-b from-amber-300 to-amber-600 rounded-t-full border-2 border-amber-800">
                    {/* Crest - dramatic red plume */}
                    <motion.div
                      animate={phase >= 2 ? { scaleY: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-7 bg-gradient-to-t from-red-700 via-red-500 to-red-400 rounded-t-full border-2 border-red-800"
                      style={{ 
                        clipPath: 'polygon(20% 100%, 0% 60%, 10% 30%, 30% 0%, 50% 5%, 70% 0%, 90% 30%, 100% 60%, 80% 100%)'
                      }}
                    />
                    {/* Face shadow */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-stone-900/80 rounded-b" />
                    {/* Eye slits - glowing during shield wall */}
                    {phase >= 2 && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2"
                      >
                        <div className="w-1.5 h-0.5 bg-amber-300" />
                        <div className="w-1.5 h-0.5 bg-amber-300" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Shield - Roman Scutum with comic bold lines */}
              <motion.div
                animate={phase >= 2 ? {
                  boxShadow: ['0 0 20px rgba(217,119,6,0.5)', '0 0 40px rgba(217,119,6,0.9)', '0 0 20px rgba(217,119,6,0.5)']
                } : {}}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-16 h-20 bg-gradient-to-br from-red-600 via-red-700 to-red-900 rounded-lg border-3 border-amber-400 flex items-center justify-center relative overflow-hidden"
                style={{ 
                  borderWidth: '3px',
                  boxShadow: '0 0 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)'
                }}
              >
                {/* Inner border */}
                <div className="absolute inset-2 border-2 border-amber-500/60 rounded" />
                {/* Shield boss (center) - golden emblem */}
                <motion.div
                  animate={phase >= 2 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border-2 border-amber-200 flex items-center justify-center"
                  style={{ boxShadow: '0 0 10px rgba(251,191,36,0.5)' }}
                >
                  <span className="text-lg">⚔️</span>
                </motion.div>
                {/* Lightning decorations */}
                <div className="absolute top-2 left-2 text-amber-400/40 text-xs">⚡</div>
                <div className="absolute bottom-2 right-2 text-amber-400/40 text-xs">⚡</div>
              </motion.div>
              
              {/* Gladius Sword - visible during charge with dramatic pose */}
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0, rotate: -90, x: 0 }}
                  animate={{ opacity: 1, rotate: 25, x: 5 }}
                  transition={{ duration: 0.2 }}
                  className="absolute -right-6 top-0"
                >
                  <div className="relative">
                    <div className="w-3 h-16 bg-gradient-to-b from-gray-200 via-gray-400 to-gray-500 rounded-sm"
                         style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }}>
                      {/* Sword tip */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-4 bg-gray-300"
                           style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                      {/* Guard */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-600 rounded-sm" />
                      {/* Handle */}
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-2 h-5 bg-amber-800 rounded" />
                    </div>
                    {/* Sword gleam */}
                    <motion.div
                      animate={{ opacity: [0, 1, 0], y: [-10, 20] }}
                      transition={{ duration: 0.4, repeat: Infinity }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-8 bg-white/60 rounded-full blur-sm"
                    />
                  </div>
                </motion.div>
              )}

              {/* Pilum (Spear) - before charge */}
              {phase < 3 && (
                <motion.div
                  animate={phase >= 2 ? { rotate: [0, -5, 0] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="absolute -top-14 left-1/2 -translate-x-1/2"
                >
                  <div className="w-2 h-20 bg-gradient-to-b from-amber-200 to-amber-700 rounded-sm">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-5 h-6 bg-gradient-to-b from-gray-200 to-gray-500" 
                         style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Shield Wall Flash Effect - Comic burst */}
        <AnimatePresence>
          {phase === 2 && (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 2.5] }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-48 h-48 bg-amber-400/40 rounded-full blur-3xl" />
              </motion.div>
              {/* Comic impact stars */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [1, 0], scale: [0, 1.5], x: Math.cos(i * 45 * Math.PI / 180) * 80, y: Math.sin(i * 45 * Math.PI / 180) * 80 }}
                  transition={{ duration: 0.5, delay: i * 0.02 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
                >
                  ✦
                </motion.div>
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Prestige-style Charge Impact */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              {/* Golden burst rings */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.5, opacity: 0.8 }}
                  animate={{ scale: 3 + i, opacity: 0 }}
                  transition={{ duration: 1, delay: i * 0.15 }}
                  className="absolute w-32 h-32 rounded-full border-4 border-amber-400"
                />
              ))}
              {/* Central flash */}
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 3, 4], opacity: [1, 0.8, 0] }}
                transition={{ duration: 0.8 }}
                className="absolute w-24 h-24 bg-gradient-radial from-white via-amber-300 to-transparent rounded-full blur-lg"
              />
              {/* Sparkle particles */}
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{ 
                    scale: [0, 1, 0],
                    x: Math.cos(i * 22.5 * Math.PI / 180) * 150,
                    y: Math.sin(i * 22.5 * Math.PI / 180) * 150
                  }}
                  transition={{ duration: 0.7, delay: i * 0.02 }}
                  className="absolute w-3 h-3 bg-amber-400 rounded-full"
                  style={{ boxShadow: '0 0 10px rgba(251,191,36,0.8)' }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Title - Comic style with impact */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="text-center relative z-10"
      >
        <motion.h1 
          animate={phase >= 3 ? { 
            scale: [1, 1.15, 1.05],
            textShadow: ['0 0 30px rgba(251,191,36,0.6)', '0 0 60px rgba(251,191,36,1)', '0 0 40px rgba(251,191,36,0.7)']
          } : {}}
          transition={{ duration: 0.5 }}
          className="text-5xl md:text-7xl font-black text-amber-100 mb-3 tracking-wider"
          style={{ 
            textShadow: '0 0 30px rgba(251,191,36,0.4), 0 4px 0 #92400e, 0 8px 0 #78350f',
            WebkitTextStroke: '2px rgba(120,53,15,0.5)'
          }}
        >
          LEGION LIVE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-amber-400/90 text-xl font-bold tracking-wide"
        >
          {phase === 0 && "⚔️ Gathering the Legion..."}
          {phase === 1 && "🛡️ Forming Ranks..."}
          {phase === 2 && "✨ Shield Wall Ready!"}
          {phase === 3 && "💥 CHARGE!"}
          {phase >= 4 && "🏛️ GLORY AWAITS!"}
        </motion.p>
      </motion.div>

      {/* Loading Bar - More dramatic */}
      <motion.div 
        initial={{ opacity: 0, scaleX: 0.8 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 w-80 h-2 bg-stone-800 rounded-full overflow-hidden border border-amber-900/50"
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3.5, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 relative"
        >
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          />
        </motion.div>
      </motion.div>

      {/* Welcome Message - Roman Motto */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20 }}
        className="absolute bottom-16 text-center"
      >
        <p className="text-amber-200 text-2xl font-bold mb-2">Welcome, Legionnaire</p>
        <p className="text-amber-500/70 text-sm tracking-[0.3em] uppercase font-semibold">
          Veni • Vidi • Streami
        </p>
      </motion.div>
    </motion.div>
  );
}