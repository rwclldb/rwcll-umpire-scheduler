-- RWCLL check: families and youth safeguards (parents, links, consent, turning 18).
--
-- Run in the Supabase SQL Editor AFTER applying 20261109100000_add_families_and_consent.sql
-- (which needs the earnings and payroll migration, 20261108100000, applied first).
--
-- It builds its own accounts (an umpire chief, a treasurer, parents, pending registrations),
-- umpires of different ages, games and earnings, then acts as each of them and as a signed-out
-- visitor. It ENDS WITH A RED ERROR on purpose: the report is carried in the error message,
-- and raising an error guarantees everything it created or changed is rolled back. Your real
-- data and settings are not changed.
--
-- Real earnings, payrolls and arrivals in your database are set aside INSIDE the run (so they
-- cannot change the counts) and are all back, untouched, when it ends.
--
-- NOTE ON DATES: ages and game dates are judged by CALIFORNIA's date (the league's time zone).
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  ca date := (now() at time zone 'America/Los_Angeles')::date;
  t_admin uuid;
  ch_acct uuid := gen_random_uuid(); sc_acct uuid := gen_random_uuid(); tr_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  par1 uuid := gen_random_uuid(); par2 uuid := gen_random_uuid(); par3 uuid := gen_random_uuid(); par4 uuid := gen_random_uuid(); par5 uuid := gen_random_uuid();
  pnr uuid := gen_random_uuid(); ppend uuid := gen_random_uuid(); prej uuid := gen_random_uuid(); pnote uuid := gen_random_uuid();
  pyouth uuid := gen_random_uuid(); pbad uuid := gen_random_uuid(); ppend2 uuid := gen_random_uuid();
  y1_acct uuid := gen_random_uuid(); kid_acct uuid := gen_random_uuid(); t18_acct uuid := gen_random_uuid(); ad_acct uuid := gen_random_uuid();
  yreg1 uuid := gen_random_uuid(); yreg2 uuid := gen_random_uuid();
  l1 uuid; s1 uuid; d1 uuid; tm1 uuid; tm2 uuid; loc uuid;
  um_y uuid; um_kid uuid; um_kid2 uuid; um_t18 uuid; um_t19 uuid; um_nobd uuid; um_ad uuid; um_r1 uuid; um_r2 uuid;
  g_a uuid; g_b uuid; g_c uuid; g_past uuid; g_far uuid; g_canc uuid;
  lk1 uuid; lk2 uuid; lk3 uuid; lk4 uuid; lk_x uuid; lk_kid uuid; pr_appr uuid; pr_draft uuid;
  n bigint; b boolean; v integer; j jsonb; txt text; wv text;
