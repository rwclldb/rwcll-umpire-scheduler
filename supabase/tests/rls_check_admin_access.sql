-- RWCLL check: can a super admin still read everything they need to?
--
-- The companion to rls_check_ordinary_user.sql. That script proves ordinary
-- accounts are kept OUT; this one proves the lockdown did not lock out the
-- administrators. It signs in (inside the database) as an approved super
-- admin and compares what that account can read with what actually exists.
--
-- Run it in the Supabase SQL Editor. It ENDS WITH A RED ERROR on purpose:
-- the report is carried in the error message, and raising an error
-- guarantees that nothing is saved.
--
--   PASS   the admin can read every row
--   FAIL   the admin cannot see some rows (access was lost)

do $$
declare
  admin_id uuid;
  t record;
  report text[] := '{}';
  failures integer := 0;
  actual jsonb := '{}'::jsonb;
  n bigint;
  seen bigint;
begin
  select ur.user_id into admin_id
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  if admin_id is null then
    raise exception 'No approved super admin account was found.';
  end if;

  -- How many rows really exist (counted as the database owner).
  for t in
    select unnest(array[
      'profiles', 'roles', 'user_roles', 'umpires', 'umpire_private_details',
      'leagues', 'seasons', 'divisions', 'teams', 'locations',
      'games', 'game_assignments', 'umpire_availability',
      'little_league_age_charts', 'little_league_age_chart_entries'
    ]) as tbl
  loop
    execute format('select count(*) from public.%I', t.tbl) into n;
    actual := actual || jsonb_build_object(t.tbl, n);
  end loop;

  -- From here on, act as that super admin.
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  for t in
    select jsonb_object_keys(actual) as tbl order by 1
  loop
    begin
      execute format('select count(*) from public.%I', t.tbl) into seen;
      if seen = (actual ->> t.tbl)::bigint then
        report := array_append(report, (format('PASS  reads all %s row(s) of %s', seen, t.tbl))::text);
      else
        report := array_append(report, (format('FAIL  sees %s of %s row(s) of %s', seen, actual ->> t.tbl, t.tbl))::text);
        failures := failures + 1;
      end if;
    exception when others then
      report := array_append(report, (format('FAIL  cannot read %s: %s', t.tbl, sqlerrm))::text);
      failures := failures + 1;
    end;
  end loop;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nADMIN ACCESS CHECK (nothing was saved)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
