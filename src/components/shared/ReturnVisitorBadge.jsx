import React from 'react';
import { Star, Heart } from 'lucide-react';

/**
 * Return Visitor Badge Component
 * Shows viewer's loyalty tier based on visit count and watch time
 */

export default function ReturnVisitorBadge({ loyaltyTier, totalVisits, totalWatchHours }) {
  if (!loyaltyTier || loyaltyTier === 'new') return null;

  const tierConfig = {
    regular: {
      icon: <Star className="w-4 h-4" />,
      label: 'Regular',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      badge: '⭐'
    },
    loyal: {
      icon: <Heart className="w-4 h-4" />,
      label: 'Loyal',
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      badge: '💜'
    },
    superfan: {
      icon: <Heart className="w-4 h-4 fill-current" />,
      label: 'Superfan',
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      badge: '🔥'
    }
  };

  const config = tierConfig[loyaltyTier] || tierConfig.regular;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${config.color}`}>
      <span>{config.badge}</span>
      <span>{config.label}</span>
      <span className="text-[10px] opacity-70">({totalVisits} visits)</span>
    </div>
  );
}