import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function GiftAnimation({ gift, sender, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const duration = gift.animation_type === 'prestige' ? 5000 : 
                     gift.animation_type === 'fullscreen' ? 3500 : 
                     gift.animation_type === 'burst' ? 2000 : 1500;

    // Trigger confetti for higher tier gifts
    if (gift.tier === 'legendary' || gift.tier === 'prestige') {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#dc2626', '#7c3aed']
      });
    } else if (gift.tier === 'epic') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#ec4899']
      });
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [gift, onComplete]);

  // Simple animation for common gifts
  if (gift.animation_type === 'simple') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-stone-900/90 backdrop-blur-lg border-2 border-amber-500 rounded-2xl p-6 text-center shadow-2xl shadow-amber-500/50">
              <div className="text-6xl mb-2">{gift.icon}</div>
              <p className="text-amber-100 font-bold text-xl mb-1">{gift.name}</p>
              <p className="text-amber-400/70 text-sm">from {sender}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Burst animation for uncommon/rare
  if (gift.animation_type === 'burst') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1],
                rotate: [0, 360],
                opacity: [0, 1, 1]
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl opacity-50 animate-pulse" />
                <div className="relative bg-gradient-to-br from-stone-900 via-blue-900/50 to-purple-900/50 backdrop-blur-lg border-4 border-amber-400 rounded-3xl p-8 text-center shadow-2xl">
                  <div className="text-8xl mb-3 animate-bounce">{gift.icon}</div>
                  <p className="text-amber-100 font-bold text-2xl mb-2">{gift.name}</p>
                  <p className="text-amber-400 text-sm mb-1">from {sender}</p>
                  <div className="flex items-center justify-center gap-1 text-amber-300">
                    <span className="text-2xl">🪙</span>
                    <span className="font-bold text-xl">{gift.cost_as}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Particle effects */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{ 
                  scale: [0, 1, 0],
                  x: Math.cos(i * 45 * Math.PI / 180) * 200,
                  y: Math.sin(i * 45 * Math.PI / 180) * 200
                }}
                transition={{ duration: 1, delay: 0.2 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40"
              >
                <div className="w-4 h-4 bg-amber-400 rounded-full" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    );
  }

  // Fullscreen animation for epic gifts
  if (gift.animation_type === 'fullscreen') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            <motion.div
              initial={{ scale: 0, y: 100, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1],
                y: [100, -20, 0],
                opacity: 1
              }}
              exit={{ scale: 0, y: -100, opacity: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-amber-500 to-rose-500 rounded-full blur-3xl opacity-60 animate-pulse" />
                
                {/* Main card */}
                <div className="relative bg-gradient-to-br from-stone-950 via-purple-950/80 to-stone-950 backdrop-blur-lg border-4 border-amber-400 rounded-3xl p-12 text-center shadow-2xl min-w-[350px]">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-9xl mb-4"
                  >
                    {gift.icon}
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-amber-100 font-bold text-3xl mb-2">{gift.name}</p>
                    <p className="text-amber-400/80 text-lg mb-3">{gift.description}</p>
                    <p className="text-amber-300 font-semibold text-xl mb-2">from {sender}</p>
                    <div className="flex items-center justify-center gap-2 text-amber-200">
                      <span className="text-3xl">🪙</span>
                      <span className="font-bold text-2xl">{gift.cost_as.toLocaleString()}</span>
                    </div>
                  </motion.div>
                </div>

                {/* Orbiting particles */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.5, 1]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      delay: i * 0.1
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      marginLeft: Math.cos(i * 30 * Math.PI / 180) * 180 - 8,
                      marginTop: Math.sin(i * 30 * Math.PI / 180) * 180 - 8
                    }}
                  >
                    <div className="w-4 h-4 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Prestige animation for legendary gifts
  if (gift.animation_type === 'prestige') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Full screen overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-purple-900/40 to-rose-900/40 backdrop-blur-md" />
              
              {/* Animated background rays */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0"
              >
                {[...Array(16)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '2px',
                      height: '40%',
                      background: 'linear-gradient(to bottom, transparent, rgba(251, 191, 36, 0.3), transparent)',
                      transformOrigin: 'top',
                      transform: `rotate(${i * 22.5}deg)`
                    }}
                  />
                ))}
              </motion.div>

              {/* Main content */}
              <div className="relative h-full flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ 
                    scale: [0, 1.3, 1],
                    rotate: [0, 360]
                  }}
                  transition={{ duration: 1.2, type: "spring" }}
                  className="relative"
                >
                  {/* Multiple glow layers */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 rounded-full blur-3xl opacity-70 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-rose-400 rounded-full blur-2xl opacity-50" />
                  
                  {/* Main card */}
                  <div className="relative bg-gradient-to-br from-stone-950 via-amber-950/80 to-stone-950 backdrop-blur-xl border-4 border-amber-300 rounded-3xl p-16 text-center shadow-2xl min-w-[400px]">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="text-[120px] mb-6"
                    >
                      {gift.icon}
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400" />
                        <span className="text-amber-400 text-sm font-bold tracking-widest">LEGENDARY</span>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400" />
                      </div>
                      
                      <p className="text-amber-100 font-bold text-4xl mb-3">{gift.name}</p>
                      <p className="text-amber-300/90 text-xl mb-4 max-w-sm">{gift.description}</p>
                      <p className="text-amber-200 font-semibold text-2xl mb-4">from {sender}</p>
                      
                      <div className="flex items-center justify-center gap-3 bg-amber-600/20 rounded-full py-3 px-6 border border-amber-500/30">
                        <span className="text-5xl">🪙</span>
                        <span className="font-bold text-4xl text-amber-100">{gift.cost_as.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Orbiting elements */}
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        rotate: [0, 360],
                        scale: [1, 1.3, 1]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "linear"
                      }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginLeft: Math.cos(i * 18 * Math.PI / 180) * 220 - 10,
                        marginTop: Math.sin(i * 18 * Math.PI / 180) * 220 - 10
                      }}
                    >
                      <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-rose-500 rounded-full shadow-lg shadow-amber-500/50" />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return null;
}