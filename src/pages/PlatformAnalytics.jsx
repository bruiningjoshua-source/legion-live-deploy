import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, DollarSign, Zap, Target, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const mockData = {
  dailyRevenue: [
    { day: 'Mon', revenue: 1200, creators: 450, viewers: 750 },
    { day: 'Tue', revenue: 1900, creators: 520, viewers: 1380 },
    { day: 'Wed', revenue: 2400, creators: 610, viewers: 1790 },
    { day: 'Thu', revenue: 2210, creators: 680, viewers: 1530 },
    { day: 'Fri', revenue: 2290, creators: 750, viewers: 1540 },
    { day: 'Sat', revenue: 3890, creators: 920, viewers: 2970 },
    { day: 'Sun', revenue: 3490, creators: 890, viewers: 2600 }
  ],
  revenueBySource: [
    { name: 'Gifts & Tips', value: 35, color: '#ec4899' },
    { name: 'Subscriptions', value: 30, color: '#f59e0b' },
    { name: 'Denarii Sales', value: 20, color: '#3b82f6' },
    { name: 'Affiliate', value: 15, color: '#a855f7' }
  ]
};

export default function PlatformAnalytics() {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Admin Only</h1>
          <p className="text-amber-400/70">You don't have access to this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Platform Analytics</h1>
          <p className="text-amber-400/70">Real-time earnings and performance metrics</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { 
              title: 'Total Revenue (7d)',
              value: '$17,484',
              change: '+45%',
              icon: DollarSign,
              color: 'from-green-500 to-emerald-500'
            },
            {
              title: 'Active Creators',
              value: '347',
              change: '+28%',
              icon: Users,
              color: 'from-blue-500 to-cyan-500'
            },
            {
              title: 'Active Viewers',
              value: '12,840',
              change: '+62%',
              icon: Activity,
              color: 'from-purple-500 to-pink-500'
            },
            {
              title: 'Avg Creator Earnings',
              value: '$2,450',
              change: '+33%',
              icon: TrendingUp,
              color: 'from-amber-500 to-orange-500'
            }
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${stat.color} bg-opacity-10 border border-current border-opacity-20 rounded-xl p-4`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Icon className="w-5 h-5" style={{ color: stat.color.split(' ')[1] }} />
                  <Badge className={`bg-gradient-to-r ${stat.color} text-white border-0 text-xs`}>
                    {stat.change}
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-amber-100">{stat.value}</div>
                <div className="text-amber-400/70 text-sm mt-1">{stat.title}</div>
              </motion.div>
            );
          })}
        </div>

        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20">
            <TabsTrigger value="revenue" className="data-[state=active]:bg-amber-600">
              Revenue Trends
            </TabsTrigger>
            <TabsTrigger value="sources" className="data-[state=active]:bg-amber-600">
              Revenue Sources
            </TabsTrigger>
            <TabsTrigger value="creators" className="data-[state=active]:bg-amber-600">
              Top Creators
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="mt-0">
            <Card className="bg-stone-800/50 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Daily Revenue (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={mockData.dailyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#78350f" />
                    <XAxis stroke="#a16207" />
                    <YAxis stroke="#a16207" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #b45309' }}
                      formatter={(value) => `$${value}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
                    <Line type="monotone" dataKey="creators" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                    <Line type="monotone" dataKey="viewers" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-stone-800/50 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100">Revenue Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={mockData.revenueBySource}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {mockData.revenueBySource.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/50 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100">Source Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockData.revenueBySource.map((source, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: source.color }}
                        />
                        <span className="text-amber-100">{source.name}</span>
                      </div>
                      <div className="text-amber-300 font-bold">{source.value}%</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="creators" className="mt-0">
            <Card className="bg-stone-800/50 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Top 10 Earning Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: 'Luna Beat', earnings: '$4,250', streams: 48 },
                    { rank: 2, name: 'Alex Vibes', earnings: '$3,890', streams: 42 },
                    { rank: 3, name: 'Jordan Live', earnings: '$3,450', streams: 38 },
                    { rank: 4, name: 'Sky Music', earnings: '$3,120', streams: 35 },
                    { rank: 5, name: 'Echo Sound', earnings: '$2,890', streams: 31 }
                  ].map((creator) => (
                    <motion.div
                      key={creator.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: creator.rank * 0.05 }}
                      className="flex items-center justify-between bg-stone-900/50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-600 text-white border-0">#{creator.rank}</Badge>
                        <div>
                          <div className="text-amber-100 font-semibold">{creator.name}</div>
                          <div className="text-amber-400/70 text-xs">{creator.streams} streams</div>
                        </div>
                      </div>
                      <div className="text-green-400 font-bold text-lg">{creator.earnings}</div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Projection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold text-green-100 mb-2">📈 2-Week Projection</h3>
              <p className="text-green-200/80 mb-4">Based on current growth rate (45% weekly)</p>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-sm text-green-400/70">Projected Revenue</div>
                    <div className="text-3xl font-bold text-green-300">$26,000+</div>
                  </div>
                  <div className="text-4xl opacity-20">📊</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-400/70">With Early Adopter Bonuses</div>
              <div className="text-2xl font-bold text-green-300 mt-2">$31,500</div>
              <Badge className="bg-green-600 text-white border-0 mt-2">On Track 🎯</Badge>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}