import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// Bigo-style animated gift visuals with rich details
const GIFT_VISUALS = {
  // Hearts & Love
  heart: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b9d"/>
          <stop offset="50%" stopColor="#ff1744"/>
          <stop offset="100%" stopColor="#d50000"/>
        </linearGradient>
        <filter id="heartGlow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M50 88 C20 60 5 35 20 20 C35 5 50 15 50 30 C50 15 65 5 80 20 C95 35 80 60 50 88Z" 
        fill="url(#heartGrad)" filter="url(#heartGlow)" stroke="#ff8a80" strokeWidth="2"/>
      <path d="M35 30 Q40 25 45 32" fill="none" stroke="white" strokeWidth="3" opacity="0.6"/>
    </svg>
  ),
  
  // Rose
  rose: (
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4081"/>
          <stop offset="100%" stopColor="#c51162"/>
        </linearGradient>
      </defs>
      <path d="M50 70 L45 115 M50 70 L55 115" stroke="#2e7d32" strokeWidth="4" fill="none"/>
      <ellipse cx="35" cy="95" rx="12" ry="6" fill="#43a047"/>
      <ellipse cx="65" cy="100" rx="12" ry="6" fill="#43a047"/>
      <circle cx="50" cy="45" r="25" fill="url(#roseGrad)"/>
      <path d="M50 25 Q35 35 40 50 Q45 40 50 45 Q55 40 60 50 Q65 35 50 25" fill="#ff80ab"/>
      <path d="M35 40 Q40 50 50 45 Q60 50 65 40" fill="none" stroke="#c51162" strokeWidth="2"/>
    </svg>
  ),

  // Diamond
  diamond: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e3f2fd"/>
          <stop offset="30%" stopColor="#64b5f6"/>
          <stop offset="70%" stopColor="#1976d2"/>
          <stop offset="100%" stopColor="#0d47a1"/>
        </linearGradient>
        <filter id="diamondGlow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <polygon points="50,5 85,35 50,95 15,35" fill="url(#diamondGrad)" filter="url(#diamondGlow)" stroke="#bbdefb" strokeWidth="2"/>
      <polygon points="50,5 35,35 50,95 65,35" fill="#42a5f5" opacity="0.5"/>
      <line x1="15" y1="35" x2="85" y2="35" stroke="#bbdefb" strokeWidth="1"/>
      <line x1="35" y1="35" x2="50" y2="5" stroke="#e3f2fd" strokeWidth="1"/>
      <line x1="65" y1="35" x2="50" y2="5" stroke="#e3f2fd" strokeWidth="1"/>
    </svg>
  ),

  // Crown
  crown: (
    <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd54f"/>
          <stop offset="50%" stopColor="#ffb300"/>
          <stop offset="100%" stopColor="#ff8f00"/>
        </linearGradient>
      </defs>
      <path d="M15 75 L15 40 L35 55 L60 25 L85 55 L105 40 L105 75 Z" fill="url(#crownGrad)" stroke="#ff6f00" strokeWidth="3"/>
      <circle cx="15" cy="38" r="6" fill="#e53935"/>
      <circle cx="60" cy="22" r="8" fill="#e53935"/>
      <circle cx="105" cy="38" r="6" fill="#e53935"/>
      <rect x="15" y="75" width="90" height="15" rx="3" fill="#ffb300" stroke="#ff6f00" strokeWidth="2"/>
      <circle cx="35" cy="82" r="4" fill="#e53935"/>
      <circle cx="60" cy="82" r="4" fill="#1e88e5"/>
      <circle cx="85" cy="82" r="4" fill="#43a047"/>
    </svg>
  ),

  // Sports Car
  sportscar: (
    <svg viewBox="0 0 140 80" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff1744"/>
          <stop offset="100%" stopColor="#b71c1c"/>
        </linearGradient>
      </defs>
      <path d="M20 50 L30 35 L50 30 L90 30 L110 40 L125 45 L125 55 L20 55 Z" fill="url(#carGrad)" stroke="#7f0000" strokeWidth="2"/>
      <rect x="45" y="32" width="25" height="15" rx="2" fill="#1a237e" opacity="0.8"/>
      <rect x="75" y="35" width="20" height="12" rx="2" fill="#1a237e" opacity="0.8"/>
      <circle cx="40" cy="58" r="10" fill="#37474f" stroke="#263238" strokeWidth="3"/>
      <circle cx="40" cy="58" r="5" fill="#78909c"/>
      <circle cx="105" cy="58" r="10" fill="#37474f" stroke="#263238" strokeWidth="3"/>
      <circle cx="105" cy="58" r="5" fill="#78909c"/>
      <rect x="118" y="42" width="8" height="4" fill="#ffeb3b"/>
    </svg>
  ),

  // Private Jet
  jet: (
    <svg viewBox="0 0 140 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="jetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#eceff1"/>
          <stop offset="100%" stopColor="#90a4ae"/>
        </linearGradient>
      </defs>
      <ellipse cx="70" cy="50" rx="55" ry="15" fill="url(#jetGrad)" stroke="#607d8b" strokeWidth="2"/>
      <polygon points="125,50 140,40 140,60" fill="#eceff1" stroke="#607d8b" strokeWidth="2"/>
      <polygon points="50,50 70,20 90,50" fill="#cfd8dc" stroke="#607d8b" strokeWidth="2"/>
      <polygon points="15,50 5,35 25,50" fill="#cfd8dc" stroke="#607d8b" strokeWidth="2"/>
      <polygon points="15,50 5,65 25,50" fill="#cfd8dc" stroke="#607d8b" strokeWidth="2"/>
      <ellipse cx="90" cy="47" rx="8" ry="5" fill="#1a237e" opacity="0.7"/>
      <ellipse cx="75" cy="47" rx="8" ry="5" fill="#1a237e" opacity="0.7"/>
      <ellipse cx="60" cy="47" rx="8" ry="5" fill="#1a237e" opacity="0.7"/>
    </svg>
  ),

  // Yacht
  yacht: (
    <svg viewBox="0 0 140 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="yachtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#eceff1"/>
          <stop offset="100%" stopColor="#78909c"/>
        </linearGradient>
        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0277bd"/>
          <stop offset="50%" stopColor="#0288d1"/>
          <stop offset="100%" stopColor="#0277bd"/>
        </linearGradient>
      </defs>
      <path d="M10 70 Q70 85 130 70 L125 55 L15 55 Z" fill="url(#yachtGrad)" stroke="#546e7a" strokeWidth="2"/>
      <rect x="30" y="35" width="60" height="20" fill="url(#yachtGrad)" stroke="#546e7a" strokeWidth="2"/>
      <rect x="45" y="20" width="30" height="15" fill="url(#yachtGrad)" stroke="#546e7a" strokeWidth="2"/>
      <rect x="55" y="40" width="8" height="10" fill="#1a237e" opacity="0.7"/>
      <rect x="70" y="40" width="8" height="10" fill="#1a237e" opacity="0.7"/>
      <path d="M0 75 Q35 70 70 75 Q105 80 140 75 L140 100 L0 100 Z" fill="url(#waterGrad)" opacity="0.6"/>
    </svg>
  ),

  // Castle
  castle: (
    <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="castleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8d6e63"/>
          <stop offset="100%" stopColor="#5d4037"/>
        </linearGradient>
      </defs>
      <rect x="25" y="40" width="70" height="55" fill="url(#castleGrad)" stroke="#3e2723" strokeWidth="2"/>
      <rect x="5" y="30" width="25" height="65" fill="url(#castleGrad)" stroke="#3e2723" strokeWidth="2"/>
      <rect x="90" y="30" width="25" height="65" fill="url(#castleGrad)" stroke="#3e2723" strokeWidth="2"/>
      <path d="M5 30 L5 20 L12 20 L12 30 L19 30 L19 20 L26 20 L26 30 L30 30" fill="#8d6e63" stroke="#3e2723" strokeWidth="2"/>
      <path d="M90 30 L90 20 L97 20 L97 30 L104 30 L104 20 L111 20 L111 30 L115 30" fill="#8d6e63" stroke="#3e2723" strokeWidth="2"/>
      <rect x="50" y="60" width="20" height="35" rx="10" fill="#3e2723"/>
      <circle cx="60" cy="10" r="8" fill="#ffd54f"/>
    </svg>
  ),

  // Phoenix
  phoenix: (
    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="phoenixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff9800"/>
          <stop offset="50%" stopColor="#f44336"/>
          <stop offset="100%" stopColor="#b71c1c"/>
        </linearGradient>
        <filter id="fire">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path d="M60 50 Q20 20 10 60 Q30 50 35 65 Q25 40 60 50" fill="url(#phoenixGrad)" filter="url(#fire)"/>
      <path d="M60 50 Q100 20 110 60 Q90 50 85 65 Q95 40 60 50" fill="url(#phoenixGrad)" filter="url(#fire)"/>
      <ellipse cx="60" cy="65" rx="20" ry="25" fill="url(#phoenixGrad)"/>
      <circle cx="60" cy="40" r="12" fill="url(#phoenixGrad)"/>
      <path d="M55 30 Q50 15 55 28 M60 28 Q60 10 60 26 M65 30 Q70 15 65 28" stroke="#ffd54f" strokeWidth="3" fill="none"/>
      <circle cx="55" cy="38" r="3" fill="#fff59d"/>
      <circle cx="65" cy="38" r="3" fill="#fff59d"/>
      <path d="M50 85 Q40 110 35 115 M60 90 Q60 115 60 120 M70 85 Q80 110 85 115" stroke="#ff5722" strokeWidth="4" fill="none" filter="url(#fire)"/>
    </svg>
  ),

  // Dragon
  dragon: (
    <svg viewBox="0 0 140 120" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="dragonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c4dff"/>
          <stop offset="50%" stopColor="#651fff"/>
          <stop offset="100%" stopColor="#4a148c"/>
        </linearGradient>
      </defs>
      <path d="M80 50 Q40 20 20 60 Q50 45 55 70 Q35 40 80 50" fill="url(#dragonGrad)"/>
      <ellipse cx="90" cy="65" rx="30" ry="25" fill="url(#dragonGrad)"/>
      <path d="M115 55 L130 45 L125 60 L135 65 L120 70" fill="url(#dragonGrad)"/>
      <circle cx="125" cy="58" r="4" fill="#ff5252"/>
      <polygon points="115,50 110,35 120,45" fill="#7c4dff"/>
      <polygon points="125,48 125,30 132,42" fill="#7c4dff"/>
      <path d="M60 85 Q50 100 55 110" stroke="#4a148c" strokeWidth="8" fill="none"/>
      <polygon points="55,110 45,115 50,105 40,100 55,105" fill="#7c4dff"/>
    </svg>
  ),

  // Unicorn
  unicorn: (
    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="unicornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8bbd9"/>
          <stop offset="50%" stopColor="#e1bee7"/>
          <stop offset="100%" stopColor="#ce93d8"/>
        </linearGradient>
        <linearGradient id="hornGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ffd54f"/>
          <stop offset="100%" stopColor="#ffecb3"/>
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="70" rx="35" ry="25" fill="url(#unicornGrad)"/>
      <circle cx="85" cy="50" r="18" fill="url(#unicornGrad)"/>
      <polygon points="85,32 80,5 90,32" fill="url(#hornGrad)" stroke="#ffc107" strokeWidth="1"/>
      <path d="M75,35 Q65,25 70,40" fill="#ba68c8" stroke="#9c27b0" strokeWidth="2"/>
      <circle cx="90" cy="45" r="4" fill="#1a237e"/>
      <circle cx="91" cy="44" r="1.5" fill="white"/>
      <path d="M25 70 Q15 65 20 80 Q25 75 30 85" stroke="#e91e63" strokeWidth="4" fill="none"/>
      <path d="M30 90 Q25 100 30 110" stroke="#9c27b0" strokeWidth="6" fill="none"/>
    </svg>
  ),

  // Galaxy/Universe
  galaxy: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <radialGradient id="galaxyGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e1bee7"/>
          <stop offset="30%" stopColor="#7c4dff"/>
          <stop offset="70%" stopColor="#311b92"/>
          <stop offset="100%" stopColor="#000051"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#galaxyGrad)"/>
      <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="#b388ff" strokeWidth="2" opacity="0.6" transform="rotate(-30 50 50)"/>
      <ellipse cx="50" cy="50" rx="35" ry="12" fill="none" stroke="#ea80fc" strokeWidth="1.5" opacity="0.5" transform="rotate(20 50 50)"/>
      <circle cx="50" cy="50" r="8" fill="#fff59d"/>
      <circle cx="30" cy="30" r="2" fill="white"/>
      <circle cx="70" cy="25" r="1.5" fill="white"/>
      <circle cx="75" cy="70" r="2" fill="white"/>
      <circle cx="25" cy="65" r="1.5" fill="white"/>
      <circle cx="60" cy="80" r="1" fill="white"/>
    </svg>
  ),

  // Default coin
  coin: (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd54f"/>
          <stop offset="50%" stopColor="#ffb300"/>
          <stop offset="100%" stopColor="#ff8f00"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="url(#coinGrad)" stroke="#e65100" strokeWidth="4"/>
      <circle cx="50" cy="50" r="35" fill="none" stroke="#ff6f00" strokeWidth="2"/>
      <text x="50" y="58" textAnchor="middle" fill="#e65100" fontSize="24" fontWeight="bold">🪙</text>
    </svg>
  )
};

