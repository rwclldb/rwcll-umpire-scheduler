-- RWCLL check: umpires needed per game, and the rules for assigning umpires.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261025140000_add_umpires_needed_and_assignment_rules.sql.
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
  ua uuid; ub uuid; uc uuid; ud uuid;
  t_start timestamptz := now() + interval '2 days';
  n bigint; n_before bigint;
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
    report := array_append(report, ('FAIL  D2  a division was set to need 0 umpires')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  D2  a division cannot be set to need 0 umpires')::text);
    else
      report := array_append(report, ('FAIL  D2  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.divisions set umpires_per_game = 3 where id = d1;
    report := array_append(report, ('FAIL  D3  a division was set to need 3 umpires')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  D3  a division cannot be set to need 3 umpires')::text);
    else
      report := array_append(report, ('FAIL  D3  unexpected result (' || sqlstate || '): ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.divisions set umpires_per_game = 1 where id = d1;
    update public.divisions set umpires_per_game = 2 where id = d1;
    report := array_append(report, ('PASS  D4  a division can need 1 or 2 umpires')::text);
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
    update public.games set umpires_needed = null where id = g1;
    report := array_append(report, ('PASS  D6  a game can be set to need 0, 1 or 2 umpires, or back to the division default')::text);
  exception when others then
    report := array_append(report, ('FAIL  D6  a valid game setting was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    update public.games set umpires_needed = 3 where id = g1;
    report := array_append(report, ('FAIL  D7  a game was set to need 3 umpires')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  D7  a game cannot be set to need more than 2 umpires')::text);
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

  ----------------------------------------------------------------
  -- As a super admin
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- A1: assign both positions
  begin
    perform public.set_game_umpires(g1, ua, ub);
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
    perform public.set_game_umpires(g1, ua, ub);
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
    perform public.set_game_umpires(g1, ub, ua);
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
    perform public.set_game_umpires(g1, ub, null);
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
    perform public.set_game_umpires(g1, null, null);
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
    perform public.set_game_umpires(g1, ua, ua);
    report := array_append(report, ('FAIL  A6  one umpire was given both positions')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%cannot be both%' then
      report := array_append(report, ('PASS  A6  one umpire cannot be both plate and field umpire')::text);
    else
      report := array_append(report, ('FAIL  A6  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- A7: an inactive umpire is refused, and a refusal changes NOTHING
  begin
    perform public.set_game_umpires(g1, ua, null);
    begin
      perform public.set_game_umpires(g1, ub, uc);   -- plate would move to B, then field C is refused
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
    perform public.set_game_umpires(g1, ud, null);
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
    perform public.set_game_umpires(g2, ua, null);
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

    perform public.set_game_umpires(g2, null, null);
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
    perform public.set_game_umpires(gen_random_uuid(), ua, null);
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
    perform public.set_game_umpires(g1, ua, ub);
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

  reset role;

  ----------------------------------------------------------------
  -- As an ordinary account
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.set_game_umpires(g1, ub, null);
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

  reset role;

  ----------------------------------------------------------------
  -- Not signed in at all
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  set local role anon;

  begin
    perform public.set_game_umpires(g1, ub, null);
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

  reset role;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nUMPIRE ASSIGNMENTS CHECK (nothing was saved; your real data was not used)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
