import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Radio, Film, Gamepad2, ShoppingBag, Play, Users, Trophy, 
  Sparkles, TrendingUp, Crown, Zap
} from 'lucide-react';

const CENTURION_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/29aa9a1e7_AI_Generated_Image_2026-01-16_506237618000201.png';

// Roman Scutum Shield Component - CSS-based curved shield
const RomanShield = ({ children }) => (
  <div 
    className="relative"
    style={{
      width: '260px',
      height: '320px',
    }}
  >
    {/* Shield shape - curved rectangle (scutum) */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, #c9553d 0%, #b91c1c 20%, #991b1b 80%, #7f1d1d 100%)',
        borderRadius: '50% / 8%',
        border: '8px solid #cd7f32',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4), 0 15px 40px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Gold decorative elements - wing patterns */}
      <div className="absolute inset-0 flex flex-col items-center justify-between py-6 overflow-hidden">
        {/* Top wing decoration */}
        <svg viewBox="0 0 200 50" className="w-48 h-12 text-amber-600" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.3))' }}>
          <path d="M100,45 L40,25 L20,5 L40,20 L60,35 L100,40 L140,35 L160,20 L180,5 L160,25 L100,45" fill="currentColor" />
          <path d="M100,35 L50,20 L30,5 L50,15 L70,25 L100,30 L130,25 L150,15 L170,5 L150,20 L100,35" fill="#d97706" />
        </svg>
        
        {/* Center boss (umbo) */}
        <div 
          className="w-14 h-14 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #e5e5e5 0%, #9ca3af 40%, #6b7280 70%, #4b5563 100%)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.4)',
            border: '3px solid #78716c',
          }}
        />
        
        {/* Bottom wing decoration */}
        <svg viewBox="0 0 200 50" className="w-48 h-12 text-amber-600 rotate-180" style={{ filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.3))' }}>
          <path d="M100,45 L40,25 L20,5 L40,20 L60,35 L100,40 L140,35 L160,20 L180,5 L160,25 L100,45" fill="currentColor" />
          <path d="M100,35 L50,20 L30,5 L50,15 L70,25 L100,30 L130,25 L150,15 L170,5 L150,20 L100,35" fill="#d97706" />
        </svg>
      </div>
      
      {/* Vertical gold stripes */}
      <div 
        className="absolute left-1/2 top-6 bottom-6 w-1 -translate-x-1/2"
        style={{ background: 'linear-gradient(180deg, #d97706 0%, #b45309 100%)' }}
      />
      
      {/* Lightning bolt / arrow pattern in center */}
      <svg 
        viewBox="0 0 40 80" 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-20 text-amber-600"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
      >
        <path d="M20,0 L25,30 L30,30 L20,50 L25,50 L20,80 L15,50 L10,50 L20,30 L15,30 Z" fill="currentColor" />
      </svg>
    </div>
    
    {/* Content overlay for buttons */}
    <div className="absolute inset-0 flex items-center justify-center">
      {children}
    </div>
  </div>
);

const QUICK_ACTIONS = [
  { id: 'live', label: 'Live Now', sublabel: '2.4K watching', icon: Radio, page: 'Explore', gradient: 'from-red-500 to-rose-600' },
  { id: 'videos', label: 'Videos', sublabel: 'Shorts & VODs', icon: Film, page: 'TheAmphitheatre', gradient: 'from-purple-500 to-violet-600' },
  { id: 'gaming', label: 'Gaming', sublabel: 'Stream setup', icon: Gamepad2, page: 'TheGamingHub', gradient: 'from-blue-500 to-cyan-600' },
  { id: 'shop', label: 'Shop', sublabel: 'Affiliate deals', icon: ShoppingBag, page: 'AffiliateHub', gradient: 'from-emerald-500 to-green-600' },
];

