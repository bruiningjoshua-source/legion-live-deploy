import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Crown } from 'lucide-react';
import { getVipTier } from '@/components/wallet/CurrencyPackages';

/**
 * VIP Badge that persists across sessions
 * Displays user's VIP tier based on wallet VIP points
 */

export default function VIPBadgePersistent({ userEmail, showLabel = true, compact = false }) {
  const { data: wallet } = useQuery({
    queryKey: ['wallet', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const wallets = await base44.entities.Wallet.filter({ user_email: userEmail }, null, 1);
      return wallets[0] || null;
    },
    enabled: !!userEmail,
    staleTime: 60000,
    refetchOnMount: false
  });

  const vipPoints = wallet?.vip_points || 0;
  const vipTier = getVipTier(vipPoints);

  if (vipTier.level === 0) return null;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 ${vipTier.bgColor} px-2 py-1 rounded-lg`}>
        <Crown className="w-3 h-3 text-white" />
        <span className={`text-xs font-bold ${vipTier.color}`}>{vipTier.name}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${vipTier.bgColor} px-4 py-2 rounded-xl border ${vipTier.borderColor || 'border-white/10'}`}>
      <div className={`w-8 h-8 rounded-lg ${vipTier.bgColor} flex items-center justify-center`}>
        <Crown className="w-4 h-4 text-white" />
      </div>
      {showLabel && (
        <div>
          <p className={`text-xs font-bold ${vipTier.color}`}>{vipTier.name}</p>
          <p className="text-xs text-white/40">{vipPoints.toLocaleString()} points</p>
        </div>
      )}
    </div>
  );
}