const getGiftVisual = (gift) => {
  const name = (gift.name || '').toLowerCase();
  const category = (gift.category || '').toLowerCase();
  
  if (name.includes('heart') || name.includes('love')) return 'heart';
  if (name.includes('rose') || name.includes('flower')) return 'rose';
  if (name.includes('diamond') || name.includes('gem')) return 'diamond';
  if (name.includes('crown') || name.includes('royal')) return 'crown';
  if (name.includes('car') || name.includes('ferrari') || name.includes('lambo')) return 'sportscar';
  if (name.includes('jet') || name.includes('plane') || name.includes('flight')) return 'jet';
  if (name.includes('yacht') || name.includes('boat') || name.includes('ship')) return 'yacht';
  if (name.includes('castle') || name.includes('palace') || name.includes('mansion')) return 'castle';
  if (name.includes('phoenix') || name.includes('fire')) return 'phoenix';
  if (name.includes('dragon')) return 'dragon';
  if (name.includes('unicorn')) return 'unicorn';
  if (name.includes('galaxy') || name.includes('universe') || name.includes('cosmic')) return 'galaxy';
  
  if (category === 'love') return 'heart';
  if (category === 'luxury') return 'diamond';
  if (category === 'mythical') return 'dragon';
  if (category === 'prestige') return 'crown';
  if (category === 'divine') return 'phoenix';
  
  return 'coin';
};

