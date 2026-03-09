/**
 * Application-wide constants and configuration.
 * Single source of truth — eliminates magic numbers scattered across the codebase.
 */

// ─── Currency System ─────────────────────────────────────────
export const CURRENCY = {
  DENARII_PER_USD: 180,        // 180 Denarii = $1 USD
  STARTER_BALANCE: 500,
  MAX_GIFT_QUANTITY: 99,
  MIN_TIP_USD: 1,
  MAX_TIP_USD: 10000,
};

// ─── Platform Fees ───────────────────────────────────────────
export const FEES = {
  GIFT_CREATOR_SHARE: 0.60,   // Creator gets 60% of gift value
  TIP_PLATFORM_FEE: 0.10,     // 10% platform fee on tips (40% platform base)
};

// ─── Streaming ───────────────────────────────────────────────
export const STREAM = {
  MAX_CHAT_BUFFER: 200,
  MAX_TAGS: 5,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  TOKEN_TTL_HOST: 7200,       // 2 hours
  TOKEN_TTL_VIEWER: 3600,     // 1 hour
  VIEWER_COUNT_FLOOR: 0,
};

// ─── Query Cache TTLs (ms) ──────────────────────────────────
export const CACHE = {
  USER: 10 * 60 * 1000,        // 10 min
  WALLET: 5 * 60 * 1000,       // 5 min
  CREATOR: 2 * 60 * 1000,      // 2 min
  STREAMS_LIST: 30 * 1000,     // 30s — stay fresh for live data
  STREAMS_REFETCH: 30 * 1000,  // 30s — keep live list current
  GIFTS: 10 * 60 * 1000,       // 10 min
  FOLLOW_STATUS: 5 * 60 * 1000,// 5 min
  CHAT_MESSAGES: 3 * 1000,     // 3s — near real-time chat
};

// ─── Error Codes ─────────────────────────────────────────────
export const ERROR = {
  UNAUTHORIZED: 'Please sign in to continue',
  INSUFFICIENT_BALANCE: 'Insufficient Denarii balance',
  STREAM_ENDED: 'This stream has ended',
  MONETIZATION_DISABLED: 'This creator has not enabled monetization',
  INVALID_INPUT: 'Invalid input — please check your values',
  RATE_LIMITED: 'Too many requests — please slow down',
  SELF_ACTION: 'You cannot perform this action on yourself',
};

// ─── Validation ──────────────────────────────────────────────
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SANITIZE_ROOM_ID: /[^a-zA-Z0-9_-]/g,
  SANITIZE_USER_ID: /[^a-zA-Z0-9_]/g,
  MAX_USER_ID_LENGTH: 64,
  MAX_ROOM_ID_LENGTH: 128,
  MAX_CHAT_LENGTH: 500,
  MAX_TITLE_LENGTH: 100,
  MAX_BIO_LENGTH: 1000,
  MAX_GIFT_QUANTITY: 99,  // Unified: matches VALIDATION.MAX_GIFT_QUANTITY
};

// ─── Stream Categories ──────────────────────────────────────
export const CATEGORIES = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'talk_show', label: 'Talk Show', icon: '🎙️' },
  { value: 'dance', label: 'Dance', icon: '💃' },
  { value: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'other', label: 'Other', icon: '✨' },
];

// ─── VIP Tier Colors ────────────────────────────────────────
export const VIP_COLORS = {
  0: 'text-white/70',
  1: 'text-blue-400',
  2: 'text-purple-400',
  3: 'text-pink-400',
  4: 'text-amber-400',
  5: 'text-red-400',
};