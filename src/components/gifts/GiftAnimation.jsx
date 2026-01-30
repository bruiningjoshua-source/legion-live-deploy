import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Comic-style 3D Roman themed gift visuals
const GIFT_VISUALS = {
  // Treasures
  treasure: {
    render: (tier) => (
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Chest base */}
          <defs>
            <linearGradient id="chestGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="chestWood" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
          </defs>
          {/* Chest body */}
          <rect x="15" y="45" width="70" height="45" rx="5" fill="url(#chestWood)" stroke="#92400e" strokeWidth="3"/>
          {/* Chest lid */}
          <path d="M15 45 Q50 20 85 45" fill="url(#chestWood)" stroke="#92400e" strokeWidth="3"/>
          {/* Gold trim */}
          <rect x="20" y="50" width="60" height="5" fill="url(#chestGold)"/>
          <rect x="45" y="45" width="10" height="20" rx="2" fill="url(#chestGold)" stroke="#78350f" strokeWidth="1"/>
          {/* Coins spilling out */}
          <circle cx="30" cy="40" r="8" fill="#fbbf24" stroke="#92400e" strokeWidth="2"/>
          <circle cx="50" cy="35" r="8" fill="#fbbf24" stroke="#92400e" strokeWidth="2"/>
          <circle cx="70" cy="40" r="8" fill="#fbbf24" stroke="#92400e" strokeWidth="2"/>
          <circle cx="40" cy="30" r="6" fill="#fcd34d" stroke="#d97706" strokeWidth="2"/>
          <circle cx="60" cy="28" r="6" fill="#fcd34d" stroke="#d97706" strokeWidth="2"/>
        </svg>
      </div>
    )
  },
  // Roman Soldier
  soldier: {
    render: (tier) => (
      <div className="relative">
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <defs>
            <linearGradient id="helmet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="armor" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>
          {/* Helmet crest */}
          <path d="M35 10 Q50 0 65 10 L60 25 Q50 20 40 25 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2"/>
          {/* Helmet */}
          <ellipse cx="50" cy="30" rx="20" ry="15" fill="url(#helmet)" stroke="#78350f" strokeWidth="3"/>
          {/* Face guard */}
          <rect x="42" y="35" width="16" height="10" fill="#1c1917" rx="2"/>
          {/* Body/Armor */}
          <rect x="30" y="50" width="40" height="45" rx="5" fill="url(#armor)" stroke="#7f1d1d" strokeWidth="3"/>
          {/* Armor details */}
          <rect x="35" y="55" width="30" height="5" fill="#fbbf24" rx="2"/>
          <rect x="35" y="65" width="30" height="5" fill="#fbbf24" rx="2"/>
          <rect x="35" y="75" width="30" height="5" fill="#fbbf24" rx="2"/>
          {/* Shield */}
          <ellipse cx="20" cy="75" rx="15" ry="25" fill="#dc2626" stroke="#fbbf24" strokeWidth="3"/>
          <circle cx="20" cy="75" r="8" fill="#fbbf24" stroke="#92400e" strokeWidth="2"/>
          {/* Sword */}
          <rect x="78" y="50" width="6" height="40" fill="#d1d5db" stroke="#6b7280" strokeWidth="2" rx="1"/>
          <rect x="75" y="85" width="12" height="8" fill="#fbbf24" rx="2"/>
          <polygon points="81,50 75,35 87,35" fill="#d1d5db" stroke="#6b7280" strokeWidth="2"/>
        </svg>
      </div>
    )
  },
  // Roman Weapons
  weapons: {
    render: (tier) => (
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#e5e7eb" />
              <stop offset="50%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#d1d5db" />
            </linearGradient>
          </defs>
          {/* Crossed Swords */}
          {/* Sword 1 */}
          <rect x="20" y="45" width="60" height="8" fill="url(#blade)" stroke="#6b7280" strokeWidth="2" rx="1" transform="rotate(-30 50 50)"/>
          <polygon points="15,50 5,50 10,42" fill="url(#blade)" stroke="#6b7280" strokeWidth="2" transform="rotate(-30 50 50)"/>
          <rect x="75" y="43" width="15" height="12" fill="#fbbf24" rx="3" transform="rotate(-30 50 50)"/>
          <rect x="85" y="40" width="8" height="18" fill="#78350f" rx="2" transform="rotate(-30 50 50)"/>
          {/* Sword 2 */}
          <rect x="20" y="45" width="60" height="8" fill="url(#blade)" stroke="#6b7280" strokeWidth="2" rx="1" transform="rotate(30 50 50)"/>
          <polygon points="15,50 5,50 10,42" fill="url(#blade)" stroke="#6b7280" strokeWidth="2" transform="rotate(30 50 50)"/>
          <rect x="75" y="43" width="15" height="12" fill="#fbbf24" rx="3" transform="rotate(30 50 50)"/>
          <rect x="85" y="40" width="8" height="18" fill="#78350f" rx="2" transform="rotate(30 50 50)"/>
          {/* Center emblem */}
          <circle cx="50" cy="50" r="12" fill="#dc2626" stroke="#fbbf24" strokeWidth="3"/>
          <text x="50" y="55" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="bold">SPQR</text>
        </svg>
      </div>
    )
  },
  // Mythical Beast - Griffin
  griffin: {
    render: (tier) => (
      <div className="relative">
        <svg viewBox="0 0 120 100" className="w-full h-full">
          <defs>
            <linearGradient id="griffinBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="wing" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#4c1d95" />
            </linearGradient>
          </defs>
          {/* Wing */}
          <path d="M60 40 Q30 10 15 50 Q30 45 40 55 Q35 35 60 40" fill="url(#wing)" stroke="#5b21b6" strokeWidth="2"/>
          <path d="M65 35 Q45 5 25 40" fill="none" stroke="#a78bfa" strokeWidth="2"/>
          <path d="M62 42 Q42 15 28 45" fill="none" stroke="#a78bfa" strokeWidth="2"/>
          {/* Body */}
          <ellipse cx="70" cy="60" rx="30" ry="20" fill="url(#griffinBody)" stroke="#92400e" strokeWidth="3"/>
          {/* Head */}
          <circle cx="95" cy="45" r="15" fill="url(#griffinBody)" stroke="#92400e" strokeWidth="3"/>
          {/* Beak */}
          <polygon points="108,45 120,42 120,48" fill="#f97316" stroke="#c2410c" strokeWidth="2"/>
          {/* Eye */}
          <circle cx="100" cy="42" r="4" fill="#1c1917"/>
          <circle cx="101" cy="41" r="1.5" fill="white"/>
          {/* Ear tufts */}
          <polygon points="88,32 92,20 96,32" fill="#fbbf24" stroke="#92400e" strokeWidth="2"/>
          {/* Front legs (eagle) */}
          <path d="M55 75 L50 90 L45 88 L48 78" fill="#fbbf24" stroke="#92400e" strokeWidth="2"/>
          <path d="M65 75 L60 90 L55 88 L58 78" fill="#fbbf24" stroke="#92400e" strokeWidth="2"/>
          {/* Talons */}
          <path d="M50 90 L45 95 M50 90 L50 96 M50 90 L55 95" stroke="#92400e" strokeWidth="2" fill="none"/>
          {/* Back legs (lion) */}
          <path d="M85 75 L90 90" stroke="#b45309" strokeWidth="6" strokeLinecap="round"/>
          {/* Tail */}
          <path d="M40 60 Q25 55 20 70 Q25 65 30 70" fill="#b45309" stroke="#92400e" strokeWidth="2"/>
        </svg>
      </div>
    )
  },
  // Phoenix
  phoenix: {
    render: (tier) => (
      <div className="relative">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <defs>
            <linearGradient id="phoenixBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
            <linearGradient id="phoenixWing" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {/* Flame aura */}
          <ellipse cx="60" cy="60" rx="50" ry="45" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.3" filter="url(#glow)"/>
          {/* Wings */}
          <path d="M60 50 Q20 20 10 60 Q30 50 35 65 Q25 40 60 50" fill="url(#phoenixWing)" stroke="#c2410c" strokeWidth="2"/>
          <path d="M60 50 Q100 20 110 60 Q90 50 85 65 Q95 40 60 50" fill="url(#phoenixWing)" stroke="#c2410c" strokeWidth="2"/>
          {/* Body */}
          <ellipse cx="60" cy="65" rx="20" ry="25" fill="url(#phoenixBody)" stroke="#991b1b" strokeWidth="2"/>
          {/* Head */}
          <circle cx="60" cy="40" r="12" fill="url(#phoenixBody)" stroke="#991b1b" strokeWidth="2"/>
          {/* Crest */}
          <path d="M55 30 Q50 15 55 28 M60 28 Q60 10 60 26 M65 30 Q70 15 65 28" stroke="#fbbf24" strokeWidth="3" fill="none"/>
          {/* Beak */}
          <polygon points="60,48 55,52 60,56 65,52" fill="#fbbf24" stroke="#b45309" strokeWidth="1"/>
          {/* Eyes */}
          <circle cx="55" cy="38" r="3" fill="#fef3c7"/>
          <circle cx="55" cy="38" r="1.5" fill="#1c1917"/>
          <circle cx="65" cy="38" r="3" fill="#fef3c7"/>
          <circle cx="65" cy="38" r="1.5" fill="#1c1917"/>
          {/* Tail feathers */}
          <path d="M50 85 Q40 110 35 115" stroke="#f97316" strokeWidth="4" fill="none"/>
          <path d="M60 90 Q60 115 60 120" stroke="#dc2626" strokeWidth="4" fill="none"/>
          <path d="M70 85 Q80 110 85 115" stroke="#f97316" strokeWidth="4" fill="none"/>
          {/* Fire particles */}
          <circle cx="30" cy="100" r="3" fill="#fbbf24" opacity="0.8"/>
          <circle cx="90" cy="100" r="3" fill="#fbbf24" opacity="0.8"/>
          <circle cx="60" cy="105" r="4" fill="#f97316" opacity="0.8"/>
        </svg>
      </div>
    )
  },
  // Default coin
  coin: {
    render: (tier) => (
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <linearGradient id="coinGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="45" fill="url(#coinGold)" stroke="#78350f" strokeWidth="4"/>
          <circle cx="50" cy="50" r="35" fill="none" stroke="#92400e" strokeWidth="2"/>
          <text x="50" y="45" textAnchor="middle" fill="#78350f" fontSize="10" fontWeight="bold">LEGION</text>
          <text x="50" y="62" textAnchor="middle" fill="#78350f" fontSize="16" fontWeight="bold">🏛️</text>
        </svg>
      </div>
    )
  }
};

// Map gift categories to visuals
const getGiftVisual = (gift) => {
  const category = gift.category?.toLowerCase() || '';
  const name = gift.name?.toLowerCase() || '';
  
  if (name.includes('phoenix') || name.includes('fire')) return 'phoenix';
  if (name.includes('griffin') || name.includes('beast') || name.includes('dragon')) return 'griffin';
  if (name.includes('soldier') || name.includes('centurion') || name.includes('legion')) return 'soldier';
  if (name.includes('sword') || name.includes('weapon') || name.includes('gladius')) return 'weapons';
  if (name.includes('treasure') || name.includes('chest') || name.includes('gold')) return 'treasure';
  if (category === 'mythical' || category === 'prestige') return 'griffin';
  if (category === 'military') return 'soldier';
  
  return 'coin';
};

export default function GiftAnimation({ gift, sender, quantity = 1, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const visualType = getGiftVisual(gift);
  const Visual = GIFT_VISUALS[visualType];

  useEffect(() => {
    const duration = gift.animation_type === 'prestige' ? 4000 : 
                     gift.animation_type === 'fullscreen' ? 3000 : 
                     gift.animation_type === 'burst' ? 2000 : 1500;

    // Confetti for higher tiers
    if (gift.tier === 'legendary' || gift.tier === 'prestige') {
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#dc2626', '#7c3aed', '#f97316']
      });
    } else if (gift.tier === 'epic' || gift.tier === 'rare') {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f97316']
      });
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 400);
    }, duration);

    return () => clearTimeout(timer);
  }, [gift, onComplete]);

  // Simple animation
  if (gift.animation_type === 'simple') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -50 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-stone-900/95 backdrop-blur-xl border-2 border-amber-500/50 rounded-2xl p-6 text-center shadow-2xl">
              <motion.div 
                animate={{ rotateY: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 mx-auto mb-3"
              >
                {Visual.render(gift.tier)}
              </motion.div>
              <p className="text-amber-100 font-bold text-xl">
                {gift.name} {quantity > 1 && <span className="text-amber-400">x{quantity}</span>}
              </p>
              <p className="text-amber-400/70 text-sm">from {sender}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Burst animation
  if (gift.animation_type === 'burst') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: [0, 1.2, 1], rotate: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-8 bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-amber-500/30 rounded-full blur-2xl animate-pulse" />
                
                <div className="relative bg-stone-900/95 backdrop-blur-xl border-3 border-amber-400 rounded-3xl p-8 text-center shadow-2xl">
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotateY: [0, 360]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-32 h-32 mx-auto mb-4"
                  >
                    {Visual.render(gift.tier)}
                  </motion.div>
                  <p className="text-amber-100 font-bold text-2xl mb-1">{gift.name}</p>
                  <p className="text-amber-400/80 text-sm mb-2">from {sender}</p>
                  <div className="flex items-center justify-center gap-1 text-amber-300">
                    <span className="text-xl">🪙</span>
                    <span className="font-bold">{gift.cost_as?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Burst particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  scale: [0, 1, 0.5],
                  x: Math.cos(i * 30 * Math.PI / 180) * 150,
                  y: Math.sin(i * 30 * Math.PI / 180) * 150,
                  opacity: [1, 1, 0]
                }}
                transition={{ duration: 1, delay: 0.2 }}
                className="fixed top-1/3 left-1/2 z-40"
              >
                <div className="w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    );
  }

  // Fullscreen animation
  if (gift.animation_type === 'fullscreen') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ scale: 0, y: 100, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0, y: -100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 150 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            >
              <div className="relative">
                {/* Multiple glow layers */}
                <div className="absolute -inset-16 bg-gradient-to-r from-purple-500/40 via-amber-500/40 to-orange-500/40 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -inset-8 bg-gradient-to-r from-amber-400/30 to-orange-400/30 rounded-full blur-2xl" />
                
                <div className="relative bg-stone-900/95 backdrop-blur-xl border-4 border-amber-400 rounded-3xl p-12 text-center shadow-2xl min-w-[380px]">
                  <motion.div
                    animate={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-40 h-40 mx-auto mb-6"
                  >
                    {Visual.render(gift.tier)}
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-amber-100 font-bold text-3xl mb-2">{gift.name}</p>
                    <p className="text-amber-400/80 text-lg mb-3">{gift.description}</p>
                    <p className="text-amber-300 font-semibold text-xl mb-4">from {sender}</p>
                    <div className="flex items-center justify-center gap-2 bg-amber-600/20 rounded-full py-2 px-6 border border-amber-500/30">
                      <span className="text-2xl">🪙</span>
                      <span className="font-bold text-xl text-amber-100">{gift.cost_as?.toLocaleString()}</span>
                    </div>
                  </motion.div>
                </div>

                {/* Orbiting particles */}
                {[...Array(16)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: i * 0.1 }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      marginLeft: Math.cos(i * 22.5 * Math.PI / 180) * 200 - 6,
                      marginTop: Math.sin(i * 22.5 * Math.PI / 180) * 200 - 6
                    }}
                  >
                    <div className="w-3 h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Prestige animation (Legendary)
  if (gift.animation_type === 'prestige') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            {/* Dramatic background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/50 via-stone-950/90 to-purple-900/50 backdrop-blur-md" />
            
            {/* Rotating rays */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-full w-1 bg-gradient-to-t from-transparent via-amber-500/20 to-transparent"
                  style={{ transform: `rotate(${i * 15}deg)` }}
                />
              ))}
            </motion.div>

            {/* Main content */}
            <div className="relative h-full flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
                className="relative"
              >
                {/* Glow layers */}
                <div className="absolute -inset-24 bg-gradient-to-r from-amber-500/50 via-orange-500/50 to-red-500/50 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -inset-16 bg-gradient-to-r from-amber-400/40 to-orange-400/40 rounded-full blur-2xl" />
                
                <div className="relative bg-stone-900/95 backdrop-blur-xl border-4 border-amber-300 rounded-3xl p-16 text-center shadow-2xl min-w-[450px]">
                  <motion.div
                    animate={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-48 h-48 mx-auto mb-8"
                  >
                    {Visual.render(gift.tier)}
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400" />
                      <span className="text-amber-400 text-sm font-bold tracking-[0.3em]">LEGENDARY</span>
                      <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400" />
                    </div>
                    
                    <p className="text-amber-100 font-bold text-4xl mb-3">{gift.name}</p>
                    <p className="text-amber-300/90 text-xl mb-4 max-w-md mx-auto">{gift.description}</p>
                    <p className="text-amber-200 font-semibold text-2xl mb-6">from {sender}</p>
                    
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-600/30 to-orange-600/30 rounded-full py-4 px-8 border border-amber-400/50">
                      <span className="text-4xl">🪙</span>
                      <span className="font-bold text-3xl text-amber-100">{gift.cost_as?.toLocaleString()}</span>
                    </div>
                  </motion.div>
                </div>

                {/* Orbiting rings */}
                {[...Array(3)].map((_, ring) => (
                  <motion.div
                    key={ring}
                    animate={{ rotate: ring % 2 === 0 ? 360 : -360 }}
                    transition={{ duration: 6 + ring * 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full shadow-lg"
                        style={{
                          left: '50%',
                          top: '50%',
                          marginLeft: Math.cos(i * 45 * Math.PI / 180) * (250 + ring * 40) - 8,
                          marginTop: Math.sin(i * 45 * Math.PI / 180) * (250 + ring * 40) - 8
                        }}
                      />
                    ))}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return null;
}