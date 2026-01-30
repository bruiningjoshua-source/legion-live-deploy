import React from 'react';
import { Eye, Users } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

export default function ViewerCount({ 
  count = 0,
  variant = 'default',
  size = 'default',
  animated = true,
  className = ''
}) {
  const formatCount = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const variants = {
    default: 'bg-black/60 backdrop-blur-sm text-white',
    solid: 'bg-white/10 text-white',
    outline: 'bg-transparent border border-white/30 text-white',
    glow: 'bg-red-500/20 text-red-300 border border-red-500/30'
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    default: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className={cn(
      'inline-flex items-center rounded-lg font-medium',
      variants[variant],
      sizes[size],
      className
    )}>
      <Eye className={iconSizes[size]} />
      <AnimatePresence mode="wait">
        <motion.span
          key={count}
          initial={animated ? { y: -10, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {formatCount(count)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}