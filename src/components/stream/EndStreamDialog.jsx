import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from 'lucide-react';

export default function EndStreamDialog({ isOpen, onConfirm, onCancel, isPending }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-end p-4 pt-16"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50" 
          onClick={onCancel}
        />
        
        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: -20 }}
          className="relative bg-stone-900 border border-red-500/50 rounded-xl p-4 w-64 shadow-2xl shadow-red-900/30"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-amber-100 font-bold mb-2">End Broadcast?</h3>
            <p className="text-amber-400/70 text-sm mb-4">
              Are you sure you want to end this stream? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 border-amber-600/30 text-amber-300 hover:bg-amber-800/20"
                disabled={isPending}
              >
                No
              </Button>
              <Button
                onClick={onConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </span>
                ) : (
                  'Yes, End'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}