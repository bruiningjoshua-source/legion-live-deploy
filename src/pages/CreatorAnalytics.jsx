import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, ArrowLeft, RefreshCw, Download, Calendar,
  TrendingUp, DollarSign, Users, Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';

import RealTimeViewerCard from '@/components/analytics/RealTimeViewerCard';
import RevenueBreakdown from '@/components/analytics/RevenueBreakdown';
import AudienceDemographics from '@/components/analytics/AudienceDemographics';
import PeakViewershipChart from '@/components/analytics/PeakViewershipChart';
import EngagementMetrics from '@/components/analytics/EngagementMetrics';
import StreamHistoryTable from '@/components/analytics/StreamHistoryTable';

const TIME_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '28', label: 'Last 28 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' }
];

export default function CreatorAnalytics() {
  const [timeRange, setTimeRange] = useState('28');
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  // Fetch stream analytics
  const { data: streamAnalytics = [], refetch: refetchAnalytics } = useQuery({
    queryKey: ['stream-analytics', creator?.id, timeRange],
    queryFn: async () => {
      const startDate = format(subDays(new Date(), parseInt(timeRange)), 'yyyy-MM-dd');
      return base44.entities.StreamAnalytics.filter(
        { creator_id: creator.user_email },
        '-created_date',
        100
      );
    },
    enabled: !!creator?.id
  });

  // Fetch recent streams
  const { data: recentStreams = [] } = useQuery({
    queryKey: ['recent-streams', creator?.id],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creator.id }, '-created_date', 20),
    enabled: !!creator?.id
  });

  // Fetch gift transactions for revenue data
  const { data: giftTransactions = [] } = useQuery({
    queryKey: ['gift-transactions', creator?.user_email, timeRange],
    queryFn: () => base44.entities.GiftTransaction.filter(
      { recipient_email: creator.user_email },
      '-created_date',
      500
    ),
    enabled: !!creator?.user_email
  });

  // Fetch tips
  const { data: tips = [] } = useQuery({
    queryKey: ['tips', creator?.user_email, timeRange],
    queryFn: () => base44.entities.Tip.filter(
      { recipient_email: creator.user_email },
      '-created_date',
      200
    ),
    enabled: !!creator?.user_email
  });

  // Calculate aggregated metrics
  const aggregatedMetrics = useMemo(() => {
    const totalViewers = streamAnalytics.reduce((sum, s) => sum + (s.total_viewers || 0), 0);
    const peakViewers = Math.max(...streamAnalytics.map(s => s.peak_viewers || 0), 0);
    const avgWatchTime = streamAnalytics.length > 0
      ? streamAnalytics.reduce((sum, s) => sum + (s.average_watch_time_minutes || 0), 0) / streamAnalytics.length
      : 0;
    const totalChatMessages = streamAnalytics.reduce((sum, s) => sum + (s.chat_messages || 0), 0);
    const uniqueChatters = streamAnalytics.reduce((sum, s) => sum + (s.unique_chatters || 0), 0);
    const avgRetention = streamAnalytics.length > 0
      ? streamAnalytics.reduce((sum, s) => sum + (s.viewer_retention_percent || 0), 0) / streamAnalytics.length
      : 0;
    const avgEngagement = streamAnalytics.length > 0
      ? streamAnalytics.reduce((sum, s) => sum + (s.engagement_rate || 0), 0) / streamAnalytics.length
      : 0;
    
    // Revenue
    const giftRevenue = giftTransactions.reduce((sum, g) => sum + (g.total_cost_as || 0), 0);
    const tipRevenue = tips.reduce((sum, t) => sum + (t.amount_denarii || 0), 0);
    
    // Top gifters
    const gifterMap = {};
    giftTransactions.forEach(g => {
      if (!gifterMap[g.sender_email]) {
        gifterMap[g.sender_email] = { 
          user_email: g.sender_email, 
          display_name: g.sender_name || g.sender_email?.split('@')[0],
          total_value: 0 
        };
      }
      gifterMap[g.sender_email].total_value += g.total_cost_as || 0;
    });
    const topGifters = Object.values(gifterMap)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 10);
    
    // Peak hours aggregation
    const hourlyViewers = Array(24).fill(0);
    const hourlyCount = Array(24).fill(0);
    streamAnalytics.forEach(s => {
      if (s.peak_hours) {
        s.peak_hours.forEach(ph => {
          if (ph.hour >= 0 && ph.hour < 24) {
            hourlyViewers[ph.hour] += ph.viewers || 0;
            hourlyCount[ph.hour]++;
          }
        });
      }
    });
    const peakHours = hourlyViewers.map((total, hour) => ({
      hour,
      viewers: hourlyCount[hour] > 0 ? Math.round(total / hourlyCount[hour]) : 0
    }));
    
    // Demographics aggregation
    const demographics = {
      top_countries: [],
      age_groups: { '18_24': 25, '25_34': 35, '35_44': 20, '45_54': 12, '55_plus': 8 },
      gender: { male: 62, female: 33, other: 5 },
      devices: { mobile: 68, desktop: 25, tablet: 7 }
    };
    
    // Aggregate country data
    const countryMap = {};
    streamAnalytics.forEach(s => {
      if (s.viewer_demographics?.top_countries) {
        s.viewer_demographics.top_countries.forEach(c => {
          if (!countryMap[c.country]) countryMap[c.country] = { country: c.country, viewers: 0 };
          countryMap[c.country].viewers += c.viewers || 0;
        });
      }
    });
    const totalCountryViewers = Object.values(countryMap).reduce((sum, c) => sum + c.viewers, 0);
    demographics.top_countries = Object.values(countryMap)
      .map(c => ({ ...c, percent: totalCountryViewers > 0 ? Math.round(c.viewers / totalCountryViewers * 100) : 0 }))
      .sort((a, b) => b.viewers - a.viewers)
      .slice(0, 5);
    
    return {
      totalViewers,
      peakViewers,
      avgWatchTime,
      totalChatMessages,
      uniqueChatters,
      avgRetention,
      avgEngagement,
      giftRevenue,
      tipRevenue,
      topGifters,
      peakHours,
      demographics
    };
  }, [streamAnalytics, giftTransactions, tips]);

  // Real-time viewer subscription (for live streams)
  const [liveViewers, setLiveViewers] = useState(0);
  useEffect(() => {
    if (!creator?.current_stream_id) return;
    
    const unsubscribe = base44.entities.Stream.subscribe((event) => {
      if (event.data?.id === creator.current_stream_id) {
        setLiveViewers(event.data.viewer_count || 0);
      }
    });
    
    return () => unsubscribe();
  }, [creator?.current_stream_id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchAnalytics();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (creatorLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <Skeleton className="h-10 w-64 bg-stone-800" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 bg-stone-800" />
            ))}
          </div>
          <Skeleton className="h-96 bg-stone-800" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12 flex items-center justify-center">
        <Card className="bg-stone-800/50 border-amber-600/20 max-w-md">
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-amber-100 mb-2">No Creator Profile</h2>
            <p className="text-amber-400/70 mb-4">Create your creator profile to access analytics</p>
            <Link to={createPageUrl('Profile')}>
              <Button className="bg-amber-600 hover:bg-amber-700">Create Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('CreatorStudio')}>
              <Button variant="ghost" size="icon" className="text-amber-400">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-400" />
                Creator Analytics
              </h1>
              <p className="text-amber-400/70 text-sm">
                Comprehensive insights for {creator.display_name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40 bg-stone-800/50 border-amber-600/20 text-amber-100">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-amber-600/30">
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value} className="text-amber-100">
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              className="border-amber-600/30 text-amber-400"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <RealTimeViewerCard 
            currentViewers={creator.is_live ? liveViewers : 0}
            peakViewers={aggregatedMetrics.peakViewers}
            previousViewers={0}
          />
          
          <Card className="bg-gradient-to-br from-amber-900/40 to-stone-900 border-amber-600/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-amber-100">
                    {(aggregatedMetrics.giftRevenue + aggregatedMetrics.tipRevenue).toLocaleString()}
                  </p>
                  <p className="text-amber-400/50 text-xs">Denarii earned</p>
                </div>
                <DollarSign className="w-10 h-10 text-amber-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-900/40 to-stone-900 border-purple-600/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Total Viewers</p>
                  <p className="text-3xl font-bold text-amber-100">
                    {aggregatedMetrics.totalViewers.toLocaleString()}
                  </p>
                  <p className="text-amber-400/50 text-xs">In selected period</p>
                </div>
                <Eye className="w-10 h-10 text-purple-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-900/40 to-stone-900 border-blue-600/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-400/70 text-sm">Followers</p>
                  <p className="text-3xl font-bold text-amber-100">
                    {(creator.follower_count || 0).toLocaleString()}
                  </p>
                  <p className="text-amber-400/50 text-xs">Total followers</p>
                </div>
                <Users className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-600">
              Overview
            </TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:bg-amber-600">
              Revenue
            </TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-amber-600">
              Audience
            </TabsTrigger>
            <TabsTrigger value="engagement" className="data-[state=active]:bg-amber-600">
              Engagement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PeakViewershipChart 
                peakHours={aggregatedMetrics.peakHours}
                streamHistory={recentStreams}
              />
              <EngagementMetrics
                chatMessages={aggregatedMetrics.totalChatMessages}
                chatMessagesPerMinute={aggregatedMetrics.totalChatMessages / Math.max(recentStreams.length, 1) / 60}
                uniqueChatters={aggregatedMetrics.uniqueChatters}
                avgWatchTime={aggregatedMetrics.avgWatchTime}
                viewerRetention={Math.round(aggregatedMetrics.avgRetention)}
                engagementRate={Math.round(aggregatedMetrics.avgEngagement)}
              />
            </div>
            <StreamHistoryTable streams={streamAnalytics} />
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <RevenueBreakdown
              giftRevenue={aggregatedMetrics.giftRevenue}
              tipRevenue={aggregatedMetrics.tipRevenue}
              subscriptionRevenue={0}
              topGifters={aggregatedMetrics.topGifters}
            />
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AudienceDemographics demographics={aggregatedMetrics.demographics} />
              <PeakViewershipChart 
                peakHours={aggregatedMetrics.peakHours}
                streamHistory={recentStreams}
              />
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EngagementMetrics
                chatMessages={aggregatedMetrics.totalChatMessages}
                chatMessagesPerMinute={aggregatedMetrics.totalChatMessages / Math.max(recentStreams.length, 1) / 60}
                uniqueChatters={aggregatedMetrics.uniqueChatters}
                avgWatchTime={aggregatedMetrics.avgWatchTime}
                viewerRetention={Math.round(aggregatedMetrics.avgRetention)}
                engagementRate={Math.round(aggregatedMetrics.avgEngagement)}
              />
              <StreamHistoryTable streams={streamAnalytics} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}