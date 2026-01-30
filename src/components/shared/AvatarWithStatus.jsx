import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Crown, Shield, Star, Verified } from 'lucide-react';

export default function AvatarWithStatus({
  src,
  alt = '',
  size = 'default',
  status,
  badge,
  verified = false,
  vip = false,
  className = '',
  borderColor = 'amber',
  onClick
}) {
  const sizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    default: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    '2xl': 'w-28 h-28'
  };

  const borderColors = {
    amber: 'ring-amber-500',
    red: 'ring-red-500',
    blue: 'ring-blue-500',
    purple: 'ring-purple-500',
    green: 'ring-green-500',
    pink: 'ring-pink-500',
    gradient: 'ring-2 ring-offset-2 ring-offset-black'
  };

  const statusColors = {
    online: 'bg-green-500',
    live: 'bg-red-500 animate-pulse',
    away: 'bg-amber-500',
    offline: 'bg-gray-500',
    dnd: 'bg-red-600'
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5 -bottom-0 -right-0',
    sm: 'w-2 h-2 -bottom-0 -right-0',
    default: 'w-2.5 h-2.5 bottom-0 right-0',
    lg: 'w-3 h-3 bottom-0.5 right-0.5',
    xl: 'w-4 h-4 bottom-1 right-1',
    '2xl': 'w-5 h-5 bottom-1 right-1'
  };

  const badgeSizes = {
    xs: 'w-3 h-3 -top-0.5 -right-0.5',
    sm: 'w-4 h-4 -top-0.5 -right-0.5',
    default: 'w-5 h-5 -top-1 -right-1',
    lg: 'w-6 h-6 -top-1 -right-1',
    xl: 'w-7 h-7 -top-1 -right-1',
    '2xl': 'w-8 h-8 -top-2 -right-2'
  };

  const badgeIconSizes = {
    xs: 'w-2 h-2',
    sm: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5'
  };

  const getBadgeContent = () => {
    if (verified) return { icon: Verified, bg: 'bg-blue-500' };
    if (vip) return { icon: Crown, bg: 'bg-gradient-to-br from-amber-400 to-amber-600' };
    if (badge === 'mod') return { icon: Shield, bg: 'bg-green-500' };
    if (badge === 'star') return { icon: Star, bg: 'bg-purple-500' };
    return null;
  };

  const badgeConfig = getBadgeContent();

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      className={cn(
        'relative inline-flex flex-shrink-0',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        'rounded-full overflow-hidden',
        'ring-2 ring-offset-2 ring-offset-black/50',
        borderColors[borderColor],
        sizes[size]
      )}>
        {src ? (
          <img 
            src={src} 
            alt={alt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <span className={cn(
              'text-white font-bold',
              size === 'xs' && 'text-[8px]',
              size === 'sm' && 'text-[10px]',
              size === 'default' && 'text-xs',
              size === 'lg' && 'text-sm',
              size === 'xl' && 'text-base',
              size === '2xl' && 'text-xl'
            )}>
              {alt?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {status && (
        <span className={cn(
          'absolute rounded-full border-2 border-black',
          statusColors[status],
          statusSizes[size]
        )} />
      )}

      {badgeConfig && (
        <div className={cn(
          'absolute rounded-full flex items-center justify-center',
          'shadow-lg',
          badgeConfig.bg,
          badgeSizes[size]
        )}>
          <badgeConfig.icon className={cn('text-white', badgeIconSizes[size])} />
        </div>
      )}
    </motion.div>
  );
}