import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GiftAnimation({ gift, sender, onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 300);
    }, gift.animation_type === 'prestige' ? 5000 : gift.animation_type === 'fullscreen' ? 3000 : 2000);

    return () => clearTimeout(timer);
  }, []);

  const renderSimple = () => (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.5 }}
      className="fixed bottom-24 right-4 z-50 flex items-center gap-3 bg-gradient-to-r from-stone-900/95 to-stone-800/95 rounded-2xl p-4 border border-amber-500/30 shadow-2xl"
    >
      <div className="text-4xl">{gift.icon}</div>
      <div>
        <p className="text-amber-300 font-semibold">{sender} sent</p>
        <p className="text-white font-bold">{gift.name}</p>
      </div>
    </motion.div>
  );

  const renderBurst = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
    >
      <div className="relative">
        {/* Burst particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: 0, 
              scale: 1,
              x: Math.cos(i * 30 * Math.PI / 180) * 150,
              y: Math.sin(i * 30 * Math.PI / 180) * 150
            }}
            transition={{ duration: 1, delay: 0.1 }}
            className="absolute text-3xl"
          >
            {gift.icon}
          </motion.div>
        ))}
        {/* Center gift */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: [0, 1.5, 1], rotate: 0 }}
          transition={{ duration: 0.5 }}
          className="text-7xl"
        >
          {gift.icon}
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
        >
          <span className="text-amber-300 font-semibold">{sender}</span>
          <span className="text-white font-bold ml-2">{gift.name}</span>
        </motion.p>
      </div>
    </motion.div>
  );

  const renderFullscreen = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/40 to-stone-900/60" />
      
      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0,
            y: window.innerHeight + 50,
            x: Math.random() * window.innerWidth
          }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: -100,
            rotate: 360
          }}
          transition={{ 
            duration: 3,
            delay: i * 0.1,
            ease: "easeOut"
          }}
          className="absolute text-4xl"
        >
          {gift.icon}
        </motion.div>
      ))}

      {/* Main gift display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: [0, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="text-9xl mb-4">{gift.icon}</div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-2xl text-amber-300">{sender} unleashes</p>
            <p className="text-4xl font-bold text-white mt-2">{gift.name}!</p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderPrestige = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Epic background */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gradient-to-b from-rose-900/70 via-amber-900/50 to-stone-900/80"
      />
      
      {/* Lightning effects */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ 
            duration: 0.3,
            delay: 0.5 + i * 0.2,
            repeat: 2
          }}
          className="absolute inset-0 bg-white/10"
        />
      ))}

      {/* Swirling particles */}
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            opacity: 0,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            scale: 0
          }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            x: window.innerWidth / 2 + Math.cos(i * 12 * Math.PI / 180) * (200 + i * 10),
            y: window.innerHeight / 2 + Math.sin(i * 12 * Math.PI / 180) * (200 + i * 10),
            scale: [0, 1.5, 1],
            rotate: 720
          }}
          transition={{ 
            duration: 3,
            delay: i * 0.05,
            ease: "easeOut"
          }}
          className="absolute text-4xl"
        >
          {['✨', '⭐', '💫', '🌟'][i % 4]}
        </motion.div>
      ))}

      {/* Main gift display */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center"
        >
          {/* Glowing ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-20 border-4 border-amber-400/30 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-32 border-2 border-rose-400/20 rounded-full"
          />
          
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[150px] drop-shadow-2xl"
          >
            {gift.icon}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-6"
          >
            <p className="text-3xl text-amber-300 font-light">{sender} summons the legendary</p>
            <motion.p 
              className="text-5xl font-bold mt-3"
              animate={{ color: ['#fcd34d', '#f97316', '#f43f5e', '#fcd34d'] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {gift.name}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {show && (
        <>
          {gift.animation_type === 'simple' && renderSimple()}
          {gift.animation_type === 'burst' && renderBurst()}
          {gift.animation_type === 'fullscreen' && renderFullscreen()}
          {gift.animation_type === 'prestige' && renderPrestige()}
        </>
      )}
    </AnimatePresence>
  );
}