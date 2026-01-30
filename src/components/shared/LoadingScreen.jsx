import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Radio, Film, Gamepad2, ShoppingBag, Play } from 'lucide-react';

const CENTURION_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/29aa9a1e7_AI_Generated_Image_2026-01-16_506237618000201.png';

const MENU_ITEMS = [
  { id: 'live', label: 'Live', icon: Radio, page: 'Explore', color: '#ef4444' },
  { id: 'videos', label: 'Videos', icon: Film, page: 'TheAmphitheatre', color: '#a855f7' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, page: 'TheGamingHub', color: '#3b82f6' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, page: 'AffiliateHub', color: '#22c55e' },
];

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    setIsVisible(false);
    setTimeout(() => onComplete?.(), 300);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Background Image - Full screen, bottom aligned */}
      <div className="absolute inset-0">
        <motion.img
          src={CENTURION_IMAGE}
          alt=""
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[85vh] w-auto max-w-none object-contain object-bottom"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ 
            opacity: phase >= 1 ? (phase >= 3 ? 0.3 : 0.8) : 0,
            scale: phase >= 1 ? 1 : 1.1
          }}
          transition={{ duration: 1.5 }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/80" />
      </div>

      {/* Logo - Top centered */}
      <motion.div
        className="relative z-10 pt-16 sm:pt-20 text-center"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -30 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <h1 
          className="text-5xl sm:text-6xl font-black tracking-tight"
          style={{
            fontFamily: 'Georgia, serif',
            background: 'linear-gradient(180deg, #fef3c7 0%, #f59e0b 50%, #92400e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          LEGION
        </h1>
        <p 
          className="text-xl sm:text-2xl font-bold tracking-[0.3em] -mt-1"
          style={{
            background: 'linear-gradient(180deg, #fcd34d 0%, #d97706 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          LIVE
        </p>
      </motion.div>

      {/* Menu - Bottom section */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            className="relative z-20 mt-auto pb-12 px-6"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Menu Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6">
              {MENU_ITEMS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={createPageUrl(item.page)} onClick={handleEnter}>
                      <motion.div
                        whileTap={{ scale: 0.95 }}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl border border-white/10 backdrop-blur-sm"
                        style={{ background: `${item.color}15` }}
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                          style={{ background: `${item.color}30` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: item.color }} />
                        </div>
                        <span className="text-white text-sm font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Enter Button */}
            <motion.button
              onClick={handleEnter}
              className="w-full max-w-xs mx-auto block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-2 py-4 bg-white text-black rounded-full font-semibold text-base shadow-xl">
                <Play className="w-5 h-5" />
                Enter Legion Live
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading indicator - Shows before menu */}
      {phase < 3 && (
        <motion.div
          className="relative z-10 mt-auto pb-16 text-center"
          animate={{ opacity: phase < 3 ? 1 : 0 }}
        >
          <motion.p
            className="text-white/50 text-sm tracking-widest mb-4"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {phase < 2 ? 'LOADING...' : 'PREPARING...'}
          </motion.p>
          <div className="w-40 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
              initial={{ width: '0%' }}
              animate={{ width: phase >= 2 ? '100%' : '50%' }}
              transition={{ duration: 1 }}
            />
          </div>
        </motion.div>
      )}

      {/* Skip button */}
      <motion.button
        className="absolute top-4 right-4 z-30 text-white/40 text-sm px-3 py-1"
        onClick={handleEnter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        Skip
      </motion.button>
    </motion.div>
  );
}