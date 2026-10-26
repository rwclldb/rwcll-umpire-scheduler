-- RWCLL check: umpires needed per game, umpire positions, the youth age rule,
-- and the rules for assigning umpires.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261025140000_add_umpires_needed_and_assignment_rules.sql and
-- 20261026120000_add_umpire_positions_and_youth_rules.sql.
--
-- It builds its own tiny league (two games, four umpires), signs in (inside
-- the database) as a super admin, an ordinary account, and a signed-out
-- visitor, and tries valid and invalid things. It ENDS WITH A RED ERROR on
-- purpose: the report is carried in the error message, and raising an error
-- guarantees that everything it created is rolled back. Your real data is not
-- used, and nothing is saved.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid; t_ordinary uuid;
  l1 uuid; s1 uuid; d1 uuid; t1 uuid; t2 uuid; loc uuid;
  g1 uuid; g2 uuid;
  ua uuid; ub uuid; uc uuid; ud uuid; ue uuid; uf uuid; ug uuid; uh uuid;
  ya uuid; yb uuid; yc uuid; yd uuid; ye uuid;
  ds uuid; dj uuid; dm uuid; gs uuid; gj uuid; gm uuid; chart uuid;
  ts1 uuid; ts2 uuid; tj1 uuid; tj2 uuid; tm1 uuid; tm2 uuid;
  t_start timestamptz := now() + interval '2 days';
  n bigint; n_before bigint; rows_affected bigint;
  r record; r2 record;
  at1 timestamptz; at2 timestamptz;
  msg text;
