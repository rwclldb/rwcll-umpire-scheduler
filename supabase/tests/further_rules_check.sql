-- RWCLL check: the youth umpire's own division, and the messages to
-- administrators when an umpire takes a game for themselves.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261028100000_add_further_assignment_rules.sql.
--
-- It builds its own league, divisions, age chart, umpires and sign-in accounts,
-- then acts as a super admin, as umpires, and as a signed-out visitor. It ENDS
-- WITH A RED ERROR on purpose: the report is carried in the error message, and
-- raising an error guarantees that everything it created (including every
-- queued message) is rolled back. Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  a_acct uuid := gen_random_uuid(); y_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; loc uuid; chart uuid;
  d_min uuid; d_maj uuid; d_jun uuid; d_sen uuid; d_open uuid; d_tmp uuid;
  tm1 uuid; tm2 uuid; tj1 uuid; tj2 uuid; ts1 uuid; ts2 uuid; tp1 uuid; tp2 uuid; to1 uuid; to2 uuid;
  g_min uuid; g_maj uuid; g_jun uuid; g_sen uuid; g_open uuid;
  g_near uuid; g_b47 uuid; g_b49 uuid; g_far uuid; g_far2 uuid; g_far3 uuid;
  um_a uuid; um_g uuid; y_a uuid; y_b uuid; y_c uuid; y_d uuid; y_e uuid; y_f uuid;
  t0 timestamptz := date_trunc('hour', now());
  opts text[];
  n bigint; n2 bigint; r record;
