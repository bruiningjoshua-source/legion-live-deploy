/**
 * GiftStreakOverlay — BIGO-style gift combo / streak banner.
 * Fires when a viewer sends multiple gifts rapidly.
 * Shows multiplier, combo count, top gifter crown, rank changes.
 * Sits as a fixed overlay on WatchStream.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Crown, TrendingUp } from 'lucide-react';

const COMBO_THRESHOLDS = [
  { min:2,  label:'COMBO',    color:'#f5a623', scale:1.0, glow:'rgba(245,166,35,0.5)' },
  { min:5,  label:'FEVER',    color:'#ef4444', scale:1.1, glow:'rgba(239,68,68,0.6)'  },
  { min:10, label:'FRENZY',   color:'#8b5cf6', scale:1.2, glow:'rgba(139,92,246,0.7)' },
  { min:20, label:'UNSTOPPABLE',color:'#06b6d4',scale:1.3, glow:'rgba(6,182,212,0.8)' },
  { min:50, label:'LEGENDARY',color:'#ffd700', scale:1.4, glow:'rgba(255,215,0,0.9)'  },
];

function getComboStyle(count) {
  let style = COMBO_THRESHOLDS[0];
  for (const t of COMBO_THRESHOLDS) {
    if (count >= t.min) style = t;
  }
  return style;
}

export default function GiftStreakOverlay({ recentGifts = [], leaderboard = [] }) {
  const [activeStreaks, setActiveStreaks] = useState({});  // email → {count, lastTime, senderName}
  const [displayStreaks, setDisplayStreaks] = useState([]); // visible banners
  const timerRef = useRef({});

  useEffect(() => {
    if (!recentGifts.length) return;
    const latest = recentGifts[0];
    if (!latest?.sender_email) return;

    const email = latest.sender_email;
    const name  = latest.sender_name || email.split('@')[0];
    const now   = Date.now();
    const COMBO_WINDOW = 8000; // 8s window for combo

    setActiveStreaks(prev => {
      const existing = prev[email];
      const isCombo  = existing && (now - existing.lastTime) < COMBO_WINDOW;
      const newCount = isCombo ? existing.count + (latest.quantity || 1) : (latest.quantity || 1);

      // Clear existing timer
      if (timerRef.current[email]) clearTimeout(timerRef.current[email]);

      // Set expiry timer
      timerRef.current[email] = setTimeout(() => {
        setActiveStreaks(p => { const n = {...p}; delete n[email]; return n; });
        setDisplayStreaks(d => d.filter(s => s.email !== email));
      }, COMBO_WINDOW);

      const updated = { ...prev, [email]: { count: newCount, lastTime: now, name } };

      // Update display banners
      if (newCount >= 2) {
        setDisplayStreaks(d => {
          const exists = d.find(s => s.email === email);
          if (exists) return d.map(s => s.email === email ? {...s, count: newCount} : s);
          return [...d, { email, name, count: newCount, id: Date.now() }].slice(-3);
        });
      }

      return updated;
    });
  }, [recentGifts]);

  // Top gifter crown
  const topGifter = leaderboard[0];

  return (
    <div className="pointer-events-none">
      {/* Combo banners — bottom left */}
      <div className="absolute bottom-32 left-3 space-y-2 z-30">
        <AnimatePresence>
          {displayStreaks.map(streak => {
            const style = getComboStyle(streak.count);
            return (
              <motion.div key={streak.email}
                initial={{x:-80, opacity:0, scale:0.8}}
                animate={{x:0, opacity:1, scale:style.scale}}
                exit={{x:-80, opacity:0, scale:0.8}}
                transition={{type:'spring', stiffness:500, damping:30}}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl"
                style={{
                  background:`rgba(0,0,0,0.75)`,
                  border:`1.5px solid ${style.color}66`,
                  boxShadow:`0 0 16px ${style.glow}`,
                  backdropFilter:'blur(8px)',
                }}>
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4" style={{color:style.color}} />
                  <span className="font-black text-xl" style={{color:style.color}}>×{streak.count}</span>
                </div>
                <div>
                  <p className="ll-label text-[9px]" style={{color:style.color}}>{style.label}</p>
                  <p className="text-white text-xs font-semibold truncate max-w-[100px]">{streak.name}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Top gifter crown — bottom right */}
      <AnimatePresence>
        {topGifter && (
          <motion.div
            initial={{x:80,opacity:0}} animate={{x:0,opacity:1}} exit={{x:80,opacity:0}}
            className="absolute bottom-32 right-3 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl"
            style={{
              background:'rgba(0,0,0,0.75)',
              border:'1.5px solid rgba(245,166,35,0.5)',
              boxShadow:'0 0 16px rgba(245,166,35,0.3)',
              backdropFilter:'blur(8px)',
            }}>
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <p className="ll-label text-[9px] text-amber-400">TOP GIFTER</p>
              <p className="text-white text-xs font-bold truncate max-w-[80px]">
                {topGifter.name || topGifter.email?.split('@')[0]}
              </p>
            </div>
            <span className="text-amber-400 font-black text-sm">
              {(topGifter.total || 0).toLocaleString()}🪙
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