begin
  select p.id into t_admin
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  select p.id into t_ordinary
  from public.profiles p
  where p.account_status = 'approved'
    and p.id <> t_admin
    and not exists (
      select 1 from public.user_roles ur
      where ur.user_id = p.id
        and ur.role_id in ('super_admin', 'umpire_chief', 'scheduler',
                           'treasurer', 'feedback_reviewer', 'read_only_admin')
    )
  limit 1;

  if t_admin is null or t_ordinary is null then
    raise exception 'This check needs an approved super admin and a different approved account with no admin role.';
  end if;

  -- A tiny league of its own (made as the database owner).
  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.divisions (league_id, name) values (l1, 'D1') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into t1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into t2;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, t_start, t_start + interval '2 hours') returning id into g1;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status)
    values (s1, d1, t1, t2, loc, t_start + interval '1 day', t_start + interval '1 day 2 hours', 'canceled') returning id into g2;
  insert into public.umpires (display_name, classification) values ('CHK Ump A ' || stamp, 'adult') returning id into ua;
  insert into public.umpires (display_name, classification) values ('CHK Ump B ' || stamp, 'adult') returning id into ub;
  insert into public.umpires (display_name, classification, eligibility_status) values ('CHK Ump C ' || stamp, 'adult', 'inactive') returning id into uc;
  insert into public.umpires (display_name, classification, eligibility_status) values ('CHK Ump D ' || stamp, 'adult', 'suspended') returning id into ud;
  insert into public.umpires (display_name, classification) values ('CHK Ump E ' || stamp, 'adult') returning id into ue;
  insert into public.umpires (display_name, classification) values ('CHK Ump F ' || stamp, 'adult') returning id into uf;
  insert into public.umpires (display_name, classification) values ('CHK Ump G ' || stamp, 'adult') returning id into ug;
  insert into public.umpires (display_name, classification) values ('CHK Ump H ' || stamp, 'adult') returning id into uh;

  -- Three divisions with Little League age ranges, each with two teams and a game
  insert into public.divisions (league_id, name, youngest_ll_age, oldest_ll_age) values (l1, 'Seniors', 13, 16) returning id into ds;
  insert into public.divisions (league_id, name, youngest_ll_age, oldest_ll_age) values (l1, 'Juniors', 12, 14) returning id into dj;
  insert into public.divisions (league_id, name, youngest_ll_age, oldest_ll_age) values (l1, 'Majors', 11, 12) returning id into dm;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'S1', ds) returning id into ts1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'S2', ds) returning id into ts2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'J1', dj) returning id into tj1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'J2', dj) returning id into tj2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'M1', dm) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'M2', dm) returning id into tm2;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, ds, ts1, ts2, loc, t_start + interval '3 days', t_start + interval '3 days 2 hours') returning id into gs;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, dj, tj1, tj2, loc, t_start + interval '4 days', t_start + interval '4 days 2 hours') returning id into gj;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, dm, tm1, tm2, loc, t_start + interval '5 days', t_start + interval '5 days 2 hours') returning id into gm;

  -- A tiny age chart for the season: born January 2013 = age 13, January 2014 = 12, January 2011 = 15.
  -- (June 2013 is deliberately NOT in the chart.)
  insert into public.little_league_age_charts (chart_year, name) values (2026, 'CHK chart ' || stamp) returning id into chart;
  insert into public.little_league_age_chart_entries (chart_id, birth_month, birth_year, ll_age)
    values (chart, 1, 2013, 13), (chart, 1, 2014, 12), (chart, 1, 2011, 15);
  update public.seasons set age_chart_id = chart where id = s1;

  -- Five youth umpires: Little League age 13, 12 and 15, one with no birth date, one whose birth month is not in the chart
  insert into public.umpires (display_name, classification) values ('CHK Youth A ' || stamp, 'youth') returning id into ya;
  insert into public.umpires (display_name, classification) values ('CHK Youth B ' || stamp, 'youth') returning id into yb;
  insert into public.umpires (display_name, classification) values ('CHK Youth C ' || stamp, 'youth') returning id into yc;
  insert into public.umpires (display_name, classification) values ('CHK Youth D ' || stamp, 'youth') returning id into yd;
  insert into public.umpires (display_name, classification) values ('CHK Youth E ' || stamp, 'youth') returning id into ye;
  insert into public.umpire_private_details (umpire_id, birth_date) values
    (ya, date '2013-01-15'), (yb, date '2014-01-10'), (yc, date '2011-01-05'), (ye, date '2013-06-20')
    on conflict (umpire_id) do update set birth_date = excluded.birth_date;

  -- These tests are about the AGE rule (a youth umpire cannot umpire a division whose players
  -- start at their age or older). Since the 'division they play in' rule was added, a youth
  -- umpire with NO division recorded is also kept off any division whose ages include theirs.
  -- So the three umpires whose ages are tested are recorded as playing D1, a division with no
  -- ages, which leaves only the age rule to be tested here. (The new rule has its own script,
  -- further_rules_check.sql.)
  update public.umpires set plays_in_division_id = d1 where id in (ya, yb, yc);

  ----------------------------------------------------------------
  -- How many umpires: the settings themselves
  ----------------------------------------------------------------
  select umpires_per_game into n from public.divisions where id = d1;
  if n = 2 then
    report := array_append(report, ('PASS  D1  a new division needs 2 umpires per game by default')::text);
  else
    report := array_append(report, (format('FAIL  D1  the division default is %s, not 2', n))::text);
    failures := failures + 1;
  end if;

  begin
    update public.divisions set umpires_per_game = 0 where id = d1;
    update public.divisions set umpires_per_game = 2 where id = d1;
    report := array_append(report, ('PASS  D2  a division can need no umpires at all (0), for divisions such as Tee Ball')::text);
  exception when others then
    report := array_append(report, ('FAIL  D2  a division could not be set to need 0 umpires: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    update public.divisions set umpires_per_game = 5 where id = d1;
    report := array_append(report, ('FAIL  D3  a division was set to need 5 umpires')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  D3  a division cannot be set to need more than 4 umpires')::text);
    else
      report := array_append(report, ('FAIL  D3  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.divisions set umpires_per_game = 1 where id = d1;
    update public.divisions set umpires_per_game = 3 where id = d1;
    update public.divisions set umpires_per_game = 4 where id = d1;
    update public.divisions set umpires_per_game = 2 where id = d1;
    report := array_append(report, ('PASS  D4  a division can need 1, 2, 3 or 4 umpires')::text);
  exception when others then
    report := array_append(report, ('FAIL  D4  a valid division setting was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  select umpires_needed into n from public.games where id = g1;
  if n is null then
    report := array_append(report, ('PASS  D5  a game has no override to begin with (it follows its division)')::text);
  else
    report := array_append(report, ('FAIL  D5  a new game already has an override')::text);
    failures := failures + 1;
  end if;

  begin
    update public.games set umpires_needed = 0 where id = g1;
    update public.games set umpires_needed = 1 where id = g1;
    update public.games set umpires_needed = 2 where id = g1;
    update public.games set umpires_needed = 3 where id = g1;
    update public.games set umpires_needed = 4 where id = g1;
    update public.games set umpires_needed = null where id = g1;
    report := array_append(report, ('PASS  D6  a game can be set to need 0 to 4 umpires, or back to the division default')::text);
  exception when others then
    report := array_append(report, ('FAIL  D6  a valid game setting was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    update public.games set umpires_needed = 5 where id = g1;
    report := array_append(report, ('FAIL  D7  a game was set to need 5 umpires')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  D7  a game cannot be set to need more than 4 umpires')::text);
    else
      report := array_append(report, ('FAIL  D7  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.games set umpires_needed = -1 where id = g1;
    report := array_append(report, ('FAIL  D8  a game was set to need -1 umpires')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  D8  a game cannot be set to a negative number')::text);
    else
      report := array_append(report, ('FAIL  D8  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  select tournament_umpires into n from public.divisions where id = d1;
  if n is null then
    report := array_append(report, ('PASS  D9  a division has no separate tournament number to begin with (tournaments follow the regular default)')::text);
  else
    report := array_append(report, ('FAIL  D9  a new division already has a tournament number')::text);
    failures := failures + 1;
  end if;

  begin
    update public.divisions set tournament_umpires = 0 where id = d1;
    update public.divisions set tournament_umpires = 3 where id = d1;
    update public.divisions set tournament_umpires = 4 where id = d1;
    update public.divisions set tournament_umpires = null where id = d1;
    report := array_append(report, ('PASS  D10  a division can have a tournament number of 0 to 4, or none')::text);
  exception when others then
    report := array_append(report, ('FAIL  D10  a valid tournament number was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    update public.divisions set tournament_umpires = 5 where id = d1;
    report := array_append(report, ('FAIL  D11  a tournament number of 5 was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  D11  a tournament number cannot be more than 4')::text);
    else
      report := array_append(report, ('FAIL  D11  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  ----------------------------------------------------------------
  -- As a super admin
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- A1: assign both positions
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ua, 'field', ub));
    select count(*) into n from public.game_assignments where game_id = g1;
    select * into r from public.game_assignments where game_id = g1 and position = 'plate';
    select * into r2 from public.game_assignments where game_id = g1 and position = 'field';
    if n = 2 and r.umpire_id = ua and r2.umpire_id = ub and r.assigned_by = t_admin and r2.assigned_by = t_admin then
      report := array_append(report, ('PASS  A1  both umpires are assigned to their positions, and who assigned them is recorded')::text);
    else
      report := array_append(report, (format('FAIL  A1  assignments are not as expected (%s rows)', n))::text);
      failures := failures + 1;
    end if;
    at1 := r.assigned_at; at2 := r2.assigned_at;
  exception when others then
    report := array_append(report, ('FAIL  A1  assigning was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A2: doing the same again leaves them alone
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ua, 'field', ub));
    select count(*) into n from public.game_assignments where game_id = g1;
    select * into r from public.game_assignments where game_id = g1 and position = 'plate';
    select * into r2 from public.game_assignments where game_id = g1 and position = 'field';
    if n = 2 and r.assigned_at = at1 and r2.assigned_at = at2 then
      report := array_append(report, ('PASS  A2  setting the same umpires again changes nothing (the original assignments are kept)')::text);
    else
      report := array_append(report, ('FAIL  A2  the unchanged assignments were replaced')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  A2  repeating the same assignment failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A3: swap
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'field', ua));
    select * into r from public.game_assignments where game_id = g1 and position = 'plate';
    select * into r2 from public.game_assignments where game_id = g1 and position = 'field';
    select count(*) into n from public.game_assignments where game_id = g1;
    if n = 2 and r.umpire_id = ub and r2.umpire_id = ua then
      report := array_append(report, ('PASS  A3  two umpires can be swapped between plate and field')::text);
    else
      report := array_append(report, ('FAIL  A3  the swap did not work')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  A3  swapping was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A4: clear one position
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'field', null));
    select count(*) into n from public.game_assignments where game_id = g1;
    select * into r from public.game_assignments where game_id = g1;
    if n = 1 and r.position = 'plate' and r.umpire_id = ub then
      report := array_append(report, ('PASS  A4  clearing the field umpire leaves the plate umpire')::text);
    else
      report := array_append(report, ('FAIL  A4  clearing one position did not work')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  A4  clearing was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A5: clear everything
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', null, 'field', null));
    select count(*) into n from public.game_assignments where game_id = g1;
    if n = 0 then
      report := array_append(report, ('PASS  A5  clearing both positions removes all assignments')::text);
    else
      report := array_append(report, ('FAIL  A5  assignments remain')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  A5  clearing was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A6: the same umpire cannot hold both positions
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ua, 'field', ua));
    report := array_append(report, ('FAIL  A6  one umpire was given both positions')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%cannot hold two places%' then
      report := array_append(report, ('PASS  A6  one umpire cannot hold two places in a game')::text);
    else
      report := array_append(report, ('FAIL  A6  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- A7: an inactive umpire is refused, and a refusal changes NOTHING
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ua, 'field', null));
    begin
      perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'field', uc));   -- plate would move to B, then field C is refused
      report := array_append(report, ('FAIL  A7  an inactive umpire was assigned')::text);
      failures := failures + 1;
    exception when others then
      msg := sqlerrm;
      select * into r from public.game_assignments where game_id = g1 and position = 'plate';
      select count(*) into n from public.game_assignments where game_id = g1;
      if msg like '%not active%' and n = 1 and r.umpire_id = ua then
        report := array_append(report, ('PASS  A7  an inactive umpire is refused, and the plate umpire who was there is still there (nothing was half-changed)')::text);
      else
        report := array_append(report, (format('FAIL  A7  unexpected result: %s (%s rows)', msg, n))::text);
        failures := failures + 1;
      end if;
    end;
  exception when others then
    report := array_append(report, ('FAIL  A7  setup failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A8: a suspended umpire is refused too
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ud, 'field', null));
    report := array_append(report, ('FAIL  A8  a suspended umpire was assigned')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%not active%' then
      report := array_append(report, ('PASS  A8  a suspended umpire is refused')::text);
    else
      report := array_append(report, ('FAIL  A8  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- A9: nobody can be assigned to a canceled game
  begin
    perform public.set_game_umpires(g2, jsonb_build_object('plate', ua, 'field', null));
    report := array_append(report, ('FAIL  A9  an umpire was assigned to a canceled game')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%canceled game%' then
      report := array_append(report, ('PASS  A9  nobody can be assigned to a canceled game')::text);
    else
      report := array_append(report, ('FAIL  A9  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- A10: but a canceled game's old assignments can be cleared
  begin
    reset role;
    -- Set it up the way it really happens: the umpire is assigned while the
    -- game is still scheduled, and the game is canceled afterwards.
    update public.games set status = 'scheduled' where id = g2;
    insert into public.game_assignments (game_id, umpire_id, position) values (g2, ua, 'plate');
    update public.games set status = 'canceled' where id = g2;
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;

    perform public.set_game_umpires(g2, jsonb_build_object('plate', null, 'field', null));
    select count(*) into n from public.game_assignments where game_id = g2;
    if n = 0 then
      report := array_append(report, ('PASS  A10  the umpires of a game that was canceled later can be cleared')::text);
    else
      report := array_append(report, ('FAIL  A10  the old assignment could not be cleared')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  A10  clearing a canceled game failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A11: an unknown game
  begin
    perform public.set_game_umpires(gen_random_uuid(), jsonb_build_object('plate', ua, 'field', null));
    report := array_append(report, ('FAIL  A11  a missing game was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%game was not found%' then
      report := array_append(report, ('PASS  A11  an unknown game is refused')::text);
    else
      report := array_append(report, ('FAIL  A11  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- A12: the older rules still hold for direct writes
  begin
    insert into public.game_assignments (game_id, umpire_id, position) values (g1, ub, 'plate');
    report := array_append(report, ('FAIL  A12  a second umpire was put in the same position')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23505' then
      report := array_append(report, ('PASS  A12  a position can hold only one umpire (direct writes too)')::text);
    else
      report := array_append(report, ('FAIL  A12  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.game_assignments (game_id, umpire_id, position) values (g1, ua, 'field');
    report := array_append(report, ('FAIL  A13  one umpire was given both positions directly')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23505' then
      report := array_append(report, ('PASS  A13  one umpire cannot hold two positions in a game (direct writes too)')::text);
    else
      report := array_append(report, ('FAIL  A13  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.game_assignments (game_id, umpire_id, position) values (g1, uc, 'field');
    report := array_append(report, ('FAIL  A14  an inactive umpire was inserted directly')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%not active%' then
      report := array_append(report, ('PASS  A14  the "active umpires only" rule also covers direct writes')::text);
    else
      report := array_append(report, ('FAIL  A14  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- A15: editing the notes of an assignment keeps working even if the umpire has since become inactive
  begin
    reset role;
    update public.umpires set eligibility_status = 'inactive' where id = ua;
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;

    update public.game_assignments set notes = 'confirmed by phone' where game_id = g1 and position = 'plate';
    select count(*) into n from public.game_assignments where game_id = g1 and notes = 'confirmed by phone';
    if n = 1 then
      report := array_append(report, ('PASS  A15  an old assignment can still be edited after its umpire became inactive')::text);
    else
      report := array_append(report, ('FAIL  A15  the note was not saved')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  A15  editing an old assignment failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- A16: an umpire who has since become inactive can STAY on a game while the other position is changed
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ua, 'field', ub));
    select count(*) into n from public.game_assignments where game_id = g1;
    select * into r from public.game_assignments where game_id = g1 and position = 'plate';
    select * into r2 from public.game_assignments where game_id = g1 and position = 'field';
    if n = 2 and r.umpire_id = ua and r2.umpire_id = ub then
      report := array_append(report, ('PASS  A16  an umpire who became inactive stays on the game while the other position is filled')::text);
    else
      report := array_append(report, ('FAIL  A16  the inactive umpire was dropped or the field was not filled')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  A16  changing only the other position was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;


  ----------------------------------------------------------------
  -- More positions (3 and 4 umpires)
  ----------------------------------------------------------------
  -- P1: plate + first base + third base
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'first_base', ue, 'third_base', uf));
    select count(*) into n from public.game_assignments where game_id = g1;
    select count(*) into n_before from public.game_assignments
      where game_id = g1 and ((position = 'plate' and umpire_id = ub) or (position = 'first_base' and umpire_id = ue) or (position = 'third_base' and umpire_id = uf));
    if n = 3 and n_before = 3 then
      report := array_append(report, ('PASS  P1  three umpires can be assigned: plate, first base and third base (and the old field umpire is gone)')::text);
    else
      report := array_append(report, (format('FAIL  P1  expected 3 umpires in their places, found %s rows (%s correct)', n, n_before))::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  P1  assigning three umpires was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- P2: four umpires
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'first_base', ue, 'second_base', uf, 'third_base', ug));
    select count(*) into n from public.game_assignments where game_id = g1;
    select count(*) into n_before from public.game_assignments
      where game_id = g1 and ((position = 'second_base' and umpire_id = uf) or (position = 'third_base' and umpire_id = ug));
    if n = 4 and n_before = 2 then
      report := array_append(report, ('PASS  P2  four umpires can be assigned: plate, first, second and third base')::text);
    else
      report := array_append(report, (format('FAIL  P2  expected 4 umpires, found %s rows', n))::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  P2  assigning four umpires was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- P3: a position that is not in the list
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'pitcher', ue));
    report := array_append(report, ('FAIL  P3  an unknown position was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%Unknown position%' then
      report := array_append(report, ('PASS  P3  an unknown position is refused')::text);
    else
      report := array_append(report, ('FAIL  P3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- P4: and the table itself refuses one too
  begin
    insert into public.game_assignments (game_id, umpire_id, position) values (g1, uh, 'pitcher');
    report := array_append(report, ('FAIL  P4  an unknown position was written directly')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  P4  an unknown position is refused by the table itself (direct writes too)')::text);
    else
      report := array_append(report, ('FAIL  P4  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- P5: leaving one out removes it
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'first_base', ue, 'third_base', ug));
    select count(*) into n from public.game_assignments where game_id = g1;
    select count(*) into n_before from public.game_assignments where game_id = g1 and position = 'second_base';
    if n = 3 and n_before = 0 then
      report := array_append(report, ('PASS  P5  a position left out is emptied (4 umpires down to 3)')::text);
    else
      report := array_append(report, (format('FAIL  P5  expected 3 umpires and no second base, found %s rows', n))::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  P5  reducing the umpires was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- P6: one umpire in two of the places
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'first_base', ub));
    report := array_append(report, ('FAIL  P6  one umpire was given two places')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%cannot hold two places%' then
      report := array_append(report, ('PASS  P6  one umpire cannot hold two of the places (first base as well as plate)')::text);
    else
      report := array_append(report, ('FAIL  P6  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- P7: an empty value clears the place, and nothing else is touched
  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'first_base', null));
    select count(*) into n from public.game_assignments where game_id = g1;
    select * into r from public.game_assignments where game_id = g1;
    if n = 1 and r.position = 'plate' and r.umpire_id = ub then
      report := array_append(report, ('PASS  P7  an empty place is cleared, leaving only the plate umpire')::text);
    else
      report := array_append(report, (format('FAIL  P7  expected only the plate umpire, found %s rows', n))::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  P7  clearing a place was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- P8: a game with no umpires given at all is emptied
  begin
    perform public.set_game_umpires(g1, '{}'::jsonb);
    select count(*) into n from public.game_assignments where game_id = g1;
    if n = 0 then
      report := array_append(report, ('PASS  P8  an empty list leaves the game with no umpires')::text);
    else
      report := array_append(report, ('FAIL  P8  umpires remain after an empty list')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  P8  an empty list was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- The youth umpire rule
  --   Little League ages: A = 13, B = 12, C = 15, D = no birth date, E = birth month not in the chart
  --   Seniors start at 13, Juniors at 12, Majors at 11
  ----------------------------------------------------------------
  begin
    perform public.set_game_umpires(gs, jsonb_build_object('plate', ya));
    report := array_append(report, ('FAIL  Y1  a 13-year-old youth umpire was put on a Seniors game')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%cannot umpire Seniors%' then
      report := array_append(report, ('PASS  Y1  a 13-year-old youth umpire cannot umpire Seniors (the reason is given)')::text);
    else
      report := array_append(report, ('FAIL  Y1  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.set_game_umpires(gj, jsonb_build_object('plate', yb));
    report := array_append(report, ('FAIL  Y2  a 12-year-old youth umpire was put on a Juniors game')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%cannot umpire Juniors%' then
      report := array_append(report, ('PASS  Y2  a 12-year-old youth umpire cannot umpire Juniors')::text);
    else
      report := array_append(report, ('FAIL  Y2  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.set_game_umpires(gs, jsonb_build_object('plate', yb));
    report := array_append(report, ('FAIL  Y3  a 12-year-old youth umpire was put on a Seniors game')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%cannot umpire Seniors%' then
      report := array_append(report, ('PASS  Y3  a 12-year-old youth umpire cannot umpire Seniors either (any division above)')::text);
    else
      report := array_append(report, ('FAIL  Y3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.set_game_umpires(gj, jsonb_build_object('plate', ya));
    perform public.set_game_umpires(gm, jsonb_build_object('plate', yb));
    perform public.set_game_umpires(gs, jsonb_build_object('plate', yc));
    report := array_append(report, ('PASS  Y4  younger divisions are allowed: 13 on Juniors, 12 on Majors, 15 on Seniors')::text);
  exception when others then
    report := array_append(report, ('FAIL  Y4  an allowed assignment was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.set_game_umpires(gs, jsonb_build_object('plate', yd, 'field', ye));
    report := array_append(report, ('PASS  Y5  a youth umpire with no birth date, or whose birth month is not in the chart, is NOT blocked (the rule never guesses)')::text);
  exception when others then
    report := array_append(report, ('FAIL  Y5  an umpire whose age cannot be worked out was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.set_game_umpires(gs, jsonb_build_object('plate', ub, 'field', ue));
    report := array_append(report, ('PASS  Y6  adult umpires are not affected by the age rule')::text);
  exception when others then
    report := array_append(report, ('FAIL  Y6  an adult umpire was refused on Seniors: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    insert into public.game_assignments (game_id, umpire_id, position) values (gj, yb, 'field');
    report := array_append(report, ('FAIL  Y7  a direct insert put a 12-year-old youth on Juniors')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%cannot umpire Juniors%' then
      report := array_append(report, ('PASS  Y7  the age rule also covers direct writes')::text);
    else
      report := array_append(report, ('FAIL  Y7  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- the list the assignment screen asks for: Seniors
  -- (only the five youth umpires made for this check: real youth umpires may be in the list too)
  select count(*) into n from public.game_umpire_eligibility(gs) e where e.umpire_id in (ya, yb, yc, yd, ye);
  select count(*) into n_before from public.game_umpire_eligibility(gs) e where e.umpire_id in (ya, yb, yc, yd, ye) and e.problem is not null;
  select count(*) into rows_affected from public.game_umpire_eligibility(gs) e where e.umpire_id in (ya, yb, yc, yd, ye) and e.note is not null;
  if n = 4 and n_before = 2 and rows_affected = 2
     and exists (select 1 from public.game_umpire_eligibility(gs) e where e.umpire_id = ya and e.problem is not null)
     and exists (select 1 from public.game_umpire_eligibility(gs) e where e.umpire_id = yb and e.problem is not null)
     and exists (select 1 from public.game_umpire_eligibility(gs) e where e.umpire_id = yd and e.note is not null)
     and exists (select 1 from public.game_umpire_eligibility(gs) e where e.umpire_id = ye and e.note is not null)
     and not exists (select 1 from public.game_umpire_eligibility(gs) e where e.umpire_id in (yc, ub, ue)) then
    report := array_append(report, ('PASS  Y8  for a Seniors game, the screen is told: Youth A and B are blocked, D and E are unchecked, and C and every adult have nothing to report')::text);
  else
    report := array_append(report, (format('FAIL  Y8  unexpected eligibility list: %s rows, %s problems, %s notes', n, n_before, rows_affected))::text);
    failures := failures + 1;
  end if;

  -- and for Majors (players start at 11) nobody is blocked
  select count(*) into n from public.game_umpire_eligibility(gm) e where e.umpire_id in (ya, yb, yc, yd, ye) and e.problem is not null;
  if n = 0 then
    report := array_append(report, ('PASS  Y9  for a Majors game no youth umpire of these ages is blocked')::text);
  else
    report := array_append(report, (format('FAIL  Y9  %s youth umpires were blocked from Majors', n))::text);
    failures := failures + 1;
  end if;

  reset role;

  ----------------------------------------------------------------
  -- As an ordinary account
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'field', null));
    report := array_append(report, ('FAIL  O1  an ordinary account assigned an umpire')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%Only scheduling administrators%' then
      report := array_append(report, ('PASS  O1  an ordinary account cannot assign umpires')::text);
    else
      report := array_append(report, ('FAIL  O1  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.game_assignments (game_id, umpire_id, position) values (g1, ub, 'field');
    report := array_append(report, ('FAIL  O2  an ordinary account inserted an assignment directly')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  O2  a direct insert by an ordinary account is blocked by the security rules (the new rule did not change that)')::text);
    else
      report := array_append(report, ('FAIL  O2  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform * from public.game_umpire_eligibility(gs);
    report := array_append(report, ('FAIL  O4  an ordinary account read youth umpires'' eligibility')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%Only scheduling administrators%' then
      report := array_append(report, ('PASS  O4  an ordinary account cannot ask who is eligible (it is based on birth dates)')::text);
    else
      report := array_append(report, ('FAIL  O4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  select count(*) into n from public.umpire_game_check(ya, gs);
  if n = 0 then
    report := array_append(report, ('PASS  O5  an ordinary account asking about one umpire is told nothing')::text);
  else
    report := array_append(report, (format('FAIL  O5  an ordinary account learned something (%s rows)', n))::text);
    failures := failures + 1;
  end if;

  reset role;

  ----------------------------------------------------------------
  -- Not signed in at all
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  set local role anon;

  begin
    perform public.set_game_umpires(g1, jsonb_build_object('plate', ub, 'field', null));
    report := array_append(report, ('FAIL  O3  a signed-out visitor assigned an umpire')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  O3  a signed-out visitor cannot assign umpires at all')::text);
    else
      report := array_append(report, ('FAIL  O3  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform * from public.game_umpire_eligibility(gs);
    report := array_append(report, ('FAIL  O6  a signed-out visitor read eligibility')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  O6  a signed-out visitor cannot ask who is eligible')::text);
    else
      report := array_append(report, ('FAIL  O6  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nUMPIRE ASSIGNMENTS CHECK (nothing was saved; your real data was not used)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