export default function GiftAnimation({ gift, sender, quantity = 1, onComplete }) {
  const [isVisible, setIsVisible] = useState(true);
  const visualKey = getGiftVisual(gift);
  const Visual = GIFT_VISUALS[visualKey];

  useEffect(() => {
    const isHighTier = ['legendary', 'prestige', 'divine'].includes(gift.tier);
    const isMega = gift.animation_type === 'mega' || gift.screen_takeover;
    
    const duration = isMega ? 6000 :
                     gift.animation_type === 'prestige' ? 5000 : 
                     gift.animation_type === 'fullscreen' ? 4000 : 
                     gift.animation_type === 'burst' ? 2500 : 2000;

    // Enhanced confetti for high-value gifts
    if (isMega || gift.tier === 'divine') {
      const end = Date.now() + 3000;
      const colors = ['#ffd700', '#ff1744', '#7c4dff', '#00e676', '#ff9100'];
      (function frame() {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      }());
    } else if (isHighTier) {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.4 },
        colors: ['#ffd700', '#ff6b6b', '#7c4dff', '#00e676']
      });
    } else if (gift.tier === 'epic' || gift.tier === 'rare') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#ffd700', '#ff9100']
      });
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [gift, onComplete]);

  // Mega/Divine - Ultimate fullscreen takeover
  if (gift.animation_type === 'mega' || gift.screen_takeover || gift.tier === 'divine') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] overflow-hidden"
          >
            {/* Dramatic animated background */}
            <motion.div 
              className="absolute inset-0"
              animate={{ 
                background: [
                  'radial-gradient(circle at 30% 30%, #7c4dff 0%, #000 50%, #ff1744 100%)',
                  'radial-gradient(circle at 70% 70%, #ff1744 0%, #000 50%, #ffd700 100%)',
                  'radial-gradient(circle at 30% 70%, #ffd700 0%, #000 50%, #7c4dff 100%)',
                ]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            
            {/* Rotating light rays */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {[...Array(32)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute h-full w-2"
                  style={{ 
                    transform: `rotate(${i * 11.25}deg)`,
                    background: `linear-gradient(to top, transparent, ${i % 2 === 0 ? '#ffd700' : '#ff1744'}40, transparent)`
                  }}
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                />
              ))}
            </motion.div>

            {/* Main content */}
            <div className="relative h-full flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -360 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 80, delay: 0.3 }}
                className="relative"
              >
                {/* Multiple pulsing glow layers */}
                <motion.div 
                  className="absolute -inset-32 rounded-full"
                  style={{ background: 'radial-gradient(circle, #ffd70080 0%, transparent 70%)' }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div 
                  className="absolute -inset-24 rounded-full"
                  style={{ background: 'radial-gradient(circle, #ff174480 0%, transparent 70%)' }}
                  animate={{ scale: [1.1, 1.4, 1.1], opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                
                <div className="relative bg-black/80 backdrop-blur-xl border-4 border-yellow-400 rounded-3xl p-20 text-center shadow-2xl min-w-[500px]">
                  <motion.div
                    animate={{ 
                      rotateY: [0, 360],
                      scale: [1, 1.15, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-56 h-56 mx-auto mb-10"
                  >
                    {Visual}
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <motion.div 
                      className="flex items-center justify-center gap-4 mb-6"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <span className="text-4xl">✨</span>
                      <span className="text-yellow-400 text-xl font-black tracking-[0.4em] uppercase">
                        {gift.tier === 'divine' ? 'DIVINE GIFT' : 'MEGA GIFT'}
                      </span>
                      <span className="text-4xl">✨</span>
                    </motion.div>
                    
                    <p className="text-white font-black text-5xl mb-4 drop-shadow-lg">{gift.name}</p>
                    {quantity > 1 && <p className="text-yellow-400 text-3xl font-bold mb-4">x{quantity}</p>}
                    <p className="text-yellow-200/90 text-2xl mb-6 max-w-lg mx-auto">{gift.description}</p>
                    <p className="text-white font-bold text-3xl mb-8">from <span className="text-yellow-400">{sender}</span></p>
                    
                    <motion.div 
                      className="inline-flex items-center gap-4 bg-gradient-to-r from-yellow-600/40 via-orange-600/40 to-red-600/40 rounded-full py-5 px-12 border-2 border-yellow-400/60"
                      animate={{ boxShadow: ['0 0 30px #ffd70060', '0 0 60px #ffd70090', '0 0 30px #ffd70060'] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-5xl">🪙</span>
                      <span className="font-black text-4xl text-white">{(gift.cost_denarii * quantity).toLocaleString()}</span>
                    </motion.div>
                  </motion.div>
                </div>

                {/* Orbiting particles */}
                {[...Array(4)].map((_, ring) => (
                  <motion.div
                    key={ring}
                    animate={{ rotate: ring % 2 === 0 ? 360 : -360 }}
                    transition={{ duration: 8 + ring * 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    {[...Array(10)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-5 h-5 rounded-full"
                        style={{
                          left: '50%',
                          top: '50%',
                          marginLeft: Math.cos(i * 36 * Math.PI / 180) * (300 + ring * 50) - 10,
                          marginTop: Math.sin(i * 36 * Math.PI / 180) * (300 + ring * 50) - 10,
                          background: `linear-gradient(135deg, ${['#ffd700', '#ff1744', '#7c4dff', '#00e676'][ring]} 0%, transparent 100%)`
                        }}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
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

  // Prestige animation
  if (gift.animation_type === 'prestige' || gift.tier === 'prestige') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-900/60 via-black/80 to-purple-900/60 backdrop-blur-md" />
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute h-full w-1 bg-gradient-to-t from-transparent via-pink-500/30 to-transparent"
                  style={{ transform: `rotate(${i * 18}deg)` }}
                />
              ))}
            </motion.div>

            <div className="relative h-full flex items-center justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
                className="relative"
              >
                <div className="absolute -inset-20 bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-pink-500/40 rounded-full blur-3xl animate-pulse" />
                
                <div className="relative bg-black/90 backdrop-blur-xl border-3 border-pink-400 rounded-3xl p-16 text-center shadow-2xl min-w-[420px]">
                  <motion.div
                    animate={{ rotateY: [0, 360], scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-44 h-44 mx-auto mb-8"
                  >
                    {Visual}
                  </motion.div>
                  
                  <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <span className="text-2xl">👑</span>
                      <span className="text-pink-400 text-sm font-black tracking-[0.3em]">PRESTIGE</span>
                      <span className="text-2xl">👑</span>
                    </div>
                    
                    <p className="text-white font-black text-4xl mb-3">{gift.name}</p>
                    {quantity > 1 && <p className="text-pink-400 text-2xl font-bold mb-3">x{quantity}</p>}
                    <p className="text-pink-200 font-semibold text-2xl mb-6">from {sender}</p>
                    
                    <div className="inline-flex items-center gap-3 bg-pink-600/30 rounded-full py-4 px-8 border border-pink-400/50">
                      <span className="text-4xl">🪙</span>
                      <span className="font-black text-3xl text-white">{(gift.cost_denarii * quantity).toLocaleString()}</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Fullscreen animation
  if (gift.animation_type === 'fullscreen' || gift.tier === 'legendary') {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80]" />
            <motion.div
              initial={{ scale: 0, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -100 }}
              transition={{ type: 'spring', stiffness: 150 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80]"
            >
              <div className="relative">
                <div className="absolute -inset-16 bg-gradient-to-r from-amber-500/40 to-orange-500/40 rounded-full blur-3xl animate-pulse" />
                
                <div className="relative bg-black/90 backdrop-blur-xl border-3 border-amber-400 rounded-3xl p-12 text-center shadow-2xl min-w-[360px]">
                  <motion.div
                    animate={{ rotateY: [0, 360], scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-36 h-36 mx-auto mb-6"
                  >
                    {Visual}
                  </motion.div>
                  
                  <p className="text-white font-bold text-3xl mb-2">{gift.name}</p>
                  {quantity > 1 && <p className="text-amber-400 text-xl font-bold mb-2">x{quantity}</p>}
                  <p className="text-amber-300 font-semibold text-xl mb-4">from {sender}</p>
                  <div className="flex items-center justify-center gap-2 bg-amber-600/30 rounded-full py-3 px-6 border border-amber-500/40">
                    <span className="text-3xl">🪙</span>
                    <span className="font-bold text-2xl text-white">{(gift.cost_denarii * quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Burst animation
  if (gift.animation_type === 'burst' || gift.tier === 'epic') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], rotate: 0, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[70]"
          >
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-r from-purple-500/30 to-violet-500/30 rounded-full blur-2xl animate-pulse" />
              
              <div className="relative bg-black/90 backdrop-blur-xl border-2 border-purple-400 rounded-2xl p-8 text-center shadow-2xl">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], rotateY: [0, 360] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-28 h-28 mx-auto mb-4"
                >
                  {Visual}
                </motion.div>
                <p className="text-white font-bold text-2xl mb-1">{gift.name}</p>
                {quantity > 1 && <p className="text-purple-400 font-bold mb-1">x{quantity}</p>}
                <p className="text-purple-300/80 text-sm mb-2">from {sender}</p>
                <div className="flex items-center justify-center gap-1 text-amber-300">
                  <span className="text-xl">🪙</span>
                  <span className="font-bold">{(gift.cost_denarii * quantity).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Simple animation (default)
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: -50 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[60]"
        >
          <div className="bg-black/90 backdrop-blur-xl border-2 border-amber-500/50 rounded-2xl p-6 text-center shadow-2xl">
            <motion.div 
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 mx-auto mb-3"
            >
              {Visual}
            </motion.div>
            <p className="text-white font-bold text-xl">
              {gift.name} {quantity > 1 && <span className="text-amber-400">x{quantity}</span>}
            </p>
            <p className="text-amber-400/70 text-sm">from {sender}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}