import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Radio, Film, Gamepad2, Users, ShoppingBag, Trophy, 
  Wallet, User, Settings, Play
} from 'lucide-react';

const CENTURION_IMAGE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695f3a3f9fa9a9799a4c1674/29aa9a1e7_AI_Generated_Image_2026-01-16_506237618000201.png';

// Shield menu sections - arranged like a wheel
const SHIELD_SECTIONS = [
  { id: 'arena', label: 'Live Arena', icon: Radio, page: 'Explore', color: '#dc2626', angle: -60 },
  { id: 'amphitheatre', label: 'Amphitheatre', icon: Film, page: 'TheAmphitheatre', color: '#9333ea', angle: -20 },
  { id: 'gaming', label: 'Gaming Hub', icon: Gamepad2, page: 'TheGamingHub', color: '#2563eb', angle: 20 },
  { id: 'forum', label: 'Forum', icon: Users, page: 'CommunityForums', color: '#059669', angle: 60 },
  { id: 'market', label: 'Marketplace', icon: ShoppingBag, page: 'AffiliateHub', color: '#d97706', angle: 100 },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, page: 'Leaderboard', color: '#eab308', angle: 140 },
];

export default function LoadingScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),   // Fade in scene
      setTimeout(() => setPhase(2), 1500),  // Energy builds
      setTimeout(() => setPhase(3), 2800),  // Logo appears
      setTimeout(() => setPhase(4), 4200),  // Shield menu reveals
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    setIsVisible(false);
    setTimeout(() => onComplete?.(), 400);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ background: '#0a0a0f' }}
    >
      {/* Animated background - Comic style */}
      <div className="absolute inset-0">
        {/* Dark gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1025] via-[#0f0a15] to-black" />
        
        {/* Animated radial glow */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(ellipse at 50% 30%, rgba(217, 119, 6, 0.15) 0%, transparent 50%)',
              'radial-gradient(ellipse at 50% 30%, rgba(217, 119, 6, 0.25) 0%, transparent 60%)',
              'radial-gradient(ellipse at 50% 30%, rgba(217, 119, 6, 0.15) 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Comic-style speed lines */}
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {[...Array(12)].map((_, i) => (
            <motion.line
              key={i}
              x1="0%"
              y1={`${5 + i * 8}%`}
              x2="100%"
              y2={`${8 + i * 8}%`}
              stroke="url(#lineGrad)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={phase >= 2 ? { 
                pathLength: [0, 1], 
                opacity: [0, 0.6, 0] 
              } : {}}
              transition={{ 
                duration: 1.5, 
                delay: i * 0.1, 
                repeat: Infinity,
                repeatDelay: 2
              }}
            />
          ))}
        </svg>

        {/* Column silhouettes */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 1 }}
        >
          <svg viewBox="0 0 1200 800" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
            {/* Left columns */}
            <rect x="50" y="200" width="40" height="600" fill="#1a1520" />
            <rect x="120" y="150" width="35" height="650" fill="#15101a" />
            <rect x="180" y="250" width="30" height="550" fill="#1a1520" />
            {/* Right columns */}
            <rect x="1000" y="200" width="40" height="600" fill="#1a1520" />
            <rect x="1060" y="150" width="35" height="650" fill="#15101a" />
            <rect x="1130" y="250" width="30" height="550" fill="#1a1520" />
            {/* Column tops */}
            <rect x="45" y="180" width="50" height="25" fill="#252030" />
            <rect x="115" y="130" width="45" height="25" fill="#201825" />
            <rect x="995" y="180" width="50" height="25" fill="#252030" />
            <rect x="1055" y="130" width="45" height="25" fill="#201825" />
          </svg>
        </motion.div>
      </div>

      {/* Centurion Hero Image */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ 
          scale: phase >= 1 ? 1 : 1.2, 
          opacity: phase >= 1 ? 1 : 0 
        }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <div className="relative w-full h-full max-w-4xl mx-auto">
          <img 
            src={CENTURION_IMAGE} 
            alt="Legion Live"
            className="absolute inset-0 w-full h-full object-contain object-bottom"
            style={{
              filter: phase >= 4 ? 'brightness(0.6)' : 'brightness(1)',
              transition: 'filter 0.8s ease'
            }}
          />
          
          {/* Glow effect around centurion */}
          <motion.div
            className="absolute inset-0"
            animate={phase >= 2 ? {
              boxShadow: [
                'inset 0 0 100px rgba(217, 119, 6, 0)',
                'inset 0 0 150px rgba(217, 119, 6, 0.3)',
                'inset 0 0 100px rgba(217, 119, 6, 0)',
              ]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* LEGION LIVE Logo */}
      <AnimatePresence>
        {phase >= 3 && phase < 4 && (
          <motion.div
            className="absolute top-[15%] left-1/2 -translate-x-1/2 text-center z-20"
            initial={{ scale: 2.5, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -30 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 150 }}
          >
            <h1 
              className="text-6xl md:text-8xl font-black tracking-tight"
              style={{
                fontFamily: 'Georgia, serif',
                background: 'linear-gradient(180deg, #fef3c7 0%, #f59e0b 40%, #b45309 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 4px 60px rgba(217, 119, 6, 0.5)',
              }}
            >
              LEGION
            </h1>
            <p 
              className="text-2xl md:text-4xl font-bold tracking-[0.5em] -mt-1"
              style={{
                background: 'linear-gradient(180deg, #fcd34d 0%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              LIVE
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shield Wheel Menu */}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Darkening overlay */}
            <motion.div 
              className="absolute inset-0 bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* Shield Container */}
            <motion.div
              className="relative"
              initial={{ scale: 0.3, rotateY: 90 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 80 }}
            >
              {/* Shield SVG */}
              <svg viewBox="0 0 400 480" className="w-72 h-[22rem] md:w-96 md:h-[28rem]">
                <defs>
                  <linearGradient id="shieldGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#92400e" />
                  </linearGradient>
                  <linearGradient id="shieldRed" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#991b1b" />
                    <stop offset="50%" stopColor="#7f1d1d" />
                    <stop offset="100%" stopColor="#450a0a" />
                  </linearGradient>
                  <filter id="shieldGlow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="innerShadow">
                    <feOffset dx="0" dy="4" />
                    <feGaussianBlur stdDeviation="4" />
                    <feComposite operator="out" in="SourceGraphic" />
                  </filter>
                </defs>

                {/* Shield base */}
                <path
                  d="M200 20 L360 60 L360 200 Q360 380 200 460 Q40 380 40 200 L40 60 Z"
                  fill="url(#shieldRed)"
                  stroke="url(#shieldGold)"
                  strokeWidth="8"
                  filter="url(#shieldGlow)"
                />

                {/* Inner decorative border */}
                <path
                  d="M200 45 L335 80 L335 195 Q335 355 200 425 Q65 355 65 195 L65 80 Z"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  opacity="0.5"
                />

                {/* Center boss */}
                <circle cx="200" cy="200" r="50" fill="url(#shieldGold)" stroke="#78350f" strokeWidth="4" />
                <circle cx="200" cy="200" r="38" fill="#7f1d1d" stroke="#fbbf24" strokeWidth="2" />
                
                {/* Center emblem */}
                <text x="200" y="195" textAnchor="middle" fill="#fcd34d" fontSize="18" fontWeight="bold" fontFamily="Georgia, serif">
                  LEGION
                </text>
                <text x="200" y="215" textAnchor="middle" fill="#fcd34d" fontSize="12" fontWeight="bold" letterSpacing="4">
                  LIVE
                </text>

                {/* Decorative rays */}
                {[...Array(8)].map((_, i) => {
                  const angle = (i * 45) * (Math.PI / 180);
                  const x1 = 200 + Math.cos(angle) * 55;
                  const y1 = 200 + Math.sin(angle) * 55;
                  const x2 = 200 + Math.cos(angle) * 75;
                  const y2 = 200 + Math.sin(angle) * 75;
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
                  );
                })}
              </svg>

              {/* Menu Sections - Positioned around shield */}
              {SHIELD_SECTIONS.map((section, index) => {
                const Icon = section.icon;
                const angleRad = (section.angle - 90) * (Math.PI / 180);
                const radius = 170;
                const x = Math.cos(angleRad) * radius;
                const y = Math.sin(angleRad) * radius;

                return (
                  <motion.div
                    key={section.id}
                    className="absolute"
                    style={{
                      left: '50%',
                      top: '45%',
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1, type: 'spring' }}
                  >
                    <Link to={createPageUrl(section.page)} onClick={handleEnter}>
                      <motion.div
                        className="relative group cursor-pointer"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.95 }}
                        onHoverStart={() => setSelectedSection(section.id)}
                        onHoverEnd={() => setSelectedSection(null)}
                      >
                        {/* Button glow */}
                        <motion.div
                          className="absolute inset-0 rounded-full blur-md"
                          style={{ background: section.color }}
                          animate={selectedSection === section.id ? { 
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0.8, 0.5]
                          } : { opacity: 0.3 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        
                        {/* Button */}
                        <div 
                          className="relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2"
                          style={{ 
                            background: `linear-gradient(135deg, ${section.color}dd, ${section.color}88)`,
                            borderColor: '#fbbf24',
                            boxShadow: `0 4px 20px ${section.color}66`
                          }}
                        >
                          <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                        </div>

                        {/* Label */}
                        <motion.div
                          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap mt-2"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: selectedSection === section.id ? 1 : 0.7, y: 0 }}
                        >
                          <span className="text-xs md:text-sm font-semibold text-amber-200 drop-shadow-lg">
                            {section.label}
                          </span>
                        </motion.div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}

              {/* Enter/Skip Button at bottom of shield */}
              <motion.button
                className="absolute left-1/2 -translate-x-1/2 bottom-4 md:bottom-8"
                onClick={handleEnter}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-700 to-amber-600 rounded-full border border-amber-400/50 text-amber-100 font-semibold text-sm shadow-lg">
                  <Play className="w-4 h-4" />
                  Enter Home
                </div>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Progress - Only shown before shield */}
      {phase < 4 && (
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center"
          animate={{ opacity: phase < 4 ? 1 : 0 }}
        >
          <motion.p
            className="text-amber-400/80 text-sm md:text-base tracking-widest mb-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {phase < 2 ? 'LOADING...' : phase < 3 ? 'PREPARING THE ARENA...' : 'WELCOME, WARRIOR'}
          </motion.p>
          
          <div className="w-48 h-1.5 bg-stone-900 rounded-full overflow-hidden mx-auto">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"
              initial={{ width: '0%' }}
              animate={{ width: phase >= 3 ? '100%' : `${phase * 35}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>
      )}

      {/* Skip button - Always available */}
      {phase < 4 && (
        <motion.button
          className="absolute bottom-4 right-4 text-amber-500/60 hover:text-amber-400 text-sm transition-colors"
          onClick={handleEnter}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Skip →
        </motion.button>
      )}

      {/* Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 200px 100px rgba(0,0,0,0.7)' }}
      />
    </motion.div>
  );
}