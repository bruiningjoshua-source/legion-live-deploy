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
