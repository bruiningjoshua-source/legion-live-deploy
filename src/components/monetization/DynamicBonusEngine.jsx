import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Zap, Target, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DynamicBonusEngine({ 
  platformGrossRevenue = 5000,
  totalPurchases = 250,
  avgPurchaseValue = 20
}) {
  const metrics = useMemo(() => {
    // Calculate dynamic bonuses based on platform velocity
    const dailyRevenue = platformGrossRevenue / 7;
    const purchaseVelocity = totalPurchases / 7;
    const avgOrderValue = totalPurchases > 0 ? avgPurchaseValue : 0;

    // Bonus tiers based on platform growth momentum
    let activeBonusLevel = 'baseline';
    let bonusMultiplier = 1.0;
    let urgencyMessage = 'Normal pricing';

    if (platformGrossRevenue >= 10000) {
      activeBonusLevel = 'elite';
      bonusMultiplier = 1.6; // 60% extra
      urgencyMessage = 'Platform surging - max bonuses active';
    } else if (platformGrossRevenue >= 5000) {
      activeBonusLevel = 'premium';
      bonusMultiplier = 1.4; // 40% extra
      urgencyMessage = 'Strong growth - boosted rewards';
    } else if (platformGrossRevenue >= 2500) {
      activeBonusLevel = 'standard';
      bonusMultiplier = 1.25; // 25% extra
      urgencyMessage = 'Growing momentum - enhanced bonuses';
    }

    return {
      dailyRevenue,
      purchaseVelocity,
      avgOrderValue,
      activeBonusLevel,
      bonusMultiplier,
      urgencyMessage,
      projectedMonthly: dailyRevenue * 30,
      projectedYearly: dailyRevenue * 365,
      projectedTwoYear: dailyRevenue * 365 * 2
    };
  }, [platformGrossRevenue, totalPurchases, avgPurchaseValue]);

  const bonusConfig = {
    baseline: { icon: '✨', color: 'from-stone-500', label: 'Standard', multiplier: 1.0 },
    standard: { icon: '⭐', color: 'from-amber-500', label: 'Enhanced', multiplier: 1.25 },
    premium: { icon: '🌟', color: 'from-purple-500', label: 'Premium', multiplier: 1.4 },
    elite: { icon: '💎', color: 'from-yellow-500', label: 'Elite', multiplier: 1.6 }
  };

  const current = bonusConfig[metrics.activeBonusLevel];

  return (
    <div className="space-y-4">
      {/* Current Bonus Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-gradient-to-r ${current.color} bg-opacity-10 border border-current border-opacity-30 rounded-xl p-6`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-2">
              <span className="text-2xl">{current.icon}</span>
              {current.label} Bonus Active
            </h3>
            <p className="text-white/80 text-sm mb-3">{metrics.urgencyMessage}</p>
            <div className="text-2xl font-bold text-white">
              {Math.round(metrics.bonusMultiplier * 100 - 100)}% Extra Denarii
            </div>
          </div>
          <div className="text-4xl opacity-30">📈</div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Daily Revenue',
            value: `$${metrics.dailyRevenue.toFixed(0)}`,
            icon: TrendingUp,
            color: 'from-green-500'
          },
          {
            label: 'Purchase Velocity',
            value: `${Math.round(metrics.purchaseVelocity)}/day`,
            icon: Zap,
            color: 'from-yellow-500'
          },
          {
            label: 'Avg Order Value',
            value: `$${metrics.avgOrderValue.toFixed(2)}`,
            icon: Target,
            color: 'from-blue-500'
          },
          {
            label: 'Bonus Multiplier',
            value: `${(metrics.bonusMultiplier * 100).toFixed(0)}%`,
            icon: Flame,
            color: 'from-orange-500'
          }
        ].map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${metric.color} bg-opacity-10 border border-current border-opacity-20 rounded-lg p-3`}
            >
              <Icon className="w-4 h-4 mb-1 opacity-70" />
              <div className="text-sm font-bold text-white">{metric.value}</div>
              <div className="text-xs text-white/60">{metric.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Projection */}
      <Card className="bg-stone-800/50 border-amber-600/20">
        <CardHeader>
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Revenue Projections
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
            <span className="text-amber-200">Monthly Projection</span>
            <span className="text-green-400 font-bold">${metrics.projectedMonthly.toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg">
            <span className="text-amber-200">Yearly Projection</span>
            <span className="text-green-400 font-bold">${metrics.projectedYearly.toFixed(0)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-lg border border-green-500/30">
            <span className="text-green-200 font-semibold">2-Year Target</span>
            <span className="text-green-300 font-bold text-lg">${metrics.projectedTwoYear.toFixed(0)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}