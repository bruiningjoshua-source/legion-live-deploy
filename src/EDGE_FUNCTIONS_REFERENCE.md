# Legion Live — Edge Functions Reference
## Complete Backend Function Catalog (97 Functions)
### Last Updated: 2026-05-15

---

## TABLE OF CONTENTS

1. [ADMIN & PLATFORM MANAGEMENT](#1-admin--platform-management)
2. [PAYMENTS & STRIPE](#2-payments--stripe)
3. [FRAUD & SECURITY](#3-fraud--security)
4. [MODERATION & CONTENT SAFETY](#4-moderation--content-safety)
5. [CREATOR ECONOMY](#5-creator-economy)
6. [STREAMING & MEDIA](#6-streaming--media)
7. [USER & ENGAGEMENT](#7-user--engagement)
8. [KYC & COMPLIANCE](#8-kyc--compliance)
9. [REFERRALS & GROWTH](#9-referrals--growth)
10. [ANALYTICS & INTELLIGENCE](#10-analytics--intelligence)
11. [INFRASTRUCTURE & UTILITIES](#11-infrastructure--utilities)
12. [CONTENT & IMPORT](#12-content--import)

---

## 1. ADMIN & PLATFORM MANAGEMENT

### `adminListUsers`
**Purpose:** List all registered users (admin-only).
**Auth:** Admin + ADMIN_EMAILS whitelist
**Input:** None
**Output:** `{ users: User[] }`
**Details:** Uses service role to bypass RLS. Returns up to 100 users sorted by creation date.

---

### `adminMonetizationBypass`
**Purpose:** Admin-activate monetization for any creator without payment.
**Auth:** Admin + ADMIN_EMAILS whitelist
**Input:** `{ creatorId: string }`
**Output:** `{ success, message, creator, activatedBy }`
**Details:** Creates a lifetime `CreatorSubscription` with `admin_lifetime` plan type, expiring in 2099.

---

### `adminAffiliateEarnings`
**Purpose:** Calculate CEO/platform affiliate earnings split.
**Auth:** Authenticated user
**Input:** `{ action?, creatorId?, productId?, earnings? }`
**Output:** `{ isCeoAffiliate, totalPlatformEarnings, ceoEarning, platformEarning, userEarning }`
**Details:** 90% to CEO affiliates (from CEO_AFFILIATE_EMAILS env), 10% to platform.

---

### `clearLiveStreams`
**Purpose:** Emergency: Force-end ALL live streams and reset platform state.
**Auth:** Admin-only
**Input:** None
**Output:** `{ success, cleared: { streams, creators, collaborations, pk_battles } }`
**Details:** Ends all live streams, resets all live creators, ends active collabs and PK battles.

---

### `cleanupStaleStreams`
**Purpose:** Scheduled maintenance: end stale streams, reset orphaned creators, expire bans.
**Auth:** Admin or scheduled automation (no user session)
**Input:** None
**Output:** `{ success, cleaned_streams, reset_creators, expired_bans, duration_ms }`
**Details:** Runs every 30 min. Stale threshold = 4 hours. Includes rate-limit delays between API calls. Also zeros viewer counts on ended streams.

---

### `supabaseMigrations`
**Purpose:** Execute database schema migrations and performance optimizations.
**Auth:** Admin-only (Base44 auth)
**Details:** Multi-phase: triggers, constraints, indexes, `transfer_denarii` function. Requires manual `exec_sql` function setup first.

---

### `productionValidation`
**Purpose:** Run production readiness validation checks.
**Auth:** Admin-only
**Details:** Validates system health, configuration, and deployment readiness.

---

## 2. PAYMENTS & STRIPE

### `createDenariiCheckout`
**Purpose:** Create Stripe checkout session for purchasing Denarii (virtual currency).
**Auth:** Authenticated + TOS accepted + not suspended
**Input:** `{ packageName, denariiAmount, bonusDenarii, priceUsd, quantity?, csrfToken }`
**Output:** `{ sessionId, url }`
**Details:** Validates price/denarii ratios, idempotency (1hr window), fraud risk scoring. Rate: 180 Denarii = $1 USD.

---

### `createHostSubscription`
**Purpose:** Create Stripe checkout for host/creator monetization subscription.
**Auth:** Authenticated + TOS + not suspended
**Input:** `{ plan: "monthly"|"yearly", creatorId?, csrfToken }`
**Output:** `{ sessionId, url }`
**Pricing:** Monthly $5, Yearly $12. Rate limited to 1 per day.

---

### `createCreatorMonetizationCheckout`
**Purpose:** Create Stripe checkout for creator monetization activation.
**Auth:** Authenticated + owns creator profile
**Input:** `{ planType: "monthly"|"yearly", creatorId }`
**Output:** `{ sessionId, url }`
**Details:** Uses pre-configured Stripe price IDs. Only creator's own profile allowed.

---

### `createTipCheckout`
**Purpose:** Create Stripe checkout for direct USD tips to creators.
**Auth:** Authenticated + TOS + not suspended
**Input:** `{ creatorId, amount (1-5000), message?, streamId?, isAnonymous?, csrfToken }`
**Output:** `{ sessionId, url }`
**Details:** Rate limited to 5 tips/minute. Cannot tip yourself. Idempotency per hour.

---

### `createFanClubCheckout`
**Purpose:** Create Stripe subscription checkout for fan club membership.
**Auth:** Authenticated + TOS + not suspended
**Input:** `{ creator_id, tier (1-5), price_usd (0.50-1000), tier_name?, perks?, csrfToken }`
**Output:** `{ url, session_id }`
**Details:** Monthly subscription. Rate limited to 5/day. Checks existing membership.

---

### `createPPVCheckout`
**Purpose:** Create Stripe checkout for pay-per-view event tickets.
**Auth:** Authenticated + TOS + not suspended
**Input:** `{ event_id, csrfToken }`
**Output:** `{ url, session_id }`
**Details:** Rate limited to 3/hour. Checks sold-out status and existing tickets.

---

### `createCampaignCheckout`
**Purpose:** Create Stripe checkout for brand campaign payments.
**Auth:** Authenticated + not suspended
**Input:** `{ campaignId, amount (1-100000), campaignName? }`
**Output:** `{ sessionId, url }`

---

### `stripeWebhook`
**Purpose:** Main Stripe webhook handler for all payment events.
**Auth:** Stripe signature verification
**Events handled:**
- `checkout.session.completed` — Provisions subscriptions, tips, Denarii, PPV tickets, brand campaigns
- `customer.subscription.updated/deleted` — Subscription lifecycle management
- `charge.dispute.created` — Chargeback handling with auto-ban after 3 disputes
**Details:** Includes idempotency cache, purchase velocity tracking, high-value monitoring.

---

### `stripeConnectWebhook`
**Purpose:** Handle Stripe Connect webhook events for creator payouts.
**Auth:** Stripe signature verification

---

### `stripeConnectOnboard`
**Purpose:** Create/manage Stripe Connect Express accounts for creator payouts.
**Auth:** Authenticated + owns creator profile
**Actions:** `create_account`, `check_status`, `resume_onboarding`, `create_login_link`
**Details:** Creates Express accounts with card_payments + transfers capabilities. Syncs KYC status.

---

### `stripeConnectPayout`
**Purpose:** Execute Stripe Connect transfer for verified creator payouts.
**Auth:** Authenticated + owns creator + KYC verified
**Input:** `{ creatorId, amountDenarii, payoutId? }`
**Output:** `{ success, transfer_id, amount_usd, remaining_earnings_denarii }`
**Economics:** 180 Denarii = $1 USD. Creator earns 60%. Min payout = $1.00.

---

### `stripeConnectDailyPayouts`
**Purpose:** Automated daily creator payout processing.
**Auth:** Admin-only
**Details:** Finds creators with Stripe Connect, validates minimums, executes transfers, updates ledgers.

---

### `cancelSubscription`
**Purpose:** Cancel a Stripe subscription at period end.
**Auth:** Authenticated + owns subscription
**Input:** `{ subscriptionId, subscriptionDbId? }`
**Output:** `{ success, cancel_at, message }`
**Details:** Sets `cancel_at_period_end: true`. Checks CreatorSubscription and FanClubMembership.

---

### `checkPaymentStatus`
**Purpose:** Check Stripe payment intent or checkout session status.
**Auth:** Authenticated
**Input:** `{ paymentIntentId }`
**Output:** `{ status, stripeStatus, clientSecret?, amount?, lastError? }`

---

### `checkSubscription`
**Purpose:** Check if user has active creator subscription or admin role.
**Auth:** Authenticated
**Output:** `{ has_access, has_subscription, is_admin, subscription }`

---

### `retryPayment`
**Purpose:** Retry a failed Stripe payment.
**Auth:** Authenticated

---

### `handleStripeWebhook3DS`
**Purpose:** Handle 3D Secure / SCA payment authentication events.
**Auth:** Stripe signature

---

### `liveStripeTest`
**Purpose:** Admin diagnostic tool for Stripe integration health.
**Auth:** Admin-only
**Tests:** `testFullPaymentCycle`, `testWebhookHandling`, `testPayoutFlow`

---

### `verifyPayoutRouting`
**Purpose:** Admin verification tool for Stripe Connect payout systems.
**Auth:** Admin-only
**Details:** Validates platform connectivity, routing logic, webhook secrets, edge case resilience.

---

### `stripeAlertNotifier`
**Purpose:** Send alerts for Stripe-related events.
**Auth:** Admin-only

---

### `chargebackHandler`
**Purpose:** Handle Stripe disputes/chargebacks with evidence gathering.
**Auth:** Varies by action
**Actions:** `handle_dispute`, `submit_evidence`, `get_disputes` (admin), `get_user_chargebacks` (admin)
**Details:** Auto-bans users with 3+ chargebacks. Gathers evidence from purchase/gift history.

---

## 3. FRAUD & SECURITY

### `fraudDetection`
**Purpose:** Real-time fraud scoring based on transaction patterns.
**Auth:** Admin endpoints
**Details:** In-memory activity store warmed from DB. Analyzes gift velocity, tipping frequency, chargeback history, account age. Returns risk score + recommendation.

---

### `analyzeFraudRisk`
**Purpose:** Real-time fraud risk assessment for individual transactions.
**Auth:** Authenticated
**Input:** `{ userEmail, amount, paymentIntentId? }`
**Output:** `{ riskScore, riskLevel (LOW/MEDIUM/HIGH), flags, requiresReview, shouldBlock }`
**Limits:** HIGH_VALUE: $5000, DAILY_LIMIT: $10000, CHARGEBACK_MAX: 3, HOURLY_PURCHASES: 5

---

### `assessPaymentRisk`
**Purpose:** Determine if 3D Secure / SCA is required based on fraud indicators.
**Auth:** Authenticated
**Input:** `{ paymentIntentId, amountUsd, deviceFingerprint?, ipAddress?, countryCode? }`
**Output:** `{ riskScore, requiresSca, riskFactors, assessmentId }`
**Factors:** Amount threshold, payment history, chargebacks, geo-velocity, device fingerprint mismatch.

---

### `batchFraudAnalysis`
**Purpose:** Daily batch fraud analysis — flags suspicious users for review.
**Auth:** Admin-only (scheduled task)
**Output:** `{ success, report: { totalPurchases, totalSpend, flaggedUsers, cases } }`
**Details:** Analyzes 24h purchases. Flags users with >$5000 daily spend, >20 txns, or multiple chargebacks.

---

### `fraudMonitoring`
**Purpose:** Ongoing fraud monitoring system.
**Auth:** Admin-only

---

### `deviceFingerprint`
**Purpose:** Generate SHA-256 device fingerprint for fraud scoring.
**Auth:** Authenticated
**Input:** `{ userAgent, acceptLanguage, timezone, screenResolution?, webglRenderer? }`
**Output:** `{ fingerprint, message }`

---

### `csrfProtection`
**Purpose:** CSRF token generation and validation (DB-persisted via WalletAuditLog).
**Auth:** None (utility module)
**Exports:** `generateCSRFToken(sessionId, email)`, `validateCSRFToken(sessionId, token, email)`, `getCookie(header, name)`
**Details:** Tokens expire after 1 hour. Single-use (deleted after validation).

---

### `securityAudit`
**Purpose:** Run security audit checks on the platform.
**Auth:** Admin-only

---

### `suspiciousLoginDetection`
**Purpose:** Detect and flag suspicious login patterns.
**Auth:** System/admin

---

### `requestSigning`
**Purpose:** Cryptographic request signing for sensitive operations.
**Auth:** Authenticated

---

### `cryptoUtils`
**Purpose:** Shared cryptographic utility functions.
**Details:** Encryption helpers, hash functions, etc.

---

## 4. MODERATION & CONTENT SAFETY

### `moderateChat`
**Purpose:** AI-powered real-time chat message moderation.
**Auth:** Authenticated
**Input:** `{ message, stream_id, user_name }`
**Output:** `{ approved, flagged?, action?, reason?, confidence? }`
**Details:** Uses LLM for content analysis. Checks ban status first. Auto-bans on >0.95 confidence violations. Fails open if moderation unavailable.

---

### `aiModerateContent`
**Purpose:** Comprehensive AI content moderation (all content types).
**Auth:** Authenticated
**Input:** `{ content_type, content, stream_id, user_email, user_name, context? }`
**Output:** `{ approved, action (banned/removed/flagged), reason?, category?, severity? }`
**Categories:** Hate speech, harassment, explicit, violence, spam, self-harm, illegal, personal info, impersonation.
**Details:** 9 moderation categories. Creates bans, alerts, and notifications based on severity.

---

### `contentModerationAppeal`
**Purpose:** Allow users to appeal content moderation decisions.
**Auth:** Authenticated (create_appeal) / Admin (respond_appeal)
**Actions:** `create_appeal`, `respond_appeal`
**Details:** 20+ char appeal reason required. Admin notification on submit. Creator notification on resolution.

---

## 5. CREATOR ECONOMY

### `sendGift`
**Purpose:** Process virtual gift sending from viewer to creator during live streams.
**Auth:** Authenticated
**Details:** Rate limiting, CSRF, fraud detection. Updates sender/receiver wallets, creator earnings, stream stats, PK battle scores. Triggers chat notifications and AI video gifts.

---

### `checkCreatorMilestones`
**Purpose:** Check and unlock creator milestones with rewards.
**Auth:** Authenticated (creator)
**Milestones:**
- 1,000 followers → Custom overlay
- 10,000 followers → +10% revenue boost for 30 days
- 50 streams → Theme pack
- $5K earnings → Featured spotlight
**Output:** `{ success, newMilestones, milestones[] }`

---

### `dynamicTipSuggestions`
**Purpose:** Generate personalized tip amount suggestions for viewers.
**Auth:** Authenticated
**Input:** `{ streamId, creatorId }`
**Output:** `{ suggestions[], milestoneAmount?, totalTipsReceived, averageTip }`
**Details:** Based on most common/average/median tips, viewer history, and stream milestones.

---

### `creatorDataExport`
**Purpose:** Export creator's data (GDPR-compliant data portability).
**Auth:** Authenticated (own data only)
**Output:** Full export with followers, top gifters, streams, earnings.

---

### `forecastCreatorPayouts`
**Purpose:** Forecast creator revenue for next 30 days.
**Auth:** Authenticated (creator)
**Output:** Detailed breakdown by revenue stream (subscriptions, tips, ads, music, referrals), daily projections, risk factors.
**Details:** Compares current vs previous 30-day periods. Revenue share by KYC tier (55-65%).

---

### `requestWithdrawal`
**Purpose:** Submit creator withdrawal request.
**Auth:** Authenticated + KYC verified + monetization subscription
**Input:** `{ amount (min $20), method: "bank_account"|"paypal"|"crypto" }`
**Output:** `{ success, withdrawal_id, amount, fee, net_amount, status }`
**Fees:** 1% bank/PayPal, 2% crypto. Balance rate: 180 Denarii/$1 × 60% creator share.

---

### `setupPayoutMethod`
**Purpose:** Configure creator payout method (bank, PayPal, or crypto).
**Auth:** Authenticated
**Input:** `{ method_type, account_holder_name, account_details, is_default? }`

---

### `getWithdrawalHistory`
**Purpose:** Retrieve creator's withdrawal history.
**Auth:** Authenticated

---

### `getPayoutConfig`
**Purpose:** Get payout configuration and rates.
**Auth:** Authenticated

---

### `processPayoutWithKyc`
**Purpose:** Process payout with KYC verification gate.
**Auth:** Authenticated

---

### `payoutRoutingOptimizer`
**Purpose:** Optimize payout routing for efficiency and cost.
**Auth:** Admin-only

---

## 6. STREAMING & MEDIA

### `generateZegoToken`
**Purpose:** Generate ZegoCloud streaming tokens (Token04 / AES-256-GCM).
**Auth:** Authenticated
**Input:** `{ roomId, userId, role: "host"|"audience"|"cohost" }`
**Output:** `{ token, appId, userId, roomId, role, expiresIn, serverUrl }`
**Details:** 2-hour TTL for hosts, 1-hour for viewers. Rate limited to 10/min. Sanitized inputs.

---

### `updateViewerCount`
**Purpose:** Update real-time viewer count for streams.
**Auth:** Authenticated

---

### `getOBSStreamKey`
**Purpose:** Generate OBS stream key for external broadcasting.
**Auth:** Authenticated

---

### `generateStreamThumbnail`
**Purpose:** Auto-generate stream thumbnails.
**Auth:** Authenticated

---

### `detectHighlights`
**Purpose:** AI-detect stream highlights for auto-clipping.
**Auth:** Authenticated

---

### `restreamForward`
**Purpose:** Forward streams to external platforms (multistreaming).
**Auth:** Authenticated

---

### `setupMobileScreenShare`
**Purpose:** Configure mobile screen sharing for game streaming.
**Auth:** Authenticated

---

## 7. USER & ENGAGEMENT

### `trackEngagement`
**Purpose:** Track user engagement actions (XP, levels, achievements).
**Auth:** Authenticated
**Actions:** `watch_time` (1 XP/10min), `send_gift` (10 XP), `send_message` (1 XP), `daily_login` (25 XP)
**Achievements:** gift_sender (1 gift), social_butterfly (50 comments), marathon_viewer (600 min), loyal_fan (7-day streak)

---

### `claimDailyReward`
**Purpose:** Claim daily login streak reward (Denarii).
**Auth:** Authenticated
**Rewards:** Day 1: 10, Day 2: 15, Day 3: 25, Day 4: 35, Day 5: 50, Day 6: 75, Day 7: 100
**Details:** Resets to Day 1 if a day is missed. Updates WatchStreak and Wallet entities.

---

### `emailVerification`
**Purpose:** Send and verify email verification codes.
**Auth:** Authenticated
**Actions:** `send_verification` (6-digit code), `verify_email`
**Details:** Uses transactionalEmail function for delivery. Marks user as withdrawal-eligible on verify.

---

### `saveUserTheme`
**Purpose:** Save user's theme customization preferences.
**Auth:** Authenticated

---

### `uploadThemeBackground`
**Purpose:** Upload custom theme background image.
**Auth:** Authenticated

---

### `sendPushNotification`
**Purpose:** Send push notifications to users.
**Auth:** System/admin

---

### `transactionalEmail`
**Purpose:** Send various transactional emails (verification, payout notification, etc.).
**Auth:** Service role (called by other functions)

---

## 8. KYC & COMPLIANCE

### `enforceKycGate`
**Purpose:** KYC verification system with encrypted document storage.
**Auth:** Authenticated (submit/check) / Admin (admin_review)
**Actions:** `submit`, `check`, `admin_review`
**Details:** Encrypts KYC data with AES-256-GCM (PBKDF2 key derivation). Logs all state changes to KYCAuditLog.

---

### `kycVerification`
**Purpose:** Process KYC verification requests.
**Auth:** Authenticated

---

### `updateCreatorKYCTier`
**Purpose:** Update creator's KYC tier based on earnings thresholds.
**Auth:** Admin-only

---

### `gdprCompliance`
**Purpose:** GDPR data handling — export, deletion requests.
**Auth:** Authenticated

---

## 9. REFERRALS & GROWTH

### `processCreatorReferral`
**Purpose:** Process creator referral code activation with bonuses.
**Auth:** Authenticated
**Input:** `{ referral_code: "8-16 alphanumeric" }`
**Output:** `{ success, bonuses: { referred_creator: 5000, referrer: 5000 }, guarantee: { 70% share, 3 months } }`
**Details:** Both referrer and referred get 5,000 Denarii. Referred creator gets 70% revenue share guarantee for 3 months. Idempotent.

---

### `processReferralOnboarding`
**Purpose:** Record referral code usage during onboarding.
**Auth:** Authenticated
**Input:** `{ referralCode }`
**Output:** `{ success, referralCode, referrerCreatorId }`

---

### `processReferralMonetization`
**Purpose:** Process referral-based monetization bonuses.
**Auth:** Authenticated

---

## 10. ANALYTICS & INTELLIGENCE

### `analyzeCreatorChurn`
**Purpose:** Analyze creator subscription churn risk.
**Auth:** Admin-only
**Output:** `{ totalMrr, totalSubscriptions, atRiskCreators, churnAnalysis }`
**Risk factors:** No stream in 14+ days (+30), never streamed (+50), low tips (+25). Sends retention notifications.

---

### `predictStreamerChurn`
**Purpose:** ML-style churn prediction for streamers.
**Auth:** Admin-only

---

### `forecastCreatorPayouts`
**Purpose:** See [Creator Economy section](#5-creator-economy)

---

### `getTrendingContent`
**Purpose:** Get trending content across the platform.
**Auth:** Authenticated

---

### `getPersonalizedRecommendations`
**Purpose:** Get AI-powered personalized content recommendations.
**Auth:** Authenticated

---

### `generateRecommendations`
**Purpose:** Generate content recommendations.
**Auth:** Authenticated

---

### `updateRecommendationEngine`
**Purpose:** Update the recommendation engine with new data.
**Auth:** Admin-only

---

### `generateCollabMatches`
**Purpose:** Match creators for collaboration opportunities.
**Auth:** Authenticated

---

### `dynamicTipSuggestions`
**Purpose:** See [Creator Economy section](#5-creator-economy)

---

## 11. INFRASTRUCTURE & UTILITIES

### `idempotencyManager`
**Purpose:** Shared idempotency key management.
**Auth:** Internal use

---

### `rateLimiter` / `rateLimiters`
**Purpose:** Rate limiting utilities.
**Auth:** Internal use

---

### `validationMiddleware`
**Purpose:** Input validation middleware.
**Auth:** Internal use

---

### `validateAndSanitizeInput`
**Purpose:** Comprehensive input validation and sanitization.
**Auth:** Internal use

---

### `validateVideoMetadata`
**Purpose:** Validate video metadata before publishing.
**Auth:** Authenticated

---

### `paymentIntentHandler`
**Purpose:** Handle Stripe Payment Intent lifecycle events.
**Auth:** System

---

### `paymentIntentLifecycle`
**Purpose:** Track payment intent state transitions.
**Auth:** System

---

### `registerChargebackWebhook`
**Purpose:** Register webhook endpoints for chargeback notifications.
**Auth:** Admin-only

---

### `githubReader`
**Purpose:** Read files from GitHub repository.
**Auth:** Uses GITHUB_TOKEN secret

---

### `PRODUCTION_HARDENING_README`
**Purpose:** Documentation file — production readiness audit reference.
**Note:** Not a runnable function — serves as documentation.

---

## 12. CONTENT & IMPORT

### `importGooglePlayGames`
**Purpose:** Import games from Google Play Store into the game library.
**Auth:** Admin-only

---

### `importYouTubeContent`
**Purpose:** Import YouTube video content.
**Auth:** Authenticated (uses YOUTUBE_API_KEY)

---

### `importYouTubeMusicLibrary`
**Purpose:** Import YouTube music library.
**Auth:** Authenticated

---

### `importTrashGang`
**Purpose:** Import Trash Gang content.
**Auth:** Admin-only

---

### `seedMusicLibrary` / `seedMusicLibraryExpanded` / `seedComprehensiveMusicLibrary`
**Purpose:** Seed the music library with sample/initial data.
**Auth:** Admin-only

---

### `seedPlaylistLibrary`
**Purpose:** Seed playlist data.
**Auth:** Admin-only

---

### `processPPVWebhook`
**Purpose:** Process PPV event webhook callbacks.
**Auth:** Webhook signature

---

### `appointModerator`
**Purpose:** Appoint a stream moderator (with idempotency & rate limiting).
**Auth:** Authenticated (stream owner)
**Input:** `{ streamId, moderatorEmail }`
**Details:** Rate limited to 10/hour. Verifies stream ownership. Permissions: mute, kick, timeout, manage_chat.

---

### `removeModerator`
**Purpose:** Remove a stream moderator (with idempotency & rate limiting).
**Auth:** Authenticated (stream owner)
**Input:** `{ streamId, moderatorEmail }`
**Details:** Rate limited to 20/hour. Deactivates moderator record.

---

---

## ENVIRONMENT VARIABLES USED

| Variable | Used By |
|----------|---------|
| `STRIPE_SECRET_KEY` | All Stripe functions |
| `STRIPE_WEBHOOK_SECRET` | stripeWebhook |
| `ZEGOCLOUD_APP_ID` | generateZegoToken |
| `ZEGOCLOUD_SERVER_SECRET` | generateZegoToken |
| `ZEGOCLOUD_SERVER_URL` | generateZegoToken |
| `ADMIN_EMAILS` | adminListUsers, adminMonetizationBypass |
| `CEO_AFFILIATE_EMAILS` | adminAffiliateEarnings |
| `SUPABASE_URL` | csrfProtection |
| `SUPABASE_SERVICE_KEY` | csrfProtection |
| `BASE44_APP_ID` | All Stripe checkout functions (metadata) |
| `GITHUB_TOKEN` | githubReader |
| `YOUTUBE_API_KEY` | importYouTubeContent |

---

## PLATFORM ECONOMICS

| Metric | Value |
|--------|-------|
| Denarii per $1 USD | 180 |
| Creator share | 60% |
| Platform share | 40% |
| Denarii value per creator | ~$0.003333 |
| Min withdrawal | $20 |
| Min Stripe payout | $1.00 |
| Withdrawal fee (bank/PayPal) | 1% |
| Withdrawal fee (crypto) | 2% |
| CEO affiliate cut | 90% |
| Platform affiliate cut | 10% |

---

## DAILY REWARD SCHEDULE

| Day | Denarii |
|-----|---------|
| 1 | 10 |
| 2 | 15 |
| 3 | 25 |
| 4 | 35 |
| 5 | 50 |
| 6 | 75 |
| 7 | 100 |

---

## COMMON PATTERNS

### Rate Limiting (DB-backed)
All financial and sensitive functions use a persistent DB-backed rate limiter stored in `WalletAuditLog` with action `rate_limit_check`. Survives cold starts.

### Idempotency (DB-backed)
Payment functions use hourly idempotency keys stored in `WalletAuditLog` with action `idempotency_record`. Prevents duplicate checkouts within 1-hour windows.

### Authentication Flow
1. `createClientFromRequest(req)` — Init Base44 SDK
2. `base44.auth.me()` — Get authenticated user
3. Role check (`user.role === 'admin'`) for admin functions
4. `ADMIN_EMAILS` env whitelist for sensitive admin ops
5. `base44.asServiceRole` for elevated operations

---

*Generated from Legion Live codebase — 97 backend functions across 12 categories.*