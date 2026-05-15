// ═══════════════════════════════════════════════════════════════════
// LEGION LIVE — Base44 → Supabase Edge Functions Migration Guide
// ═══════════════════════════════════════════════════════════════════
//
// This file documents EXACTLY how to convert every Base44 SDK call
// to direct Supabase calls. Use this as your find-and-replace bible.
//
// ═══════════════════════════════════════════════════════════════════

// ── STEP 1: REPLACE THE IMPORT ──────────────────────────────────
//
// OLD:
//   import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
//
// NEW:
//   import { createClient } from 'npm:@supabase/supabase-js@2';

// ── STEP 2: REPLACE THE CLIENT INIT ─────────────────────────────
//
// OLD:
//   const base44 = createClientFromRequest(req);
//
// NEW (service role — for admin operations):
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL'),
//     Deno.env.get('SUPABASE_SERVICE_KEY')
//   );
//
// NEW (user-scoped — respects RLS):
//   const authHeader = req.headers.get('Authorization') || '';
//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL'),
//     Deno.env.get('VITE_SUPABASE_ANON_KEY'),
//     { global: { headers: { Authorization: authHeader } } }
//   );

// ── STEP 3: REPLACE AUTH ────────────────────────────────────────
//
// OLD:
//   const user = await base44.auth.me();
//
// NEW:
//   const authHeader = req.headers.get('Authorization') || '';
//   const token = authHeader.replace('Bearer ', '');
//   const { data: { user }, error: authError } = await supabase.auth.getUser(token);
//   if (authError || !user) {
//     return Response.json({ error: 'Unauthorized' }, { status: 401 });
//   }
//
// NOTE: user.email and user.id work the same way.
// For user.full_name, user.role, etc — these are custom fields stored
// in your "user" table, so you need to query them:
//
//   const { data: userProfile } = await supabase
//     .from('user')
//     .select('*')
//     .eq('email', user.email)
//     .single();

// ── STEP 4: REPLACE ENTITY OPERATIONS ───────────────────────────
//
// TABLE NAME MAPPING:
// Base44 entity names are PascalCase. Supabase table names are
// typically snake_case. Check your actual Supabase table names.
// Examples:
//   Wallet          → wallet
//   WalletAuditLog  → wallet_audit_log
//   GiftTransaction → gift_transaction
//   Creator         → creator
//   Stream          → stream
//   CurrencyPurchase → currency_purchase
//   etc.
//
// ── FILTER (read multiple) ──
//
// OLD:
//   await base44.asServiceRole.entities.Wallet.filter(
//     { user_email: email }, '-created_date', 1
//   );
//
// NEW:
//   const { data: wallets } = await supabase
//     .from('wallet')
//     .select('*')
//     .eq('user_email', email)
//     .order('created_date', { ascending: false })
//     .limit(1);
//
// FILTER with multiple conditions:
// OLD:
//   await base44.asServiceRole.entities.CreatorSubscription.filter(
//     { user_email: email, status: 'active' }, null, 1
//   );
// NEW:
//   const { data: subs } = await supabase
//     .from('creator_subscription')
//     .select('*')
//     .eq('user_email', email)
//     .eq('status', 'active')
//     .limit(1);
//
// FILTER by ID:
// OLD:
//   await base44.asServiceRole.entities.Gift.filter({ id: giftId }, null, 1);
// NEW:
//   const { data: gifts } = await supabase
//     .from('gift')
//     .select('*')
//     .eq('id', giftId)
//     .limit(1);
//
// FILTER with date comparison:
// OLD:
//   { created_date: { $gte: oneDayAgo } }
// NEW:
//   .gte('created_date', oneDayAgo)
//
// FILTER with regex:
// OLD:
//   { related_entity_id: { $regex: `.*${packageId}.*` } }
// NEW:
//   .ilike('related_entity_id', `%${packageId}%`)
//
// ── CREATE ──
//
// OLD:
//   await base44.asServiceRole.entities.Wallet.create({ user_email: email, denarii_balance: 500 });
//
// NEW:
//   const { data: newWallet } = await supabase
//     .from('wallet')
//     .insert({ user_email: email, denarii_balance: 500 })
//     .select()
//     .single();
//
// ── UPDATE ──
//
// OLD:
//   await base44.asServiceRole.entities.Wallet.update(walletId, { denarii_balance: 1000 });
//
// NEW:
//   await supabase
//     .from('wallet')
//     .update({ denarii_balance: 1000 })
//     .eq('id', walletId);
//
// ── DELETE ──
//
// OLD:
//   await base44.asServiceRole.entities.Wallet.delete(walletId);
//
// NEW:
//   await supabase
//     .from('wallet')
//     .delete()
//     .eq('id', walletId);
//
// ── LIST (no filter) ──
//
// OLD:
//   await base44.asServiceRole.entities.Gift.list('-created_date', 50);
//
// NEW:
//   const { data: gifts } = await supabase
//     .from('gift')
//     .select('*')
//     .order('created_date', { ascending: false })
//     .limit(50);

