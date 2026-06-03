-- ───────────────────────────────────────────────────────────────────────────
-- Audit blocker remediation
--   1. Make admin role reachable (resolve role from profiles, not just the JWT)
--   2. Provision profiles / wallets / watch_streaks automatically on sign-up
--   4. Allow the cross-user writes the product implies (notifications,
--      follower counts, creator earnings, gift visibility)
--   5. Create the entity tables that were referenced but never defined
-- ───────────────────────────────────────────────────────────────────────────

-- ── Blocker 1 ────────────────────────────────────────────────────────────────
-- The application stores each user's role in profiles.role but never copies it
-- into the JWT, so is_admin() was false for everyone. Resolve the role from the
-- profiles table (by auth.uid()) first, falling back to the JWT claims. The
-- function is SECURITY DEFINER so the lookup bypasses RLS on profiles and cannot
-- recurse through the policies that call it.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() ->> 'role',
    'user'
  );
$$;

-- Optional Supabase auth hook: copies profiles.role into the access token's
-- app_metadata. Wire it up under Authentication → Hooks (Custom Access Token)
-- to additionally carry the role in the JWT. is_admin() already works without
-- it thanks to the profiles lookup above.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_claims jsonb;
begin
  select role into v_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb);

  if v_role is not null then
    if v_claims ? 'app_metadata' then
      v_claims := jsonb_set(v_claims, '{app_metadata, role}', to_jsonb(v_role));
    else
      v_claims := jsonb_set(v_claims, '{app_metadata}', jsonb_build_object('role', v_role));
    end if;
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- ── Blocker 2 ────────────────────────────────────────────────────────────────
-- New auth users never received a profiles row (and the client's profile upsert
-- omitted the NOT NULL email). Provision profiles, a wallet, and a watch-streak
-- row automatically whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  if new.email is not null then
    insert into public.wallets (user_email)
    values (new.email)
    on conflict (user_email) do nothing;

    insert into public.watch_streaks (user_email)
    values (new.email)
    on conflict (user_email) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Blocker 4 ────────────────────────────────────────────────────────────────
-- 4a. Notifications addressed to other users. A notification is written by the
--     actor (follower, gifter, …) for a different recipient, so insert must be
--     allowed for any authenticated user, not just self.
drop policy if exists "notifications_owner_insert" on public.notifications;
create policy "notifications_authenticated_insert" on public.notifications
  for insert with check (auth.uid() is not null);

-- 4b. Follower counters. The follow row already inserts under the owner policy;
--     keep creators.follower_count in sync via a trigger that runs with the
--     table owner's rights, so the follower never has to update someone else's
--     creator row directly.
create or replace function public.sync_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.creators
      set follower_count = follower_count + 1
      where id = new.following_creator_id;
  elsif tg_op = 'DELETE' then
    update public.creators
      set follower_count = greatest(follower_count - 1, 0)
      where id = old.following_creator_id;
  end if;
  return null;
end;
$$;

drop trigger if exists sync_follower_count_insert on public.follows;
drop trigger if exists sync_follower_count_delete on public.follows;
create trigger sync_follower_count_insert
  after insert on public.follows
  for each row execute function public.sync_follower_count();
create trigger sync_follower_count_delete
  after delete on public.follows
  for each row execute function public.sync_follower_count();

-- 4c. Creator earnings. When a gift is recorded against a creator, accrue it to
--     that creator's total_earnings_denarii via a trigger (the sender cannot
--     update the recipient creator's row directly).
create or replace function public.accrue_creator_earnings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.receiver_creator_id is not null then
    update public.creators
      set total_earnings_denarii = total_earnings_denarii + new.amount_denarii
      where id = new.receiver_creator_id;
  end if;
  return null;
end;
$$;

drop trigger if exists accrue_creator_earnings_insert on public.gift_transactions;
create trigger accrue_creator_earnings_insert
  after insert on public.gift_transactions
  for each row execute function public.accrue_creator_earnings();

-- 4d. Gift visibility for creator recipients. Gifts sent to a creator carry a
--     receiver_creator_id (and possibly a null receiver_email); let the owning
--     creator read their incoming gift rows.
drop policy if exists "gift_transactions_participant_select" on public.gift_transactions;
create policy "gift_transactions_participant_select" on public.gift_transactions
  for select using (
    sender_email = public.current_user_email()
    or receiver_email = public.current_user_email()
    or receiver_creator_id in (
      select id from public.creators where user_email = public.current_user_email()
    )
    or public.is_admin()
  );

