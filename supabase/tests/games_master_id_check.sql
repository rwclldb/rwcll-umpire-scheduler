-- RWCLL check: does the master calendar Game ID work?
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261025110000_add_game_master_id.sql.
--
-- Like games_rules_check.sql, it builds its own tiny league, tries valid and
-- invalid IDs, and ENDS WITH A RED ERROR on purpose so that everything is
-- rolled back. Your real data is not used, and nothing is saved.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  l1 uuid; s1 uuid; s2 uuid; d1 uuid;
  t1 uuid; t2 uuid; t3 uuid; t4 uuid;
  loc uuid;
  g1 uuid; g2 uuid;
  t_start timestamptz := now() + interval '1 day';
begin
  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.seasons (name) values ('CHK S2 ' || stamp) returning id into s2;
  insert into public.divisions (league_id, name) values (l1, 'D1') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into t1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into t2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s2, 'T3', d1) returning id into t3;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s2, 'T4', d1) returning id into t4;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;

  -- M1: a game with a master ID, and games with none
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s1, d1, t1, t2, loc, t_start, t_start + interval '2 hours', 'M-100') returning id into g1;
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, t_start + interval '1 day', t_start + interval '1 day 2 hours');
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, t_start + interval '2 days', t_start + interval '2 days 2 hours');
    report := array_append(report, ('PASS  M1  a game can carry a master ID, and any number of games can have none')::text);
  exception when others then
    report := array_append(report, ('FAIL  M1  valid games were refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- M2: the same ID in a DIFFERENT season is fine (numbering may restart)
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s2, d1, t3, t4, loc, t_start, t_start + interval '2 hours', 'M-100') returning id into g2;
    report := array_append(report, ('PASS  M2  the same master ID is allowed in a different season')::text);
  exception when others then
    report := array_append(report, ('FAIL  M2  the same ID in another season was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- M3: the same ID twice in ONE season is refused
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s1, d1, t1, t2, loc, t_start + interval '3 days', t_start + interval '3 days 2 hours', 'M-100');
    report := array_append(report, ('FAIL  M3  a duplicate master ID in the same season was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23505' then
      report := array_append(report, ('PASS  M3  a duplicate master ID in the same season is refused')::text);
    else
      report := array_append(report, ('FAIL  M3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- M4: changing a game to a duplicate ID is refused too
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s1, d1, t1, t2, loc, t_start + interval '4 days', t_start + interval '4 days 2 hours', 'M-200');
    update public.games set external_game_id = 'M-100'
    where season_id = s1 and external_game_id = 'M-200';
    report := array_append(report, ('FAIL  M4  a game was changed to a duplicate master ID')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23505' then
      report := array_append(report, ('PASS  M4  a game cannot be changed to an ID another game already uses')::text);
    else
      report := array_append(report, ('FAIL  M4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- M5: spaces around the ID are refused (so " 100" and "100" can never both exist)
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s1, d1, t1, t2, loc, t_start + interval '5 days', t_start + interval '5 days 2 hours', ' M-300');
    report := array_append(report, ('FAIL  M5  an ID with a leading space was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  M5  an ID with leading or trailing spaces is refused')::text);
    else
      report := array_append(report, ('FAIL  M5  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- M6: an empty ID is refused (no ID means null, not an empty string)
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s1, d1, t1, t2, loc, t_start + interval '6 days', t_start + interval '6 days 2 hours', '');
    report := array_append(report, ('FAIL  M6  an empty ID was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  M6  an empty ID is refused')::text);
    else
      report := array_append(report, ('FAIL  M6  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- M7: a very long ID is refused
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s1, d1, t1, t2, loc, t_start + interval '7 days', t_start + interval '7 days 2 hours', repeat('x', 101));
    report := array_append(report, ('FAIL  M7  a 101-character ID was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  M7  an ID longer than 100 characters is refused')::text);
    else
      report := array_append(report, ('FAIL  M7  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- M8: clearing an ID frees it for another game
  begin
    update public.games set external_game_id = null where id = g1;
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, external_game_id)
    values (s1, d1, t1, t2, loc, t_start + interval '8 days', t_start + interval '8 days 2 hours', 'M-100');
    report := array_append(report, ('PASS  M8  clearing an ID frees it for another game')::text);
  exception when others then
    report := array_append(report, ('FAIL  M8  clearing and reusing an ID failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nMASTER GAME ID CHECK (nothing was saved; your real data was not used)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
