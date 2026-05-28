import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or a Supabase key.');
  process.exit(1);
}

const supabase = createClient(url, key);

const requiredTables = [
  'profiles',
  'wallets',
  'wallet_audit_logs',
  'watch_streaks',
  'gifts',
  'creators',
  'streams',
  'chat_messages',
  'notifications',
  'gift_transactions',
  'follows',
  'creator_payout_methods',
  'creator_payouts',
  'currency_purchases',
  'platform_analytics',
  'vlog_videos',
  'music',
  'base44_records',
];

let failed = false;

for (const table of requiredTables) {
  const { error } = await supabase.from(table).select('id').limit(1);
  if (error) {
    failed = true;
    console.error(`table:${table}: ${error.message}`);
  } else {
    console.log(`table:${table}: ok`);
  }
}

const { data: gifts, error: giftsError } = await supabase
  .from('gifts')
  .select('id')
  .eq('is_active', true)
  .limit(1);

if (giftsError || !gifts?.length) {
  failed = true;
  console.error(`seed:gifts: ${giftsError?.message || 'no active gifts found'}`);
} else {
  console.log('seed:gifts: ok');
}

const { error: rpcError } = await supabase.rpc('transfer_denarii', {
  p_sender_wallet_id: '00000000-0000-0000-0000-000000000001',
  p_receiver_wallet_id: '00000000-0000-0000-0000-000000000002',
  p_amount: 1,
  p_reason: 'verification',
  p_related_entity_id: null,
});

if (rpcError?.message?.includes('Sender wallet not found')) {
  console.log('rpc:transfer_denarii: ok');
} else if (rpcError) {
  failed = true;
  console.error(`rpc:transfer_denarii: ${rpcError.message}`);
} else {
  failed = true;
  console.error('rpc:transfer_denarii: expected verification wallet miss');
}

process.exit(failed ? 1 : 0);
