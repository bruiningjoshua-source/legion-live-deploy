import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Coins, Crown, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#3b82f6'];

export default function RevenueBreakdown({ 
  giftRevenue = 0, 
  tipRevenue = 0, 
  subscriptionRevenue = 0,
  giftBreakdown = [],
  topGifters = []
}) {
  const totalRevenue = giftRevenue + tipRevenue + subscriptionRevenue;
  
  const revenueData = [
    { name: 'Gifts', value: giftRevenue, icon: Gift, color: '#f59e0b' },
    { name: 'Tips', value: tipRevenue, icon: Coins, color: '#8b5cf6' },
    { name: 'Subs', value: subscriptionRevenue, icon: Crown, color: '#10b981' }
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 border border-amber-600/30 rounded-lg p-3 shadow-lg">
          <p className="text-amber-100 font-semibold">{payload[0].name}</p>
          <p className="text-amber-400">{payload[0].value.toLocaleString()} Denarii</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-stone-800/30 border-amber-600/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-100 flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          Revenue Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-2">
              {revenueData.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-amber-400/70 text-sm">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Stats */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-900/30 to-transparent p-4 rounded-lg border border-amber-600/20">
              <p className="text-amber-400/70 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold text-amber-100">{totalRevenue.toLocaleString()}</p>
              <p className="text-amber-400/50 text-xs">Denarii earned</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {revenueData.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="bg-stone-900/50 p-3 rounded-lg text-center">
                    <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: item.color }} />
                    <p className="text-lg font-bold text-amber-100">{item.value.toLocaleString()}</p>
                    <p className="text-amber-400/50 text-xs">{item.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Top Gifters */}
        {topGifters.length > 0 && (
          <div className="mt-6 pt-4 border-t border-amber-600/10">
            <p className="text-amber-400/70 text-sm mb-3">Top Supporters</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topGifters.slice(0, 5).map((gifter, i) => (
                <div key={i} className="flex-shrink-0 bg-stone-900/50 px-4 py-2 rounded-full flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-500 text-stone-900' :
                    i === 1 ? 'bg-gray-400 text-stone-900' :
                    i === 2 ? 'bg-amber-700 text-amber-100' :
                    'bg-stone-700 text-amber-400'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-amber-100 text-sm">{gifter.display_name || 'Anonymous'}</span>
                  <span className="text-amber-400 text-sm font-semibold">{gifter.total_value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}