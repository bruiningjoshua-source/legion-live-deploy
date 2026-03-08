import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIVideoGiftDisplay({ videoUrl, duration, isLooping, onComplete }) {
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!videoUrl) return;

    const timer = setTimeout(() => {
      setIsPlaying(false);
      onComplete?.();
    }, (duration || 5) * 1000);

    return () => clearTimeout(timer);
  }, [videoUrl, duration, onComplete]);

  if (!videoUrl) return null;

  return (
    <AnimatePresence>
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 pointer-events-none"
        >
          <motion.video
            src={videoUrl}
            autoPlay
            loop={isLooping}
            muted
            playsInline
            className="max-w-[80vw] max-h-[80vh] rounded-2xl shadow-2xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}