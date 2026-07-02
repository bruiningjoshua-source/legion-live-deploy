import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Video,
  Radio,
  Briefcase,
  BarChart3,
  Activity,
  Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Admin authorization is enforced by user.role === 'admin' (managed server-side).

const PLATFORM_COLORS = {
  streaming: '#ef4444',
  video: '#3b82f6',
  podcast: '#8b5cf6',
  affiliate: '#10b981',
  ambassador: '#f59e0b',
  exclusive_content: '#ec4899',
  pk_battles: '#f97316',
  overall: '#fbbf24'
};

export default function PlatformAdminAnalytics() {
  const [dateRange, setDateRange] = useState('30');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const isAuthorized = user?.role === 'admin';

  // Fetch all data for analytics
  const { data: currencyPurchases = [] } = useQuery({
    queryKey: ['all-currency-purchases'],
    queryFn: () => base44.entities.CurrencyPurchase.list('-created_date', 1000),
    enabled: isAuthorized
  });

  const { data: giftTransactions = [] } = useQuery({
    queryKey: ['all-gift-transactions'],
    queryFn: () => base44.entities.GiftTransaction.list('-created_date', 1000),
    enabled: isAuthorized
  });

  const { data: streams = [] } = useQuery({
    queryKey: ['all-streams-analytics'],
    queryFn: () => base44.entities.Stream.list('-created_date', 500),
    enabled: isAuthorized
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['all-videos-analytics'],
    queryFn: () => base44.entities.VlogVideo.list('-created_date', 500),
    enabled: isAuthorized
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['all-creators-analytics'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 200),
    enabled: isAuthorized
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['all-wallets-analytics'],
    queryFn: () => base44.entities.Wallet.list('-denarii_balance', 500),
    enabled: isAuthorized
  });

  const { data: exclusiveContent = [] } = useQuery({
    queryKey: ['all-exclusive-content'],
    queryFn: () => base44.entities.ExclusiveContent.list('-created_date', 200),
    enabled: isAuthorized
  });

  const { data: ambassadorEarnings = [] } = useQuery({
    queryKey: ['all-ambassador-earnings'],
    queryFn: () => base44.entities.AmbassadorEarning.list('-created_date', 500),
    enabled: isAuthorized
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-red-500/30">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-red-400/50 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-100 mb-2">Access Denied</h2>
            <p className="text-amber-400/70">Platform admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate metrics
  const totalRevenue = currencyPurchases.reduce((sum, p) => sum + (p.price_usd || 0), 0);
  const totalDenariiBought = currencyPurchases.reduce((sum, p) => sum + (p.denarii_amount || 0) + (p.bonus_denarii || 0), 0);
  const totalDenariiSpent = giftTransactions.reduce((sum, t) => sum + (t.total_as_value || 0) / 100, 0);
  const totalCreatorEarnings = streams.reduce((sum, s) => sum + (s.total_denarii_earned || 0), 0);
  const totalExclusiveEarnings = exclusiveContent.reduce((sum, c) => sum + (c.total_earnings_denarii || 0), 0);
  const totalAmbassadorEarnings = ambassadorEarnings.reduce((sum, e) => sum + (e.gross_amount_usd || 0), 0);
  
  // Calculate platform profit (60% of creator earnings converted back to USD estimate)
  const estimatedPlatformProfit = (totalCreatorEarnings * 0.6 * 0.01) + (totalRevenue * 0.1);

  // Calculate average transaction value
  const avgTransactionValue = currencyPurchases.length > 0 
    ? totalRevenue / currencyPurchases.length 
    : 0;

  // Get denarii value per purchase tier
  const purchaseByTier = currencyPurchases.reduce((acc, p) => {
    const tier = p.package_name || 'Unknown';
    if (!acc[tier]) acc[tier] = { count: 0, revenue: 0, denarii: 0 };
    acc[tier].count++;
    acc[tier].revenue += p.price_usd || 0;
    acc[tier].denarii += (p.denarii_amount || 0) + (p.bonus_denarii || 0);
    return acc;
  }, {});

  const tierData = Object.entries(purchaseByTier).map(([name, data]) => ({
    name,
    count: data.count,
    revenue: data.revenue,
    denarii: data.denarii,
    avgValue: data.revenue / data.count
  })).sort((a, b) => b.revenue - a.revenue);

  // Revenue over time
  const revenueByDay = currencyPurchases.reduce((acc, p) => {
    const date = p.created_date ? format(new Date(p.created_date), 'MM/dd') : 'Unknown';
    if (!acc[date]) acc[date] = 0;
    acc[date] += p.price_usd || 0;
    return acc;
  }, {});

  const revenueChartData = Object.entries(revenueByDay)
    .slice(-parseInt(dateRange))
    .map(([date, value]) => ({ date, revenue: value }));

  // Platform breakdown
  const platformBreakdown = [
    { name: 'Streaming', value: streams.filter(s => s.stream_type === 'solo').length * 10, color: PLATFORM_COLORS.streaming },
    { name: 'PK Battles', value: streams.filter(s => s.stream_type === 'pk_battle').length * 15, color: PLATFORM_COLORS.pk_battles },
    { name: 'Videos', value: videos.length * 5, color: PLATFORM_COLORS.video },
    { name: 'Exclusive', value: totalExclusiveEarnings / 100, color: PLATFORM_COLORS.exclusive_content },
    { name: 'Ambassador', value: totalAmbassadorEarnings, color: PLATFORM_COLORS.ambassador }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-100 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-amber-400" />
              Platform Analytics
            </h1>
            <p className="text-amber-400/70">Real-time revenue and engagement tracking</p>
          </div>
          <Badge className="bg-green-600 text-white px-4 py-2 text-lg">
            <Activity className="w-4 h-4 mr-2 animate-pulse" />
            LIVE
          </Badge>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-900/30 to-stone-900 border-green-600/30">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 text-green-400 mb-2" />
              <p className="text-3xl font-bold text-amber-100">${totalRevenue.toFixed(2)}</p>
              <p className="text-amber-400/60 text-sm">Total Revenue</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-900/30 to-stone-900 border-amber-600/30">
            <CardContent className="p-4">
              <Wallet className="w-6 h-6 text-amber-400 mb-2" />
              <p className="text-3xl font-bold text-amber-100">{totalDenariiBought.toLocaleString()}</p>
              <p className="text-amber-400/60 text-sm">🪙 Purchased</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/30 to-stone-900 border-purple-600/30">
            <CardContent className="p-4">
              <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
              <p className="text-3xl font-bold text-amber-100">${avgTransactionValue.toFixed(2)}</p>
              <p className="text-amber-400/60 text-sm">Avg Transaction</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/30 to-stone-900 border-blue-600/30">
            <CardContent className="p-4">
              <Users className="w-6 h-6 text-blue-400 mb-2" />
              <p className="text-3xl font-bold text-amber-100">{creators.length}</p>
              <p className="text-amber-400/60 text-sm">Active Creators</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-600">Overview</TabsTrigger>
            <TabsTrigger value="denarii" className="data-[state=active]:bg-amber-600">Denarii Economy</TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-amber-600">By Platform</TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-amber-600">Purchase Tiers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Revenue Chart */}
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Revenue Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                      <XAxis dataKey="date" stroke="#fbbf24" />
                      <YAxis stroke="#fbbf24" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #d97706' }}
                        labelStyle={{ color: '#fef3c7' }}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 text-lg flex items-center gap-2">
                    <Radio className="w-5 h-5 text-red-400" />
                    Streaming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Total Streams</span>
                      <span className="text-amber-100 font-bold">{streams.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Creator Earnings</span>
                      <span className="text-amber-100 font-bold">{totalCreatorEarnings.toLocaleString()} 🪙</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">PK Battles</span>
                      <span className="text-amber-100 font-bold">{streams.filter(s => s.stream_type === 'pk_battle').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-400" />
                    Video Platform
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Total Videos</span>
                      <span className="text-amber-100 font-bold">{videos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Total Views</span>
                      <span className="text-amber-100 font-bold">{videos.reduce((s, v) => s + (v.view_count || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Published</span>
                      <span className="text-amber-100 font-bold">{videos.filter(v => v.is_published).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100 text-lg flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                    Ambassador Program
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Total Earnings</span>
                      <span className="text-amber-100 font-bold">${totalAmbassadorEarnings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-400/70">Platform Cut (10%)</span>
                      <span className="text-green-400 font-bold">${(totalAmbassadorEarnings * 0.1).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="denarii" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100">Denarii Flow</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between p-4 bg-green-900/20 rounded-lg">
                    <span className="text-green-300">Denarii Purchased</span>
                    <span className="text-green-400 font-bold">{totalDenariiBought.toLocaleString()} 🪙</span>
                  </div>
                  <div className="flex justify-between p-4 bg-red-900/20 rounded-lg">
                    <span className="text-red-300">Denarii Spent (Gifts)</span>
                    <span className="text-red-400 font-bold">{totalDenariiSpent.toLocaleString()} 🪙</span>
                  </div>
                  <div className="flex justify-between p-4 bg-amber-900/20 rounded-lg">
                    <span className="text-amber-300">Circulation</span>
                    <span className="text-amber-400 font-bold">{(totalDenariiBought - totalDenariiSpent).toLocaleString()} 🪙</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-stone-800/30 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-amber-100">Consumer Value Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between p-4 bg-stone-900/50 rounded-lg">
                    <span className="text-amber-400/70">Avg USD per 100 Denarii</span>
                    <span className="text-amber-100 font-bold">
                      ${totalDenariiBought > 0 ? ((totalRevenue / totalDenariiBought) * 100).toFixed(3) : '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between p-4 bg-stone-900/50 rounded-lg">
                    <span className="text-amber-400/70">Total Transactions</span>
                    <span className="text-amber-100 font-bold">{currencyPurchases.length}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-stone-900/50 rounded-lg">
                    <span className="text-amber-400/70">Unique Buyers</span>
                    <span className="text-amber-100 font-bold">
                      {new Set(currencyPurchases.map(p => p.user_email)).size}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="platforms">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Revenue by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                      >
                        {platformBreakdown.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #d97706' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card className="bg-stone-800/30 border-amber-600/20">
              <CardHeader>
                <CardTitle className="text-amber-100">Purchase Tier Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tierData.map((tier, i) => (
                    <motion.div
                      key={tier.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 bg-stone-900/50 rounded-lg"
                    >
                      <div>
                        <p className="text-amber-100 font-semibold">{tier.name}</p>
                        <p className="text-amber-400/60 text-sm">{tier.count} purchases • {tier.denarii.toLocaleString()} 🪙</p>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold">${tier.revenue.toFixed(2)}</p>
                        <p className="text-amber-400/60 text-sm">${tier.avgValue.toFixed(2)} avg</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}