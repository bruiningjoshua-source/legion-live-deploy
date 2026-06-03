-- ───────────────────────────────────────────────────────────────────────────
-- Go Live + Login Rewards alignment
--   1. Add the stream/creator columns the client actually writes when going live
--   2. Populate streams.creator_email automatically so RLS insert/update passes
--   3. Add the pk_battles table used by PK-battle streams
--   4. Add a server-authoritative, idempotent claim_daily_reward() RPC
-- ───────────────────────────────────────────────────────────────────────────

-- 1. Columns referenced by GoLive.jsx / OBSSetupPanel.jsx / StreamService.jsx
alter table public.streams add column if not exists category text;
alter table public.streams add column if not exists stream_type text default 'solo';
alter table public.streams add column if not exists peak_viewers integer not null default 0;
alter table public.streams add column if not exists total_gifts_received numeric not null default 0;
alter table public.streams add column if not exists total_denarii_earned numeric not null default 0;
alter table public.streams add column if not exists duration_minutes integer not null default 0;
alter table public.streams add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.streams add column if not exists guests jsonb not null default '[]'::jsonb;
alter table public.streams add column if not exists pk_opponent_id text;

alter table public.creators add column if not exists category text;

-- 2. Auto-fill creator_email on insert so the row satisfies the RLS WITH CHECK
--    (creator_email = current_user_email()). BEFORE-INSERT triggers run before
--    the RLS check is evaluated, so the client no longer has to pass it.
create or replace function public.set_stream_creator_email()
returns trigger
language plpgsql
as $$
begin
  if new.creator_email is null or new.creator_email = '' then
    new.creator_email := public.current_user_email();
  end if;
  return new;
end;
$$;

drop trigger if exists set_stream_creator_email on public.streams;
create trigger set_stream_creator_email
  before insert on public.streams
  for each row execute function public.set_stream_creator_email();

-- 3. PK battle records
create table if not exists public.pk_battles (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid references public.streams(id) on delete cascade,
  host_creator_id uuid references public.creators(id) on delete set null,
  opponent_creator_id text,
  status text not null default 'pending',
  duration_minutes integer not null default 5,
  metadata jsonb not null default '{}'::jsonb,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists pk_battles_stream_idx on public.pk_battles(stream_id);

alter table public.pk_battles enable row level security;

drop policy if exists "pk_battles_public_select" on public.pk_battles;
drop policy if exists "pk_battles_authenticated_insert" on public.pk_battles;
drop policy if exists "pk_battles_authenticated_update" on public.pk_battles;
create policy "pk_battles_public_select" on public.pk_battles for select using (true);
create policy "pk_battles_authenticated_insert" on public.pk_battles for insert with check (auth.uid() is not null);
create policy "pk_battles_authenticated_update" on public.pk_battles for update using (auth.uid() is not null) with check (auth.uid() is not null);

drop trigger if exists set_pk_battles_updated_date on public.pk_battles;
create trigger set_pk_battles_updated_date
  before update on public.pk_battles
  for each row execute function public.set_updated_date();

-- 4. Server-authoritative daily login reward.
--    Runs as SECURITY DEFINER so the reward amount is computed and credited on
--    the server (the client can no longer set its own balance). Idempotent:
--    a second call on the same UTC day returns alreadyClaimed without crediting.
create or replace function public.claim_daily_reward(p_user_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_yesterday date := ((now() at time zone 'utc')::date - 1);
  v_rewards integer[] := array[10, 15, 25, 35, 50, 75, 100];
  v_streak public.watch_streaks%rowtype;
  v_has_streak boolean := false;
  v_new_streak integer;
  v_day_index integer;
  v_reward integer;
  v_wallet_id uuid;
  v_prev_balance numeric;
  v_new_balance numeric;
begin
  if p_user_email is null or p_user_email = '' then
    raise exception 'user email required';
  end if;

  select * into v_streak
  from public.watch_streaks
  where user_email = p_user_email
  limit 1
  for update;

  v_has_streak := v_streak.id is not null;

  if v_has_streak and v_streak.last_watch_date = v_today then
    return jsonb_build_object('alreadyClaimed', true);
  end if;

  if v_has_streak and v_streak.last_watch_date = v_yesterday then
    v_new_streak := coalesce(v_streak.current_streak, 0) + 1;
  else
    v_new_streak := 1;
  end if;

  v_day_index := ((v_new_streak - 1) % 7);
  v_reward := v_rewards[v_day_index + 1]; -- postgres arrays are 1-based

  if v_has_streak then
    update public.watch_streaks
    set current_streak = v_new_streak,
        longest_streak = greatest(v_new_streak, coalesce(longest_streak, 0)),
        last_watch_date = v_today,
        total_days_watched = coalesce(total_days_watched, 0) + 1,
        streak_reward_claimed_at = now()
    where id = v_streak.id;
  else
    insert into public.watch_streaks (
      user_email, current_streak, longest_streak,
      last_watch_date, total_days_watched, streak_reward_claimed_at
    )
    values (p_user_email, 1, 1, v_today, 1, now());
  end if;

  -- Ensure a wallet exists so the reward is never silently dropped
  insert into public.wallets (user_email)
  values (p_user_email)
  on conflict (user_email) do nothing;

  select id, denarii_balance into v_wallet_id, v_prev_balance
  from public.wallets
  where user_email = p_user_email
  for update;

  v_new_balance := coalesce(v_prev_balance, 0) + v_reward;

  update public.wallets
  set denarii_balance = v_new_balance,
      total_earned = total_earned + v_reward,
      daily_streak = v_new_streak,
      last_daily_bonus = v_today
  where id = v_wallet_id;

  insert into public.wallet_audit_logs (
    user_email, wallet_id, action, amount_denarii,
    previous_balance, new_balance, reason
  )
  values (
    p_user_email, v_wallet_id, 'watch_streak_reward', v_reward,
    v_prev_balance, v_new_balance, 'Daily login reward day ' || (v_day_index + 1)
  );

  return jsonb_build_object(
    'alreadyClaimed', false,
    'newStreak', v_new_streak,
    'rewardDenarii', v_reward,
    'day', v_day_index + 1
  );
end;
$$;