// ── STEP 5: REPLACE INTEGRATIONS ────────────────────────────────
//
// OLD (InvokeLLM):
//   await base44.integrations.Core.InvokeLLM({ prompt: '...', response_json_schema: {...} });
//   await base44.asServiceRole.integrations.Core.InvokeLLM({ ... });
//
// NEW: Call OpenAI/Anthropic directly:
//   import OpenAI from 'npm:openai';
//   const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
//   const response = await openai.chat.completions.create({
//     model: 'gpt-4o-mini',
//     messages: [{ role: 'user', content: prompt }],
//     response_format: { type: 'json_object' }
//   });
//
// NOTE: You'll need to set OPENAI_API_KEY in Supabase secrets:
//   supabase secrets set OPENAI_API_KEY=sk-...

// ── STEP 6: REPLACE FUNCTION-TO-FUNCTION CALLS ──────────────────
//
// OLD:
//   await base44.asServiceRole.functions.invoke('transactionalEmail', { ... });
//
// NEW: Call your other Supabase edge function via fetch:
//   const res = await fetch(
//     `${Deno.env.get('SUPABASE_URL')}/functions/v1/transactionalEmail`,
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`
//       },
//       body: JSON.stringify({ action: 'send_purchase_confirmation', ... })
//     }
//   );

// ── STEP 7: SERVICE ROLE vs USER CONTEXT ────────────────────────
//
// In Base44:
//   base44.entities.X.filter(...)         → User context (respects RLS)
//   base44.asServiceRole.entities.X.filter(...) → Admin context (bypasses RLS)
//
// In Supabase:
//   - User context: create client with the user's JWT token (anon key + auth header)
//   - Service role: create client with SUPABASE_SERVICE_KEY (bypasses all RLS)
//
// Most functions use service role for writes. Create TWO clients if needed:
//
//   const supabaseAdmin = createClient(url, Deno.env.get('SUPABASE_SERVICE_KEY'));
//   const supabaseUser = createClient(url, Deno.env.get('VITE_SUPABASE_ANON_KEY'), {
//     global: { headers: { Authorization: req.headers.get('Authorization') } }
//   });

// ── STEP 8: SORT ORDER MAPPING ──────────────────────────────────
//
// Base44 sort strings:
//   '-created_date'  → .order('created_date', { ascending: false })
//   'created_date'   → .order('created_date', { ascending: true })
//   '-timestamp_utc' → .order('timestamp_utc', { ascending: false })

// ── STEP 9: FRONTEND CHANGES ────────────────────────────────────
//
// OLD (calling functions from React):
//   import { base44 } from '@/api/base44Client';
//   const response = await base44.functions.invoke('sendGift', payload);
//   const data = response.data;
//
// NEW:
//   import { supabase } from '@/lib/supabase';
//   const { data, error } = await supabase.functions.invoke('sendGift', {
//     body: payload
//   });
//
// OLD (entity operations from React):
//   await base44.entities.Wallet.filter({ user_email: email });
//
// NEW:
//   const { data } = await supabase.from('wallet').select('*').eq('user_email', email);

// ── STEP 10: DEPLOYING ──────────────────────────────────────────
//
// 1. Move each function to: supabase/functions/<functionName>/index.ts
// 2. Set all secrets:
//    supabase secrets set STRIPE_SECRET_KEY=sk_live_...
//    supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//    supabase secrets set ZEGOCLOUD_APP_ID=...
//    supabase secrets set ZEGOCLOUD_SERVER_SECRET=...
//    (etc for all env vars)
// 3. Deploy:
//    supabase functions deploy sendGift
//    supabase functions deploy stripeWebhook
//    (etc)

// ═══════════════════════════════════════════════════════════════════
// QUICK REFERENCE: ENTITY → TABLE NAME MAPPING
// ═══════════════════════════════════════════════════════════════════
//
// Wallet              → wallet
// WalletAuditLog      → wallet_audit_log
// Gift                → gift
// GiftTransaction     → gift_transaction
// Creator             → creator
// CreatorSubscription → creator_subscription
// CreatorGuarantee    → creator_guarantee
// CreatorPayout       → creator_payout
// CreatorPayoutMethod → creator_payout_method
// CreatorMilestone    → creator_milestone
// Stream              → stream
// ScheduledStream     → scheduled_stream
// StreamProduct       → stream_product
// CurrencyPurchase    → currency_purchase
// ChatMessage         → chat_message
// DailyReward         → daily_reward
// WatchStreak         → watch_streak
// PKBattle            → pk_battle
// BroadcasterEarnings → broadcaster_earnings
// AIVideoGift         → ai_video_gift
// ModerationAlert     → moderation_alert
// UserBan             → user_ban
// Notification        → notification
// FanClubMembership   → fan_club_membership
// PPVTicket           → ppv_ticket
// PPVEvent            → ppv_event
// BrandCampaign       → brand_campaign
// BrandPartner        → brand_partner
// Tip                 → tip
// PayoutConfig        → payout_config
// LegionCompanionMemory → legion_companion_memory
// LegionCompanionEvent  → legion_companion_event
// User                → user (or auth.users for Supabase auth)
// Follow              → follow
// AffiliateClick      → affiliate_click
// PaymentRiskAssessment → payment_risk_assessment
//
// NOTE: Check your actual Supabase table names! They might differ
// from this mapping depending on how they were created.
// ═══════════════════════════════════════════════════════════════════