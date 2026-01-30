import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const TIER_CONFIGS = {
  common: {
    duration: 2000,
    confetti: false,
    fullscreen: false,
    particles: 0
  },
  uncommon: {
    duration: 2500,
    confetti: false,
    fullscreen: false,
    particles: 10
  },
  rare: {
    duration: 3000,
    confetti: true,
    confettiCount: 50,
    fullscreen: false,
    particles: 20
  },
  epic: {
    duration: 3500,
    confetti: true,
    confettiCount: 100,
    fullscreen: false,
    particles: 30
  },
  legendary: {
    duration: 4500,
    confetti: true,
    confettiCount: 150,
    fullscreen: true,
    particles: 50
  },
  prestige: {
    duration: 5500,
    confetti: true,
    confettiCount: 200,
    fullscreen: true,
    screenTakeover: true,
    particles: 75
  },
  divine: {
    duration: 7000,
    confetti: true,
    confettiCount: 300,
    fullscreen: true,
    screenTakeover: true,
    megaEffect: true,
    particles: 100
  }
};

const FloatingParticle = ({ delay, color, size }) => (
  <motion.div
    initial={{ y: 0, opacity: 0, scale: 0 }}
    animate={{ 
      y: [-20, -100, -200],
      opacity: [0, 1, 0],
      scale: [0, 1, 0.5],
      x: [0, Math.random() * 60 - 30, Math.random() * 100 - 50]
    }}
    transition={{ 
      duration: 2 + Math.random(), 
      delay,
      ease: "easeOut"
    }}
    className="absolute rounded-full"
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      left: `${Math.random() * 100}%`,
      bottom: 0
    }}
  />
);

