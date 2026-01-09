import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Phase progression: 0=gather, 1=formation, 2=shield wall, 3=charge
    const phase1 = setTimeout(() => setPhase(1), 600);
    const phase2 = setTimeout(() => setPhase(2), 1200);
    const phase3 = setTimeout(() => setPhase(3), 1800);
    const complete = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 300);
    }, 3000);

    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(phase3);
      clearTimeout(complete);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  // 4 Centurions for shield wall formation
  const centurions = [
    { id: 1, startX: -180, startY: -80, formX: -60, formY: 0, chargeX: 200 },
    { id: 2, startX: -120, startY: 80, formX: -20, formY: 0, chargeX: 240 },
    { id: 3, startX: 120, startY: -80, formX: 20, formY: 0, chargeX: 280 },
    { id: 4, startX: 180, startY: 80, formX: 60, formY: 0, chargeX: 320 },
  ];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      className="fixed inset-0 bg-gradient-to-b from-stone-950 via-amber-950/20 to-stone-950 z-[100] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Dramatic background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(217,119,6,0.15),_transparent_70%)]" />
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23d97706" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />
        
        {/* Dust/smoke effect during charge */}
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="absolute inset-0 bg-gradient-to-r from-amber-900/30 via-transparent to-amber-900/30"
          />
        )}
      </div>

      {/* Battle ground line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: phase >= 1 ? 1 : 0 }}
        className="absolute bottom-1/3 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent"
      />

      {/* Roman Legion Formation Animation - 4 Centurions */}
      <div className="relative h-56 w-96 mb-8">
        {centurions.map((centurion, i) => (
          <motion.div
            key={centurion.id}
            initial={{ 
              x: centurion.startX, 
              y: centurion.startY, 
              opacity: 0,
              scale: 0.6
            }}
            animate={{ 
              x: phase >= 3 ? centurion.chargeX : (phase >= 1 ? centurion.formX : centurion.startX),
              y: phase >= 3 ? 0 : (phase >= 1 ? centurion.formY : centurion.startY),
              opacity: 1,
              scale: phase >= 2 ? 1.1 : 1,
              rotateY: phase >= 2 ? 0 : 180
            }}
            transition={{ 
              duration: phase >= 3 ? 0.6 : 0.5, 
              delay: phase >= 3 ? i * 0.05 : i * 0.1,
              type: phase >= 3 ? "tween" : "spring",
              stiffness: 100
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            {/* Centurion Body */}
            <div className="relative">
              {/* Helmet with crest */}
              <motion.div
                animate={phase >= 3 ? { y: [-2, 2, -2] } : {}}
                transition={{ duration: 0.15, repeat: Infinity }}
                className="absolute -top-6 left-1/2 -translate-x-1/2"
              >
                {/* Helmet base */}
                <div className="w-10 h-8 bg-gradient-to-b from-amber-400 to-amber-600 rounded-t-full relative">
                  {/* Crest */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 rounded-t-full" />
                  {/* Face guard */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-2 bg-amber-700 rounded-b" />
                </div>
              </motion.div>

              {/* Shield - Roman Scutum */}
              <motion.div
                animate={phase >= 2 ? {
                  boxShadow: ['0 0 15px rgba(217,119,6,0.4)', '0 0 30px rgba(217,119,6,0.7)', '0 0 15px rgba(217,119,6,0.4)']
                } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-14 h-18 bg-gradient-to-b from-red-700 to-red-900 rounded-lg border-2 border-amber-400 flex items-center justify-center shadow-lg relative overflow-hidden"
                style={{ height: '72px' }}
              >
                {/* Shield decorations */}
                <div className="absolute inset-2 border border-amber-500/50 rounded" />
                {/* Shield boss (center) */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 flex items-center justify-center shadow-inner">
                  <span className="text-amber-900 text-sm font-bold">⚔️</span>
                </div>
                {/* Wings on shield */}
                <div className="absolute top-2 left-2 w-2 h-4 bg-amber-500/30 transform -skew-x-12" />
                <div className="absolute top-2 right-2 w-2 h-4 bg-amber-500/30 transform skew-x-12" />
              </motion.div>
              
              {/* Sword (Gladius) - visible during charge */}
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0, rotate: -45 }}
                  animate={{ opacity: 1, rotate: 15 }}
                  className="absolute -right-4 top-2"
                >
                  <div className="w-2 h-12 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-lg">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-amber-600 rounded-sm" />
                  </div>
                </motion.div>
              )}

              {/* Pilum (Spear) - before charge */}
              {phase < 3 && (
                <motion.div
                  animate={phase >= 2 ? { rotate: [0, -3, 0] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 w-1.5 h-16 bg-gradient-to-b from-amber-300 to-amber-600"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-5 bg-gradient-to-b from-gray-300 to-gray-500" 
                       style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Shield Wall Flash Effect */}
        <AnimatePresence>
          {phase >= 2 && phase < 3 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.3, 1.5] }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-amber-500/30 rounded-full blur-3xl"
            />
          )}
        </AnimatePresence>

        {/* Charge Impact Effect */}
        <AnimatePresence>
          {phase >= 3 && (
            <>
              <motion.div
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: [0.8, 0], x: 100 }}
                transition={{ duration: 0.8 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-32 bg-amber-400/40 rounded-full blur-2xl"
              />
              {/* Speed lines */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -50, scaleX: 0 }}
                  animate={{ opacity: [0.8, 0], x: 200, scaleX: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="absolute left-1/4 h-0.5 w-24 bg-gradient-to-r from-amber-400 to-transparent"
                  style={{ top: `${30 + i * 10}%` }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Title */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center relative z-10"
      >
        <motion.h1 
          animate={phase >= 3 ? { 
            scale: [1, 1.1, 1],
            textShadow: ['0 0 20px rgba(251,191,36,0.5)', '0 0 40px rgba(251,191,36,0.8)', '0 0 20px rgba(251,191,36,0.5)']
          } : {}}
          transition={{ duration: 0.4 }}
          className="text-5xl md:text-6xl font-bold text-amber-100 mb-2 tracking-wider"
          style={{ textShadow: '0 0 20px rgba(251,191,36,0.3)' }}
        >
          LEGION LIVE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-amber-400/80 text-lg font-medium"
        >
          {phase === 0 && "Gathering the Legion..."}
          {phase === 1 && "Forming Ranks..."}
          {phase === 2 && "Shield Wall Ready..."}
          {phase >= 3 && "⚔️ CHARGE! ⚔️"}
        </motion.p>
      </motion.div>

      {/* Loading Bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 w-72 h-1.5 bg-stone-800 rounded-full overflow-hidden"
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.8, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 relative"
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        </motion.div>
      </motion.div>

      {/* Welcome Message & Roman Motto */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        className="absolute bottom-12 text-center"
      >
        <p className="text-amber-200 text-xl font-semibold mb-1">Welcome, Legionnaire</p>
        <p className="text-amber-500/60 text-sm tracking-widest uppercase">
          Veni, Vidi, Streami
        </p>
      </motion.div>
    </motion.div>
  );
}