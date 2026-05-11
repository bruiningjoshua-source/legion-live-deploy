import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingHearts({ reactions = [] }) {
  return (
    <div className="absolute bottom-32 right-16 z-20 pointer-events-none" style={{ width: '60px', height: '300px' }}>
      <AnimatePresence>
        {reactions.map(r => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, x: Math.random() * 40 - 20, scale: 0.5 }}
            animate={{
              opacity: [1, 1, 0],
              y: -280 - Math.random() * 80,
              x: [Math.random() * 40 - 20, Math.random() * 60 - 30, Math.random() * 40 - 20],
              scale: [0.5, 1.2, 0.8],
              rotate: [0, Math.random() * 30 - 15, Math.random() * 20 - 10]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5 + Math.random(), ease: 'easeOut' }}
            className="absolute bottom-0 text-2xl"
            onAnimationComplete={() => {}}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}