/**
 * GiftVideoOverlay — Plays the gift's MP4 animation when sent.
 * Legion Live gifts are video-based (Roman/mythological themed assets).
 * Falls back to a simple icon burst if no video_url is set.
 *
 * screen_takeover=true gifts (epic/legendary tier) play full-screen.
 * Lower tier gifts play as a smaller corner/center overlay.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const TIER_COLORS = {
  common:    '#94a3b8',
  rare:      '#3b82f6',
  epic:      '#a855f7',
  legendary: '#f5a623',
};

export default function GiftVideoOverlay({ gift, sender, quantity = 1, onComplete }) {
  const videoRef = useRef(null);
  const [ended, setEnded] = useState(false);
  const tierColor = TIER_COLORS[gift?.category] || TIER_COLORS.common;
  const isBigGift = gift?.screen_takeover;

  useEffect(() => {
    if (!gift) return;
    // Fire confetti burst on gift arrival for legendary/epic
    if (gift.category === 'legendary' || gift.category === 'epic') {
      confetti({
        particleCount: gift.category === 'legendary' ? 150 : 80,
        spread: 90,
        origin: { y: 0.5 },
        colors: [tierColor, '#fff', '#f5a623'],
      });
    }
    const timer = setTimeout(() => {
      setEnded(true);
      setTimeout(() => onComplete?.(), 400);
    }, (gift.duration_seconds || 5) * 1000 + 300);

    // Belt-and-braces: some mobile browsers ignore the autoPlay attribute.
    // Explicitly call play() (muted, so it's permitted) once mounted.
    const v = videoRef.current;
    if (v) {
      v.muted = true;
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => console.warn('[GiftVideo] autoplay blocked:', err?.message));
      }
    }

    return () => clearTimeout(timer);
  }, [gift, onComplete, tierColor]);

  if (!gift) return null;

  return (
    <AnimatePresence>
      {!ended && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[60] flex items-center justify-center pointer-events-none ${isBigGift ? '' : 'p-8'}`}
          style={!isBigGift ? { alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '120px' } : {}}
        >
          {/* Dim backdrop for big gifts only */}
          {isBigGift && (
            <motion.div initial={{opacity:0}} animate={{opacity:0.4}} exit={{opacity:0}}
              className="absolute inset-0 bg-black" />
          )}

          <motion.div
            initial={{ scale: isBigGift ? 0.7 : 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: isBigGift ? 1.1 : 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="relative"
            style={{
              width: isBigGift ? 'min(90vw, 520px)' : 'min(60vw, 280px)',
            }}
          >
            {gift.video_url ? (
              <video
                ref={videoRef}
                src={gift.video_url}
                autoPlay
                // MUST start muted: mobile browsers block autoplay of unmuted
                // video, which silently fails and leaves a black overlay.
                // We unmute once playback has actually started.
                muted
                playsInline
                preload="auto"
                className="w-full h-auto rounded-2xl"
                style={{
                  filter: `drop-shadow(0 0 ${isBigGift ? 40 : 20}px ${tierColor}aa)`,
                }}
                onPlaying={(e) => {
                  // Try to enable sound now that playback is running. If the
                  // browser refuses, the video still plays silently.
                  try { e.currentTarget.muted = false; } catch (_) {}
                }}
                onEnded={() => setEnded(true)}
                onError={() => { setEnded(true); }}
              />
            ) : (
              // Fallback: icon burst for gifts without video
              <div className="w-full aspect-square flex items-center justify-center text-8xl"
                style={{ filter: `drop-shadow(0 0 30px ${tierColor})` }}>
                {gift.icon || '🎁'}
              </div>
            )}

            {/* Sender + gift name label */}
            <motion.div
              initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full px-4 py-2 rounded-2xl whitespace-nowrap"
              style={{
                background: 'rgba(10,10,20,0.92)',
                border: `1px solid ${tierColor}66`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <p className="text-white font-bold text-sm text-center">
                {sender} sent <span style={{ color: tierColor }}>{gift.name}</span>
                {quantity > 1 && <span className="text-white/50"> ×{quantity}</span>}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
