-- RWCLL check: does creating a season from a registration file work, and is
-- it all-or-nothing?
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261025130000_add_import_season_function.sql.
--
-- It builds its own tiny leagues, signs in (inside the database) as a super
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
  l1 uuid; l2 uuid;
  d_exist uuid; d_other uuid;
  s_exist uuid;
  nd1 uuid := gen_random_uuid();
  nd2 uuid := gen_random_uuid();
  res jsonb;
  new_season uuid;
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

  -- Two tiny leagues, a division in each, and an existing season with a team.
  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.leagues (name) values ('CHK L2 ' || stamp) returning id into l2;
  insert into public.divisions (league_id, name) values (l1, 'Existing Division') returning id into d_exist;
  insert into public.divisions (league_id, name) values (l2, 'Other League Division') returning id into d_other;
  insert into public.seasons (name, starts_on, ends_on)
    values ('CHK Existing Season ' || stamp, '2026-03-01', '2026-06-01') returning id into s_exist;
  insert into public.teams (league_id, season_id, name, division_id)
    values (l1, s_exist, 'Already Here', d_exist);

  ----------------------------------------------------------------
  -- As a super admin
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- S1: a brand-new season with 2 new divisions and 3 teams (one in an existing division)
  begin
    res := public.import_season(
      l1,
      jsonb_build_object('name', '  CHK New Season ' || stamp || '  ', 'starts_on', '2026-08-16', 'ends_on', '2026-11-20'),
      jsonb_build_array(
        jsonb_build_object('id', nd1, 'name', 'CHK New Div 1 ' || stamp),
        jsonb_build_object('id', nd2, 'name', 'CHK New Div 2 ' || stamp)),
      jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Team A', 'division_id', nd1),
        jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Team B', 'division_id', nd2),
        jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Team C', 'division_id', d_exist)));

    new_season := (res->>'season_id')::uuid;

    if (res->>'season_created')::boolean and (res->>'divisions_created')::int = 2 and (res->>'teams_created')::int = 3 then
      report := array_append(report, ('PASS  S1  a new season, 2 new divisions and 3 teams are created, and the counts are reported')::text);
    else
      report := array_append(report, ('FAIL  S1  the counts were wrong: ' || res::text)::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  S1  a valid import was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- S2: what was stored
  begin
    select * into r from public.seasons where id = new_season;

    select count(*) into n from public.teams
    where season_id = new_season and league_id = l1 and name in ('CHK Team A', 'CHK Team B', 'CHK Team C');

    select count(*) into n_after from public.divisions
    where id in (nd1, nd2) and league_id = l1;

    if r.name = 'CHK New Season ' || stamp and r.starts_on = '2026-08-16' and r.ends_on = '2026-11-20'
       and r.is_active and n = 3 and n_after = 2 then
      report := array_append(report, ('PASS  S2  the season (name trimmed, dates kept, active), its teams and its divisions are stored in the right league')::text);
    else
      report := array_append(report, (format('FAIL  S2  stored name "%s", %s teams, %s divisions', r.name, n, n_after))::text);
      failures := failures + 1;
    end if;
  end;

  -- S3: adding teams to an EXISTING season changes nothing else about it
  begin
    select count(*) into n_before from public.seasons;

    res := public.import_season(
      l1,
      jsonb_build_object('id', s_exist, 'name', 'this name must be ignored', 'starts_on', '2030-01-01'),
      '[]'::jsonb,
      jsonb_build_array(
        jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Late Team', 'division_id', d_exist)));

    select * into r from public.seasons where id = s_exist;
    select count(*) into n_after from public.seasons;

    if not (res->>'season_created')::boolean and (res->>'teams_created')::int = 1
       and r.name = 'CHK Existing Season ' || stamp and r.starts_on = '2026-03-01' and r.ends_on = '2026-06-01'
       and n_before = n_after then
      report := array_append(report, ('PASS  S3  teams are added to an existing season, whose name and dates are left alone, and no season is created')::text);
    else
      report := array_append(report, ('FAIL  S3  the existing season was changed or a season was created: ' || res::text)::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  S3  adding to an existing season was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- S4: ALL OR NOTHING: a duplicate season name is refused, and nothing else in the call is saved
  select count(*) into n_before from public.divisions where league_id = l1;
  begin
    perform public.import_season(
      l1,
      jsonb_build_object('name', 'CHK Existing Season ' || stamp),
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Should Not Exist ' || stamp)),
      '[]'::jsonb);
    report := array_append(report, ('FAIL  S4  a duplicate season name was accepted')::text);
    failures := failures + 1;
  exception when others then
    msg := sqlerrm;
    select count(*) into n_after from public.divisions where league_id = l1;
    if sqlstate = '23505' and msg like '%CHK Existing Season%could not be created%' and n_after = n_before then
      report := array_append(report, ('PASS  S4  a season name that already exists is refused, naming the season')::text);
    else
      report := array_append(report, (format('FAIL  S4  unexpected result (%s): %s', sqlstate, msg))::text);
      failures := failures + 1;
    end if;
  end;

  -- S5: ALL OR NOTHING: a duplicate division name is refused, and the NEW season created earlier in the same call is not saved
  select count(*) into n_before from public.seasons;
  begin
    perform public.import_season(
      l1,
      jsonb_build_object('name', 'CHK Atomic Season ' || stamp),
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Existing Division')),
      '[]'::jsonb);
    report := array_append(report, ('FAIL  S5  a duplicate division name was accepted')::text);
    failures := failures + 1;
  exception when others then
    msg := sqlerrm;
    select count(*) into n_after from public.seasons;
    if sqlstate = '23505' and msg like '%The division "Existing Division" could not be added%' and n_after = n_before then
      report := array_append(report, ('PASS  S5  a division name that already exists is refused, and the new season from the same import was NOT saved')::text);
    else
      report := array_append(report, (format('FAIL  S5  unexpected result (%s): %s, seasons before %s after %s', sqlstate, msg, n_before, n_after))::text);
      failures := failures + 1;
    end if;
  end;

  -- S6: ALL OR NOTHING: a duplicate team name in the season is refused, and the new division from the same call is not saved
  select count(*) into n_before from public.divisions where league_id = l1;
  begin
    perform public.import_season(
      l1,
      jsonb_build_object('id', s_exist),
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Atomic Division ' || stamp)),
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'Already Here', 'division_id', d_exist)));
    report := array_append(report, ('FAIL  S6  a duplicate team name was accepted')::text);
    failures := failures + 1;
  exception when others then
    msg := sqlerrm;
    select count(*) into n_after from public.divisions where league_id = l1;
    if sqlstate = '23505' and msg like '%The team "Already Here" could not be added%' and n_after = n_before then
      report := array_append(report, ('PASS  S6  a team name that already exists in the season is refused, naming the team, and nothing else was saved')::text);
    else
      report := array_append(report, (format('FAIL  S6  unexpected result (%s): %s', sqlstate, msg))::text);
      failures := failures + 1;
    end if;
  end;

  -- S7: a team in ANOTHER league's division is refused
  begin
    perform public.import_season(
      l1, jsonb_build_object('id', s_exist), '[]'::jsonb,
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', 'CHK Wrong League', 'division_id', d_other)));
    report := array_append(report, ('FAIL  S7  a team in another league''s division was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23503' and sqlerrm like '%teams_division_in_same_league%' then
      report := array_append(report, ('PASS  S7  a team cannot be put in another league''s division')::text);
    else
      report := array_append(report, (format('FAIL  S7  unexpected result (%s): %s', sqlstate, sqlerrm))::text);
      failures := failures + 1;
    end if;
  end;

  -- S8: season dates that run backwards are refused
  begin
    perform public.import_season(
      l1, jsonb_build_object('name', 'CHK Backwards ' || stamp, 'starts_on', '2026-11-20', 'ends_on', '2026-08-16'),
      '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  S8  a season that ends before it starts was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' and sqlerrm like '%could not be created%' then
      report := array_append(report, ('PASS  S8  a season that ends before it starts is refused')::text);
    else
      report := array_append(report, (format('FAIL  S8  unexpected result (%s): %s', sqlstate, sqlerrm))::text);
      failures := failures + 1;
    end if;
  end;

  -- S9: empty names are refused (season, division, team)
  begin
    perform public.import_season(l1, jsonb_build_object('name', '   '), '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  S9  a season with no name was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%season needs a name%' then
      report := array_append(report, ('PASS  S9  a season with no name is refused')::text);
    else
      report := array_append(report, ('FAIL  S9  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_season(l1, jsonb_build_object('id', s_exist),
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', '  ')), '[]'::jsonb);
    report := array_append(report, ('FAIL  S10  a division with no name was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%name is empty%' then
      report := array_append(report, ('PASS  S10  a division with no name is refused')::text);
    else
      report := array_append(report, ('FAIL  S10  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_season(l1, jsonb_build_object('id', s_exist), '[]'::jsonb,
      jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'name', '', 'division_id', d_exist)));
    report := array_append(report, ('FAIL  S11  a team with no name was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%name is empty%' then
      report := array_append(report, ('PASS  S11  a team with no name is refused')::text);
    else
      report := array_append(report, ('FAIL  S11  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- S12: an unknown league, an unknown season, a malformed payload, an oversized import
  begin
    perform public.import_season(gen_random_uuid(), jsonb_build_object('name', 'X'), '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  S12  an unknown league was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%league was not found%' then
      report := array_append(report, ('PASS  S12  an unknown league is refused')::text);
    else
      report := array_append(report, ('FAIL  S12  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_season(l1, jsonb_build_object('id', gen_random_uuid()), '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  S13  an unknown season was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%season was not found%' then
      report := array_append(report, ('PASS  S13  an unknown season is refused')::text);
    else
      report := array_append(report, ('FAIL  S13  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_season(l1, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  S14  a malformed payload was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%not in the expected form%' then
      report := array_append(report, ('PASS  S14  a malformed payload is refused')::text);
    else
      report := array_append(report, ('FAIL  S14  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.import_season(l1, jsonb_build_object('id', s_exist), '[]'::jsonb,
      (select jsonb_agg('{}'::jsonb) from generate_series(1, 2001)));
    report := array_append(report, ('FAIL  S15  an oversized import was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%too large%' then
      report := array_append(report, ('PASS  S15  an import of more than 2,000 teams is refused')::text);
    else
      report := array_append(report, ('FAIL  S15  unexpected message: ' || sqlerrm)::text);
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
    perform public.import_season(l1, jsonb_build_object('name', 'CHK Sneaky ' || stamp), '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  S16  an ordinary account created a season')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%Only scheduling administrators%' then
      report := array_append(report, ('PASS  S16  an ordinary account cannot import a season')::text);
    else
      report := array_append(report, ('FAIL  S16  unexpected message: ' || sqlerrm)::text);
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
    perform public.import_season(l1, jsonb_build_object('name', 'CHK Anon ' || stamp), '[]'::jsonb, '[]'::jsonb);
    report := array_append(report, ('FAIL  S17  a signed-out visitor ran an import')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  S17  a signed-out visitor cannot run an import at all')::text);
    else
      report := array_append(report, (format('FAIL  S17  unexpected result (%s): %s', sqlstate, sqlerrm))::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nIMPORT SEASON CHECK (nothing was saved; your real data was not used)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
