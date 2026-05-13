import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, ArrowUpRight, Coins } from 'lucide-react';
import formatCount from '@/components/shared/FormatCount';
import { denariiToUsd, formatLocalCurrency, detectLocalCurrency } from '@/components/utils/currencyFormatter';

export default function EarningsBalanceCard({ earnings, payouts }) {
  const localCurrency = useMemo(() => detectLocalCurrency(), []);
  
  const totalEarned = earnings?.total_earnings_denarii || 0;
  const pendingPayout = earnings?.pending_payout_denarii || 0;
  const lifetimePaid = earnings?.lifetime_payout_denarii || 0;
  const availableBalance = totalEarned - pendingPayout - lifetimePaid;

  // Earnings already represent the creator's 60% share (applied at gift time in sendGift)
  const totalLocal = formatLocalCurrency(denariiToUsd(totalEarned), localCurrency);
  const availableLocal = formatLocalCurrency(denariiToUsd(Math.max(0, availableBalance)), localCurrency);
  const pendingLocal = formatLocalCurrency(denariiToUsd(pendingPayout), localCurrency);
  const paidLocal = formatLocalCurrency(denariiToUsd(lifetimePaid), localCurrency);

  const stats = [
    { label: 'Available Balance', value: availableLocal, icon: DollarSign, color: 'text-green-400', denarii: Math.max(0, availableBalance) },
    { label: 'Lifetime Earned', value: totalLocal, icon: TrendingUp, color: 'text-amber-400', denarii: totalEarned },
    { label: 'Pending Payout', value: pendingLocal, icon: ArrowUpRight, color: 'text-blue-400', denarii: pendingPayout },
    { label: 'Total Paid Out', value: paidLocal, icon: Coins, color: 'text-purple-400', denarii: lifetimePaid },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, color, denarii }) => (
        <Card key={label} className="bg-stone-800/40 border-amber-600/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-amber-400/60 text-xs">{label}</span>
            </div>
            <p className="text-xl font-bold text-amber-100">{value}</p>
            <p className="text-amber-400/50 text-xs mt-1">🪙 {formatCount(denarii)} Denarii</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}