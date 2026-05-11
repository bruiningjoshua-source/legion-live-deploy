import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SmilePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function PurchaseSatisfactionTracker() {
  const [showRating, setShowRating] = useState(false);
  const [satisfaction, setSatisfaction] = useState(null);

  const handleRate = (level) => {
    setSatisfaction(level);
    toast.success(`Thanks! Your feedback helps us improve.`);
    setTimeout(() => {
      setShowRating(false);
      setSatisfaction(null);
    }, 1500);
  };

  const ratings = [
    { value: 1, label: 'Poor', icon: '😞', color: 'bg-red-600' },
    { value: 2, label: 'Fair', icon: '😐', color: 'bg-yellow-600' },
    { value: 3, label: 'Good', icon: '😊', color: 'bg-blue-600' },
    { value: 4, label: 'Great', icon: '🤩', color: 'bg-green-600' },
    { value: 5, label: 'Excellent', icon: '🤩', color: 'bg-purple-600' }
  ];

  return (
    <AnimatePresence>
      {showRating ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <Card className="bg-stone-900 border-amber-600/30 w-full max-w-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-amber-100 flex items-center justify-center gap-2">
                <SmilePlus className="w-6 h-6 text-amber-400" />
                How was your purchase?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-amber-300/70 text-sm text-center">
                Your feedback helps us improve the experience for everyone
              </p>

              <div className="grid grid-cols-5 gap-2">
                {ratings.map((rating) => (
                  <motion.button
                    key={rating.value}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRate(rating.value)}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-stone-800 transition-colors"
                  >
                    <span className="text-2xl">{rating.icon}</span>
                    <span className="text-xs text-amber-300">{rating.label}</span>
                  </motion.button>
                ))}
              </div>

              {satisfaction && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg"
                >
                  <p className="text-green-300 text-sm text-center">Rating submitted! Thank you.</p>
                </motion.div>
              )}

              <Button
                variant="outline"
                onClick={() => setShowRating(false)}
                className="w-full text-amber-300 border-amber-600/20 hover:bg-amber-800/20"
              >
                Skip
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}