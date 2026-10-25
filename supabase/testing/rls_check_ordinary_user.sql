-- RWCLL security check: what can an ORDINARY approved account do?
--
-- HOW TO USE
-- 1. Replace the all-zeros user id below with the id of an approved
--    account that has NO administrative role (for example a youth umpire).
-- 2. Paste the whole script into the Supabase SQL Editor and run it.
-- 3. The run ENDS WITH A RED ERROR. That is intentional: the report is
--    carried inside the error message, and raising an error guarantees
--    that everything the script tried is rolled back. Nothing is saved.
--    (The editor may warn about "destructive operations" because the
--    text contains delete statements. That is expected.)
--
-- HOW TO READ THE REPORT
--   PASS   the action was blocked, or changed nothing
--   FAIL   the action was allowed: a security problem to fix
--   CHECK  an unexpected error: send it to Claude
--   SKIP   no rows exist in that table, so the test proves nothing yet
--   INFO   something worth knowing (not a pass/fail test)

do $$
declare
  test_user uuid := '00000000-0000-0000-0000-000000000000';  -- REPLACE THIS

  t record;
  report text[] := '{}';
  needs_attention integer := 0;
  counts jsonb := '{}'::jsonb;
  n bigint;
  rows_affected bigint;
  status text;
  detail text;
