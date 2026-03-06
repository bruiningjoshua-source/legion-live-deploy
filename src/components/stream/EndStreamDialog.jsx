import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { StopCircle } from 'lucide-react';

export default function EndStreamDialog({ isOpen, onConfirm, onCancel, isPending }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
          
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative bg-[#1a1a1f] border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <StopCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">End Stream?</h3>
              <p className="text-white/50 text-sm mb-6">
                Your viewers will be disconnected.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={onCancel}
                  variant="ghost"
                  className="flex-1 text-white/70 hover:bg-white/10 h-11 rounded-xl"
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white h-11 rounded-xl font-semibold"
                  disabled={isPending}
                >
                  {isPending ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'End Stream'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}