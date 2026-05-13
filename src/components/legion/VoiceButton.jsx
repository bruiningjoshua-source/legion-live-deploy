import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceButton({ isListening, isSupported, onToggle, transcript }) {
  if (!isSupported) return null;

  return (
    <div className="relative">
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.9 }}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/40'
            : 'bg-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.12] border border-white/[0.08]'
        }`}
      >
        {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}

        {/* Pulsing ring when active */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2 border-red-400"
            />
          )}
        </AnimatePresence>
      </motion.button>

      {/* Live transcript preview */}
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white/80 text-xs px-3 py-1.5 rounded-lg whitespace-nowrap max-w-[200px] truncate border border-white/10"
          >
            {transcript}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}