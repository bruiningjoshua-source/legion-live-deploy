import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animated overlay effects that render on top of video
const ANIMATED_EFFECTS = {
  hearts: {
    particles: ['❤️', '💕', '💖', '💗', '💓', '💞'],
    count: 12,
    speed: 3,
    size: [20, 40],
    opacity: [0.6, 1]
  },
  stars: {
    particles: ['⭐', '✨', '🌟', '💫', '⭐'],
    count: 15,
    speed: 2.5,
    size: [15, 35],
    opacity: [0.5, 1]
  },
  sparkle: {
    particles: ['✨', '💎', '✨', '⭐', '💫'],
    count: 20,
    speed: 2,
    size: [12, 28],
    opacity: [0.4, 0.9]
  },
  fire: {
    particles: ['🔥', '🔥', '🔥', '💥', '⚡'],
    count: 10,
    speed: 4,
    size: [25, 45],
    opacity: [0.7, 1]
  },
  butterfly: {
    particles: ['🦋', '🦋', '🦋', '🌸', '🌺'],
    count: 8,
    speed: 2,
    size: [25, 40],
    opacity: [0.6, 0.95]
  },
  snow: {
    particles: ['❄️', '❄️', '❄️', '✨', '💎'],
    count: 25,
    speed: 1.5,
    size: [15, 30],
    opacity: [0.4, 0.8]
  },
  confetti: {
    particles: ['🎉', '🎊', '✨', '🎈', '🎁'],
    count: 18,
    speed: 3.5,
    size: [20, 35],
    opacity: [0.7, 1]
  },
  bubbles: {
    particles: ['🫧', '💭', '○', '◯', '⚪'],
    count: 15,
    speed: 1.8,
    size: [20, 45],
    opacity: [0.3, 0.7]
  },
  leaves: {
    particles: ['🍃', '🍂', '🍁', '🌿', '🌱'],
    count: 12,
    speed: 2,
    size: [20, 35],
    opacity: [0.5, 0.9]
  },
  money: {
    particles: ['💰', '💵', '💸', '🤑', '💲'],
    count: 10,
    speed: 3,
    size: [25, 40],
    opacity: [0.6, 1]
  },
  magic: {
    particles: ['🪄', '✨', '⭐', '💜', '🔮'],
    count: 15,
    speed: 2.5,
    size: [18, 32],
    opacity: [0.5, 0.95]
  },
  love: {
    particles: ['💕', '💘', '💝', '💗', '😍'],
    count: 12,
    speed: 2.2,
    size: [22, 38],
    opacity: [0.6, 1]
  }
};

// Static overlays (crown, angel halo, etc.)
const STATIC_OVERLAYS = {
  crown: {
    emoji: '👑',
    position: { top: '5%', left: '50%', transform: 'translateX(-50%)' },
    size: 60,
    animation: { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity } }
  },
  angel: {
    emoji: '😇',
    position: { top: '2%', left: '50%', transform: 'translateX(-50%)' },
    size: 50,
    children: [
      { emoji: '✨', offset: { x: -40, y: 10 }, size: 20 },
      { emoji: '✨', offset: { x: 40, y: 10 }, size: 20 }
    ],
    animation: { y: [0, -8, 0], transition: { duration: 3, repeat: Infinity } }
  },
  devil: {
    emoji: '😈',
    position: { top: '3%', left: '50%', transform: 'translateX(-50%)' },
    size: 45,
    children: [
      { emoji: '🔥', offset: { x: -30, y: 20 }, size: 25 },
      { emoji: '🔥', offset: { x: 30, y: 20 }, size: 25 }
    ],
    animation: { scale: [1, 1.1, 1], transition: { duration: 1.5, repeat: Infinity } }
  },
  glasses: {
    emoji: '🕶️',
    position: { top: '25%', left: '50%', transform: 'translateX(-50%)' },
    size: 80,
    animation: { rotate: [-2, 2, -2], transition: { duration: 2, repeat: Infinity } }
  },
  cat: {
    emoji: '😺',
    position: { top: '8%', left: '50%', transform: 'translateX(-50%)' },
    size: 55,
    children: [
      { emoji: '🐾', offset: { x: -50, y: 80 }, size: 20 },
      { emoji: '🐾', offset: { x: 50, y: 80 }, size: 20 }
    ],
    animation: { rotate: [-5, 5, -5], transition: { duration: 1.5, repeat: Infinity } }
  },
  bunny: {
    emoji: '🐰',
    position: { top: '5%', left: '50%', transform: 'translateX(-50%)' },
    size: 50,
    animation: { y: [0, -10, 0], transition: { duration: 0.8, repeat: Infinity } }
  },
  flower: {
    emoji: '🌸',
    position: { top: '8%', left: '50%', transform: 'translateX(-50%)' },
    size: 45,
    children: [
      { emoji: '🌺', offset: { x: -35, y: 5 }, size: 30 },
      { emoji: '🌺', offset: { x: 35, y: 5 }, size: 30 }
    ],
    animation: { rotate: [0, 360], transition: { duration: 20, repeat: Infinity, ease: 'linear' } }
  },
  vip: {
    emoji: '👑',
    position: { top: '3%', left: '50%', transform: 'translateX(-50%)' },
    size: 55,
    children: [
      { emoji: '💎', offset: { x: -40, y: 25 }, size: 22 },
      { emoji: '💎', offset: { x: 40, y: 25 }, size: 22 },
      { emoji: '✨', offset: { x: 0, y: 40 }, size: 18 }
    ],
    animation: { 
      scale: [1, 1.05, 1],
      filter: ['drop-shadow(0 0 10px gold)', 'drop-shadow(0 0 20px gold)', 'drop-shadow(0 0 10px gold)'],
      transition: { duration: 2, repeat: Infinity }
    }
  }
};

