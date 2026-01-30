import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

export default function PremiumButton({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  glow = false,
  pulse = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  onClick,
  ...props
}) {
  const variants = {
    primary: cn(
      'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600',
      'hover:from-amber-400 hover:via-amber-500 hover:to-orange-500',
      'text-white font-semibold',
      'shadow-lg shadow-amber-500/25',
      glow && 'shadow-xl shadow-amber-500/40'
    ),
    secondary: cn(
      'bg-white/10 backdrop-blur-sm',
      'hover:bg-white/20',
      'text-white font-medium',
      'border border-white/20 hover:border-white/30'
    ),
    ghost: cn(
      'bg-transparent hover:bg-white/10',
      'text-white/80 hover:text-white'
    ),
    danger: cn(
      'bg-gradient-to-r from-red-500 to-rose-600',
      'hover:from-red-400 hover:to-rose-500',
      'text-white font-semibold',
      'shadow-lg shadow-red-500/25'
    ),
    success: cn(
      'bg-gradient-to-r from-emerald-500 to-green-600',
      'hover:from-emerald-400 hover:to-green-500',
      'text-white font-semibold',
      'shadow-lg shadow-emerald-500/25'
    ),
    premium: cn(
      'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500',
      'hover:from-purple-400 hover:via-pink-400 hover:to-rose-400',
      'text-white font-bold',
      'shadow-xl shadow-purple-500/30'
    )
  };

  const sizes = {
    sm: 'h-9 px-4 text-sm rounded-lg gap-1.5',
    default: 'h-11 px-6 text-sm rounded-xl gap-2',
    lg: 'h-13 px-8 text-base rounded-xl gap-2.5',
    xl: 'h-14 px-10 text-lg rounded-2xl gap-3'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center',
        'transition-all duration-200 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-black',
        variants[variant],
        sizes[size],
        pulse && !disabled && 'animate-pulse',
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin absolute" />
      )}
      <span className={cn(
        'flex items-center gap-2',
        loading && 'opacity-0'
      )}>
        {Icon && <Icon className={cn(
          size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
        )} />}
        {children}
        {IconRight && <IconRight className={cn(
          size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
        )} />}
      </span>
    </motion.button>
  );
}