import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function GlassCard({ 
  children, 
  className = '',
  hover = true,
  glow = false,
  glowColor = 'amber',
  animate = true,
  delay = 0,
  padding = 'p-6',
  ...props 
}) {
  const glowColors = {
    amber: 'hover:shadow-amber-500/20 hover:border-amber-500/40',
    red: 'hover:shadow-red-500/20 hover:border-red-500/40',
    blue: 'hover:shadow-blue-500/20 hover:border-blue-500/40',
    purple: 'hover:shadow-purple-500/20 hover:border-purple-500/40',
    green: 'hover:shadow-green-500/20 hover:border-green-500/40',
    pink: 'hover:shadow-pink-500/20 hover:border-pink-500/40',
    cyan: 'hover:shadow-cyan-500/20 hover:border-cyan-500/40'
  };

  const staticGlow = {
    amber: 'shadow-amber-500/10 border-amber-500/30',
    red: 'shadow-red-500/10 border-red-500/30',
    blue: 'shadow-blue-500/10 border-blue-500/30',
    purple: 'shadow-purple-500/10 border-purple-500/30',
    green: 'shadow-green-500/10 border-green-500/30',
    pink: 'shadow-pink-500/10 border-pink-500/30',
    cyan: 'shadow-cyan-500/10 border-cyan-500/30'
  };

  const cardClasses = cn(
    'relative overflow-hidden rounded-2xl',
    'bg-white/[0.03] backdrop-blur-xl',
    'border border-white/[0.08]',
    'shadow-xl',
    hover && 'transition-all duration-300 ease-out',
    hover && 'hover:bg-white/[0.06] hover:shadow-2xl hover:-translate-y-1',
    hover && glowColors[glowColor],
    glow && staticGlow[glowColor],
    padding,
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.5, 
          delay,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
        className={cardClasses}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
}