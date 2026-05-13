import React from 'react';
import { motion } from 'framer-motion';
import { X, Armchair } from 'lucide-react';

const SEAT_OPTIONS = [4, 6, 9, 12];

export default function SeatsPanel({ seats, onSeatsChange, onClose }) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      <div className="flex items-center justify-between px-5 pb-4">
        <h3 className="text-black font-bold text-base">Number of Seats</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex items-center gap-3 px-5 pb-6">
        {SEAT_OPTIONS.map(count => {
          const active = seats === count;
          return (
            <button
              key={count}
              onClick={() => onSeatsChange(count)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full border-2 transition-all font-semibold text-sm ${
                active
                  ? 'border-cyan-400 bg-cyan-50 text-cyan-600'
                  : 'border-gray-200 bg-white text-gray-500'
              }`}
            >
              <Armchair className="w-4 h-4" />
              {count}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}