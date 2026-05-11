import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  Users, 
  Heart,
  MessageSquare,
  Zap,
  Target,
  CheckCircle,
  X,
  Radio,
  Video,
  Swords,
  Mic,
  Trophy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const COLLAB_TYPES = {
  dual_stream: { icon: Radio, label: 'Dual Stream', color: 'red' },
  video_collab: { icon: Video, label: 'Video Collab', color: 'blue' },
  pk_battle: { icon: Swords, label: 'PK Battle', color: 'purple' },
  podcast: { icon: Mic, label: 'Podcast', color: 'green' },
  challenge: { icon: Trophy, label: 'Challenge', color: 'amber' }
};

function MatchCard({ match, creator, myCreator, onAccept, onDecline }) {
  const collabType = COLLAB_TYPES[match.suggested_collab_type] || COLLAB_TYPES.dual_stream;
  const CollabIcon = collabType.icon;
  const isIncoming = match.creator_b_id === myCreator?.user_email;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <GlassCard glowColor={collabType.color} hover>
        {/* Match Score */}
        <div className="absolute top-4 right-4">
          <div className="relative">
            <svg className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
              <circle 
                cx="32" cy="32" r="28" 
                stroke="currentColor" 
                strokeWidth="4" 
                fill="none" 
                strokeDasharray={`${match.compatibility_score * 1.76} 176`}
                className={`text-${collabType.color}-400`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold">{match.compatibility_score}%</span>
            </div>
          </div>
        </div>

        {/* Creator Info */}
        <div className="flex items-start gap-4 mb-4 pr-20">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 overflow-hidden shrink-0">
            {creator?.avatar_url ? (
              <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
            )}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{creator?.display_name || 'Creator'}</h3>
            <p className="text-white/50 text-sm">{creator?.follower_count || 0} followers</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-white/10 text-white/60 text-xs capitalize">
              {creator?.category}
            </span>
          </div>
        </div>

        {/* Suggested Collab Type */}
        <div className={`flex items-center gap-2 bg-${collabType.color}-500/20 border border-${collabType.color}-500/30 rounded-xl p-3 mb-4`}>
          <CollabIcon className={`w-5 h-5 text-${collabType.color}-400`} />
          <span className="text-white font-medium">{collabType.label}</span>
          <span className="text-white/40 text-sm ml-auto">Recommended</span>
        </div>

        {/* Shared Interests */}
        {match.shared_interests?.length > 0 && (
          <div className="mb-4">
            <p className="text-white/50 text-xs mb-2">Shared Interests</p>
            <div className="flex flex-wrap gap-2">
              {match.shared_interests.slice(0, 5).map((interest, i) => (
                <span key={i} className="px-2 py-1 bg-white/10 rounded-lg text-white/70 text-xs">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Match Reason */}
        {match.match_reason && (
          <p className="text-white/50 text-sm mb-4 italic">"{match.match_reason}"</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {match.status === 'suggested' && isIncoming ? (
            <>
              <PremiumButton
                variant="ghost"
                onClick={() => onDecline(match)}
                leftIcon={<X className="w-4 h-4" />}
                className="flex-1"
              >
                Decline
              </PremiumButton>
              <PremiumButton
                onClick={() => onAccept(match)}
                leftIcon={<CheckCircle className="w-4 h-4" />}
                className="flex-1"
              >
                Accept
              </PremiumButton>
            </>
          ) : match.status === 'accepted' ? (
            <PremiumButton
              className="w-full"
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Start Planning
            </PremiumButton>
          ) : match.status === 'suggested' ? (
            <span className="text-amber-400 text-sm">Waiting for response...</span>
          ) : (
            <span className="text-white/40 text-sm capitalize">{match.status}</span>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function CollabMatching() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: myCreator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['collab-matches', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const [outgoing, incoming] = await Promise.all([
        base44.entities.CollabMatch.filter({ creator_a_id: user.email }),
        base44.entities.CollabMatch.filter({ creator_b_id: user.email })
      ]);
      return [...outgoing, ...incoming];
    },
    enabled: !!user?.email
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['all-creators-for-matching'],
    queryFn: () => base44.entities.Creator.filter({}, '-follower_count', 200)
  });

  const creatorMap = useMemo(() => 
    creators.reduce((acc, c) => { acc[c.user_email] = c; return acc; }, {}),
    [creators]
  );

  const updateMatchMutation = useMutation({
    mutationFn: async ({ match, status }) => {
      await base44.entities.CollabMatch.update(match.id, { status });
      return { match, status };
    },
    onSuccess: ({ status }) => {
      toast.success(status === 'accepted' ? '🎉 Collaboration accepted!' : 'Match declined');
      queryClient.invalidateQueries({ queryKey: ['collab-matches'] });
    }
  });

  const generateMatchesMutation = useMutation({
    mutationFn: async () => {
      // AI-powered match generation (simplified)
      const potentialMatches = creators.filter(c => 
        c.user_email !== user.email && 
        c.category === myCreator?.category
      );

      const newMatches = [];
      for (const creator of potentialMatches.slice(0, 3)) {
        const existingMatch = matches.find(m => 
          m.creator_a_id === creator.user_email || m.creator_b_id === creator.user_email
        );
        if (existingMatch) continue;

        const score = Math.floor(Math.random() * 30) + 70; // 70-100
        const collabTypes = Object.keys(COLLAB_TYPES);
        
        const match = await base44.entities.CollabMatch.create({
          creator_a_id: user.email,
          creator_b_id: creator.user_email,
          compatibility_score: score,
          shared_interests: [myCreator?.category, 'streaming', 'content creation'].filter(Boolean),
          suggested_collab_type: collabTypes[Math.floor(Math.random() * collabTypes.length)],
          match_reason: `Great potential synergy based on similar content styles and audience demographics.`
        });
        newMatches.push(match);
      }
      return newMatches;
    },
    onSuccess: () => {
      toast.success('Found new potential collaborators!');
      queryClient.invalidateQueries({ queryKey: ['collab-matches'] });
    }
  });

  const incomingMatches = matches.filter(m => m.creator_b_id === user?.email && m.status === 'suggested');
  const outgoingMatches = matches.filter(m => m.creator_a_id === user?.email);
  const acceptedMatches = matches.filter(m => m.status === 'accepted');

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
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-4"
          >
            <Sparkles className="w-16 h-16 text-purple-400" />
          </motion.div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-purple-400 to-pink-400 mb-2">
            AI Collab Matching
          </h1>
          <p className="text-white/50 mb-6">Find your perfect collaboration partner</p>
          
          {myCreator && (
            <PremiumButton
              onClick={() => generateMatchesMutation.mutate()}
              loading={generateMatchesMutation.isPending}
              leftIcon={<Zap className="w-5 h-5" />}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              Find New Matches
            </PremiumButton>
          )}
        </motion.div>

        {!myCreator ? (
          <GlassCard className="text-center py-16" glowColor="purple">
            <Users className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-xl mb-2">Create Your Creator Profile</h3>
            <p className="text-white/50 mb-6">You need a creator profile to find collaboration matches.</p>
            <Link to={createPageUrl('Profile')}>
              <PremiumButton>Create Profile</PremiumButton>
            </Link>
          </GlassCard>
        ) : (
          <>
            {/* Incoming Requests */}
            {incomingMatches.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  Incoming Requests ({incomingMatches.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {incomingMatches.map(match => {
                    const otherEmail = match.creator_a_id === user.email ? match.creator_b_id : match.creator_a_id;
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        creator={creatorMap[otherEmail]}
                        myCreator={myCreator}
                        onAccept={(m) => updateMatchMutation.mutate({ match: m, status: 'accepted' })}
                        onDecline={(m) => updateMatchMutation.mutate({ match: m, status: 'declined' })}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Collaborations */}
            {acceptedMatches.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Active Collaborations ({acceptedMatches.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {acceptedMatches.map(match => {
                    const otherEmail = match.creator_a_id === user.email ? match.creator_b_id : match.creator_a_id;
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        creator={creatorMap[otherEmail]}
                        myCreator={myCreator}
                        onAccept={() => {}}
                        onDecline={() => {}}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Suggested Matches */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Your Matches
              </h2>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-72 rounded-2xl bg-white/10" />
                  ))}
                </div>
              ) : outgoingMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {outgoingMatches.map(match => {
                    const otherEmail = match.creator_b_id;
                    return (
                      <MatchCard
                        key={match.id}
                        match={match}
                        creator={creatorMap[otherEmail]}
                        myCreator={myCreator}
                        onAccept={() => {}}
                        onDecline={() => {}}
                      />
                    );
                  })}
                </div>
              ) : (
                <GlassCard className="text-center py-12" glowColor="purple">
                  <Sparkles className="w-12 h-12 text-purple-400/30 mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">No matches yet</h3>
                  <p className="text-white/50 mb-4">Click "Find New Matches" to discover collaborators!</p>
                </GlassCard>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}