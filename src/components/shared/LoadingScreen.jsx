import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Comic-style Roman assets
const ASSETS = {
  centurion: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/54f8124d8_AI_Generated_Image_2026-01-16_506237618000201.png',
  columns: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/576c630c3_AI_Generated_Image_2026-01-16_506237614012201.png',
  soldiersRow: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/288cec758_AI_Generated_Sticker_2026-01-16_c4f2960c-1731-4397-96f9-57e32eaddbde.png',
  treasure: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/82ed18382_AI_Generated_Sticker_2026-01-16_bd106f64-574f-49aa-ba53-c0081623475e.png',
  soldiersGroup: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/96acf64a3_AI_Generated_Sticker_2026-01-16_1752b39c-8acd-4d97-82c7-6341dc4ba7bf3.png',
  soldiersFormation: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/e38ccfbe2_AI_Generated_Sticker_2026-01-16_0d71c335-d5e0-447f-888c-cd18c1a16442.png',
};

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),   // Background fades in
      setTimeout(() => setPhase(2), 1200),  // Soldiers march in from sides
      setTimeout(() => setPhase(3), 2200),  // Centurion hero appears
      setTimeout(() => setPhase(4), 3500),  // Logo slam
      setTimeout(() => setPhase(5), 4800),  // Ready state
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onComplete?.(), 500);
      }, 6500)
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      className="fixed inset-0 z-[100] overflow-hidden bg-black"
    >
      {/* Background - Columns with dark overlay */}
      <motion.div 
        className="absolute inset-0"
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ 
          scale: phase >= 1 ? 1 : 1.3, 
          opacity: phase >= 1 ? 1 : 0 
        }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${ASSETS.columns})`,
            filter: 'brightness(0.35) saturate(1.3) contrast(1.1)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
      </motion.div>

      {/* Comic-style speed lines / energy streaks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-0.5 md:h-1"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(217, 119, 6, ${0.4 + i * 0.05}), transparent)`,
              top: `${10 + i * 10}%`,
              left: '-100%',
              width: '200%',
              transform: `rotate(${-8 + i * 2}deg)`,
            }}
            animate={{ x: ['-50%', '100%'] }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      {/* Soldiers Formation - Left side */}
      <motion.div
        className="absolute bottom-0 left-0 w-[50%] md:w-[40%] max-w-[450px]"
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ 
          x: phase >= 2 ? '0%' : '-100%', 
          opacity: phase >= 2 ? 1 : 0 
        }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <img 
          src={ASSETS.soldiersFormation} 
          alt="" 
          className="w-full h-auto"
          style={{ 
            filter: 'drop-shadow(0 0 30px rgba(217, 119, 6, 0.4)) drop-shadow(5px 5px 10px rgba(0,0,0,0.8))'
          }}
        />
      </motion.div>

      {/* Soldiers Row - Right side */}
      <motion.div
        className="absolute bottom-0 right-0 w-[45%] md:w-[38%] max-w-[400px]"
        initial={{ x: '100%', opacity: 0 }}
        animate={{ 
          x: phase >= 2 ? '0%' : '100%', 
          opacity: phase >= 2 ? 1 : 0 
        }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
      >
        <img 
          src={ASSETS.soldiersRow} 
          alt="" 
          className="w-full h-auto"
          style={{ 
            filter: 'drop-shadow(0 0 30px rgba(217, 119, 6, 0.4)) drop-shadow(-5px 5px 10px rgba(0,0,0,0.8))'
          }}
        />
      </motion.div>

      {/* Treasure pile - Center bottom */}
      <motion.div
        className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-24 md:w-36 z-10"
        initial={{ y: 100, opacity: 0, scale: 0.5 }}
        animate={{ 
          y: phase >= 2 ? 0 : 100, 
          opacity: phase >= 2 ? 1 : 0,
          scale: phase >= 2 ? 1 : 0.5
        }}
        transition={{ duration: 0.6, ease: 'backOut', delay: 0.5 }}
      >
        <motion.img 
          src={ASSETS.treasure} 
          alt="" 
          className="w-full h-auto"
          animate={phase >= 2 ? { y: [0, -8, 0] } : {}}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ 
            filter: 'drop-shadow(0 15px 40px rgba(217, 119, 6, 0.6)) drop-shadow(0 5px 15px rgba(0,0,0,0.8))'
          }}
        />
      </motion.div>

      {/* Centurion Hero - Center */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0.3, opacity: 0, y: 200 }}
        animate={{ 
          scale: phase >= 3 ? 1 : 0.3, 
          opacity: phase >= 3 ? 1 : 0,
          y: phase >= 3 ? 0 : 200
        }}
        transition={{ 
          duration: 0.7, 
          type: 'spring', 
          stiffness: 120, 
          damping: 12 
        }}
      >
        <motion.div
          className="relative w-[85%] md:w-[60%] max-w-[600px]"
          animate={phase >= 3 ? { 
            filter: [
              'drop-shadow(0 0 30px rgba(217, 119, 6, 0.5))',
              'drop-shadow(0 0 60px rgba(217, 119, 6, 0.8))',
              'drop-shadow(0 0 30px rgba(217, 119, 6, 0.5))'
            ]
          } : {}}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <img 
            src={ASSETS.centurion} 
            alt="Legion Live" 
            className="w-full h-auto"
          />
        </motion.div>
      </motion.div>

      {/* LEGION LIVE Logo - Slams in on top */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            className="absolute top-[15%] md:top-[18%] left-1/2 -translate-x-1/2 text-center z-20"
            initial={{ scale: 3, opacity: 0, y: -100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.4, 
              type: 'spring', 
              stiffness: 200, 
              damping: 15 
            }}
          >
            {/* Impact flash */}
            <motion.div
              className="absolute inset-0 -inset-x-20 -inset-y-10"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                background: 'radial-gradient(ellipse, rgba(217, 119, 6, 0.8) 0%, transparent 70%)'
              }}
            />
            
            <motion.h1 
              className="text-6xl md:text-8xl font-black tracking-tight relative"
              style={{
                fontFamily: 'serif',
                background: 'linear-gradient(180deg, #fef3c7 0%, #f59e0b 30%, #d97706 60%, #92400e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 60px rgba(217, 119, 6, 0.8)',
              }}
              animate={{
                textShadow: [
                  '0 0 30px rgba(217, 119, 6, 0.5)',
                  '0 0 60px rgba(217, 119, 6, 0.8)',
                  '0 0 30px rgba(217, 119, 6, 0.5)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              LEGION
            </motion.h1>
            <motion.p 
              className="text-3xl md:text-4xl font-black tracking-[0.4em] -mt-2 md:-mt-3"
              style={{
                background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              LIVE
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enter Button */}
      <AnimatePresence>
        {phase >= 5 && (
          <motion.div
            className="absolute bottom-28 md:bottom-36 left-1/2 -translate-x-1/2 z-30"
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <motion.button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onComplete?.(), 300);
              }}
              className="relative px-10 md:px-14 py-4 md:py-5 bg-gradient-to-b from-red-700 via-red-800 to-red-900 text-amber-100 text-lg md:text-xl font-black tracking-wider rounded-lg border-2 border-amber-500/60 overflow-hidden"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(217, 119, 6, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
                  '0 0 50px rgba(217, 119, 6, 0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
                  '0 0 20px rgba(217, 119, 6, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {/* Button shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
              <span className="relative flex items-center gap-3">
                ⚔️ ENTER THE ARENA ⚔️
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Progress */}
      <motion.div
        className="absolute bottom-10 md:bottom-14 left-1/2 -translate-x-1/2 text-center"
        animate={{ opacity: phase < 5 ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.p
          className="text-amber-400/90 text-base md:text-lg tracking-widest font-semibold mb-3"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {phase < 2 ? 'SUMMONING THE LEGION...' : 
           phase < 3 ? 'ASSEMBLING FORCES...' : 
           phase < 4 ? 'THE CENTURION ARRIVES...' :
           'GLORY AWAITS...'}
        </motion.p>
        
        <div className="w-52 md:w-64 h-2 bg-stone-900/80 rounded-full overflow-hidden mx-auto border border-amber-900/30">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 relative"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(phase * 20, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/50 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </motion.div>
        </div>

        <motion.p
          className="mt-3 text-amber-600/60 text-xs tracking-[0.5em] uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 3 ? 1 : 0 }}
        >
          Veni • Vidi • Streami
        </motion.p>
      </motion.div>

      {/* Vignette edges */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 0 150px 50px rgba(0,0,0,0.8)'
      }} />
    </motion.div>
  );
}