// Screen edge effects
const EDGE_EFFECTS = {
  vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)',
  glow_gold: 'radial-gradient(ellipse at center, transparent 60%, rgba(255,200,50,0.3) 100%)',
  glow_pink: 'radial-gradient(ellipse at center, transparent 60%, rgba(255,100,150,0.3) 100%)',
  glow_blue: 'radial-gradient(ellipse at center, transparent 60%, rgba(100,150,255,0.3) 100%)',
  dreamy: 'radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,200,255,0.2) 100%)',
  cinematic: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.5) 100%)',
  spotlight: 'radial-gradient(circle at 50% 30%, transparent 20%, rgba(0,0,0,0.6) 80%)'
};

function FallingParticle({ particle, config, index }) {
  const startX = Math.random() * 100;
  const startDelay = Math.random() * 2;
  const size = config.size[0] + Math.random() * (config.size[1] - config.size[0]);
  const opacity = config.opacity[0] + Math.random() * (config.opacity[1] - config.opacity[0]);
  const duration = (6 + Math.random() * 4) / config.speed;
  const swayAmount = 20 + Math.random() * 30;

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${startX}%`,
        top: '-10%',
        fontSize: size,
        opacity,
        zIndex: 50
      }}
      initial={{ y: 0, x: 0, rotate: 0 }}
      animate={{
        y: ['0vh', '120vh'],
        x: [0, swayAmount, -swayAmount, swayAmount, 0],
        rotate: [0, 360]
      }}
      transition={{
        y: { duration, repeat: Infinity, delay: startDelay, ease: 'linear' },
        x: { duration: duration * 0.5, repeat: Infinity, delay: startDelay, ease: 'easeInOut' },
        rotate: { duration: duration * 2, repeat: Infinity, delay: startDelay, ease: 'linear' }
      }}
    >
      {particle}
    </motion.div>
  );
}

function RisingParticle({ particle, config, index }) {
  const startX = Math.random() * 100;
  const startDelay = Math.random() * 2;
  const size = config.size[0] + Math.random() * (config.size[1] - config.size[0]);
  const opacity = config.opacity[0] + Math.random() * (config.opacity[1] - config.opacity[0]);
  const duration = (5 + Math.random() * 3) / config.speed;

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{
        left: `${startX}%`,
        bottom: '-10%',
        fontSize: size,
        zIndex: 50
      }}
      initial={{ y: 0, opacity: 0, scale: 0.5 }}
      animate={{
        y: [0, -window.innerHeight * 1.2],
        opacity: [0, opacity, opacity, 0],
        scale: [0.5, 1, 1, 0.8]
      }}
      transition={{
        duration,
        repeat: Infinity,
        delay: startDelay,
        ease: 'easeOut'
      }}
    >
      {particle}
    </motion.div>
  );
}

export default function AnimatedFilterOverlay({ 
  activeEffect, 
  staticOverlay,
  edgeEffect,
  intensity = 1 
}) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (activeEffect && ANIMATED_EFFECTS[activeEffect]) {
      const config = ANIMATED_EFFECTS[activeEffect];
      const count = Math.floor(config.count * intensity);
      const newParticles = [];
      
      for (let i = 0; i < count; i++) {
        const particle = config.particles[Math.floor(Math.random() * config.particles.length)];
        newParticles.push({ id: i, emoji: particle });
      }
      
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [activeEffect, intensity]);

  const config = activeEffect ? ANIMATED_EFFECTS[activeEffect] : null;
  const staticConfig = staticOverlay ? STATIC_OVERLAYS[staticOverlay] : null;
  const risingEffects = ['fire', 'bubbles', 'magic'];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 40 }}>
      {/* Edge effect overlay */}
      {edgeEffect && EDGE_EFFECTS[edgeEffect] && (
        <div 
          className="absolute inset-0"
          style={{ background: EDGE_EFFECTS[edgeEffect] }}
        />
      )}

      {/* Animated particles */}
      <AnimatePresence>
        {config && particles.map((p, i) => (
          risingEffects.includes(activeEffect) ? (
            <RisingParticle 
              key={`${activeEffect}-${p.id}`}
              particle={p.emoji}
              config={config}
              index={i}
            />
          ) : (
            <FallingParticle
              key={`${activeEffect}-${p.id}`}
              particle={p.emoji}
              config={config}
              index={i}
            />
          )
        ))}
      </AnimatePresence>

      {/* Static overlay (crown, angel, etc.) */}
      {staticConfig && (
        <motion.div
          className="absolute pointer-events-none"
          style={{
            ...staticConfig.position,
            fontSize: staticConfig.size,
            zIndex: 55
          }}
          animate={staticConfig.animation}
        >
          {staticConfig.emoji}
          {staticConfig.children?.map((child, i) => (
            <motion.span
              key={i}
              className="absolute"
              style={{
                fontSize: child.size,
                left: '50%',
                top: '50%',
                transform: `translate(${child.offset.x - child.size/2}px, ${child.offset.y - child.size/2}px)`
              }}
              animate={{ 
                opacity: [0.6, 1, 0.6],
                scale: [0.9, 1.1, 0.9]
              }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            >
              {child.emoji}
            </motion.span>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export { ANIMATED_EFFECTS, STATIC_OVERLAYS, EDGE_EFFECTS };