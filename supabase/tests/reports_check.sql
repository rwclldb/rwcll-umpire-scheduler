-- RWCLL check: reports (post-game reports and reports from outside).
--
-- NOTE ON DATES: a report's 'date received' is judged by California's date (the
-- league's time zone). The database's own current_date is in UTC, which late in the
-- evening in California is already tomorrow, so this script names the date it means.
--
-- Run in the Supabase SQL Editor AFTER applying 20261105100000_add_reports.sql
-- (which needs the demo clock migration, 20261101100000, applied first).
--
-- It builds its own seasons, games, umpires and sign-in accounts, including an
-- umpire chief and a scheduler, then acts as each of them, as a super admin, and
-- as a signed-out visitor. It ENDS WITH A RED ERROR on purpose: the report is
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
  t_admin uuid;
  ch_acct uuid := gen_random_uuid(); sc_acct uuid := gen_random_uuid();
  a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  l1 uuid; d1 uuid; s_new uuid; s_old uuid; s_edge uuid; s_none uuid;
  tm1 uuid; tm2 uuid; tm3 uuid; tm4 uuid; tm5 uuid; tm6 uuid; tm7 uuid; tm8 uuid; loc uuid;
  g_live uuid; g_end uuid; g_future uuid; g_cancel uuid; g_ancient uuid; g_b uuid; g_old uuid; g_edge uuid; g_none uuid;
  um_a uuid; um_b uuid;
  r_a1 uuid; r_o1 uuid; r_o2 uuid; r_o3 uuid;
  n bigint;
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
      (ch_acct, 'chk-' || stamp || '-chief@example.org', now(), '{}'::jsonb),
      (sc_acct, 'chk-' || stamp || '-sched@example.org', now(), '{}'::jsonb),
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (b_acct, 'chk-' || stamp || '-b@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (ch_acct, sc_acct, a_acct, b_acct, x_acct);
  insert into public.user_roles (user_id, role_id) values (ch_acct, 'umpire_chief'), (sc_acct, 'scheduler');

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div') returning id into d1;

  -- four seasons: current; ended 400 days ago (past the one-year limit); ended 300 days ago (not yet); no end date
  insert into public.seasons (name, starts_on, ends_on) values ('CHK New ' || stamp, current_date - 60, current_date + 100) returning id into s_new;
  insert into public.seasons (name, starts_on, ends_on) values ('CHK Old ' || stamp, current_date - 600, current_date - 400) returning id into s_old;
  insert into public.seasons (name, starts_on, ends_on) values ('CHK Edge ' || stamp, current_date - 500, current_date - 300) returning id into s_edge;
  insert into public.seasons (name) values ('CHK None ' || stamp) returning id into s_none;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_new, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_new, 'T2', d1) returning id into tm2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_old, 'T3', d1) returning id into tm3;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_old, 'T4', d1) returning id into tm4;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_edge, 'T5', d1) returning id into tm5;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_edge, 'T6', d1) returning id into tm6;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_none, 'T7', d1) returning id into tm7;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s_none, 'T8', d1) returning id into tm8;

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Rep A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Rep B ' || stamp, 'adult', b_acct) returning id into um_b;
  update public.profiles set display_name = 'CHK Chief ' || stamp where id = ch_acct;
  update public.profiles set display_name = 'CHK Sched ' || stamp where id = sc_acct;

  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_new, d1, tm1, tm2, loc, now() - interval '1 hour', now() + interval '1 hour') returning id into g_live;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_new, d1, tm1, tm2, loc, now() - interval '4 hours', now() - interval '2 hours') returning id into g_end;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_new, d1, tm1, tm2, loc, now() + interval '2 hours', now() + interval '4 hours') returning id into g_future;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_new, d1, tm1, tm2, loc, now() - interval '3 hours', now() - interval '1 hour') returning id into g_cancel;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_new, d1, tm1, tm2, loc, now() - interval '21 days', now() - interval '21 days' + interval '2 hours') returning id into g_ancient;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_new, d1, tm1, tm2, loc, now() - interval '3 hours', now() - interval '1 hour') returning id into g_b;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_old, d1, tm3, tm4, loc, now() - interval '405 days', now() - interval '405 days' + interval '2 hours') returning id into g_old;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_edge, d1, tm5, tm6, loc, now() - interval '310 days', now() - interval '310 days' + interval '2 hours') returning id into g_edge;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s_none, d1, tm7, tm8, loc, now() - interval '310 days', now() - interval '310 days' + interval '2 hours') returning id into g_none;
  insert into public.game_assignments (game_id, umpire_id, position) values
    (g_live, um_a, 'plate'), (g_end, um_a, 'plate'), (g_future, um_a, 'plate'), (g_cancel, um_a, 'plate'), (g_ancient, um_a, 'plate'),
    (g_b, um_b, 'plate'), (g_old, um_a, 'plate'), (g_edge, um_a, 'plate'), (g_none, um_a, 'plate');
  update public.games set status = 'canceled' where id = g_cancel;

  ----------------------------------------------------------------
  -- 1. An umpire writes a post-game report
  ----------------------------------------------------------------
  -- F1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'incident', 'SECRETTEXT The coach was upset about a call.');
    reset role;
    if (select count(*) from public.game_reports where game_id = g_live and umpire_id = um_a and category = 'incident' and season_id = s_new and author_name = 'CHK Rep A ' || stamp) = 1 and (select count(*) from public.report_audit where report_kind = 'game' and action = 'created' and report_id = (select id from public.game_reports where game_id = g_live and umpire_id = um_a)) = 1 then report := array_append(report, ('PASS  F1  an umpire assigned to a game that has started can write a report (even mid-game); it records the season and who wrote it, and the change log notes it')::text); else report := array_append(report, ('FAIL  F1  the report was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F1  the report was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  select id into r_a1 from public.game_reports where game_id = g_live and umpire_id = um_a;

  -- F2
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = ch_acct and subject like 'A post-game report was filed') = 1 and (select count(*) from public.email_outbox where to_profile_id = t_admin and subject like 'A post-game report was filed') >= 1 and (select count(*) from public.email_outbox where to_profile_id = sc_acct and subject like 'A post-game report was filed') = 0 and (select count(*) from public.email_outbox where to_profile_id = a_acct and subject like 'A post-game report was filed') = 0 then report := array_append(report, ('PASS  F2  the umpire chief and super admins were told a report was filed; a scheduler and the writer were not')::text); else report := array_append(report, ('FAIL  F2  the wrong people were told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F2  the wrong people were told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F3
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where body like '%SECRETTEXT%' or subject like '%SECRETTEXT%') = 0 then report := array_append(report, ('PASS  F3  the message says only that a report was filed: none of the report''s text is in any message')::text); else report := array_append(report, ('FAIL  F3  the report''s text leaked into a message')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F3  the report''s text leaked into a message: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_end, 'ejection', 'Player ejected for language.');
    reset role;
    if (select count(*) from public.game_reports where game_id = g_end) = 1 then report := array_append(report, ('PASS  F4  a report can also be written after the game has ended')::text); else report := array_append(report, ('FAIL  F4  a report after the game was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F4  a report after the game was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_future, 'other', 'too early');
    reset role;
    report := array_append(report, ('FAIL  F5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%once the game has started%' then report := array_append(report, ('PASS  F5  a report cannot be written before the game starts')::text); else report := array_append(report, ('FAIL  F5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_ancient, 'other', 'too late');
    reset role;
    report := array_append(report, ('FAIL  F6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%14 days%' then report := array_append(report, ('PASS  F6  ...nor more than 14 days after it ended')::text); else report := array_append(report, ('FAIL  F6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F7
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_cancel, 'other', 'canceled');
    reset role;
    report := array_append(report, ('FAIL  F7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%was canceled%' then report := array_append(report, ('PASS  F7  ...nor for a canceled game')::text); else report := array_append(report, ('FAIL  F7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F8
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'other', 'not mine');
    reset role;
    report := array_append(report, ('FAIL  F8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not assigned%' then report := array_append(report, ('PASS  F8  an umpire who is not on the game cannot write one')::text); else report := array_append(report, ('FAIL  F8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F9
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'other', 'nobody');
    reset role;
    report := array_append(report, ('FAIL  F9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%linked to an umpire record%' then report := array_append(report, ('PASS  F9  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  F9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F10
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'other', 'scheduler');
    reset role;
    report := array_append(report, ('FAIL  F10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%linked to an umpire record%' then report := array_append(report, ('PASS  F10  a scheduler (not an umpire) cannot')::text); else report := array_append(report, ('FAIL  F10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F11
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.file_game_report(g_live, 'other', 'signed out');
    reset role;
    report := array_append(report, ('FAIL  F11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  F11  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  F11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F12
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'other', '   ');
    reset role;
    report := array_append(report, ('FAIL  F12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be empty%' then report := array_append(report, ('PASS  F12  an empty report is refused')::text); else report := array_append(report, ('FAIL  F12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F13
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'other', repeat('x', 4001));
    reset role;
    report := array_append(report, ('FAIL  F13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 4000%' then report := array_append(report, ('PASS  F13  a report over 4000 characters is refused')::text); else report := array_append(report, ('FAIL  F13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F14
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'gossip', 'x');
    reset role;
    report := array_append(report, ('FAIL  F14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%what the report is about%' then report := array_append(report, ('PASS  F14  an unknown kind of report is refused')::text); else report := array_append(report, ('FAIL  F14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F15
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'other', repeat('y', 4000));
    reset role;
    if (select count(*) from public.game_reports where game_id = g_live and char_length(body) = 4000) = 1 then report := array_append(report, ('PASS  F15  a report of exactly 4000 characters is accepted')::text); else report := array_append(report, ('FAIL  F15  a 4000 character report was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F15  a 4000 character report was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: three more reports, so that A has written 5 on this game (the most allowed))
  reset role;
  perform set_config('request.jwt.claim.sub', a_acct::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.file_game_report(g_live, 'other', 'third');
  perform public.file_game_report(g_live, 'other', 'fourth');
  perform public.file_game_report(g_live, 'other', 'fifth');
  reset role;

  -- F16
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.file_game_report(g_live, 'other', 'sixth');
    reset role;
    report := array_append(report, ('FAIL  F16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%most reports allowed%' then report := array_append(report, ('PASS  F16  a sixth report on the same game is refused (add a follow-up instead)')::text); else report := array_append(report, ('FAIL  F16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 2. Who can read post-game reports
  ----------------------------------------------------------------
  -- R1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_reports;
    reset role;
    if n = 6 then report := array_append(report, ('PASS  R1  the umpire reads their own reports (all 6 they wrote)')::text); else report := array_append(report, ('FAIL  R1  the umpire could not read their own reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R1  the umpire could not read their own reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R2
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_reports;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R2  another umpire reads none of them')::text); else report := array_append(report, ('FAIL  R2  an umpire read another umpire''s reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R2  an umpire read another umpire''s reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_reports where umpire_id = um_a;
    reset role;
    if n = 6 then report := array_append(report, ('PASS  R3  the umpire chief reads them')::text); else report := array_append(report, ('FAIL  R3  the chief could not read reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R3  the chief could not read reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_reports where umpire_id = um_a;
    reset role;
    if n = 6 then report := array_append(report, ('PASS  R4  a super admin reads them')::text); else report := array_append(report, ('FAIL  R4  a super admin could not read reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R4  a super admin could not read reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_reports;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R5  a scheduler does NOT')::text); else report := array_append(report, ('FAIL  R5  a scheduler read reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R5  a scheduler read reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R6
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_reports;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R6  an ordinary account does not')::text); else report := array_append(report, ('FAIL  R6  an ordinary account read reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R6  an ordinary account read reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.game_reports;
    reset role;
    report := array_append(report, ('FAIL  R7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R7  a signed-out visitor cannot read them')::text); else report := array_append(report, ('FAIL  R7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R8
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.game_reports set body = 'edited' where id = r_a1;
    reset role;
    report := array_append(report, ('FAIL  R8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R8  an umpire cannot edit their report after sending it')::text); else report := array_append(report, ('FAIL  R8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R9
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.game_reports where id = r_a1;
    reset role;
    report := array_append(report, ('FAIL  R9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R9  ...nor delete it')::text); else report := array_append(report, ('FAIL  R9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R10
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_reports (game_id, season_id, umpire_id, author_name, category, body) values (g_live, s_new, um_a, 'x', 'other', 'sneaky');
    reset role;
    report := array_append(report, ('FAIL  R10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R10  nobody writes the table directly, not even the chief')::text); else report := array_append(report, ('FAIL  R10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R11
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.game_reports set body = 'edited' where id = r_a1;
    reset role;
    report := array_append(report, ('FAIL  R11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R11  ...and the chief cannot change what an umpire wrote')::text); else report := array_append(report, ('FAIL  R11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 3. Follow-ups to a post-game report
  ----------------------------------------------------------------
  -- U1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_report_followup(r_a1, 'More detail from the umpire.');
    reset role;
    if (select count(*) from public.game_report_followups where report_id = r_a1) = 1 and (select count(*) from public.email_outbox where to_profile_id = ch_acct and subject like 'A follow-up was added to a post-game report') = 1 then report := array_append(report, ('PASS  U1  the umpire can add a follow-up to their own report, and the chief is told')::text); else report := array_append(report, ('FAIL  U1  the follow-up was not added')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U1  the follow-up was not added: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U2
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_report_followup(r_a1, 'Spoke with the coach.');
    reset role;
    if (select count(*) from public.game_report_followups where report_id = r_a1) = 2 and (select count(*) from public.email_outbox where to_profile_id = ch_acct and subject like 'A follow-up was added to a post-game report') = 1 then report := array_append(report, ('PASS  U2  the chief can add one too (and nobody is messaged about it)')::text); else report := array_append(report, ('FAIL  U2  the chief''s follow-up failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U2  the chief''s follow-up failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U3
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_report_followup(r_a1, 'not mine');
    reset role;
    report := array_append(report, ('FAIL  U3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%only add to a report you wrote%' then report := array_append(report, ('PASS  U3  another umpire cannot')::text); else report := array_append(report, ('FAIL  U3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U4
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_report_followup(r_a1, 'scheduler');
    reset role;
    report := array_append(report, ('FAIL  U4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%only add to a report you wrote%' then report := array_append(report, ('PASS  U4  a scheduler cannot')::text); else report := array_append(report, ('FAIL  U4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_report_followup(r_a1, '  ');
    reset role;
    report := array_append(report, ('FAIL  U5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be empty%' then report := array_append(report, ('PASS  U5  an empty follow-up is refused')::text); else report := array_append(report, ('FAIL  U5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_game_report_followup(gen_random_uuid(), 'x');
    reset role;
    report := array_append(report, ('FAIL  U6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  U6  a follow-up to a report that does not exist is refused')::text); else report := array_append(report, ('FAIL  U6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.add_game_report_followup(r_a1, 'x');
    reset role;
    report := array_append(report, ('FAIL  U7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  U7  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  U7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U8
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_report_followups;
    reset role;
    if n = 2 then report := array_append(report, ('PASS  U8  the umpire reads the follow-ups on their report (their own and the chief''s)')::text); else report := array_append(report, ('FAIL  U8  the umpire could not read the follow-ups')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U8  the umpire could not read the follow-ups: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U9
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_report_followups;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  U9  another umpire reads none')::text); else report := array_append(report, ('FAIL  U9  an umpire read someone else''s follow-ups')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U9  an umpire read someone else''s follow-ups: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U10
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.game_report_followups;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  U10  a scheduler reads none')::text); else report := array_append(report, ('FAIL  U10  a scheduler read follow-ups')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U10  a scheduler read follow-ups: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U11
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_report_followups (report_id, author_name, body) values (r_a1, 'x', 'sneaky');
    reset role;
    report := array_append(report, ('FAIL  U11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  U11  follow-ups cannot be written directly')::text); else report := array_append(report, ('FAIL  U11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 4. Reports from outside: only the chief and super admins
  ----------------------------------------------------------------
  -- O1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_outside_report(um_a, g_end, s_new, E'  Coach Pat  ', 'coach', current_date - 1, E'  SECRETOUTSIDE Said the umpire was late.  ') into r_o1;
    reset role;
    if (select source_name from public.outside_reports where id = r_o1) = 'Coach Pat' and (select body from public.outside_reports where id = r_o1) like 'SECRETOUTSIDE%' and (select entered_by_name from public.outside_reports where id = r_o1) = 'CHK Chief ' || stamp and (select count(*) from public.report_audit where report_id = r_o1 and action = 'created') = 1 then report := array_append(report, ('PASS  O1  the umpire chief can enter a report from outside about an umpire (tidied); who entered it and the change log are recorded')::text); else report := array_append(report, ('FAIL  O1  the outside report was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O1  the outside report was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_outside_report(um_b, null, s_new, 'Parent Lee', 'parent', (now() at time zone 'America/Los_Angeles')::date, 'About B.') into r_o2;
    reset role;
    if (select count(*) from public.outside_reports where id = r_o2) = 1 then report := array_append(report, ('PASS  O2  a super admin can too (and the game is optional)')::text); else report := array_append(report, ('FAIL  O2  a super admin could not add one')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O2  a super admin could not add one: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O2b
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_outside_report(um_b, null, s_new, 'Coach Today', 'coach', (now() at time zone 'America/Los_Angeles')::date, 'Received today.') into r_o3;
    reset role;
    if exists (select 1 from public.outside_reports where id = r_o3) then report := array_append(report, ('PASS  O2b  a report received today (California''s date, whatever the database''s own date is) is accepted')::text); else report := array_append(report, ('FAIL  O2b  today''s date in California was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O2b  today''s date in California was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: remove that extra report so the later counts are unchanged)
  reset role;
  delete from public.outside_reports where id = r_o3;

  -- O3
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  O3  a scheduler cannot')::text); else report := array_append(report, ('FAIL  O3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  O4  the umpire it is about cannot (or anyone else)')::text); else report := array_append(report, ('FAIL  O4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O5
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  O5  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  O5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O6
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O6  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  O6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O7
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(gen_random_uuid(), null, s_new, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%umpire does not exist%' then report := array_append(report, ('PASS  O7  an umpire that does not exist is refused')::text); else report := array_append(report, ('FAIL  O7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O8
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, gen_random_uuid(), 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Choose the season%' then report := array_append(report, ('PASS  O8  the season is required (it decides when the report is deleted)')::text); else report := array_append(report, ('FAIL  O8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O9
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, gen_random_uuid(), s_new, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%game does not exist%' then report := array_append(report, ('PASS  O9  a game that does not exist is refused')::text); else report := array_append(report, ('FAIL  O9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O10
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, '   ', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Say who reported it%' then report := array_append(report, ('PASS  O10  who reported it is required')::text); else report := array_append(report, ('FAIL  O10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O11
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'neighbor', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%who the report is from%' then report := array_append(report, ('PASS  O11  an unknown source role is refused')::text); else report := array_append(report, ('FAIL  O11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O12
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'coach', (now() at time zone 'America/Los_Angeles')::date + 1, 'x');
    reset role;
    report := array_append(report, ('FAIL  O12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be empty or in the future%' then report := array_append(report, ('PASS  O12  a date in the future (tomorrow, in California) is refused')::text); else report := array_append(report, ('FAIL  O12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O13
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'coach', current_date - 2, '  ');
    reset role;
    report := array_append(report, ('FAIL  O13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be empty%' then report := array_append(report, ('PASS  O13  an empty report is refused')::text); else report := array_append(report, ('FAIL  O13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O14
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report(um_a, null, s_new, 'X', 'coach', current_date - 2, repeat('x', 4001));
    reset role;
    report := array_append(report, ('FAIL  O14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 4000%' then report := array_append(report, ('PASS  O14  a report over 4000 characters is refused')::text); else report := array_append(report, ('FAIL  O14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O15
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_reports;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  O15  THE UMPIRE IT IS ABOUT CANNOT SEE IT (they read none, though there are reports about them)')::text); else report := array_append(report, ('FAIL  O15  an umpire could see a report from outside')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O15  an umpire could see a report from outside: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O16
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_reports where umpire_id = um_a;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  O16  ...even when asking for reports about themselves')::text); else report := array_append(report, ('FAIL  O16  an umpire could see a report about themselves')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O16  an umpire could see a report about themselves: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O17
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_reports;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  O17  another umpire sees none either')::text); else report := array_append(report, ('FAIL  O17  an umpire read outside reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O17  an umpire read outside reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O18
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_reports;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  O18  a scheduler sees none')::text); else report := array_append(report, ('FAIL  O18  a scheduler read outside reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O18  a scheduler read outside reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O19
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_reports where umpire_id in (um_a, um_b);
    reset role;
    if n = 2 then report := array_append(report, ('PASS  O19  the chief reads them')::text); else report := array_append(report, ('FAIL  O19  the chief could not read outside reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O19  the chief could not read outside reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O20
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_reports where umpire_id in (um_a, um_b);
    reset role;
    if n = 2 then report := array_append(report, ('PASS  O20  a super admin reads them')::text); else report := array_append(report, ('FAIL  O20  a super admin could not read outside reports')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O20  a super admin could not read outside reports: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O21
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.outside_reports (umpire_id, season_id, source_name, source_role, received_on, body, entered_by_name) values (um_a, s_new, 'x', 'coach', current_date, 'sneaky', 'x');
    reset role;
    report := array_append(report, ('FAIL  O21  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O21  outside reports cannot be written directly')::text); else report := array_append(report, ('FAIL  O21  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O22
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.edit_outside_report(r_o1, 'Coach Patricia', 'manager', current_date - 2, 'Corrected: arrived five minutes late.');
    reset role;
    if (select source_name from public.outside_reports where id = r_o1) = 'Coach Patricia' and (select edited_at from public.outside_reports where id = r_o1) is not null and (select count(*) from public.report_audit where report_id = r_o1 and action = 'edited') = 1 then report := array_append(report, ('PASS  O22  the chief can correct a report from outside; the time is recorded and so is the change')::text); else report := array_append(report, ('FAIL  O22  the edit did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O22  the edit did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O23
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.edit_outside_report(r_o1, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O23  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  O23  a scheduler cannot edit')::text); else report := array_append(report, ('FAIL  O23  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O24
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.edit_outside_report(r_o1, 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O24  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  O24  the umpire cannot edit')::text); else report := array_append(report, ('FAIL  O24  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O25
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.edit_outside_report(gen_random_uuid(), 'X', 'coach', current_date - 2, 'x');
    reset role;
    report := array_append(report, ('FAIL  O25  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  O25  editing a report that does not exist is refused')::text); else report := array_append(report, ('FAIL  O25  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O26
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.edit_outside_report(r_o1, 'X', 'coach', current_date - 2, '  ');
    reset role;
    report := array_append(report, ('FAIL  O26  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be empty%' then report := array_append(report, ('PASS  O26  an edit cannot blank the report')::text); else report := array_append(report, ('FAIL  O26  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O27
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report_followup(r_o1, 'Spoke with the umpire on the phone.');
    reset role;
    if (select count(*) from public.outside_report_followups where report_id = r_o1) = 1 and (select count(*) from public.report_audit where report_id = r_o1 and action = 'followup') = 1 then report := array_append(report, ('PASS  O27  the chief can add a follow-up to a report from outside')::text); else report := array_append(report, ('FAIL  O27  the follow-up failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O27  the follow-up failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O28
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_outside_report_followup(r_o1, 'x');
    reset role;
    report := array_append(report, ('FAIL  O28  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  O28  the umpire cannot')::text); else report := array_append(report, ('FAIL  O28  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O29
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_report_followups;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  O29  the umpire cannot read follow-ups to reports about them')::text); else report := array_append(report, ('FAIL  O29  an umpire read outside follow-ups')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O29  an umpire read outside follow-ups: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O30
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.outside_report_followups where report_id = r_o1;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  O30  the chief can')::text); else report := array_append(report, ('FAIL  O30  the chief could not read outside follow-ups')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O30  the chief could not read outside follow-ups: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O31
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.outside_report_followups (report_id, author_name, body) values (r_o1, 'x', 'sneaky');
    reset role;
    report := array_append(report, ('FAIL  O31  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O31  outside follow-ups cannot be written directly')::text); else report := array_append(report, ('FAIL  O31  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 5. The change log
  ----------------------------------------------------------------
  -- L1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.report_audit where report_id in (r_a1, r_o1);
    reset role;
    if n >= 6 then report := array_append(report, ('PASS  L1  the chief reads the change log (created, follow-ups, the edit)')::text); else report := array_append(report, ('FAIL  L1  the chief could not read the change log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L1  the chief could not read the change log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.report_audit;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  L2  an umpire cannot read it, even for their own report')::text); else report := array_append(report, ('FAIL  L2  an umpire read the change log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L2  an umpire read the change log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L3
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.report_audit;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  L3  a scheduler cannot')::text); else report := array_append(report, ('FAIL  L3  a scheduler read the change log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L3  a scheduler read the change log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.report_audit (report_kind, report_id, action, actor_name) values ('game', r_a1, 'created', 'forged');
    reset role;
    report := array_append(report, ('FAIL  L4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L4  the change log cannot be written directly (so it cannot be forged)')::text); else report := array_append(report, ('FAIL  L4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.report_audit where report_id = r_a1;
    reset role;
    report := array_append(report, ('FAIL  L5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L5  ...or erased, even by a super admin')::text); else report := array_append(report, ('FAIL  L5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 6. Deleting (super admins only)
  ----------------------------------------------------------------
  -- D1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_report('game', r_a1);
    reset role;
    report := array_append(report, ('FAIL  D1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only super admins%' then report := array_append(report, ('PASS  D1  the umpire chief cannot delete a report')::text); else report := array_append(report, ('FAIL  D1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_report('game', r_a1);
    reset role;
    report := array_append(report, ('FAIL  D2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only super admins%' then report := array_append(report, ('PASS  D2  an umpire cannot')::text); else report := array_append(report, ('FAIL  D2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D3
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_report('game', r_a1);
    reset role;
    report := array_append(report, ('FAIL  D3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only super admins%' then report := array_append(report, ('PASS  D3  a scheduler cannot')::text); else report := array_append(report, ('FAIL  D3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D4
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.delete_report('game', r_a1);
    reset role;
    report := array_append(report, ('FAIL  D4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  D4  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  D4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_report('memo', r_a1);
    reset role;
    report := array_append(report, ('FAIL  D5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%game or outside%' then report := array_append(report, ('PASS  D5  an unknown kind is refused')::text); else report := array_append(report, ('FAIL  D5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_report('game', gen_random_uuid());
    reset role;
    report := array_append(report, ('FAIL  D6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  D6  deleting a report that does not exist says so')::text); else report := array_append(report, ('FAIL  D6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_report('game', r_a1);
    reset role;
    if not exists (select 1 from public.game_reports where id = r_a1) and not exists (select 1 from public.game_report_followups where report_id = r_a1) then report := array_append(report, ('PASS  D7  a super admin can delete a post-game report, and its follow-ups go with it')::text); else report := array_append(report, ('FAIL  D7  the report was not deleted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D7  the report was not deleted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D8
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.report_audit where report_id = r_a1 and action = 'deleted';
    reset role;
    if n = 1 then report := array_append(report, ('PASS  D8  the deletion is in the change log, and the earlier entries for that report are still there')::text); else report := array_append(report, ('FAIL  D8  the deletion was not logged')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D8  the deletion was not logged: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D9
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.report_audit where report_id = r_a1;
    reset role;
    if n >= 4 then report := array_append(report, ('PASS  D9  the change log keeps its entries (no report text) after the report is gone')::text); else report := array_append(report, ('FAIL  D9  the change log lost entries')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D9  the change log lost entries: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D10
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.delete_report('outside', r_o2);
    reset role;
    if not exists (select 1 from public.outside_reports where id = r_o2) then report := array_append(report, ('PASS  D10  a super admin can delete a report from outside')::text); else report := array_append(report, ('FAIL  D10  the outside report was not deleted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D10  the outside report was not deleted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 7. Automatic deletion, a year after the season ends
  ----------------------------------------------------------------
  -- (setup, not a test: reports in a season that ended 400 days ago, one that ended 300 days ago, and one with no end date)
  reset role;
  insert into public.game_reports (game_id, season_id, umpire_id, author_name, category, body) values
    (g_old, s_old, um_a, 'CHK', 'other', 'old game report'),
    (g_edge, s_edge, um_a, 'CHK', 'other', 'edge game report');
  insert into public.outside_reports (umpire_id, season_id, source_name, source_role, received_on, body, entered_by_name) values
    (um_a, s_old, 'Coach X', 'coach', current_date - 500, 'old outside report', 'CHK'),
    (um_a, s_none, 'Coach Y', 'coach', current_date - 500, 'no-end-date outside report', 'CHK');

  -- P1
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.purge_expired_reports();
    reset role;
    report := array_append(report, ('FAIL  P1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  P1  a scheduler cannot run the deletion')::text); else report := array_append(report, ('FAIL  P1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.purge_expired_reports();
    reset role;
    report := array_append(report, ('FAIL  P2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the umpire chief and super admins%' then report := array_append(report, ('PASS  P2  an umpire cannot')::text); else report := array_append(report, ('FAIL  P2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P3
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.purge_expired_reports();
    reset role;
    report := array_append(report, ('FAIL  P3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  P3  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  P3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.purge_expired_reports() into n;
    reset role;
    if n >= 2 then report := array_append(report, ('PASS  P4  the chief runs it: at least the 2 reports in the season that ended over a year ago are deleted')::text); else report := array_append(report, ('FAIL  P4  the wrong number of reports was deleted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P4  the wrong number of reports was deleted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P5
  begin
    reset role;
    null;
    reset role;
    if not exists (select 1 from public.game_reports where body = 'old game report') and not exists (select 1 from public.outside_reports where body = 'old outside report') then report := array_append(report, ('PASS  P5  both expired reports (a post-game one and one from outside) are gone')::text); else report := array_append(report, ('FAIL  P5  an expired report was not deleted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P5  an expired report was not deleted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P6
  begin
    reset role;
    null;
    reset role;
    if exists (select 1 from public.game_reports where body = 'edge game report') and exists (select 1 from public.outside_reports where body = 'no-end-date outside report') and exists (select 1 from public.game_reports where body = 'third') then report := array_append(report, ('PASS  P6  a report from a season that ended only 300 days ago, one from a season with no end date, and a current one are all kept')::text); else report := array_append(report, ('FAIL  P6  a report was deleted too early')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P6  a report was deleted too early: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P7
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.report_audit where action = 'purged' and actor_name = 'Automatic deletion' and actor_id is null) >= 2 then report := array_append(report, ('PASS  P7  each automatic deletion is in the change log, as the system and not a person')::text); else report := array_append(report, ('FAIL  P7  the automatic deletions were not logged')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P7  the automatic deletions were not logged: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P8
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.purge_expired_reports() into n;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  P8  running it again deletes nothing more')::text); else report := array_append(report, ('FAIL  P8  it deleted something twice')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P8  it deleted something twice: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: switch the demo clock OFF)
  reset role;
  update public.app_settings set value = 'false' where key = 'demo_clock_allowed';

  -- P9
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.purge_expired_reports(now() + interval '200 days') into n;
    reset role;
    if n = 0 and exists (select 1 from public.game_reports where body = 'edge game report') then report := array_append(report, ('PASS  P9  with the demo clock off, a pretend time is ignored (nothing is deleted early)')::text); else report := array_append(report, ('FAIL  P9  a pretend time deleted reports with the demo clock off')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P9  a pretend time deleted reports with the demo clock off: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: switch the demo clock ON)
  reset role;
  update public.app_settings set value = 'true' where key = 'demo_clock_allowed';

  -- P10
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.purge_expired_reports(now() + interval '200 days') into n;
    reset role;
    if n >= 1 and not exists (select 1 from public.game_reports where body = 'edge game report') and exists (select 1 from public.outside_reports where body = 'no-end-date outside report') then report := array_append(report, ('PASS  P10  with the demo clock on, 200 days from now the 300-day-old season has passed its year: that one report goes, and the no-end-date one still stays')::text); else report := array_append(report, ('FAIL  P10  the pretend time was not used correctly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P10  the pretend time was not used correctly: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nREPORTS CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
