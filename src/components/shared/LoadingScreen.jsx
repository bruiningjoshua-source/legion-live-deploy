import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Phase progression: 0=gather, 1=formation, 2=shield wall
    const phase1 = setTimeout(() => setPhase(1), 800);
    const phase2 = setTimeout(() => setPhase(2), 1600);
    const complete = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 300);
    }, 3000);

    return () => {
      clearTimeout(phase1);
      clearTimeout(phase2);
      clearTimeout(complete);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  // Shield positions for formation
  const soldiers = [
    { id: 1, startX: -200, startY: -100, finalX: -90, finalY: 0 },
    { id: 2, startX: -150, startY: 100, finalX: -60, finalY: 0 },
    { id: 3, startX: 0, startY: -150, finalX: -30, finalY: 0 },
    { id: 4, startX: 0, startY: 150, finalX: 0, finalY: 0 },
    { id: 5, startX: 0, startY: -100, finalX: 30, finalY: 0 },
    { id: 6, startX: 150, startY: 100, finalX: 60, finalY: 0 },
    { id: 7, startX: 200, startY: -100, finalX: 90, finalY: 0 },
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
      </div>

      {/* Roman Legion Formation Animation */}
      <div className="relative h-48 w-80 mb-8">
        {soldiers.map((soldier, i) => (
          <motion.div
            key={soldier.id}
            initial={{ 
              x: soldier.startX, 
              y: soldier.startY, 
              opacity: 0,
              scale: 0.5
            }}
            animate={{ 
              x: phase >= 1 ? soldier.finalX : soldier.startX,
              y: phase >= 1 ? soldier.finalY : soldier.startY,
              opacity: 1,
              scale: 1,
              rotateY: phase >= 2 ? 0 : 180
            }}
            transition={{ 
              duration: 0.6, 
              delay: i * 0.1,
              type: "spring",
              stiffness: 100
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            {/* Shield */}
            <motion.div
              animate={phase >= 2 ? {
                boxShadow: ['0 0 20px rgba(217,119,6,0.3)', '0 0 40px rgba(217,119,6,0.6)', '0 0 20px rgba(217,119,6,0.3)']
              } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-12 h-14 bg-gradient-to-b from-amber-600 to-amber-800 rounded-t-lg rounded-b-2xl border-2 border-amber-400 flex items-center justify-center shadow-lg"
            >
              {/* Shield Emblem */}
              <div className="w-8 h-8 rounded-full bg-amber-900 border border-amber-500 flex items-center justify-center">
                <span className="text-amber-300 text-lg font-bold">⚔️</span>
              </div>
            </motion.div>
            
            {/* Spear */}
            <motion.div
              animate={phase >= 2 ? { rotate: [0, -5, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-1 h-12 bg-gradient-to-b from-amber-300 to-amber-600"
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-4 bg-amber-200 clip-triangle" 
                   style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
            </motion.div>
          </motion.div>
        ))}

        {/* Shield Wall Flash Effect */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.2, 1.5] }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-amber-500/30 rounded-full blur-3xl"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Title */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="text-center relative z-10"
      >
        <motion.h1 
          animate={phase >= 2 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="text-5xl md:text-6xl font-bold text-amber-100 mb-2 tracking-wider"
        >
          LEGION LIVE
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-amber-400/80 text-lg"
        >
          {phase === 0 && "Gathering the Legion..."}
          {phase === 1 && "Forming Ranks..."}
          {phase >= 2 && "Where Creators Command"}
        </motion.p>
      </motion.div>

      {/* Loading Bar */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 w-64 h-1 bg-stone-800 rounded-full overflow-hidden"
      >
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.8, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"
        />
      </motion.div>

      {/* Roman Motto */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        className="absolute bottom-8 text-amber-500/60 text-sm tracking-widest uppercase"
      >
        Veni, Vidi, Streami
      </motion.p>
    </motion.div>
  );
}