-- RWCLL: delete ALL DATA from the PRACTICE project (step 2 of 2), so a practice restore can be run again.
--
-- DESTRUCTIVE. It deletes every row of every table in the "public" schema and every sign-in account.
-- It refuses to run unless the project has the table public.practice_project_marker
-- (created by mark_practice_project.sql), so it does nothing on the live or the test project.
--
-- What is KEPT: the structure (tables, functions, policies), the migration history, the project
-- reference, the API keys and the database password, and the dashboard settings and extensions.
-- So you do NOT need to run "db push" again, and the project reference does not change.
--
-- After it finishes, run the three counts at the end (all must be 0), then run the restore script again:
--   powershell -ExecutionPolicy Bypass -File .\scripts\restore-to-test.ps1 -ProjectRef <the practice project's reference>

do $$
declare
  v_tables text;
begin
  if to_regclass('public.practice_project_marker') is null then
    raise exception 'STOP: this project is not marked as the practice project (it has no public.practice_project_marker table). Nothing was changed.';
  end if;

  select string_agg(format('%I.%I', schemaname, tablename), ', ')
  into v_tables
  from pg_catalog.pg_tables
  where schemaname = 'public'
    and tablename <> 'practice_project_marker';

  -- TRUNCATE does not fire the row-by-row rules (such as "the last super admin cannot be removed"),
  -- which is what we want when emptying a practice project.
  if v_tables is not null then
    execute 'truncate table ' || v_tables || ' restart identity cascade';
  end if;

  -- the sign-in accounts (this also removes their identities, sessions and tokens)
  delete from auth.users;
end
$$;

-- All three must be 0 now:
select (select count(*) from auth.users) as sign_in_accounts,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from public.umpires) as umpires;