begin
  select p.id into t_admin
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  if t_admin is null then
    raise exception 'This check needs an approved super admin.';
  end if;

  -- accounts: the sign-up choice and note travel as metadata, exactly as the sign-up form sends them
  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    select a, 'chk-' || stamp || '-' || i || '@example.org', now(), m::jsonb
    from (values
      (ch_acct, 'ch', '{}'), (sc_acct, 'sc', '{}'), (tr_acct, 'tr', '{}'), (x_acct, 'x', '{}'),
      (par1, 'par1', '{"signup_kind":"parent_guardian"}'), (par2, 'par2', '{"signup_kind":"parent_guardian"}'),
      (par3, 'par3', '{"signup_kind":"parent_guardian"}'), (par4, 'par4', '{"signup_kind":"parent_guardian"}'),
      (par5, 'par5', '{"signup_kind":"parent_guardian"}'), (pnr, 'pnr', '{}'),
      (ppend, 'ppend', '{"signup_kind":"parent_guardian","registration_note":"Mother of Alex Kim (Majors)"}'),
      (prej, 'prej', '{"signup_kind":"parent_guardian"}'),
      (pnote, 'pnote', ('{"signup_kind":"parent_guardian","registration_note":"' || repeat('x', 300) || '"}')),
      (pyouth, 'pyouth', '{"signup_kind":"youth_umpire","registration_note":"should be ignored"}'),
      (pbad, 'pbad', '{"signup_kind":"super_admin","registration_note":"ignored"}'),
      (ppend2, 'ppend2', '{"signup_kind":"parent_guardian"}'),
      (y1_acct, 'y1', '{}'), (kid_acct, 'kid', '{}'), (t18_acct, 't18', '{}'), (ad_acct, 'ad', '{}'),
      (yreg1, 'yreg1', '{"signup_kind":"youth_umpire"}'), (yreg2, 'yreg2', '{"signup_kind":"youth_umpire"}')
    ) as t(a, i, m);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (ch_acct, sc_acct, tr_acct, x_acct, par1, par2, par3, par4, par5, pnr, y1_acct, kid_acct, t18_acct, ad_acct);
  update public.profiles set display_name = 'CHK Parent One ' || stamp where id = par1;
  update public.profiles set display_name = 'CHK Parent Two ' || stamp where id = par2;
  update public.profiles set display_name = 'CHK Parent Three ' || stamp where id = par3;
  update public.profiles set display_name = 'CHK Chief ' || stamp where id = ch_acct;
  update public.profiles set display_name = 'CHK Pending Parent ' || stamp where id = ppend;
  insert into public.user_roles (user_id, role_id) values
    (ch_acct, 'umpire_chief'), (sc_acct, 'scheduler'), (tr_acct, 'treasurer'),
    (par1, 'parent_guardian'), (par2, 'parent_guardian'), (par3, 'parent_guardian'), (par4, 'parent_guardian'), (par5, 'parent_guardian'),
    (y1_acct, 'youth_umpire'), (kid_acct, 'youth_umpire'), (t18_acct, 'youth_umpire'), (ad_acct, 'adult_umpire');

  -- set aside real money data INSIDE this run, so it cannot change what is counted below
  update public.game_assignments set attendance = 'no_show', arrived_at = null where attendance = 'arrived';
  delete from public.payroll_payments;
  delete from public.payroll_lines;
  update public.earnings set payroll_id = null;
  update public.earning_adjustments set payroll_id = null;
  delete from public.payrolls;
  delete from public.earnings;
  delete from public.earning_adjustments;

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.divisions (league_id, name) values (l1, 'CHK Fam Div') returning id into d1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'Hawks', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'Owls', d1) returning id into tm2;

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Youth ' || stamp, 'youth', y1_acct) returning id into um_y;
  insert into public.umpires (display_name, classification) values ('CHK Kid ' || stamp, 'youth') returning id into um_kid;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Kid Two ' || stamp, 'youth', kid_acct) returning id into um_kid2;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Turning18 ' || stamp, 'youth', t18_acct) returning id into um_t18;
  insert into public.umpires (display_name, classification) values ('CHK Nineteen ' || stamp, 'youth') returning id into um_t19;
  insert into public.umpires (display_name, classification) values ('CHK NoBirthday ' || stamp, 'youth') returning id into um_nobd;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Adult ' || stamp, 'adult', ad_acct) returning id into um_ad;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Reg One ' || stamp, 'youth', yreg1) returning id into um_r1;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Reg Two ' || stamp, 'youth', yreg2) returning id into um_r2;
  insert into public.umpire_private_details (umpire_id, birth_date) values
    (um_y, ((ca - interval '16 years' - interval '30 days')::date)), (um_kid, ((ca - interval '11 years' - interval '30 days')::date)), (um_kid2, ((ca - interval '11 years' - interval '30 days')::date)),
    (um_t18, ((ca - interval '18 years' - interval '30 days')::date)), (um_t19, ((ca - interval '19 years' - interval '30 days')::date));

  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, ((ca + 20)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles', ((ca + 20)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles') returning id into g_a;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, ((ca + 21)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles', ((ca + 21)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles') returning id into g_b;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, ((ca + 22)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles', ((ca + 22)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles') returning id into g_c;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, ((ca - 10)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles', ((ca - 10)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles') returning id into g_past;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, ((ca + 200)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles', ((ca + 200)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles') returning id into g_far;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, ((ca - 5)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles', ((ca - 5)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles') returning id into g_canc;
  update public.games set status = 'scheduled' where id in (g_a, g_b, g_c, g_past, g_far);
  update public.games set status = 'canceled' where id = g_canc;

  ----------------------------------------------------------------
  -- 1. The age settings
  ----------------------------------------------------------------
  -- S1
  begin
    reset role;
    update public.app_settings set value = '11' where key = 'umpire_min_age'; update public.app_settings set value = '14' where key = 'parent_consent_below_age';
    reset role;
    if public.umpire_min_age() = 11 and public.parent_consent_below_age() = 14 then report := array_append(report, ('PASS  S1  the two age rules are settings, and the functions read them')::text); else report := array_append(report, ('FAIL  S1  the settings were not read')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  the settings were not read: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2a
  begin
    reset role;
    update public.app_settings set value = '4' where key = 'umpire_min_age';
    reset role;
    report := array_append(report, ('FAIL  S2a  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S2a  umpire_min_age cannot be set to ''4'' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S2a  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S2b
  begin
    reset role;
    update public.app_settings set value = '19' where key = 'umpire_min_age';
    reset role;
    report := array_append(report, ('FAIL  S2b  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S2b  umpire_min_age cannot be set to ''19'' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S2b  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S2c
  begin
    reset role;
    update public.app_settings set value = 'abc' where key = 'umpire_min_age';
    reset role;
    report := array_append(report, ('FAIL  S2c  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S2c  umpire_min_age cannot be set to ''abc'' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S2c  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S2d
  begin
    reset role;
    update public.app_settings set value = '' where key = 'umpire_min_age';
    reset role;
    report := array_append(report, ('FAIL  S2d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S2d  umpire_min_age cannot be set to '''' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S2d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S2e
  begin
    reset role;
    update public.app_settings set value = '1.5' where key = 'umpire_min_age';
    reset role;
    report := array_append(report, ('FAIL  S2e  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S2e  umpire_min_age cannot be set to ''1.5'' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S2e  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S3a
  begin
    reset role;
    update public.app_settings set value = '4' where key = 'parent_consent_below_age';
    reset role;
    report := array_append(report, ('FAIL  S3a  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S3a  parent_consent_below_age cannot be set to ''4'' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S3a  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S3b
  begin
    reset role;
    update public.app_settings set value = '19' where key = 'parent_consent_below_age';
    reset role;
    report := array_append(report, ('FAIL  S3b  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S3b  parent_consent_below_age cannot be set to ''19'' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S3b  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S3c
  begin
    reset role;
    update public.app_settings set value = 'abc' where key = 'parent_consent_below_age';
    reset role;
    report := array_append(report, ('FAIL  S3c  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  S3c  parent_consent_below_age cannot be set to ''abc'' (it must be a whole number from 5 to 18)')::text); else report := array_append(report, ('FAIL  S3c  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S4
  begin
    reset role;
    update public.app_settings set value = '5' where key = 'umpire_min_age'; update public.app_settings set value = '18' where key = 'parent_consent_below_age';
    reset role;
    if public.umpire_min_age() = 5 and public.parent_consent_below_age() = 18 then report := array_append(report, ('PASS  S4  the edges 5 and 18 are allowed')::text); else report := array_append(report, ('FAIL  S4  an edge value was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S4  an edge value was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the settings are removed, to test the defaults)
  reset role;
  delete from public.app_settings where key in ('umpire_min_age', 'parent_consent_below_age');

  -- S5
  begin
    reset role;
    null;
    reset role;
    if public.umpire_min_age() = 13 and public.parent_consent_below_age() = 13 then report := array_append(report, ('PASS  S5  with no setting, both default to 13 (today''s rule)')::text); else report := array_append(report, ('FAIL  S5  the default was not 13')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S5  the default was not 13: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the settings are put back, with the rules this script wants)
  reset role;
  insert into public.app_settings (key, value) values ('umpire_min_age', '10'), ('parent_consent_below_age', '13');

  -- S6
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.umpire_min_age() into v;
    reset role;
    if v = 10 then report := array_append(report, ('PASS  S6  any signed-in person can read the age rules (the sign-up screen needs them)')::text); else report := array_append(report, ('FAIL  S6  the age rules were not readable')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S6  the age rules were not readable: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.umpire_min_age();
    reset role;
    report := array_append(report, ('FAIL  S7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S7  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  S7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.umpire_age(um_y);
    reset role;
    report := array_append(report, ('FAIL  S8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S8  the age calculation is only for the system (birth dates are private)')::text); else report := array_append(report, ('FAIL  S8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 2. Parents sign up, and are approved
  ----------------------------------------------------------------
  -- P1
  begin
    reset role;
    null;
    reset role;
    if (select registration_kind from public.profiles where id = ppend) = 'parent_guardian' and (select registration_note from public.profiles where id = ppend) = 'Mother of Alex Kim (Majors)' then report := array_append(report, ('PASS  P1  a parent who signs up as a parent is kept as one, with the note saying whose parent they are')::text); else report := array_append(report, ('FAIL  P1  the parent sign-up was not kept')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P1  the parent sign-up was not kept: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P2
  begin
    reset role;
    null;
    reset role;
    if char_length((select registration_note from public.profiles where id = pnote)) = 200 then report := array_append(report, ('PASS  P2  a note over 200 characters is cut to 200')::text); else report := array_append(report, ('FAIL  P2  a long note was not cut')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P2  a long note was not cut: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P3
  begin
    reset role;
    null;
    reset role;
    if (select registration_kind from public.profiles where id = pyouth) = 'youth_umpire' and (select registration_note from public.profiles where id = pyouth) is null then report := array_append(report, ('PASS  P3  a youth umpire''s sign-up is unchanged, and the note is ignored for anyone who is not a parent')::text); else report := array_append(report, ('FAIL  P3  a youth sign-up was affected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P3  a youth sign-up was affected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P4
  begin
    reset role;
    null;
    reset role;
    if (select registration_kind from public.profiles where id = pbad) is null and (select registration_note from public.profiles where id = pbad) is null then report := array_append(report, ('PASS  P4  a made-up sign-up kind (like super_admin) is ignored, as before')::text); else report := array_append(report, ('FAIL  P4  a made-up kind was accepted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P4  a made-up kind was accepted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AP1
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(ppend);
    reset role;
    report := array_append(report, ('FAIL  AP1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP1  a scheduler cannot approve a parent')::text); else report := array_append(report, ('FAIL  AP1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(ppend);
    reset role;
    report := array_append(report, ('FAIL  AP2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP2  the treasurer cannot approve a parent')::text); else report := array_append(report, ('FAIL  AP2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP3
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(ppend);
    reset role;
    report := array_append(report, ('FAIL  AP3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP3  an ordinary account cannot approve a parent')::text); else report := array_append(report, ('FAIL  AP3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP4
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(ppend);
    reset role;
    report := array_append(report, ('FAIL  AP4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP4  a parent cannot approve a parent')::text); else report := array_append(report, ('FAIL  AP4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.approve_parent_registration(ppend);
    reset role;
    report := array_append(report, ('FAIL  AP5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  AP5  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  AP5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP6
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(pyouth);
    reset role;
    report := array_append(report, ('FAIL  AP6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not found, or it was already reviewed%' then report := array_append(report, ('PASS  AP6  a youth umpire''s registration cannot be approved as a parent')::text); else report := array_append(report, ('FAIL  AP6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP7
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(par1);
    reset role;
    report := array_append(report, ('FAIL  AP7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not found, or it was already reviewed%' then report := array_append(report, ('PASS  AP7  an account that is already approved cannot be ''approved'' again')::text); else report := array_append(report, ('FAIL  AP7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP8
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(ppend);
    reset role;
    if (select account_status from public.profiles where id = ppend) = 'approved' and (select approved_by from public.profiles where id = ppend) = ch_acct and exists (select 1 from public.user_roles where user_id = ppend and role_id = 'parent_guardian') and (select count(*) from public.family_log where action = 'parent_approved' and detail like '%CHK Pending Parent%' || stamp || '%') = 1 then report := array_append(report, ('PASS  AP8  an umpire chief approves a parent: the account is approved, the parent role is given, and it is logged')::text); else report := array_append(report, ('FAIL  AP8  the parent was not approved properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AP8  the parent was not approved properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AP9
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_parent_registration(ppend);
    reset role;
    report := array_append(report, ('FAIL  AP9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already reviewed%' then report := array_append(report, ('PASS  AP9  approving twice is refused')::text); else report := array_append(report, ('FAIL  AP9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP10
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reject_parent_registration(prej);
    reset role;
    if (select account_status from public.profiles where id = prej) = 'rejected' and not exists (select 1 from public.user_roles where user_id = prej) then report := array_append(report, ('PASS  AP10  a super admin can reject a parent registration (no role is given)')::text); else report := array_append(report, ('FAIL  AP10  the parent was not rejected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AP10  the parent was not rejected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AP11
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reject_parent_registration(prej);
    reset role;
    report := array_append(report, ('FAIL  AP11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already reviewed%' then report := array_append(report, ('PASS  AP11  rejecting twice is refused')::text); else report := array_append(report, ('FAIL  AP11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP12
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reject_parent_registration(ppend2);
    reset role;
    report := array_append(report, ('FAIL  AP12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP12  a scheduler cannot reject a parent')::text); else report := array_append(report, ('FAIL  AP12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP13
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reject_parent_registration(ppend2);
    reset role;
    report := array_append(report, ('FAIL  AP13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP13  the treasurer cannot reject a parent')::text); else report := array_append(report, ('FAIL  AP13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP14
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reject_parent_registration(ppend2);
    reset role;
    report := array_append(report, ('FAIL  AP14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP14  an ordinary account cannot reject a parent')::text); else report := array_append(report, ('FAIL  AP14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP15
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.reject_parent_registration(ppend2);
    reset role;
    report := array_append(report, ('FAIL  AP15  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  AP15  a parent cannot reject a parent')::text); else report := array_append(report, ('FAIL  AP15  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AP16
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.reject_parent_registration(ppend2);
    reset role;
    report := array_append(report, ('FAIL  AP16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  AP16  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  AP16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 3. Linking a parent to a youth umpire (administrators only)
  ----------------------------------------------------------------
  -- L1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.link_guardian(um_y, par1, 'mother') into lk1;
    reset role;
    if (select relationship from public.family_links where id = lk1) = 'mother' and (select created_by_name from public.family_links where id = lk1) = 'CHK Chief ' || stamp and (select count(*) from public.family_log where action = 'guardian_linked' and detail like '%' || stamp || '%') = 1 then report := array_append(report, ('PASS  L1  an umpire chief links a mother to a youth umpire; it records who and is logged')::text); else report := array_append(report, ('FAIL  L1  the link was not made')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L1  the link was not made: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.link_guardian(um_y, par2, 'guardian') into lk2;
    reset role;
    if (select count(*) from public.family_links where umpire_id = um_y and ended_at is null) = 2 then report := array_append(report, ('PASS  L2  a super admin can too, and an umpire can have more than one')::text); else report := array_append(report, ('FAIL  L2  a second guardian was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L2  a second guardian was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L3
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.link_guardian(um_y, par3, 'father') into lk3; select public.link_guardian(um_y, par4, 'other') into lk4;
    reset role;
    if (select count(*) from public.family_links where umpire_id = um_y and ended_at is null) = 4 then report := array_append(report, ('PASS  L3  up to four can be linked')::text); else report := array_append(report, ('FAIL  L3  four guardians were not allowed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L3  four guardians were not allowed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 4%' then report := array_append(report, ('PASS  L4  a fifth is refused')::text); else report := array_append(report, ('FAIL  L4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L5
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.unlink_guardian(lk4);
    reset role;
    if (select ended_at is not null and ended_by_name = 'CHK Chief ' || stamp from public.family_links where id = lk4) then report := array_append(report, ('PASS  L5  unlinking ends the link (kept, with who ended it)')::text); else report := array_append(report, ('FAIL  L5  the link did not end')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L5  the link did not end: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L6
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.unlink_guardian(lk4);
    reset role;
    report := array_append(report, ('FAIL  L6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist, or it has already ended%' then report := array_append(report, ('PASS  L6  an ended link cannot be ended again')::text); else report := array_append(report, ('FAIL  L6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L7
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, par1, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already linked%' then report := array_append(report, ('PASS  L7  linking the same parent twice is refused')::text); else report := array_append(report, ('FAIL  L7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L8
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_ad, par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a youth umpire%' then report := array_append(report, ('PASS  L8  an adult umpire cannot have a parent linked')::text); else report := array_append(report, ('FAIL  L8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L9
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, par5, 'aunt');
    reset role;
    report := array_append(report, ('FAIL  L9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Choose mother, father, guardian or other%' then report := array_append(report, ('PASS  L9  the relationship must be one of the listed ones')::text); else report := array_append(report, ('FAIL  L9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L10
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, pnr, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved parent or guardian account%' then report := array_append(report, ('PASS  L10  an account that is not a parent or guardian cannot be linked')::text); else report := array_append(report, ('FAIL  L10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L11
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, prej, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved parent or guardian account%' then report := array_append(report, ('PASS  L11  nor a parent who was rejected')::text); else report := array_append(report, ('FAIL  L11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L12
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, gen_random_uuid(), 'mother');
    reset role;
    report := array_append(report, ('FAIL  L12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved parent or guardian account%' then report := array_append(report, ('PASS  L12  nor an account that does not exist')::text); else report := array_append(report, ('FAIL  L12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L13
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(gen_random_uuid(), par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%umpire does not exist%' then report := array_append(report, ('PASS  L13  nor an umpire that does not exist')::text); else report := array_append(report, ('FAIL  L13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: the youth's own account is given the parent role, to try linking them to themselves)
  reset role;
  insert into public.user_roles (user_id, role_id) values (y1_acct, 'parent_guardian');

  -- L14
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, y1_acct, 'guardian');
    reset role;
    report := array_append(report, ('FAIL  L14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be their own parent%' then report := array_append(report, ('PASS  L14  a youth umpire cannot be their own parent or guardian')::text); else report := array_append(report, ('FAIL  L14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  reset role;
  delete from public.user_roles where user_id = y1_acct and role_id = 'parent_guardian';

  -- L15
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L15  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L15  a scheduler cannot link a parent (nobody can attach themselves to a child)')::text); else report := array_append(report, ('FAIL  L15  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L16
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L16  the treasurer cannot link a parent (nobody can attach themselves to a child)')::text); else report := array_append(report, ('FAIL  L16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L17
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L17  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L17  an ordinary account cannot link a parent (nobody can attach themselves to a child)')::text); else report := array_append(report, ('FAIL  L17  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L18
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.link_guardian(um_y, par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L18  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L18  a parent cannot link a parent (nobody can attach themselves to a child)')::text); else report := array_append(report, ('FAIL  L18  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L19
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.link_guardian(um_y, par5, 'mother');
    reset role;
    report := array_append(report, ('FAIL  L19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L19  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  L19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L20
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.unlink_guardian(lk1);
    reset role;
    report := array_append(report, ('FAIL  L20  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L20  a scheduler cannot unlink')::text); else report := array_append(report, ('FAIL  L20  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L21
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.unlink_guardian(lk1);
    reset role;
    report := array_append(report, ('FAIL  L21  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L21  the treasurer cannot unlink')::text); else report := array_append(report, ('FAIL  L21  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L22
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.unlink_guardian(lk1);
    reset role;
    report := array_append(report, ('FAIL  L22  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L22  an ordinary account cannot unlink')::text); else report := array_append(report, ('FAIL  L22  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L23
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.unlink_guardian(lk1);
    reset role;
    report := array_append(report, ('FAIL  L23  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  L23  a parent cannot unlink')::text); else report := array_append(report, ('FAIL  L23  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L24
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.unlink_guardian(lk1);
    reset role;
    report := array_append(report, ('FAIL  L24  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L24  a signed-out visitor cannot unlink')::text); else report := array_append(report, ('FAIL  L24  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 4. Who can read the family records, and nobody writes directly
  ----------------------------------------------------------------
  -- R1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_links where umpire_id = um_y;
    reset role;
    if n = 4 then report := array_append(report, ('PASS  R1  an umpire chief reads the links (including ended ones)')::text); else report := array_append(report, ('FAIL  R1  the chief could not read the links')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R1  the chief could not read the links: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R2
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_links where umpire_id = um_y; select count(*) into v from public.family_links where parent_id <> par1;
    reset role;
    if n = 1 and v = 0 then report := array_append(report, ('PASS  R2  a parent reads only their OWN link, not other families'' (or the other parents on the same child)')::text); else report := array_append(report, ('FAIL  R2  a parent saw someone else''s link')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R2  a parent saw someone else''s link: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', par5::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par5, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_links;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R3  a parent with no children sees no links')::text); else report := array_append(report, ('FAIL  R3  a parent saw links')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R3  a parent saw links: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R4-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_links;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R4-sc  a scheduler sees no links')::text); else report := array_append(report, ('FAIL  R4-sc  a scheduler read the links')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R4-sc  a scheduler read the links: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R4-tr
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_links;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R4-tr  the treasurer sees no links')::text); else report := array_append(report, ('FAIL  R4-tr  the treasurer read the links')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R4-tr  the treasurer read the links: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R4-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_links;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R4-x_  an ordinary account sees no links')::text); else report := array_append(report, ('FAIL  R4-x_  an ordinary account read the links')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R4-x_  an ordinary account read the links: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.family_links;
    reset role;
    report := array_append(report, ('FAIL  R5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R5  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  R5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R6
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_log;
    reset role;
    if n > 0 then report := array_append(report, ('PASS  R6  an umpire chief reads the family log')::text); else report := array_append(report, ('FAIL  R6  the chief could not read the log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R6  the chief could not read the log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R7
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  R7  a parent cannot read the log')::text); else report := array_append(report, ('FAIL  R7  a parent read the log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R7  a parent read the log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- W-family_links-i
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.family_links (parent_id, umpire_id, relationship, created_by_name) values (par5, um_y, 'mother', 'x');
    reset role;
    report := array_append(report, ('FAIL  W-family_links-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-family_links-i  not even a chief can insert into family_links directly')::text); else report := array_append(report, ('FAIL  W-family_links-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-family_links-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.family_links set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-family_links-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-family_links-u  ...or update it')::text); else report := array_append(report, ('FAIL  W-family_links-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-family_links-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.family_links;
    reset role;
    report := array_append(report, ('FAIL  W-family_links-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-family_links-d  ...or delete from it, not even a super admin')::text); else report := array_append(report, ('FAIL  W-family_links-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-parental_consents-i
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.parental_consents (umpire_id, parent_id, text_version) values (um_y, par1, 'x');
    reset role;
    report := array_append(report, ('FAIL  W-parental_consents-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-parental_consents-i  not even a chief can insert into parental_consents directly')::text); else report := array_append(report, ('FAIL  W-parental_consents-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-parental_consents-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.parental_consents set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-parental_consents-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-parental_consents-u  ...or update it')::text); else report := array_append(report, ('FAIL  W-parental_consents-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-parental_consents-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.parental_consents;
    reset role;
    report := array_append(report, ('FAIL  W-parental_consents-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-parental_consents-d  ...or delete from it, not even a super admin')::text); else report := array_append(report, ('FAIL  W-parental_consents-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-family_log-i
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.family_log (action, detail, actor_name) values ('x', 'x', 'x');
    reset role;
    report := array_append(report, ('FAIL  W-family_log-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-family_log-i  not even a chief can insert into family_log directly')::text); else report := array_append(report, ('FAIL  W-family_log-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-family_log-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.family_log set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-family_log-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-family_log-u  ...or update it')::text); else report := array_append(report, ('FAIL  W-family_log-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-family_log-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.family_log;
    reset role;
    report := array_append(report, ('FAIL  W-family_log-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-family_log-d  ...or delete from it, not even a super admin')::text); else report := array_append(report, ('FAIL  W-family_log-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W1
  begin
    reset role;
    insert into public.family_links (parent_id, umpire_id, relationship, created_by_name) values (par1, um_y, 'mother', 'x');
    reset role;
    report := array_append(report, ('FAIL  W1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23505' then report := array_append(report, ('PASS  W1  the table itself refuses two active links for the same parent and child')::text); else report := array_append(report, ('FAIL  W1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W2
  begin
    reset role;
    insert into public.family_links (parent_id, umpire_id, relationship, created_by_name) values (par5, um_y, 'aunt', 'x');
    reset role;
    report := array_append(report, ('FAIL  W2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  W2  ...and a relationship that is not on the list')::text); else report := array_append(report, ('FAIL  W2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W3
  begin
    reset role;
    insert into public.family_links (parent_id, umpire_id, relationship, created_by_name, ended_at) values (par5, um_y, 'mother', 'x', now());
    reset role;
    report := array_append(report, ('FAIL  W3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  W3  ...and an ended link with nobody recorded as ending it')::text); else report := array_append(report, ('FAIL  W3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 5. The lists for the screens
  ----------------------------------------------------------------
  -- O1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.families_overview() where umpire_id in (um_y, um_kid, um_t18, um_ad);
    reset role;
    if n = 3 then report := array_append(report, ('PASS  O1  the Families list has every YOUTH umpire (not the adult)')::text); else report := array_append(report, ('FAIL  O1  the overview had the wrong umpires')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O1  the overview had the wrong umpires: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O2
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select guardians into j from public.families_overview() where umpire_id = um_y;
    reset role;
    if jsonb_array_length(j) = 3 and (select count(*) from jsonb_array_elements(j) g where g ->> 'relationship' in ('mother', 'guardian', 'father')) = 3 and not (j::text like '%' || par4::text || '%') then report := array_append(report, ('PASS  O2  each youth shows their ACTIVE guardians (the ended link is not shown)')::text); else report := array_append(report, ('FAIL  O2  the guardians list was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O2  the guardians list was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O3
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select age, needs_consent into v, b from public.families_overview() where umpire_id = um_kid;
    reset role;
    if v = 11 and b then report := array_append(report, ('PASS  O3  an 11-year-old shows age 11 and needs consent (consent is needed below 13)')::text); else report := array_append(report, ('FAIL  O3  the age or consent flag was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O3  the age or consent flag was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select (select turns_18_on from public.families_overview() where umpire_id = um_y) = (((ca - interval '16 years' - interval '30 days')::date) + interval '18 years')::date as ok into b;
    reset role;
    if b then report := array_append(report, ('PASS  O4  it shows the date each umpire turns 18')::text); else report := array_append(report, ('FAIL  O4  the date they turn 18 was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O4  the date they turn 18 was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O5
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.families_overview() where umpire_id = um_nobd and age is null and needs_consent;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  O5  an umpire with no birth date shows no age, and needs consent while the minimum age is below 13 (we cannot show they are old enough)')::text); else report := array_append(report, ('FAIL  O5  a missing birth date was handled wrongly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O5  a missing birth date was handled wrongly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O6
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.families_overview();
    reset role;
    report := array_append(report, ('FAIL  O6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O6  a scheduler cannot see the Families list')::text); else report := array_append(report, ('FAIL  O6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.families_overview();
    reset role;
    report := array_append(report, ('FAIL  O7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O7  the treasurer cannot see the Families list')::text); else report := array_append(report, ('FAIL  O7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.families_overview();
    reset role;
    report := array_append(report, ('FAIL  O8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O8  an ordinary account cannot see the Families list')::text); else report := array_append(report, ('FAIL  O8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O9
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.families_overview();
    reset role;
    report := array_append(report, ('FAIL  O9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O9  a parent cannot see the Families list')::text); else report := array_append(report, ('FAIL  O9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O10
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.families_overview();
    reset role;
    report := array_append(report, ('FAIL  O10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O10  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  O10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O11
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*), max(registration_note) filter (where profile_id = ppend), max(children) filter (where profile_id = par1) into n, txt, v from public.parent_accounts() where profile_id in (par1, par2, par3, par4, par5, ppend, pnr, prej);
    reset role;
    if n = 6 and txt = 'Mother of Alex Kim (Majors)' and v = 1 then report := array_append(report, ('PASS  O11  the parents list has every APPROVED parent (not a non-parent, and not a rejected one), with the note and how many children each is linked to')::text); else report := array_append(report, ('FAIL  O11  the parents list was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O11  the parents list was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O12
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select children into v from public.parent_accounts() where profile_id = par4;
    reset role;
    if v = 0 then report := array_append(report, ('PASS  O12  a parent whose only link ended shows no children')::text); else report := array_append(report, ('FAIL  O12  an ended link was counted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  O12  an ended link was counted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O13
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.parent_accounts();
    reset role;
    report := array_append(report, ('FAIL  O13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O13  a scheduler cannot see the parents list')::text); else report := array_append(report, ('FAIL  O13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O14
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.parent_accounts();
    reset role;
    report := array_append(report, ('FAIL  O14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O14  the treasurer cannot see the parents list')::text); else report := array_append(report, ('FAIL  O14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O15
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.parent_accounts();
    reset role;
    report := array_append(report, ('FAIL  O15  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O15  an ordinary account cannot see the parents list')::text); else report := array_append(report, ('FAIL  O15  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O16
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.parent_accounts();
    reset role;
    report := array_append(report, ('FAIL  O16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  O16  a parent cannot see the parents list')::text); else report := array_append(report, ('FAIL  O16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O17
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.parent_accounts();
    reset role;
    report := array_append(report, ('FAIL  O17  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O17  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  O17  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 6. Consent: the rules (minimum age 10; consent needed below 13)
  ----------------------------------------------------------------
  -- C00
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('I am the parent or legal guardian of {child}. I give permission for {child} to umpire games for the league, and I understand I can withdraw this at any time.');
    reset role;
    if true then report := array_append(report, ('PASS  C00  (setup: a super admin saves finished consent wording, so consent can be given)')::text); else report := array_append(report, ('FAIL  C00  the wording was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C00  the wording was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  select version into wv from public.consent_wordings order by seq desc limit 1;

  -- C0
  begin
    reset role;
    null;
    reset role;
    if public.umpire_needs_consent(um_kid) and not public.umpire_needs_consent(um_y) and not public.umpire_needs_consent(um_t18) and public.umpire_needs_consent(um_nobd) and not public.umpire_needs_consent(um_ad) then report := array_append(report, ('PASS  C0  consent is needed for the 11-year-old and for the youth with no birth date (minimum age 10), but not for a 16-year-old, an 18-year-old or an adult')::text); else report := array_append(report, ('FAIL  C0  the consent rule was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C0  the consent rule was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C0a
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.assignment_blocked_by_consent(um_kid) into b;
    reset role;
    if b then report := array_append(report, ('PASS  C0a  the rule an administrator''s assignment runs says the 11-year-old is blocked (this is the call that was refused before the fix)')::text); else report := array_append(report, ('FAIL  C0a  the administrator''s rule could not run')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C0a  the administrator''s rule could not run: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C0b
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.assignment_blocked_by_consent(um_y) into b;
    reset role;
    if not b then report := array_append(report, ('PASS  C0b  ...and says a 16-year-old is not')::text); else report := array_append(report, ('FAIL  C0b  the rule blocked someone it should not')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C0b  the rule blocked someone it should not: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C0c
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.assignment_blocked_by_consent(um_kid) into b;
    reset role;
    if not b then report := array_append(report, ('PASS  C0c  to anyone who is not an administrator it always says ''no'', so it reveals nothing about any child')::text); else report := array_append(report, ('FAIL  C0c  the rule revealed something to a non-administrator')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C0c  the rule revealed something to a non-administrator: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C0d
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.assignment_blocked_by_consent(um_kid) into b;
    reset role;
    if not b then report := array_append(report, ('PASS  C0d  ...including an ordinary account')::text); else report := array_append(report, ('FAIL  C0d  the rule revealed something to an ordinary account')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C0d  the rule revealed something to an ordinary account: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C0e
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.assignment_blocked_by_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  C0e  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C0e  a signed-out visitor cannot call it')::text); else report := array_append(report, ('FAIL  C0e  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C0f
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.umpire_blocked_by_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  C0f  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C0f  the underlying helper stays system-only: even an administrator cannot call it directly')::text); else report := array_append(report, ('FAIL  C0f  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_a, um_kid, 'plate');
    reset role;
    report := array_append(report, ('FAIL  C1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%needs a parent or guardian''s consent%' then report := array_append(report, ('PASS  C1  an administrator cannot assign an umpire who needs consent and has none')::text); else report := array_append(report, ('FAIL  C1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_a, um_y, 'plate');
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_a and umpire_id = um_y) then report := array_append(report, ('PASS  C2  ...but a 16-year-old (no consent needed) can be assigned as before')::text); else report := array_append(report, ('FAIL  C2  a normal assignment was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C2  a normal assignment was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C3
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.link_guardian(um_kid, par1, 'mother') into lk_kid;
    reset role;
    if lk_kid is not null then report := array_append(report, ('PASS  C3  linking a parent does not by itself give consent')::text); else report := array_append(report, ('FAIL  C3  the link was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C3  the link was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_a, um_kid, 'field');
    reset role;
    report := array_append(report, ('FAIL  C4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%needs a parent or guardian''s consent%' then report := array_append(report, ('PASS  C4  a linked parent who has not consented still does not unlock it')::text); else report := array_append(report, ('FAIL  C4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C5
  begin
    perform set_config('request.jwt.claim.sub', par2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, 'v1');
    reset role;
    report := array_append(report, ('FAIL  C5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a linked parent%' then report := array_append(report, ('PASS  C5  a parent who is NOT linked to this child cannot give consent')::text); else report := array_append(report, ('FAIL  C5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C6
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_y, 'v1');
    reset role;
    report := array_append(report, ('FAIL  C6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not need a parent%' then report := array_append(report, ('PASS  C6  consent is refused for an umpire who does not need it')::text); else report := array_append(report, ('FAIL  C6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C7
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, '   ');
    reset role;
    report := array_append(report, ('FAIL  C7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%wording is missing%' then report := array_append(report, ('PASS  C7  the consent wording must be given')::text); else report := array_append(report, ('FAIL  C7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, 'v1');
    reset role;
    report := array_append(report, ('FAIL  C8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a linked parent%' then report := array_append(report, ('PASS  C8  an ordinary account cannot give consent')::text); else report := array_append(report, ('FAIL  C8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C9
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, 'v1');
    reset role;
    report := array_append(report, ('FAIL  C9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a linked parent%' then report := array_append(report, ('PASS  C9  not even an administrator can give consent for a parent')::text); else report := array_append(report, ('FAIL  C9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C10
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.give_consent(um_kid, 'v1');
    reset role;
    report := array_append(report, ('FAIL  C10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C10  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  C10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C11
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, wv);
    reset role;
    if exists (select 1 from public.parental_consents where umpire_id = um_kid and parent_id = par1 and withdrawn_at is null and text_version = wv) and (select count(*) from public.family_log where action = 'consent_given' and detail like '%CHK Parent One%' || stamp || '%') = 1 then report := array_append(report, ('PASS  C11  a linked parent gives consent (the wording version is kept, and it is logged)')::text); else report := array_append(report, ('FAIL  C11  consent was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C11  consent was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C12
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, wv);
    reset role;
    if (select count(*) from public.parental_consents where umpire_id = um_kid and parent_id = par1) = 1 then report := array_append(report, ('PASS  C12  giving it again changes nothing')::text); else report := array_append(report, ('FAIL  C12  consent was recorded twice')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C12  consent was recorded twice: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C13
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_a, um_kid, 'field');
    reset role;
    if exists (select 1 from public.game_assignments where game_id = g_a and umpire_id = um_kid) then report := array_append(report, ('PASS  C13  with a linked parent''s consent, the umpire can be assigned')::text); else report := array_append(report, ('FAIL  C13  assignment was refused after consent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C13  assignment was refused after consent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C14
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    if (select withdrawn_at is not null and withdrawn_by_name = 'CHK Parent One ' || stamp from public.parental_consents where umpire_id = um_kid and parent_id = par1) and public.umpire_blocked_by_consent(um_kid) then report := array_append(report, ('PASS  C14  the parent withdraws consent (kept, with who): the umpire is blocked again')::text); else report := array_append(report, ('FAIL  C14  withdrawing did not block')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C14  withdrawing did not block: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C15
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_b, um_kid, 'plate');
    reset role;
    report := array_append(report, ('FAIL  C15  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%needs a parent or guardian''s consent%' then report := array_append(report, ('PASS  C15  so they cannot be assigned to another game')::text); else report := array_append(report, ('FAIL  C15  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C16
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  C16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%no consent to withdraw%' then report := array_append(report, ('PASS  C16  withdrawing twice is refused')::text); else report := array_append(report, ('FAIL  C16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C17
  begin
    perform set_config('request.jwt.claim.sub', par2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  C17  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a linked parent%' then report := array_append(report, ('PASS  C17  a parent who is not linked cannot withdraw')::text); else report := array_append(report, ('FAIL  C17  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C18
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  C18  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a linked parent%' then report := array_append(report, ('PASS  C18  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  C18  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C19
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.withdraw_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  C19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C19  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  C19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C20
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_kid, wv);
    reset role;
    if (select count(*) from public.parental_consents where umpire_id = um_kid and parent_id = par1) = 2 and not public.umpire_blocked_by_consent(um_kid) then report := array_append(report, ('PASS  C20  after withdrawing, a parent can consent again (a new record; the old one is kept)')::text); else report := array_append(report, ('FAIL  C20  re-consenting did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C20  re-consenting did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C21
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    if public.umpire_blocked_by_consent(um_kid) and exists (select 1 from public.parental_consents where umpire_id = um_kid and withdrawn_by_name = 'CHK Chief ' || stamp) then report := array_append(report, ('PASS  C21  an administrator can also withdraw consent')::text); else report := array_append(report, ('FAIL  C21  the administrator could not withdraw')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C21  the administrator could not withdraw: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: consent is given again, then the parent is UNLINKED)
  reset role;
  perform set_config('request.jwt.claim.sub', par1::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.give_consent(um_kid, wv);
  reset role;
  perform set_config('request.jwt.claim.sub', ch_acct::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.unlink_guardian(lk_kid);
  reset role;

  -- C22
  begin
    reset role;
    null;
    reset role;
    if public.umpire_blocked_by_consent(um_kid) and (select count(*) from public.parental_consents where umpire_id = um_kid and parent_id = par1 and withdrawn_at is null) = 0 then report := array_append(report, ('PASS  C22  when the parent is unlinked, the consent they gave is withdrawn and the umpire is blocked')::text); else report := array_append(report, ('FAIL  C22  an unlinked parent''s consent still counted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C22  an unlinked parent''s consent still counted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C23
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.link_guardian(um_kid, par1, 'mother') into lk_kid;
    reset role;
    if public.umpire_blocked_by_consent(um_kid) then report := array_append(report, ('PASS  C23  linking the same parent again does NOT bring the old consent back (they must give it again)')::text); else report := array_append(report, ('FAIL  C23  the old consent came back')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C23  the old consent came back: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C24
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_kid);
    reset role;
    report := array_append(report, ('FAIL  C24  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%no consent to withdraw%' then report := array_append(report, ('PASS  C24  (nothing to withdraw)')::text); else report := array_append(report, ('FAIL  C24  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 7. Consent when an umpire takes a game themselves
  ----------------------------------------------------------------
  -- (setup, not a test: the 11-year-old with an account of their own)
  reset role;

  -- C25
  begin
    perform set_config('request.jwt.claim.sub', kid_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', kid_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.self_assign(g_c, 'plate');
    reset role;
    report := array_append(report, ('FAIL  C25  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%need a parent or guardian''s consent%' then report := array_append(report, ('PASS  C25  an umpire who needs consent cannot take a game for themselves')::text); else report := array_append(report, ('FAIL  C25  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C26
  begin
    perform set_config('request.jwt.claim.sub', kid_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', kid_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.self_assign_options();
    reset role;
    if n = 0 then report := array_append(report, ('PASS  C26  ...and is offered no open games')::text); else report := array_append(report, ('FAIL  C26  open games were offered without consent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C26  open games were offered without consent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C27
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.self_assign_options();
    reset role;
    if n >= 0 then report := array_append(report, ('PASS  C27  an umpire who needs no consent is still offered games as before')::text); else report := array_append(report, ('FAIL  C27  the normal list failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C27  the normal list failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 8. Consent when a registration is approved
  ----------------------------------------------------------------
  -- AG0
  begin
    reset role;
    update public.app_settings set value = '13' where key = 'umpire_min_age'; update public.app_settings set value = '13' where key = 'parent_consent_below_age';
    reset role;
    if public.umpire_min_age() = 13 then report := array_append(report, ('PASS  AG0  (the minimum age is set back to 13)')::text); else report := array_append(report, ('FAIL  AG0  the setting did not change')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AG0  the setting did not change: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AG1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_umpire_registration(yreg1, 'youth', ((ca - interval '11 years' - interval '30 days')::date));
    reset role;
    report := array_append(report, ('FAIL  AG1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at least 13 years old%' then report := array_append(report, ('PASS  AG1  an 11-year-old cannot be approved while the minimum age is 13')::text); else report := array_append(report, ('FAIL  AG1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AG2
  begin
    reset role;
    update public.app_settings set value = '10' where key = 'umpire_min_age'; update public.app_settings set value = '13' where key = 'parent_consent_below_age';
    reset role;
    if public.umpire_min_age() = 10 then report := array_append(report, ('PASS  AG2  (the minimum age is lowered to 10, so younger umpires can be approved WITH consent)')::text); else report := array_append(report, ('FAIL  AG2  the setting did not change')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AG2  the setting did not change: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AG3
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_umpire_registration(yreg1, 'youth', ((ca - interval '11 years' - interval '30 days')::date));
    reset role;
    if (select account_status from public.profiles where id = yreg1) = 'approved' and public.umpire_blocked_by_consent(um_r1) then report := array_append(report, ('PASS  AG3  with the minimum lowered, the 11-year-old IS approved, but cannot work until a parent consents')::text); else report := array_append(report, ('FAIL  AG3  the approval did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AG3  the approval did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AG4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_umpire_registration(yreg2, 'youth', ((ca - interval '15 years' - interval '30 days')::date));
    reset role;
    if (select account_status from public.profiles where id = yreg2) = 'approved' and not public.umpire_blocked_by_consent(um_r2) then report := array_append(report, ('PASS  AG4  a 15-year-old is approved and needs no consent')::text); else report := array_append(report, ('FAIL  AG4  a normal approval failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AG4  a normal approval failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AG5
  begin
    reset role;
    update public.app_settings set value = '10' where key = 'umpire_min_age'; update public.app_settings set value = '18' where key = 'parent_consent_below_age';
    reset role;
    if public.umpire_needs_consent(um_y) and public.umpire_needs_consent(um_kid) and not public.umpire_needs_consent(um_t18) then report := array_append(report, ('PASS  AG5  setting ''consent below 18'' requires consent for every youth (16 and 11), but not for an 18-year-old')::text); else report := array_append(report, ('FAIL  AG5  the stricter setting did not apply')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AG5  the stricter setting did not apply: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- AG6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.game_assignments (game_id, umpire_id, position) values (g_b, um_y, 'plate');
    reset role;
    report := array_append(report, ('FAIL  AG6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%needs a parent or guardian''s consent%' then report := array_append(report, ('PASS  AG6  so the 16-year-old now needs consent too')::text); else report := array_append(report, ('FAIL  AG6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- AG7
  begin
    reset role;
    update public.app_settings set value = '10' where key = 'umpire_min_age'; update public.app_settings set value = '13' where key = 'parent_consent_below_age';
    reset role;
    if not public.umpire_needs_consent(um_y) then report := array_append(report, ('PASS  AG7  (back to consent below 13)')::text); else report := array_append(report, ('FAIL  AG7  the setting did not change')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  AG7  the setting did not change: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 9. Turning 18
  ----------------------------------------------------------------
  -- T0
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.link_guardian(um_t18, par1, 'mother') into lk_x;
    reset role;
    if lk_x is not null then report := array_append(report, ('PASS  T0  (setup: the umpire who has turned 18 has a parent linked)')::text); else report := array_append(report, ('FAIL  T0  the setup link failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T0  the setup link failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  update public.umpires set payee_profile_id = par1 where id = um_t18;

  -- T1
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_y);
    reset role;
    report := array_append(report, ('FAIL  T1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not 18 yet%' then report := array_append(report, ('PASS  T1  a 16-year-old cannot be changed to an adult')::text); else report := array_append(report, ('FAIL  T1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T2
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_ad);
    reset role;
    report := array_append(report, ('FAIL  T2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already an adult%' then report := array_append(report, ('PASS  T2  an adult cannot be converted again')::text); else report := array_append(report, ('FAIL  T2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T3
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_nobd);
    reset role;
    report := array_append(report, ('FAIL  T3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Enter their birth date first%' then report := array_append(report, ('PASS  T3  without a birth date there is no proof of age')::text); else report := array_append(report, ('FAIL  T3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(gen_random_uuid());
    reset role;
    report := array_append(report, ('FAIL  T4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  T4  an unknown umpire is refused')::text); else report := array_append(report, ('FAIL  T4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T5
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_t18);
    reset role;
    report := array_append(report, ('FAIL  T5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  T5  a scheduler cannot convert')::text); else report := array_append(report, ('FAIL  T5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_t18);
    reset role;
    report := array_append(report, ('FAIL  T6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  T6  the treasurer cannot convert')::text); else report := array_append(report, ('FAIL  T6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T7
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_t18);
    reset role;
    report := array_append(report, ('FAIL  T7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  T7  an ordinary account cannot convert')::text); else report := array_append(report, ('FAIL  T7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T8
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_t18);
    reset role;
    report := array_append(report, ('FAIL  T8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin or umpire chief%' then report := array_append(report, ('PASS  T8  a parent cannot convert')::text); else report := array_append(report, ('FAIL  T8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T9
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.convert_to_adult(um_t18);
    reset role;
    report := array_append(report, ('FAIL  T9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  T9  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  T9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- T10
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_t18);
    reset role;
    if (select classification from public.umpires where id = um_t18) = 'adult' and (select payee_profile_id from public.umpires where id = um_t18) is null and not exists (select 1 from public.family_links where umpire_id = um_t18 and ended_at is null) and public.payee_for_umpire(um_t18) = t18_acct then report := array_append(report, ('PASS  T10  converting an 18-year-old: now an adult, the parent payee is cleared (they are paid to themselves), the parent link ends')::text); else report := array_append(report, ('FAIL  T10  the conversion did not apply')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T10  the conversion did not apply: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T11
  begin
    reset role;
    null;
    reset role;
    if not exists (select 1 from public.user_roles where user_id = t18_acct and role_id = 'youth_umpire') and exists (select 1 from public.user_roles where user_id = t18_acct and role_id = 'adult_umpire') then report := array_append(report, ('PASS  T11  their account''s role changes from youth umpire to adult umpire')::text); else report := array_append(report, ('FAIL  T11  the roles were not swapped')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T11  the roles were not swapped: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T12
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.family_log where action = 'converted_to_adult' and detail like '%CHK Turning18%' || stamp || '%') = 1 and (select count(*) from public.money_log where action = 'payee_changed' and detail like '%CHK Turning18%' || stamp || '%') = 1 then report := array_append(report, ('PASS  T12  the conversion is logged, and so is the pay change')::text); else report := array_append(report, ('FAIL  T12  the conversion was not logged')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T12  the conversion was not logged: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- T13
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.convert_to_adult(um_t19);
    reset role;
    if (select classification from public.umpires where id = um_t19) = 'adult' then report := array_append(report, ('PASS  T13  an umpire with no account of their own can be converted too')::text); else report := array_append(report, ('FAIL  T13  a conversion without an account failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  T13  a conversion without an account failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 10. What a parent sees (read-only)
  ----------------------------------------------------------------
  -- (setup, not a test: the child's games, earnings and a payroll)
  reset role;
  update public.games set status = 'scheduled' where id = g_canc;
  insert into public.game_assignments (game_id, umpire_id, position) values (g_past, um_y, 'plate'), (g_far, um_y, 'plate'), (g_canc, um_y, 'field');
  update public.games set status = 'canceled' where id = g_canc;
  insert into public.payrolls (period_start, period_end, status, created_by_name, approved_at, approved_by_name) values (ca - 30, ca - 1, 'approved', 'x', now(), 'x') returning id into pr_appr;
  insert into public.payrolls (period_start, period_end, created_by_name) values (ca, ca, 'x') returning id into pr_draft;
  insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents, payroll_id) values (g_past, um_y, 'plate', 'CHK Fam Div', 'youth', ca - 10, 5000, pr_appr);
  insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents) values (g_canc, um_y, 'field', 'CHK Fam Div', 'youth', ca - 5, 2500);
  insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents, voided_at, voided_by_name, void_reason) values (g_far, um_y, 'plate', 'CHK Fam Div', 'youth', ca - 4, 7777, now(), 'x', 'voided');
  insert into public.earning_adjustments (umpire_id, amount_cents, reason, created_by_name, payroll_id) values (um_y, 1000, 'Bonus', 'x', pr_draft);
  insert into public.payroll_payments (payroll_id, payee_profile_id, payee_name, amount_cents, umpire_count, status) values (pr_appr, par1, 'CHK Parent One', 5000, 1, 'pending');
  insert into public.payroll_payments (payroll_id, payee_profile_id, payee_name, amount_cents, umpire_count) values (pr_draft, par1, 'CHK Parent One', 1000, 1);
  insert into public.payroll_payments (payroll_id, payee_profile_id, payee_name, amount_cents, umpire_count) values (pr_appr, par2, 'CHK Parent Two', 999, 1);

  -- V1
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*), max(relationship) filter (where umpire_id = um_y) into n, txt from public.my_family();
    reset role;
    if n = 2 and txt = 'mother' then report := array_append(report, ('PASS  V1  a parent sees their own children (the 16-year-old and the 11-year-old), with the relationship')::text); else report := array_append(report, ('FAIL  V1  the parent''s children were wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V1  the parent''s children were wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V3
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.my_family() where umpire_id = um_kid and needs_consent and not has_consent and not i_consented;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  V3  the 11-year-old shows as needing consent that has not been given')::text); else report := array_append(report, ('FAIL  V3  the consent state was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V3  the consent state was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V4
  begin
    perform set_config('request.jwt.claim.sub', par5::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par5, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.my_family();
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V4  a parent with no children sees none')::text); else report := array_append(report, ('FAIL  V4  a parent with no children saw some')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V4  a parent with no children saw some: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V5
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.my_family();
    reset role;
    report := array_append(report, ('FAIL  V5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved parents and guardians%' then report := array_append(report, ('PASS  V5  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  V5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V6
  begin
    perform set_config('request.jwt.claim.sub', ad_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ad_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.my_family();
    reset role;
    report := array_append(report, ('FAIL  V6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved parents and guardians%' then report := array_append(report, ('PASS  V6  ...nor an umpire')::text); else report := array_append(report, ('FAIL  V6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.my_family();
    reset role;
    report := array_append(report, ('FAIL  V7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  V7  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  V7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V8
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*), count(*) filter (where game_id = g_past and place = 'plate' and division_name = 'CHK Fam Div' and home_team = 'Hawks' and away_team = 'Owls' and location_name = 'CHK Field ' || stamp) into n, v from public.family_schedule(um_y);
    reset role;
    if n = 3 and v = 1 then report := array_append(report, ('PASS  V8  a parent sees their child''s games (the last 60 days and next 120): the date, teams, field, place')::text); else report := array_append(report, ('FAIL  V8  the child''s schedule was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V8  the child''s schedule was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V9
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_schedule(um_y) where game_id = g_far;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V9  a game 200 days away is outside the window')::text); else report := array_append(report, ('FAIL  V9  a far-off game was shown')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V9  a far-off game was shown: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V10
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_schedule(um_y) where game_id = g_canc and game_status = 'canceled';
    reset role;
    if n = 1 then report := array_append(report, ('PASS  V10  a canceled game is shown as canceled')::text); else report := array_append(report, ('FAIL  V10  a canceled game was not marked')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V10  a canceled game was not marked: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V11
  begin
    perform set_config('request.jwt.claim.sub', par5::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par5, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.family_schedule(um_y);
    reset role;
    report := array_append(report, ('FAIL  V11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not linked%' then report := array_append(report, ('PASS  V11  a parent who is not linked to that child cannot see their games')::text); else report := array_append(report, ('FAIL  V11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V12
  begin
    perform set_config('request.jwt.claim.sub', par2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.family_schedule(um_kid);
    reset role;
    report := array_append(report, ('FAIL  V12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not linked%' then report := array_append(report, ('PASS  V12  ...even though they are linked to a different child')::text); else report := array_append(report, ('FAIL  V12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V13
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.family_schedule(um_y);
    reset role;
    report := array_append(report, ('FAIL  V13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not linked%' then report := array_append(report, ('PASS  V13  an ordinary account cannot')::text); else report := array_append(report, ('FAIL  V13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V14
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.family_schedule(um_y);
    reset role;
    report := array_append(report, ('FAIL  V14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  V14  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  V14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V15
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_earnings(um_y);
    reset role;
    if n = 3 then report := array_append(report, ('PASS  V15  a parent sees their child''s earnings and adjustments (the voided earning is left out)')::text); else report := array_append(report, ('FAIL  V15  the earnings were wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V15  the earnings were wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V16
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_earnings(um_y) where kind = 'earning' and amount_cents = 5000 and state = 'approved';
    reset role;
    if n = 1 then report := array_append(report, ('PASS  V16  an earning in an approved payroll shows as approved')::text); else report := array_append(report, ('FAIL  V16  the approved state was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V16  the approved state was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V17
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.family_earnings(um_y) where (kind = 'earning' and amount_cents = 2500 and state = 'waiting') or (kind = 'adjustment' and amount_cents = 1000 and state = 'waiting' and label = 'Bonus');
    reset role;
    if n = 2 then report := array_append(report, ('PASS  V17  an earning not yet in a payroll, and an adjustment in a draft, both show as waiting')::text); else report := array_append(report, ('FAIL  V17  the waiting state was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V17  the waiting state was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V18
  begin
    perform set_config('request.jwt.claim.sub', par5::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par5, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.family_earnings(um_y);
    reset role;
    report := array_append(report, ('FAIL  V18  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not linked%' then report := array_append(report, ('PASS  V18  a parent who is not linked cannot see the earnings')::text); else report := array_append(report, ('FAIL  V18  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V19
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.family_earnings(um_y);
    reset role;
    report := array_append(report, ('FAIL  V19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  V19  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  V19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V20
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*), min(amount_cents), min(status) into n, v, txt from public.my_payments();
    reset role;
    if n = 1 and v = 5000 and txt = 'pending' then report := array_append(report, ('PASS  V20  a parent sees the payments made to THEM: the approved payroll''s $50.00, not the draft''s, and not another parent''s')::text); else report := array_append(report, ('FAIL  V20  the payments list was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V20  the payments list was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V21
  begin
    perform set_config('request.jwt.claim.sub', par2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*), min(amount_cents) into n, v from public.my_payments();
    reset role;
    if n = 1 and v = 999 then report := array_append(report, ('PASS  V21  another parent sees only their own payment')::text); else report := array_append(report, ('FAIL  V21  a parent saw someone else''s payment')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V21  a parent saw someone else''s payment: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V22
  begin
    perform set_config('request.jwt.claim.sub', par5::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par5, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.my_payments();
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V22  a parent who is paid nothing sees none')::text); else report := array_append(report, ('FAIL  V22  a payment appeared from nowhere')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V22  a payment appeared from nowhere: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V23
  begin
    perform set_config('request.jwt.claim.sub', pyouth::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', pyouth, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.my_payments();
    reset role;
    report := array_append(report, ('FAIL  V23  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved accounts%' then report := array_append(report, ('PASS  V23  a pending account cannot')::text); else report := array_append(report, ('FAIL  V23  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V24
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.my_payments();
    reset role;
    report := array_append(report, ('FAIL  V24  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  V24  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  V24  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V25-earnings
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earnings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V25-earnings  a parent cannot read earnings directly (only through the views above)')::text); else report := array_append(report, ('FAIL  V25-earnings  a parent read earnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V25-earnings  a parent read earnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V25-earning_adjustments
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earning_adjustments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V25-earning_adjustments  a parent cannot read earning_adjustments directly (only through the views above)')::text); else report := array_append(report, ('FAIL  V25-earning_adjustments  a parent read earning_adjustments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V25-earning_adjustments  a parent read earning_adjustments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V25-payrolls
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payrolls;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V25-payrolls  a parent cannot read payrolls directly (only through the views above)')::text); else report := array_append(report, ('FAIL  V25-payrolls  a parent read payrolls')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V25-payrolls  a parent read payrolls: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V25-payroll_payments
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_payments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V25-payroll_payments  a parent cannot read payroll_payments directly (only through the views above)')::text); else report := array_append(report, ('FAIL  V25-payroll_payments  a parent read payroll_payments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V25-payroll_payments  a parent read payroll_payments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V25-payroll_lines
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_lines;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V25-payroll_lines  a parent cannot read payroll_lines directly (only through the views above)')::text); else report := array_append(report, ('FAIL  V25-payroll_lines  a parent read payroll_lines')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V25-payroll_lines  a parent read payroll_lines: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V25-pay_rates
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rates;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V25-pay_rates  a parent cannot read pay_rates directly (only through the views above)')::text); else report := array_append(report, ('FAIL  V25-pay_rates  a parent read pay_rates')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V25-pay_rates  a parent read pay_rates: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V25-money_log
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.money_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V25-money_log  a parent cannot read money_log directly (only through the views above)')::text); else report := array_append(report, ('FAIL  V25-money_log  a parent read money_log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V25-money_log  a parent read money_log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V26
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.parental_consents; select count(*) into v from public.parental_consents where parent_id <> par1;
    reset role;
    if n >= 1 and v = 0 then report := array_append(report, ('PASS  V26  a parent reads their own consents, and no one else''s')::text); else report := array_append(report, ('FAIL  V26  a parent saw another parent''s consent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V26  a parent saw another parent''s consent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V27
  begin
    perform set_config('request.jwt.claim.sub', par5::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par5, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.parental_consents;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  V27  a parent who consented to nothing sees none')::text); else report := array_append(report, ('FAIL  V27  a parent saw consents')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V27  a parent saw consents: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nFAMILIES CHECK (nothing was saved; your real data and settings were not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
