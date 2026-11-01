-- RWCLL check: sending messages (the sender's database side, the safety settings,
-- the day-before reminders, and the text-message queue).
--
-- Run in the Supabase SQL Editor AFTER applying 20261106100000_add_email_sending.sql
-- (which needs the demo clock migration, 20261101100000, applied first).
--
-- The sender itself (the Edge Function) is not tested here: it uses the service
-- role, which cannot be imitated in a script like this. This script tests everything
-- the database does for it, as the database owner, plus that nobody signed in through
-- the app can use those functions.
--
-- NOTHING IS SENT. Messages waiting in your real outbox are set aside INSIDE this run
-- (so they cannot disturb the tests), and everything is rolled back at the end.
-- It ENDS WITH A RED ERROR on purpose: the report is carried in the error message,
-- and raising an error guarantees nothing is saved.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  s_acct uuid := gen_random_uuid(); a_acct uuid := gen_random_uuid(); b_acct uuid := gen_random_uuid();
  d_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  l1 uuid; s1 uuid; d1 uuid; tm1 uuid; tm2 uuid; loc uuid;
  um_a uuid; um_b uuid; um_c uuid; um_d uuid;
  g_in uuid; g_in2 uuid; g_link uuid; g_early uuid; g_late uuid; g_draft uuid; g_cancel uuid; g_past uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid; sm1 uuid; sm2 uuid;
  n bigint; n0 bigint; txt text;
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
      (s_acct, 'chk-' || stamp || '-s@example.org', now(), '{}'::jsonb),
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (b_acct, 'chk-' || stamp || '-b@example.org', now(), '{}'::jsonb),
      (d_acct, 'chk-' || stamp || '-d@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (s_acct, a_acct, b_acct, d_acct, x_acct);
  insert into public.user_roles (user_id, role_id) values (s_acct, 'scheduler');

  -- set aside whatever is really waiting, INSIDE this run, so it cannot disturb the tests
  update public.email_outbox set status = 'skipped', last_error = '(set aside by the check)' where status = 'queued';
  update public.sms_outbox set status = 'skipped', last_error = '(set aside by the check)' where status = 'queued';
  update public.game_assignments set reminded_at = now() where reminded_at is null;

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into tm2;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Snd A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Snd B ' || stamp, 'adult', b_acct) returning id into um_b;
  insert into public.umpires (display_name, classification) values ('CHK Snd C ' || stamp, 'adult') returning id into um_c;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Snd D ' || stamp, 'adult', d_acct) returning id into um_d;
  update public.profiles set email = 'chk-' || stamp || '-s@example.org' where id = s_acct;

  -- A and D agreed to text messages (the database only lets the account holder choose that)
  perform set_config('request.jwt.claim.sub', a_acct::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
  insert into public.account_contact (profile_id, phone, sms_opt_in) values (a_acct, '650-555-0101', true) on conflict (profile_id) do update set phone = excluded.phone, sms_opt_in = true;
  perform set_config('request.jwt.claim.sub', d_acct::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', d_acct, 'role', 'authenticated')::text, true);
  insert into public.account_contact (profile_id, phone, sms_opt_in) values (d_acct, '650-555-0104', true) on conflict (profile_id) do update set phone = excluded.phone, sms_opt_in = true;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  -- B has a phone but did NOT agree
  insert into public.account_contact (profile_id, phone, sms_opt_in) values (b_acct, '650-555-0102', false) on conflict (profile_id) do update set phone = excluded.phone, sms_opt_in = false;

  -- games for the reminders (a new game starts as a draft here, so say which are scheduled)
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '24 hours', now() + interval '26 hours') returning id into g_in;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '22 hours', now() + interval '24 hours') returning id into g_in2;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '25 hours', now() + interval '27 hours') returning id into g_link;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '10 hours', now() + interval '12 hours') returning id into g_early;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '40 hours', now() + interval '42 hours') returning id into g_late;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '24 hours', now() + interval '26 hours') returning id into g_draft;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() + interval '24 hours', now() + interval '26 hours') returning id into g_cancel;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, now() - interval '24 hours', now() - interval '22 hours') returning id into g_past;
  insert into public.game_assignments (game_id, umpire_id, position) values
    (g_in, um_a, 'plate'), (g_in, um_b, 'field'), (g_in2, um_d, 'plate'), (g_link, um_a, 'plate'),
    (g_early, um_c, 'plate'), (g_late, um_a, 'plate'), (g_draft, um_a, 'plate'), (g_cancel, um_a, 'plate'), (g_past, um_a, 'plate');
  update public.game_assignments set status = 'confirmed', confirmed_at = now() where game_id in (g_in, g_link) and umpire_id = um_a;
  update public.games set status = 'scheduled' where id in (g_in, g_in2, g_early, g_late, g_past);   -- (g_link stays a draft for now)
  update public.games set status = 'canceled' where id = g_cancel;

  ----------------------------------------------------------------
  -- 1. The sending settings
  ----------------------------------------------------------------
  -- S1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.sending_settings;
    reset role;
    if n >= 11 then report := array_append(report, ('PASS  S1  administrators can read the sending settings')::text); else report := array_append(report, ('FAIL  S1  an administrator could not read the settings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  an administrator could not read the settings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.sending_settings where key in ('email_mode', 'sms_mode', 'email_safe_allowlist');
    reset role;
    if n = 3 then report := array_append(report, ('PASS  S2  a scheduler can too')::text); else report := array_append(report, ('FAIL  S2  a scheduler could not read the settings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S2  a scheduler could not read the settings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.sending_settings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S3  an umpire cannot (the safe list holds other people''s addresses)')::text); else report := array_append(report, ('FAIL  S3  an umpire read the sending settings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S3  an umpire read the sending settings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.sending_settings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S4  nor can an ordinary account')::text); else report := array_append(report, ('FAIL  S4  an ordinary account read the settings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S4  an ordinary account read the settings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.sending_settings;
    reset role;
    report := array_append(report, ('FAIL  S5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S5  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  S5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.sending_settings set value = 'live' where key = 'email_mode';
    reset role;
    report := array_append(report, ('FAIL  S6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S6  nobody can change a setting from the app, not even a super admin (it takes the SQL Editor)')::text); else report := array_append(report, ('FAIL  S6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: the settings are changed here as the database owner, as you would in the SQL Editor)
  reset role;

  -- S7
  begin
    reset role;
    update public.sending_settings set value = 'safe' where key = 'email_mode'; update public.sending_settings set value = 'live' where key = 'sms_mode'; update public.sending_settings set value = 'off' where key = 'email_mode';
    reset role;
    if (select value from public.sending_settings where key = 'sms_mode') = 'live' then report := array_append(report, ('PASS  S7  the modes accept off, safe and live')::text); else report := array_append(report, ('FAIL  S7  a valid mode was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S7  a valid mode was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S8
  begin
    reset role;
    update public.sending_settings set value = 'maybe' where key = 'email_mode';
    reset role;
    report := array_append(report, ('FAIL  S8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S8  any other mode is refused')::text); else report := array_append(report, ('FAIL  S8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S9
  begin
    reset role;
    update public.sending_settings set value = '' where key = 'sms_mode';
    reset role;
    report := array_append(report, ('FAIL  S9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S9  an empty mode is refused')::text); else report := array_append(report, ('FAIL  S9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S10
  begin
    reset role;
    update public.sending_settings set value = '10000' where key = 'email_daily_limit'; update public.sending_settings set value = '400' where key = 'email_daily_limit';
    reset role;
    if true then report := array_append(report, ('PASS  S10  the daily limit accepts 1 to 10000')::text); else report := array_append(report, ('FAIL  S10  a valid limit was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S10  a valid limit was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S11
  begin
    reset role;
    update public.sending_settings set value = '0' where key = 'email_daily_limit';
    reset role;
    report := array_append(report, ('FAIL  S11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S11  a daily limit of 0 is refused (use the mode ''off'' to stop sending)')::text); else report := array_append(report, ('FAIL  S11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S12
  begin
    reset role;
    update public.sending_settings set value = 'lots' where key = 'email_max_age_hours';
    reset role;
    report := array_append(report, ('FAIL  S12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S12  a limit that is not a number is refused')::text); else report := array_append(report, ('FAIL  S12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S13
  begin
    reset role;
    update public.sending_settings set value = '10001' where key = 'sms_max_age_hours';
    reset role;
    report := array_append(report, ('FAIL  S13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S13  too large a number is refused')::text); else report := array_append(report, ('FAIL  S13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S14
  begin
    reset role;
    update public.sending_settings set value = 'https://example.org/app' where key = 'app_url'; update public.sending_settings set value = 'RWCLL Umpires' where key = 'email_from_name'; update public.sending_settings set value = '' where key = 'app_url';
    reset role;
    if (select value from public.sending_settings where key = 'app_url') = '' then report := array_append(report, ('PASS  S14  other settings take any text (the app address, the sender''s name, the safe list)')::text); else report := array_append(report, ('FAIL  S14  a text setting was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S14  a text setting was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 2. Only the sender can claim and finish messages
  ----------------------------------------------------------------
  -- (setup, not a test: three waiting messages, the oldest first)
  reset role;
  perform public.enqueue_email('other', 'chk-' || stamp || '-m1@example.org', 'Msg 1', 'Body 1');
  perform public.enqueue_email('other', 'chk-' || stamp || '-m2@example.org', 'Msg 2', 'Body 2');
  perform public.enqueue_email('other', 'chk-' || stamp || '-m3@example.org', 'Msg 3', 'Body 3');
  select id into m1 from public.email_outbox where to_email = 'chk-' || stamp || '-m1@example.org';
  select id into m2 from public.email_outbox where to_email = 'chk-' || stamp || '-m2@example.org';
  select id into m3 from public.email_outbox where to_email = 'chk-' || stamp || '-m3@example.org';
  update public.email_outbox set created_at = now() - interval '30 minutes' where id = m1;
  update public.email_outbox set created_at = now() - interval '20 minutes' where id = m2;
  update public.email_outbox set created_at = now() - interval '10 minutes' where id = m3;

  -- C1
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.claim_outbox_batch(5);
    reset role;
    report := array_append(report, ('FAIL  C1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C1  a scheduler cannot claim messages (only the sender can)')::text); else report := array_append(report, ('FAIL  C1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_outbox_message(m1, 'sent');
    reset role;
    report := array_append(report, ('FAIL  C2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C2  not even a super admin can mark a message sent that way')::text); else report := array_append(report, ('FAIL  C2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C3
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.claim_outbox_batch(5);
    reset role;
    report := array_append(report, ('FAIL  C3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C3  a signed-out visitor cannot claim messages')::text); else report := array_append(report, ('FAIL  C3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.outbox_sent_last_day();
    reset role;
    report := array_append(report, ('FAIL  C4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C4  an umpire cannot read the sending count')::text); else report := array_append(report, ('FAIL  C4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C5
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.claim_sms_batch(5);
    reset role;
    report := array_append(report, ('FAIL  C5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C5  nor claim text messages')::text); else report := array_append(report, ('FAIL  C5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C6
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_sms_message(gen_random_uuid(), 'sent');
    reset role;
    report := array_append(report, ('FAIL  C6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C6  nor finish them')::text); else report := array_append(report, ('FAIL  C6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 3. Claiming messages
  ----------------------------------------------------------------
  -- K1
  begin
    reset role;
    select count(*) into n from public.claim_outbox_batch(2);
    reset role;
    if n = 2 and (select attempts from public.email_outbox where id = m1) = 1 and (select attempts from public.email_outbox where id = m2) = 1 and (select claimed_at from public.email_outbox where id = m1) is not null and (select claimed_at from public.email_outbox where id = m3) is null then report := array_append(report, ('PASS  K1  claiming 2 takes the 2 oldest waiting messages, marks them claimed, and counts the attempt')::text); else report := array_append(report, ('FAIL  K1  the claim took the wrong messages')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K1  the claim took the wrong messages: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K2
  begin
    reset role;
    select count(*) into n from public.claim_outbox_batch(5) where id in (m1, m2, m3);
    reset role;
    if n = 1 and (select attempts from public.email_outbox where id = m3) = 1 then report := array_append(report, ('PASS  K2  a message already claimed is not given out again; the next claim gets only the one left')::text); else report := array_append(report, ('FAIL  K2  a claimed message was given out twice')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K2  a claimed message was given out twice: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K3
  begin
    reset role;
    select count(*) into n from public.claim_outbox_batch(5) where id in (m1, m2, m3);
    reset role;
    if n = 0 then report := array_append(report, ('PASS  K3  once all are claimed, nothing more comes out')::text); else report := array_append(report, ('FAIL  K3  a claimed message came out again')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K3  a claimed message came out again: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K4
  begin
    reset role;
    select count(*) into n from public.claim_outbox_batch(0);
    reset role;
    if n = 0 then report := array_append(report, ('PASS  K4  claiming 0 gives nothing')::text); else report := array_append(report, ('FAIL  K4  claiming 0 gave something')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K4  claiming 0 gave something: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the sender stopped before finishing: the claim on message 1 is 11 minutes old)
  reset role;
  update public.email_outbox set claimed_at = now() - interval '11 minutes' where id = m1;

  -- K5
  begin
    reset role;
    select count(*) into n from public.claim_outbox_batch(5) where id = m1;
    reset role;
    if n = 1 and (select attempts from public.email_outbox where id = m1) = 2 then report := array_append(report, ('PASS  K5  a claim that was never finished is released after 10 minutes, and the message is tried again')::text); else report := array_append(report, ('FAIL  K5  a stale claim was not released')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K5  a stale claim was not released: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: a message told to wait until later)
  reset role;
  perform public.enqueue_email('other', 'chk-' || stamp || '-m4@example.org', 'Msg 4', 'Body 4');
  select id into m4 from public.email_outbox where to_email = 'chk-' || stamp || '-m4@example.org';
  update public.email_outbox set next_attempt_at = now() + interval '1 hour' where id = m4;

  -- K6
  begin
    reset role;
    select count(*) into n from public.claim_outbox_batch(5) where id = m4;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  K6  a message told to wait until later is not claimed yet')::text); else report := array_append(report, ('FAIL  K6  a message was claimed too early')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K6  a message was claimed too early: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K7
  begin
    reset role;
    select count(*) into n from public.claim_outbox_batch(5, now() + interval '2 hours') where id = m4;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  K7  ...but is claimed once that time has passed')::text); else report := array_append(report, ('FAIL  K7  a message was not claimed after its wait')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K7  a message was not claimed after its wait: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K8
  begin
    reset role;
    perform public.release_outbox_claims(array[m3]);
    reset role;
    if (select claimed_at from public.email_outbox where id = m3) is null and (select attempts from public.email_outbox where id = m3) = 1 then report := array_append(report, ('PASS  K8  when the sender has to stop, it gives the rest back untouched: no longer claimed, and the try is not counted')::text); else report := array_append(report, ('FAIL  K8  a released message was still claimed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K8  a released message was still claimed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K9
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.release_outbox_claims(array[m3]);
    reset role;
    report := array_append(report, ('FAIL  K9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  K9  only the sender can release claims')::text); else report := array_append(report, ('FAIL  K9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K10
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.release_sms_claims(array[gen_random_uuid()]);
    reset role;
    report := array_append(report, ('FAIL  K10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  K10  ...or release text claims')::text); else report := array_append(report, ('FAIL  K10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 4. Finishing messages: sent, retry with growing waits, failed, skipped
  ----------------------------------------------------------------
  -- F1
  begin
    reset role;
    perform public.finish_outbox_message(m1, 'sent');
    reset role;
    if (select status from public.email_outbox where id = m1) = 'sent' and (select sent_via from public.email_outbox where id = m1) = 'smtp' and (select sent_at from public.email_outbox where id = m1) = now() and (select claimed_at from public.email_outbox where id = m1) is null and (select last_error from public.email_outbox where id = m1) is null then report := array_append(report, ('PASS  F1  a sent message is recorded as sent by the sender, with the time')::text); else report := array_append(report, ('FAIL  F1  sending was not recorded properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F1  sending was not recorded properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: message 2 on its first try)
  reset role;
  update public.email_outbox set attempts = 1, claimed_at = now() where id = m2;

  -- F2
  begin
    reset role;
    perform public.finish_outbox_message(m2, 'retry', 'Temporary problem');
    reset role;
    if (select status from public.email_outbox where id = m2) = 'queued' and (select claimed_at from public.email_outbox where id = m2) is null and (select next_attempt_at from public.email_outbox where id = m2) = now() + interval '5 minutes' and (select last_error from public.email_outbox where id = m2) = 'Temporary problem' then report := array_append(report, ('PASS  F2  after the 1st try a temporary problem means waiting 5 minutes, and the problem is kept')::text); else report := array_append(report, ('FAIL  F2  the first retry wait was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F2  the first retry wait was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.email_outbox set attempts = 2, claimed_at = now() where id = m2;

  -- F3
  begin
    reset role;
    perform public.finish_outbox_message(m2, 'retry', 'again');
    reset role;
    if (select next_attempt_at from public.email_outbox where id = m2) = now() + interval '30 minutes' then report := array_append(report, ('PASS  F3  after the 2nd try: 30 minutes')::text); else report := array_append(report, ('FAIL  F3  the second retry wait was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F3  the second retry wait was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.email_outbox set attempts = 3, claimed_at = now() where id = m2;

  -- F4
  begin
    reset role;
    perform public.finish_outbox_message(m2, 'retry', 'again');
    reset role;
    if (select next_attempt_at from public.email_outbox where id = m2) = now() + interval '2 hours' then report := array_append(report, ('PASS  F4  after the 3rd try: 2 hours')::text); else report := array_append(report, ('FAIL  F4  the third retry wait was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F4  the third retry wait was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.email_outbox set attempts = 4, claimed_at = now() where id = m2;

  -- F5
  begin
    reset role;
    perform public.finish_outbox_message(m2, 'retry', 'again');
    reset role;
    if (select next_attempt_at from public.email_outbox where id = m2) = now() + interval '6 hours' and (select status from public.email_outbox where id = m2) = 'queued' then report := array_append(report, ('PASS  F5  after the 4th try: 6 hours')::text); else report := array_append(report, ('FAIL  F5  the fourth retry wait was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F5  the fourth retry wait was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.email_outbox set attempts = 5, claimed_at = now() where id = m2;

  -- F6
  begin
    reset role;
    perform public.finish_outbox_message(m2, 'retry', 'still broken');
    reset role;
    if (select status from public.email_outbox where id = m2) = 'failed' and (select last_error from public.email_outbox where id = m2) = 'still broken' then report := array_append(report, ('PASS  F6  after the 5th try it gives up: the message is marked failed (an administrator can retry it)')::text); else report := array_append(report, ('FAIL  F6  it did not give up after 5 tries')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F6  it did not give up after 5 tries: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F7
  begin
    reset role;
    perform public.finish_outbox_message(m3, 'failed', 'Address does not exist');
    reset role;
    if (select status from public.email_outbox where id = m3) = 'failed' and (select last_error from public.email_outbox where id = m3) = 'Address does not exist' then report := array_append(report, ('PASS  F7  a message that can never be sent is marked failed at once, with the reason')::text); else report := array_append(report, ('FAIL  F7  a permanent failure was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F7  a permanent failure was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F8
  begin
    reset role;
    perform public.finish_outbox_message(m4, 'skipped', 'Not on the safe list');
    reset role;
    if (select status from public.email_outbox where id = m4) = 'skipped' and (select last_error from public.email_outbox where id = m4) = 'Not on the safe list' and (select claimed_at from public.email_outbox where id = m4) is null then report := array_append(report, ('PASS  F8  a message set aside on purpose (safe mode, too old) is marked skipped, with the reason')::text); else report := array_append(report, ('FAIL  F8  skipping was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F8  skipping was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F9
  begin
    reset role;
    perform public.finish_outbox_message(m3, 'maybe');
    reset role;
    report := array_append(report, ('FAIL  F9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%must be sent, retry, failed or skipped%' then report := array_append(report, ('PASS  F9  any other result is refused')::text); else report := array_append(report, ('FAIL  F9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F10
  begin
    reset role;
    perform public.finish_outbox_message(gen_random_uuid(), 'sent');
    reset role;
    report := array_append(report, ('FAIL  F10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  F10  finishing a message that does not exist is refused')::text); else report := array_append(report, ('FAIL  F10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F11
  begin
    reset role;
    perform public.finish_outbox_message(m3, 'failed', repeat('x', 900));
    reset role;
    if char_length((select last_error from public.email_outbox where id = m3)) = 500 then report := array_append(report, ('PASS  F11  a very long error is cut to 500 characters')::text); else report := array_append(report, ('FAIL  F11  a long error was not cut')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F11  a long error was not cut: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F12
  begin
    reset role;
    select public.outbox_sent_last_day() into n0; perform public.finish_outbox_message(m2, 'sent'); perform public.finish_outbox_message(m4, 'sent', null, now() - interval '30 hours'); select public.outbox_sent_last_day() into n;
    reset role;
    if n = n0 + 1 then report := array_append(report, ('PASS  F12  the daily count counts a message sent now, and not one sent 30 hours ago')::text); else report := array_append(report, ('FAIL  F12  the sent-in-24-hours count was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F12  the sent-in-24-hours count was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 5. Retry (administrators)
  ----------------------------------------------------------------
  -- (setup, not a test: a failed message and a skipped one)
  reset role;
  update public.email_outbox set status = 'failed', sent_at = null, sent_via = null where id = m3;
  update public.email_outbox set status = 'queued', sent_at = null, sent_via = null where id = m1;

  -- R1
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.retry_outbox_message(m3);
    reset role;
    if (select status from public.email_outbox where id = m3) = 'queued' and (select attempts from public.email_outbox where id = m3) = 0 and (select claimed_at from public.email_outbox where id = m3) is null and (select next_attempt_at from public.email_outbox where id = m3) is null then report := array_append(report, ('PASS  R1  an administrator can retry a failed message: it goes back to waiting with a fresh count')::text); else report := array_append(report, ('FAIL  R1  the retry did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R1  the retry did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R2
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.retry_outbox_message(m3);
    reset role;
    report := array_append(report, ('FAIL  R2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%failed or skipped%' then report := array_append(report, ('PASS  R2  retrying a message that is only waiting is refused')::text); else report := array_append(report, ('FAIL  R2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.retry_outbox_message(m3);
    reset role;
    report := array_append(report, ('FAIL  R3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  R3  an umpire cannot retry')::text); else report := array_append(report, ('FAIL  R3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.retry_outbox_message(m3);
    reset role;
    report := array_append(report, ('FAIL  R4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  R4  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  R4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.retry_outbox_message(m3);
    reset role;
    report := array_append(report, ('FAIL  R5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R5  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  R5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 6. The test message
  ----------------------------------------------------------------
  -- T1
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_test_email();
    reset role;
    if exists (select 1 from public.email_outbox where to_profile_id = s_acct and subject = 'Test message from RWCLL Umpire Management' and to_email = 'chk-' || stamp || '-s@example.org') then report := array_append(report, ('PASS  T1  an administrator can queue a test message to their own address')::text); else report := array_append(report, ('FAIL  T1  the test message was not queued')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T1  the test message was not queued: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_test_email();
    reset role;
    report := array_append(report, ('FAIL  T2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  T2  an umpire cannot')::text); else report := array_append(report, ('FAIL  T2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T3
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.queue_test_email();
    reset role;
    report := array_append(report, ('FAIL  T3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  T3  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  T3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 7. The reminder functions can run on a schedule, but only an administrator can run them from the app
  ----------------------------------------------------------------
  -- J1
  begin
    reset role;
    select public.queue_unconfirmed_warnings() into n;
    reset role;
    if n >= 0 then report := array_append(report, ('PASS  J1  the database''s own scheduled job (nobody signed in) can run the unconfirmed-assignment warnings')::text); else report := array_append(report, ('FAIL  J1  the scheduled job could not run the warnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  J1  the scheduled job could not run the warnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- J2
  begin
    reset role;
    select public.queue_self_assign_digest() into n;
    reset role;
    if n >= 0 then report := array_append(report, ('PASS  J2  ...and the self-assigned games summary')::text); else report := array_append(report, ('FAIL  J2  the scheduled job could not run the summary')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  J2  the scheduled job could not run the summary: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- J3
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.queue_unconfirmed_warnings() into n;
    reset role;
    if n >= 0 then report := array_append(report, ('PASS  J3  an administrator still can')::text); else report := array_append(report, ('FAIL  J3  an administrator could not run the warnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  J3  an administrator could not run the warnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- J4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_unconfirmed_warnings();
    reset role;
    report := array_append(report, ('FAIL  J4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  J4  an umpire cannot')::text); else report := array_append(report, ('FAIL  J4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- J5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_self_assign_digest();
    reset role;
    report := array_append(report, ('FAIL  J5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  J5  ...nor the summary')::text); else report := array_append(report, ('FAIL  J5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- J6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.queue_game_reminders();
    reset role;
    report := array_append(report, ('FAIL  J6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  J6  ...nor the reminders')::text); else report := array_append(report, ('FAIL  J6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- J7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.queue_unconfirmed_warnings();
    reset role;
    report := array_append(report, ('FAIL  J7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  J7  a signed-out visitor from the app cannot')::text); else report := array_append(report, ('FAIL  J7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- J8
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.queue_game_reminders();
    reset role;
    report := array_append(report, ('FAIL  J8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  J8  ...nor the reminders')::text); else report := array_append(report, ('FAIL  J8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 8. The day-before reminders
  ----------------------------------------------------------------
  -- Q1
  begin
    reset role;
    select public.queue_game_reminders() into n;
    reset role;
    if n = 3 then report := array_append(report, ('PASS  Q1  run by the schedule, it reminds the 3 umpires on the 2 scheduled games starting in 20 to 28 hours (A and B on one, D on another)')::text); else report := array_append(report, ('FAIL  Q1  the wrong number of reminders was queued')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q1  the wrong number of reminders was queued: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q2
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = a_acct and subject like 'Reminder: you umpire tomorrow') = 1 and (select count(*) from public.email_outbox where to_profile_id = b_acct and subject like 'Reminder: you umpire tomorrow') = 1 and (select count(*) from public.email_outbox where to_profile_id = d_acct and subject like 'Reminder: you umpire tomorrow') = 1 then report := array_append(report, ('PASS  Q2  each of them got one reminder email')::text); else report := array_append(report, ('FAIL  Q2  a reminder email was missing or doubled')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q2  a reminder email was missing or doubled: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q3
  begin
    reset role;
    null;
    reset role;
    if (select body from public.email_outbox where to_profile_id = a_acct and subject like 'Reminder%') not like '%not confirmed%' and (select body from public.email_outbox where to_profile_id = a_acct and subject like 'Reminder%') not like '%http%' and (select body from public.email_outbox where to_profile_id = b_acct and subject like 'Reminder%') like '%You have not confirmed this game yet%' and (select body from public.email_outbox where to_profile_id = b_acct and subject like 'Reminder%') not like '%http%' then report := array_append(report, ('PASS  Q3  an umpire who confirmed is simply reminded; one who has not is also asked to confirm; with no app address set, there is no link')::text); else report := array_append(report, ('FAIL  Q3  the confirm request was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q3  the confirm request was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q4
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.game_assignments where game_id in (g_in, g_in2) and reminded_at is not null) = 3 and (select count(*) from public.game_assignments where game_id in (g_early, g_late, g_draft, g_cancel, g_past) and reminded_at is not null) = 0 then report := array_append(report, ('PASS  Q4  only those assignments are marked reminded: not a game too soon, too far off, a draft, a canceled one, or one already played')::text); else report := array_append(report, ('FAIL  Q4  the wrong assignments were reminded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q4  the wrong assignments were reminded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q5
  begin
    reset role;
    select public.queue_game_reminders() into n;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  Q5  running it again straight away finds nothing new to remind')::text); else report := array_append(report, ('FAIL  Q5  the second run reminded someone again')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q5  the second run reminded someone again: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q6
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.email_outbox where to_profile_id = a_acct and subject like 'Reminder: you umpire tomorrow') = 1 and (select count(*) from public.email_outbox where to_profile_id = b_acct and subject like 'Reminder: you umpire tomorrow') = 1 then report := array_append(report, ('PASS  Q6  nobody is reminded twice for the same game')::text); else report := array_append(report, ('FAIL  Q6  a reminder was sent twice')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q6  a reminder was sent twice: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q7
  begin
    reset role;
    select count(*) into n from public.sms_outbox where to_profile_id = a_acct and kind = 'reminder';
    reset role;
    if n = 1 and (select to_phone from public.sms_outbox where to_profile_id = a_acct) = '+16505550101' and (select body from public.sms_outbox where to_profile_id = a_acct) like 'RWCLL umpires: reminder%' and (select body from public.sms_outbox where to_profile_id = a_acct) not like '%confirm%' then report := array_append(report, ('PASS  Q7  an umpire who agreed to texts also gets a text (to their number, in international form); no confirm request since they confirmed')::text); else report := array_append(report, ('FAIL  Q7  the text reminder was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q7  the text reminder was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q8
  begin
    reset role;
    select count(*) into n from public.sms_outbox where to_profile_id = b_acct;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  Q8  an umpire who has a phone number but did NOT agree to texts gets no text')::text); else report := array_append(report, ('FAIL  Q8  a text was queued without consent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q8  a text was queued without consent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q9
  begin
    reset role;
    select count(*) into n from public.sms_outbox where to_profile_id = d_acct and body like '%Please confirm in the app.%';
    reset role;
    if n = 1 and (select to_phone from public.sms_outbox where to_profile_id = d_acct) = '+16505550104' then report := array_append(report, ('PASS  Q9  one who agreed but has not confirmed is asked to confirm in the text')::text); else report := array_append(report, ('FAIL  Q9  the unconfirmed text was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q9  the unconfirmed text was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the app's address is set, and a new game appears in the window)
  reset role;
  update public.sending_settings set value = 'https://example.org/app' where key = 'app_url';
  update public.games set status = 'scheduled' where id = g_link;

  -- Q11
  begin
    reset role;
    select public.queue_game_reminders() into n;
    reset role;
    if n = 1 and (select count(*) from public.email_outbox where to_profile_id = a_acct and subject like 'Reminder%' and body like '%https://example.org/app%') = 1 then report := array_append(report, ('PASS  Q11  with the app''s address set, a reminder includes it')::text); else report := array_append(report, ('FAIL  Q11  the app address was not added')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q11  the app address was not added: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- Q12
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.queue_game_reminders() into n;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  Q12  an administrator can also run the reminders from the app')::text); else report := array_append(report, ('FAIL  Q12  an administrator could not run the reminders')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  Q12  an administrator could not run the reminders: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 9. The text-message queue
  ----------------------------------------------------------------
  -- (setup, not a test: two waiting texts)
  reset role;
  insert into public.sms_outbox (to_phone, kind, body, created_at) values ('+16505550111', 'reminder', 'Text 1', now() - interval '20 minutes') returning id into sm1;
  insert into public.sms_outbox (to_phone, kind, body, created_at) values ('+16505550112', 'reminder', 'Text 2', now() - interval '10 minutes') returning id into sm2;

  -- X1
  begin
    reset role;
    insert into public.sms_outbox (to_phone, body) values ('650-555-0101', 'not international');
    reset role;
    report := array_append(report, ('FAIL  X1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  X1  a text must go to a number in international form (+1...)')::text); else report := array_append(report, ('FAIL  X1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- X2
  begin
    reset role;
    insert into public.sms_outbox (to_phone, body) values ('+16505550111', repeat('x', 321));
    reset role;
    report := array_append(report, ('FAIL  X2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  X2  a text is at most 320 characters')::text); else report := array_append(report, ('FAIL  X2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- X3
  begin
    reset role;
    insert into public.sms_outbox (to_phone, body) values ('+16505550111', '   ');
    reset role;
    report := array_append(report, ('FAIL  X3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  X3  a text cannot be empty')::text); else report := array_append(report, ('FAIL  X3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- X4
  begin
    perform set_config('request.jwt.claim.sub', s_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', s_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.sms_outbox where id in (sm1, sm2);
    reset role;
    if n = 2 then report := array_append(report, ('PASS  X4  administrators can read the text queue')::text); else report := array_append(report, ('FAIL  X4  an administrator could not read the text queue')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X4  an administrator could not read the text queue: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- X5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.sms_outbox;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  X5  an umpire cannot (not even their own)')::text); else report := array_append(report, ('FAIL  X5  an umpire read the text queue')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X5  an umpire read the text queue: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- X6
  begin
    reset role;
    select count(*) into n from public.claim_sms_batch(1);
    reset role;
    if n = 1 and (select attempts from public.sms_outbox where id = sm1) = 1 then report := array_append(report, ('PASS  X6  the sender claims the oldest waiting text')::text); else report := array_append(report, ('FAIL  X6  the text claim was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X6  the text claim was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- X7
  begin
    reset role;
    perform public.finish_sms_message(sm1, 'sent');
    reset role;
    if (select status from public.sms_outbox where id = sm1) = 'sent' and (select sent_at from public.sms_outbox where id = sm1) = now() then report := array_append(report, ('PASS  X7  a sent text is recorded')::text); else report := array_append(report, ('FAIL  X7  a sent text was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X7  a sent text was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.sms_outbox set attempts = 1, claimed_at = now() where id = sm2;

  -- X8
  begin
    reset role;
    perform public.finish_sms_message(sm2, 'retry', 'busy');
    reset role;
    if (select status from public.sms_outbox where id = sm2) = 'queued' and (select next_attempt_at from public.sms_outbox where id = sm2) = now() + interval '5 minutes' then report := array_append(report, ('PASS  X8  a temporary problem means a retry in 5 minutes')::text); else report := array_append(report, ('FAIL  X8  the text retry wait was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X8  the text retry wait was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.sms_outbox set attempts = 3, claimed_at = now() where id = sm2;

  -- X9
  begin
    reset role;
    perform public.finish_sms_message(sm2, 'retry', 'busy');
    reset role;
    if (select status from public.sms_outbox where id = sm2) = 'failed' then report := array_append(report, ('PASS  X9  texts give up after 3 tries')::text); else report := array_append(report, ('FAIL  X9  a text did not give up')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X9  a text did not give up: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- X10
  begin
    reset role;
    perform public.finish_sms_message(sm2, 'later');
    reset role;
    report := array_append(report, ('FAIL  X10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%must be sent, retry, failed or skipped%' then report := array_append(report, ('PASS  X10  any other result is refused')::text); else report := array_append(report, ('FAIL  X10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 10. Phone numbers in international form
  ----------------------------------------------------------------
  -- N1
  begin
    reset role;
    select public.to_e164('650-555-0101') into txt;
    reset role;
    if txt = '+16505550101' then report := array_append(report, ('PASS  N1  650-555-0101 becomes +16505550101')::text); else report := array_append(report, ('FAIL  N1  a plain number was not converted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N1  a plain number was not converted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N2
  begin
    reset role;
    null;
    reset role;
    if public.to_e164('(650) 555-0101') = '+16505550101' and public.to_e164('1-650-555-0101') = '+16505550101' and public.to_e164('+1 650 555 0101') = '+16505550101' then report := array_append(report, ('PASS  N2  so do (650) 555-0101, 1-650-555-0101 and +1 650 555 0101')::text); else report := array_append(report, ('FAIL  N2  a common way of writing a number was not understood')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N2  a common way of writing a number was not understood: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N3
  begin
    reset role;
    null;
    reset role;
    if public.to_e164('+44 20 7946 0958') = '+442079460958' then report := array_append(report, ('PASS  N3  an international number keeps its country code')::text); else report := array_append(report, ('FAIL  N3  an international number was changed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N3  an international number was changed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N4
  begin
    reset role;
    null;
    reset role;
    if public.to_e164('555-0101') is null and public.to_e164('123-456-7890') is null and public.to_e164('call me') is null and public.to_e164('') is null and public.to_e164(null) is null then report := array_append(report, ('PASS  N4  numbers that are too short, have an impossible area code, or are not numbers give nothing (so no text is queued for them)')::text); else report := array_append(report, ('FAIL  N4  a bad number was accepted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N4  a bad number was accepted: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nSENDING CHECK (nothing was sent and nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
