# LEGION LIVE — Base44 → Supabase Edge Functions Migration Guide

## STEP 1: Replace the Import

```js
// OLD:
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// NEW:
import { createClient } from 'npm:@supabase/supabase-js@2';
```

## STEP 2: Replace the Client Init

```js
// OLD:
const base44 = createClientFromRequest(req);

// NEW (service role — bypasses RLS, for admin operations):
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_KEY')
);

// NEW (user-scoped — respects RLS):
const authHeader = req.headers.get('Authorization') || '';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('VITE_SUPABASE_ANON_KEY'),
  { global: { headers: { Authorization: authHeader } } }
);
```

## STEP 3: Replace Auth

```js
// OLD:
const user = await base44.auth.me();

// NEW:
const authHeader = req.headers.get('Authorization') || '';
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
if (authError || !user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// For custom user fields (full_name, role, etc):
const { data: userProfile } = await supabase
  .from('user')
  .select('*')
  .eq('email', user.email)
  .single();
```

## STEP 4: Replace Entity Operations

### Table Name Mapping
Base44 uses PascalCase, Supabase uses snake_case:
| Base44 Entity | Supabase Table |
|---|---|
| Wallet | wallet |
| WalletAuditLog | wallet_audit_log |
| Gift | gift |
| GiftTransaction | gift_transaction |
| Creator | creator |
| CreatorSubscription | creator_subscription |
| CreatorGuarantee | creator_guarantee |
| CreatorPayout | creator_payout |
| Stream | stream |
| ScheduledStream | scheduled_stream |
| CurrencyPurchase | currency_purchase |
| ChatMessage | chat_message |
| WatchStreak | watch_streak |
| PKBattle | pk_battle |
| BroadcasterEarnings | broadcaster_earnings |
| AIVideoGift | ai_video_gift |
| ModerationAlert | moderation_alert |
| UserBan | user_ban |
| Notification | notification |
| FanClubMembership | fan_club_membership |
| PPVTicket | ppv_ticket |
| BrandCampaign | brand_campaign |
| Tip | tip |
| LegionCompanionMemory | legion_companion_memory |
| LegionCompanionEvent | legion_companion_event |

### FILTER (read)

```js
// OLD:
await base44.asServiceRole.entities.Wallet.filter(
  { user_email: email }, '-created_date', 1
);

// NEW:
const { data: wallets } = await supabase
  .from('wallet')
  .select('*')
  .eq('user_email', email)
  .order('created_date', { ascending: false })
  .limit(1);
```

Multiple conditions:
```js
// OLD:
await base44.asServiceRole.entities.CreatorSubscription.filter(
  { user_email: email, status: 'active' }, null, 1
);

// NEW:
const { data: subs } = await supabase
  .from('creator_subscription')
  .select('*')
  .eq('user_email', email)
  .eq('status', 'active')
  .limit(1);
```

Date comparisons:
```js
// OLD: { created_date: { $gte: oneDayAgo } }
// NEW: .gte('created_date', oneDayAgo)
```

Regex/like:
```js
// OLD: { related_entity_id: { $regex: `.*${packageId}.*` } }
// NEW: .ilike('related_entity_id', `%${packageId}%`)
```

### CREATE

```js
// OLD:
await base44.asServiceRole.entities.Wallet.create({ user_email: email, denarii_balance: 500 });

// NEW:
const { data: newWallet } = await supabase
  .from('wallet')
  .insert({ user_email: email, denarii_balance: 500 })
  .select()
  .single();
```

### UPDATE

```js
// OLD:
await base44.asServiceRole.entities.Wallet.update(walletId, { denarii_balance: 1000 });

// NEW:
await supabase
  .from('wallet')
  .update({ denarii_balance: 1000 })
  .eq('id', walletId);
```

### DELETE

```js
// OLD:
await base44.asServiceRole.entities.Wallet.delete(walletId);

// NEW:
await supabase
  .from('wallet')
  .delete()
  .eq('id', walletId);
```

## STEP 5: Replace InvokeLLM

```js
// OLD:
await base44.integrations.Core.InvokeLLM({ prompt: '...', response_json_schema: {...} });

// NEW: Use OpenAI directly
import OpenAI from 'npm:openai';
const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' }
});
const result = JSON.parse(response.choices[0].message.content);
```

Set the secret: `supabase secrets set OPENAI_API_KEY=sk-...`

## STEP 6: Replace Function-to-Function Calls

```js
// OLD:
await base44.asServiceRole.functions.invoke('transactionalEmail', { ... });

// NEW:
await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/transactionalEmail`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_KEY')}`
    },
    body: JSON.stringify({ action: 'send_email', ... })
  }
);
```

## STEP 7: Sort Order Mapping

```js
// Base44: '-created_date'  → Supabase: .order('created_date', { ascending: false })
// Base44: 'created_date'   → Supabase: .order('created_date', { ascending: true })
```

## STEP 8: Frontend Changes

```js
// OLD:
import { base44 } from '@/api/base44Client';
const response = await base44.functions.invoke('sendGift', payload);
const data = response.data;

// NEW:
import { supabase } from '@/lib/supabase';
const { data, error } = await supabase.functions.invoke('sendGift', {
  body: payload
});
```

## STEP 9: Deploy

```bash
# Move each function to: supabase/functions/<name>/index.ts
# Set secrets:
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set ZEGOCLOUD_APP_ID=...
supabase secrets set ZEGOCLOUD_SERVER_SECRET=...

# Deploy:
supabase functions deploy sendGift
supabase functions deploy stripeWebhook
``