export default function PremiumGiftAnimation({ gift, sender, quantity = 1, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  
  const tier = gift.tier || 'common';
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.common;

  const triggerConfetti = useCallback(() => {
    if (!config.confetti) return;

    const colors = ['#ffd700', '#ff1744', '#7c4dff', '#00e676', '#ff9100', '#e91e63'];
    
    if (config.megaEffect) {
      // Mega divine effect - continuous confetti
      const end = Date.now() + 4000;
      const frame = () => {
        confetti({
          particleCount: 6,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors
        });
        confetti({
          particleCount: 6,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else if (config.screenTakeover) {
      // Prestige effect - burst from center
      confetti({
        particleCount: config.confettiCount,
        spread: 160,
        origin: { y: 0.35 },
        colors,
        scalar: 1.5
      });
    } else {
      // Standard confetti
      confetti({
        particleCount: config.confettiCount,
        spread: 80,
        origin: { y: 0.6 },
        colors
      });
    }
  }, [config]);

  useEffect(() => {
    triggerConfetti();
    
    const timer = setTimeout(() => {
      setShowParticles(false);
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
      }, 300);
    }, config.duration);

    return () => clearTimeout(timer);
  }, [config.duration, triggerConfetti, onComplete]);

  const getTierGradient = () => {
    switch (tier) {
      case 'divine': return 'from-amber-300 via-yellow-400 to-amber-500';
      case 'prestige': return 'from-rose-400 via-pink-500 to-fuchsia-600';
      case 'legendary': return 'from-amber-400 via-orange-500 to-red-500';
      case 'epic': return 'from-purple-400 via-violet-500 to-purple-600';
      case 'rare': return 'from-blue-400 via-cyan-500 to-blue-600';
      case 'uncommon': return 'from-emerald-400 via-green-500 to-emerald-600';
      default: return 'from-slate-400 via-gray-500 to-slate-600';
    }
  };

  const getTierLabel = () => {
    if (tier === 'divine') return '✨ DIVINE GIFT ✨';
    if (tier === 'prestige') return '👑 PRESTIGE';
    if (tier === 'legendary') return '🔥 LEGENDARY';
    if (tier === 'epic') return '💜 EPIC';
    if (tier === 'rare') return '💎 RARE';
    return '';
  };

  // Divine/Prestige fullscreen takeover
  if (config.screenTakeover) {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          >
            {/* Animated background */}
            <motion.div 
              className="absolute inset-0"
              animate={{ 
                background: [
                  `radial-gradient(circle at 30% 30%, ${tier === 'divine' ? '#ffd700' : '#ff1744'}40 0%, #000 60%)`,
                  `radial-gradient(circle at 70% 70%, ${tier === 'divine' ? '#ff9100' : '#7c4dff'}40 0%, #000 60%)`,
                  `radial-gradient(circle at 30% 70%, ${tier === 'divine' ? '#ffd700' : '#ff1744'}40 0%, #000 60%)`
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            
            {/* Rotating rays */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-full w-1"
                  style={{ 
                    transform: `rotate(${i * 15}deg)`,
                    background: `linear-gradient(to top, transparent, ${tier === 'divine' ? '#ffd700' : '#ff1744'}30, transparent)`
                  }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                />
              ))}
            </motion.div>

            {/* Floating particles */}
            {showParticles && [...Array(config.particles)].map((_, i) => (
              <FloatingParticle 
                key={i}
                delay={i * 0.03}
                color={tier === 'divine' ? '#ffd700' : '#ff1744'}
                size={Math.random() * 20 + 10}
              />
            ))}

            {/* Main content */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
              className="relative z-10"
            >
              {/* Pulsing glow */}
              <motion.div 
                className={`absolute -inset-24 rounded-full bg-gradient-to-r ${getTierGradient()} blur-3xl`}
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              <div className="relative bg-black/90 backdrop-blur-2xl border-2 border-white/20 rounded-3xl p-12 text-center min-w-[400px] max-w-[500px]">
                {/* Tier label */}
                <motion.div 
                  className={`inline-block mb-6 px-6 py-2 rounded-full bg-gradient-to-r ${getTierGradient()}`}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <span className="font-black text-white text-sm tracking-widest">
                    {getTierLabel()}
                  </span>
                </motion.div>

                {/* Gift icon */}
                <motion.div
                  animate={{ 
                    rotateY: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="text-8xl mb-6"
                >
                  {gift.icon || '🎁'}
                </motion.div>
                
                {/* Gift name */}
                <h2 className="text-white font-black text-4xl mb-2">{gift.name}</h2>
                {quantity > 1 && (
                  <p className={`text-transparent bg-clip-text bg-gradient-to-r ${getTierGradient()} text-2xl font-bold mb-4`}>
                    x{quantity}
                  </p>
                )}
                
                {/* Sender */}
                <p className="text-white/80 text-xl mb-8">
                  from <span className={`font-bold text-transparent bg-clip-text bg-gradient-to-r ${getTierGradient()}`}>{sender}</span>
                </p>
                
                {/* Cost */}
                <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${getTierGradient()} rounded-full py-4 px-8`}>
                  <span className="text-4xl">🪙</span>
                  <span className="font-black text-3xl text-white">
                    {((gift.cost_denarii || 0) * quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Fullscreen (legendary/epic)
  if (config.fullscreen) {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]" 
            />
            <motion.div
              initial={{ scale: 0, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -100 }}
              transition={{ type: 'spring', stiffness: 150 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80]"
            >
              <div className="relative">
                {/* Glow */}
                <motion.div 
                  className={`absolute -inset-16 rounded-full bg-gradient-to-r ${getTierGradient()} blur-3xl opacity-50`}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                
                <div className="relative bg-black/90 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-10 text-center min-w-[320px]">
                  {getTierLabel() && (
                    <div className={`inline-block mb-4 px-4 py-1 rounded-full bg-gradient-to-r ${getTierGradient()}`}>
                      <span className="font-bold text-white text-xs tracking-widest">{getTierLabel()}</span>
                    </div>
                  )}
                  
                  <motion.div
                    animate={{ rotateY: [0, 360], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="text-7xl mb-4"
                  >
                    {gift.icon || '🎁'}
                  </motion.div>
                  
                  <p className="text-white font-bold text-2xl mb-1">{gift.name}</p>
                  {quantity > 1 && <p className={`text-transparent bg-clip-text bg-gradient-to-r ${getTierGradient()} font-bold mb-2`}>x{quantity}</p>}
                  <p className="text-white/60 text-sm mb-4">from {sender}</p>
                  
                  <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${getTierGradient()} rounded-full py-2 px-5`}>
                    <span className="text-2xl">🪙</span>
                    <span className="font-bold text-xl text-white">{((gift.cost_denarii || 0) * quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Standard (burst/simple)
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0, y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[60]"
        >
          <div className={`bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 text-center ${config.particles > 0 ? 'relative overflow-visible' : ''}`}>
            {/* Particles */}
            {showParticles && config.particles > 0 && [...Array(Math.min(config.particles, 15))].map((_, i) => (
              <FloatingParticle 
                key={i}
                delay={i * 0.05}
                color={tier === 'epic' ? '#7c4dff' : tier === 'rare' ? '#00bcd4' : '#4caf50'}
                size={Math.random() * 12 + 6}
              />
            ))}
            
            <motion.div 
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="text-5xl mb-3"
            >
              {gift.icon || '🎁'}
            </motion.div>
            <p className="text-white font-bold text-lg">
              {gift.name} {quantity > 1 && <span className="text-amber-400">x{quantity}</span>}
            </p>
            <p className="text-white/60 text-sm">from {sender}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}