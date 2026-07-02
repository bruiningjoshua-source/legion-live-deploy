import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Gift, Users, Crown, Medal, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import formatCount from '@/components/shared/FormatCount';
import GlassCard from '@/components/shared/GlassCard';

function CreatorRankCard({ creator, rank, stat, statLabel }) {
  const medals = {
    1: { icon: Crown, color: 'text-amber-400', bg: 'bg-gradient-to-br from-amber-500/30 to-amber-600/10', ring: 'ring-2 ring-amber-500/40' },
    2: { icon: Medal, color: 'text-gray-300', bg: 'bg-gradient-to-br from-gray-400/20 to-gray-500/10', ring: 'ring-2 ring-gray-400/30' },
    3: { icon: Award, color: 'text-orange-400', bg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10', ring: 'ring-2 ring-orange-500/30' },
  };
  const medal = medals[rank] || { icon: Trophy, color: 'text-white/40', bg: 'bg-white/5', ring: '' };
  const Icon = medal.icon;
  const isTop3 = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5), duration: 0.25 }}
    >
      <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
        <div className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:border-white/20 ${
          isTop3 
            ? `${medal.bg} border-white/10 ${medal.ring}` 
            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
        }`}>
          {/* Rank */}
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${isTop3 ? medal.bg : 'bg-white/5'} flex items-center justify-center`}>
            {isTop3 ? (
              <Icon className={`w-5 h-5 ${medal.color}`} />
            ) : (
              <span className="text-white/50 font-bold text-sm">#{rank}</span>
            )}
          </div>

          {/* Avatar */}
          <div className={`w-11 h-11 rounded-full ${isTop3 ? 'p-0.5 bg-gradient-to-br from-amber-400 to-amber-600' : 'p-0.5 bg-white/10'} flex-shrink-0`}>
            <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
                  {creator.display_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-white font-semibold truncate text-sm">{creator.display_name}</h3>
              {creator.is_verified && <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
              {creator.is_live && (
                <Badge className="bg-red-500 text-white border-0 text-[9px] px-1.5 py-0 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-white" />
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-white/40 text-xs capitalize">{creator.category?.replace('_', ' ')}</p>
          </div>

          {/* Stat */}
          <div className="text-right flex-shrink-0">
            <p className={`text-xl font-black ${isTop3 ? 'text-amber-300' : 'text-white'}`}>{formatCount(stat)}</p>
            <p className="text-white/40 text-[10px]">{statLabel}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Leaderboard() {
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

  const giftStats = giftTransactions.reduce((acc, tx) => {
    if (!acc[tx.receiver_creator_id]) acc[tx.receiver_creator_id] = { count: 0, value: 0 };
    acc[tx.receiver_creator_id].count += tx.quantity || 1;
    acc[tx.receiver_creator_id].value += tx.total_as_value || 0;
    return acc;
  }, {});

  const topEarners = [...creators].sort((a, b) => (b.total_earnings_denarii || 0) - (a.total_earnings_denarii || 0)).slice(0, 50);
  const topByViewers = [...creators].sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0)).slice(0, 50);
  const topByGifts = [...creators].map(c => ({ ...c, giftCount: giftStats[c.id]?.count || 0 })).sort((a, b) => b.giftCount - a.giftCount).slice(0, 50);

  const SkeletonList = () => (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />)}
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 mb-5 shadow-2xl shadow-amber-500/30"
          >
            <Trophy className="w-10 h-10 text-white drop-shadow-lg" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 mb-2">
            Leaderboard
          </h1>
          <p className="text-white/50">Compete to become the ultimate Legion champion</p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="earnings" className="space-y-6">
          <div className="flex justify-center mb-2">
            <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
              <TabsList className="bg-transparent p-0 gap-1">
                <TabsTrigger 
                  value="earnings"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-5 py-2.5 text-white/60 gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  Earnings
                </TabsTrigger>
                <TabsTrigger 
                  value="followers"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-5 py-2.5 text-white/60 gap-2"
                >
                  <Users className="w-4 h-4" />
                  Followers
                </TabsTrigger>
                <TabsTrigger 
                  value="gifts"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-5 py-2.5 text-white/60 gap-2"
                >
                  <Gift className="w-4 h-4" />
                  Gifts
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="earnings" className="space-y-2.5">
            {isLoading ? <SkeletonList /> : topEarners.length === 0 ? (
              <GlassCard className="text-center py-16">
                <Trophy className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                <p className="text-white/50">No creators yet</p>
              </GlassCard>
            ) : topEarners.map((creator, idx) => (
              <CreatorRankCard key={creator.id} creator={creator} rank={idx + 1} stat={creator.total_earnings_denarii || 0} statLabel="🪙 Denarii" />
            ))}
          </TabsContent>

          <TabsContent value="followers" className="space-y-2.5">
            {isLoading ? <SkeletonList /> : topByViewers.map((creator, idx) => (
              <CreatorRankCard key={creator.id} creator={creator} rank={idx + 1} stat={creator.follower_count || 0} statLabel="Followers" />
            ))}
          </TabsContent>

          <TabsContent value="gifts" className="space-y-2.5">
            {isLoading ? <SkeletonList /> : topByGifts.map((creator, idx) => (
              <CreatorRankCard key={creator.id} creator={creator} rank={idx + 1} stat={creator.giftCount} statLabel="Gifts Received" />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}