-- ── Blocker 5 ────────────────────────────────────────────────────────────────
-- Entity tables referenced by the app but missing from the schema.
create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  video_id text,
  video_type text,
  watch_duration_seconds numeric not null default 0,
  progress_percent numeric not null default 0,
  last_position_seconds numeric not null default 0,
  completed boolean not null default false,
  watched_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.viewing_history (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  content_id text,
  content_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.watch_later (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  video_id text,
  video_type text,
  added_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  activity_type text,
  actor_email text,
  target_id text,
  target_type text,
  target_title text,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.channel_points (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  creator_id uuid references public.creators(id) on delete cascade,
  points_balance numeric not null default 0 check (points_balance >= 0),
  lifetime_earned numeric not null default 0 check (lifetime_earned >= 0),
  watch_streak_days integer not null default 0 check (watch_streak_days >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  unique (user_email, creator_id)
);

create table if not exists public.game_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  category text,
  rating numeric not null default 0,
  play_count integer not null default 0 check (play_count >= 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.hype (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid references public.streams(id) on delete cascade,
  is_active boolean not null default true,
  level integer not null default 1,
  progress numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.legion_companion_memory (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  memory_key text,
  memory_value jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists watch_history_user_idx on public.watch_history(user_email, watched_at desc);
create index if not exists viewing_history_user_idx on public.viewing_history(user_email, created_date desc);
create index if not exists watch_later_user_idx on public.watch_later(user_email, added_at desc);
create index if not exists activity_feed_user_idx on public.activity_feed(user_email, created_date desc);
create index if not exists channel_points_user_creator_idx on public.channel_points(user_email, creator_id);
create index if not exists game_library_active_idx on public.game_library(is_active, rating desc);
create index if not exists hype_stream_idx on public.hype(stream_id, is_active);
create index if not exists legion_companion_memory_user_idx on public.legion_companion_memory(user_email);

-- updated_date maintenance for the new tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'watch_history','viewing_history','watch_later','activity_feed',
    'channel_points','game_library','hype','legion_companion_memory'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_date on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_date before update on public.%I for each row execute function public.set_updated_date()',
      t, t
    );
  end loop;
end $$;

-- RLS for the new tables.
alter table public.watch_history enable row level security;
alter table public.viewing_history enable row level security;
alter table public.watch_later enable row level security;
alter table public.activity_feed enable row level security;
alter table public.channel_points enable row level security;
alter table public.game_library enable row level security;
alter table public.hype enable row level security;
alter table public.legion_companion_memory enable row level security;

-- Per-user history tables: owner-scoped on every command.
do $$
declare
  t text;
begin
  foreach t in array array[
    'watch_history','viewing_history','watch_later','legion_companion_memory'
  ]
  loop
    execute format('drop policy if exists "%s_owner_select" on public.%I', t, t);
    execute format('drop policy if exists "%s_owner_insert" on public.%I', t, t);
    execute format('drop policy if exists "%s_owner_update" on public.%I', t, t);
    execute format('drop policy if exists "%s_owner_delete" on public.%I', t, t);
    execute format('create policy "%s_owner_select" on public.%I for select using (user_email = public.current_user_email() or public.is_admin())', t, t);
    execute format('create policy "%s_owner_insert" on public.%I for insert with check (user_email = public.current_user_email() or public.is_admin())', t, t);
    execute format('create policy "%s_owner_update" on public.%I for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin())', t, t);
    execute format('create policy "%s_owner_delete" on public.%I for delete using (user_email = public.current_user_email() or public.is_admin())', t, t);
  end loop;
end $$;

-- Channel points: a viewer reads/writes their own balance row.
create policy "channel_points_owner_select" on public.channel_points for select using (user_email = public.current_user_email() or public.is_admin());
create policy "channel_points_owner_insert" on public.channel_points for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "channel_points_owner_update" on public.channel_points for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin());
create policy "channel_points_owner_delete" on public.channel_points for delete using (user_email = public.current_user_email() or public.is_admin());

-- Activity feed: publicly readable; any authenticated user can post activity
-- (raids and similar are written on behalf of another creator).
create policy "activity_feed_public_select" on public.activity_feed for select using (true);
create policy "activity_feed_authenticated_insert" on public.activity_feed for insert with check (auth.uid() is not null);
create policy "activity_feed_owner_delete" on public.activity_feed for delete using (user_email = public.current_user_email() or actor_email = public.current_user_email() or public.is_admin());

-- Game library: public catalog, admin-managed.
create policy "game_library_public_select" on public.game_library for select using (true);
create policy "game_library_admin_insert" on public.game_library for insert with check (public.is_admin());
create policy "game_library_admin_update" on public.game_library for update using (public.is_admin()) with check (public.is_admin());
create policy "game_library_admin_delete" on public.game_library for delete using (public.is_admin());

-- Hype trains: publicly visible, written by authenticated participants.
create policy "hype_public_select" on public.hype for select using (true);
create policy "hype_authenticated_insert" on public.hype for insert with check (auth.uid() is not null);
create policy "hype_authenticated_update" on public.hype for update using (auth.uid() is not null) with check (auth.uid() is not null);
