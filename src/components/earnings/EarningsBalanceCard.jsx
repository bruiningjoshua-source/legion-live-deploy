import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, ArrowUpRight, Coins } from 'lucide-react';
import formatCount from '@/components/shared/FormatCount';

const DENARII_TO_USD = 0.01; // 1 Denarii = $0.01
const CREATOR_SHARE = 0.40; // 40% creator share

export default function EarningsBalanceCard({ earnings, payouts }) {
  const totalEarned = earnings?.total_earnings_denarii || 0;
  const pendingPayout = earnings?.pending_payout_denarii || 0;
  const lifetimePaid = earnings?.lifetime_payout_denarii || 0;
  const availableBalance = totalEarned - pendingPayout - lifetimePaid;

  const totalUsd = (totalEarned * DENARII_TO_USD * CREATOR_SHARE).toFixed(2);
  const availableUsd = (Math.max(0, availableBalance) * DENARII_TO_USD * CREATOR_SHARE).toFixed(2);
  const pendingUsd = (pendingPayout * DENARII_TO_USD * CREATOR_SHARE).toFixed(2);
  const paidUsd = (lifetimePaid * DENARII_TO_USD * CREATOR_SHARE).toFixed(2);

  const stats = [
    { label: 'Available Balance', value: availableUsd, icon: DollarSign, color: 'text-green-400', denarii: Math.max(0, availableBalance) },
    { label: 'Lifetime Earned', value: totalUsd, icon: TrendingUp, color: 'text-amber-400', denarii: totalEarned },
    { label: 'Pending Payout', value: pendingUsd, icon: ArrowUpRight, color: 'text-blue-400', denarii: pendingPayout },
    { label: 'Total Paid Out', value: paidUsd, icon: Coins, color: 'text-purple-400', denarii: lifetimePaid },
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
            <p className="text-xl font-bold text-amber-100">${value}</p>
            <p className="text-amber-400/50 text-xs mt-1">🪙 {formatCount(denarii)} Denarii</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}