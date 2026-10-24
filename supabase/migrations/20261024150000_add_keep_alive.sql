-- Keep-alive function.
--
-- A scheduled job (GitHub Actions) calls this once a day so that a
-- free-plan Supabase project does not pause from inactivity.
--
-- It reads no tables and changes nothing. It is callable without
-- signing in, because a scheduled job has no account. The only thing it
-- reveals is the server time.

begin;

create or replace function public.keep_alive()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;

commit;
