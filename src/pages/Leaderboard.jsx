import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Gift, Users, Crown, Medal, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Leaderboard() {
  const [timeframe, setTimeframe] = useState('all-time');

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['creators-leaderboard'],
    queryFn: () => base44.entities.Creator.list('-total_earnings_denarii', 100),
    staleTime: 60 * 1000
  });

  const { data: giftTransactions = [] } = useQuery({
    queryKey: ['gift-transactions-leaderboard'],
    queryFn: () => base44.entities.GiftTransaction.list('-created_date', 500),
    staleTime: 60 * 1000
  });

  // Calculate gifts received per creator
  const giftStats = giftTransactions.reduce((acc, tx) => {
    if (!acc[tx.receiver_creator_id]) {
      acc[tx.receiver_creator_id] = { count: 0, value: 0 };
    }
    acc[tx.receiver_creator_id].count += tx.quantity || 1;
    acc[tx.receiver_creator_id].value += tx.total_as_value || 0;
    return acc;
  }, {});

  const topEarners = [...creators].sort((a, b) => 
    (b.total_earnings_denarii || 0) - (a.total_earnings_denarii || 0)
  ).slice(0, 50);

  const topByViewers = [...creators].sort((a, b) => 
    (b.follower_count || 0) - (a.follower_count || 0)
  ).slice(0, 50);

  const topByGifts = [...creators]
    .map(c => ({ ...c, giftCount: giftStats[c.id]?.count || 0 }))
    .sort((a, b) => b.giftCount - a.giftCount)
    .slice(0, 50);

  const getRankMedal = (rank) => {
    if (rank === 1) return { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-600/20' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-300', bg: 'bg-gray-600/20' };
    if (rank === 3) return { icon: Award, color: 'text-orange-400', bg: 'bg-orange-600/20' };
    return { icon: Trophy, color: 'text-stone-400', bg: 'bg-stone-600/20' };
  };

  const CreatorRankCard = ({ creator, rank, stat, statLabel }) => {
    const medal = getRankMedal(rank);
    const Icon = medal.icon;

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: rank * 0.03 }}
      >
        <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
          <Card className="bg-stone-800/30 border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-full ${medal.bg} flex items-center justify-center`}>
                  {rank <= 3 ? (
                    <Icon className={`w-6 h-6 ${medal.color}`} />
                  ) : (
                    <span className="text-amber-100 font-bold text-lg">#{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 flex-shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">👤</div>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-amber-100 font-semibold truncate">{creator.display_name}</h3>
                    {creator.is_verified && <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                    {creator.is_live && (
                      <Badge className="bg-red-500 text-white border-0 text-xs animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </div>
                  <p className="text-amber-400/60 text-sm capitalize">{creator.category?.replace('_', ' ')}</p>
                </div>

                {/* Stat */}
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-amber-100">{stat.toLocaleString()}</p>
                  <p className="text-amber-400/60 text-xs">{statLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-600/20 border border-amber-500/30 rounded-full px-4 py-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-amber-200 text-sm font-medium">Creator Leaderboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Top Creators</h1>
          <p className="text-amber-400/70">Compete to become the ultimate Legion champion</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="earnings" className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl w-full grid grid-cols-3">
            <TabsTrigger 
              value="earnings"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Earnings
            </TabsTrigger>
            <TabsTrigger 
              value="followers"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg"
            >
              <Users className="w-4 h-4 mr-2" />
              Followers
            </TabsTrigger>
            <TabsTrigger 
              value="gifts"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg"
            >
              <Gift className="w-4 h-4 mr-2" />
              Gifts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-3">
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-stone-800" />
              ))
            ) : (
              topEarners.map((creator, idx) => (
                <CreatorRankCard
                  key={creator.id}
                  creator={creator}
                  rank={idx + 1}
                  stat={creator.total_earnings_denarii || 0}
                  statLabel="🪙 Denarii"
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="followers" className="space-y-3">
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-stone-800" />
              ))
            ) : (
              topByViewers.map((creator, idx) => (
                <CreatorRankCard
                  key={creator.id}
                  creator={creator}
                  rank={idx + 1}
                  stat={creator.follower_count || 0}
                  statLabel="Followers"
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="gifts" className="space-y-3">
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-stone-800" />
              ))
            ) : (
              topByGifts.map((creator, idx) => (
                <CreatorRankCard
                  key={creator.id}
                  creator={creator}
                  rank={idx + 1}
                  stat={creator.giftCount}
                  statLabel="Gifts Received"
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}