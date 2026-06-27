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
-- Admin allowlist — ONLY these two emails can ever hold the admin role.
-- Any attempt by RLS or code to set another email to admin will be blocked.
-- ─────────────────────────────────────────────────────────────────────────────

-- Allowlist table
create table if not exists public.admin_allowlist (
  email text primary key,
  granted_at timestamptz default now()
);

-- Seed the two permanent admins
insert into public.admin_allowlist (email) values
  ('bruiningjoshua@gmail.com'),
  ('inthestixproductions@gmail.com')
on conflict (email) do nothing;

-- Block any service role attempt to grant admin to non-allowlisted emails
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
      raise exception 'Admin role is restricted. Email % is not on the admin allowlist.', new.email;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_admin_allowlist_trigger on public.profiles;
create trigger enforce_admin_allowlist_trigger
  before insert or update on public.profiles
  for each row execute function public.enforce_admin_allowlist();

-- Grant the two admins their role (safe: they're in the allowlist)
update public.profiles
set role = 'admin'
where email in ('bruiningjoshua@gmail.com', 'inthestixproductions@gmail.com');
