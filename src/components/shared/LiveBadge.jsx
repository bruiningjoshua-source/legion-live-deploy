import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function LiveBadge({ 
  type = 'live',
  size = 'default',
  pulse = true,
  className = ''
}) {
  const types = {
    live: {
      bg: 'bg-gradient-to-r from-red-500 to-rose-600',
      text: 'LIVE',
      dotColor: 'bg-white'
    },
    pk: {
      bg: 'bg-gradient-to-r from-orange-500 to-amber-600',
      text: 'PK BATTLE',
      dotColor: 'bg-white'
    },
    panel: {
      bg: 'bg-gradient-to-r from-purple-500 to-violet-600',
      text: 'PANEL',
      dotColor: 'bg-white'
    },
    premiere: {
      bg: 'bg-gradient-to-r from-blue-500 to-cyan-600',
      text: 'PREMIERE',
      dotColor: 'bg-white'
    },
    featured: {
      bg: 'bg-gradient-to-r from-amber-400 to-yellow-500',
      text: 'FEATURED',
      dotColor: 'bg-amber-900'
    },
    new: {
      bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
      text: 'NEW',
      dotColor: 'bg-white'
    }
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    default: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  const config = types[type] || types.live;

  return (
    <div className={cn(
      'inline-flex items-center rounded-md font-bold tracking-wide',
      'shadow-lg',
      config.bg,
      sizes[size],
      className
    )}>
      <span className="relative flex">
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          config.dotColor
        )} />
        {pulse && (
          <motion.span
            animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={cn(
              'absolute inset-0 rounded-full',
              config.dotColor
            )}
          />
        )}
      </span>
      <span className="text-white drop-shadow-sm">{config.text}</span>
    </div>
  );
}