import React from 'react';
import { cn } from '@/utils';

export default function BigoButton({ children, variant = 'primary', size = 'md', className, ...props }) {
  const baseClasses = 'font-semibold rounded-full transition-all active:scale-95 flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'btn-bigo text-white shadow-lg shadow-purple-500/30',
    secondary: 'bg-white/10 border border-white/20 text-white hover:bg-white/20',
    ghost: 'text-white/70 hover:text-white hover:bg-white/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  };

  return (
    <button className={cn(baseClasses, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}