const LIVE_STATS = [
  { label: 'Live Creators', value: '847', icon: Radio },
  { label: 'Viewers Now', value: '24.5K', icon: Users },
  { label: 'Gifts Sent', value: '12.3K', icon: Sparkles },
];

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loadingText, setLoadingText] = useState('');
  const loadingMessages = ['Connecting to servers...', 'Loading content...', 'Preparing your feed...', 'Almost ready...'];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
    ];
    
    // Cycle through loading messages
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      setLoadingText(loadingMessages[msgIndex % loadingMessages.length]);
      msgIndex++;
    }, 600);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(msgInterval);
    };
  }, []);

  const handleEnter = () => {
    setIsVisible(false);
    setTimeout(() => onComplete?.(), 250);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[100] bg-black overflow-hidden"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 40%), radial-gradient(ellipse at 20% 80%, rgba(239, 68, 68, 0.2) 0%, transparent 40%)'
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Centurion image - Full Screen */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 1 }}
      >
        <motion.img
          src={CENTURION_IMAGE}
          alt=""
          className="w-full h-full object-cover object-center"
          initial={{ scale: 1.1 }}
          animate={{ 
            scale: phase >= 2 ? 1 : 1.1,
            filter: phase >= 4 ? 'brightness(0.4)' : 'brightness(0.8)'
          }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
      </motion.div>

      {/* Top section - Logo */}
      <div className="relative z-10 pt-12 sm:pt-16">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -40 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Main logo */}
          <motion.h1 
            className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter"
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              background: 'linear-gradient(180deg, #ffffff 0%, #f59e0b 50%, #b45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 80px rgba(245, 158, 11, 0.5)',
            }}
          >
            LEGION
          </motion.h1>
          <motion.div 
            className="flex items-center justify-center gap-2 -mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 1 : 0 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-red-500"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-2xl sm:text-3xl font-bold tracking-[0.4em] text-amber-400">
              LIVE
            </span>
          </motion.div>
          
          {/* Tagline */}
          <motion.p
            className="text-white/50 text-sm sm:text-base mt-3 tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 1 : 0 }}
            transition={{ delay: 0.5 }}
          >
            Stream • Create • Earn
          </motion.p>
        </motion.div>
      </div>

      {/* Live stats ticker - TikTok style */}
      <AnimatePresence>
        {phase >= 3 && phase < 4 && (
          <motion.div
            className="absolute top-1/3 left-0 right-0 z-20"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center gap-6 sm:gap-10">
              {LIVE_STATS.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Icon className="w-4 h-4 text-amber-400" />
                      <span className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</span>
                    </div>
                    <span className="text-white/40 text-xs">{stat.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom section - Roman Shield Menu or Loading */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <AnimatePresence mode="wait">
          {phase >= 4 ? (
            <motion.div
              key="menu"
              className="px-4 pb-8 sm:pb-10 flex flex-col items-center"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* Roman Shield with Buttons */}
              <motion.div
                className="relative mb-6"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              >
                <RomanShield>
                  <div className="flex flex-col items-center justify-center gap-3">
                    {/* Top Row - Live Now & Videos */}
                    <div className="flex gap-8">
                      {[QUICK_ACTIONS[0], QUICK_ACTIONS[1]].map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                          >
                            <Link to={createPageUrl(item.page)} onClick={handleEnter}>
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="flex flex-col items-center"
                              >
                                <div 
                                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center`}
                                  style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                                >
                                  <Icon className="w-7 h-7 text-white" />
                                </div>
                                <span className="text-white text-xs font-bold mt-1.5 drop-shadow-lg">{item.label}</span>
                              </motion.div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                    
                    {/* Bottom Row - Gaming & Shop */}
                    <div className="flex gap-8 mt-1">
                      {[QUICK_ACTIONS[2], QUICK_ACTIONS[3]].map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + index * 0.1, type: 'spring' }}
                          >
                            <Link to={createPageUrl(item.page)} onClick={handleEnter}>
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="flex flex-col items-center"
                              >
                                <div 
                                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center`}
                                  style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
                                >
                                  <Icon className="w-7 h-7 text-white" />
                                </div>
                                <span className="text-white text-xs font-bold mt-1.5 drop-shadow-lg">{item.label}</span>
                              </motion.div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </RomanShield>
              </motion.div>

              {/* Main CTA */}
              <motion.button
                onClick={handleEnter}
                className="w-full max-w-sm mx-auto block"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="relative overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className="relative flex items-center justify-center gap-3 py-3.5 font-bold text-white text-base">
                    <Play className="w-5 h-5 fill-current" />
                    Start Watching
                  </div>
                </div>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              className="px-6 pb-16 text-center"
              exit={{ opacity: 0, y: 30 }}
            >
              {/* Loading bar */}
              <div className="max-w-xs mx-auto mb-4">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: phase === 1 ? '30%' : phase === 2 ? '60%' : phase === 3 ? '90%' : '100%' 
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <motion.p
                className="text-white/40 text-sm"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {loadingText}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip button */}
      <motion.button
        className="absolute top-4 right-4 z-40 text-white/30 hover:text-white/60 text-sm px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        onClick={handleEnter}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Skip
      </motion.button>

      {/* 21+ Badge */}
      <motion.div
        className="absolute top-4 left-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
      >
        <span className="text-red-400 text-xs font-bold">21+</span>
        <span className="text-white/50 text-xs">Adult Platform</span>
      </motion.div>
    </motion.div>
  );
}