-- RWCLL check: repeating availability, and "I can't" entries.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261029100000_add_availability_patterns.sql.
--
-- It builds its own sign-in accounts, umpires and seasons, then acts as each of
-- them, as a super admin, and as a signed-out visitor. It ENDS WITH A RED ERROR
-- on purpose: the report is carried in the error message, and raising an error
-- guarantees that everything it created is rolled back. Your real data is not
-- changed.
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
  um_a uuid; um_b uuid;
  s_ok uuid; s_none uuid;
  p_a uuid; p_b uuid; p_x uuid; e_b uuid;
  t0 timestamptz := date_trunc('hour', now()) + interval '2 days';
  n bigint; n2 bigint;
  days_back smallint[];
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
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (a_acct, b_acct, x_acct);

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Pat A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Pat B ' || stamp, 'adult', b_acct) returning id into um_b;

  -- A season that has an end date, and one that does not.
  insert into public.seasons (name, starts_on, ends_on) values ('CHK Season ' || stamp, current_date - 30, current_date + 100) returning id into s_ok;
  insert into public.seasons (name) values ('CHK No End ' || stamp) returning id into s_none;

  -- One entry already exists for B (made as the owner): a repeating time and an "I can't".
  insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time, notes)
    values (um_b, s_ok, '{6,0}', '09:00', '17:00', 'B weekends') returning id into p_b;
  insert into public.umpire_availability (umpire_id, starts_at, ends_at, kind, notes)
    values (um_b, t0, t0 + interval '1 day', 'unavailable', 'B away') returning id into e_b;

  ----------------------------------------------------------------
  -- An umpire and their own repeating times
  ----------------------------------------------------------------
  -- P1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time, notes) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '21:00', 'after work') returning id into p_a;
    reset role;
    if exists (select 1 from public.umpire_availability_patterns where id = p_a and umpire_id = um_a and season_id = s_ok and starts_on = current_date and notes = 'after work') then report := array_append(report, ('PASS  P1  an umpire can add a repeating time (it starts today unless chosen otherwise)')::text); else report := array_append(report, ('FAIL  P1  the pattern was not added')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P1  the pattern was not added: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpire_availability_patterns where umpire_id = um_a; select count(*) into n2 from public.umpire_availability_patterns where umpire_id = um_b;
    reset role;
    if n = 1 and n2 = 0 then report := array_append(report, ('PASS  P2  an umpire sees their own repeating times and none of another umpire''s')::text); else report := array_append(report, ('FAIL  P2  an umpire saw someone else''s pattern')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P2  an umpire saw someone else''s pattern: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_b, s_ok, '{1,2,3,4,5}', '17:00', '21:00');
    reset role;
    report := array_append(report, ('FAIL  P3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  P3  an umpire cannot add a repeating time for another umpire')::text); else report := array_append(report, ('FAIL  P3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- P4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.umpire_availability_patterns set notes = 'changed', end_time = '22:00' where id = p_a; update public.umpire_availability_patterns set notes = 'hacked' where id = p_b; delete from public.umpire_availability_patterns where id = p_b;
    reset role;
    if exists (select 1 from public.umpire_availability_patterns where id = p_a and notes = 'changed' and end_time = '22:00') and (select notes from public.umpire_availability_patterns where id = p_b) = 'B weekends' then report := array_append(report, ('PASS  P4  an umpire can change their own, and cannot change or delete another umpire''s')::text); else report := array_append(report, ('FAIL  P4  the wrong pattern was changed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P4  the wrong pattern was changed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- P5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.umpire_availability_patterns where id = p_a;
    reset role;
    if not exists (select 1 from public.umpire_availability_patterns where id = p_a) then report := array_append(report, ('PASS  P5  an umpire can remove their own repeating time')::text); else report := array_append(report, ('FAIL  P5  the pattern was not removed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  P5  the pattern was not removed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- The rules for a repeating time
  ----------------------------------------------------------------
  -- V1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{}', '17:00', '21:00');
    reset role;
    report := array_append(report, ('FAIL  V1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V1  no days of the week is refused')::text); else report := array_append(report, ('FAIL  V1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{7}', '17:00', '21:00');
    reset role;
    report := array_append(report, ('FAIL  V2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V2  a day number above 6 is refused')::text); else report := array_append(report, ('FAIL  V2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{-1}', '17:00', '21:00');
    reset role;
    report := array_append(report, ('FAIL  V3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V3  a negative day number is refused')::text); else report := array_append(report, ('FAIL  V3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{3,1,1,3}', '17:00', '21:00') returning id into p_x; select weekdays into days_back from public.umpire_availability_patterns where id = p_x;
    reset role;
    if days_back = '{1,3}'::smallint[] then report := array_append(report, ('PASS  V5  repeated days are tidied up and put in order ({3,1,1,3} is stored as {1,3})')::text); else report := array_append(report, ('FAIL  V5  the days were not tidied')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V5  the days were not tidied: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{1,2,3,4,5}', '21:00', '17:00');
    reset role;
    report := array_append(report, ('FAIL  V6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V6  an end time before the start time is refused')::text); else report := array_append(report, ('FAIL  V6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V7
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '17:00');
    reset role;
    report := array_append(report, ('FAIL  V7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V7  an end time equal to the start time is refused')::text); else report := array_append(report, ('FAIL  V7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V8
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time, notes) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '21:00', repeat('x', 201));
    reset role;
    report := array_append(report, ('FAIL  V8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V8  a note of 201 characters is refused')::text); else report := array_append(report, ('FAIL  V8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V9
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time, notes) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '21:00', repeat('x', 200));
    reset role;
    if exists (select 1 from public.umpire_availability_patterns where umpire_id = um_a and char_length(notes) = 200) then report := array_append(report, ('PASS  V9  a note of exactly 200 characters is accepted')::text); else report := array_append(report, ('FAIL  V9  a 200 character note was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V9  a 200 character note was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V10
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_none, '{1,2,3,4,5}', '17:00', '21:00');
    reset role;
    report := array_append(report, ('FAIL  V10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%end date%' then report := array_append(report, ('PASS  V10  a season with no end date is refused (a repeating time needs somewhere to stop)')::text); else report := array_append(report, ('FAIL  V10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V11
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time, starts_on) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '21:00', current_date + 101);
    reset role;
    report := array_append(report, ('FAIL  V11  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%after the end of its season%' then report := array_append(report, ('PASS  V11  a start date after the end of the season is refused')::text); else report := array_append(report, ('FAIL  V11  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V12
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time, starts_on) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '21:00', current_date + 100) returning id into p_x;
    reset role;
    if exists (select 1 from public.umpire_availability_patterns where id = p_x) then report := array_append(report, ('PASS  V12  starting on the very last day of the season is accepted')::text); else report := array_append(report, ('FAIL  V12  the last day of the season was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V12  the last day of the season was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 'I can't' entries
  ----------------------------------------------------------------
  -- K1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_a, t0, t0 + interval '2 hours') returning id into p_x;
    reset role;
    if (select kind from public.umpire_availability where id = p_x) = 'available' then report := array_append(report, ('PASS  K1  an entry with no kind is ''available'', as every existing entry was')::text); else report := array_append(report, ('FAIL  K1  the default kind is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K1  the default kind is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at, kind, notes) values (um_a, t0 + interval '1 day', t0 + interval '2 days', 'unavailable', 'away') returning id into p_x;
    reset role;
    if (select kind from public.umpire_availability where id = p_x) = 'unavailable' then report := array_append(report, ('PASS  K2  an umpire can mark a date as one they cannot umpire')::text); else report := array_append(report, ('FAIL  K2  the ''cannot'' entry was not saved')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K2  the ''cannot'' entry was not saved: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- K3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at, kind) values (um_a, t0, t0 + interval '1 hour', 'maybe');
    reset role;
    report := array_append(report, ('FAIL  K3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  K3  any other kind is refused')::text); else report := array_append(report, ('FAIL  K3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at, kind) values (um_b, t0, t0 + interval '1 hour', 'unavailable');
    reset role;
    report := array_append(report, ('FAIL  K4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  K4  an umpire cannot mark another umpire unavailable')::text); else report := array_append(report, ('FAIL  K4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- K5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpire_availability where id = e_b;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  K5  an umpire cannot see another umpire''s ''cannot'' entries')::text); else report := array_append(report, ('FAIL  K5  an umpire saw someone else''s entry')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  K5  an umpire saw someone else''s entry: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Other people
  ----------------------------------------------------------------
  -- X1
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '21:00');
    reset role;
    report := array_append(report, ('FAIL  X1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  X1  an account with no umpire record cannot add a repeating time')::text); else report := array_append(report, ('FAIL  X1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- X2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpire_availability_patterns;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  X2  an account with no umpire record sees no repeating times')::text); else report := array_append(report, ('FAIL  X2  an ordinary account saw repeating times')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X2  an ordinary account saw repeating times: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpire_availability_patterns where umpire_id in (um_a, um_b);
    reset role;
    if n >= 3 then report := array_append(report, ('PASS  D1  an administrator can see every umpire''s repeating times')::text); else report := array_append(report, ('FAIL  D1  the administrator could not see them')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D1  the administrator could not see them: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_b, s_ok, '{2}', '17:00', '21:00') returning id into p_x; update public.umpire_availability_patterns set notes = 'admin edit' where id = p_b;
    reset role;
    if exists (select 1 from public.umpire_availability_patterns where id = p_x and umpire_id = um_b) and (select notes from public.umpire_availability_patterns where id = p_b) = 'admin edit' then report := array_append(report, ('PASS  D2  an administrator can add and change repeating times for an umpire')::text); else report := array_append(report, ('FAIL  D2  the administrator could not add or change')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D2  the administrator could not add or change: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.umpire_availability_patterns where id = p_x; insert into public.umpire_availability (umpire_id, starts_at, ends_at, kind) values (um_b, t0 + interval '5 days', t0 + interval '6 days', 'unavailable') returning id into p_x;
    reset role;
    if not exists (select 1 from public.umpire_availability_patterns where umpire_id = um_b and weekdays = '{2}') and exists (select 1 from public.umpire_availability where id = p_x and kind = 'unavailable') then report := array_append(report, ('PASS  D3  an administrator can remove one, and mark a date as unavailable for an umpire')::text); else report := array_append(report, ('FAIL  D3  the administrator could not')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D3  the administrator could not: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O1
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    insert into public.umpire_availability_patterns (umpire_id, season_id, weekdays, start_time, end_time) values (um_a, s_ok, '{1,2,3,4,5}', '17:00', '21:00');
    reset role;
    report := array_append(report, ('FAIL  O1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O1  a signed-out visitor cannot add a repeating time')::text); else report := array_append(report, ('FAIL  O1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O2 (a signed-out visitor either gets an error or sees nothing: both are safe)
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    select count(*) into n from public.umpire_availability_patterns;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  O2  a signed-out visitor sees no repeating times')::text); else report := array_append(report, ('FAIL  O2  a signed-out visitor could read repeating times')::text); failures := failures + 1; end if;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O2  a signed-out visitor cannot read repeating times')::text); else report := array_append(report, ('FAIL  O2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C1
  begin
    reset role;
    delete from public.umpires where id = um_b;
    reset role;
    if not exists (select 1 from public.umpire_availability_patterns where umpire_id = um_b) and not exists (select 1 from public.umpire_availability where umpire_id = um_b) then report := array_append(report, ('PASS  C1  removing an umpire removes their repeating times and their entries')::text); else report := array_append(report, ('FAIL  C1  an umpire''s availability was left behind')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C1  an umpire''s availability was left behind: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nREPEATING AVAILABILITY CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
