/**
 * Legion-Forged | Centralized React Query Key Factory + Cache Strategy
 * LF-2026-Ω
 *
 * Single source of truth for ALL query keys.
 * Hierarchical structure enables surgical cache invalidation without magic strings.
 */

// ─── Stale Time Presets ───────────────────────────────────────────────────────
export const STALE = Object.freeze({
  REALTIME:  0,               // Always refetch  (live viewer count, chat)
  FAST:      15_000,          // 15s  (live streams list)
  MEDIUM:    60_000,          // 1m   (creator profiles, streams)
  SLOW:      5 * 60_000,      // 5m   (static content, videos)
  STATIC:    30 * 60_000,     // 30m  (gifts, categories)
  FOREVER:   Infinity,        // Never re-fetch  (local prefs)
});

// ─── Query Key Factory ────────────────────────────────────────────────────────
export const QK = Object.freeze({
  // ── Auth ──
  user:   ()      => ['user', 'me'],
  wallet: (email) => ['wallet', email],

  // ── Streams ──
  streams: Object.freeze({
    live:      ()          => ['streams', 'live'],
    byId:      (id)        => ['streams', id],
    byCreator: (cId)       => ['streams', 'creator', cId],
    chat:      (streamId)  => ['streams', streamId, 'chat'],
    analytics: (streamId)  => ['streams', streamId, 'analytics'],
    pk:        (battleId)  => ['streams', 'pk', battleId],
  }),

  // ── Creators ──
  creators: Object.freeze({
    all:          ()               => ['creators', 'all'],
    byId:         (id)             => ['creators', id],
    byEmail:      (email)          => ['creators', 'email', email],
    followers:    (id)             => ['creators', id, 'followers'],
    subscription: (email, cId)     => ['creators', cId, 'subscription', email],
    tiers:        (cId)            => ['creators', cId, 'tiers'],
  }),

  // ── Videos ──
  videos: Object.freeze({
    all:       ()    => ['videos', 'all'],
    byId:      (id)  => ['videos', id],
    byCreator: (cId) => ['videos', 'creator', cId],
    trending:  ()    => ['videos', 'trending'],
    comments:  (id)  => ['videos', id, 'comments'],
  }),

  // ── Podcasts ──
  podcasts: Object.freeze({
    all:       ()     => ['podcasts', 'all'],
    byCreator: (cId)  => ['podcasts', 'creator', cId],
    episodes:  (pId)  => ['podcasts', pId, 'episodes'],
  }),

  // ── Commerce ──
  gifts:        ()      => ['gifts', 'catalog'],
  transactions: (email) => ['transactions', email],
  leaderboard:  (sId)   => ['leaderboard', sId],

  // ── Social ──
  follows:       (email) => ['follows', email],
  notifications: (email) => ['notifications', email],
  userProfile:   (email) => ['user-profile', email],

  // ── Gaming ──
  games: () => ['games', 'all'],

  // ── Recommendations ──
  recommendations: (email) => ['recommendations', email],
});

// ─── Invalidation Helpers (call these instead of raw invalidateQueries) ───────
// Imported wherever a mutation needs to bust the cache.
// E.g.: import { invalidate } from '@/components/core/queryKeys';
//       invalidate.creator(creator.id)(queryClient);
// Returns a thunk that accepts queryClient for tree-shaking safety.

export const invalidate = Object.freeze({
  streams:      (qc) => qc.invalidateQueries({ queryKey: ['streams'] }),
  stream:       (id) => (qc) => qc.invalidateQueries({ queryKey: QK.streams.byId(id) }),
  creator:      (id) => (qc) => qc.invalidateQueries({ queryKey: ['creators', id] }),
  creators:     (qc) => qc.invalidateQueries({ queryKey: ['creators'] }),
  wallet:       (email) => (qc) => qc.invalidateQueries({ queryKey: QK.wallet(email) }),
  videos:       (qc) => qc.invalidateQueries({ queryKey: ['videos'] }),
  podcasts:     (qc) => qc.invalidateQueries({ queryKey: ['podcasts'] }),
  user:         (qc) => qc.invalidateQueries({ queryKey: ['user'] }),
  all:          (qc) => qc.invalidateQueries(),
});

// ─── Default Query Options ─────────────────────────────────────────────────────
// Spread these into useQuery for standard behavior per tier.
export const DEFAULT_OPTS = Object.freeze({
  liveStream: {
    staleTime: STALE.FAST,
    refetchInterval: STALE.FAST,
    refetchOnWindowFocus: true,
  },
  profile: {
    staleTime: STALE.MEDIUM,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  },
  catalog: {
    staleTime: STALE.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  },
  realtime: {
    staleTime: STALE.REALTIME,
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  },
});