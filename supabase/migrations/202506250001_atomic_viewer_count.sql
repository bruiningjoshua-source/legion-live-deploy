-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic viewer count RPC
-- Replaces the read-then-write pattern that caused count drift under concurrency.
-- Called by the Netlify updateViewerCount handler with p_delta = +1 or -1.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.increment_viewer_count(
  p_stream_id uuid,
  p_delta     integer
)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.streams
  set
    viewer_count = greatest(0, viewer_count + p_delta),
    peak_viewers = case
      when p_delta > 0 then greatest(coalesce(peak_viewers, 0), viewer_count + p_delta)
      else peak_viewers
    end
  where id = p_stream_id
  returning viewer_count;
$$;

-- Allow authenticated users and the service role to call it
grant execute on function public.increment_viewer_count(uuid, integer) to authenticated, service_role;


-- ─────────────────────────────────────────────────────────────────────────────
-- Admin allowlist — controls who can hold the admin role.
--
-- HOW TO ADD AN ADMIN:
--   insert into public.admin_allowlist (email, added_by)
--   values ('newadmin@example.com', 'bruiningjoshua@gmail.com');
--   update public.profiles set role = 'admin' where email = 'newadmin@example.com';
--
-- HOW TO REMOVE AN ADMIN:
--   delete from public.admin_allowlist where email = 'removedadmin@example.com';
--   update public.profiles set role = 'user' where email = 'removedadmin@example.com';
--
-- The trigger below ensures nobody can get admin role unless they're in this table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Allowlist table (add/remove rows here to manage admins)
create table if not exists public.admin_allowlist (
  email      text primary key,
  added_by   text,
  added_at   timestamptz default now(),
  note       text        -- optional: why this person is admin
);

-- Seed the two founders
insert into public.admin_allowlist (email, added_by, note) values
  ('bruiningjoshua@gmail.com',    'system', 'Founder'),
  ('inthestixproductions@gmail.com', 'system', 'Co-Founder')
on conflict (email) do nothing;

-- Helper: grant admin to a user (checks allowlist first)
create or replace function public.grant_admin(p_email text, p_granted_by text, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Add to allowlist
  insert into public.admin_allowlist (email, added_by, note)
  values (p_email, p_granted_by, p_note)
  on conflict (email) do update set note = coalesce(p_note, public.admin_allowlist.note);
  -- Grant the role
  update public.profiles set role = 'admin' where email = p_email;
  if not found then
    return 'Added to allowlist. Role will be set when user signs up.';
  end if;
  return 'Admin granted to ' || p_email;
end;
$$;

-- Helper: revoke admin from a user
create or replace function public.revoke_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Remove from allowlist
  delete from public.admin_allowlist where email = p_email;
  -- Downgrade role
  update public.profiles set role = 'user' where email = p_email;
  return 'Admin revoked from ' || p_email;
end;
$$;

grant execute on function public.grant_admin(text, text, text) to service_role;
grant execute on function public.revoke_admin(text) to service_role;

-- Trigger: blocks role=admin if email is not in allowlist
create or replace function public.enforce_admin_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'admin' then
    if not exists (
      select 1 from public.admin_allowlist where email = new.email
    ) then
      raise exception
        'Admin role is restricted. Add % to admin_allowlist first, then retry.',
        new.email;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_admin_allowlist_trigger on public.profiles;
create trigger enforce_admin_allowlist_trigger
  before insert or update on public.profiles
  for each row execute function public.enforce_admin_allowlist();

-- Grant founders their role
update public.profiles
set role = 'admin'
where email in ('bruiningjoshua@gmail.com', 'inthestixproductions@gmail.com');
