-- RWCLL check: attendance on game day (checking in, and administrators recording it).
--
-- Run in the Supabase SQL Editor AFTER applying 20261031100000_add_attendance.sql.
--
-- It builds its own league, games, umpires and sign-in accounts, then acts as
-- an umpire, as a super admin, as an ordinary account, and as a signed-out
-- visitor. It ENDS WITH A RED ERROR on purpose: the report is carried in the
-- error message, and raising an error guarantees that everything it created is
-- rolled back. Your real data is not changed.
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
  l1 uuid; s1 uuid; loc uuid; d1 uuid; tm1 uuid; tm2 uuid;
  g_now uuid; g_late uuid; g_early uuid; g_over uuid; g_cancel uuid; g_done uuid; g_move uuid;
  um_a uuid; um_b uuid; um_c uuid;
  at1 timestamptz; n bigint;
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

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Att A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Att B ' || stamp, 'adult', b_acct) returning id into um_b;
  insert into public.umpires (display_name, classification) values ('CHK Att C ' || stamp, 'adult') returning id into um_c;

  -- Games: one starting in 30 minutes (inside the check-in window), another like it,
  -- one in 3 hours (too early), one that ended an hour ago, one canceled, one completed, and one for moving umpires around.
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '30 minutes', now() + interval '150 minutes') returning id into g_now;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '30 minutes', now() + interval '150 minutes') returning id into g_late;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '3 hours', now() + interval '5 hours') returning id into g_early;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() - interval '3 hours', now() - interval '1 hour') returning id into g_over;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '30 minutes', now() + interval '150 minutes') returning id into g_cancel;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '30 minutes', now() + interval '150 minutes') returning id into g_done;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '2 days', now() + interval '2 days 2 hours') returning id into g_move;

  insert into public.game_assignments (game_id, umpire_id, position) values
    (g_now, um_a, 'plate'), (g_now, um_b, 'field'), (g_late, um_a, 'plate'), (g_early, um_a, 'plate'),
    (g_over, um_a, 'plate'), (g_cancel, um_a, 'plate'), (g_done, um_a, 'plate');
  update public.games set status = 'canceled' where id = g_cancel;
  update public.games set status = 'completed' where id = g_done;

  ----------------------------------------------------------------
  -- An umpire checks in
  ----------------------------------------------------------------
  -- K1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_now);
    reset role;
    if (select attendance from public.game_assignments where game_id = g_now and umpire_id = um_a) = 'arrived' and (select arrived_at from public.game_assignments where game_id = g_now and umpire_id = um_a) = now() and (select attendance_marked_by from public.game_assignments where game_id = g_now and umpire_id = um_a) = a_acct and (select count(*) from public.game_assignment_events where game_id = g_now and umpire_id = um_a and event = 'arrived') = 1 and (select note from public.game_assignment_events where game_id = g_now and umpire_id = um_a and event = 'arrived') = 'checked in themselves' then report := array_append(report, ('PASS  K1  an umpire can check in 30 minutes before the game; the time and who did it are recorded, and so is the history')::text); else report := array_append(report, ('FAIL  K1  check-in did not record correctly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K1  check-in did not record correctly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_now);
    reset role;
    if (select count(*) from public.game_assignment_events where game_id = g_now and umpire_id = um_a and event = 'arrived') = 1 and (select arrived_at from public.game_assignments where game_id = g_now and umpire_id = um_a) = now() then report := array_append(report, ('PASS  K2  checking in a second time changes nothing and adds no second history entry')::text); else report := array_append(report, ('FAIL  K2  a second check-in changed something')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K2  a second check-in changed something: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_early);
    reset role;
    report := array_append(report, ('FAIL  K3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 hour before%' then report := array_append(report, ('PASS  K3  checking in 3 hours before the game is refused, with the reason')::text); else report := array_append(report, ('FAIL  K3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_over);
    reset role;
    report := array_append(report, ('FAIL  K4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%is over%' then report := array_append(report, ('PASS  K4  checking in after the game has ended is refused')::text); else report := array_append(report, ('FAIL  K4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_cancel);
    reset role;
    report := array_append(report, ('FAIL  K5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%canceled%' then report := array_append(report, ('PASS  K5  checking in to a canceled game is refused')::text); else report := array_append(report, ('FAIL  K5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_done);
    reset role;
    report := array_append(report, ('FAIL  K6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already marked completed%' then report := array_append(report, ('PASS  K6  checking in to a completed game is refused')::text); else report := array_append(report, ('FAIL  K6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K7
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_late);
    reset role;
    report := array_append(report, ('FAIL  K7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not assigned%' then report := array_append(report, ('PASS  K7  an umpire who is not on the game cannot check in')::text); else report := array_append(report, ('FAIL  K7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_now);
    reset role;
    report := array_append(report, ('FAIL  K8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%linked to an umpire record%' then report := array_append(report, ('PASS  K8  an account with no umpire record cannot check in')::text); else report := array_append(report, ('FAIL  K8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K9
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.check_in(g_now);
    reset role;
    report := array_append(report, ('FAIL  K9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  K9  a signed-out visitor cannot check in')::text); else report := array_append(report, ('FAIL  K9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K10
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.game_assignments set attendance = 'no_show' where game_id = g_early;
    reset role;
    if (select attendance from public.game_assignments where game_id = g_early and umpire_id = um_a) is null then report := array_append(report, ('PASS  K10  an umpire cannot write attendance by editing the table directly')::text); else report := array_append(report, ('FAIL  K10  an umpire changed attendance directly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K10  an umpire changed attendance directly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: an administrator marks A as a no-show on the other game, then A turns up)
  reset role;
  update public.game_assignments set attendance = 'no_show', attendance_marked_by = t_admin, attendance_marked_at = now() where game_id = g_late and umpire_id = um_a;

  -- K11
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.check_in(g_late);
    reset role;
    if (select attendance from public.game_assignments where game_id = g_late and umpire_id = um_a) = 'arrived' and (select arrived_at from public.game_assignments where game_id = g_late and umpire_id = um_a) is not null then report := array_append(report, ('PASS  K11  an umpire marked as a no-show can still check in (they turned up after all)')::text); else report := array_append(report, ('FAIL  K11  a marked no-show could not check in')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K11  a marked no-show could not check in: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- An administrator records attendance
  ----------------------------------------------------------------
  -- A1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_over, um_a, 'arrived', now() - interval '170 minutes');
    reset role;
    if (select attendance from public.game_assignments where game_id = g_over and umpire_id = um_a) = 'arrived' and (select arrived_at from public.game_assignments where game_id = g_over and umpire_id = um_a) = now() - interval '170 minutes' and (select attendance_marked_by from public.game_assignments where game_id = g_over and umpire_id = um_a) = t_admin and (select note from public.game_assignment_events where game_id = g_over and umpire_id = um_a and event = 'arrived') = 'recorded by an administrator' then report := array_append(report, ('PASS  A1  an administrator can record an arrival time (even after the game is over), and it is marked as theirs in the history')::text); else report := array_append(report, ('FAIL  A1  the administrator''s arrival was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A1  the administrator''s arrival was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A1b
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_over, um_a, 'arrived', now() - interval '100 minutes');
    reset role;
    if (select arrived_at from public.game_assignments where game_id = g_over and umpire_id = um_a) = now() - interval '100 minutes' then report := array_append(report, ('PASS  A1b  ...and can correct it')::text); else report := array_append(report, ('FAIL  A1b  the correction was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A1b  the correction was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, 'arrived');
    reset role;
    if (select arrived_at from public.game_assignments where game_id = g_now and umpire_id = um_b) = now() then report := array_append(report, ('PASS  A2  an arrival with no time given is ''now''')::text); else report := array_append(report, ('FAIL  A2  no default time')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A2  no default time: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, 'arrived', now() + interval '1 hour');
    reset role;
    report := array_append(report, ('FAIL  A3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be in the future%' then report := array_append(report, ('PASS  A3  an arrival time in the future is refused')::text); else report := array_append(report, ('FAIL  A3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, 'arrived', now() - interval '20 hours');
    reset role;
    report := array_append(report, ('FAIL  A4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%too long before%' then report := array_append(report, ('PASS  A4  an arrival time more than 12 hours before the game is refused')::text); else report := array_append(report, ('FAIL  A4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, 'no_show');
    reset role;
    if (select attendance from public.game_assignments where game_id = g_now and umpire_id = um_b) = 'no_show' and (select arrived_at from public.game_assignments where game_id = g_now and umpire_id = um_b) is null and (select count(*) from public.game_assignment_events where game_id = g_now and umpire_id = um_b and event = 'no_show') = 1 then report := array_append(report, ('PASS  A5  an administrator can mark a no-show (the arrival time is cleared)')::text); else report := array_append(report, ('FAIL  A5  the no-show was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A5  the no-show was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, null);
    reset role;
    if (select attendance from public.game_assignments where game_id = g_now and umpire_id = um_b) is null and (select arrived_at from public.game_assignments where game_id = g_now and umpire_id = um_b) is null and (select attendance_marked_by from public.game_assignments where game_id = g_now and umpire_id = um_b) is null and (select attendance_marked_at from public.game_assignments where game_id = g_now and umpire_id = um_b) is null and (select count(*) from public.game_assignment_events where game_id = g_now and umpire_id = um_b and event = 'attendance_cleared') = 1 then report := array_append(report, ('PASS  A6  ...and can clear it again, which is also recorded')::text); else report := array_append(report, ('FAIL  A6  clearing did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A6  clearing did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, 'late');
    reset role;
    report := array_append(report, ('FAIL  A7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%must be arrived, no_show, or blank%' then report := array_append(report, ('PASS  A7  any other value is refused')::text); else report := array_append(report, ('FAIL  A7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A8
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_c, 'arrived');
    reset role;
    report := array_append(report, ('FAIL  A8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not assigned%' then report := array_append(report, ('PASS  A8  an umpire who is not on the game cannot be marked')::text); else report := array_append(report, ('FAIL  A8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A9
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_cancel, um_a, 'arrived');
    reset role;
    report := array_append(report, ('FAIL  A9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%canceled%' then report := array_append(report, ('PASS  A9  a canceled game cannot have attendance recorded')::text); else report := array_append(report, ('FAIL  A9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A10
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, 'arrived');
    reset role;
    report := array_append(report, ('FAIL  A10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  A10  an ordinary account cannot record attendance')::text); else report := array_append(report, ('FAIL  A10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A11
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_set_attendance(g_now, um_b, 'arrived');
    reset role;
    report := array_append(report, ('FAIL  A11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  A11  an umpire cannot record attendance for someone else')::text); else report := array_append(report, ('FAIL  A11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A12
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.admin_set_attendance(g_now, um_b, 'arrived');
    reset role;
    report := array_append(report, ('FAIL  A12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  A12  a signed-out visitor cannot record attendance')::text); else report := array_append(report, ('FAIL  A12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- The table's own safeguards
  ----------------------------------------------------------------
  -- T1
  begin
    reset role;
    update public.game_assignments set attendance = 'arrived', arrived_at = null where game_id = g_now and umpire_id = um_b;
    reset role;
    report := array_append(report, ('FAIL  T1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  T1  ''arrived'' without an arrival time is refused by the table itself')::text); else report := array_append(report, ('FAIL  T1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T2
  begin
    reset role;
    update public.game_assignments set attendance = null, arrived_at = now() where game_id = g_now and umpire_id = um_b;
    reset role;
    report := array_append(report, ('FAIL  T2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  T2  an arrival time with no ''arrived'' is refused too')::text); else report := array_append(report, ('FAIL  T2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T3
  begin
    reset role;
    update public.game_assignments set attendance = 'late' where game_id = g_now and umpire_id = um_b;
    reset role;
    report := array_append(report, ('FAIL  T3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  T3  an unknown attendance value is refused by the table itself')::text); else report := array_append(report, ('FAIL  T3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- Moving umpires around keeps attendance
  ----------------------------------------------------------------
  -- (setup, not a test: two umpires on a game; one arrived, one no-show; one flagged as told-about and warned)
  reset role;
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.set_game_umpires(g_move, jsonb_build_object('plate', um_a, 'field', um_b));
  reset role;
  at1 := now() - interval '90 minutes';
  update public.game_assignments set attendance = 'arrived', arrived_at = at1, attendance_marked_by = t_admin, attendance_marked_at = now(), self_assigned = true, status = 'confirmed', confirmed_at = now() - interval '1 day', self_assign_notified_at = now() - interval '1 day', unconfirmed_warned_at = now() - interval '2 days' where game_id = g_move and umpire_id = um_a;
  update public.game_assignments set attendance = 'no_show', attendance_marked_by = t_admin, attendance_marked_at = now() where game_id = g_move and umpire_id = um_b;

  -- S1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_move, jsonb_build_object('plate', um_b, 'field', um_a));
    reset role;
    if (select position from public.game_assignments where game_id = g_move and umpire_id = um_a) = 'field' and (select attendance from public.game_assignments where game_id = g_move and umpire_id = um_a) = 'arrived' and (select arrived_at from public.game_assignments where game_id = g_move and umpire_id = um_a) = at1 and (select attendance from public.game_assignments where game_id = g_move and umpire_id = um_b) = 'no_show' and (select position from public.game_assignments where game_id = g_move and umpire_id = um_b) = 'plate' then report := array_append(report, ('PASS  S1  swapping two umpires between places keeps each one''s attendance (and arrival time)')::text); else report := array_append(report, ('FAIL  S1  attendance was lost when umpires swapped places')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  attendance was lost when umpires swapped places: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2
  begin
    reset role;
    null;
    reset role;
    if (select self_assign_notified_at from public.game_assignments where game_id = g_move and umpire_id = um_a) is not null and (select unconfirmed_warned_at from public.game_assignments where game_id = g_move and umpire_id = um_a) is not null and (select self_assigned from public.game_assignments where game_id = g_move and umpire_id = um_a) = true and (select status from public.game_assignments where game_id = g_move and umpire_id = um_a) = 'confirmed' then report := array_append(report, ('PASS  S2  ...and it also keeps whether admins were told about a self-assigned game, and the unconfirmed warning, so no message is queued twice')::text); else report := array_append(report, ('FAIL  S2  the ''told'' flags were lost when umpires swapped places')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S2  the ''told'' flags were lost when umpires swapped places: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_move, jsonb_build_object('plate', um_b));
    reset role;
    if not exists (select 1 from public.game_assignments where game_id = g_move and umpire_id = um_a) and (select attendance from public.game_assignments where game_id = g_move and umpire_id = um_b) = 'no_show' then report := array_append(report, ('PASS  S3  taking an umpire off the game removes them (and their attendance), and the other keeps theirs')::text); else report := array_append(report, ('FAIL  S3  removing an umpire went wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S3  removing an umpire went wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- The history
  ----------------------------------------------------------------
  -- E1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_assignment_events where game_id in (g_now, g_over) and event in ('arrived', 'no_show', 'attendance_cleared');
    reset role;
    if n >= 5 then report := array_append(report, ('PASS  E1  an administrator can read the arrivals, no-shows and clearings in the history')::text); else report := array_append(report, ('FAIL  E1  the administrator could not read the history')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E1  the administrator could not read the history: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_assignment_events;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  E2  an ordinary account sees none of the history')::text); else report := array_append(report, ('FAIL  E2  an ordinary account saw the history')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E2  an ordinary account saw the history: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nATTENDANCE CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
