/**
 * GestureHUD — Floating overlay showing active gestures, detected hands,
 * and currently triggered effects. Minimal obstruction to stream view.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GestureRecognizer from './GestureRecognizer';

const GESTURE_LABELS = {
  fist: '✊', peace: '✌️', pointing: '👆', open_hand: '🖐', thumbs_up: '👍',
  thumbs_down: '👎', finger_heart: '🫰', rock: '🤘', ok_sign: '👌', pinch: '🤏',
  swipe_left: '👈', swipe_right: '👉', swipe_up: '☝️', swipe_down: '👇',
  circle_motion: '🔄', two_hand_open: '🙌', two_hand_heart: '💕', double_point: '👆👆',
  palm_push: '🤚', claw: '🦀',
  smile: '😊', blink_left: '😉', blink_right: '😉', mouth_open: '😮',
  raised_eyebrows: '😯', kiss: '😘', angry_brow: '😠', wink: '😜',
  head_nod: '🙂', head_shake: '🙅',
};

export default function GestureHUD({ enabled }) {
  const [activeGestures, setActiveGestures] = useState([]);
  const [lastEffect, setLastEffect] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    const unsub = GestureRecognizer.onGesture((event) => {
      setActiveGestures(prev => {
        const next = [...prev.filter(g => g.gesture !== event.gesture), event];
        return next.slice(-3); // show max 3
      });
      if (event.mappedEffect) {
        setLastEffect({ effect: event.mappedEffect, time: Date.now() });
      }
    });

    // Clear stale gestures
    const interval = setInterval(() => {
      setActiveGestures(prev => prev.filter(g => Date.now() - (g._time || 0) < 1500));
    }, 500);

    return () => { unsub(); clearInterval(interval); };
  }, [enabled]);

  if (!enabled || activeGestures.length === 0) return null;

  return (
    <div className="absolute top-20 right-3 z-30 flex flex-col items-end gap-1 pointer-events-none">
      <AnimatePresence>
        {activeGestures.map((g, i) => (
          <motion.div
            key={g.gesture + i}
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10"
          >
            <span className="text-sm">{GESTURE_LABELS[g.gesture] || '✋'}</span>
            {g.mappedEffect && (
              <span className="text-[9px] text-purple-300 font-semibold">→ {g.mappedEffect}</span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Last triggered effect */}
      <AnimatePresence>
        {lastEffect && Date.now() - lastEffect.time < 2000 && (
          <motion.div
            key={lastEffect.effect + lastEffect.time}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="mt-1 bg-purple-500/20 border border-purple-400/30 rounded-full px-3 py-1"
          >
            <span className="text-[10px] text-purple-300 font-bold">⚡ {lastEffect.effect}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}