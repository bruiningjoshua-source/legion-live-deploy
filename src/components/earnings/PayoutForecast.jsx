import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Payout Forecast Dashboard
 * 30-day projection with revenue breakdown, risk alerts, and daily timeline
 */

export default function PayoutForecast() {
  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['payout-forecast'],
    queryFn: () => base44.functions.invoke('forecastCreatorPayouts', {}),
    refetchInterval: 3600000 // Refresh hourly
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !forecast?.data?.forecast) {
    return (
      <Card className="border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm text-red-400">Unable to load forecast. Please try again.</p>
      </Card>
    );
  }

  const f = forecast.data.forecast;

  return (
    <div className="space-y-6">
      {/* Main Forecast Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Payout */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-green-300/70 mb-1">30-Day Projected Payout</p>
              <p className="text-3xl font-bold text-green-400">${f.totalProjectedUsd}</p>
              <p className="text-xs text-green-300/50 mt-1">After {f.revenueShare} platform fee</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500/40" />
          </div>
        </Card>

        {/* Daily Average */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-blue-300/70 mb-1">Daily Average</p>
              <p className="text-3xl font-bold text-blue-400">
                ${(parseFloat(f.totalProjectedUsd) / 30).toFixed(2)}
              </p>
              <p className="text-xs text-blue-300/50 mt-1">Based on current trends</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500/40" />
          </div>
        </Card>

        {/* Withdrawal Limit */}
        {f.withdrawalLimit && (
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-amber-300/70 mb-1">Monthly Withdrawal Limit</p>
                <p className="text-3xl font-bold text-amber-400">${f.withdrawalLimit}</p>
                <p className="text-xs text-amber-300/50 mt-1">{f.tier} tier</p>
              </div>
              <Calendar className="w-8 h-8 text-amber-500/40" />
            </div>
          </Card>
        )}
      </div>

      {/* Revenue Breakdown */}
      <Card className="border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold mb-4 text-white">Revenue Breakdown (30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={[
            { name: 'Source', Subscriptions: parseFloat(f.breakdown.subscriptions), Tips: parseFloat(f.breakdown.tips), AdShare: parseFloat(f.breakdown.videoAdShare), Music: parseFloat(f.breakdown.musicRoyalties), Referrals: parseFloat(f.breakdown.referralBonuses) }
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)' }}
              formatter={(v) => `$${v.toFixed(2)}`}
            />
            <Legend />
            <Bar dataKey="Subscriptions" stackId="a" fill="#10b981" />
            <Bar dataKey="Tips" stackId="a" fill="#f59e0b" />
            <Bar dataKey="AdShare" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Music" stackId="a" fill="#8b5cf6" />
            <Bar dataKey="Referrals" stackId="a" fill="#ec4899" />
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Subs: ${f.breakdown.subscriptions}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span>Tips: ${f.breakdown.tips}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span>Ads: ${f.breakdown.videoAdShare}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded" />
            <span>Music: ${f.breakdown.musicRoyalties}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pink-500 rounded" />
            <span>Ref: ${f.breakdown.referralBonuses}</span>
          </div>
        </div>
      </Card>

      {/* Daily Projection Timeline */}
      <Card className="border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold mb-4 text-white">30-Day Cumulative Projection</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={f.dailyProjection}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="day" 
              stroke="rgba(255,255,255,0.5)"
              tick={{ fontSize: 12 }}
            />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)' }}
              formatter={(v) => `$${v.toFixed(2)}`}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="cumulativeUsd" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={false}
              name="Cumulative Earnings"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Growth Trends */}
      <Card className="border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold mb-4 text-white">Growth Trends (vs Last Month)</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Subscriptions', value: f.trends.subscriptionGrowth, color: 'green' },
            { label: 'Tips/Gifts', value: f.trends.tippingGrowth, color: 'amber' },
            { label: 'Ad Revenue', value: f.trends.adGrowth, color: 'blue' }
          ].map((trend) => (
            <div key={trend.label} className={`bg-${trend.color}-500/10 border border-${trend.color}-500/30 rounded-lg p-3`}>
              <p className="text-xs text-gray-400 mb-1">{trend.label}</p>
              <p className={`text-xl font-bold text-${trend.color}-400`}>{trend.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Risk Alerts */}
      {f.riskFactors && f.riskFactors.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-400 mb-2">Risk Factors</h4>
              <ul className="space-y-1 text-sm text-red-300/80">
                {f.riskFactors.map((factor, i) => (
                  <li key={i}>• {factor}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Last Updated */}
      <p className="text-xs text-gray-400 text-center">
        Last updated: {new Date(f.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
}