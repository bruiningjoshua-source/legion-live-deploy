import React, { memo, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import RecommendationEngine from '@/components/services/RecommendationEngine';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Crown, Radio, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import formatCount from '@/components/shared/FormatCount';

function CreatorMiniCard({ creator, user, followSet }) {
  const queryClient = useQueryClient();
  const isFollowing = followSet.has(creator.id);

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
      if (isFollowing) {
        const follows = await base44.entities.Follow.filter({ follower_email: user.email, following_creator_id: creator.id }, null, 1);
        if (follows[0]) await base44.entities.Follow.delete(follows[0].id);
      } else {
        await base44.entities.Follow.create({ follower_email: user.email, following_creator_id: creator.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-follows'] });
      toast.success(isFollowing ? 'Unfollowed' : `Following ${creator.display_name}`);
    },
    onError: (err) => toast.error(err.message || 'Something went wrong'),
  });

  return (
    <div className="flex-shrink-0 w-36 sm:w-40">
      <Link to={createPageUrl(`CreatorProfile?id=${creator.id}`)}>
        <div className="relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center hover:border-amber-500/30 transition-all">
          {creator.is_live && (
            <div className="absolute top-2 right-2">
              <span className="flex items-center gap-1 bg-red-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                <Radio className="w-2.5 h-2.5" />
                LIVE
              </span>
            </div>
          )}
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 mb-2">
            <div className="w-full h-full rounded-full overflow-hidden bg-stone-800">
              {creator.avatar_url ? (
                <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <span className="text-white font-semibold text-sm truncate max-w-[100px]">{creator.display_name}</span>
            {creator.is_verified && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
          </div>
          <p className="text-white/40 text-xs mb-3">{formatCount(creator.follower_count)} followers</p>
        </div>
      </Link>
      <Button
        onClick={(e) => { e.preventDefault(); followMutation.mutate(); }}
        disabled={followMutation.isPending}
        size="sm"
        className={`w-full mt-2 rounded-xl text-xs h-8 ${
          isFollowing
            ? 'bg-white/10 text-amber-400 border border-amber-500/30 hover:bg-white/15'
            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
        }`}
      >
        {isFollowing ? <><UserCheck className="w-3 h-3 mr-1" /> Following</> : <><UserPlus className="w-3 h-3 mr-1" /> Follow</>}
      </Button>
    </div>
  );
}

const CreatorsYouMayLike = memo(function CreatorsYouMayLike({ user }) {
  const { data: allCreators = [] } = useQuery({
    queryKey: ['creators-you-may-like'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 30),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: follows = [] } = useQuery({
    queryKey: ['home-follows', user?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: user.email }),
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const { data: interests = [] } = useQuery({
    queryKey: ['user-interests-rec', user?.email],
    queryFn: () => base44.entities.UserInterest.filter({ user_email: user.email }),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const followSet = new Set(follows.map(f => f.following_creator_id));

  // Use recommendation engine to rank creators
  const creators = useMemo(() => {
    const profile = {
      followedCreatorIds: followSet,
      interests: interests.map(i => i.category || i.interest_name).filter(Boolean),
    };
    return RecommendationEngine.rankCreators(allCreators, profile).slice(0, 10);
  }, [allCreators, followSet, interests]);

  if (creators.length === 0) return null;

  return (
    <div className="mb-8 sm:mb-12">
      <h2 className="text-white font-bold text-lg sm:text-xl mb-4">Creators You May Like</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {creators.map((creator) => (
          <div key={creator.id} className="snap-start">
            <CreatorMiniCard creator={creator} user={user} followSet={followSet} />
          </div>
        ))}
      </div>
    </div>
  );
});

export default CreatorsYouMayLike;