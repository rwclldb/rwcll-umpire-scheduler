-- RWCLL check: do the team and game rules work?
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261025100000_add_team_and_game_rules.sql.
--
-- It builds its own tiny league (two leagues, two seasons, three divisions,
-- five teams, one field) and then tries valid and invalid teams and games.
-- The run ENDS WITH A RED ERROR on purpose: the report is carried in the
-- error message, and raising an error guarantees that everything it created
-- is rolled back. Your real data is not used, and nothing is saved.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  l1 uuid; l2 uuid;                 -- leagues
  s1 uuid; s2 uuid;                 -- seasons
  d1 uuid; d2 uuid; d3 uuid;        -- divisions (d1, d2 in l1; d3 in l2)
  t1 uuid; t2 uuid; t3 uuid; t4 uuid; t5 uuid;
  loc uuid;
  g uuid;
  t_start timestamptz := now() + interval '1 day';
begin
  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.leagues (name) values ('CHK L2 ' || stamp) returning id into l2;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.seasons (name) values ('CHK S2 ' || stamp) returning id into s2;
  insert into public.divisions (league_id, name) values (l1, 'D1') returning id into d1;
  insert into public.divisions (league_id, name) values (l1, 'D2') returning id into d2;
  insert into public.divisions (league_id, name) values (l2, 'D3') returning id into d3;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;

  ----------------------------------------------------------------
  -- Rule 1: a team's division must belong to the team's league
  ----------------------------------------------------------------
  begin
    insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into t1;
    insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into t2;
    insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T3', d2) returning id into t3;
    insert into public.teams (league_id, season_id, name, division_id) values (l1, s2, 'T4', d1) returning id into t4;
    insert into public.teams (league_id, season_id, name)              values (l1, s1, 'T5')     returning id into t5;
    report := array_append(report, ('PASS  R1  teams in their own league''s divisions (and a team with no division) are accepted')::text);
  exception when others then
    report := array_append(report, ('FAIL  R1  valid teams were refused: ' || sqlerrm)::text);
    failures := failures + 1;
    raise exception E'\n\nGAME RULES CHECK stopped early (nothing was saved)\n\n%\n', array_to_string(report, E'\n');
  end;

  begin
    insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'Bad', d3);
    report := array_append(report, ('FAIL  R2  a team was put in another league''s division')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' then
      report := array_append(report, ('PASS  R2  a new team cannot use another league''s division')::text);
    else
      report := array_append(report, ('FAIL  R2  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.teams set division_id = d3 where id = t5;
    report := array_append(report, ('FAIL  R3  a team was moved into another league''s division')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' then
      report := array_append(report, ('PASS  R3  an existing team cannot be moved into another league''s division')::text);
    else
      report := array_append(report, ('FAIL  R3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.teams set division_id = d2 where id = t5;
    update public.teams set division_id = null where id = t5;
    report := array_append(report, ('PASS  R4  a team can still move between divisions of its own league, or have none')::text);
  exception when others then
    report := array_append(report, ('FAIL  R4  a valid division change was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    update public.divisions set league_id = l2 where id = d1;
    report := array_append(report, ('FAIL  R5  a division with teams was moved to another league')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' then
      report := array_append(report, ('PASS  R5  a division that has teams cannot be moved to another league')::text);
    else
      report := array_append(report, ('FAIL  R5  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  ----------------------------------------------------------------
  -- Rule 2: games
  ----------------------------------------------------------------
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, t_start, t_start + interval '2 hours')
    returning id into g;
    report := array_append(report, ('PASS  G1  a normal game (two teams in the game''s season and division) is accepted')::text);
  exception when others then
    report := array_append(report, ('FAIL  G1  a valid game was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t4, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G2  a team from a different season was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' then
      report := array_append(report, ('PASS  G2  a team from a different season is refused')::text);
    else
      report := array_append(report, ('FAIL  G2  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t3, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G3  a team from a different division was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' then
      report := array_append(report, ('PASS  G3  a team from a different division is refused')::text);
    else
      report := array_append(report, ('FAIL  G3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t5, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G4  a team with no division was accepted in a division game')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' then
      report := array_append(report, ('PASS  G4  a team with no division cannot play in a division game')::text);
    else
      report := array_append(report, ('FAIL  G4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t1, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G5  a team was scheduled against itself')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  G5  a team cannot play itself')::text);
    else
      report := array_append(report, ('FAIL  G5  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, division_id, game_type, home_label, away_label, location_id, starts_at, ends_at)
    values (s1, d1, 'tournament', 'Winner of Game 3', 'Winner of Game 4', loc, t_start + interval '1 day', t_start + interval '1 day 2 hours');
    insert into public.games (season_id, division_id, game_type, home_team_id, away_label, location_id, starts_at, ends_at)
    values (s1, d1, 'tournament', t1, 'Winner of Game 5', loc, t_start + interval '2 days', t_start + interval '2 days 2 hours');
    report := array_append(report, ('PASS  G6  tournament games with undecided bracket slots (labels, or a team against a label) are accepted')::text);
  exception when others then
    report := array_append(report, ('FAIL  G6  a bracket game was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    insert into public.games (season_id, division_id, home_team_id, home_label, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, 'Both', t2, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G7  a side with BOTH a team and a label was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  G7  a side cannot be both a team and a label')::text);
    else
      report := array_append(report, ('FAIL  G7  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, division_id, home_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G8  a game with an empty away side was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  G8  every side must be a team or a label')::text);
    else
      report := array_append(report, ('FAIL  G8  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, t1, t2, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G9  a game with no division was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23502' then
      report := array_append(report, ('PASS  G9  every game must have a division')::text);
    else
      report := array_append(report, ('FAIL  G9  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, division_id, game_type, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, 'friendly', t1, t2, loc, t_start, t_start + interval '2 hours');
    report := array_append(report, ('FAIL  G10  an unknown game type was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  G10  an unknown game type is refused')::text);
    else
      report := array_append(report, ('FAIL  G10  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, t_start, t_start - interval '1 hour');
    report := array_append(report, ('FAIL  G11  a game that ends before it starts was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  G11  a game must end after it starts (the older rule still holds)')::text);
    else
      report := array_append(report, ('FAIL  G11  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    delete from public.teams where id = t1;
    report := array_append(report, ('FAIL  G12  a team that has games was deleted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' then
      report := array_append(report, ('PASS  G12  a team that has games cannot be deleted')::text);
    else
      report := array_append(report, ('FAIL  G12  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- G13 proves the trigger: triggers are switched off for one moment to put
  -- an old "last changed" time on the game, then switched back on. A normal
  -- update must bring the time up to date by itself.
  begin
    set local session_replication_role = replica;
    update public.games set updated_at = now() - interval '2 days' where id = g;
    set local session_replication_role = origin;

    update public.games set notes = 'changed' where id = g;

    if (select updated_at from public.games where id = g) > now() - interval '1 hour' then
      report := array_append(report, ('PASS  G13  the database keeps the "last changed" time up to date by itself')::text);
    else
      report := array_append(report, ('FAIL  G13  "last changed" stayed old after an update')::text);
      failures := failures + 1;
    end if;
  exception when insufficient_privilege then
    set local session_replication_role = origin;
    report := array_append(report, ('SKIP  G13  this account may not switch triggers off, so the timestamp trigger could not be proven here')::text);
  when others then
    set local session_replication_role = origin;
    report := array_append(report, ('FAIL  G13  the timestamp check failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nGAME RULES CHECK (nothing was saved; your real data was not used)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
