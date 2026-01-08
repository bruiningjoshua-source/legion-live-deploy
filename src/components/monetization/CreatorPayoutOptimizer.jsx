import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Zap, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CreatorPayoutOptimizer({ creatorEarningsUsd = 0 }) {
  const payoutTier = useMemo(() => {
    if (creatorEarningsUsd >= 10000) return { name: 'Premium', share: 0.70, color: 'from-yellow-500', icon: '👑' };
    if (creatorEarningsUsd >= 5000) return { name: 'Gold', share: 0.65, color: 'from-amber-500', icon: '⭐' };
    if (creatorEarningsUsd >= 2500) return { name: 'Silver', share: 0.60, color: 'from-gray-400', icon: '🥈' };
    if (creatorEarningsUsd >= 1000) return { name: 'Bronze', share: 0.55, color: 'from-orange-600', icon: '🥉' };
    return { name: 'Starter', share: 0.50, color: 'from-stone-500', icon: '🪙' };
  }, [creatorEarningsUsd]);

  const nextTierThreshold = useMemo(() => {
    if (creatorEarningsUsd >= 10000) return null;
    if (creatorEarningsUsd >= 5000) return { amount: 10000, share: 0.70 };
    if (creatorEarningsUsd >= 2500) return { amount: 5000, share: 0.65 };
    if (creatorEarningsUsd >= 1000) return { amount: 2500, share: 0.60 };
    return { amount: 1000, share: 0.55 };
  }, [creatorEarningsUsd]);

  return (
    <div className="space-y-4">
      {/* Current Tier */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r ${payoutTier.color} bg-opacity-10 border border-current border-opacity-30 rounded-xl p-6`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
              <span className="text-3xl">{payoutTier.icon}</span>
              {payoutTier.name} Tier
            </h3>
            <p className="text-white/70 text-sm mb-3">Your current revenue share</p>
            <div className="text-3xl font-bold text-white">{Math.round(payoutTier.share * 100)}%</div>
          </div>
          <div className="text-5xl opacity-20">💰</div>
        </div>
      </motion.div>

      {/* Earnings Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-stone-800/50 border-amber-600/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-300">${creatorEarningsUsd.toFixed(0)}</div>
            <div className="text-xs text-amber-400/70">Total Earnings</div>
          </CardContent>
        </Card>

        <Card className="bg-stone-800/50 border-amber-600/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-400">${(creatorEarningsUsd * payoutTier.share).toFixed(0)}</div>
            <div className="text-xs text-green-400/70">Your Payout</div>
          </CardContent>
        </Card>

        <Card className="bg-stone-800/50 border-amber-600/20">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-400">${(creatorEarningsUsd * (1 - payoutTier.share)).toFixed(0)}</div>
            <div className="text-xs text-purple-400/70">Platform Net</div>
          </CardContent>
        </Card>
      </div>

      {/* Next Tier Info */}
      {nextTierThreshold && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-stone-800/50 border border-amber-600/20 rounded-xl p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-amber-100 font-semibold text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              Next Tier Unlock
            </h4>
            <Badge className="bg-amber-600 text-white border-0">
              {Math.round(((nextTierThreshold.amount - creatorEarningsUsd) / nextTierThreshold.amount) * 100)}% away
            </Badge>
          </div>

          <div className="w-full bg-stone-900 rounded-full h-2 mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(creatorEarningsUsd / nextTierThreshold.amount) * 100}%` }}
              transition={{ duration: 1 }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
            />
          </div>

          <p className="text-amber-300/80 text-sm">
            Earn ${(nextTierThreshold.amount - creatorEarningsUsd).toFixed(0)} more to reach <strong>{Math.round(nextTierThreshold.share * 100)}% revenue share</strong>
          </p>
        </motion.div>
      )}

      {!nextTierThreshold && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-200 text-sm font-semibold">
            🎉 You've reached the premium tier! Congratulations on your success.
          </p>
        </div>
      )}
    </div>
  );
}