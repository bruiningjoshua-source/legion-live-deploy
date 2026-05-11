import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, 
  Crown, 
  Users,
  Search,
  CheckCircle,
  MessageSquare,
  Sparkles,
  BadgeCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const TIER_CONFIG = {
  1: { name: 'Bronze', icon: '🥉', color: 'from-amber-700 to-amber-900', price: 2.99, perks: ['Exclusive badge', 'Priority chat', 'Monthly shoutout'] },
  2: { name: 'Silver', icon: '🥈', color: 'from-gray-400 to-gray-600', price: 4.99, perks: ['All Bronze perks', 'Custom emotes', 'Discord access', 'Behind-the-scenes'] },
  3: { name: 'Gold', icon: '🥇', color: 'from-yellow-400 to-amber-600', price: 9.99, perks: ['All Silver perks', 'Monthly video call', 'Early content access', 'Gift discounts'] }
};

function CreatorFanClubCard({ creator, membership, onJoin }) {
  const hasMembership = !!membership;

  return (
    <motion.div whileHover={{ y: -6 }}>
      <GlassCard className="overflow-hidden" padding="p-0" glowColor="pink" hover>
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 relative">
          {hasMembership && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-emerald-500 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-medium">{TIER_CONFIG[membership.tier]?.name} Member</span>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative -mt-12 px-5">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden ring-4 ring-[#0a0a0c] shadow-xl">
            {creator.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
            )}
          </div>
          {creator.is_verified && (
            <div className="absolute bottom-0 right-4 bg-blue-500 p-1.5 rounded-full ring-2 ring-[#0a0a0c]">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 pt-3">
          <h3 className="text-white font-bold text-lg mb-1">{creator.display_name}</h3>
          <p className="text-white/50 text-sm mb-4 line-clamp-2">{creator.bio}</p>

          {/* Stats */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-1.5 text-white/60">
              <Users className="w-4 h-4" />
              {formatCount(creator.follower_count)} fans
            </div>
            <div className="flex items-center gap-1.5 text-white/60">
              <Heart className="w-4 h-4 text-pink-400" />
              Fan Club
            </div>
          </div>

          {/* Tiers Preview */}
          <div className="flex gap-2 mb-4">
            {Object.entries(TIER_CONFIG).map(([tier, config]) => (
              <div
                key={tier}
                className={`flex-1 text-center p-2 rounded-lg bg-gradient-to-br ${config.color} ${
                  membership?.tier >= parseInt(tier) ? 'ring-2 ring-white/30' : 'opacity-60'
                }`}
              >
                <span className="text-lg">{config.icon}</span>
                <p className="text-white/80 text-xs">${config.price}/mo</p>
              </div>
            ))}
          </div>

          {/* Action */}
          {hasMembership ? (
            <Link to={createPageUrl(`CreatorCommunity?id=${creator.id}`)}>
              <PremiumButton className="w-full" leftIcon={<MessageSquare className="w-4 h-4" />}>
                Enter Community
              </PremiumButton>
            </Link>
          ) : (
            <PremiumButton
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600"
              leftIcon={<Heart className="w-4 h-4" />}
              onClick={() => onJoin(creator)}
            >
              Join Fan Club
            </PremiumButton>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function JoinModal({ creator, onClose, onJoin }) {
  const [selectedTier, setSelectedTier] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
      >
        <GlassCard glowColor="pink">
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden mx-auto mb-3 ring-4 ring-pink-500/30">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white">Join {creator.display_name}'s Fan Club</h2>
          </div>

          {/* Tier Selection */}
          <div className="space-y-3 mb-6">
            {Object.entries(TIER_CONFIG).map(([tier, config]) => (
              <motion.div
                key={tier}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTier(parseInt(tier))}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedTier === parseInt(tier)
                    ? `bg-gradient-to-r ${config.color} ring-2 ring-white/30`
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h3 className="text-white font-bold">{config.name}</h3>
                      <p className="text-white/60 text-sm">${config.price}/month</p>
                    </div>
                  </div>
                  {selectedTier === parseInt(tier) && (
                    <CheckCircle className="w-6 h-6 text-white" />
                  )}
                </div>
                <ul className="space-y-1 ml-11">
                  {config.perks.map((perk, i) => (
                    <li key={i} className="text-white/70 text-sm flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-3">
            <PremiumButton variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </PremiumButton>
            <PremiumButton
              onClick={() => onJoin(creator, selectedTier)}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
              leftIcon={<Heart className="w-4 h-4" />}
            >
              Join for ${TIER_CONFIG[selectedTier].price}/mo
            </PremiumButton>
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

export default function FanClubs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [joinCreator, setJoinCreator] = useState(null);
  const queryClient = useQueryClient();

  // Handle success/cancel from Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast.success('🎉 Welcome to the fan club!');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (urlParams.get('cancelled') === 'true') {
      toast.info('Checkout cancelled');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['creators-with-fanclubs'],
    queryFn: () => base44.entities.Creator.filter({}, '-follower_count', 100)
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ['my-fan-memberships', user?.email],
    queryFn: () => base44.entities.FanClubMembership.filter({ user_email: user.email, status: 'active' }),
    enabled: !!user?.email
  });

  const membershipMap = useMemo(() => 
    myMemberships.reduce((acc, m) => { acc[m.creator_id] = m; return acc; }, {}),
    [myMemberships]
  );

  const joinMutation = useMutation({
    mutationFn: async ({ creator, tier }) => {
      // Check if in iframe
      if (window.self !== window.top) {
        throw new Error('Checkout must be done from the published app, not preview.');
      }

      const tierConfig = TIER_CONFIG[tier];
      const response = await base44.functions.invoke('createFanClubCheckout', {
        creator_id: creator.id,
        tier,
        price_usd: tierConfig.price,
        tier_name: tierConfig.name,
        perks: tierConfig.perks
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to start checkout');
    }
  });

  const filteredCreators = useMemo(() => {
    if (!searchQuery) return creators;
    return creators.filter(c => 
      c.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [creators, searchQuery]);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Heart className="w-16 h-16 text-pink-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-pink-400 to-purple-400 mb-2">
            Fan Clubs
          </h1>
          <p className="text-white/50">Support your favorite creators with exclusive memberships</p>
        </motion.div>

        {/* My Memberships */}
        {myMemberships.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              My Memberships ({myMemberships.length})
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {myMemberships.map(membership => {
                const creator = creators.find(c => c.id === membership.creator_id);
                if (!creator) return null;
                return (
                  <Link key={membership.id} to={createPageUrl(`CreatorCommunity?id=${creator.id}`)}>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl px-4 py-3 whitespace-nowrap"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 overflow-hidden">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">👤</div>
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{creator.display_name}</p>
                        <p className="text-pink-300 text-xs">{TIER_CONFIG[membership.tier]?.icon} {membership.tier_name}</p>
                      </div>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pink-400/50" />
            <Input
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500/50 rounded-xl"
            />
          </div>
        </div>

        {/* Creators Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreators.map((creator, i) => (
              <motion.div
                key={creator.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4), duration: 0.3 }}
              >
                <CreatorFanClubCard
                  creator={creator}
                  membership={membershipMap[creator.id]}
                  onJoin={(c) => setJoinCreator(c)}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Join Modal */}
        {joinCreator && (
          <JoinModal
            creator={joinCreator}
            onClose={() => setJoinCreator(null)}
            onJoin={(c, tier) => joinMutation.mutate({ creator: c, tier })}
          />
        )}
      </div>
    </div>
  );
}