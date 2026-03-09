/**
 * useStreamData — Centralized data-fetching hooks for streaming.
 * Acts as the data access layer, equivalent to an API client/SDK.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CACHE } from '@/components/services/constants';
import StreamService from '@/components/services/StreamService';
import ChatService from '@/components/services/ChatService';
import GiftService from '@/components/services/GiftService';
import FollowService from '@/components/services/FollowService';
import CreatorService from '@/components/services/CreatorService';
import { toast } from 'sonner';

// ─── Auth ─────────────────────────────────────────────────────
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: CACHE.USER,
    refetchOnWindowFocus: false,
    retry: 2,              // Extra retry to prevent false logged-out flash on network blip
    retryDelay: 1000,
  });
}

// ─── Stream ───────────────────────────────────────────────────
export function useStream(streamId) {
  return useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => base44.entities.Stream.get(streamId),
    enabled: !!streamId,
    staleTime: 10 * 1000,
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
  });
}

export function useLiveStreams(limit = 30) {
  return useQuery({
    queryKey: ['streams-live'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', limit),
    staleTime: CACHE.STREAMS_LIST,
    refetchInterval: CACHE.STREAMS_REFETCH,
    refetchOnWindowFocus: false,
    retry: 1,
    initialData: [],
  });
}

// ─── Creator ──────────────────────────────────────────────────
export function useCreator(creatorId) {
  return useQuery({
    queryKey: ['creator', creatorId],
    queryFn: () => CreatorService.getById(creatorId),
    enabled: !!creatorId,
    staleTime: CACHE.CREATOR,
    refetchOnWindowFocus: false,
  });
}

export function useMyCreator(userEmail) {
  return useQuery({
    queryKey: ['my-creator', userEmail],
    queryFn: () => base44.entities.Creator.filter({ user_email: userEmail }, null, 1).then(r => r[0] || null),
    enabled: !!userEmail,
  });
}

export function useCreators(limit = 30) {
  return useQuery({
    queryKey: ['creators-home'],
    queryFn: () => base44.entities.Creator.list('-follower_count', limit),
    staleTime: CACHE.USER,
    refetchOnWindowFocus: false,
    retry: 1,
    initialData: [],
  });
}

// ─── Wallet ───────────────────────────────────────────────────
export function useWallet(userEmail) {
  return useQuery({
    queryKey: ['wallet', userEmail],
    queryFn: async () => {
      const wallets = await base44.entities.Wallet.filter({ user_email: userEmail }, null, 1);
      return wallets[0] || { denarii_balance: 0, as_balance: 0 };
    },
    enabled: !!userEmail,
    staleTime: 15 * 1000,
    refetchInterval: 15000,
    refetchOnWindowFocus: false,
  });
}

// ─── Gifts ────────────────────────────────────────────────────
export function useGifts() {
  return useQuery({
    queryKey: ['gifts'],
    queryFn: () => base44.entities.Gift.filter({ is_active: true }, 'sort_order', 50),
    staleTime: CACHE.GIFTS,
    refetchOnWindowFocus: false,
    initialData: [],
  });
}

// ─── Chat ─────────────────────────────────────────────────────
// Fetches initial messages only — live updates come via ChatService.subscribe (realtime)
export function useChatMessages(streamId) {
  return useQuery({
    queryKey: ['chat-messages', streamId],
    queryFn: () => base44.entities.ChatMessage.filter({ stream_id: streamId }, 'created_date', 100),
    enabled: !!streamId,
    staleTime: Infinity,    // Never stale — realtime subscription handles updates
    refetchInterval: false, // No polling — avoids duplicates with subscription
    refetchOnWindowFocus: false,
  });
}

// ─── PK Battle ───────────────────────────────────────────────
export function useStreamPKBattle(streamId, streamType) {
  return useQuery({
    queryKey: ['pk-battle', streamId],
    queryFn: async () => {
      // Check active first, then pending
      const active = await base44.entities.PKBattle.filter({ stream_id: streamId, status: 'active' }, '-created_date', 1);
      if (active[0]) return active[0];
      const pending = await base44.entities.PKBattle.filter({ stream_id: streamId, status: 'pending' }, '-created_date', 1);
      return pending[0] || null;
    },
    enabled: streamType === 'pk_battle' && !!streamId,
    refetchInterval: 5000,
  });
}

// ─── Follow ───────────────────────────────────────────────────
export function useFollowStatus(userEmail, creatorId) {
  return useQuery({
    queryKey: ['follow-status', userEmail, creatorId],
    queryFn: () => FollowService.isFollowing(userEmail, creatorId),
    enabled: !!userEmail && !!creatorId,
    staleTime: CACHE.FOLLOW_STATUS,
    refetchOnWindowFocus: false,
  });
}

// ─── Creator Subscription ─────────────────────────────────────
export function useCreatorSubscription(creatorEmail) {
  return useQuery({
    queryKey: ['creator-monetization', creatorEmail],
    queryFn: () => CreatorService.hasActiveSubscription(creatorEmail),
    enabled: !!creatorEmail,
    staleTime: CACHE.FOLLOW_STATUS,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useSendMessage({ streamId, user, wallet }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageData) => ChatService.sendMessage({ streamId, user, wallet, messageData }),
    onError: (error) => toast.error(error.message || 'Unable to send message.'),
  });
}

export function useSendGift({ user, wallet, creator, stream, creatorCanReceiveGifts }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ gift, quantity }) => GiftService.sendGift({
      user, wallet, gift, quantity, creator, stream, creatorCanReceiveGifts,
    }),
    onMutate: async ({ gift, quantity }) => {
      const totalCost = (gift.cost_denarii || 0) * quantity;
      await queryClient.cancelQueries({ queryKey: ['wallet', user?.email] });
      const prevWallet = queryClient.getQueryData(['wallet', user?.email]);
      if (prevWallet) {
        queryClient.setQueryData(['wallet', user?.email], {
          ...prevWallet,
          denarii_balance: Math.max(0, (prevWallet.denarii_balance || 0) - totalCost),
        });
      }
      return { prevWallet };
    },
    onError: (error, _vars, context) => {
      // Rollback optimistic wallet update
      if (context?.prevWallet) {
        queryClient.setQueryData(['wallet', user?.email], context.prevWallet);
      }
      toast.error(error.message || 'Gift failed.');
    },
    onSuccess: () => {
      toast.success('Gift sent!');
    },
    onSettled: () => {
      // Always refetch real balance from server after gift attempt
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.email] });
      queryClient.invalidateQueries({ queryKey: ['stream'] });
    },
  });
}

export function useToggleFollow({ user, creator, isFollowing }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => FollowService.toggleFollow(user?.email, creator?.id, isFollowing),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['follow-status', user?.email, creator?.id] });
      const prev = queryClient.getQueryData(['follow-status', user?.email, creator?.id]);
      queryClient.setQueryData(['follow-status', user?.email, creator?.id], !isFollowing);
      if (creator) {
        queryClient.setQueryData(['creator', creator.id], old => old ? {
          ...old,
          follower_count: (old.follower_count || 0) + (isFollowing ? -1 : 1),
        } : old);
      }
      return { prev };
    },
    onError: (error, _vars, context) => {
      if (context?.prev !== undefined) {
        queryClient.setQueryData(['follow-status', user?.email, creator?.id], context.prev);
      }
      if (error.message?.includes('sign in')) base44.auth.redirectToLogin();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-status'] });
      queryClient.invalidateQueries({ queryKey: ['creator', creator?.id] });
    },
  });
}

export function useEndStream({ stream, creator, pkBattle, liveStream }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!creator) throw new Error('Unauthorized');
      if (!stream?.id) throw new Error('No active stream');

      // 1. Stop local media tracks first
      if (liveStream && typeof liveStream !== 'boolean') {
        liveStream.getTracks().forEach(t => { t.stop(); t.enabled = false; });
      }

      // 2. Leave Zego room — stop publishing, logout, destroy engine
      const { default: ZegoService } = await import('@/components/stream/ZegoService');
      try { 
        await ZegoService.stopPublishing?.();
        await ZegoService.leave(); 
      } catch (e) { 
        console.warn('[EndStream] Zego cleanup error:', e); 
      }

      // 3. Persist end-of-stream to database
      return StreamService.endStream(stream, creator, pkBattle);
    },
    onSuccess: () => {
      // Remove fullscreen lock
      document.body.classList.remove('fullscreen-lock');

      queryClient.invalidateQueries({ queryKey: ['stream'] });
      queryClient.invalidateQueries({ queryKey: ['streams-live'] });
      queryClient.invalidateQueries({ queryKey: ['streams-explore'] });
      queryClient.invalidateQueries({ queryKey: ['creator', creator?.id] });
      queryClient.invalidateQueries({ queryKey: ['my-creator'] });
    },
    onError: async (error) => {
      console.error('[EndStream] Failed:', error.message);
      // Even on error, try to force-clean the database state
      if (stream?.id && creator?.id) {
        await base44.entities.Stream.update(stream.id, { status: 'ended', viewer_count: 0 }).catch(() => {});
        await base44.entities.Creator.update(creator.id, { is_live: false, current_stream_id: null }).catch(() => {});
      }
      toast.error(error.message || 'Failed to end stream');
    },
  });
}