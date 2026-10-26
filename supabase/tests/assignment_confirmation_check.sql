-- RWCLL check: confirming and declining assignments, the history, the queued
-- messages, and the "still unconfirmed" warning.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261026180000_add_assignment_confirmation.sql.
--
-- It builds its own tiny league, games, umpires and sign-in accounts, then
-- acts as a super admin, as umpires, as an account with no umpire record, and
-- as a signed-out visitor. It ENDS WITH A RED ERROR on purpose: the report is
-- carried in the error message, and raising an error guarantees that
-- everything it created (including every queued message) is rolled back. Your
-- real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  e_a text; e_b text; e_c text; e_x text;
  l1 uuid; s1 uuid; d1 uuid; t1 uuid; t2 uuid; loc uuid;
  g_near uuid; g_soon uuid; g_far uuid; g_past uuid; g_canc uuid;
  um_a uuid; um_b uuid; um_c uuid; um_d uuid;
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

  e_a := 'chk-' || stamp || '-a@example.org';
  e_b := 'chk-' || stamp || '-b@example.org';
  e_c := 'chk-' || stamp || '-c@example.org';
  e_x := 'chk-' || stamp || '-x@example.org';

  -- Three sign-in accounts (made as the database owner, the way the registration check does).
  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (a_acct, e_a, now(), '{}'::jsonb),
      (b_acct, e_b, now(), '{}'::jsonb),
      (x_acct, e_x, now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (a_acct, b_acct, x_acct);

  -- A tiny league: one division, five games (soon, very soon, far off, yesterday, canceled).
  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.divisions (league_id, name) values (l1, 'D1') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into t1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into t2;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;

  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, now() + interval '3 days', now() + interval '3 days 2 hours') returning id into g_near;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, now() + interval '2 days', now() + interval '2 days 2 hours') returning id into g_soon;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, now() + interval '20 days', now() + interval '20 days 2 hours') returning id into g_far;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at)
    values (s1, d1, t1, t2, loc, now() - interval '1 day', now() - interval '22 hours') returning id into g_past;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status)
    values (s1, d1, t1, t2, loc, now() + interval '2 days', now() + interval '2 days 2 hours', 'canceled') returning id into g_canc;

  -- Four umpires: A and B have sign-in accounts, C has only an email on the record, D has no email at all.
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Conf A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Conf B ' || stamp, 'adult', b_acct) returning id into um_b;
  insert into public.umpires (display_name, classification) values ('CHK Conf C ' || stamp, 'adult') returning id into um_c;
  insert into public.umpires (display_name, classification) values ('CHK Conf D ' || stamp, 'adult') returning id into um_d;
  insert into public.umpire_private_details (umpire_id, email) values (um_c, e_c)
    on conflict (umpire_id) do update set email = excluded.email;

  -- Older assignments on the past and canceled games (made as the owner, as if made earlier).
  insert into public.game_assignments (game_id, umpire_id, position) values (g_past, um_b, 'plate');
  insert into public.game_assignments (game_id, umpire_id, position) values (g_canc, um_a, 'plate');

  ----------------------------------------------------------------
  -- The setting
  ----------------------------------------------------------------
  select unconfirmed_warning_days into n from public.leagues where id = l1;
  if n = 7 then report := array_append(report, ('PASS  L1  a league warns about unconfirmed assignments 7 days ahead by default')::text); else report := array_append(report, ('FAIL  L1  the default is not 7')::text); failures := failures + 1; end if;

  begin
    update public.leagues set unconfirmed_warning_days = 61 where id = l1;
    report := array_append(report, ('FAIL  L2  61 days was accepted')::text); failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then report := array_append(report, ('PASS  L2  more than 60 days is refused')::text); else report := array_append(report, ('FAIL  L2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  begin
    update public.leagues set unconfirmed_warning_days = -1 where id = l1;
    report := array_append(report, ('FAIL  L3  -1 days was accepted')::text); failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then report := array_append(report, ('PASS  L3  a negative number of days is refused')::text); else report := array_append(report, ('FAIL  L3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  begin
    update public.leagues set unconfirmed_warning_days = 0 where id = l1;
    update public.leagues set unconfirmed_warning_days = 60 where id = l1;
    update public.leagues set unconfirmed_warning_days = 7 where id = l1;
    report := array_append(report, ('PASS  L4  0 (off) and 60 are both accepted')::text);
  exception when others then
    report := array_append(report, ('FAIL  L4  a valid number of days was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- An administrator assigns umpires
  ----------------------------------------------------------------
  -- C1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_near, jsonb_build_object('plate', um_a, 'field', um_b));
    reset role;
    if (select count(*) from public.game_assignments where game_id = g_near and status = 'assigned' and self_assigned = false and confirmed_at is null) = 2 then report := array_append(report, ('PASS  C1  newly assigned umpires start as Assigned, not confirmed')::text); else report := array_append(report, ('FAIL  C1  the new assignments are not plain Assigned')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C1  the new assignments are not plain Assigned: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C2
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.game_assignment_events where game_id = g_near and event = 'assigned' and actor_id = t_admin) = 2 then report := array_append(report, ('PASS  C2  the history records both assignments and who made them')::text); else report := array_append(report, ('FAIL  C2  the history is missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C2  the history is missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C3
  begin
    reset role;
    null;
    reset role;
    if exists (select 1 from public.email_outbox where to_email = e_a and kind = 'assignment' and body like '%plate umpire for%' and body like '%confirm or decline%') and exists (select 1 from public.email_outbox where to_email = e_b and kind = 'assignment' and body like '%field umpire for%') then report := array_append(report, ('PASS  C3  each assigned umpire has a message queued at their account email, naming their place')::text); else report := array_append(report, ('FAIL  C3  an assignment message is missing or wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C3  an assignment message is missing or wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_far, jsonb_build_object('plate', um_c, 'field', um_d));
    reset role;
    if exists (select 1 from public.email_outbox where to_email = e_c and kind = 'assignment') and (select count(*) from public.game_assignments where game_id = g_far) = 2 then report := array_append(report, ('PASS  C4  an umpire with only an email on their record is messaged there, and one with no email at all is still assigned (no message, no error)')::text); else report := array_append(report, ('FAIL  C4  assigning without a linked account or an email failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C4  assigning without a linked account or an email failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- An umpire confirms
  ----------------------------------------------------------------
  -- C5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.confirm_assignment(g_near);
    reset role;
    if (select status from public.game_assignments where game_id = g_near and umpire_id = um_a) = 'confirmed' and (select confirmed_at from public.game_assignments where game_id = g_near and umpire_id = um_a) is not null and exists (select 1 from public.game_assignment_events where game_id = g_near and umpire_id = um_a and event = 'confirmed' and actor_id = a_acct) then report := array_append(report, ('PASS  C5  an umpire can confirm their own assignment (time and history recorded)')::text); else report := array_append(report, ('FAIL  C5  the confirmation was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C5  the confirmation was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.confirm_assignment(g_near);
    reset role;
    if (select count(*) from public.game_assignment_events where game_id = g_near and umpire_id = um_a and event = 'confirmed') = 1 then report := array_append(report, ('PASS  C6  confirming twice is harmless and is recorded once')::text); else report := array_append(report, ('FAIL  C6  confirming twice added a second record')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C6  confirming twice added a second record: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C7
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.confirm_assignment(g_far);
    reset role;
    report := array_append(report, ('FAIL  C7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not assigned%' then report := array_append(report, ('PASS  C7  an umpire cannot confirm a game they are not assigned to')::text); else report := array_append(report, ('FAIL  C7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.confirm_assignment(g_near);
    reset role;
    report := array_append(report, ('FAIL  C8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%linked to an umpire record%' then report := array_append(report, ('PASS  C8  an account with no umpire record cannot confirm')::text); else report := array_append(report, ('FAIL  C8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C9
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decline_assignment(g_near, 'no');
    reset role;
    report := array_append(report, ('FAIL  C9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%linked to an umpire record%' then report := array_append(report, ('PASS  C9  an account with no umpire record cannot decline')::text); else report := array_append(report, ('FAIL  C9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C10
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.confirm_assignment(g_canc);
    reset role;
    report := array_append(report, ('FAIL  C10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%canceled%' then report := array_append(report, ('PASS  C10  a canceled game cannot be confirmed')::text); else report := array_append(report, ('FAIL  C10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C11
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin update public.game_assignments set status = 'confirmed' where umpire_id = um_a and game_id = g_canc; exception when others then null; end; begin delete from public.game_assignments where umpire_id = um_a and game_id = g_canc; exception when others then null; end;
    reset role;
    if (select status from public.game_assignments where umpire_id = um_a and game_id = g_canc) = 'assigned' then report := array_append(report, ('PASS  C11  an umpire cannot confirm or remove an assignment by editing it directly (only through the confirm and decline steps)')::text); else report := array_append(report, ('FAIL  C11  an umpire changed an assignment directly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C11  an umpire changed an assignment directly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Changing the umpires keeps confirmations
  ----------------------------------------------------------------
  -- C12
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_near, jsonb_build_object('plate', um_a, 'field', um_b, 'first_base', um_c));
    reset role;
    if (select status from public.game_assignments where game_id = g_near and umpire_id = um_a) = 'confirmed' and (select status from public.game_assignments where game_id = g_near and umpire_id = um_b) = 'assigned' and (select status from public.game_assignments where game_id = g_near and umpire_id = um_c) = 'assigned' then report := array_append(report, ('PASS  C12  adding someone keeps the existing umpires'' status (A stays confirmed), and the newcomer starts as Assigned')::text); else report := array_append(report, ('FAIL  C12  a status was lost or wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C12  a status was lost or wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C13
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_near, jsonb_build_object('plate', um_b, 'field', um_a));
    reset role;
    if (select status from public.game_assignments where game_id = g_near and umpire_id = um_a and position = 'field') = 'confirmed' and (select status from public.game_assignments where game_id = g_near and umpire_id = um_b and position = 'plate') = 'assigned' and not exists (select 1 from public.game_assignments where game_id = g_near and umpire_id = um_c) then report := array_append(report, ('PASS  C13  moving umpires between places keeps each one''s status, and an umpire taken off the game is removed')::text); else report := array_append(report, ('FAIL  C13  moving changed a status')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C13  moving changed a status: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C14
  begin
    reset role;
    null;
    reset role;
    if exists (select 1 from public.game_assignment_events where game_id = g_near and umpire_id = um_c and event = 'removed') and exists (select 1 from public.email_outbox where to_email = e_c and kind = 'schedule_change' and body like '%taken off%') then report := array_append(report, ('PASS  C14  an umpire taken off a game is recorded and told')::text); else report := array_append(report, ('FAIL  C14  the removal was not recorded or told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C14  the removal was not recorded or told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C15
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_confirm_assignment(g_near, um_b);
    reset role;
    if (select status from public.game_assignments where game_id = g_near and umpire_id = um_b) = 'confirmed' and exists (select 1 from public.game_assignment_events where game_id = g_near and umpire_id = um_b and event = 'confirmed' and actor_id = t_admin and note like '%administrator%') then report := array_append(report, ('PASS  C15  an administrator can record a confirmation that came another way (marked as such in the history)')::text); else report := array_append(report, ('FAIL  C15  the administrator''s confirmation was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C15  the administrator''s confirmation was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C16
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.admin_confirm_assignment(g_near, um_b);
    reset role;
    report := array_append(report, ('FAIL  C16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  C16  an ordinary account cannot confirm on an umpire''s behalf')::text); else report := array_append(report, ('FAIL  C16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- The warning about unconfirmed assignments
  ----------------------------------------------------------------
  -- W1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_soon, jsonb_build_object('plate', um_d)); perform public.queue_unconfirmed_warnings();
    reset role;
    if (select unconfirmed_warned_at from public.game_assignments where game_id = g_soon and umpire_id = um_d) is not null and (select unconfirmed_warned_at from public.game_assignments where game_id = g_far and umpire_id = um_c) is null and (select unconfirmed_warned_at from public.game_assignments where game_id = g_near and umpire_id = um_a) is null then report := array_append(report, ('PASS  W1  an unconfirmed assignment 2 days away is warned about; one 20 days away, and a confirmed one, are not')::text); else report := array_append(report, ('FAIL  W1  the wrong assignments were warned about')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W1  the wrong assignments were warned about: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W2
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = t_admin and kind = 'reminder' and body like '%CHK Conf D ' || stamp || '%') = 1 then report := array_append(report, ('PASS  W2  the administrators get a queued reminder naming the umpire and the game')::text); else report := array_append(report, ('FAIL  W2  the reminder is missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W2  the reminder is missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_unconfirmed_warnings();
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = t_admin and kind = 'reminder' and body like '%CHK Conf D ' || stamp || '%') = 1 then report := array_append(report, ('PASS  W3  asking again does not queue the same warning twice')::text); else report := array_append(report, ('FAIL  W3  the same warning was queued again')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W3  the same warning was queued again: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.leagues set unconfirmed_warning_days = 0 where id = l1;

  -- W5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_game_umpires(g_soon, jsonb_build_object('plate', um_d, 'field', um_c)); perform public.queue_unconfirmed_warnings();
    reset role;
    if (select unconfirmed_warned_at from public.game_assignments where game_id = g_soon and umpire_id = um_c) is null then report := array_append(report, ('PASS  W5  with the setting at 0 days, nothing is warned about')::text); else report := array_append(report, ('FAIL  W5  a warning was queued although the setting is off')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W5  a warning was queued although the setting is off: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.leagues set unconfirmed_warning_days = 30 where id = l1;

  -- W7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_unconfirmed_warnings();
    reset role;
    if (select unconfirmed_warned_at from public.game_assignments where game_id = g_far and umpire_id = um_c) is not null and (select unconfirmed_warned_at from public.game_assignments where game_id = g_soon and umpire_id = um_c) is not null then report := array_append(report, ('PASS  W7  raising the setting to 30 days brings the game 20 days away into the warning')::text); else report := array_append(report, ('FAIL  W7  the adjusted number of days was not used')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W7  the adjusted number of days was not used: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W8
  begin
    reset role;
    null;
    reset role;
    if (select unconfirmed_warned_at from public.game_assignments where game_id = g_canc and umpire_id = um_a) is null and (select unconfirmed_warned_at from public.game_assignments where game_id = g_past and umpire_id = um_b) is null then report := array_append(report, ('PASS  W8  a canceled game and a game in the past are never warned about')::text); else report := array_append(report, ('FAIL  W8  a canceled or past game was warned about')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  W8  a canceled or past game was warned about: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W9
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_unconfirmed_warnings();
    reset role;
    report := array_append(report, ('FAIL  W9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  W9  an ordinary account cannot queue the warnings')::text); else report := array_append(report, ('FAIL  W9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W10
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.queue_unconfirmed_warnings();
    reset role;
    report := array_append(report, ('FAIL  W10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W10  a signed-out visitor cannot queue the warnings')::text); else report := array_append(report, ('FAIL  W10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- An umpire declines
  ----------------------------------------------------------------
  -- D1
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decline_assignment(g_near, '  Family trip  ');
    reset role;
    if not exists (select 1 from public.game_assignments where game_id = g_near and umpire_id = um_b) and exists (select 1 from public.game_assignment_events where game_id = g_near and umpire_id = um_b and event = 'declined' and note = 'Family trip' and actor_id = b_acct) then report := array_append(report, ('PASS  D1  an umpire can decline: the place becomes open and the reason (tidied up) is recorded')::text); else report := array_append(report, ('FAIL  D1  the decline was not carried out or recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D1  the decline was not carried out or recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D2
  begin
    reset role;
    null;
    reset role;
    if exists (select 1 from public.email_outbox where to_profile_id = t_admin and kind = 'schedule_change' and subject like 'Umpire declined%' and body like '%CHK Conf B ' || stamp || '%' and body like '%Family trip%' and body like '%plate place%') then report := array_append(report, ('PASS  D2  the administrators get a queued message with the umpire, the place, the game and the reason')::text); else report := array_append(report, ('FAIL  D2  the decline message is missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D2  the decline message is missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decline_assignment(g_near);
    reset role;
    if not exists (select 1 from public.game_assignments where game_id = g_near and umpire_id = um_a) and exists (select 1 from public.game_assignment_events where game_id = g_near and umpire_id = um_a and event = 'declined' and note is null) then report := array_append(report, ('PASS  D3  an umpire who already confirmed can still decline, and no reason is needed')::text); else report := array_append(report, ('FAIL  D3  a confirmed assignment could not be declined')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D3  a confirmed assignment could not be declined: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D4
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decline_assignment(g_past, 'late');
    reset role;
    report := array_append(report, ('FAIL  D4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already started%' then report := array_append(report, ('PASS  D4  an umpire cannot decline a game that has already started')::text); else report := array_append(report, ('FAIL  D4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decline_assignment(g_canc);
    reset role;
    report := array_append(report, ('FAIL  D5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%canceled%' then report := array_append(report, ('PASS  D5  a canceled game cannot be declined')::text); else report := array_append(report, ('FAIL  D5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D6
  begin
    perform set_config('request.jwt.claim.sub', b_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', b_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.decline_assignment(g_near);
    reset role;
    report := array_append(report, ('FAIL  D6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not assigned%' then report := array_append(report, ('PASS  D6  declining a game you are no longer on is refused')::text); else report := array_append(report, ('FAIL  D6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- D7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.decline_assignment(g_near);
    reset role;
    report := array_append(report, ('FAIL  D7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  D7  a signed-out visitor cannot decline')::text); else report := array_append(report, ('FAIL  D7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- The history can be read by administrators only, and written by no-one directly
  ----------------------------------------------------------------
  -- E1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n2 from public.game_assignment_events where game_id = g_near;
    reset role;
    if n2 >= 5 then report := array_append(report, ('PASS  E1  an administrator can read the history')::text); else report := array_append(report, ('FAIL  E1  the administrator could not read the history')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E1  the administrator could not read the history: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n2 from public.game_assignment_events where game_id = g_near;
    reset role;
    if n2 = 0 then report := array_append(report, ('PASS  E2  an ordinary account sees none of the history')::text); else report := array_append(report, ('FAIL  E2  an ordinary account could read the history')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E2  an ordinary account could read the history: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignment_events (game_id, umpire_id, position, event) values (g_near, um_a, 'plate', 'assigned');
    reset role;
    report := array_append(report, ('FAIL  E3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  E3  nobody can write the history directly, not even an administrator')::text); else report := array_append(report, ('FAIL  E3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nASSIGNMENT CONFIRMATION CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
