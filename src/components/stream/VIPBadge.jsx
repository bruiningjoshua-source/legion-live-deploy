import React from 'react';
import { motion } from 'framer-motion';
import { getVipTier } from '@/components/wallet/CurrencyPackages';

export default function VIPBadge({ vipPoints = 0, size = 'sm', animate = false }) {
  const tier = getVipTier(vipPoints);
  if (tier.level === 0) return null;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <motion.div
      animate={animate && tier.level >= 4 ? {
        boxShadow: ['0 0 4px rgba(245,158,11,0.3)', '0 0 12px rgba(245,158,11,0.6)', '0 0 4px rgba(245,158,11,0.3)']
      } : {}}
      transition={{ duration: 2, repeat: Infinity }}
      className={`inline-flex items-center gap-1 rounded-full font-bold ${tier.bgColor} border border-white/20 ${sizeClasses[size]}`}
    >
      <span>{tier.icon}</span>
      <span className={tier.color}>{tier.name}</span>
    </motion.div>
  );
}