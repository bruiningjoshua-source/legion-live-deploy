alter table public.creators
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb,
  add column if not exists location_label text,
  add column if not exists location_visible boolean not null default false;

create table if not exists public.profile_posts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  media_urls jsonb not null default '[]'::jsonb,
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'subscribers')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create index if not exists profile_posts_creator_created_idx
  on public.profile_posts (creator_id, created_date desc);

alter table public.profile_posts enable row level security;

create policy "profile_posts_public_select" on public.profile_posts
  for select using (
    visibility = 'public'
    or public.is_admin()
    or exists (
      select 1 from public.creators
      where creators.id = profile_posts.creator_id
        and creators.user_email = public.current_user_email()
    )
    or (
      visibility = 'followers'
      and exists (
        select 1 from public.follows
        where follows.following_creator_id = profile_posts.creator_id
          and follows.follower_email = public.current_user_email()
      )
    )
    or (
      visibility = 'subscribers'
      and exists (
        select 1 from public.viewer_subscriptions
        where viewer_subscriptions.creator_id = profile_posts.creator_id
          and viewer_subscriptions.viewer_email = public.current_user_email()
          and viewer_subscriptions.status = 'active'
      )
    )
  );

create policy "profile_posts_owner_insert" on public.profile_posts
  for insert with check (
    exists (
      select 1 from public.creators
      where creators.id = creator_id
        and (creators.user_email = public.current_user_email() or public.is_admin())
    )
  );

create policy "profile_posts_owner_update" on public.profile_posts
  for update using (
    exists (
      select 1 from public.creators
      where creators.id = profile_posts.creator_id
        and (creators.user_email = public.current_user_email() or public.is_admin())
    )
  ) with check (
    exists (
      select 1 from public.creators
      where creators.id = creator_id
        and (creators.user_email = public.current_user_email() or public.is_admin())
    )
  );

create policy "profile_posts_owner_delete" on public.profile_posts
  for delete using (
    exists (
      select 1 from public.creators
      where creators.id = profile_posts.creator_id
        and (creators.user_email = public.current_user_email() or public.is_admin())
    )
  );