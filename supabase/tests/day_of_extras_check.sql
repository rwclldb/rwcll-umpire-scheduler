-- RWCLL check: game day extras (rainouts, running late, field notes and access
-- details, the umpire's day view, and "administrators only" notes).
--
-- Run in the Supabase SQL Editor AFTER applying 20261104100000_add_game_day_extras.sql
-- (which needs the demo clock and game notes migrations applied first).
--
-- It builds its own league, fields, games, umpires and sign-in accounts, then acts
-- as an umpire, a partner umpire, another umpire, an ordinary account, a super
-- admin and a signed-out visitor. It ENDS WITH A RED ERROR on purpose: the report
-- is carried in the error message, and raising an error guarantees that
-- everything it created is rolled back. Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid(); c_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; d1 uuid; tm1 uuid; tm2 uuid;
  loc1 uuid; loc2 uuid; loc3 uuid;
  g_soon uuid; g_far uuid; g_over uuid; g_cancel uuid; g_b uuid;
  g_r1 uuid; g_r2 uuid; g_r3 uuid; g_rdone uuid; g_rcanc uuid;
  um_a uuid; um_b uuid; um_c uuid;
  n bigint; closure uuid; far_start timestamptz; n_txt text;
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
      (c_acct, 'chk-' || stamp || '-c@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (a_acct, b_acct, c_acct, x_acct);

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field 1 ' || stamp) returning id into loc1;
  insert into public.locations (name) values ('CHK Field 2 ' || stamp) returning id into loc2;
  insert into public.locations (name) values ('CHK Field 3 ' || stamp) returning id into loc3;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into tm2;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Late A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Late B ' || stamp, 'adult', b_acct) returning id into um_b;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Late C ' || stamp, 'adult', c_acct) returning id into um_c;

  -- games (all in division d1; see the comments for what each is for)
  far_start := date_trunc('hour', now()) + interval '3 days';
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc1, now() + interval '2 hours', now() + interval '4 hours') returning id into g_soon;    -- inside the 24 hour window
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc1, far_start, far_start + interval '2 hours') returning id into g_far;                  -- three days away
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc1, now() - interval '4 hours', now() - interval '2 hours') returning id into g_over;   -- already over
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc1, now() + interval '1 hour', now() + interval '3 hours') returning id into g_cancel;   -- will be canceled
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc2, now() + interval '2 hours', now() + interval '4 hours') returning id into g_b;          -- another field, umpire B
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc3, now() + interval '1 hour', now() + interval '3 hours') returning id into g_r1;         -- closure: in the window
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc3, now() + interval '5 hours', now() + interval '7 hours') returning id into g_r2;        -- closure: in the window
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc3, now() + interval '30 hours', now() + interval '32 hours') returning id into g_r3;      -- closure: after the window
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc3, now() - interval '5 hours', now() - interval '3 hours') returning id into g_rdone;      -- closure: already played
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc3, now() + interval '2 hours', now() + interval '4 hours') returning id into g_rcanc;      -- closure: already canceled

  insert into public.game_assignments (game_id, umpire_id, position) values
    (g_soon, um_a, 'plate'), (g_soon, um_c, 'field'), (g_far, um_a, 'plate'), (g_over, um_a, 'plate'), (g_cancel, um_a, 'plate'),
    (g_b, um_b, 'plate'), (g_r1, um_a, 'plate'), (g_r2, um_c, 'plate'), (g_r3, um_b, 'plate');
  update public.games set status = 'canceled' where id in (g_cancel, g_rcanc);
  update public.games set status = 'completed' where id = g_rdone;
  -- (a new game starts as a draft in this database; a closing cancels drafts and scheduled games alike,
  -- and reopening puts each back as it was. g_r1 and g_r3 are scheduled; g_r2 stays a draft.)
  update public.games set status = 'scheduled' where id in (g_r1, g_r3);

  ----------------------------------------------------------------
  -- 1. Notes marked 'administrators only'
  ----------------------------------------------------------------
  -- AO1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g_soon, 'A private note', true);
    reset role;
    if (select admin_only from public.game_notes where game_id = g_soon and body = 'A private note') = true then report := array_append(report, ('PASS  AO1  an umpire can mark their note ''administrators only''')::text); else report := array_append(report, ('FAIL  AO1  the flag was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO1  the flag was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AO2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g_soon, 'A normal note');
    reset role;
    if (select admin_only from public.game_notes where game_id = g_soon and body = 'A normal note') = false then report := array_append(report, ('PASS  AO2  a note is open to the whole game by default')::text); else report := array_append(report, ('FAIL  AO2  a note was private by default')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO2  a note was private by default: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AO3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id = g_soon;
    reset role;
    if n = 2 then report := array_append(report, ('PASS  AO3  the writer reads their own private note, and the normal note')::text); else report := array_append(report, ('FAIL  AO3  the writer could not read their own private note')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO3  the writer could not read their own private note: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AO4
  begin
    perform set_config('request.jwt.claim.sub', c_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', c_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id = g_soon;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  AO4  the other umpire on the game reads the normal note but NOT the private one')::text); else report := array_append(report, ('FAIL  AO4  a private note was visible to the other umpire')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO4  a private note was visible to the other umpire: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AO5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id = g_soon;
    reset role;
    if n = 2 then report := array_append(report, ('PASS  AO5  an administrator reads both')::text); else report := array_append(report, ('FAIL  AO5  the administrator could not read a private note')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO5  the administrator could not read a private note: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AO6
  begin
    perform set_config('request.jwt.claim.sub', c_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', c_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_note(g_soon, 'C private', true);
    reset role;
    if (select count(*) from public.game_notes where game_id = g_soon) = 3 then report := array_append(report, ('PASS  AO6  the other umpire can add a private note too')::text); else report := array_append(report, ('FAIL  AO6  the second private note was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO6  the second private note was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AO7
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id = g_soon;
    reset role;
    if n = 2 then report := array_append(report, ('PASS  AO7  ...and the first umpire does not see it (they see their own private note and the normal one)')::text); else report := array_append(report, ('FAIL  AO7  a private note was visible to someone else')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO7  a private note was visible to someone else: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AO8
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_notes where game_id = g_soon;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  AO8  an umpire not on the game sees none of them')::text); else report := array_append(report, ('FAIL  AO8  an umpire read notes on a game they are not on')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AO8  an umpire read notes on a game they are not on: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 2. Field notes: parking and directions, and access details
  ----------------------------------------------------------------
  -- F1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.locations set directions = 'Park on Main Street. Enter by the blue gate.' where id = loc1;
    reset role;
    if (select directions from public.locations where id = loc1) like 'Park on Main%' then report := array_append(report, ('PASS  F1  an administrator can write parking and directions for a field')::text); else report := array_append(report, ('FAIL  F1  the directions were not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F1  the directions were not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.locations set directions = repeat('x', 1001) where id = loc1;
    reset role;
    report := array_append(report, ('FAIL  F2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  F2  directions over 1000 characters are refused')::text); else report := array_append(report, ('FAIL  F2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin update public.locations set directions = 'hacked' where id = loc1; exception when insufficient_privilege then null; end;
    reset role;
    if (select directions from public.locations where id = loc1) like 'Park on Main%' then report := array_append(report, ('PASS  F3  an umpire cannot change a field''s directions (either refused, or nothing changes)')::text); else report := array_append(report, ('FAIL  F3  an umpire changed the directions')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F3  an umpire changed the directions: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.locations where id = loc1 and directions is not null;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  F4  directions are general: any signed-in person can read them')::text); else report := array_append(report, ('FAIL  F4  directions were hidden from an ordinary account')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F4  directions were hidden from an ordinary account: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_location_access_details(loc1, E'  Gate code 1234  \n');
    reset role;
    if (select body from public.location_access_notes where location_id = loc1) = 'Gate code 1234' then report := array_append(report, ('PASS  F5  an administrator can set a field''s access details (tidied)')::text); else report := array_append(report, ('FAIL  F5  the access details were not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F5  the access details were not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_location_access_details(loc1, 'umpire wrote this');
    reset role;
    report := array_append(report, ('FAIL  F6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  F6  an umpire cannot set access details')::text); else report := array_append(report, ('FAIL  F6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_location_access_details(loc1, repeat('x', 501));
    reset role;
    report := array_append(report, ('FAIL  F7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 500%' then report := array_append(report, ('PASS  F7  access details over 500 characters are refused')::text); else report := array_append(report, ('FAIL  F7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F8
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_location_access_details(gen_random_uuid(), 'x');
    reset role;
    report := array_append(report, ('FAIL  F8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  F8  access details for a field that does not exist are refused')::text); else report := array_append(report, ('FAIL  F8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F9
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.location_access_notes;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  F9  the access details table is invisible to an umpire (even one with a game at that field)')::text); else report := array_append(report, ('FAIL  F9  an umpire read the access details table')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F9  an umpire read the access details table: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F10
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.location_access_notes;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  F10  ...and to an ordinary account')::text); else report := array_append(report, ('FAIL  F10  an ordinary account read the access details table')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F10  an ordinary account read the access details table: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F11
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.location_access_notes where location_id = loc1;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  F11  an administrator reads it')::text); else report := array_append(report, ('FAIL  F11  the administrator could not read the access details table')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F11  the administrator could not read the access details table: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F12
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.location_access_notes (location_id, body) values (loc2, 'sneaky');
    reset role;
    report := array_append(report, ('FAIL  F12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  F12  nobody can write the table directly')::text); else report := array_append(report, ('FAIL  F12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F13
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_soon) into n_txt;
    reset role;
    if n_txt = 'Gate code 1234' then report := array_append(report, ('PASS  F13  an umpire on a game within 24 hours of its start gets the access details')::text); else report := array_append(report, ('FAIL  F13  the umpire could not get the access details')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F13  the umpire could not get the access details: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F14
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_far) into n_txt;
    reset role;
    if n_txt is null then report := array_append(report, ('PASS  F14  ...but not for a game more than 24 hours away')::text); else report := array_append(report, ('FAIL  F14  access details were given more than 24 hours early')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F14  access details were given more than 24 hours early: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F15
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_over) into n_txt;
    reset role;
    if n_txt is null then report := array_append(report, ('PASS  F15  ...nor after the game has ended')::text); else report := array_append(report, ('FAIL  F15  access details were given after the game')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F15  access details were given after the game: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F16
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_cancel) into n_txt;
    reset role;
    if n_txt is null then report := array_append(report, ('PASS  F16  ...nor for a canceled game')::text); else report := array_append(report, ('FAIL  F16  access details were given for a canceled game')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F16  access details were given for a canceled game: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F17
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_soon) into n_txt;
    reset role;
    if n_txt is null then report := array_append(report, ('PASS  F17  an umpire who is NOT on the game gets nothing, even at the same field')::text); else report := array_append(report, ('FAIL  F17  access details went to an umpire not on the game')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F17  access details went to an umpire not on the game: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F18
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_soon) into n_txt;
    reset role;
    if n_txt is null then report := array_append(report, ('PASS  F18  an ordinary account gets nothing')::text); else report := array_append(report, ('FAIL  F18  access details went to an ordinary account')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F18  access details went to an ordinary account: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F19
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.get_game_access_details(g_soon);
    reset role;
    report := array_append(report, ('FAIL  F19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  F19  a signed-out visitor cannot ask')::text); else report := array_append(report, ('FAIL  F19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F20
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_far) into n_txt;
    reset role;
    if n_txt = 'Gate code 1234' then report := array_append(report, ('PASS  F20  an administrator gets them for any game, any time')::text); else report := array_append(report, ('FAIL  F20  the administrator could not get the access details')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F20  the administrator could not get the access details: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: switch the demo clock OFF)
  reset role;
  update public.app_settings set value = 'false' where key = 'demo_clock_allowed';

  -- F21
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_far, far_start - interval '1 hour') into n_txt;
    reset role;
    if n_txt is null then report := array_append(report, ('PASS  F21  with the demo clock off, a pretend time is ignored (no details three days early)')::text); else report := array_append(report, ('FAIL  F21  a pretend time was used with the demo clock off')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F21  a pretend time was used with the demo clock off: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: switch the demo clock ON)
  reset role;
  update public.app_settings set value = 'true' where key = 'demo_clock_allowed';

  -- F22
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_far, far_start - interval '23 hours') into n_txt;
    reset role;
    if n_txt = 'Gate code 1234' then report := array_append(report, ('PASS  F22  with the demo clock on, the 24 hour window follows the pretend time (23 hours before: yes)')::text); else report := array_append(report, ('FAIL  F22  the pretend time was not used')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F22  the pretend time was not used: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F23
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.get_game_access_details(g_far, far_start - interval '25 hours') into n_txt;
    reset role;
    if n_txt is null then report := array_append(report, ('PASS  F23  ...(25 hours before: no)')::text); else report := array_append(report, ('FAIL  F23  the window was wrong with a pretend time')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F23  the window was wrong with a pretend time: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F24
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_location_access_details(loc1, '   ');
    reset role;
    if not exists (select 1 from public.location_access_notes where location_id = loc1) then report := array_append(report, ('PASS  F24  blank access details remove them')::text); else report := array_append(report, ('FAIL  F24  blank details were not removed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F24  blank details were not removed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: put them back for the later tests)
  reset role;
  insert into public.location_access_notes (location_id, body) values (loc1, 'Gate code 1234');

  ----------------------------------------------------------------
  -- 3. Rainouts: closing a field
  ----------------------------------------------------------------
  -- R1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(loc3, now(), now() + interval '10 hours', 'Rain');
    reset role;
    report := array_append(report, ('FAIL  R1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  R1  an umpire cannot close a field')::text); else report := array_append(report, ('FAIL  R1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(loc3, now(), now() + interval '10 hours', 'Rain');
    reset role;
    report := array_append(report, ('FAIL  R2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  R2  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  R2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.close_field(loc3, now(), now() + interval '10 hours', 'Rain');
    reset role;
    report := array_append(report, ('FAIL  R3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R3  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  R3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(loc3, now(), now() + interval '10 hours', '   ');
    reset role;
    report := array_append(report, ('FAIL  R4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Give a reason%' then report := array_append(report, ('PASS  R4  a reason is required')::text); else report := array_append(report, ('FAIL  R4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(loc3, now(), now() + interval '10 hours', repeat('x', 201));
    reset role;
    report := array_append(report, ('FAIL  R5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 200%' then report := array_append(report, ('PASS  R5  a reason over 200 characters is refused')::text); else report := array_append(report, ('FAIL  R5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(loc3, now() + interval '10 hours', now(), 'Rain');
    reset role;
    report := array_append(report, ('FAIL  R6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%must end after%' then report := array_append(report, ('PASS  R6  the end must be after the start')::text); else report := array_append(report, ('FAIL  R6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(loc3, now(), now() + interval '8 days', 'Rain');
    reset role;
    report := array_append(report, ('FAIL  R7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 7 days%' then report := array_append(report, ('PASS  R7  a closing of more than 7 days is refused')::text); else report := array_append(report, ('FAIL  R7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R8
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(gen_random_uuid(), now(), now() + interval '10 hours', 'Rain');
    reset role;
    report := array_append(report, ('FAIL  R8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  R8  a field that does not exist is refused')::text); else report := array_append(report, ('FAIL  R8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R9
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.close_field(loc3, now() + interval '100 hours', now() + interval '101 hours', 'Rain');
    reset role;
    report := array_append(report, ('FAIL  R9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%no games to cancel%' then report := array_append(report, ('PASS  R9  a closing that would cancel nothing is refused (so a mistake does not leave an empty closing)')::text); else report := array_append(report, ('FAIL  R9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R10
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.close_field(loc3, now(), now() + interval '10 hours', E'  Rain  ') into n;
    reset role;
    if n = 2 then report := array_append(report, ('PASS  R10  closing a field for the next 10 hours cancels exactly the 2 games that start in that time')::text); else report := array_append(report, ('FAIL  R10  the wrong number of games was canceled')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R10  the wrong number of games was canceled: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R11
  begin
    reset role;
    null;
    reset role;
    if (select status from public.games where id = g_r1) = 'canceled' and (select status from public.games where id = g_r2) = 'canceled' then report := array_append(report, ('PASS  R11  both games in the window are canceled (the scheduled one and the draft)')::text); else report := array_append(report, ('FAIL  R11  a game in the window was not canceled')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R11  a game in the window was not canceled: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R12
  begin
    reset role;
    null;
    reset role;
    if (select status from public.games where id = g_r3) = 'scheduled' and (select status from public.games where id = g_rdone) = 'completed' and (select status from public.games where id = g_rcanc) = 'canceled' then report := array_append(report, ('PASS  R12  a game after the window, one already played, and one already canceled are left as they were')::text); else report := array_append(report, ('FAIL  R12  a game outside the closing was changed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R12  a game outside the closing was changed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R13
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.game_notes where game_id = g_r1 and body = 'Canceled: Rain' and author_name is not null) = 1 and (select count(*) from public.game_notes where game_id = g_r2 and body = 'Canceled: Rain') = 1 and (select count(*) from public.game_notes where game_id = g_r3) = 0 then report := array_append(report, ('PASS  R13  each canceled game gets a note saying why (reason tidied), and the others get none')::text); else report := array_append(report, ('FAIL  R13  the cancellation notes are wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R13  the cancellation notes are wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R14
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = a_acct and subject like 'Game canceled') = 1 and (select count(*) from public.email_outbox where to_profile_id = c_acct and subject like 'Game canceled') = 1 and (select count(*) from public.email_outbox where to_profile_id = b_acct and subject like 'Game canceled') = 0 then report := array_append(report, ('PASS  R14  the umpires on the canceled games were each told once; an umpire only on a later game was not')::text); else report := array_append(report, ('FAIL  R14  the wrong people were told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R14  the wrong people were told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R15
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.field_closure_games cg join public.field_closures c on c.id = cg.closure_id where c.location_id = loc3 and cg.previous_status = 'scheduled') = 1 and (select count(*) from public.field_closure_games cg join public.field_closures c on c.id = cg.closure_id where c.location_id = loc3 and cg.previous_status = 'draft') = 1 and (select reason from public.field_closures where location_id = loc3) = 'Rain' then report := array_append(report, ('PASS  R15  the closing records its reason and what each game was before (one scheduled, one draft)')::text); else report := array_append(report, ('FAIL  R15  the closing was not recorded properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R15  the closing was not recorded properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R16
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.field_closures where location_id = loc3;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  R16  an administrator reads the closings')::text); else report := array_append(report, ('FAIL  R16  the administrator could not read closings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R16  the administrator could not read closings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R17
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.field_closures;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R17  an umpire does not')::text); else report := array_append(report, ('FAIL  R17  an umpire read closings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R17  an umpire read closings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R18
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.field_closures (location_id, closes_from, closes_to, reason, created_by_name) values (loc3, now(), now() + interval '1 hour', 'x', 'x');
    reset role;
    report := array_append(report, ('FAIL  R18  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R18  closings cannot be written directly')::text); else report := array_append(report, ('FAIL  R18  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: an administrator put one of the games back by hand, and remember the closing)
  reset role;
  update public.games set status = 'scheduled' where id = g_r2;
  select id into closure from public.field_closures where location_id = loc3;

  -- R19
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reopen_closure(closure);
    reset role;
    report := array_append(report, ('FAIL  R19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  R19  an umpire cannot reopen a field')::text); else report := array_append(report, ('FAIL  R19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R20
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reopen_closure(gen_random_uuid());
    reset role;
    report := array_append(report, ('FAIL  R20  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  R20  reopening a closing that does not exist is refused')::text); else report := array_append(report, ('FAIL  R20  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R21
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.reopen_closure(closure) into n;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  R21  reopening puts back only the games still canceled (the one changed by hand is left alone)')::text); else report := array_append(report, ('FAIL  R21  reopen restored the wrong games')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R21  reopen restored the wrong games: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R22
  begin
    reset role;
    null;
    reset role;
    if (select status from public.games where id = g_r1) = 'scheduled' and (select count(*) from public.game_notes where game_id = g_r1 and body like 'Back on%') = 1 and (select count(*) from public.game_notes where game_id = g_r2 and body like 'Back on%') = 0 then report := array_append(report, ('PASS  R22  the restored game is scheduled again with a ''Back on'' note; the other has none')::text); else report := array_append(report, ('FAIL  R22  reopen notes are wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R22  reopen notes are wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R23
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = a_acct and subject like 'Game back on') = 1 and (select count(*) from public.email_outbox where to_profile_id = c_acct and subject like 'Game back on') = 0 then report := array_append(report, ('PASS  R23  the umpire on the restored game was told it is back on')::text); else report := array_append(report, ('FAIL  R23  the wrong people were told it was back on')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R23  the wrong people were told it was back on: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R24
  begin
    reset role;
    null;
    reset role;
    if (select reopened_at from public.field_closures where id = closure) is not null and (select reopened_by_name from public.field_closures where id = closure) is not null then report := array_append(report, ('PASS  R24  the closing records that it was reopened, and by whom')::text); else report := array_append(report, ('FAIL  R24  the reopening was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R24  the reopening was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R25
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reopen_closure(closure);
    reset role;
    report := array_append(report, ('FAIL  R25  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already been reopened%' then report := array_append(report, ('PASS  R25  a closing cannot be reopened twice')::text); else report := array_append(report, ('FAIL  R25  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 4. Running late
  ----------------------------------------------------------------
  -- L1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 15);
    reset role;
    if (select minutes from public.running_late_reports where game_id = g_soon and umpire_id = um_a) = 15 then report := array_append(report, ('PASS  L1  an umpire on a game can say they are running 15 minutes late')::text); else report := array_append(report, ('FAIL  L1  the report was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L1  the report was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L2
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'CHK Late A %is running late') = 1 then report := array_append(report, ('PASS  L2  the administrators were told')::text); else report := array_append(report, ('FAIL  L2  the administrators were not told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L2  the administrators were not told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 15);
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'CHK Late A %is running late') = 1 then report := array_append(report, ('PASS  L3  pressing it again with the same number does not send another message')::text); else report := array_append(report, ('FAIL  L3  a duplicate message was sent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L3  a duplicate message was sent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 25);
    reset role;
    if (select minutes from public.running_late_reports where game_id = g_soon and umpire_id = um_a) = 25 and (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'CHK Late A %is running late') = 2 and (select count(*) from public.running_late_reports where game_id = g_soon and umpire_id = um_a) = 1 then report := array_append(report, ('PASS  L4  a new number replaces the old one (still one report) and the administrators are told of the change')::text); else report := array_append(report, ('FAIL  L4  changing the number did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L4  changing the number did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L5
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 10);
    reset role;
    report := array_append(report, ('FAIL  L5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not assigned%' then report := array_append(report, ('PASS  L5  an umpire not on the game cannot')::text); else report := array_append(report, ('FAIL  L5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L6
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 10);
    reset role;
    report := array_append(report, ('FAIL  L6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%linked to an umpire record%' then report := array_append(report, ('PASS  L6  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  L6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.report_running_late(g_soon, 10);
    reset role;
    report := array_append(report, ('FAIL  L7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L7  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  L7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L8
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 0);
    reset role;
    report := array_append(report, ('FAIL  L8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 to 180%' then report := array_append(report, ('PASS  L8  0 minutes is refused')::text); else report := array_append(report, ('FAIL  L8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L9
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 181);
    reset role;
    report := array_append(report, ('FAIL  L9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%from 1 to 180%' then report := array_append(report, ('PASS  L9  181 minutes is refused')::text); else report := array_append(report, ('FAIL  L9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L10
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_cancel, 10);
    reset role;
    report := array_append(report, ('FAIL  L10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%canceled%' then report := array_append(report, ('PASS  L10  a canceled game is refused')::text); else report := array_append(report, ('FAIL  L10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L11
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_over, 10);
    reset role;
    report := array_append(report, ('FAIL  L11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%is over%' then report := array_append(report, ('PASS  L11  a game that is over is refused')::text); else report := array_append(report, ('FAIL  L11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L12
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_far, 10);
    reset role;
    report := array_append(report, ('FAIL  L12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%too early%' then report := array_append(report, ('PASS  L12  three days before the game is too early to say you are late')::text); else report := array_append(report, ('FAIL  L12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: C has already checked in)
  reset role;
  update public.game_assignments set attendance = 'arrived', arrived_at = now(), attendance_marked_by = c_acct where game_id = g_soon and umpire_id = um_c;

  -- L13
  begin
    perform set_config('request.jwt.claim.sub', c_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', c_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_soon, 10);
    reset role;
    report := array_append(report, ('FAIL  L13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already checked in%' then report := array_append(report, ('PASS  L13  an umpire who has already checked in cannot say they are running late')::text); else report := array_append(report, ('FAIL  L13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L14
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.running_late_reports;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  L14  an umpire reads their own report')::text); else report := array_append(report, ('FAIL  L14  an umpire could not read their own report')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L14  an umpire could not read their own report: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L15
  begin
    perform set_config('request.jwt.claim.sub', c_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', c_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.running_late_reports;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  L15  ...but not another umpire''s')::text); else report := array_append(report, ('FAIL  L15  an umpire read another umpire''s report')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L15  an umpire read another umpire''s report: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L16
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.running_late_reports where game_id = g_soon;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  L16  an administrator reads them')::text); else report := array_append(report, ('FAIL  L16  the administrator could not read the report')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L16  the administrator could not read the report: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L17
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.running_late_reports (game_id, umpire_id, minutes) values (g_soon, um_a, 5);
    reset role;
    report := array_append(report, ('FAIL  L17  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L17  reports cannot be written directly')::text); else report := array_append(report, ('FAIL  L17  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L18
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.clear_running_late(g_soon);
    reset role;
    if not exists (select 1 from public.running_late_reports where game_id = g_soon and umpire_id = um_a) then report := array_append(report, ('PASS  L18  an umpire can take their report back')::text); else report := array_append(report, ('FAIL  L18  the report was not cleared')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L18  the report was not cleared: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L19
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.clear_running_late(g_soon);
    reset role;
    if true then report := array_append(report, ('PASS  L19  clearing when there is none is harmless')::text); else report := array_append(report, ('FAIL  L19  clearing nothing failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L19  clearing nothing failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: switch the demo clock OFF)
  reset role;
  update public.app_settings set value = 'false' where key = 'demo_clock_allowed';

  -- L20
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_far, 10, far_start - interval '1 hour');
    reset role;
    report := array_append(report, ('FAIL  L20  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%too early%' then report := array_append(report, ('PASS  L20  with the demo clock off, a pretend time is ignored (still three days early, so it is refused)')::text); else report := array_append(report, ('FAIL  L20  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- (setup, not a test: switch the demo clock ON)
  reset role;
  update public.app_settings set value = 'true' where key = 'demo_clock_allowed';

  -- L21
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.report_running_late(g_far, 10, far_start - interval '1 hour');
    reset role;
    if (select reported_at from public.running_late_reports where game_id = g_far and umpire_id = um_a) = far_start - interval '1 hour' then report := array_append(report, ('PASS  L21  with the demo clock on, the report is stamped with the pretend time (and the 12-hour limit follows it)')::text); else report := array_append(report, ('FAIL  L21  the pretend time was not used')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L21  the pretend time was not used: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 5. Who else is on my games (names only)
  ----------------------------------------------------------------
  -- P1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_partners(array[g_soon, g_far, g_b]);
    reset role;
    if n = 1 then report := array_append(report, ('PASS  P1  an umpire sees one other umpire across their games and another umpire''s game (just C, on g_soon)')::text); else report := array_append(report, ('FAIL  P1  the partner list was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P1  the partner list was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_partners(array[g_soon]) where umpire_name = 'CHK Late C ' || stamp and place = 'field';
    reset role;
    if n = 1 then report := array_append(report, ('PASS  P2  it gives the partner''s name and place')::text); else report := array_append(report, ('FAIL  P2  the partner''s name was missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P2  the partner''s name was missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_partners(array[g_b]);
    reset role;
    if n = 0 then report := array_append(report, ('PASS  P3  nothing for a game they are not on')::text); else report := array_append(report, ('FAIL  P3  partners of someone else''s game were shown')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P3  partners of someone else''s game were shown: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_partners(array[g_soon, g_b]);
    reset role;
    if n = 0 then report := array_append(report, ('PASS  P4  an ordinary account sees nothing')::text); else report := array_append(report, ('FAIL  P4  an ordinary account saw partners')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P4  an ordinary account saw partners: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.game_partners(array[g_soon]);
    reset role;
    report := array_append(report, ('FAIL  P5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  P5  a signed-out visitor cannot ask')::text); else report := array_append(report, ('FAIL  P5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nGAME DAY EXTRAS CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
