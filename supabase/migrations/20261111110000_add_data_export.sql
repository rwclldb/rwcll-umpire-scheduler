-- "Download everything": a super admin can download a readable copy of all the league's data
-- (Administration > Backup and export). The app asks for it one table at a time, then builds a zip
-- of spreadsheets (CSV) and JSON files in the browser.
--
-- This is NOT the full disaster-recovery backup (that is scripts\backup-live.ps1: see RECOVERY.md):
-- it holds the league's data only, not sign-in passwords (those live outside "public").
--
-- Safety:
--   * only a super admin can start a download, or read a table through it
--   * a download is recorded (who, when, how many tables and rows) in export_log, which only super admins can read
--   * the tables offered are always "every table in public", so tables added later are included automatically
--
-- Safe to run twice.

begin;

create table if not exists public.export_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  exported_by uuid references auth.users (id) on delete set null,
  exported_by_name text not null,
  tables_count integer,
  rows_count integer,
  status text not null default 'started' check (status in ('started', 'finished'))
);

alter table public.export_log enable row level security;

revoke all on table public.export_log from public, anon, authenticated;
grant select on table public.export_log to authenticated;

drop policy if exists "Super admins read the export log" on public.export_log;
create policy "Super admins read the export log" on public.export_log
  for select to authenticated
  using (public.is_super_admin_user());

-- ---------------------------------------------------------------- start a download
-- Records that it started and says which tables the app should ask for.
create or replace function public.begin_export()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_name text;
  v_tables jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_super_admin_user() then
    raise exception 'Only a super admin can download everything.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'A super admin')
  into v_name
  from public.profiles p
  where p.id = (select auth.uid());

  insert into public.export_log (exported_by, exported_by_name)
  values ((select auth.uid()), coalesce(v_name, 'A super admin'))
  returning id into v_id;

  select coalesce(jsonb_agg(c.relname::text order by c.relname::text), '[]'::jsonb)
  into v_tables
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r';

  return jsonb_build_object('export_id', v_id, 'tables', v_tables, 'by', coalesce(v_name, 'A super admin'));
end;
$$;

-- ---------------------------------------------------------------- one table
-- All the rows of one table of "public", as a list of objects. Only while the download that was
-- started (above) is still open (it stays open for two hours).
create or replace function public.export_table(p_export_id uuid, p_table text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_super_admin_user() then
    raise exception 'Only a super admin can download everything.';
  end if;

  if not exists (
    select 1
    from public.export_log e
    where e.id = p_export_id
      and e.exported_by = (select auth.uid())
      and e.status = 'started'
      and e.started_at > now() - interval '2 hours'
  ) then
    raise exception 'This download is not open any more. Start it again.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = p_table
  ) then
    raise exception 'There is no table called %.', p_table;
  end if;

  execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t', p_table)
  into v_rows;

  return v_rows;
end;
$$;

-- ---------------------------------------------------------------- finish
create or replace function public.finish_export(p_export_id uuid, p_tables integer, p_rows integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_super_admin_user() then
    raise exception 'Only a super admin can download everything.';
  end if;

  update public.export_log
  set status = 'finished',
      finished_at = now(),
      tables_count = greatest(coalesce(p_tables, 0), 0),
      rows_count = greatest(coalesce(p_rows, 0), 0)
  where id = p_export_id
    and exported_by = (select auth.uid())
    and status = 'started';

  if not found then
    raise exception 'This download is not open any more.';
  end if;
end;
$$;

revoke all on function public.begin_export() from public, anon;
revoke all on function public.export_table(uuid, text) from public, anon;
revoke all on function public.finish_export(uuid, integer, integer) from public, anon;
grant execute on function public.begin_export() to authenticated;
grant execute on function public.export_table(uuid, text) to authenticated;
grant execute on function public.finish_export(uuid, integer, integer) to authenticated;

commit;
