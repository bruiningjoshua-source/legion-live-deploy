import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Eye, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RealTimeViewerCard({ currentViewers = 0, peakViewers = 0, previousViewers = 0 }) {
  const [displayCount, setDisplayCount] = useState(currentViewers);
  const [trend, setTrend] = useState('stable');

  useEffect(() => {
    // Animate counter
    const diff = currentViewers - displayCount;
    if (diff === 0) return;
    
    const step = diff > 0 ? 1 : -1;
    const interval = setInterval(() => {
      setDisplayCount(prev => {
        if ((step > 0 && prev >= currentViewers) || (step < 0 && prev <= currentViewers)) {
          clearInterval(interval);
          return currentViewers;
        }
        return prev + step;
      });
    }, 50);
    
    return () => clearInterval(interval);
  }, [currentViewers]);

  useEffect(() => {
    if (currentViewers > previousViewers) setTrend('up');
    else if (currentViewers < previousViewers) setTrend('down');
    else setTrend('stable');
  }, [currentViewers, previousViewers]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-amber-400';

  return (
    <Card className="bg-gradient-to-br from-emerald-900/40 to-stone-900 border-emerald-600/30 overflow-hidden">
      <CardContent className="p-6 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="flex items-start justify-between relative z-10">
          <div>
            <p className="text-amber-400/70 text-sm font-medium mb-1">Live Viewers</p>
            <div className="flex items-baseline gap-2">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={displayCount}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  className="text-4xl font-bold text-amber-100"
                >
                  {displayCount.toLocaleString()}
                </motion.span>
              </AnimatePresence>
              <div className={`flex items-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span className="text-sm">{Math.abs(currentViewers - previousViewers)}</span>
              </div>
            </div>
            <p className="text-amber-400/50 text-xs mt-2">
              Peak: {peakViewers.toLocaleString()} viewers
            </p>
          </div>
          
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Eye className="w-7 h-7 text-emerald-400" />
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-emerald-500/20"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}