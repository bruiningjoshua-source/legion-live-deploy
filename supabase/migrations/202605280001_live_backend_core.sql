create extension if not exists pgcrypto;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '');
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() ->> 'role',
    'user'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.set_updated_date()
returns trigger
language plpgsql
as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'creator', 'moderator', 'admin')),
  onboarding_completed boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  denarii_balance numeric not null default 0 check (denarii_balance >= 0),
  sestertii_balance numeric not null default 0 check (sestertii_balance >= 0),
  as_balance numeric not null default 0 check (as_balance >= 0),
  vip_points numeric not null default 0 check (vip_points >= 0),
  total_spent numeric not null default 0 check (total_spent >= 0),
  total_earned numeric not null default 0 check (total_earned >= 0),
  total_purchased_usd numeric not null default 0 check (total_purchased_usd >= 0),
  vip_level integer not null default 0 check (vip_level between 0 and 8),
  lotto_tickets numeric not null default 0 check (lotto_tickets >= 0),
  daily_streak integer not null default 0 check (daily_streak >= 0),
  pending_withdrawal numeric not null default 0 check (pending_withdrawal >= 0),
  last_daily_bonus date,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.wallet_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  wallet_id uuid references public.wallets(id) on delete set null,
  action text not null check (action in (
    'purchase', 'gift_send', 'gift_receive', 'chargeback', 'reversal',
    'admin_adjustment', 'referral_bonus', 'refund', 'ai_cohost_call',
    'sentiment_analysis', 'financial_intelligence_cache', 'watch_streak_reward',
    'product_click', 'voice_command', 'checkout_initiated', 'webhook_processed',
    'fraud_review_case'
  )),
  amount_denarii numeric not null,
  previous_balance numeric,
  new_balance numeric not null,
  related_entity_id text,
  reason text,
  ip_address inet,
  user_agent text,
  timestamp_utc timestamptz not null default now(),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.watch_streaks (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_watch_date date,
  total_days_watched integer not null default 0 check (total_days_watched >= 0),
  streak_reward_claimed_at timestamptz,
  milestone_3_claimed boolean not null default false,
  milestone_7_claimed boolean not null default false,
  milestone_14_claimed boolean not null default false,
  milestone_30_claimed boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  animation_url text,
  animation_type text check (animation_type in ('simple', 'burst', 'fullscreen', 'prestige', 'mega')),
  cost_denarii numeric not null check (cost_denarii > 0),
  tier text not null check (tier in ('normal', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'prestige', 'divine')),
  category text check (category in ('nature', 'love', 'celebration', 'luxury', 'mythical', 'prestige', 'interactive', 'divine', 'roman', 'war', 'fortune')),
  is_active boolean not null default true,
  sort_order integer,
  combo_enabled boolean not null default false,
  screen_takeover boolean not null default false,
  sound_url text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  is_live boolean not null default false,
  current_stream_id uuid,
  follower_count integer not null default 0 check (follower_count >= 0),
  total_earnings_denarii numeric not null default 0 check (total_earnings_denarii >= 0),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.streams (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete set null,
  creator_email text,
  title text not null,
  description text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  platform_type text default 'legion_live',
  viewer_count integer not null default 0 check (viewer_count >= 0),
  thumbnail_url text,
  started_at timestamptz,
  ended_at timestamptz,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'creators_current_stream_fk'
      and conrelid = 'public.creators'::regclass
  ) then
    alter table public.creators
      add constraint creators_current_stream_fk foreign key (current_stream_id)
      references public.streams(id) on delete set null;
  end if;
end $$;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid references public.streams(id) on delete cascade,
  user_email text not null,
  message text not null,
  reactions jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  type text,
  title text,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.gift_transactions (
  id uuid primary key default gen_random_uuid(),
  gift_id uuid references public.gifts(id) on delete set null,
  stream_id uuid references public.streams(id) on delete set null,
  sender_email text not null,
  receiver_email text,
  receiver_creator_id uuid references public.creators(id) on delete set null,
  amount_denarii numeric not null check (amount_denarii > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_email text not null,
  following_creator_id uuid references public.creators(id) on delete cascade,
  creator_id uuid references public.creators(id) on delete cascade,
  creator_email text,
  created_date timestamptz not null default now(),
  unique (follower_email, following_creator_id)
);

create table if not exists public.creator_payout_methods (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete cascade,
  user_email text not null,
  provider text not null default 'stripe',
  provider_account_id text,
  status text not null default 'pending',
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.creator_payouts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete cascade,
  user_email text not null,
  amount_denarii numeric not null check (amount_denarii > 0),
  amount_usd numeric,
  status text not null default 'pending',
  provider text,
  provider_transfer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.content_violations (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  content_type text,
  content_id uuid,
  reason text,
  status text not null default 'open',
  moderator_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid references public.streams(id) on delete set null,
  moderator_email text not null,
  target_user_email text,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.currency_purchases (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  package_id text,
  amount_denarii numeric not null default 0 check (amount_denarii >= 0),
  amount_usd numeric not null default 0 check (amount_usd >= 0),
  status text not null default 'pending',
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.platform_analytics (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null,
  metric_name text not null,
  metric_value numeric not null default 0,
  user_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.vlog_videos (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.creators(id) on delete set null,
  creator_email text,
  title text not null,
  description text,
  video_url text,
  thumbnail_url text,
  status text not null default 'draft',
  is_published boolean not null default false,
  view_count integer not null default 0 check (view_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.music (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  album text,
  audio_url text,
  cover_url text,
  category text,
  is_published boolean not null default true,
  play_count integer not null default 0 check (play_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.base44_records (
  id uuid primary key default gen_random_uuid(),
  entity_name text not null,
  owner_email text,
  payload jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create unique index if not exists profiles_email_idx on public.profiles(email);
create index if not exists wallets_user_email_idx on public.wallets(user_email);
create index if not exists wallet_audit_logs_user_time_idx on public.wallet_audit_logs(user_email, timestamp_utc desc);
create index if not exists wallet_audit_logs_wallet_idx on public.wallet_audit_logs(wallet_id);
create index if not exists watch_streaks_user_email_idx on public.watch_streaks(user_email);
create index if not exists gifts_active_sort_idx on public.gifts(is_active, sort_order);
create index if not exists creators_user_email_idx on public.creators(user_email);
create index if not exists creators_live_followers_idx on public.creators(is_live, follower_count desc);
create index if not exists streams_status_viewers_idx on public.streams(status, viewer_count desc);
create index if not exists streams_creator_idx on public.streams(creator_id);
create index if not exists chat_messages_stream_time_idx on public.chat_messages(stream_id, created_date desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_email, is_read, created_date desc);
create index if not exists gift_transactions_stream_idx on public.gift_transactions(stream_id, created_date desc);
create index if not exists gift_transactions_sender_idx on public.gift_transactions(sender_email, created_date desc);
create index if not exists follows_follower_idx on public.follows(follower_email);
create index if not exists creator_payout_methods_user_idx on public.creator_payout_methods(user_email);
create index if not exists creator_payouts_user_idx on public.creator_payouts(user_email, status);
create index if not exists currency_purchases_user_idx on public.currency_purchases(user_email, status);
create index if not exists platform_analytics_type_time_idx on public.platform_analytics(metric_type, created_date desc);
create index if not exists vlog_videos_published_idx on public.vlog_videos(is_published, created_date desc);
create index if not exists music_published_idx on public.music(is_published, play_count desc);
create index if not exists base44_records_entity_owner_idx on public.base44_records(entity_name, owner_email);

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','wallets','wallet_audit_logs','watch_streaks','gifts','creators',
    'streams','chat_messages','notifications','gift_transactions','follows',
    'creator_payout_methods','creator_payouts','content_violations',
    'moderation_actions','currency_purchases','platform_analytics','vlog_videos',
    'music','base44_records'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_date on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_date before update on public.%I for each row execute function public.set_updated_date()',
      t,
      t
    );
  end loop;
end $$;
