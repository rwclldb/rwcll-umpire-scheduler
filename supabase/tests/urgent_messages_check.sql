-- RWCLL check: urgent messages (priority, texts that follow urgent emails, the urgent-first sender).
--
-- Run in the Supabase SQL Editor AFTER applying 20261112100000_add_urgent_messages.sql.
--
-- It builds its own accounts, umpires and games, then acts as them. It ENDS WITH A RED ERROR on purpose:
-- the report is carried in the error message, and raising an error guarantees everything it created
-- (and every message it queued, and every setting it changed) is rolled back. Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid(); p_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; loc uuid; d1 uuid; tm1 uuid; tm2 uuid;
  um_a uuid; um_b uuid; um_y uuid;
  g_soon uuid; g_far uuid; g_decl uuid; g_decl_far uuid;
  v_id uuid; n bigint;
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
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (b_acct, 'chk-' || stamp || '-b@example.org', now(), '{}'::jsonb),
      (p_acct, 'chk-' || stamp || '-p@example.org', now(), '{"signup_kind":"parent_guardian"}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (a_acct, b_acct, p_acct);
  insert into public.user_roles (user_id, role_id) values (p_acct, 'parent_guardian');

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into tm2;

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Ump A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Ump B ' || stamp, 'adult', b_acct) returning id into um_b;
  insert into public.umpires (display_name, classification) values ('CHK Youth ' || stamp, 'youth') returning id into um_y;
  insert into public.family_links (parent_id, umpire_id, relationship, created_by_name) values (p_acct, um_y, 'mother', 'x');

  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status) values (s1, d1, tm1, tm2, loc, now() + interval '30 minutes', now() + interval '150 minutes', 'scheduled') returning id into g_soon;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status) values (s1, d1, tm1, tm2, loc, now() + interval '2 days', now() + interval '2 days 2 hours', 'scheduled') returning id into g_far;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status) values (s1, d1, tm1, tm2, loc, now() + interval '30 minutes', now() + interval '150 minutes', 'scheduled') returning id into g_decl;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status) values (s1, d1, tm1, tm2, loc, now() + interval '2 days', now() + interval '2 days 2 hours', 'scheduled') returning id into g_decl_far;
  insert into public.game_assignments (game_id, umpire_id, position) values (g_decl, um_a, 'plate'), (g_decl_far, um_a, 'plate');

  -- set aside messages that were already waiting (they are put back when this check rolls back),
  -- and clear the "this change is urgent" note that building the games above left behind
  update public.email_outbox set status = 'skipped' where status = 'queued';
  update public.sms_outbox set status = 'skipped' where status = 'queued';
  update public.sending_settings set value = 'safe' where key = 'sms_mode';
  update public.sending_settings set value = '120' where key = 'urgent_window_minutes';
  update public.sending_settings set value = 'off' where key = 'urgent_test_mode';
  perform set_config('rwcll.urgent', 'off', true);

  ----------------------------------------------------------------
  -- 1. A message queued during an urgent change is marked priority
  ----------------------------------------------------------------

  -- U1
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK plain ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true);
    reset role;
    if exists (select 1 from public.email_outbox where subject = 'CHK plain ' || stamp and not priority) then report := array_append(report, ('PASS  U1  an ordinary message is not priority')::text); else report := array_append(report, ('FAIL  U1  an ordinary message was marked priority')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U1  an ordinary message was marked priority: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U2
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'on', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK urgent ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true);
    reset role;
    if exists (select 1 from public.email_outbox where subject = 'CHK urgent ' || stamp and priority) then report := array_append(report, ('PASS  U2  a message queued while a change is urgent IS priority')::text); else report := array_append(report, ('FAIL  U2  an urgent message was not marked priority')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U2  an urgent message was not marked priority: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U3
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK after ' || stamp, 'body');
    reset role;
    if exists (select 1 from public.email_outbox where subject = 'CHK after ' || stamp and not priority) then report := array_append(report, ('PASS  U3  ...and the next message, after the note is cleared, is ordinary again')::text); else report := array_append(report, ('FAIL  U3  the urgent note carried over to an unrelated message')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U3  the urgent note carried over to an unrelated message: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 2. Which games count as urgent
  ----------------------------------------------------------------

  -- U4
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if public.game_is_urgent(now() + interval '30 minutes', now() + interval '150 minutes') and public.game_is_urgent(now() - interval '30 minutes', now() + interval '60 minutes') and not public.game_is_urgent(now() + interval '3 hours', now() + interval '5 hours') and not public.game_is_urgent(now() - interval '3 hours', now() - interval '1 hour') then report := array_append(report, ('PASS  U4  a game starting in 30 minutes, or one in progress, is urgent; one in 3 hours, or one already over, is not')::text); else report := array_append(report, ('FAIL  U4  the urgent window is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U4  the urgent window is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U5
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    update public.sending_settings set value = '300' where key = 'urgent_window_minutes';
    reset role;
    if public.game_is_urgent(now() + interval '4 hours', now() + interval '6 hours') then report := array_append(report, ('PASS  U5  the window can be changed (300 minutes makes a game in 4 hours urgent)')::text); else report := array_append(report, ('FAIL  U5  changing the window had no effect')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U5  changing the window had no effect: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U6
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    update public.sending_settings set value = 'abc' where key = 'urgent_window_minutes';
    reset role;
    if public.game_is_urgent(now() + interval '30 minutes', now() + interval '150 minutes') and not public.game_is_urgent(now() + interval '3 hours', now() + interval '5 hours') then report := array_append(report, ('PASS  U6  a nonsense window falls back to two hours')::text); else report := array_append(report, ('FAIL  U6  a nonsense window broke the rule')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U6  a nonsense window broke the rule: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U7
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    update public.sending_settings set value = '120' where key = 'urgent_window_minutes'; update public.sending_settings set value = 'on' where key = 'urgent_test_mode';
    reset role;
    if public.game_is_urgent(now() + interval '2 days', now() + interval '2 days 2 hours') then report := array_append(report, ('PASS  U7  test mode makes any game urgent, whatever the time (for testing)')::text); else report := array_append(report, ('FAIL  U7  test mode did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U7  test mode did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U8
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    update public.sending_settings set value = 'off' where key = 'urgent_test_mode';
    reset role;
    if not public.game_is_urgent(now() + interval '2 days', now() + interval '2 days 2 hours') then report := array_append(report, ('PASS  U8  ...and turning it off puts it back')::text); else report := array_append(report, ('FAIL  U8  test mode stayed on')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U8  test mode stayed on: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 3. Changes to a game that is soon are noticed; others are not
  ----------------------------------------------------------------

  -- U9
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); update public.games set status = 'canceled' where id = g_soon;
    reset role;
    if current_setting('rwcll.urgent', true) = 'on' then report := array_append(report, ('PASS  U9  canceling a game that starts soon is noticed as urgent')::text); else report := array_append(report, ('FAIL  U9  canceling a game that starts soon was not noticed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U9  canceling a game that starts soon was not noticed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U10
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); update public.games set status = 'canceled' where id = g_far;
    reset role;
    if coalesce(current_setting('rwcll.urgent', true), '') <> 'on' then report := array_append(report, ('PASS  U10  canceling a game two days away is NOT urgent')::text); else report := array_append(report, ('FAIL  U10  a game two days away was treated as urgent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U10  a game two days away was treated as urgent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U11
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); update public.games set status = 'scheduled' where id = g_far; update public.games set notes = 'CHK note' where id = g_soon;
    reset role;
    if coalesce(current_setting('rwcll.urgent', true), '') <> 'on' then report := array_append(report, ('PASS  U11  a change that umpires do not need to hear about (a note) is NOT urgent, even for a game that is soon')::text); else report := array_append(report, ('FAIL  U11  a note on a game was treated as urgent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U11  a note on a game was treated as urgent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U12
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); update public.games set status = 'scheduled' where id = g_soon;
    reset role;
    if current_setting('rwcll.urgent', true) = 'on' then report := array_append(report, ('PASS  U12  putting a game back on (a reopened field) is urgent too')::text); else report := array_append(report, ('FAIL  U12  putting a game back was not noticed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U12  putting a game back was not noticed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U13
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); insert into public.game_assignments (game_id, umpire_id, position) values (g_soon, um_b, 'plate');
    reset role;
    if current_setting('rwcll.urgent', true) = 'on' then report := array_append(report, ('PASS  U13  adding an umpire to a game that starts soon is urgent')::text); else report := array_append(report, ('FAIL  U13  adding an umpire to a game soon was not noticed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U13  adding an umpire to a game soon was not noticed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U14
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); update public.game_assignments set status = 'confirmed', confirmed_at = now() where game_id = g_soon and umpire_id = um_b;
    reset role;
    if coalesce(current_setting('rwcll.urgent', true), '') <> 'on' then report := array_append(report, ('PASS  U14  an umpire CONFIRMING a game is not urgent (nobody needs to be told)')::text); else report := array_append(report, ('FAIL  U14  confirming was treated as urgent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U14  confirming was treated as urgent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U15
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); delete from public.game_assignments where game_id = g_soon and umpire_id = um_b;
    reset role;
    if current_setting('rwcll.urgent', true) = 'on' then report := array_append(report, ('PASS  U15  taking an umpire off a game that starts soon is urgent')::text); else report := array_append(report, ('FAIL  U15  removing an umpire from a game soon was not noticed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U15  removing an umpire from a game soon was not noticed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U16
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); insert into public.game_assignments (game_id, umpire_id, position) values (g_far, um_b, 'plate');
    reset role;
    if coalesce(current_setting('rwcll.urgent', true), '') <> 'on' then report := array_append(report, ('PASS  U16  adding an umpire to a game two days away is NOT urgent')::text); else report := array_append(report, ('FAIL  U16  a game two days away was treated as urgent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U16  a game two days away was treated as urgent: ' || sqlerrm)::text); failures := failures + 1;
  end;
  perform set_config('rwcll.urgent', 'off', true);

  ----------------------------------------------------------------
  -- 4. A real decline: urgent when the game is soon, ordinary when it is not
  ----------------------------------------------------------------

  -- U17a
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform set_config('rwcll.urgent', 'off', true); perform public.decline_assignment(g_decl, 'CHK');
    reset role;
    if true then report := array_append(report, ('PASS  U17a  (setup: umpire A declines the game that starts in 30 minutes)')::text); else report := array_append(report, ('FAIL  U17a  the decline itself failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U17a  the decline itself failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U17i
  begin
    report := array_append(report, ('INFO  U17i  ' || ('decline notices queued: ' || (select count(*) from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp) || ', of them priority: ' || (select count(*) from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp and priority) || ', urgent note now: ' || coalesce(current_setting('rwcll.urgent', true), '(none)') || ', the game status: ' || (select status from public.games where id = g_decl)))::text);
  exception when others then
    report := array_append(report, ('INFO  U17i  (could not count: ' || sqlerrm || ')')::text);
  end;

  -- U17
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if exists (select 1 from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp) and not exists (select 1 from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp and not priority) then report := array_append(report, ('PASS  U17  an umpire declining a game that starts in 30 minutes: every notice about it is priority')::text); else report := array_append(report, ('FAIL  U17  a decline of a game soon was not all priority (see the INFO line above for the counts)')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U17  a decline of a game soon was not all priority (see the INFO line above for the counts): ' || sqlerrm)::text); failures := failures + 1;
  end;
  perform set_config('rwcll.urgent', 'off', true);
  delete from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp;

  -- U18a
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform set_config('rwcll.urgent', 'off', true); perform public.decline_assignment(g_decl_far, 'CHK');
    reset role;
    if true then report := array_append(report, ('PASS  U18a  (setup: umpire A declines the game two days away)')::text); else report := array_append(report, ('FAIL  U18a  the decline itself failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U18a  the decline itself failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U18i
  begin
    report := array_append(report, ('INFO  U18i  ' || ('decline notices queued: ' || (select count(*) from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp) || ', of them priority: ' || (select count(*) from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp and priority)))::text);
  exception when others then
    report := array_append(report, ('INFO  U18i  (could not count: ' || sqlerrm || ')')::text);
  end;

  -- U18
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if exists (select 1 from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp) and not exists (select 1 from public.email_outbox where subject = 'Umpire declined: CHK Ump A ' || stamp and priority) then report := array_append(report, ('PASS  U18  declining a game two days away: the notices are ordinary')::text); else report := array_append(report, ('FAIL  U18  a decline two days away was marked priority (or no notice was queued: see the INFO line above)')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U18  a decline two days away was marked priority (or no notice was queued: see the INFO line above): ' || sqlerrm)::text); failures := failures + 1;
  end;
  perform set_config('rwcll.urgent', 'off', true);

  ----------------------------------------------------------------
  -- 5. An urgent email is also a text, for people who agreed (and only while texts are not off)
  ----------------------------------------------------------------

  -- U19
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.account_contact (profile_id, phone, sms_opt_in) values (a_acct, '650-555-0101', true) on conflict (profile_id) do update set phone = excluded.phone, sms_opt_in = excluded.sms_opt_in;
    reset role;
    if true then report := array_append(report, ('PASS  U19  (setup: umpire A agrees to texts, on their own account)')::text); else report := array_append(report, ('FAIL  U19  the account could not agree to texts')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U19  the account could not agree to texts: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U20
  begin
    perform set_config('request.jwt.claim.sub', p_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', p_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.account_contact (profile_id, phone, sms_opt_in) values (p_acct, '650-555-0102', true) on conflict (profile_id) do update set phone = excluded.phone, sms_opt_in = excluded.sms_opt_in;
    reset role;
    if true then report := array_append(report, ('PASS  U20  (setup: the parent agrees to texts, on their own account)')::text); else report := array_append(report, ('FAIL  U20  the parent''s account could not agree to texts')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U20  the parent''s account could not agree to texts: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U21
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'on', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-a@example.org', a_acct, 'CHK canceled ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true);
    reset role;
    if exists (select 1 from public.sms_outbox where to_profile_id = a_acct and priority and kind = 'schedule_change' and to_phone = '+16505550101' and body = 'RWCLL umpires: CHK canceled ' || stamp) then report := array_append(report, ('PASS  U21  an urgent email to someone who agreed to texts is also a priority text, with the subject as its words')::text); else report := array_append(report, ('FAIL  U21  no text followed the urgent email')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U21  no text followed the urgent email: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U22
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if not exists (select 1 from public.sms_outbox where to_profile_id = b_acct) then report := array_append(report, ('PASS  U22  someone who did NOT agree to texts gets none (umpire B got urgent emails above)')::text); else report := array_append(report, ('FAIL  U22  a text went to someone who did not agree')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U22  a text went to someone who did not agree: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U23
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-a@example.org', a_acct, 'CHK calm ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true);
    reset role;
    if not exists (select 1 from public.sms_outbox where body like '%CHK calm%') then report := array_append(report, ('PASS  U23  an ordinary email does not become a text')::text); else report := array_append(report, ('FAIL  U23  an ordinary email became a text')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U23  an ordinary email became a text: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U24
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    update public.sending_settings set value = 'off' where key = 'sms_mode'; perform set_config('rwcll.urgent', 'on', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-a@example.org', a_acct, 'CHK texts off ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true); update public.sending_settings set value = 'safe' where key = 'sms_mode';
    reset role;
    if exists (select 1 from public.email_outbox where subject = 'CHK texts off ' || stamp and priority) and not exists (select 1 from public.sms_outbox where body like '%CHK texts off%') then report := array_append(report, ('PASS  U24  TEXTS OFF: the urgent email is still queued (and priority), and no text is made')::text); else report := array_append(report, ('FAIL  U24  with texts off a text was still queued, or the email was lost')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U24  with texts off a text was still queued, or the email was lost: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U25
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'on', true); perform public.notice_umpire(um_y, 'schedule_change', 'Game canceled ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true);
    reset role;
    if exists (select 1 from public.email_outbox where to_email = 'chk-' || stamp || '-p@example.org' and priority and subject like 'Copy for CHK Youth%') and exists (select 1 from public.sms_outbox where to_profile_id = p_acct and priority and body like 'RWCLL umpires: Copy for CHK Youth%' and to_phone = '+16505550102') then report := array_append(report, ('PASS  U25  a youth umpire''s parent, who agreed to texts, gets the urgent ''Copy for ...'' email AND a text')::text); else report := array_append(report, ('FAIL  U25  the parent was not texted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U25  the parent was not texted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U26
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    null;
    reset role;
    if (select count(*) from public.sms_outbox where body like '%CHK Youth%') = 1 then report := array_append(report, ('PASS  U26  a youth umpire with no account of their own causes no text to anyone but the parent')::text); else report := array_append(report, ('FAIL  U26  an extra text was made for a youth umpire with no account')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U26  an extra text was made for a youth umpire with no account: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 6. The sender: urgent first, and an urgent-only job
  ----------------------------------------------------------------
  update public.email_outbox set status = 'skipped' where status = 'queued';
  update public.sms_outbox set status = 'skipped' where status = 'queued';

  -- U27
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK n1 ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true); perform set_config('rwcll.urgent', 'on', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK u1 ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true); select id into v_id from public.claim_outbox_batch(1);
    reset role;
    if (select subject from public.email_outbox where id = v_id) = 'CHK u1 ' || stamp then report := array_append(report, ('PASS  U27  the usual claim takes an urgent message BEFORE an older ordinary one')::text); else report := array_append(report, ('FAIL  U27  an ordinary message was taken before an urgent one')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U27  an ordinary message was taken before an urgent one: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U28
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'off', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK n2 ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true); perform set_config('rwcll.urgent', 'on', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK u2 ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true); select count(*) into n from public.claim_urgent_outbox_batch(10);
    reset role;
    if n = 1 and (select claimed_at is null from public.email_outbox where subject = 'CHK n2 ' || stamp) then report := array_append(report, ('PASS  U28  the urgent-only claim takes just the urgent message and leaves the ordinary one')::text); else report := array_append(report, ('FAIL  U28  the urgent-only claim took an ordinary message, or nothing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U28  the urgent-only claim took an ordinary message, or nothing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U29
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    perform set_config('rwcll.urgent', 'on', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-b@example.org', b_acct, 'CHK u3 ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true); select public.urgent_waiting_count() into n;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  U29  ''is anything urgent waiting?'' counts it (so the every-minute job can do nothing when the answer is 0)')::text); else report := array_append(report, ('FAIL  U29  the waiting count was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U29  the waiting count was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U30
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    select count(*) into n from public.claim_urgent_outbox_batch(10); select public.urgent_waiting_count() into n;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  U30  ...and after it is claimed, nothing urgent is waiting')::text); else report := array_append(report, ('FAIL  U30  the count did not go down')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U30  the count did not go down: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U31
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    insert into public.sms_outbox (to_phone, kind, body) values ('+16505550101', 'reminder', 'CHK sms plain ' || stamp); perform set_config('rwcll.urgent', 'on', true); perform public.queue_notice('schedule_change', 'chk-' || stamp || '-a@example.org', a_acct, 'CHK sms urgent ' || stamp, 'body'); perform set_config('rwcll.urgent', 'off', true); select count(*) into n from public.claim_urgent_sms_batch(10);
    reset role;
    if n = 1 and exists (select 1 from public.sms_outbox where body = 'CHK sms plain ' || stamp and claimed_at is null) then report := array_append(report, ('PASS  U31  text messages work the same way: the urgent-only claim takes only the urgent text')::text); else report := array_append(report, ('FAIL  U31  the urgent-only text claim took the wrong messages')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U31  the urgent-only text claim took the wrong messages: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U32
  begin
    reset role;
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    update public.sms_outbox set status = 'queued', claimed_at = null where body like '%CHK sms urgent%'; select id into v_id from public.claim_sms_batch(1);
    reset role;
    if (select body from public.sms_outbox where id = v_id) like '%CHK sms urgent%' then report := array_append(report, ('PASS  U32  the usual text claim also takes the urgent text first')::text); else report := array_append(report, ('FAIL  U32  an ordinary text was taken before an urgent one')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  U32  an ordinary text was taken before an urgent one: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- U33
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.claim_urgent_outbox_batch(1);
    reset role; report := array_append(report, ('FAIL  U33  it was allowed: an ordinary signed-in account cannot claim urgent messages (only the sender can)')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  U33  an ordinary signed-in account cannot claim urgent messages (only the sender can)')::text); else report := array_append(report, ('FAIL  U33  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U34
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.claim_urgent_sms_batch(1);
    reset role; report := array_append(report, ('FAIL  U34  it was allowed: ...nor texts')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  U34  ...nor texts')::text); else report := array_append(report, ('FAIL  U34  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U35
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.urgent_waiting_count();
    reset role; report := array_append(report, ('FAIL  U35  it was allowed: ...nor ask what is waiting')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  U35  ...nor ask what is waiting')::text); else report := array_append(report, ('FAIL  U35  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U36
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.game_is_urgent(now(), now());
    reset role; report := array_append(report, ('FAIL  U36  it was allowed: ...nor use the urgent test directly')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  U36  ...nor use the urgent test directly')::text); else report := array_append(report, ('FAIL  U36  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- U37
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.claim_urgent_outbox_batch(1);
    reset role; report := array_append(report, ('FAIL  U37  it was allowed: a signed-out visitor cannot either')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  U37  a signed-out visitor cannot either')::text); else report := array_append(report, ('FAIL  U37  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  raise exception E'\n\nURGENT MESSAGES CHECK (nothing was saved; your real data and settings are unchanged)\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