begin
  select p.id into t_admin
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
    and p.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  limit 1;

  if t_admin is null then
    raise exception 'This check needs an approved super admin with a valid email address.';
  end if;

  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (y_acct, 'chk-' || stamp || '-y@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (a_acct, y_acct, x_acct);

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;

  -- Divisions: Minors 9-10, Majors 11-12, Juniors 12-14, Seniors 13-16, and Open (no age range). All allow self-assigning.
  insert into public.divisions (league_id, name, allow_self_assign, youngest_ll_age, oldest_ll_age) values (l1, 'Minors', true, 9, 10) returning id into d_min;
  insert into public.divisions (league_id, name, allow_self_assign, youngest_ll_age, oldest_ll_age) values (l1, 'Majors', true, 11, 12) returning id into d_maj;
  insert into public.divisions (league_id, name, allow_self_assign, youngest_ll_age, oldest_ll_age) values (l1, 'Juniors', true, 12, 14) returning id into d_jun;
  insert into public.divisions (league_id, name, allow_self_assign, youngest_ll_age, oldest_ll_age) values (l1, 'Seniors', true, 13, 16) returning id into d_sen;
  insert into public.divisions (league_id, name, allow_self_assign) values (l1, 'Open', true) returning id into d_open;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'M1', d_min) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'M2', d_min) returning id into tm2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'J1', d_maj) returning id into tj1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'J2', d_maj) returning id into tj2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'U1', d_jun) returning id into tp1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'U2', d_jun) returning id into tp2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'S1', d_sen) returning id into ts1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'S2', d_sen) returning id into ts2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'O1', d_open) returning id into to1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'O2', d_open) returning id into to2;

  -- One game in each division (rule tests), and six games in Open at different distances (message tests).
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_min, tm1, tm2, loc, t0 + interval '10 days', t0 + interval '10 days 2 hours') returning id into g_min;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_maj, tj1, tj2, loc, t0 + interval '11 days', t0 + interval '11 days 2 hours') returning id into g_maj;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_jun, tp1, tp2, loc, t0 + interval '12 days', t0 + interval '12 days 2 hours') returning id into g_jun;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_sen, ts1, ts2, loc, t0 + interval '13 days', t0 + interval '13 days 2 hours') returning id into g_sen;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_open, to1, to2, loc, t0 + interval '14 days', t0 + interval '14 days 2 hours') returning id into g_open;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_open, to1, to2, loc, t0 + interval '24 hours', t0 + interval '26 hours') returning id into g_near;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_open, to1, to2, loc, now() + interval '47 hours', now() + interval '49 hours') returning id into g_b47;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_open, to1, to2, loc, now() + interval '49 hours', now() + interval '51 hours') returning id into g_b49;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_open, to1, to2, loc, t0 + interval '5 days', t0 + interval '5 days 2 hours') returning id into g_far;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_open, to1, to2, loc, t0 + interval '6 days', t0 + interval '6 days 2 hours') returning id into g_far2;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d_open, to1, to2, loc, t0 + interval '7 days', t0 + interval '7 days 2 hours') returning id into g_far3;

  -- The age chart: January 2013 = age 13, January 2014 = age 12.
  insert into public.little_league_age_charts (chart_year, name) values (2026, 'CHK chart ' || stamp) returning id into chart;
  insert into public.little_league_age_chart_entries (chart_id, birth_month, birth_year, ll_age) values (chart, 1, 2013, 13), (chart, 1, 2014, 12);
  update public.seasons set age_chart_id = chart where id = s1;

  -- Youth umpires:
  --   A: age 13, plays Juniors      B: age 13, no division recorded    C: age 12, no division recorded
  --   D: age 12, plays Majors       E: no birth date, plays Open       F: no birth date, plays Majors
  -- and an adult with a division recorded (it must make no difference), plus an adult with an account.
  insert into public.umpires (display_name, classification, plays_in_division_id) values ('CHK Rule YA ' || stamp, 'youth', d_jun) returning id into y_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Rule YB ' || stamp, 'youth', y_acct) returning id into y_b;
  insert into public.umpires (display_name, classification) values ('CHK Rule YC ' || stamp, 'youth') returning id into y_c;
  insert into public.umpires (display_name, classification, plays_in_division_id) values ('CHK Rule YD ' || stamp, 'youth', d_maj) returning id into y_d;
  insert into public.umpires (display_name, classification, plays_in_division_id) values ('CHK Rule YE ' || stamp, 'youth', d_open) returning id into y_e;
  insert into public.umpires (display_name, classification, plays_in_division_id) values ('CHK Rule YF ' || stamp, 'youth', d_maj) returning id into y_f;
  insert into public.umpires (display_name, classification, plays_in_division_id) values ('CHK Rule AG ' || stamp, 'adult', d_jun) returning id into um_g;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Rule A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpire_private_details (umpire_id, birth_date) values
    (y_a, date '2013-01-15'), (y_b, date '2013-01-20'), (y_c, date '2014-01-10'), (y_d, date '2014-01-12');

  ----------------------------------------------------------------
  -- The division a youth umpire plays in (an administrator assigns)
  ----------------------------------------------------------------
  -- R1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_jun, jsonb_build_object('plate', y_a));
    reset role;
    report := array_append(report, ('FAIL  R1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%division they play in%' then report := array_append(report, ('PASS  R1  age 13, plays Juniors (recorded): cannot umpire Juniors, and the reason says it is their own division')::text); else report := array_append(report, ('FAIL  R1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_maj, jsonb_build_object('plate', y_a));
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_maj and umpire_id = y_a) then report := array_append(report, ('PASS  R2  ...but can umpire Majors (a division below theirs, and the recorded division stops the age guess from applying)')::text); else report := array_append(report, ('FAIL  R2  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R2  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_sen, jsonb_build_object('plate', y_a));
    reset role;
    report := array_append(report, ('FAIL  R3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot umpire Seniors%' then report := array_append(report, ('PASS  R3  ...and cannot umpire Seniors (above their age)')::text); else report := array_append(report, ('FAIL  R3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_jun, jsonb_build_object('plate', y_b));
    reset role;
    report := array_append(report, ('FAIL  R4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%include theirs%' then report := array_append(report, ('PASS  R4  age 13, nothing recorded: cannot umpire Juniors, because Juniors'' ages (12 to 14) include 13')::text); else report := array_append(report, ('FAIL  R4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_maj, jsonb_build_object('plate', y_b)); perform public.set_game_umpires(g_min, jsonb_build_object('plate', y_b)); perform public.set_game_umpires(g_open, jsonb_build_object('plate', y_b));
    reset role;
    if (select count(*) from public.game_assignments where umpire_id = y_b) = 3 then report := array_append(report, ('PASS  R5  ...but can umpire Majors, Minors and Open (no age range to compare)')::text); else report := array_append(report, ('FAIL  R5  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R5  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_maj, jsonb_build_object('plate', y_c));
    reset role;
    report := array_append(report, ('FAIL  R6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%include theirs%' then report := array_append(report, ('PASS  R6  age 12, nothing recorded: cannot umpire Majors (ages 11 to 12 include 12)')::text); else report := array_append(report, ('FAIL  R6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_jun, jsonb_build_object('plate', y_c));
    reset role;
    report := array_append(report, ('FAIL  R7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot umpire Juniors%' then report := array_append(report, ('PASS  R7  ...nor Juniors (its players start at 12)')::text); else report := array_append(report, ('FAIL  R7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R8
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_min, jsonb_build_object('plate', y_c));
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_min and umpire_id = y_c) then report := array_append(report, ('PASS  R8  ...but can umpire Minors')::text); else report := array_append(report, ('FAIL  R8  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R8  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R9
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_maj, jsonb_build_object('plate', y_d));
    reset role;
    report := array_append(report, ('FAIL  R9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%division they play in%' then report := array_append(report, ('PASS  R9  age 12, plays Majors (recorded): cannot umpire Majors')::text); else report := array_append(report, ('FAIL  R9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R10
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_min, jsonb_build_object('plate', y_d));
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_min and umpire_id = y_d) then report := array_append(report, ('PASS  R10  ...but can umpire Minors')::text); else report := array_append(report, ('FAIL  R10  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R10  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R11
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_jun, jsonb_build_object('plate', y_d));
    reset role;
    report := array_append(report, ('FAIL  R11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot umpire Juniors%' then report := array_append(report, ('PASS  R11  ...and cannot umpire Juniors (players start at their age)')::text); else report := array_append(report, ('FAIL  R11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R12
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_open, jsonb_build_object('plate', y_e));
    reset role;
    report := array_append(report, ('FAIL  R12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%division they play in%' then report := array_append(report, ('PASS  R12  the division they play in is refused even with no birth date and a division that has no age range')::text); else report := array_append(report, ('FAIL  R12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R13
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_maj, jsonb_build_object('plate', y_e));
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_maj and umpire_id = y_e) then report := array_append(report, ('PASS  R13  ...and elsewhere they are not blocked (the missing birth date only means the age rule is unchecked)')::text); else report := array_append(report, ('FAIL  R13  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R13  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R14
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_maj, jsonb_build_object('plate', y_f));
    reset role;
    report := array_append(report, ('FAIL  R14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%division they play in%' then report := array_append(report, ('PASS  R14  recorded as playing Majors, with no birth date: cannot umpire Majors')::text); else report := array_append(report, ('FAIL  R14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R15
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_jun, jsonb_build_object('plate', um_g));
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_jun and umpire_id = um_g) then report := array_append(report, ('PASS  R15  an ADULT umpire is not affected, even if a division is recorded on their record')::text); else report := array_append(report, ('FAIL  R15  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R15  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R16: the same rule applies to a direct write
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_jun, y_a, 'field');
    reset role;
    report := array_append(report, ('FAIL  R16  a direct insert put a youth umpire on their own division')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%division they play in%' then report := array_append(report, ('PASS  R16  the rule also covers direct writes')::text); else report := array_append(report, ('FAIL  R16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R17
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_umpire_eligibility(g_jun) e where e.umpire_id in (y_a, y_b, y_c, y_d) and e.problem is not null; select count(*) into n2 from public.game_umpire_eligibility(g_jun) e where e.umpire_id in (y_e, y_f, um_g) and e.problem is not null;
    reset role;
    if n = 4 and n2 = 0 then report := array_append(report, ('PASS  R17  the assignment screen is told about all four youth umpires blocked from Juniors, and none of the others')::text); else report := array_append(report, ('FAIL  R17  the eligibility list is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R17  the eligibility list is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the administrator records that A plays Majors instead)
  reset role;
  update public.umpires set plays_in_division_id = d_maj where id = y_a;

  -- R18
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_jun, jsonb_build_object('plate', y_a));
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_jun and umpire_id = y_a) then report := array_append(report, ('PASS  R18  changing the recorded division changes the rule: A (age 13) can now umpire Juniors')::text); else report := array_append(report, ('FAIL  R18  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R18  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R19
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_maj, jsonb_build_object('plate', y_a));
    reset role;
    report := array_append(report, ('FAIL  R19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%division they play in%' then report := array_append(report, ('PASS  R19  ...and now cannot umpire Majors')::text); else report := array_append(report, ('FAIL  R19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: a division is made, someone is recorded as playing it, then it is deleted)
  reset role;
  insert into public.divisions (league_id, name) values (l1, 'Temp') returning id into d_tmp;
  update public.umpires set plays_in_division_id = d_tmp where id = y_c;
  delete from public.divisions where id = d_tmp;

  -- R20
  begin
    reset role;
    null;
    reset role;
    if (select plays_in_division_id from public.umpires where id = y_c) is null then report := array_append(report, ('PASS  R20  deleting a division clears it from the umpires who played in it (nothing is left pointing at it)')::text); else report := array_append(report, ('FAIL  R20  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R20  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- A youth umpire taking games for themselves
  ----------------------------------------------------------------
  -- (setup, not a test: B's earlier assignments are cleared so the list is simple)
  reset role;
  delete from public.game_assignments where umpire_id = y_b;

  -- Y1
  begin
    perform set_config('request.jwt.claim.sub', y_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(o.game_id::text || ':' || o.place order by o.game_id, o.place), array[]::text[]) into opts from public.self_assign_options() o where o.game_id in (g_min, g_maj, g_jun, g_sen, g_open, g_near, g_b47, g_b49, g_far, g_far2, g_far3);
    reset role;
    if exists (select 1 from unnest(opts) x where x like (g_maj)::text || ':%') and exists (select 1 from unnest(opts) x where x like (g_min)::text || ':%') and exists (select 1 from unnest(opts) x where x like (g_open)::text || ':%') and not exists (select 1 from unnest(opts) x where x like (g_jun)::text || ':%') and not exists (select 1 from unnest(opts) x where x like (g_sen)::text || ':%') then report := array_append(report, ('PASS  Y1  age 13 with nothing recorded is offered Majors, Minors and Open, but not Juniors or Seniors')::text); else report := array_append(report, ('FAIL  Y1  the youth umpire''s list is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Y1  the youth umpire''s list is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Y2
  begin
    perform set_config('request.jwt.claim.sub', y_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_jun, 'field');
    reset role;
    report := array_append(report, ('FAIL  Y2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%include theirs%' then report := array_append(report, ('PASS  Y2  taking Juniors for themselves is refused, with the reason')::text); else report := array_append(report, ('FAIL  Y2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- Y3
  begin
    perform set_config('request.jwt.claim.sub', y_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_maj, 'field');
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_maj and umpire_id = y_b and self_assigned) then report := array_append(report, ('PASS  Y3  ...and taking Majors works')::text); else report := array_append(report, ('FAIL  Y3  the result was not as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Y3  the result was not as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Telling administrators when an umpire takes a game
  ----------------------------------------------------------------
  -- N1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_near, 'plate');
    reset role;
    if exists (select 1 from public.email_outbox where to_profile_id = t_admin and kind = 'assignment' and subject like 'Umpire took a game within 48 hours%' and subject like '%CHK Rule A ' || stamp || '%' and body like '%48 hours%') and (select self_assign_notified_at from public.game_assignments where game_id = g_near and umpire_id = um_a) is not null then report := array_append(report, ('PASS  N1  a game starting within 48 hours: the administrators are told straight away, and it is marked as told about')::text); else report := array_append(report, ('FAIL  N1  the immediate message was not queued')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N1  the immediate message was not queued: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_b47, 'plate');
    reset role;
    if exists (select 1 from public.email_outbox where to_profile_id = t_admin and subject like 'Umpire took a game within 48 hours%' and body like '%CHK Rule A ' || stamp || '%' and body like '%' || (select to_char(starts_at at time zone 'America/Los_Angeles', 'FMHH12:MI AM') from public.games where id = g_b47) || '%') and (select self_assign_notified_at from public.game_assignments where game_id = g_b47 and umpire_id = um_a) is not null then report := array_append(report, ('PASS  N2  a game starting in 47 hours is told about straight away')::text); else report := array_append(report, ('FAIL  N2  a game 47 hours away was not announced at once')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N2  a game 47 hours away was not announced at once: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_b49, 'plate'); perform public.self_assign(g_far, 'plate');
    reset role;
    if (select count(*) from public.game_assignments where umpire_id = um_a and game_id in (g_b49, g_far) and self_assign_notified_at is null) = 2 and (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'Umpire took a game within 48 hours%' and subject like '%CHK Rule A ' || stamp || '%') = 2 then report := array_append(report, ('PASS  N3  a game 49 hours or more away is NOT announced at once (it waits for the daily summary); only the two close games were')::text); else report := array_append(report, ('FAIL  N3  a distant game was announced at once, or a close one was not')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N3  a distant game was announced at once, or a close one was not: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- The daily summary
  ----------------------------------------------------------------
  -- D1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_self_assign_digest();
    reset role;
    if not exists (select 1 from public.email_outbox where subject like 'Umpires took%' and body like '%CHK Rule A ' || stamp || '%') and (select count(*) from public.game_assignments where umpire_id = um_a and self_assign_notified_at is null) = 2 then report := array_append(report, ('PASS  D1  games taken TODAY are not in a summary yet (the day has not ended)')::text); else report := array_append(report, ('FAIL  D1  today''s games were summarised too early')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D1  today''s games were summarised too early: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the two waiting games are made to have been taken two days ago)
  reset role;
  update public.game_assignments set assigned_at = now() - interval '2 days' where umpire_id = um_a and game_id in (g_b49, g_far);

  -- D2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_self_assign_digest();
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'Umpires took%' and body like '%CHK Rule A ' || stamp || '%') = 1 and (select (length(body) - length(replace(body, 'CHK Rule A ' || stamp, ''))) / length('CHK Rule A ' || stamp) from public.email_outbox where to_profile_id = t_admin and subject like 'Umpires took%' and body like '%CHK Rule A ' || stamp || '%' limit 1) = 2 and (select count(*) from public.game_assignments where umpire_id = um_a and game_id in (g_b49, g_far) and self_assign_notified_at is not null) = 2 then report := array_append(report, ('PASS  D2  once the day has ended, one message lists both games taken that day, and they are marked as told about')::text); else report := array_append(report, ('FAIL  D2  the summary was not queued as one message')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D2  the summary was not queued as one message: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_self_assign_digest();
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'Umpires took%' and body like '%CHK Rule A ' || stamp || '%') = 1 then report := array_append(report, ('PASS  D3  asking again does not repeat the summary')::text); else report := array_append(report, ('FAIL  D3  the summary was queued twice')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D3  the summary was queued twice: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D4
  begin
    reset role;
    null;
    reset role;
    if exists (select 1 from public.email_outbox where to_profile_id = t_admin and subject like 'Umpires took%' and body like '%- CHK Rule A ' || stamp || ' (plate): O1 vs O2 on %') then report := array_append(report, ('PASS  D4  the summary names the umpire, the place and each game')::text); else report := array_append(report, ('FAIL  D4  the summary text is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D4  the summary text is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_far2, 'plate'); perform public.self_assign(g_far3, 'plate');
    reset role;
    if (select count(*) from public.game_assignments where umpire_id = um_a and game_id in (g_far2, g_far3) and self_assign_notified_at is null) = 2 then report := array_append(report, ('PASS  D5  two more distant games can be taken, and wait for a summary')::text); else report := array_append(report, ('FAIL  D5  the two distant games were not taken')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D5  the two distant games were not taken: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.game_assignments set assigned_at = now() - interval '3 days' where umpire_id = um_a and game_id = g_far2;
  update public.game_assignments set assigned_at = now() - interval '4 days' where umpire_id = um_a and game_id = g_far3;

  -- D6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_self_assign_digest();
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'Umpires took%' and body like '%CHK Rule A ' || stamp || '%') = 3 and (select count(distinct subject) from public.email_outbox where to_profile_id = t_admin and subject like 'Umpires took%' and body like '%CHK Rule A ' || stamp || '%') = 3 then report := array_append(report, ('PASS  D6  games taken on different days make separate summaries, one for each day (three days now, each with its own title)')::text); else report := array_append(report, ('FAIL  D6  different days were not kept separate')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D6  different days were not kept separate: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_self_assign_digest();
    reset role;
    report := array_append(report, ('FAIL  D8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  D8  an ordinary account cannot queue the summary')::text); else report := array_append(report, ('FAIL  D8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D9
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.queue_self_assign_digest();
    reset role;
    report := array_append(report, ('FAIL  D9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  D9  a signed-out visitor cannot queue the summary')::text); else report := array_append(report, ('FAIL  D9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nFURTHER ASSIGNMENT RULES CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
