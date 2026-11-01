-- RWCLL check: earnings and payroll (what umpires are owed, and paying it).
--
-- Run in the Supabase SQL Editor AFTER applying 20261108100000_add_earnings_and_payrolls.sql
-- (which needs the pay rates migration, 20261107100000, applied first).
--
-- It builds its own divisions, rates, games, umpires, parents and sign-in accounts, then
-- acts as the treasurer, other people, and a signed-out visitor. It ENDS WITH A RED ERROR
-- on purpose: the report is carried in the error message, and raising an error
-- guarantees everything it created is rolled back. Your real data is not changed.
--
-- NOTHING IS PAID: payments are only recorded, and only inside this run. Any real arrivals,
-- earnings or payrolls already in your database are set aside INSIDE the run (so they cannot
-- change the counts) and are all back, untouched, when it ends.
--
-- NOTE ON DATES: a game's date is its date in CALIFORNIA (the league's time zone),
-- which is not always the database's current_date (UTC). This script names the date it means.
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
  tr_acct uuid := gen_random_uuid(); sc_acct uuid := gen_random_uuid(); ch_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  y1_acct uuid := gen_random_uuid(); y2_acct uuid := gen_random_uuid(); ad_acct uuid := gen_random_uuid();
  par1 uuid := gen_random_uuid(); par2 uuid := gen_random_uuid(); pend uuid := gen_random_uuid();
  l1 uuid; s1 uuid; d1 uuid; d2 uuid; tm1 uuid; tm2 uuid; tm3 uuid; tm4 uuid; loc uuid;
  um_y1 uuid; um_y2 uuid; um_ad uuid; um_np uuid; um_ac uuid;
  g1 uuid; g2 uuid; g3 uuid; g4 uuid; g5 uuid; g_old uuid;
  e_np uuid; e_y1 uuid; adj1 uuid; adj2 uuid; adj3 uuid; adj4 uuid; adj_bad uuid;
  p_id uuid; p_id2 uuid; pay_1 uuid; pay_2 uuid;
  j jsonb; n bigint; n0 bigint; v uuid;
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
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    select a, 'chk-' || stamp || '-' || i || '@example.org', now(), '{}'::jsonb
    from (values (tr_acct, 'tr'), (sc_acct, 'sc'), (ch_acct, 'ch'), (x_acct, 'x'), (y1_acct, 'y1'), (y2_acct, 'y2'),
                 (ad_acct, 'ad'), (par1, 'par1'), (par2, 'par2'), (pend, 'pend')) as t(a, i);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (tr_acct, sc_acct, ch_acct, x_acct, y1_acct, y2_acct, ad_acct, par1, par2);
  update public.profiles set display_name = 'CHK Treasurer ' || stamp where id = tr_acct;
  update public.profiles set display_name = 'CHK Parent One ' || stamp where id = par1;
  update public.profiles set display_name = 'CHK Parent Two ' || stamp where id = par2;
  insert into public.user_roles (user_id, role_id) values (tr_acct, 'treasurer'), (sc_acct, 'scheduler'), (ch_acct, 'umpire_chief'), (par1, 'parent_guardian');

  -- Set aside whatever REAL data is in this database, INSIDE this run, so it cannot change the
  -- counts below: "work out earnings" looks at every recorded arrival in the period, and a payroll
  -- collects everything waiting. (Everything is rolled back at the end; nothing real is changed.)
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
  insert into public.divisions (league_id, name) values (l1, 'CHK Pay One') returning id into d1;
  insert into public.divisions (league_id, name) values (l1, 'CHK Pay Two') returning id into d2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into tm2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T3', d2) returning id into tm3;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T4', d2) returning id into tm4;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Youth One ' || stamp, 'youth', y1_acct) returning id into um_y1;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Youth Two ' || stamp, 'youth', y2_acct) returning id into um_y2;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Adult ' || stamp, 'adult', ad_acct) returning id into um_ad;
  insert into public.umpires (display_name, classification) values ('CHK Youth NoPayee ' || stamp, 'youth') returning id into um_np;
  insert into public.umpires (display_name, classification) values ('CHK Adult NoAccount ' || stamp, 'adult') returning id into um_ac;

  -- the rates (set by the treasurer through the real function): youth plate $50, youth field $25, from 30 days ago
  perform set_config('request.jwt.claim.sub', tr_acct::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.set_pay_rates(ca - 30, jsonb_build_array(
    jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 5000),
    jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'field', 'amount_cents', 2500)));
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);


  -- games (a new game starts as a draft here, so say which are scheduled)
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, (((ca - 2)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles'), (((ca - 2)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles')) returning id into g1;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, (((ca - 1)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles'), (((ca - 1)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles')) returning id into g2;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, (((ca - 1)::timestamp + interval '15 hours') at time zone 'America/Los_Angeles'), (((ca - 1)::timestamp + interval '17 hours') at time zone 'America/Los_Angeles')) returning id into g3;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, (((ca - 3)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles'), (((ca - 3)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles')) returning id into g4;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d2, tm3, tm4, loc, (((ca - 2)::timestamp + interval '15 hours') at time zone 'America/Los_Angeles'), (((ca - 2)::timestamp + interval '17 hours') at time zone 'America/Los_Angeles')) returning id into g5;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at) values (s1, d1, tm1, tm2, loc, (((ca - 20)::timestamp + interval '12 hours') at time zone 'America/Los_Angeles'), (((ca - 20)::timestamp + interval '14 hours') at time zone 'America/Los_Angeles')) returning id into g_old;
  update public.games set status = 'scheduled' where id in (g1, g2, g4, g5, g_old);
  update public.games set status = 'canceled' where id = g3;

  insert into public.game_assignments (game_id, umpire_id, position) values
    (g1, um_y1, 'plate'), (g1, um_y2, 'field'), (g1, um_ad, 'first_base'),
    (g2, um_y1, 'field'), (g2, um_np, 'plate'),
    (g3, um_y1, 'plate'),
    (g4, um_y2, 'plate'), (g4, um_y1, 'field'),
    (g5, um_y1, 'plate'),
    (g_old, um_y1, 'plate');
  -- recorded arrivals: all of them, except the no-show and the one never marked (g4)
  update public.game_assignments set attendance = 'arrived', arrived_at = now() where (game_id, umpire_id) in ((g1, um_y1), (g1, um_y2), (g1, um_ad), (g2, um_y1), (g2, um_np), (g3, um_y1), (g5, um_y1), (g_old, um_y1));
  update public.game_assignments set attendance = 'no_show' where game_id = g4 and umpire_id = um_y2;

  ----------------------------------------------------------------
  -- 1. Who is paid (the payee)
  ----------------------------------------------------------------
  -- P1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_y1, par1);
    reset role;
    if (select payee_profile_id from public.umpires where id = um_y1) = par1 and (select count(*) from public.money_log where action = 'payee_changed' and detail like 'Payee for CHK Youth One%' and detail like '%none to CHK Parent One%') = 1 then report := array_append(report, ('PASS  P1  the treasurer can choose a parent as a youth umpire''s payee, and it is logged')::text); else report := array_append(report, ('FAIL  P1  the payee was not set')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P1  the payee was not set: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_y2, par1);
    reset role;
    if (select payee_profile_id from public.umpires where id = um_y2) = par1 then report := array_append(report, ('PASS  P2  a sibling can have the same payee (one family)')::text); else report := array_append(report, ('FAIL  P2  a sibling''s payee was not set')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P2  a sibling''s payee was not set: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P3
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n0 from public.money_log; perform public.set_umpire_payee(um_y2, par1); select count(*) into n from public.money_log;
    reset role;
    if n = n0 then report := array_append(report, ('PASS  P3  choosing the payee that is already set changes nothing and logs nothing')::text); else report := array_append(report, ('FAIL  P3  an unchanged payee was logged')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P3  an unchanged payee was logged: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_y2, par2); perform public.set_umpire_payee(um_y2, par1);
    reset role;
    if (select payee_profile_id from public.umpires where id = um_y2) = par1 and (select count(*) from public.money_log where action = 'payee_changed' and detail like '%CHK Parent One%to CHK Parent Two%') = 1 then report := array_append(report, ('PASS  P4  a super admin can change a payee too, and the log keeps who it was before')::text); else report := array_append(report, ('FAIL  P4  a super admin could not change a payee')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P4  a super admin could not change a payee: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_y1, y1_acct);
    reset role;
    report := array_append(report, ('FAIL  P5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be their own payee%' then report := array_append(report, ('PASS  P5  a youth umpire cannot be their own payee')::text); else report := array_append(report, ('FAIL  P5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_y1, pend);
    reset role;
    report := array_append(report, ('FAIL  P6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved account%' then report := array_append(report, ('PASS  P6  a payee must be an approved account')::text); else report := array_append(report, ('FAIL  P6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(gen_random_uuid(), par1);
    reset role;
    report := array_append(report, ('FAIL  P7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  P7  an unknown umpire is refused')::text); else report := array_append(report, ('FAIL  P7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_y1, gen_random_uuid());
    reset role;
    report := array_append(report, ('FAIL  P8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%approved account%' then report := array_append(report, ('PASS  P8  an unknown account is refused as a payee')::text); else report := array_append(report, ('FAIL  P8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P9
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_ad, ad_acct);
    reset role;
    if (select payee_profile_id from public.umpires where id = um_ad) = ad_acct then report := array_append(report, ('PASS  P9  an adult umpire can be their own payee')::text); else report := array_append(report, ('FAIL  P9  an adult could not be their own payee')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P9  an adult could not be their own payee: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: clear the adult's explicit payee again, to test the default)
  reset role;
  update public.umpires set payee_profile_id = null where id = um_ad;

  -- P10
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_np, par2);
    reset role;
    report := array_append(report, ('FAIL  P10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  P10  a scheduler cannot choose who is paid')::text); else report := array_append(report, ('FAIL  P10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P11
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_np, par2);
    reset role;
    report := array_append(report, ('FAIL  P11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  P11  an umpire chief cannot choose who is paid')::text); else report := array_append(report, ('FAIL  P11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P12
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_np, par2);
    reset role;
    report := array_append(report, ('FAIL  P12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  P12  an umpire cannot choose who is paid')::text); else report := array_append(report, ('FAIL  P12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P13
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_np, par2);
    reset role;
    report := array_append(report, ('FAIL  P13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  P13  an ordinary account cannot choose who is paid')::text); else report := array_append(report, ('FAIL  P13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P14
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.set_umpire_payee(um_np, par2);
    reset role;
    report := array_append(report, ('FAIL  P14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  P14  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  P14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P15
  begin
    reset role;
    null;
    reset role;
    if public.payee_for_umpire(um_ad) = ad_acct and public.payee_for_umpire(um_y1) = par1 and public.payee_for_umpire(um_np) is null and public.payee_for_umpire(um_ac) is null then report := array_append(report, ('PASS  P15  an adult is their own payee by default; a youth with no payee has none; an adult with no account has none')::text); else report := array_append(report, ('FAIL  P15  the default payee was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P15  the default payee was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P16
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.payee_for_umpire(um_y1);
    reset role;
    report := array_append(report, ('FAIL  P16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  P16  the lookup is only for the system, not for the treasurer to call directly')::text); else report := array_append(report, ('FAIL  P16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payments_umpire_list() where umpire_id in (um_y1, um_y2, um_ad, um_np, um_ac);
    reset role;
    if n = 5 and (select payee_id from public.payments_umpire_list() where umpire_id = um_y1) = par1 and (select effective_payee_name from public.payments_umpire_list() where umpire_id = um_y1) = 'CHK Parent One ' || stamp then report := array_append(report, ('PASS  L1  the treasurer''s umpire list shows each umpire with their payee')::text); else report := array_append(report, ('FAIL  L1  the umpire list was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L1  the umpire list was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    null;
    reset role;
    if (select payee_id from public.payments_umpire_list() where umpire_id = um_ad) is null and (select effective_payee_id from public.payments_umpire_list() where umpire_id = um_ad) = ad_acct and (select effective_payee_id from public.payments_umpire_list() where umpire_id = um_np) is null and (select has_account from public.payments_umpire_list() where umpire_id = um_np) = false and (select has_account from public.payments_umpire_list() where umpire_id = um_y1) = true then report := array_append(report, ('PASS  L2  an adult with no payee chosen shows themselves as the payee; a youth with none shows none; the list says who has an account')::text); else report := array_append(report, ('FAIL  L2  the default payee or account flag was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L2  the default payee or account flag was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L3
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payee_candidates() where profile_id in (par1, par2, ad_acct);
    reset role;
    if n = 3 and (select is_parent from public.payee_candidates() where profile_id = par1) = true and (select is_parent from public.payee_candidates() where profile_id = par2) = false then report := array_append(report, ('PASS  L3  the payee candidates are approved accounts, with parents marked')::text); else report := array_append(report, ('FAIL  L3  the candidate list was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L3  the candidate list was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L4
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payee_candidates() where profile_id = pend;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  L4  an account that is not approved is not offered as a payee')::text); else report := array_append(report, ('FAIL  L4  an unapproved account was offered')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L4  an unapproved account was offered: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select (array_agg(profile_id order by ord))[1] into v from (select profile_id, row_number() over () as ord from public.payee_candidates()) c;
    reset role;
    if (select is_parent from public.payee_candidates() limit 1) then report := array_append(report, ('PASS  L5  parents and guardians come first in the list')::text); else report := array_append(report, ('FAIL  L5  the list did not put parents first')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L5  the list did not put parents first: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L6
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payments_umpire_list();
    reset role;
    report := array_append(report, ('FAIL  L6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L6  a scheduler cannot see the umpire list')::text); else report := array_append(report, ('FAIL  L6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L10
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payee_candidates();
    reset role;
    report := array_append(report, ('FAIL  L10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L10  ...or the candidate list')::text); else report := array_append(report, ('FAIL  L10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L7
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payments_umpire_list();
    reset role;
    report := array_append(report, ('FAIL  L7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L7  an umpire chief cannot see the umpire list')::text); else report := array_append(report, ('FAIL  L7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L11
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payee_candidates();
    reset role;
    report := array_append(report, ('FAIL  L11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L11  ...or the candidate list')::text); else report := array_append(report, ('FAIL  L11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L8
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payments_umpire_list();
    reset role;
    report := array_append(report, ('FAIL  L8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L8  an umpire cannot see the umpire list')::text); else report := array_append(report, ('FAIL  L8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L12
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payee_candidates();
    reset role;
    report := array_append(report, ('FAIL  L12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L12  ...or the candidate list')::text); else report := array_append(report, ('FAIL  L12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L9
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payments_umpire_list();
    reset role;
    report := array_append(report, ('FAIL  L9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L9  an ordinary account cannot see the umpire list')::text); else report := array_append(report, ('FAIL  L9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L13
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform * from public.payee_candidates();
    reset role;
    report := array_append(report, ('FAIL  L13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  L13  ...or the candidate list')::text); else report := array_append(report, ('FAIL  L13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L14
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.payments_umpire_list();
    reset role;
    report := array_append(report, ('FAIL  L14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L14  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  L14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L15
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform * from public.payee_candidates();
    reset role;
    report := array_append(report, ('FAIL  L15  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  L15  ...or the candidates')::text); else report := array_append(report, ('FAIL  L15  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 2. Working out earnings from recorded arrivals
  ----------------------------------------------------------------
  -- G1
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  G1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  G1  a scheduler cannot work out earnings')::text); else report := array_append(report, ('FAIL  G1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G2
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  G2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  G2  an umpire chief cannot work out earnings')::text); else report := array_append(report, ('FAIL  G2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G3
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  G3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  G3  an umpire cannot work out earnings')::text); else report := array_append(report, ('FAIL  G3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  G4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  G4  an ordinary account cannot work out earnings')::text); else report := array_append(report, ('FAIL  G4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G5
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.generate_earnings(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  G5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  G5  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  G5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(null, ca);
    reset role;
    report := array_append(report, ('FAIL  G6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Choose a start date%' then report := array_append(report, ('PASS  G6  a missing date is refused')::text); else report := array_append(report, ('FAIL  G6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(ca, ca - 1);
    reset role;
    report := array_append(report, ('FAIL  G7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Choose a start date%' then report := array_append(report, ('PASS  G7  an end before the start is refused')::text); else report := array_append(report, ('FAIL  G7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(ca - 401, ca);
    reset role;
    report := array_append(report, ('FAIL  G8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 400 days%' then report := array_append(report, ('PASS  G8  a period over 400 days is refused')::text); else report := array_append(report, ('FAIL  G8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G9
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.generate_earnings(ca - 5, ca + 1);
    reset role;
    report := array_append(report, ('FAIL  G9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%cannot be in the future%' then report := array_append(report, ('PASS  G9  an end date in the future is refused (those games have not been played)')::text); else report := array_append(report, ('FAIL  G9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- G10
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.generate_earnings(ca - 10, ca) into j;
    reset role;
    if (j ->> 'created')::bigint = 4 and (j ->> 'total_cents')::bigint = 15000 and (j ->> 'no_rate')::bigint = 2 then report := array_append(report, ('PASS  G10  the treasurer works out earnings: 4 earned ($50 + $25 + $25 + $50 = $150.00), and 2 arrivals had no rate')::text); else report := array_append(report, ('FAIL  G10  the earnings were not worked out as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G10  the earnings were not worked out as expected: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- G11
  begin
    reset role;
    select count(*) into n from public.earnings where game_id in (g3, g4, g_old);
    reset role;
    if n = 0 then report := array_append(report, ('PASS  G11  nothing is earned on a canceled game, by a no-show, by someone never marked, or outside the period')::text); else report := array_append(report, ('FAIL  G11  an earning was created for a game that should not pay')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G11  an earning was created for a game that should not pay: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- G12
  begin
    reset role;
    select count(*) into n from public.earnings where umpire_id = um_ad;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  G12  an adult at a place with no adult rate earns nothing (and is reported as no rate)')::text); else report := array_append(report, ('FAIL  G12  an unpaid adult earned something')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G12  an unpaid adult earned something: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- G13
  begin
    reset role;
    select id into e_y1 from public.earnings where game_id = g1 and umpire_id = um_y1;
    reset role;
    if (select amount_cents from public.earnings where id = e_y1) = 5000 and (select position from public.earnings where id = e_y1) = 'plate' and (select classification from public.earnings where id = e_y1) = 'youth' and (select game_date from public.earnings where id = e_y1) = ca - 2 and (select division_name from public.earnings where id = e_y1) = 'CHK Pay One' and (select payroll_id from public.earnings where id = e_y1) is null then report := array_append(report, ('PASS  G13  an earning records the amount, place, kind, the game''s California date, and the division')::text); else report := array_append(report, ('FAIL  G13  an earning''s details were wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G13  an earning''s details were wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- G14
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.generate_earnings(ca - 10, ca) into j;
    reset role;
    if (j ->> 'created')::bigint = 0 and (select count(*) from public.earnings where umpire_id in (um_y1, um_y2, um_np)) = 4 then report := array_append(report, ('PASS  G14  running it again adds nothing new (no one is paid twice)')::text); else report := array_append(report, ('FAIL  G14  an earning was created twice')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G14  an earning was created twice: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the rate for youth plate goes UP, from today)
  reset role;
  perform set_config('request.jwt.claim.sub', tr_acct::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 9000)));
  reset role;

  -- G15
  begin
    reset role;
    null;
    reset role;
    if (select amount_cents from public.earnings where id = e_y1) = 5000 then report := array_append(report, ('PASS  G15  a later rate change does not change what was already earned (the amount was snapshotted)')::text); else report := array_append(report, ('FAIL  G15  an earning changed when the rate changed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G15  an earning changed when the rate changed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: a rate for the other division is set, from 30 days ago)
  reset role;
  perform set_config('request.jwt.claim.sub', tr_acct::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.set_pay_rates(ca - 30, jsonb_build_array(jsonb_build_object('division_id', d2, 'classification', 'youth', 'position', 'plate', 'amount_cents', 3000)));
  reset role;

  -- G16
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.generate_earnings(ca - 10, ca) into j;
    reset role;
    if (j ->> 'created')::bigint = 1 and (j ->> 'total_cents')::bigint = 3000 and (j ->> 'no_rate')::bigint = 1 then report := array_append(report, ('PASS  G16  an arrival that had no rate is picked up once a rate is set for its date ($30.00)')::text); else report := array_append(report, ('FAIL  G16  a late rate was not picked up')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G16  a late rate was not picked up: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- G17
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.generate_earnings(ca - 25, ca) into j;
    reset role;
    if (j ->> 'created')::bigint = 1 and (select amount_cents from public.earnings where game_id = g_old) = 5000 then report := array_append(report, ('PASS  G17  a wider period picks up the older game too, at the rate in effect on ITS date ($50.00, not the new $90.00)')::text); else report := array_append(report, ('FAIL  G17  an older game was priced at today''s rate')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G17  an older game was priced at today''s rate: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: the old game's earning is put aside so it does not mix into the payroll below)
  reset role;
  delete from public.earnings where game_id = g_old;

  -- G18
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.money_log where action = 'earnings_generated' and actor_name like 'CHK %' || stamp || '%') >= 4 then report := array_append(report, ('PASS  G18  each run is in the money log')::text); else report := array_append(report, ('FAIL  G18  a run was not logged')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  G18  a run was not logged: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 3. Voiding an earning, and adjustments
  ----------------------------------------------------------------
  reset role;
  select id into e_np from public.earnings where game_id = g2 and umpire_id = um_np;

  -- V1
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, 'x');
    reset role;
    report := array_append(report, ('FAIL  V1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  V1  a scheduler cannot void an earning')::text); else report := array_append(report, ('FAIL  V1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V2
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, 'x');
    reset role;
    report := array_append(report, ('FAIL  V2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  V2  an umpire chief cannot void an earning')::text); else report := array_append(report, ('FAIL  V2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V3
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, 'x');
    reset role;
    report := array_append(report, ('FAIL  V3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  V3  an umpire cannot void an earning')::text); else report := array_append(report, ('FAIL  V3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, 'x');
    reset role;
    report := array_append(report, ('FAIL  V4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  V4  an ordinary account cannot void an earning')::text); else report := array_append(report, ('FAIL  V4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, '   ');
    reset role;
    report := array_append(report, ('FAIL  V5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Give a reason%' then report := array_append(report, ('PASS  V5  a reason is required')::text); else report := array_append(report, ('FAIL  V5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, repeat('x', 201));
    reset role;
    report := array_append(report, ('FAIL  V6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Give a reason%' then report := array_append(report, ('PASS  V6  ...of at most 200 characters')::text); else report := array_append(report, ('FAIL  V6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(gen_random_uuid(), 'x');
    reset role;
    report := array_append(report, ('FAIL  V7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  V7  an unknown earning is refused')::text); else report := array_append(report, ('FAIL  V7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, 'Did not actually umpire');
    reset role;
    if (select voided_at from public.earnings where id = e_np) is not null and (select void_reason from public.earnings where id = e_np) = 'Did not actually umpire' and (select voided_by_name from public.earnings where id = e_np) = 'CHK Treasurer ' || stamp then report := array_append(report, ('PASS  V8  the treasurer can void an earning with a reason; it keeps who and why')::text); else report := array_append(report, ('FAIL  V8  the earning was not voided')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V8  the earning was not voided: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V9
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning(e_np, 'again');
    reset role;
    report := array_append(report, ('FAIL  V9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already voided%' then report := array_append(report, ('PASS  V9  it cannot be voided twice')::text); else report := array_append(report, ('FAIL  V9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V10
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.generate_earnings(ca - 10, ca) into j;
    reset role;
    if (j ->> 'created')::bigint = 0 then report := array_append(report, ('PASS  V10  a voided earning is not worked out again')::text); else report := array_append(report, ('FAIL  V10  a voided earning came back')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V10  a voided earning came back: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_adjustment(um_y2, g1, 1000, 'Worked a second game as a substitute') into adj1;
    reset role;
    if (select amount_cents from public.earning_adjustments where id = adj1) = 1000 and (select created_by_name from public.earning_adjustments where id = adj1) = 'CHK Treasurer ' || stamp then report := array_append(report, ('PASS  A1  an adjustment (+$10.00 for a substitute game) is recorded with who made it')::text); else report := array_append(report, ('FAIL  A1  the adjustment was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A1  the adjustment was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_adjustment(um_y1, null, -500, 'Fee for a lost whistle') into adj2;
    reset role;
    if (select amount_cents from public.earning_adjustments where id = adj2) = -500 and (select game_id from public.earning_adjustments where id = adj2) is null then report := array_append(report, ('PASS  A2  a negative adjustment with no game is allowed (a super admin here)')::text); else report := array_append(report, ('FAIL  A2  a negative adjustment was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A2  a negative adjustment was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A3
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_adjustment(um_np, null, 2000, 'Tournament bonus') into adj3;
    reset role;
    if adj3 is not null then report := array_append(report, ('PASS  A3  an adjustment can be for an umpire with no payee yet')::text); else report := array_append(report, ('FAIL  A3  an adjustment was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A3  an adjustment was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A4
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, 0, 'zero');
    reset role;
    report := array_append(report, ('FAIL  A4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not zero%' then report := array_append(report, ('PASS  A4  a zero adjustment is refused')::text); else report := array_append(report, ('FAIL  A4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, 100001, 'big');
    reset role;
    report := array_append(report, ('FAIL  A5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%between -$1000.00 and $1000.00%' then report := array_append(report, ('PASS  A5  an adjustment over $1000.00 is refused')::text); else report := array_append(report, ('FAIL  A5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, -100001, 'big');
    reset role;
    report := array_append(report, ('FAIL  A6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%between -$1000.00 and $1000.00%' then report := array_append(report, ('PASS  A6  ...in either direction')::text); else report := array_append(report, ('FAIL  A6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, null, 'x');
    reset role;
    report := array_append(report, ('FAIL  A7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not zero%' then report := array_append(report, ('PASS  A7  a missing amount is refused')::text); else report := array_append(report, ('FAIL  A7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, 100, '  ');
    reset role;
    report := array_append(report, ('FAIL  A8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Give a reason%' then report := array_append(report, ('PASS  A8  a reason is required')::text); else report := array_append(report, ('FAIL  A8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A9
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(gen_random_uuid(), null, 100, 'x');
    reset role;
    report := array_append(report, ('FAIL  A9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  A9  an unknown umpire is refused')::text); else report := array_append(report, ('FAIL  A9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A10
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, gen_random_uuid(), 100, 'x');
    reset role;
    report := array_append(report, ('FAIL  A10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%game does not exist%' then report := array_append(report, ('PASS  A10  an unknown game is refused')::text); else report := array_append(report, ('FAIL  A10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A11
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, 100, 'x');
    reset role;
    report := array_append(report, ('FAIL  A11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  A11  a scheduler cannot add an adjustment')::text); else report := array_append(report, ('FAIL  A11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A12
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, 100, 'x');
    reset role;
    report := array_append(report, ('FAIL  A12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  A12  an umpire chief cannot add an adjustment')::text); else report := array_append(report, ('FAIL  A12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A13
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, 100, 'x');
    reset role;
    report := array_append(report, ('FAIL  A13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  A13  an umpire cannot add an adjustment')::text); else report := array_append(report, ('FAIL  A13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A14
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.add_adjustment(um_y1, null, 100, 'x');
    reset role;
    report := array_append(report, ('FAIL  A14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  A14  an ordinary account cannot add an adjustment')::text); else report := array_append(report, ('FAIL  A14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A15
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_adjustment(um_y1, null, 700, 'A mistake, to be voided') into adj_bad; perform public.void_adjustment(adj_bad);
    reset role;
    if (select voided_at is not null and voided_by_name = 'CHK Treasurer ' || stamp from public.earning_adjustments where id = adj_bad) then report := array_append(report, ('PASS  A15  an adjustment can be voided')::text); else report := array_append(report, ('FAIL  A15  an adjustment was not voided')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A15  an adjustment was not voided: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A16
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_adjustment(adj_bad);
    reset role;
    report := array_append(report, ('FAIL  A16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already voided%' then report := array_append(report, ('PASS  A16  ...but not twice')::text); else report := array_append(report, ('FAIL  A16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A17
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_adjustment(adj1);
    reset role;
    report := array_append(report, ('FAIL  A17  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  A17  a scheduler cannot void an adjustment')::text); else report := array_append(report, ('FAIL  A17  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 4. Creating a payroll
  ----------------------------------------------------------------
  -- C1
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  C1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C1  a scheduler cannot create a payroll')::text); else report := array_append(report, ('FAIL  C1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C2
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  C2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C2  an umpire chief cannot create a payroll')::text); else report := array_append(report, ('FAIL  C2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C3
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  C3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C3  an umpire cannot create a payroll')::text); else report := array_append(report, ('FAIL  C3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C4
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  C4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C4  an ordinary account cannot create a payroll')::text); else report := array_append(report, ('FAIL  C4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca, ca - 1);
    reset role;
    report := array_append(report, ('FAIL  C5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Choose a start date%' then report := array_append(report, ('PASS  C5  an end before the start is refused')::text); else report := array_append(report, ('FAIL  C5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 500, ca);
    reset role;
    report := array_append(report, ('FAIL  C6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 400 days%' then report := array_append(report, ('PASS  C6  a period over 400 days is refused')::text); else report := array_append(report, ('FAIL  C6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 10, ca, repeat('x', 201));
    reset role;
    report := array_append(report, ('FAIL  C7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 200 characters%' then report := array_append(report, ('PASS  C7  a note over 200 characters is refused')::text); else report := array_append(report, ('FAIL  C7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.create_payroll(ca - 10, ca, 'October') into p_id;
    reset role;
    if (select status from public.payrolls where id = p_id) = 'draft' and (select note from public.payrolls where id = p_id) = 'October' and (select count(*) from public.earnings where payroll_id = p_id) = 4 and (select count(*) from public.earning_adjustments where payroll_id = p_id) = 3 then report := array_append(report, ('PASS  C8  the treasurer creates a draft payroll with the 4 unpaid earnings (the voided one is left out) and the 3 open adjustments')::text); else report := array_append(report, ('FAIL  C8  the payroll did not collect the right items')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C8  the payroll did not collect the right items: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C9
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.payroll_lines where payroll_id = p_id) = 3 and (select earned_cents from public.payroll_lines where payroll_id = p_id and umpire_id = um_y1) = 10500 and (select adjustments_cents from public.payroll_lines where payroll_id = p_id and umpire_id = um_y1) = -500 and (select total_cents from public.payroll_lines where payroll_id = p_id and umpire_id = um_y1) = 10000 and (select games from public.payroll_lines where payroll_id = p_id and umpire_id = um_y1) = 3 then report := array_append(report, ('PASS  C9  each umpire gets a line: Youth One earned $105.00 (3 games) less $5.00 = $100.00')::text); else report := array_append(report, ('FAIL  C9  an umpire''s line was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C9  an umpire''s line was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C10
  begin
    reset role;
    null;
    reset role;
    if (select total_cents from public.payroll_lines where payroll_id = p_id and umpire_id = um_y2) = 3500 and (select total_cents from public.payroll_lines where payroll_id = p_id and umpire_id = um_np) = 2000 and (select payee_profile_id from public.payroll_lines where payroll_id = p_id and umpire_id = um_np) is null then report := array_append(report, ('PASS  C10  Youth Two is $35.00 ($25 + $10); the umpire with no payee is $20.00 and marked as having none')::text); else report := array_append(report, ('FAIL  C10  a line was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C10  a line was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C11
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.payroll_payments where payroll_id = p_id) = 1 and (select amount_cents from public.payroll_payments where payroll_id = p_id and payee_profile_id = par1) = 13500 and (select umpire_count from public.payroll_payments where payroll_id = p_id and payee_profile_id = par1) = 2 and (select status from public.payroll_payments where payroll_id = p_id and payee_profile_id = par1) = 'pending' and (select total_cents from public.payrolls where id = p_id) = 15500 then report := array_append(report, ('PASS  C11  the two siblings are paid as ONE family payment of $135.00 to their parent; the payroll total is $155.00 (including the $20.00 that has no payee yet)')::text); else report := array_append(report, ('FAIL  C11  the family payment was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C11  the family payment was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C12
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  C12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Approve or discard the payroll in progress%' then report := array_append(report, ('PASS  C12  only one payroll can be in progress at a time')::text); else report := array_append(report, ('FAIL  C12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C13
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning((select id from public.earnings where payroll_id = p_id limit 1), 'x');
    reset role;
    report := array_append(report, ('FAIL  C13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already in a payroll%' then report := array_append(report, ('PASS  C13  an earning in a payroll cannot be voided (discard the payroll, or adjust)')::text); else report := array_append(report, ('FAIL  C13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C14
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_adjustment(adj1);
    reset role;
    report := array_append(report, ('FAIL  C14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already in a payroll%' then report := array_append(report, ('PASS  C14  nor an adjustment')::text); else report := array_append(report, ('FAIL  C14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C15
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment((select id from public.payroll_payments where payroll_id = p_id limit 1), 'check');
    reset role;
    report := array_append(report, ('FAIL  C15  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%once the payroll is approved%' then report := array_append(report, ('PASS  C15  nothing can be recorded as paid before the payroll is approved')::text); else report := array_append(report, ('FAIL  C15  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C16
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%have no payee yet: CHK Youth NoPayee%' then report := array_append(report, ('PASS  C16  approving is refused while an umpire has no payee, and it names who')::text); else report := array_append(report, ('FAIL  C16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C17
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_umpire_payee(um_np, par2);
    reset role;
    if (select status from public.payrolls where id = p_id) = 'draft' then report := array_append(report, ('PASS  C17  after choosing that payee, the payroll is still a draft')::text); else report := array_append(report, ('FAIL  C17  the payroll changed state')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C17  the payroll changed state: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C18
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id);
    reset role;
    if (select status from public.payrolls where id = p_id) = 'approved' and (select approved_by_name from public.payrolls where id = p_id) = 'CHK Treasurer ' || stamp and (select approved_at from public.payrolls where id = p_id) is not null then report := array_append(report, ('PASS  C18  approving works (any super admin or the treasurer), and records who and when')::text); else report := array_append(report, ('FAIL  C18  approval did not work')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C18  approval did not work: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C19
  begin
    reset role;
    select id into pay_1 from public.payroll_payments where payroll_id = p_id and payee_profile_id = par1; select id into pay_2 from public.payroll_payments where payroll_id = p_id and payee_profile_id = par2;
    reset role;
    if (select count(*) from public.payroll_payments where payroll_id = p_id) = 2 and (select amount_cents from public.payroll_payments where payroll_id = p_id and payee_profile_id = par1) = 13500 and (select amount_cents from public.payroll_payments where payroll_id = p_id and payee_profile_id = par2) = 2000 and (select total_cents from public.payrolls where id = p_id) = 15500 then report := array_append(report, ('PASS  C19  approval picked up the new payee: two payments, $135.00 and $20.00 ($155.00 in all)')::text); else report := array_append(report, ('FAIL  C19  the payments were wrong after approval')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C19  the payments were wrong after approval: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C20
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C20  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a draft payroll%' then report := array_append(report, ('PASS  C20  an approved payroll cannot be approved again')::text); else report := array_append(report, ('FAIL  C20  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C21
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.discard_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C21  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%has not been approved%' then report := array_append(report, ('PASS  C21  an approved payroll cannot be discarded')::text); else report := array_append(report, ('FAIL  C21  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C22
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_earning((select id from public.earnings where payroll_id = p_id limit 1), 'x');
    reset role;
    report := array_append(report, ('FAIL  C22  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already in a payroll%' then report := array_append(report, ('PASS  C22  an earning in an approved payroll cannot be voided')::text); else report := array_append(report, ('FAIL  C22  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C23
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.create_payroll(ca - 10, ca);
    reset role;
    report := array_append(report, ('FAIL  C23  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%nothing to pay%' then report := array_append(report, ('PASS  C23  with everything paid out, a new payroll for the period has nothing in it')::text); else report := array_append(report, ('FAIL  C23  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C24
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C24  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C24  a scheduler cannot approve')::text); else report := array_append(report, ('FAIL  C24  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C25
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C25  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C25  an umpire chief cannot approve')::text); else report := array_append(report, ('FAIL  C25  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C26
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C26  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C26  an umpire cannot approve')::text); else report := array_append(report, ('FAIL  C26  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C27
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C27  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  C27  an ordinary account cannot approve')::text); else report := array_append(report, ('FAIL  C27  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C28
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.approve_payroll(p_id);
    reset role;
    report := array_append(report, ('FAIL  C28  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C28  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  C28  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C29
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(gen_random_uuid());
    reset role;
    report := array_append(report, ('FAIL  C29  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  C29  an unknown payroll is refused')::text); else report := array_append(report, ('FAIL  C29  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C30
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.discard_payroll(gen_random_uuid());
    reset role;
    report := array_append(report, ('FAIL  C30  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  C30  ...for discarding too')::text); else report := array_append(report, ('FAIL  C30  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 5. Recording payments
  ----------------------------------------------------------------
  -- R1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'bitcoin');
    reset role;
    report := array_append(report, ('FAIL  R1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Choose how it was paid%' then report := array_append(report, ('PASS  R1  a payment method must be one of the listed ones')::text); else report := array_append(report, ('FAIL  R1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, null);
    reset role;
    report := array_append(report, ('FAIL  R2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Choose how it was paid%' then report := array_append(report, ('PASS  R2  ...and cannot be missing')::text); else report := array_append(report, ('FAIL  R2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'check', repeat('x', 101));
    reset role;
    report := array_append(report, ('FAIL  R3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most 100 characters%' then report := array_append(report, ('PASS  R3  a reference over 100 characters is refused')::text); else report := array_append(report, ('FAIL  R3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R4
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'check');
    reset role;
    report := array_append(report, ('FAIL  R4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R4  a scheduler cannot record a payment')::text); else report := array_append(report, ('FAIL  R4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'check');
    reset role;
    report := array_append(report, ('FAIL  R5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R5  an umpire chief cannot record a payment')::text); else report := array_append(report, ('FAIL  R5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R6
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'check');
    reset role;
    report := array_append(report, ('FAIL  R6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R6  an umpire cannot record a payment')::text); else report := array_append(report, ('FAIL  R6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R7
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'check');
    reset role;
    report := array_append(report, ('FAIL  R7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R7  an ordinary account cannot record a payment')::text); else report := array_append(report, ('FAIL  R7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(gen_random_uuid(), 'check');
    reset role;
    report := array_append(report, ('FAIL  R8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  R8  an unknown payment is refused')::text); else report := array_append(report, ('FAIL  R8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R9
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'check', ' Check 1042 ');
    reset role;
    if (select status from public.payroll_payments where id = pay_1) = 'paid' and (select method from public.payroll_payments where id = pay_1) = 'check' and (select reference from public.payroll_payments where id = pay_1) = 'Check 1042' and (select paid_by_name from public.payroll_payments where id = pay_1) = 'CHK Treasurer ' || stamp and (select paid_at from public.payroll_payments where id = pay_1) is not null and (select status from public.payrolls where id = p_id) = 'approved' then report := array_append(report, ('PASS  R9  a payment is recorded with the method, the reference, who and when; the payroll stays approved while another is pending')::text); else report := array_append(report, ('FAIL  R9  the payment was not recorded properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R9  the payment was not recorded properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R10
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_1, 'cash');
    reset role;
    report := array_append(report, ('FAIL  R10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%already recorded as paid%' then report := array_append(report, ('PASS  R10  a payment cannot be recorded twice')::text); else report := array_append(report, ('FAIL  R10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R11
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.record_payment(pay_2, 'bank_transfer');
    reset role;
    if (select status from public.payroll_payments where id = pay_2) = 'paid' and (select reference from public.payroll_payments where id = pay_2) is null and (select status from public.payrolls where id = p_id) = 'paid' then report := array_append(report, ('PASS  R11  when every payment is recorded, the payroll becomes paid (a super admin here)')::text); else report := array_append(report, ('FAIL  R11  the payroll did not become paid')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R11  the payroll did not become paid: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R12
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.money_log where action = 'payment_recorded' and detail like '%CHK Parent%' || stamp || '%') = 2 and (select count(*) from public.money_log where action = 'payroll_approved' and actor_name like 'CHK %' || stamp || '%') = 1 and (select count(*) from public.money_log where action = 'payroll_created' and actor_name like 'CHK %' || stamp || '%') = 1 then report := array_append(report, ('PASS  R12  the log has each payment, the approval and the creation')::text); else report := array_append(report, ('FAIL  R12  the log is missing steps')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R12  the log is missing steps: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 6. A negative total, and discarding
  ----------------------------------------------------------------
  -- N1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_adjustment(um_y1, null, -5000, 'Recover an overpayment') into adj4;
    reset role;
    if adj4 is not null then report := array_append(report, ('PASS  N1  an adjustment bigger than what is owed is possible (recovering an overpayment)')::text); else report := array_append(report, ('FAIL  N1  the adjustment was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N1  the adjustment was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.create_payroll(ca - 10, ca, 'Next') into p_id2;
    reset role;
    if (select count(*) from public.payroll_lines where payroll_id = p_id2) = 1 and (select total_cents from public.payroll_lines where payroll_id = p_id2) = -5000 and (select count(*) from public.payroll_payments where payroll_id = p_id2) = 0 then report := array_append(report, ('PASS  N2  a payroll with only that adjustment has a line of -$50.00 and no payment (nothing is paid when the total is negative)')::text); else report := array_append(report, ('FAIL  N2  the negative payroll was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N2  the negative payroll was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N3
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.approve_payroll(p_id2);
    reset role;
    report := array_append(report, ('FAIL  N3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%is negative%' then report := array_append(report, ('PASS  N3  approving is refused while a family''s total is negative, and it names the family')::text); else report := array_append(report, ('FAIL  N3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- N4
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.discard_payroll(p_id2);
    reset role;
    if (select status from public.payrolls where id = p_id2) = 'discarded' and (select payroll_id from public.earning_adjustments where id = adj4) is null and (select count(*) from public.payroll_lines where payroll_id = p_id2) = 0 and (select count(*) from public.payroll_payments where payroll_id = p_id2) = 0 then report := array_append(report, ('PASS  N4  discarding releases the adjustment and removes the lines')::text); else report := array_append(report, ('FAIL  N4  discarding did not release the items')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N4  discarding did not release the items: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.discard_payroll(p_id2);
    reset role;
    report := array_append(report, ('FAIL  N5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%has not been approved%' then report := array_append(report, ('PASS  N5  a discarded payroll cannot be discarded again')::text); else report := array_append(report, ('FAIL  N5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- N6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.void_adjustment(adj4);
    reset role;
    if (select voided_at is not null from public.earning_adjustments where id = adj4) then report := array_append(report, ('PASS  N6  ...and the released adjustment can now be voided')::text); else report := array_append(report, ('FAIL  N6  the released adjustment could not be voided')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N6  the released adjustment could not be voided: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.add_adjustment(um_ad, null, 1500, 'Adult stipend') into adj_bad; select public.create_payroll(ca - 10, ca) into p_id2;
    reset role;
    if (select count(*) from public.payroll_payments where payroll_id = p_id2) = 1 and (select payee_profile_id from public.payroll_payments where payroll_id = p_id2) = ad_acct and (select amount_cents from public.payroll_payments where payroll_id = p_id2) = 1500 then report := array_append(report, ('PASS  N7  an adult with an account is paid into their own account (no payee needed)')::text); else report := array_append(report, ('FAIL  N7  the adult''s payment was wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N7  the adult''s payment was wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- N8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.discard_payroll(p_id2);
    reset role;
    if (select status from public.payrolls where id = p_id2) = 'discarded' then report := array_append(report, ('PASS  N8  (tidy-up: discarded)')::text); else report := array_append(report, ('FAIL  N8  the tidy-up failed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  N8  the tidy-up failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 7. Who can see any of it, and nobody writes directly
  ----------------------------------------------------------------
  -- S-earnings-1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earnings;
    reset role;
    if n > 0 then report := array_append(report, ('PASS  S-earnings-1  the treasurer reads earnings')::text); else report := array_append(report, ('FAIL  S-earnings-1  the treasurer could not read earnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earnings-1  the treasurer could not read earnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earnings-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earnings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earnings-sc  a scheduler sees no earnings')::text); else report := array_append(report, ('FAIL  S-earnings-sc  a scheduler read earnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earnings-sc  a scheduler read earnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earnings-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earnings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earnings-ch  an umpire chief sees no earnings')::text); else report := array_append(report, ('FAIL  S-earnings-ch  an umpire chief read earnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earnings-ch  an umpire chief read earnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earnings-y1
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earnings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earnings-y1  an umpire sees no earnings')::text); else report := array_append(report, ('FAIL  S-earnings-y1  an umpire read earnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earnings-y1  an umpire read earnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earnings-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earnings;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earnings-x_  an ordinary account sees no earnings')::text); else report := array_append(report, ('FAIL  S-earnings-x_  an ordinary account read earnings')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earnings-x_  an ordinary account read earnings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earnings-anon
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.earnings;
    reset role;
    report := array_append(report, ('FAIL  S-earnings-anon  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S-earnings-anon  a signed-out visitor cannot read earnings')::text); else report := array_append(report, ('FAIL  S-earnings-anon  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S-earning_adjustments-1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earning_adjustments;
    reset role;
    if n > 0 then report := array_append(report, ('PASS  S-earning_adjustments-1  the treasurer reads adjustments')::text); else report := array_append(report, ('FAIL  S-earning_adjustments-1  the treasurer could not read adjustments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earning_adjustments-1  the treasurer could not read adjustments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earning_adjustments-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earning_adjustments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earning_adjustments-sc  a scheduler sees no adjustments')::text); else report := array_append(report, ('FAIL  S-earning_adjustments-sc  a scheduler read adjustments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earning_adjustments-sc  a scheduler read adjustments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earning_adjustments-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earning_adjustments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earning_adjustments-ch  an umpire chief sees no adjustments')::text); else report := array_append(report, ('FAIL  S-earning_adjustments-ch  an umpire chief read adjustments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earning_adjustments-ch  an umpire chief read adjustments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earning_adjustments-y1
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earning_adjustments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earning_adjustments-y1  an umpire sees no adjustments')::text); else report := array_append(report, ('FAIL  S-earning_adjustments-y1  an umpire read adjustments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earning_adjustments-y1  an umpire read adjustments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earning_adjustments-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.earning_adjustments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-earning_adjustments-x_  an ordinary account sees no adjustments')::text); else report := array_append(report, ('FAIL  S-earning_adjustments-x_  an ordinary account read adjustments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-earning_adjustments-x_  an ordinary account read adjustments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-earning_adjustments-anon
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.earning_adjustments;
    reset role;
    report := array_append(report, ('FAIL  S-earning_adjustments-anon  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S-earning_adjustments-anon  a signed-out visitor cannot read adjustments')::text); else report := array_append(report, ('FAIL  S-earning_adjustments-anon  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S-payrolls-1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payrolls;
    reset role;
    if n > 0 then report := array_append(report, ('PASS  S-payrolls-1  the treasurer reads payrolls')::text); else report := array_append(report, ('FAIL  S-payrolls-1  the treasurer could not read payrolls')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payrolls-1  the treasurer could not read payrolls: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payrolls-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payrolls;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payrolls-sc  a scheduler sees no payrolls')::text); else report := array_append(report, ('FAIL  S-payrolls-sc  a scheduler read payrolls')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payrolls-sc  a scheduler read payrolls: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payrolls-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payrolls;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payrolls-ch  an umpire chief sees no payrolls')::text); else report := array_append(report, ('FAIL  S-payrolls-ch  an umpire chief read payrolls')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payrolls-ch  an umpire chief read payrolls: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payrolls-y1
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payrolls;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payrolls-y1  an umpire sees no payrolls')::text); else report := array_append(report, ('FAIL  S-payrolls-y1  an umpire read payrolls')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payrolls-y1  an umpire read payrolls: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payrolls-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payrolls;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payrolls-x_  an ordinary account sees no payrolls')::text); else report := array_append(report, ('FAIL  S-payrolls-x_  an ordinary account read payrolls')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payrolls-x_  an ordinary account read payrolls: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payrolls-anon
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.payrolls;
    reset role;
    report := array_append(report, ('FAIL  S-payrolls-anon  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S-payrolls-anon  a signed-out visitor cannot read payrolls')::text); else report := array_append(report, ('FAIL  S-payrolls-anon  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S-payroll_lines-1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_lines;
    reset role;
    if n > 0 then report := array_append(report, ('PASS  S-payroll_lines-1  the treasurer reads payroll lines')::text); else report := array_append(report, ('FAIL  S-payroll_lines-1  the treasurer could not read payroll lines')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_lines-1  the treasurer could not read payroll lines: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_lines-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_lines;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_lines-sc  a scheduler sees no payroll lines')::text); else report := array_append(report, ('FAIL  S-payroll_lines-sc  a scheduler read payroll lines')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_lines-sc  a scheduler read payroll lines: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_lines-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_lines;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_lines-ch  an umpire chief sees no payroll lines')::text); else report := array_append(report, ('FAIL  S-payroll_lines-ch  an umpire chief read payroll lines')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_lines-ch  an umpire chief read payroll lines: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_lines-y1
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_lines;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_lines-y1  an umpire sees no payroll lines')::text); else report := array_append(report, ('FAIL  S-payroll_lines-y1  an umpire read payroll lines')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_lines-y1  an umpire read payroll lines: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_lines-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_lines;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_lines-x_  an ordinary account sees no payroll lines')::text); else report := array_append(report, ('FAIL  S-payroll_lines-x_  an ordinary account read payroll lines')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_lines-x_  an ordinary account read payroll lines: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_lines-anon
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.payroll_lines;
    reset role;
    report := array_append(report, ('FAIL  S-payroll_lines-anon  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S-payroll_lines-anon  a signed-out visitor cannot read payroll lines')::text); else report := array_append(report, ('FAIL  S-payroll_lines-anon  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S-payroll_payments-1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_payments;
    reset role;
    if n > 0 then report := array_append(report, ('PASS  S-payroll_payments-1  the treasurer reads payments')::text); else report := array_append(report, ('FAIL  S-payroll_payments-1  the treasurer could not read payments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_payments-1  the treasurer could not read payments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_payments-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_payments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_payments-sc  a scheduler sees no payments')::text); else report := array_append(report, ('FAIL  S-payroll_payments-sc  a scheduler read payments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_payments-sc  a scheduler read payments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_payments-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_payments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_payments-ch  an umpire chief sees no payments')::text); else report := array_append(report, ('FAIL  S-payroll_payments-ch  an umpire chief read payments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_payments-ch  an umpire chief read payments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_payments-y1
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_payments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_payments-y1  an umpire sees no payments')::text); else report := array_append(report, ('FAIL  S-payroll_payments-y1  an umpire read payments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_payments-y1  an umpire read payments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_payments-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.payroll_payments;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-payroll_payments-x_  an ordinary account sees no payments')::text); else report := array_append(report, ('FAIL  S-payroll_payments-x_  an ordinary account read payments')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-payroll_payments-x_  an ordinary account read payments: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-payroll_payments-anon
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.payroll_payments;
    reset role;
    report := array_append(report, ('FAIL  S-payroll_payments-anon  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S-payroll_payments-anon  a signed-out visitor cannot read payments')::text); else report := array_append(report, ('FAIL  S-payroll_payments-anon  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S-money_log-1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.money_log;
    reset role;
    if n > 0 then report := array_append(report, ('PASS  S-money_log-1  the treasurer reads the money log')::text); else report := array_append(report, ('FAIL  S-money_log-1  the treasurer could not read the money log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-money_log-1  the treasurer could not read the money log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-money_log-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.money_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-money_log-sc  a scheduler sees no the money log')::text); else report := array_append(report, ('FAIL  S-money_log-sc  a scheduler read the money log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-money_log-sc  a scheduler read the money log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-money_log-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.money_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-money_log-ch  an umpire chief sees no the money log')::text); else report := array_append(report, ('FAIL  S-money_log-ch  an umpire chief read the money log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-money_log-ch  an umpire chief read the money log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-money_log-y1
  begin
    perform set_config('request.jwt.claim.sub', y1_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', y1_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.money_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-money_log-y1  an umpire sees no the money log')::text); else report := array_append(report, ('FAIL  S-money_log-y1  an umpire read the money log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-money_log-y1  an umpire read the money log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-money_log-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.money_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S-money_log-x_  an ordinary account sees no the money log')::text); else report := array_append(report, ('FAIL  S-money_log-x_  an ordinary account read the money log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S-money_log-x_  an ordinary account read the money log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S-money_log-anon
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.money_log;
    reset role;
    report := array_append(report, ('FAIL  S-money_log-anon  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S-money_log-anon  a signed-out visitor cannot read the money log')::text); else report := array_append(report, ('FAIL  S-money_log-anon  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-earnings-i
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents) values (g1, um_ad, 'plate', 'x', 'adult', ca, 100);
    reset role;
    report := array_append(report, ('FAIL  W-earnings-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-earnings-i  not even the treasurer can insert into earnings directly')::text); else report := array_append(report, ('FAIL  W-earnings-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-earnings-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.earnings set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-earnings-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-earnings-u  ...or update earnings')::text); else report := array_append(report, ('FAIL  W-earnings-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-earnings-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.earnings;
    reset role;
    report := array_append(report, ('FAIL  W-earnings-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-earnings-d  ...or delete from earnings, not even a super admin')::text); else report := array_append(report, ('FAIL  W-earnings-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-earning_adjustments-i
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.earning_adjustments (umpire_id, amount_cents, reason, created_by_name) values (um_y1, 100, 'x', 'x');
    reset role;
    report := array_append(report, ('FAIL  W-earning_adjustments-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-earning_adjustments-i  not even the treasurer can insert into earning_adjustments directly')::text); else report := array_append(report, ('FAIL  W-earning_adjustments-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-earning_adjustments-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.earning_adjustments set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-earning_adjustments-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-earning_adjustments-u  ...or update earning_adjustments')::text); else report := array_append(report, ('FAIL  W-earning_adjustments-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-earning_adjustments-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.earning_adjustments;
    reset role;
    report := array_append(report, ('FAIL  W-earning_adjustments-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-earning_adjustments-d  ...or delete from earning_adjustments, not even a super admin')::text); else report := array_append(report, ('FAIL  W-earning_adjustments-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-payrolls-i
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.payrolls (period_start, period_end, created_by_name) values (ca, ca, 'x');
    reset role;
    report := array_append(report, ('FAIL  W-payrolls-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-payrolls-i  not even the treasurer can insert into payrolls directly')::text); else report := array_append(report, ('FAIL  W-payrolls-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-payrolls-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.payrolls set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-payrolls-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-payrolls-u  ...or update payrolls')::text); else report := array_append(report, ('FAIL  W-payrolls-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-payrolls-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.payrolls;
    reset role;
    report := array_append(report, ('FAIL  W-payrolls-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-payrolls-d  ...or delete from payrolls, not even a super admin')::text); else report := array_append(report, ('FAIL  W-payrolls-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-payroll_payments-i
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.payroll_payments (payroll_id, payee_name, amount_cents, umpire_count) values (p_id, 'x', 100, 1);
    reset role;
    report := array_append(report, ('FAIL  W-payroll_payments-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-payroll_payments-i  not even the treasurer can insert into payroll_payments directly')::text); else report := array_append(report, ('FAIL  W-payroll_payments-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-payroll_payments-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.payroll_payments set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-payroll_payments-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-payroll_payments-u  ...or update payroll_payments')::text); else report := array_append(report, ('FAIL  W-payroll_payments-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-payroll_payments-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.payroll_payments;
    reset role;
    report := array_append(report, ('FAIL  W-payroll_payments-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-payroll_payments-d  ...or delete from payroll_payments, not even a super admin')::text); else report := array_append(report, ('FAIL  W-payroll_payments-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-money_log-i
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.money_log (action, detail, actor_name) values ('x', 'x', 'x');
    reset role;
    report := array_append(report, ('FAIL  W-money_log-i  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-money_log-i  not even the treasurer can insert into money_log directly')::text); else report := array_append(report, ('FAIL  W-money_log-i  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-money_log-u
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.money_log set id = id;
    reset role;
    report := array_append(report, ('FAIL  W-money_log-u  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-money_log-u  ...or update money_log')::text); else report := array_append(report, ('FAIL  W-money_log-u  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-money_log-d
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.money_log;
    reset role;
    report := array_append(report, ('FAIL  W-money_log-d  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-money_log-d  ...or delete from money_log, not even a super admin')::text); else report := array_append(report, ('FAIL  W-money_log-d  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-fn1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.rebuild_payroll_payments(p_id);
    reset role;
    report := array_append(report, ('FAIL  W-fn1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-fn1  the payroll rebuilder is only for the system')::text); else report := array_append(report, ('FAIL  W-fn1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W-fn2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.log_money('x', 'y');
    reset role;
    report := array_append(report, ('FAIL  W-fn2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W-fn2  nor can anyone write the money log by hand')::text); else report := array_append(report, ('FAIL  W-fn2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 8. The tables' own rules
  ----------------------------------------------------------------
  -- K1
  begin
    reset role;
    insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents) values (g1, um_y1, 'plate', 'x', 'youth', ca, 100);
    reset role;
    report := array_append(report, ('FAIL  K1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23505' then report := array_append(report, ('PASS  K1  one earning per umpire per game, enforced by the table')::text); else report := array_append(report, ('FAIL  K1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K2
  begin
    reset role;
    insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents) values (g2, um_ad, 'plate', 'x', 'adult', ca, 0);
    reset role;
    report := array_append(report, ('FAIL  K2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K2  an earning of $0 is refused by the table')::text); else report := array_append(report, ('FAIL  K2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K3
  begin
    reset role;
    insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents) values (g2, um_ad, 'plate', 'x', 'adult', ca, 100001);
    reset role;
    report := array_append(report, ('FAIL  K3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K3  ...and one over $1000.00')::text); else report := array_append(report, ('FAIL  K3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K4
  begin
    reset role;
    update public.earnings set voided_at = now() where id = e_y1;
    reset role;
    report := array_append(report, ('FAIL  K4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K4  an earning cannot be marked voided without saying who and why')::text); else report := array_append(report, ('FAIL  K4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K5
  begin
    reset role;
    insert into public.payrolls (period_start, period_end, created_by_name) values (ca, ca - 1, 'x');
    reset role;
    report := array_append(report, ('FAIL  K5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K5  a payroll cannot end before it starts')::text); else report := array_append(report, ('FAIL  K5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K6
  begin
    reset role;
    insert into public.payrolls (period_start, period_end, created_by_name, status) values (ca, ca, 'x', 'approved');
    reset role;
    report := array_append(report, ('FAIL  K6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K6  a payroll cannot be approved without an approval time')::text); else report := array_append(report, ('FAIL  K6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: one draft payroll exists)
  reset role;
  insert into public.payrolls (period_start, period_end, created_by_name) values (ca, ca, 'x');

  -- K7
  begin
    reset role;
    insert into public.payrolls (period_start, period_end, created_by_name) values (ca, ca, 'y');
    reset role;
    report := array_append(report, ('FAIL  K7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23505' then report := array_append(report, ('PASS  K7  only one draft payroll can exist at a time, enforced by the table')::text); else report := array_append(report, ('FAIL  K7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K8
  begin
    reset role;
    insert into public.payroll_payments (payroll_id, payee_name, amount_cents, umpire_count) values (p_id, 'x', 0, 1);
    reset role;
    report := array_append(report, ('FAIL  K8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K8  a payment of $0 is refused by the table')::text); else report := array_append(report, ('FAIL  K8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K9
  begin
    reset role;
    insert into public.payroll_payments (payroll_id, payee_name, amount_cents, umpire_count, status) values (p_id, 'x', 100, 1, 'paid');
    reset role;
    report := array_append(report, ('FAIL  K9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K9  a payment cannot be ''paid'' without a paid time')::text); else report := array_append(report, ('FAIL  K9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K10
  begin
    reset role;
    delete from public.games where id = g1;
    reset role;
    report := array_append(report, ('FAIL  K10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23503' then report := array_append(report, ('PASS  K10  a game that has earnings cannot be deleted')::text); else report := array_append(report, ('FAIL  K10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K11
  begin
    reset role;
    delete from public.umpires where id = um_y1;
    reset role;
    report := array_append(report, ('FAIL  K11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23503' then report := array_append(report, ('PASS  K11  nor an umpire who has earnings')::text); else report := array_append(report, ('FAIL  K11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nPAYROLL CHECK (nothing was paid and nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
