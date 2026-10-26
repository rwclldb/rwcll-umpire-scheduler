-- RWCLL check: umpires assigning themselves to games.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261026240000_add_self_assigning.sql.
--
-- It builds its own tiny league (five sign-in accounts, five umpires, nine
-- games), then acts as umpires, as an account with no umpire record, and as a
-- signed-out visitor. It ENDS WITH A RED ERROR on purpose: the report is
-- carried in the error message, and raising an error guarantees that everything
-- it created is rolled back. Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid(); c_acct uuid := gen_random_uuid();
  x_acct uuid := gen_random_uuid(); y_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; loc uuid; chart uuid;
  d_on uuid; d_off uuid; d_sen uuid; d_jun uuid;
  tn1 uuid; tn2 uuid; tf1 uuid; tf2 uuid; ts1 uuid; ts2 uuid; tj1 uuid; tj2 uuid;
  g_a uuid; g_b uuid; g_c uuid; g_d uuid; g_e uuid; g_past uuid; g_canc uuid; g_sen uuid; g_jun uuid;
  um_a uuid; um_b uuid; um_c uuid; um_d uuid; um_y uuid;
  s3 timestamptz := date_trunc('hour', now()) + interval '3 days';
  opts text[];
  n bigint; n2 bigint; r record;
begin
  -- Five sign-in accounts (made as the database owner, the way the other checks do).
  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (b_acct, 'chk-' || stamp || '-b@example.org', now(), '{}'::jsonb),
      (c_acct, 'chk-' || stamp || '-c@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb),
      (y_acct, 'chk-' || stamp || '-y@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (a_acct, b_acct, c_acct, x_acct, y_acct);

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;

  -- Four divisions: self-assigning ON, OFF, and two ON with age ranges (Seniors from 13, Juniors from 12).
  insert into public.divisions (league_id, name, allow_self_assign) values (l1, 'On', true) returning id into d_on;
  insert into public.divisions (league_id, name) values (l1, 'Off') returning id into d_off;
  insert into public.divisions (league_id, name, allow_self_assign, youngest_ll_age, oldest_ll_age) values (l1, 'Seniors', true, 13, 16) returning id into d_sen;
  insert into public.divisions (league_id, name, allow_self_assign, youngest_ll_age, oldest_ll_age) values (l1, 'Juniors', true, 12, 14) returning id into d_jun;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'N1', d_on) returning id into tn1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'N2', d_on) returning id into tn2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'F1', d_off) returning id into tf1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'F2', d_off) returning id into tf2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'S1', d_sen) returning id into ts1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'S2', d_sen) returning id into ts2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'J1', d_jun) returning id into tj1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'J2', d_jun) returning id into tj2;

  -- Games: A and B overlap; C, D later; E is in the OFF division; one played yesterday; one canceled; Seniors; Juniors.
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_on, tn1, tn2, loc, s3, s3 + interval '2 hours') returning id into g_a;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_on, tn1, tn2, loc, s3 + interval '1 hour', s3 + interval '3 hours') returning id into g_b;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_on, tn1, tn2, loc, s3 + interval '1 day', s3 + interval '1 day 2 hours') returning id into g_c;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_on, tn1, tn2, loc, s3 + interval '2 days', s3 + interval '2 days 2 hours') returning id into g_d;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_off, tf1, tf2, loc, s3 + interval '5 hours', s3 + interval '7 hours') returning id into g_e;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_on, tn1, tn2, loc, now() - interval '1 day', now() - interval '22 hours') returning id into g_past;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status) values (s1, d_on, tn1, tn2, loc, s3 + interval '3 days', s3 + interval '3 days 2 hours', 'canceled') returning id into g_canc;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_sen, ts1, ts2, loc, s3 + interval '4 days', s3 + interval '4 days 2 hours') returning id into g_sen;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_jun, tj1, tj2, loc, s3 + interval '5 days', s3 + interval '5 days 2 hours') returning id into g_jun;

  -- Umpires: A (can take games), B (switched off), C (inactive), D (no account; used to fill a place), Y (a youth, Little League age 13).
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Self A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id, can_self_assign) values ('CHK Self B ' || stamp, 'adult', b_acct, false) returning id into um_b;
  insert into public.umpires (display_name, classification, profile_id, eligibility_status) values ('CHK Self C ' || stamp, 'adult', c_acct, 'inactive') returning id into um_c;
  insert into public.umpires (display_name, classification) values ('CHK Self D ' || stamp, 'adult') returning id into um_d;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Self Y ' || stamp, 'youth', y_acct) returning id into um_y;

  insert into public.little_league_age_charts (chart_year, name) values (2026, 'CHK chart ' || stamp) returning id into chart;
  insert into public.little_league_age_chart_entries (chart_id, birth_month, birth_year, ll_age) values (chart, 1, 2013, 13);
  update public.seasons set age_chart_id = chart where id = s1;
  insert into public.umpire_private_details (umpire_id, birth_date) values (um_y, date '2013-01-15')
    on conflict (umpire_id) do update set birth_date = excluded.birth_date;

  -- Older assignments for A on the game played yesterday and on the canceled game (neither should count toward a limit).
  insert into public.game_assignments (game_id, umpire_id, position) values (g_past, um_a, 'plate');
  insert into public.game_assignments (game_id, umpire_id, position) values (g_canc, um_a, 'plate');

  ----------------------------------------------------------------
  -- The switches and the limit, as stored
  ----------------------------------------------------------------
  select count(*) into n from public.divisions where id = d_off and allow_self_assign = false;
  select count(*) into n2 from public.umpires where id = um_d and can_self_assign = true;
  if n = 1 and n2 = 1 and (select self_assign_max_games from public.leagues where id = l1) is null then report := array_append(report, ('PASS  K1  self-assigning is OFF for a new division, ON for a new umpire, and a league has no limit to begin with')::text); else report := array_append(report, ('FAIL  K1  the starting values are wrong')::text); failures := failures + 1; end if;

  begin
    update public.leagues set self_assign_max_games = 0 where id = l1;
    report := array_append(report, ('FAIL  K2  a limit of 0 games was accepted')::text); failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then report := array_append(report, ('PASS  K2  a limit of 0 is refused (use the division switch to stop self-assigning)')::text); else report := array_append(report, ('FAIL  K2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  begin
    update public.leagues set self_assign_max_games = 501 where id = l1;
    report := array_append(report, ('FAIL  K3  a limit of 501 was accepted')::text); failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then report := array_append(report, ('PASS  K3  a limit above 500 is refused')::text); else report := array_append(report, ('FAIL  K3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  begin
    update public.leagues set self_assign_max_games = 1 where id = l1;
    update public.leagues set self_assign_max_games = null where id = l1;
    report := array_append(report, ('PASS  K4  a limit of 1 is accepted, and blank (no limit) is accepted')::text);
  exception when others then
    report := array_append(report, ('FAIL  K4  a valid limit was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- What an umpire can take
  ----------------------------------------------------------------
  -- S1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if cardinality(opts) = 12 and ((g_a)::text || ':plate') = any (opts) and ((g_a)::text || ':field') = any (opts) and ((g_b)::text || ':plate') = any (opts) and ((g_c)::text || ':field') = any (opts) and ((g_d)::text || ':plate') = any (opts) and ((g_sen)::text || ':plate') = any (opts) and ((g_jun)::text || ':field') = any (opts) and not exists (select 1 from unnest(opts) x where x like (g_e)::text || ':%') and not exists (select 1 from unnest(opts) x where x like (g_past)::text || ':%') and not exists (select 1 from unnest(opts) x where x like (g_canc)::text || ':%') then report := array_append(report, ('PASS  S1  an umpire is offered the open places of games still to come in divisions that allow it (not the OFF division, not the played game, not the canceled one)')::text); else report := array_append(report, ('FAIL  S1  the list of games to take is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  the list of games to take is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_a, 'plate');
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_a and umpire_id = um_a and position = 'plate' and status = 'confirmed' and self_assigned and confirmed_at is not null and assigned_by = a_acct) and exists (select 1 from public.game_assignment_events where game_id = g_a and umpire_id = um_a and event = 'assigned' and note = 'assigned themselves' and actor_id = a_acct) then report := array_append(report, ('PASS  S2  taking a game assigns the umpire, already Confirmed and marked as self-assigned, and records it in the history')::text); else report := array_append(report, ('FAIL  S2  the assignment was not made as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S2  the assignment was not made as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if not exists (select 1 from unnest(opts) x where x like (g_a)::text || ':%') and not exists (select 1 from unnest(opts) x where x like (g_b)::text || ':%') and ((g_c)::text || ':plate') = any (opts) and ((g_c)::text || ':field') = any (opts) then report := array_append(report, ('PASS  S3  once on a game, that game is no longer offered, and neither is a game that overlaps it, but later games still are')::text); else report := array_append(report, ('FAIL  S3  the list did not change as it should')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S3  the list did not change as it should: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_b, 'field');
    reset role;
    report := array_append(report, ('FAIL  S4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at that time%' then report := array_append(report, ('PASS  S4  a game that overlaps one of the umpire''s own is refused')::text); else report := array_append(report, ('FAIL  S4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_a, 'field');
    reset role;
    report := array_append(report, ('FAIL  S5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already assigned%' then report := array_append(report, ('PASS  S5  an umpire cannot take a second place on the same game')::text); else report := array_append(report, ('FAIL  S5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_e, 'plate');
    reset role;
    report := array_append(report, ('FAIL  S6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%in this division%' then report := array_append(report, ('PASS  S6  a division that has not turned self-assigning on refuses it')::text); else report := array_append(report, ('FAIL  S6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S7
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_past, 'field');
    reset role;
    report := array_append(report, ('FAIL  S7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already started%' then report := array_append(report, ('PASS  S7  a game that has already started cannot be taken')::text); else report := array_append(report, ('FAIL  S7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S8
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_canc, 'field');
    reset role;
    report := array_append(report, ('FAIL  S8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open for assigning%' then report := array_append(report, ('PASS  S8  a canceled game cannot be taken')::text); else report := array_append(report, ('FAIL  S8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S9
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'pitcher');
    reset role;
    report := array_append(report, ('FAIL  S9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open%' then report := array_append(report, ('PASS  S9  a place that is not part of the game is refused')::text); else report := array_append(report, ('FAIL  S9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- Who cannot
  ----------------------------------------------------------------
  -- W1
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'plate');
    reset role;
    report := array_append(report, ('FAIL  W1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%turned off%' then report := array_append(report, ('PASS  W1  an umpire an administrator has switched off cannot take games')::text); else report := array_append(report, ('FAIL  W1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W2
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if cardinality(opts) = 0 then report := array_append(report, ('PASS  W2  ...and is offered none')::text); else report := array_append(report, ('FAIL  W2  a switched-off umpire was offered games')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W2  a switched-off umpire was offered games: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W3
  begin
    perform set_config('request.jwt.claim.sub', c_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', c_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'plate');
    reset role;
    report := array_append(report, ('FAIL  W3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%active umpires%' then report := array_append(report, ('PASS  W3  an inactive umpire cannot take games')::text); else report := array_append(report, ('FAIL  W3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W4
  begin
    perform set_config('request.jwt.claim.sub', c_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', c_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if cardinality(opts) = 0 then report := array_append(report, ('PASS  W4  ...and is offered none')::text); else report := array_append(report, ('FAIL  W4  an inactive umpire was offered games')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W4  an inactive umpire was offered games: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W5
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'plate');
    reset role;
    report := array_append(report, ('FAIL  W5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%linked to an umpire record%' then report := array_append(report, ('PASS  W5  an account with no umpire record cannot take games')::text); else report := array_append(report, ('FAIL  W5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W6
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if cardinality(opts) = 0 then report := array_append(report, ('PASS  W6  ...and is offered none')::text); else report := array_append(report, ('FAIL  W6  an account with no umpire record was offered games')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W6  an account with no umpire record was offered games: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- A place somebody else has
  ----------------------------------------------------------------
  -- (setup, not a test: an administrator puts another umpire on the plate of game C)
  reset role;
  insert into public.game_assignments (game_id, umpire_id, position) values (g_c, um_d, 'plate');

  -- T2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'plate');
    reset role;
    report := array_append(report, ('FAIL  T2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open%' then report := array_append(report, ('PASS  T2  a place someone else already holds is refused')::text); else report := array_append(report, ('FAIL  T2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if not (((g_c)::text || ':plate') = any (opts)) and ((g_c)::text || ':field') = any (opts) then report := array_append(report, ('PASS  T3  only the places still open are offered')::text); else report := array_append(report, ('FAIL  T3  a taken place was still offered')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T3  a taken place was still offered: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- The limit on upcoming games
  ----------------------------------------------------------------
  reset role;
  update public.leagues set self_assign_max_games = 1 where id = l1;

  -- L1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_d, 'plate');
    reset role;
    report := array_append(report, ('FAIL  L1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%most games you can take%' then report := array_append(report, ('PASS  L1  with a limit of 1, an umpire who already has one upcoming game cannot take another (the played and canceled games do not count)')::text); else report := array_append(report, ('FAIL  L1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if cardinality(opts) = 0 then report := array_append(report, ('PASS  L2  ...and is offered none')::text); else report := array_append(report, ('FAIL  L2  games were offered above the limit')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L2  games were offered above the limit: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.leagues set self_assign_max_games = 2 where id = l1;

  -- L3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_d, 'plate');
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_d and umpire_id = um_a and self_assigned) then report := array_append(report, ('PASS  L3  with a limit of 2, the second game can be taken')::text); else report := array_append(report, ('FAIL  L3  the second game could not be taken')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L3  the second game could not be taken: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'field');
    reset role;
    report := array_append(report, ('FAIL  L4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%most games you can take%' then report := array_append(report, ('PASS  L4  ...and a third cannot')::text); else report := array_append(report, ('FAIL  L4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  reset role;
  update public.leagues set self_assign_max_games = null where id = l1;

  -- L5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'field');
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_c and umpire_id = um_a) then report := array_append(report, ('PASS  L5  with no limit, the umpire can take it')::text); else report := array_append(report, ('FAIL  L5  the umpire could not take it with no limit')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L5  the umpire could not take it with no limit: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Giving a game back
  ----------------------------------------------------------------
  -- G1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decline_assignment(g_a);
    reset role;
    if not exists (select 1 from public.game_assignments where game_id = g_a and umpire_id = um_a) then report := array_append(report, ('PASS  G1  an umpire can decline a game they took for themselves')::text); else report := array_append(report, ('FAIL  G1  declining a self-assigned game failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G1  declining a self-assigned game failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- G2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if ((g_a)::text || ':plate') = any (opts) and ((g_a)::text || ':field') = any (opts) then report := array_append(report, ('PASS  G2  ...and the place is offered again')::text); else report := array_append(report, ('FAIL  G2  the freed place was not offered again')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G2  the freed place was not offered again: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- The youth age rule
  ----------------------------------------------------------------
  -- Y1
  begin
    perform set_config('request.jwt.claim.sub', y_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if ((g_jun)::text || ':plate') = any (opts) and not exists (select 1 from unnest(opts) x where x like (g_sen)::text || ':%') then report := array_append(report, ('PASS  Y1  a youth umpire with Little League age 13 is offered Juniors (from 12) but not Seniors (from 13)')::text); else report := array_append(report, ('FAIL  Y1  the youth umpire''s list is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Y1  the youth umpire''s list is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Y2
  begin
    perform set_config('request.jwt.claim.sub', y_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_sen, 'plate');
    reset role;
    report := array_append(report, ('FAIL  Y2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot umpire Seniors%' then report := array_append(report, ('PASS  Y2  a youth umpire cannot take a Seniors game, with the reason')::text); else report := array_append(report, ('FAIL  Y2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- Y3
  begin
    perform set_config('request.jwt.claim.sub', y_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_jun, 'plate');
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_jun and umpire_id = um_y and self_assigned) then report := array_append(report, ('PASS  Y3  ...but can take a Juniors game')::text); else report := array_append(report, ('FAIL  Y3  the youth umpire could not take Juniors')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Y3  the youth umpire could not take Juniors: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Choosing a window of dates
  ----------------------------------------------------------------
  -- D1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options(null, s3 + interval '12 hours') o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if ((g_a)::text || ':plate') = any (opts) and ((g_b)::text || ':plate') = any (opts) and not exists (select 1 from unnest(opts) x where x like (g_c)::text || ':%') and not exists (select 1 from unnest(opts) x where x like (g_d)::text || ':%') then report := array_append(report, ('PASS  D1  the ''to'' date limits the list')::text); else report := array_append(report, ('FAIL  D1  the end date was ignored')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D1  the end date was ignored: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options(s3 + interval '1 day', null) o where o.game_id in (g_a, g_b, g_c, g_d, g_e, g_past, g_canc, g_sen, g_jun);
    reset role;
    if not exists (select 1 from unnest(opts) x where x like (g_a)::text || ':%') and not exists (select 1 from unnest(opts) x where x like (g_b)::text || ':%') and ((g_sen)::text || ':plate') = any (opts) then report := array_append(report, ('PASS  D2  the ''from'' date limits the list')::text); else report := array_append(report, ('FAIL  D2  the start date was ignored')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D2  the start date was ignored: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Signed out
  ----------------------------------------------------------------
  -- O1
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.self_assign(g_c, 'plate');
    reset role;
    report := array_append(report, ('FAIL  O1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O1  a signed-out visitor cannot take a game')::text); else report := array_append(report, ('FAIL  O1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O2
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.self_assign_options();
    reset role;
    report := array_append(report, ('FAIL  O2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O2  a signed-out visitor cannot ask what is available')::text); else report := array_append(report, ('FAIL  O2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nSELF-ASSIGNMENT CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
