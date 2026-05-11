import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';

const COLORS = ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#ec4899'];

export default function RevenueBreakdownChart({ gifts, tips, earnings }) {
  // Daily earnings chart (last 14 days)
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = startOfDay(subDays(new Date(), i));
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayLabel = format(date, 'MMM d');

      const dayGifts = (gifts || []).filter(g => g.created_date && g.created_date.startsWith(dateStr));
      const dayTips = (tips || []).filter(t => t.created_date && t.created_date.startsWith(dateStr));

      const giftValue = dayGifts.reduce((sum, g) => sum + (g.total_as_value || 0), 0);
      const tipValue = dayTips.reduce((sum, t) => sum + ((t.amount_usd || 0) * 100), 0); // convert to denarii-like units

      days.push({ date: dayLabel, gifts: giftValue, tips: tipValue, total: giftValue + tipValue });
    }
    return days;
  }, [gifts, tips]);

  // Revenue source breakdown
  const sourceData = useMemo(() => {
    const totalGifts = (gifts || []).reduce((sum, g) => sum + (g.total_as_value || 0), 0);
    const totalTips = (tips || []).reduce((sum, t) => sum + (t.amount_usd || 0), 0);
    
    const data = [];
    if (totalGifts > 0) data.push({ name: 'Gifts', value: totalGifts });
    if (totalTips > 0) data.push({ name: 'Tips', value: Math.round(totalTips * 100) });
    if (data.length === 0) data.push({ name: 'No revenue yet', value: 1 });
    return data;
  }, [gifts, tips]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-stone-900 border border-amber-600/30 rounded-lg p-3 text-sm">
        <p className="text-amber-100 font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-amber-400/80">
            {p.name}: 🪙 {p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Daily Chart */}
      <Card className="bg-stone-800/40 border-amber-600/20 md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            Last 14 Days Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fill: '#d4a44a80', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#d4a44a80', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gifts" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Gifts" />
                <Bar dataKey="tips" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Tips" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart */}
      <Card className="bg-stone-800/40 border-amber-600/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-100 text-sm">Revenue Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11, color: '#d4a44a80' }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}