begin
  -- Guards: the chosen account must be approved and not an administrator.
  if not exists (
    select 1 from public.profiles p
    where p.id = test_user and p.account_status = 'approved'
  ) then
    raise exception 'Replace the placeholder with the id of an APPROVED ordinary account.';
  end if;

  if exists (
    select 1 from public.user_roles ur
    where ur.user_id = test_user
      and ur.role_id in ('super_admin', 'umpire_chief', 'scheduler',
                         'treasurer', 'feedback_reviewer', 'read_only_admin')
  ) then
    raise exception 'That account has an administrative role. Choose an ordinary account.';
  end if;

  -- Count the rows that really exist (as the owner), so that a change
  -- test that touches 0 rows can be told apart from an empty table.
  for t in
    select unnest(array[
      'profiles', 'user_roles', 'umpires', 'umpire_private_details',
      'leagues', 'seasons', 'divisions', 'teams', 'locations',
      'games', 'game_assignments',
      'little_league_age_charts', 'little_league_age_chart_entries'
    ]) as tbl
  loop
    execute format('select count(*) from public.%I', t.tbl) into n;
    counts := counts || jsonb_build_object(t.tbl, n);
  end loop;

  -- From here on, act as the ordinary account.
  perform set_config('request.jwt.claim.sub', test_user::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', test_user, 'role', 'authenticated')::text, true);
  set local role authenticated;

  for t in
    select * from (values
      -- kind, table, description, statement, expected message (rpc only)
      ('insert', 'leagues', 'Create a league',
        $q$insert into public.leagues (name) values ('rls-test')$q$, ''),
      ('insert', 'seasons', 'Create a season',
        $q$insert into public.seasons (name) values ('rls-test')$q$, ''),
      ('insert', 'divisions', 'Create a division',
        $q$insert into public.divisions (league_id, name) values (gen_random_uuid(), 'rls-test')$q$, ''),
      ('insert', 'teams', 'Create a team',
        $q$insert into public.teams (league_id, season_id, name) values (gen_random_uuid(), gen_random_uuid(), 'rls-test')$q$, ''),
      ('insert', 'locations', 'Create a location',
        $q$insert into public.locations (name) values ('rls-test')$q$, ''),
      ('insert', 'umpires', 'Create an umpire record',
        $q$insert into public.umpires (display_name, classification) values ('rls-test', 'adult')$q$, ''),
      ('insert', 'umpire_private_details', 'Create private umpire details',
        $q$insert into public.umpire_private_details (umpire_id) values (gen_random_uuid())$q$, ''),
      ('insert', 'games', 'Create a game',
        $q$insert into public.games (season_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), now() + interval '1 hour')$q$, ''),
      ('insert', 'game_assignments', 'Assign an umpire to a game',
        $q$insert into public.game_assignments (game_id, umpire_id, position) values (gen_random_uuid(), gen_random_uuid(), 'plate')$q$, ''),
      ('insert', 'little_league_age_charts', 'Create an age chart directly',
        $q$insert into public.little_league_age_charts (chart_year, name) values (2099, 'rls-test')$q$, ''),
      ('insert', 'little_league_age_chart_entries', 'Add age chart entries directly',
        $q$insert into public.little_league_age_chart_entries (chart_id, birth_month, birth_year, ll_age) values (gen_random_uuid(), 1, 2000, 8)$q$, ''),
      ('insert', 'user_roles', 'Give yourself the super_admin role',
        $q$insert into public.user_roles (user_id, role_id, granted_by) values (auth.uid(), 'super_admin', auth.uid())$q$, ''),

      ('change', 'profiles', 'Approve your own account',
        $q$update public.profiles set account_status = 'approved' where id = auth.uid()$q$, ''),
      ('change', 'leagues', 'Edit leagues', $q$update public.leagues set is_active = is_active$q$, ''),
      ('change', 'seasons', 'Edit seasons', $q$update public.seasons set is_active = is_active$q$, ''),
      ('change', 'divisions', 'Edit divisions', $q$update public.divisions set is_active = is_active$q$, ''),
      ('change', 'teams', 'Edit teams', $q$update public.teams set is_active = is_active$q$, ''),
      ('change', 'locations', 'Edit locations', $q$update public.locations set is_active = is_active$q$, ''),
      ('change', 'umpires', 'Edit umpire records', $q$update public.umpires set display_name = display_name$q$, ''),
      ('change', 'umpire_private_details', 'Edit private umpire details',
        $q$update public.umpire_private_details set admin_notes = admin_notes$q$, ''),
      ('change', 'games', 'Edit games', $q$update public.games set status = status$q$, ''),
      ('change', 'game_assignments', 'Edit assignments', $q$update public.game_assignments set position = position$q$, ''),
      ('change', 'little_league_age_charts', 'Edit age charts', $q$update public.little_league_age_charts set name = name$q$, ''),
      ('change', 'little_league_age_chart_entries', 'Edit age chart entries',
        $q$update public.little_league_age_chart_entries set ll_age = ll_age$q$, ''),
      ('change', 'leagues', 'Delete leagues', $q$delete from public.leagues$q$, ''),
      ('change', 'seasons', 'Delete seasons', $q$delete from public.seasons$q$, ''),
      ('change', 'divisions', 'Delete divisions', $q$delete from public.divisions$q$, ''),
      ('change', 'teams', 'Delete teams', $q$delete from public.teams$q$, ''),
      ('change', 'locations', 'Delete locations', $q$delete from public.locations$q$, ''),
      ('change', 'umpires', 'Delete umpire records', $q$delete from public.umpires$q$, ''),
      ('change', 'games', 'Delete games', $q$delete from public.games$q$, ''),
      ('change', 'game_assignments', 'Delete assignments', $q$delete from public.game_assignments$q$, ''),
      ('change', 'user_roles', 'Delete role assignments', $q$delete from public.user_roles$q$, ''),

      ('rpc', 'profiles', 'Approve another account (set_account_status)',
        $q$select public.set_account_status(gen_random_uuid(), 'approved')$q$, 'Only an approved Super Admin'),
      ('rpc', 'little_league_age_charts', 'Import an age chart (import_age_chart)',
        $q$select public.import_age_chart(2099, 'rls-test', '[{"birth_month":1,"birth_year":2000,"ll_age":8}]'::jsonb)$q$, 'Only scheduling administrators'),

      ('read0', 'umpire_private_details', 'Read emergency contacts and admin notes',
        $q$select count(*) from public.umpire_private_details$q$, ''),
      ('read0', 'user_roles', 'See other people''s roles',
        $q$select count(*) from public.user_roles where user_id <> auth.uid()$q$, ''),
      ('read1', 'profiles', 'See other people''s profiles',
        $q$select count(*) from public.profiles$q$, ''),

      ('read0', 'umpires', 'Read OTHER people''s umpire records',
        $q$select count(*) from public.umpires where profile_id is distinct from auth.uid()$q$, ''),
      ('read0', 'umpires', 'Read OTHER people''s phone numbers',
        $q$select count(*) from public.umpires where phone is not null and profile_id is distinct from auth.uid()$q$, ''),
      ('read0', 'game_assignments', 'Read OTHER umpires'' assignments',
        $q$select count(*) from public.game_assignments ga where not exists (select 1 from public.umpires u where u.id = ga.umpire_id and u.profile_id = auth.uid())$q$, ''),

      ('info', 'umpires', 'Your own umpire record (0 or 1 is fine)',
        $q$select count(*) from public.umpires where profile_id = auth.uid()$q$, ''),
      ('info', 'games', 'Games this account can read (schedules are not personal data)',
        $q$select count(*) from public.games$q$, '')
    ) as v(kind, tbl, label, stmt, expect)
  loop
    status := null;
    detail := '';

    begin
      if t.kind in ('read0', 'read1', 'info') then
        execute t.stmt into n;
        detail := n || ' row(s) visible';
        if t.kind = 'read0' then
          status := case when n = 0 then 'PASS' else 'FAIL' end;
        elsif t.kind = 'read1' then
          status := case when n <= 1 then 'PASS' else 'FAIL' end;
        else
          status := 'INFO';
        end if;
      else
        execute t.stmt;
        get diagnostics rows_affected = row_count;

        if t.kind in ('insert', 'rpc') then
          status := 'FAIL';
          detail := 'the action was allowed';
        elsif rows_affected > 0 then
          status := 'FAIL';
          detail := rows_affected || ' row(s) were changed';
        elsif (counts ->> t.tbl)::bigint = 0 then
          status := 'SKIP';
          detail := 'no rows exist to test against';
        else
          status := 'PASS';
          detail := 'no rows changed';
        end if;
      end if;
    exception when others then
      if t.kind = 'info' then
        status := 'INFO';
        detail := 'not readable (' || sqlerrm || ')';
      elsif sqlstate = '42501' then
        status := 'PASS';
        detail := 'blocked by security rules';
      elsif t.kind = 'rpc' and position(t.expect in sqlerrm) > 0 then
        status := 'PASS';
        detail := 'refused with the expected message';
      elsif t.kind in ('insert', 'rpc') then
        status := 'FAIL';
        detail := 'not blocked by security rules; stopped later with: ' || sqlerrm;
      else
        status := 'CHECK';
        detail := 'unexpected error: ' || sqlerrm;
      end if;
    end;

    if status in ('FAIL', 'CHECK') then
      needs_attention := needs_attention + 1;
    end if;

    report := report || format('%s  %s  (%s)', rpad(status, 5), t.label, detail);
  end loop;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nSECURITY CHECK REPORT (nothing was saved)\n\n%\n\nItems needing attention: %\n',
    array_to_string(report, E'\n'), needs_attention;
end
$$;
