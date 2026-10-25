-- RWCLL check: does the games import work, and is it all-or-nothing?
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261025120000_add_import_games_function.sql.
--
-- It builds its own tiny league, signs in (inside the database) as a super
-- admin and as an ordinary account, and tries valid and invalid imports. It
-- ENDS WITH A RED ERROR on purpose: the report is carried in the error
-- message, and raising an error guarantees that everything it created is
-- rolled back. Your real data is not used, and nothing is saved.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid; t_ordinary uuid;
  l1 uuid; s1 uuid; s2 uuid; d1 uuid; d2 uuid;
  t1 uuid; t2 uuid; t3 uuid; t_other uuid; f_old uuid;
  nt1 uuid := gen_random_uuid();
  nt2 uuid := gen_random_uuid();
  nl uuid := gen_random_uuid();
  g1 uuid;
  t0 timestamptz := now() + interval '3 days';
  res jsonb;
  n bigint; n_before bigint; n_after bigint;
  r record;
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
  insert into public.seasons (name) values ('CHK S2 ' || stamp) returning id into s2;
  insert into public.divisions (league_id, name) values (l1, 'D1') returning id into d1;
  insert into public.divisions (league_id, name) values (l1, 'D2') returning id into d2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into t1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into t2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T3', d2) returning id into t3;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s2, 'Other season', d1) returning id into t_other;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into f_old;

  ----------------------------------------------------------------
  -- As a super admin
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- I1: a full import: 2 new teams, 1 new field, 3 new games
  begin
    res := public.import_games(
      s1,
      jsonb_build_array(
        jsonb_build_object('id', nt1, 'name', 'CHK New 1 ' || stamp, 'division_id', d1),
        jsonb_build_object('id', nt2, 'name', 'CHK New 2 ' || stamp, 'division_id', d1)),
      jsonb_build_array(
        jsonb_build_object('id', nl, 'name', 'CHK New Field ' || stamp)),
      jsonb_build_array(
        jsonb_build_object('op', 'insert', 'external_game_id', 'C-1', 'division_id', d1,
          'home_team_id', nt1, 'away_team_id', t1, 'location_id', nl,
          'starts_at', t0, 'ends_at', t0 + interval '2 hours'),
        jsonb_build_object('op', 'insert', 'external_game_id', 'C-2', 'division_id', d1,
          'home_team_id', nt2, 'away_label', 'Outside Club', 'location_id', f_old,
          'starts_at', t0 + interval '1 day', 'ends_at', t0 + interval '1 day 2 hours'),
        jsonb_build_object('op', 'insert', 'external_game_id', 'C-3', 'division_id', d1,
          'home_label', 'Winner of C-1', 'away_label', 'Winner of C-2', 'location_id', f_old,
          'starts_at', t0 + interval '2 days', 'ends_at', t0 + interval '2 days 2 hours')));

    if (res->>'teams_created')::int = 2 and (res->>'locations_created')::int = 1
       and (res->>'games_inserted')::int = 3 and (res->>'games_updated')::int = 0 then
      report := array_append(report, ('PASS  I1  a full import adds the new teams, the new field and the games, and reports the counts')::text);
    else
      report := array_append(report, ('FAIL  I1  the counts were wrong: ' || res::text)::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  I1  a valid import was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- I2: what was stored
  begin
    select count(*) into n from public.games
    where season_id = s1 and external_game_id in ('C-1', 'C-2', 'C-3')
      and status = 'scheduled' and game_type = 'regular' and division_id = d1;

    select count(*) into n_after from public.teams
    where id in (nt1, nt2) and season_id = s1 and division_id = d1 and league_id = l1;

    select count(*) into n_before from public.locations where id = nl;

    if n = 3 and n_after = 2 and n_before = 1 then
      report := array_append(report, ('PASS  I2  new games are stored as scheduled; new teams get the right season, division and league')::text);
    else
      report := array_append(report, (format('FAIL  I2  stored %s games, %s teams, %s fields (expected 3, 2, 1)', n, n_after, n_before))::text);
      failures := failures + 1;
    end if;
  end;

  -- I3: updating an existing game (matched by its id) leaves the status alone
  begin
    select id into g1 from public.games where season_id = s1 and external_game_id = 'C-1';

    res := public.import_games(
      s1, '[]'::jsonb, '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('op', 'update', 'id', g1, 'division_id', d1,
          'home_team_id', t2, 'away_team_id', nt1, 'location_id', f_old,
          'starts_at', t0 + interval '5 hours', 'ends_at', t0 + interval '7 hours')));

    select * into r from public.games where id = g1;

    if (res->>'games_updated')::int = 1 and r.home_team_id = t2 and r.away_team_id = nt1
       and r.location_id = f_old and r.starts_at = t0 + interval '5 hours'
       and r.status = 'scheduled' and r.external_game_id = 'C-1' then
      report := array_append(report, ('PASS  I3  an update changes teams, field and times, and keeps the status and master ID')::text);
    else
      report := array_append(report, ('FAIL  I3  the updated game is not as expected')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  I3  a valid update was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- I4: an update that names a status changes it
  begin
    perform public.import_games(
      s1, '[]'::jsonb, '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('op', 'update', 'id', g1, 'division_id', d1,
          'home_label', 'Moved to a bracket', 'away_team_id', nt1, 'location_id', f_old,
          'starts_at', t0 + interval '5 hours', 'ends_at', t0 + interval '7 hours',
          'status', 'canceled')));

    select * into r from public.games where id = g1;

    if r.status = 'canceled' and r.home_team_id is null and r.home_label = 'Moved to a bracket' then
      report := array_append(report, ('PASS  I4  an update can set the status, and can swap a team for a label')::text);
    else
      report := array_append(report, ('FAIL  I4  the status or label was not applied')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  I4  a valid update was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- I5: ALL OR NOTHING: a good new game plus a duplicate master ID: nothing is saved
  select count(*) into n_before from public.games where season_id = s1;
  begin
    perform public.import_games(
      s1, '[]'::jsonb, '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('op', 'insert', 'external_game_id', 'C-4', 'division_id', d1,
          'home_team_id', t1, 'away_team_id', t2, 'location_id', f_old,
          'starts_at', t0 + interval '8 days', 'ends_at', t0 + interval '8 days 2 hours'),
        jsonb_build_object('op', 'insert', 'external_game_id', 'C-2', 'division_id', d1,
          'home_team_id', t1, 'away_team_id', t2, 'location_id', f_old,
          'starts_at', t0 + interval '9 days', 'ends_at', t0 + interval '9 days 2 hours')));
    report := array_append(report, ('FAIL  I5  a duplicate master ID was accepted')::text);
    failures := failures + 1;
  exception when others then
    msg := sqlerrm;
    select count(*) into n_after from public.games where season_id = s1;
    if sqlstate = '23505' and msg like '%Game "C-2" could not be imported%' and n_after = n_before then
      report := array_append(report, ('PASS  I5  a duplicate master ID is refused, the message names the game, and the good game in the same import was NOT saved')::text);
    else
      report := array_append(report, (format('FAIL  I5  unexpected result (%s): %s, games before %s after %s', sqlstate, msg, n_before, n_after))::text);
      failures := failures + 1;
    end if;
  end;

  -- I6: ALL OR NOTHING for new teams too: a new team plus a game that breaks a rule
  select count(*) into n_before from public.teams where season_id = s1;
  begin
    perform public.import_games(
      s1,
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Atomic ' || stamp, 'division_id', d1)),
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('op', 'insert', 'external_game_id', 'C-5', 'division_id', d1,
          'home_team_id', t3, 'away_team_id', t1, 'location_id', f_old,   -- t3 is in division D2
          'starts_at', t0 + interval '10 days', 'ends_at', t0 + interval '10 days 2 hours')));
    report := array_append(report, ('FAIL  I6  a team from the wrong division was accepted')::text);
    failures := failures + 1;
  exception when others then
    msg := sqlerrm;
    select count(*) into n_after from public.teams where season_id = s1;
    if sqlstate = '23503' and msg like '%games_home_team_in_division%' and n_after = n_before then
      report := array_append(report, ('PASS  I6  a team from the wrong division is refused, and the new team created earlier in the same import was NOT saved')::text);
    else
      report := array_append(report, (format('FAIL  I6  unexpected result (%s): %s, teams before %s after %s', sqlstate, msg, n_before, n_after))::text);
      failures := failures + 1;
    end if;
  end;

  -- I7: a team from another season is refused
  begin
    perform public.import_games(
      s1, '[]'::jsonb, '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('op', 'insert', 'external_game_id', 'C-6', 'division_id', d1,
          'home_team_id', t_other, 'away_team_id', t1, 'location_id', f_old,
          'starts_at', t0 + interval '11 days', 'ends_at', t0 + interval '11 days 2 hours')));
    report := array_append(report, ('FAIL  I7  a team from another season was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' and sqlerrm like '%games_home_team_in_season%' then
      report := array_append(report, ('PASS  I7  a team from another season is refused')::text);
    else
      report := array_append(report, ('FAIL  I7  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- I8: updating a game that does not exist in this season is refused
  begin
    perform public.import_games(
      s1, '[]'::jsonb, '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('op', 'update', 'id', gen_random_uuid(), 'division_id', d1,
          'home_team_id', t1, 'away_team_id', t2, 'location_id', f_old,
          'starts_at', t0, 'ends_at', t0 + interval '2 hours')));
    report := array_append(report, ('FAIL  I8  an update of a missing game was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%not found in this season%' then
      report := array_append(report, ('PASS  I8  updating a game that is not in this season is refused')::text);
    else
      report := array_append(report, ('FAIL  I8  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- I9: a duplicate new team name is refused, naming the team
  begin
    perform public.import_games(
      s1,
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'T1', 'division_id', d1)),
      '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  I9  a duplicate team name was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23505' and sqlerrm like '%The team "T1" could not be added%' then
      report := array_append(report, ('PASS  I9  a new team with an existing name is refused, naming the team')::text);
    else
      report := array_append(report, ('FAIL  I9  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- I10: a duplicate new field name is refused, naming the field
  begin
    perform public.import_games(
      s1, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Field ' || stamp)),
      '[]'::jsonb);
    report := array_append(report, ('FAIL  I10  a duplicate field name was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23505' and sqlerrm like '%could not be added%' then
      report := array_append(report, ('PASS  I10  a new field with an existing name is refused')::text);
    else
      report := array_append(report, ('FAIL  I10  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- I11: a new team in a division that does not exist
  begin
    perform public.import_games(
      s1,
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Nowhere ' || stamp, 'division_id', gen_random_uuid())),
      '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  I11  a team in a missing division was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%division was not found%' then
      report := array_append(report, ('PASS  I11  a new team in a missing division is refused')::text);
    else
      report := array_append(report, ('FAIL  I11  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- I12: an unknown season, an unknown operation, a malformed payload, and an oversized import
  begin
    perform public.import_games(gen_random_uuid(), '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  I12  an unknown season was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%season was not found%' then
      report := array_append(report, ('PASS  I12  an unknown season is refused')::text);
    else
      report := array_append(report, ('FAIL  I12  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_games(s1, '[]'::jsonb, '[]'::jsonb,
      jsonb_build_array(jsonb_build_object('op', 'delete', 'external_game_id', 'C-9')));
    report := array_append(report, ('FAIL  I13  an unknown operation was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%unknown operation%' then
      report := array_append(report, ('PASS  I13  an unknown operation is refused')::text);
    else
      report := array_append(report, ('FAIL  I13  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_games(s1, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  I14  a malformed payload was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%not in the expected form%' then
      report := array_append(report, ('PASS  I14  a malformed payload is refused')::text);
    else
      report := array_append(report, ('FAIL  I14  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_games(s1, '[]'::jsonb, '[]'::jsonb,
      (select jsonb_agg('{}'::jsonb) from generate_series(1, 5001)));
    report := array_append(report, ('FAIL  I15  an oversized import was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%too large%' then
      report := array_append(report, ('PASS  I15  an import of more than 5,000 games is refused')::text);
    else
      report := array_append(report, ('FAIL  I15  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  ----------------------------------------------------------------
  -- As an ordinary account
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.import_games(s1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  I16  an ordinary account ran an import')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%Only scheduling administrators%' then
      report := array_append(report, ('PASS  I16  an ordinary account cannot import games')::text);
    else
      report := array_append(report, ('FAIL  I16  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  ----------------------------------------------------------------
  -- Not signed in at all
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  set local role anon;

  begin
    perform public.import_games(s1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  I17  a signed-out visitor ran an import')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  I17  a signed-out visitor cannot run an import at all')::text);
    else
      report := array_append(report, ('FAIL  I17  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nIMPORT GAMES CHECK (nothing was saved; your real data was not used)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
