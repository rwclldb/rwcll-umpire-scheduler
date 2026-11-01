-- RWCLL check: pay rates (what each place pays per game).
--
-- Run in the Supabase SQL Editor AFTER applying 20261107100000_add_pay_rates.sql.
--
-- It builds its own divisions and sign-in accounts (including a treasurer, a
-- scheduler and an umpire chief), then acts as each of them, as a super admin, and
-- as a signed-out visitor. It ENDS WITH A RED ERROR on purpose: the report is
-- carried in the error message, and raising an error guarantees everything it
-- created is rolled back. Your real rates are not changed.
--
-- NOTE ON DATES: a rate's start date is judged by CALIFORNIA's date (the league's
-- time zone), which is not always the database's current_date (UTC). This script
-- names the date it means.
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
  tr_acct uuid := gen_random_uuid(); sc_acct uuid := gen_random_uuid(); ch_acct uuid := gen_random_uuid();
  a_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  l1 uuid; d1 uuid; d2 uuid; d_tmp uuid;
  n bigint; b boolean; v integer;
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
      (tr_acct, 'chk-' || stamp || '-tr@example.org', now(), '{}'::jsonb),
      (sc_acct, 'chk-' || stamp || '-sc@example.org', now(), '{}'::jsonb),
      (ch_acct, 'chk-' || stamp || '-ch@example.org', now(), '{}'::jsonb),
      (a_acct, 'chk-' || stamp || '-a@example.org', now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (tr_acct, sc_acct, ch_acct, a_acct, x_acct);
  update public.profiles set display_name = 'CHK Treasurer ' || stamp where id = tr_acct;
  insert into public.user_roles (user_id, role_id) values (tr_acct, 'treasurer'), (sc_acct, 'scheduler'), (ch_acct, 'umpire_chief');

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div One') returning id into d1;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div Two') returning id into d2;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div Temp') returning id into d_tmp;

  ----------------------------------------------------------------
  -- 1. Who manages pay rates
  ----------------------------------------------------------------
  -- M1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.is_payments_manager() into b;
    reset role;
    if b then report := array_append(report, ('PASS  M1  the treasurer manages pay rates')::text); else report := array_append(report, ('FAIL  M1  the treasurer was not a payments manager')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  M1  the treasurer was not a payments manager: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- M2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.is_payments_manager() into b;
    reset role;
    if b then report := array_append(report, ('PASS  M2  a super admin does too')::text); else report := array_append(report, ('FAIL  M2  a super admin was not a payments manager')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  M2  a super admin was not a payments manager: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- M3
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.is_payments_manager() into b;
    reset role;
    if not b then report := array_append(report, ('PASS  M3  a scheduler does not')::text); else report := array_append(report, ('FAIL  M3  a scheduler was a payments manager')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  M3  a scheduler was a payments manager: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- M4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.is_payments_manager() into b;
    reset role;
    if not b then report := array_append(report, ('PASS  M4  an umpire chief does not')::text); else report := array_append(report, ('FAIL  M4  an umpire chief was a payments manager')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  M4  an umpire chief was a payments manager: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- M5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.is_payments_manager() into b;
    reset role;
    if not b then report := array_append(report, ('PASS  M5  an umpire does not')::text); else report := array_append(report, ('FAIL  M5  an umpire was a payments manager')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  M5  an umpire was a payments manager: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- M6
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.is_payments_manager() into b;
    reset role;
    if not b then report := array_append(report, ('PASS  M6  an ordinary account does not')::text); else report := array_append(report, ('FAIL  M6  an ordinary account was a payments manager')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  M6  an ordinary account was a payments manager: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- M7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.is_payments_manager();
    reset role;
    report := array_append(report, ('FAIL  M7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  M7  a signed-out visitor cannot even ask')::text); else report := array_append(report, ('FAIL  M7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 2. Setting rates
  ----------------------------------------------------------------
  -- R1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 5000), jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'field', 'amount_cents', 2500))) into n;
    reset role;
    if n = 2 and (select amount_cents from public.pay_rates where division_id = d1 and classification = 'youth' and position = 'plate' and effective_on = ca) = 5000 and (select amount_cents from public.pay_rates where division_id = d1 and classification = 'youth' and position = 'field' and effective_on = ca) = 2500 then report := array_append(report, ('PASS  R1  the treasurer can set rates (a home plate youth umpire $50, a field one $25, in cents)')::text); else report := array_append(report, ('FAIL  R1  the rates were not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R1  the rates were not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R2
  begin
    reset role;
    null;
    reset role;
    if (select created_by_name from public.pay_rates where division_id = d1 and position = 'plate') = 'CHK Treasurer ' || stamp and (select count(*) from public.pay_rate_log where division_id in (d1, d2)) = 2 and (select count(*) from public.pay_rate_log where division_id = d1 and old_cents is null and new_cents in (5000, 2500) and changed_by_name = 'CHK Treasurer ' || stamp and division_name = 'CHK Div One') = 2 then report := array_append(report, ('PASS  R2  each is kept with who set it, and the log shows it was new (no old amount)')::text); else report := array_append(report, ('FAIL  R2  the rate was not logged properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R2  the rate was not logged properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R3
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 5000), jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'field', 'amount_cents', 2500))) into n;
    reset role;
    if n = 0 and (select count(*) from public.pay_rate_log where division_id in (d1, d2)) = 2 then report := array_append(report, ('PASS  R3  saving the same amounts again changes nothing and adds nothing to the log')::text); else report := array_append(report, ('FAIL  R3  an unchanged rate was logged again')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R3  an unchanged rate was logged again: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R4
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 5500))) into n;
    reset role;
    if n = 1 and (select amount_cents from public.pay_rates where division_id = d1 and classification = 'youth' and position = 'plate' and effective_on = ca) = 5500 and (select count(*) from public.pay_rate_log where division_id = d1 and position = 'plate' and old_cents = 5000 and new_cents = 5500) = 1 then report := array_append(report, ('PASS  R4  changing a rate for the same start date updates it, and the log keeps the old and new amounts')::text); else report := array_append(report, ('FAIL  R4  the change was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R4  the change was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'adult', 'position', 'plate', 'amount_cents', 0))) into n;
    reset role;
    if n = 1 and (select amount_cents from public.pay_rates where division_id = d1 and classification = 'adult' and position = 'plate' and effective_on = ca) = 0 then report := array_append(report, ('PASS  R5  an adult rate can be set (even to $0, so the slot is there for when adults are paid)')::text); else report := array_append(report, ('FAIL  R5  an adult rate was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R5  an adult rate was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d2, 'classification', 'youth', 'position', 'plate', 'amount_cents', 4000))) into n;
    reset role;
    if n = 1 and (select created_by_name from public.pay_rates where division_id = d2) is not null then report := array_append(report, ('PASS  R6  a super admin can set rates too')::text); else report := array_append(report, ('FAIL  R6  a super admin could not set a rate')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  R6  a super admin could not set a rate: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- R7
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 1)));
    reset role;
    report := array_append(report, ('FAIL  R7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R7  a scheduler cannot set rates')::text); else report := array_append(report, ('FAIL  R7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R8
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 1)));
    reset role;
    report := array_append(report, ('FAIL  R8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R8  an umpire chief cannot set rates')::text); else report := array_append(report, ('FAIL  R8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R9
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 1)));
    reset role;
    report := array_append(report, ('FAIL  R9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R9  an umpire cannot set rates')::text); else report := array_append(report, ('FAIL  R9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R10
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 1)));
    reset role;
    report := array_append(report, ('FAIL  R10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only the treasurer and super admins%' then report := array_append(report, ('PASS  R10  an ordinary account cannot set rates')::text); else report := array_append(report, ('FAIL  R10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- R11
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 1)));
    reset role;
    report := array_append(report, ('FAIL  R11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  R11  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  R11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 3. Rates must make sense
  ----------------------------------------------------------------
  -- V1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', gen_random_uuid(), 'classification', 'youth', 'position', 'plate', 'amount_cents', 100)));
    reset role;
    report := array_append(report, ('FAIL  V1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%does not exist%' then report := array_append(report, ('PASS  V1  a division that does not exist is refused')::text); else report := array_append(report, ('FAIL  V1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'teen', 'position', 'plate', 'amount_cents', 100)));
    reset role;
    report := array_append(report, ('FAIL  V2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%youth or adult%' then report := array_append(report, ('PASS  V2  a classification other than youth or adult is refused')::text); else report := array_append(report, ('FAIL  V2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V3
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'shortstop', 'amount_cents', 100)));
    reset role;
    report := array_append(report, ('FAIL  V3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%plate, first base%' then report := array_append(report, ('PASS  V3  an unknown place is refused')::text); else report := array_append(report, ('FAIL  V3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V4
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', -5)));
    reset role;
    report := array_append(report, ('FAIL  V4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%whole number of cents%' then report := array_append(report, ('PASS  V4  a negative amount is refused')::text); else report := array_append(report, ('FAIL  V4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V5
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 100001)));
    reset role;
    report := array_append(report, ('FAIL  V5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%at most%' then report := array_append(report, ('PASS  V5  an amount over $1000.00 is refused')::text); else report := array_append(report, ('FAIL  V5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V6
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 50.5)));
    reset role;
    report := array_append(report, ('FAIL  V6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%whole number of cents%' then report := array_append(report, ('PASS  V6  a fraction of a cent is refused')::text); else report := array_append(report, ('FAIL  V6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V7
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 'fifty')));
    reset role;
    report := array_append(report, ('FAIL  V7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%whole number of cents%' then report := array_append(report, ('PASS  V7  an amount that is text is refused')::text); else report := array_append(report, ('FAIL  V7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate')));
    reset role;
    report := array_append(report, ('FAIL  V8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%whole number of cents%' then report := array_append(report, ('PASS  V8  a rate with no amount is refused')::text); else report := array_append(report, ('FAIL  V8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V9
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca - 61, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 100)));
    reset role;
    report := array_append(report, ('FAIL  V9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%within the last 60 days%' then report := array_append(report, ('PASS  V9  a start date more than 60 days ago is refused (it could rewrite the past)')::text); else report := array_append(report, ('FAIL  V9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V10
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca + 366, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 100)));
    reset role;
    report := array_append(report, ('FAIL  V10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%within the last 60 days%' then report := array_append(report, ('PASS  V10  ...or more than a year ahead')::text); else report := array_append(report, ('FAIL  V10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V11
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(null, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 100)));
    reset role;
    report := array_append(report, ('FAIL  V11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%within the last 60 days%' then report := array_append(report, ('PASS  V11  a missing start date is refused')::text); else report := array_append(report, ('FAIL  V11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V12
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_object('a', 1));
    reset role;
    report := array_append(report, ('FAIL  V12  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%must be a list%' then report := array_append(report, ('PASS  V12  the rates must be a list')::text); else report := array_append(report, ('FAIL  V12  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V13
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(1, 2));
    reset role;
    report := array_append(report, ('FAIL  V13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Each rate must have%' then report := array_append(report, ('PASS  V13  each entry must be a full rate')::text); else report := array_append(report, ('FAIL  V13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V14
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, (select jsonb_agg(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', i)) from generate_series(1, 501) as i));
    reset role;
    report := array_append(report, ('FAIL  V14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%the most is 500%' then report := array_append(report, ('PASS  V14  more than 500 rates at once is refused')::text); else report := array_append(report, ('FAIL  V14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V15
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca - 60, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 4500))); perform public.set_pay_rates(ca + 365, jsonb_build_array(jsonb_build_object('division_id', d1, 'classification', 'youth', 'position', 'plate', 'amount_cents', 4600)));
    reset role;
    if (select amount_cents from public.pay_rates where division_id = d1 and classification = 'youth' and position = 'plate' and effective_on = ca - 60) = 4500 and (select amount_cents from public.pay_rates where division_id = d1 and classification = 'youth' and position = 'plate' and effective_on = ca + 365) = 4600 then report := array_append(report, ('PASS  V15  the edges are allowed: 60 days ago and a year ahead')::text); else report := array_append(report, ('FAIL  V15  an allowed start date was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V15  an allowed start date was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: tidy the edge-date rates so later tests are clear)
  reset role;
  delete from public.pay_rates where effective_on in (ca - 60, ca + 365) and division_id = d1;

  -- V16
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    begin perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d2, 'classification', 'youth', 'position', 'field', 'amount_cents', 3000), jsonb_build_object('division_id', d2, 'classification', 'youth', 'position', 'plate', 'amount_cents', -1))); exception when others then null; end;
    reset role;
    if not exists (select 1 from public.pay_rates where division_id = d2 and position = 'field' and effective_on = ca) then report := array_append(report, ('PASS  V16  a save with one bad rate saves NOTHING (all or none)')::text); else report := array_append(report, ('FAIL  V16  part of a bad save was kept')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V16  part of a bad save was kept: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 4. Who can read rates and the log
  ----------------------------------------------------------------
  -- S1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rates where division_id in (d1, d2);
    reset role;
    if n = 4 then report := array_append(report, ('PASS  S1  the treasurer reads the rates (d1: plate, field, adult plate; d2: plate)')::text); else report := array_append(report, ('FAIL  S1  the treasurer could not read the rates')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  the treasurer could not read the rates: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rates where division_id in (d1, d2);
    reset role;
    if n = 4 then report := array_append(report, ('PASS  S2  a super admin does')::text); else report := array_append(report, ('FAIL  S2  a super admin could not read the rates')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S2  a super admin could not read the rates: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S3
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rates;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S3  a scheduler sees no rates (this is money)')::text); else report := array_append(report, ('FAIL  S3  a scheduler read pay rates')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S3  a scheduler read pay rates: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S4
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rates;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S4  an umpire chief sees no rates (this is money)')::text); else report := array_append(report, ('FAIL  S4  an umpire chief read pay rates')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S4  an umpire chief read pay rates: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rates;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S5  an umpire sees no rates (this is money)')::text); else report := array_append(report, ('FAIL  S5  an umpire read pay rates')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S5  an umpire read pay rates: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S6
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rates;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S6  an ordinary account sees no rates (this is money)')::text); else report := array_append(report, ('FAIL  S6  an ordinary account read pay rates')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S6  an ordinary account read pay rates: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S7
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.pay_rates;
    reset role;
    report := array_append(report, ('FAIL  S7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S7  a signed-out visitor cannot')::text); else report := array_append(report, ('FAIL  S7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rate_log where division_id in (d1, d2);
    reset role;
    if n >= 4 then report := array_append(report, ('PASS  S8  the treasurer reads the log of changes')::text); else report := array_append(report, ('FAIL  S8  the treasurer could not read the log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S8  the treasurer could not read the log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S9
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rate_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S9  an umpire chief does not')::text); else report := array_append(report, ('FAIL  S9  an umpire chief read the log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S9  an umpire chief read the log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S10
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.pay_rate_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S10  nor an umpire')::text); else report := array_append(report, ('FAIL  S10  an umpire read the log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S10  an umpire read the log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 5. Nobody writes the tables directly
  ----------------------------------------------------------------
  -- W1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.pay_rates (division_id, classification, position, amount_cents, effective_on, created_by_name) values (d1, 'youth', 'plate', 1, ca, 'x');
    reset role;
    report := array_append(report, ('FAIL  W1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W1  not even the treasurer can insert a rate directly (it must go through the function that logs it)')::text); else report := array_append(report, ('FAIL  W1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W2
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.pay_rates set amount_cents = 1 where division_id = d1;
    reset role;
    report := array_append(report, ('FAIL  W2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W2  ...or change one directly')::text); else report := array_append(report, ('FAIL  W2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.pay_rates where division_id = d1;
    reset role;
    report := array_append(report, ('FAIL  W3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W3  ...or delete one, not even a super admin')::text); else report := array_append(report, ('FAIL  W3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W4
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.pay_rate_log set new_cents = 1 where division_id = d1;
    reset role;
    report := array_append(report, ('FAIL  W4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W4  the log cannot be altered...')::text); else report := array_append(report, ('FAIL  W4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.pay_rate_log where division_id = d1;
    reset role;
    report := array_append(report, ('FAIL  W5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  W5  ...or erased')::text); else report := array_append(report, ('FAIL  W5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W6
  begin
    reset role;
    insert into public.pay_rates (division_id, classification, position, amount_cents, effective_on, created_by_name) values (d1, 'youth', 'plate', 5500, ca, 'x');
    reset role;
    report := array_append(report, ('FAIL  W6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23505' then report := array_append(report, ('PASS  W6  a second rate for the same division, kind, place and start date is refused by the table itself')::text); else report := array_append(report, ('FAIL  W6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W7
  begin
    reset role;
    insert into public.pay_rates (division_id, classification, position, amount_cents, effective_on, created_by_name) values (d1, 'youth', 'field', 100001, ca + 1, 'x');
    reset role;
    report := array_append(report, ('FAIL  W7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  W7  the table itself refuses an amount over $1000.00')::text); else report := array_append(report, ('FAIL  W7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- W8
  begin
    reset role;
    insert into public.pay_rates (division_id, classification, position, amount_cents, effective_on, created_by_name) values (d1, 'youth', 'field', -1, ca + 1, 'x');
    reset role;
    report := array_append(report, ('FAIL  W8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  W8  ...and a negative one')::text); else report := array_append(report, ('FAIL  W8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 6. What a place pays on a given date (the newest rate that has started)
  ----------------------------------------------------------------
  -- (setup, not a test: three rates for one place, starting 30 days ago, 5 days ago, and in 10 days)
  reset role;
  delete from public.pay_rates where division_id = d2 and classification = 'youth' and position = 'field';

  -- F0
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca - 30, jsonb_build_array(jsonb_build_object('division_id', d2, 'classification', 'youth', 'position', 'field', 'amount_cents', 3000))); perform public.set_pay_rates(ca - 5, jsonb_build_array(jsonb_build_object('division_id', d2, 'classification', 'youth', 'position', 'field', 'amount_cents', 3500))); perform public.set_pay_rates(ca + 10, jsonb_build_array(jsonb_build_object('division_id', d2, 'classification', 'youth', 'position', 'field', 'amount_cents', 4000)));
    reset role;
    if true then report := array_append(report, ('PASS  F0  rates are set for three different start dates')::text); else report := array_append(report, ('FAIL  F0  the dated rates were not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F0  the dated rates were not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F1
  begin
    reset role;
    select public.pay_rate_for(d2, 'youth', 'field', ca) into v;
    reset role;
    if v = 3500 then report := array_append(report, ('PASS  F1  today the newest rate that has started applies ($35.00, which started 5 days ago, not the one in 10 days)')::text); else report := array_append(report, ('FAIL  F1  the wrong rate applied today')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F1  the wrong rate applied today: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F2
  begin
    reset role;
    select public.pay_rate_for(d2, 'youth', 'field', ca - 10) into v;
    reset role;
    if v = 3000 then report := array_append(report, ('PASS  F2  10 days ago the older rate applied ($30.00)')::text); else report := array_append(report, ('FAIL  F2  the wrong rate applied 10 days ago')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F2  the wrong rate applied 10 days ago: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F3
  begin
    reset role;
    select public.pay_rate_for(d2, 'youth', 'field', ca - 40) into v;
    reset role;
    if v is null then report := array_append(report, ('PASS  F3  before any rate started there is none (nothing is owed)')::text); else report := array_append(report, ('FAIL  F3  a rate applied before it started')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F3  a rate applied before it started: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F4
  begin
    reset role;
    select public.pay_rate_for(d2, 'youth', 'field', ca + 10) into v;
    reset role;
    if v = 4000 then report := array_append(report, ('PASS  F4  on the day a new rate starts it applies ($40.00)')::text); else report := array_append(report, ('FAIL  F4  the new rate did not apply on its start date')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F4  the new rate did not apply on its start date: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F5
  begin
    reset role;
    select public.pay_rate_for(d2, 'youth', 'field', ca + 9) into v;
    reset role;
    if v = 3500 then report := array_append(report, ('PASS  F5  the day before it starts, it does not')::text); else report := array_append(report, ('FAIL  F5  the new rate applied a day early')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F5  the new rate applied a day early: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F6
  begin
    reset role;
    null;
    reset role;
    if public.pay_rate_for(d2, 'adult', 'field', ca) is null and public.pay_rate_for(d2, 'youth', 'first_base', ca) is null and public.pay_rate_for(d1, 'youth', 'field', ca - 31) is null and public.pay_rate_for(d_tmp, 'youth', 'plate', ca) is null then report := array_append(report, ('PASS  F6  a different kind, place or division, with no rate, has none')::text); else report := array_append(report, ('FAIL  F6  a rate was found where none was set')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F6  a rate was found where none was set: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F7
  begin
    reset role;
    select public.pay_rate_for(d1, 'adult', 'plate', ca) into v;
    reset role;
    if v = 0 then report := array_append(report, ('PASS  F7  an adult rate set to $0 is $0 (the slot exists)')::text); else report := array_append(report, ('FAIL  F7  a $0 adult rate was not found')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F7  a $0 adult rate was not found: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F8
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.pay_rate_for(d2, 'youth', 'field', ca);
    reset role;
    report := array_append(report, ('FAIL  F8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  F8  this lookup is only for the system: the treasurer cannot call it directly')::text); else report := array_append(report, ('FAIL  F8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F9
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.pay_rate_for(d2, 'youth', 'field', ca);
    reset role;
    report := array_append(report, ('FAIL  F9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  F9  nor can a signed-out visitor')::text); else report := array_append(report, ('FAIL  F9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 7. Deleting a division
  ----------------------------------------------------------------
  -- D1
  begin
    perform set_config('request.jwt.claim.sub', tr_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', tr_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_pay_rates(ca, jsonb_build_array(jsonb_build_object('division_id', d_tmp, 'classification', 'youth', 'position', 'plate', 'amount_cents', 1000)));
    reset role;
    if (select count(*) from public.pay_rates where division_id = d_tmp) = 1 then report := array_append(report, ('PASS  D1  a rate can be set for another division')::text); else report := array_append(report, ('FAIL  D1  a rate for a new division was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D1  a rate for a new division was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- (setup, not a test: delete that division)
  reset role;
  delete from public.divisions where id = d_tmp;

  -- D2
  begin
    reset role;
    null;
    reset role;
    if (select count(*) from public.pay_rates where division_id = d_tmp) = 0 and (select count(*) from public.pay_rate_log where division_id = d_tmp) = 1 then report := array_append(report, ('PASS  D2  deleting a division removes its rates, but the log of what was set stays')::text); else report := array_append(report, ('FAIL  D2  deleting a division did not remove its rates, or lost the log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D2  deleting a division did not remove its rates, or lost the log: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nPAY RATES CHECK (nothing was saved; your real rates were not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
