import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';

export default function PeakViewershipChart({ peakHours = [], streamHistory = [] }) {
  // Generate hourly data for heatmap-style visualization
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      label: i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`,
      viewers: 0
    }));
    
    // Aggregate from peak hours data
    peakHours.forEach(ph => {
      if (ph.hour >= 0 && ph.hour < 24) {
        hours[ph.hour].viewers += ph.viewers || 0;
      }
    });
    
    return hours;
  }, [peakHours]);

  const maxViewers = Math.max(...hourlyData.map(h => h.viewers), 1);
  const peakHour = hourlyData.reduce((max, h) => h.viewers > max.viewers ? h : max, hourlyData[0]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 border border-amber-600/30 rounded-lg p-3 shadow-lg">
          <p className="text-amber-100 font-semibold">{label}</p>
          <p className="text-amber-400">{payload[0].value.toLocaleString()} avg viewers</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-stone-800/30 border-amber-600/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-amber-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Peak Viewership Times
          </CardTitle>
          {peakHour.viewers > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1 rounded-full">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-amber-100 text-sm">Peak: {peakHour.label}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="label" 
                stroke="#9ca3af" 
                fontSize={10}
                interval={2}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis stroke="#9ca3af" fontSize={10} tick={{ fill: '#9ca3af' }} />
              <Tooltip content={<CustomTooltip />} />
              {peakHour.viewers > 0 && (
                <ReferenceLine 
                  x={peakHour.label} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3"
                  label={{ value: 'Peak', position: 'top', fill: '#f59e0b', fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="viewers"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#peakGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Best streaming times recommendation */}
        <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-600/20">
          <p className="text-blue-400 text-sm font-medium mb-1">💡 Best Times to Stream</p>
          <p className="text-amber-400/70 text-xs">
            Based on your audience, the best times to go live are between{' '}
            <span className="text-amber-100 font-semibold">6pm - 10pm</span> in your timezone.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}