-- RWCLL check: the demo clock (a pretend time for testing and demonstrations).
--
-- Run in the Supabase SQL Editor AFTER applying 20261101100000_add_demo_clock.sql.
--
-- It switches the demo clock off and on INSIDE its own run, to test both cases,
-- and ENDS WITH A RED ERROR on purpose: the report is carried in the error
-- message, and raising an error guarantees that everything it did (including
-- those switches) is rolled back. Your real settings are not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; loc uuid; d1 uuid; tm1 uuid; tm2 uuid; g_future uuid;
  um_a uuid; um_b uuid;
  g_start timestamptz;
  n bigint; allowed boolean;
begin
  select p.id into t_admin
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  if t_admin is null then
    raise exception 'This check needs an approved super admin.';
  end if;

  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (b_acct, 'chk-' || stamp || '-b@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (a_acct, b_acct, x_acct);

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into tm2;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Demo A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Demo B ' || stamp, 'adult', b_acct) returning id into um_b;

  -- a game three days from now, so with the REAL time nobody can check in yet
  g_start := date_trunc('hour', now()) + interval '3 days';
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, g_start, g_start + interval '2 hours') returning id into g_future;
  insert into public.game_assignments (game_id, umpire_id, position) values (g_future, um_a, 'plate'), (g_future, um_b, 'field');

  ----------------------------------------------------------------
  -- The setting
  ----------------------------------------------------------------
  -- S1
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.app_settings where key = 'demo_clock_allowed';
    reset role;
    if n = 1 then report := array_append(report, ('PASS  S1  the demo clock setting exists, and any signed-in person can read it (the app needs to know whether to show the control)')::text); else report := array_append(report, ('FAIL  S1  the setting is missing or unreadable')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  the setting is missing or unreadable: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.app_settings set value = 'true' where key = 'demo_clock_allowed';
    reset role;
    report := array_append(report, ('FAIL  S2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S2  nobody can switch it on from the app (a signed-in person cannot change the setting)')::text); else report := array_append(report, ('FAIL  S2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.app_settings set value = 'true' where key = 'demo_clock_allowed';
    reset role;
    report := array_append(report, ('FAIL  S3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S3  not even a super admin can switch it on from the app (it takes a deliberate change in the database)')::text); else report := array_append(report, ('FAIL  S3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.app_settings (key, value) values ('other', 'x');
    reset role;
    report := array_append(report, ('FAIL  S4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S4  nor can a signed-in person add settings')::text); else report := array_append(report, ('FAIL  S4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.app_settings;
    reset role;
    report := array_append(report, ('FAIL  S5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S5  a signed-out visitor cannot read it')::text); else report := array_append(report, ('FAIL  S5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: switch the demo clock OFF, as it is on a database where it was never switched on)
  reset role;
  update public.app_settings set value = 'false' where key = 'demo_clock_allowed';

  ----------------------------------------------------------------
  -- With the demo clock OFF a pretend time changes nothing
  ----------------------------------------------------------------
  -- O1
  begin
    reset role;
    select public.demo_clock_allowed() into allowed;
    reset role;
    if allowed = false then report := array_append(report, ('PASS  O1  with the setting off, the demo clock reports as not allowed')::text); else report := array_append(report, ('FAIL  O1  it reports allowed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O1  it reports allowed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_future, g_start - interval '10 minutes');
    reset role;
    report := array_append(report, ('FAIL  O2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 hour before%' then report := array_append(report, ('PASS  O2  an umpire cannot check in to a game three days away by sending a pretend time (it is ignored)')::text); else report := array_append(report, ('FAIL  O2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O3
  begin
    reset role;
    null;
    reset role;
    if (select attendance from public.game_assignments where game_id = g_future and umpire_id = um_a) is null then report := array_append(report, ('PASS  O3  ...and nothing was recorded')::text); else report := array_append(report, ('FAIL  O3  attendance was recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O3  attendance was recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_future, um_a, 'arrived', g_start + interval '5 minutes', g_start + interval '10 minutes');
    reset role;
    report := array_append(report, ('FAIL  O4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be in the future%' then report := array_append(report, ('PASS  O4  an administrator cannot record an arrival in the future by sending a pretend time (it is ignored)')::text); else report := array_append(report, ('FAIL  O4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_future);
    reset role;
    report := array_append(report, ('FAIL  O5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 hour before%' then report := array_append(report, ('PASS  O5  with no pretend time, the real-time rules apply as always')::text); else report := array_append(report, ('FAIL  O5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: switch the demo clock ON, as seed.sql does for the test database)
  reset role;
  update public.app_settings set value = 'true' where key = 'demo_clock_allowed';

  ----------------------------------------------------------------
  -- With the demo clock ON a pretend time is used
  ----------------------------------------------------------------
  -- N1
  begin
    reset role;
    select public.demo_clock_allowed() into allowed;
    reset role;
    if allowed = true then report := array_append(report, ('PASS  N1  with the setting on, the demo clock reports as allowed')::text); else report := array_append(report, ('FAIL  N1  it reports not allowed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N1  it reports not allowed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_future, g_start - interval '10 minutes');
    reset role;
    if (select attendance from public.game_assignments where game_id = g_future and umpire_id = um_a) = 'arrived' and (select arrived_at from public.game_assignments where game_id = g_future and umpire_id = um_a) = g_start - interval '10 minutes' and (select attendance_marked_at from public.game_assignments where game_id = g_future and umpire_id = um_a) = g_start - interval '10 minutes' then report := array_append(report, ('PASS  N2  an umpire can check in to a game three days away when the pretend time is 10 minutes before it, and the pretend time is what is recorded')::text); else report := array_append(report, ('FAIL  N2  the pretend time was not used')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N2  the pretend time was not used: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N3
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_future, g_start - interval '2 hours');
    reset role;
    report := array_append(report, ('FAIL  N3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 hour before%' then report := array_append(report, ('PASS  N3  the window still applies to the pretend time (2 hours before is too early)')::text); else report := array_append(report, ('FAIL  N3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- N4
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_future, g_start + interval '3 hours');
    reset role;
    report := array_append(report, ('FAIL  N4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%is over%' then report := array_append(report, ('PASS  N4  ...and so does the end of the game (3 hours after the start is too late)')::text); else report := array_append(report, ('FAIL  N4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- N5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_future, um_b, 'arrived', g_start + interval '5 minutes', g_start + interval '10 minutes');
    reset role;
    if (select attendance from public.game_assignments where game_id = g_future and umpire_id = um_b) = 'arrived' and (select arrived_at from public.game_assignments where game_id = g_future and umpire_id = um_b) = g_start + interval '5 minutes' then report := array_append(report, ('PASS  N5  an administrator can record an arrival 5 minutes after the start when the pretend time is 10 minutes after it')::text); else report := array_append(report, ('FAIL  N5  the pretend time was not used for the arrival')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N5  the pretend time was not used for the arrival: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_future, um_b, 'arrived', g_start + interval '30 minutes', g_start + interval '10 minutes');
    reset role;
    report := array_append(report, ('FAIL  N6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be in the future%' then report := array_append(report, ('PASS  N6  ...but an arrival after the pretend time is still ''in the future''')::text); else report := array_append(report, ('FAIL  N6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: clear B's attendance so B can try with no pretend time)
  reset role;
  update public.game_assignments set attendance = null, arrived_at = null, attendance_marked_by = null, attendance_marked_at = null where game_id = g_future and umpire_id = um_b;

  -- N7
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_future);
    reset role;
    report := array_append(report, ('FAIL  N7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 hour before%' then report := array_append(report, ('PASS  N7  even with the demo clock on, sending no pretend time uses the real time')::text); else report := array_append(report, ('FAIL  N7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: the setting is removed altogether)
  reset role;
  delete from public.app_settings where key = 'demo_clock_allowed';
  update public.game_assignments set attendance = null, arrived_at = null, attendance_marked_by = null, attendance_marked_at = null where game_id = g_future;

  -- M1
  begin
    reset role;
    select public.demo_clock_allowed() into allowed;
    reset role;
    if allowed = false then report := array_append(report, ('PASS  M1  if the setting row is missing, the demo clock is off')::text); else report := array_append(report, ('FAIL  M1  a missing setting counted as on')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  M1  a missing setting counted as on: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- M2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_future, g_start - interval '10 minutes');
    reset role;
    report := array_append(report, ('FAIL  M2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 hour before%' then report := array_append(report, ('PASS  M2  ...and a pretend time is ignored')::text); else report := array_append(report, ('FAIL  M2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nDEMO CLOCK CHECK (nothing was saved; your real settings were not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
