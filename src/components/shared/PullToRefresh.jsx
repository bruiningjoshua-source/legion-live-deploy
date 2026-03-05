import React, { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 80;

export default function PullToRefresh({ onRefresh, children }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useMotionValue(0);
  const containerRef = useRef(null);

  const opacity = useTransform(pullDistance, [0, THRESHOLD], [0, 1]);
  const rotate = useTransform(pullDistance, [0, THRESHOLD], [0, 360]);
  const scale = useTransform(pullDistance, [0, THRESHOLD], [0.5, 1]);

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (isRefreshing) return;
    if (containerRef.current?.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && startY.current > 0) {
      pullDistance.set(Math.min(diff * 0.5, THRESHOLD + 20));
    }
  }, [isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    const currentPull = pullDistance.get();
    if (currentPull >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      pullDistance.set(60);
      await onRefresh();
      setIsRefreshing(false);
    }
    pullDistance.set(0);
    startY.current = 0;
  }, [isRefreshing, onRefresh, pullDistance]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <motion.div
        style={{ opacity, scale }}
        className="flex items-center justify-center py-3 pointer-events-none"
      >
        <motion.div
          style={{ rotate: isRefreshing ? undefined : rotate }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
        >
          <RefreshCw className="w-5 h-5 text-amber-400" />
        </motion.div>
        <span className="ml-2 text-sm text-amber-300">
          {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
        </span>
      </motion.div>
      {children}
    </div>
  );
}