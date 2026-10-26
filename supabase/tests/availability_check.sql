-- RWCLL check: umpire availability.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261027100000_add_availability_rules.sql.
--
-- It builds its own sign-in accounts and umpires, then acts as each of them, as
-- a super admin, and as a signed-out visitor. It ENDS WITH A RED ERROR on
-- purpose: the report is carried in the error message, and raising an error
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
  w_a uuid; w_b uuid;
  t0 timestamptz := date_trunc('hour', now()) + interval '2 days';
  n bigint; n2 bigint;
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

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Avail A ' || stamp, 'adult', a_acct) returning id into um_a;
  insert into public.umpires (display_name, classification, profile_id) values ('CHK Avail B ' || stamp, 'adult', b_acct) returning id into um_b;

  -- One entry already exists for B (made as the owner).
  insert into public.umpire_availability (umpire_id, starts_at, ends_at, notes)
    values (um_b, t0, t0 + interval '4 hours', 'B is free') returning id into w_b;

  ----------------------------------------------------------------
  -- An umpire and their own entries
  -- A1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at, notes) values (um_a, t0, t0 + interval '3 hours', 'after work') returning id into w_a;
    reset role;
    if exists (select 1 from public.umpire_availability where id = w_a and umpire_id = um_a and notes = 'after work') then report := array_append(report, ('PASS  A1  an umpire can add a time they can umpire')::text); else report := array_append(report, ('FAIL  A1  the entry was not added')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A1  the entry was not added: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpire_availability where umpire_id = um_a; select count(*) into n2 from public.umpire_availability where umpire_id = um_b;
    reset role;
    if n = 1 and n2 = 0 then report := array_append(report, ('PASS  A2  an umpire sees their own entries and none of another umpire''s')::text); else report := array_append(report, ('FAIL  A2  an umpire saw someone else''s availability')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A2  an umpire saw someone else''s availability: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_b, t0 + interval '1 day', t0 + interval '1 day 2 hours');
    reset role;
    report := array_append(report, ('FAIL  A3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  A3  an umpire cannot add availability for another umpire')::text); else report := array_append(report, ('FAIL  A3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- A4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.umpire_availability set notes = 'changed', ends_at = t0 + interval '5 hours' where id = w_a;
    reset role;
    if exists (select 1 from public.umpire_availability where id = w_a and notes = 'changed' and ends_at = t0 + interval '5 hours') then report := array_append(report, ('PASS  A4  an umpire can change their own entry')::text); else report := array_append(report, ('FAIL  A4  the entry was not changed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A4  the entry was not changed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.umpire_availability set notes = 'hacked' where id = w_b;
    reset role;
    if (select notes from public.umpire_availability where id = w_b) = 'B is free' then report := array_append(report, ('PASS  A5  an umpire cannot change another umpire''s entry')::text); else report := array_append(report, ('FAIL  A5  an umpire changed someone else''s entry')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A5  an umpire changed someone else''s entry: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.umpire_availability where id = w_b;
    reset role;
    if exists (select 1 from public.umpire_availability where id = w_b) then report := array_append(report, ('PASS  A6  an umpire cannot delete another umpire''s entry')::text); else report := array_append(report, ('FAIL  A6  an umpire deleted someone else''s entry')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A6  an umpire deleted someone else''s entry: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- A7
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.umpire_availability where id = w_a;
    reset role;
    if not exists (select 1 from public.umpire_availability where id = w_a) then report := array_append(report, ('PASS  A7  an umpire can delete their own entry')::text); else report := array_append(report, ('FAIL  A7  the entry was not deleted')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  A7  the entry was not deleted: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- The limits
  ----------------------------------------------------------------
  -- L1
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_a, t0, t0 - interval '1 hour');
    reset role;
    report := array_append(report, ('FAIL  L1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  L1  an entry cannot end before it starts')::text); else report := array_append(report, ('FAIL  L1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L2
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_a, t0, t0);
    reset role;
    report := array_append(report, ('FAIL  L2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  L2  an entry cannot have no length')::text); else report := array_append(report, ('FAIL  L2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L3
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at, notes) values (um_a, t0, t0 + interval '1 hour', repeat('x', 201));
    reset role;
    report := array_append(report, ('FAIL  L3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  L3  a note of 201 characters is refused')::text); else report := array_append(report, ('FAIL  L3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L4
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at, notes) values (um_a, t0, t0 + interval '1 hour', repeat('x', 200));
    reset role;
    if exists (select 1 from public.umpire_availability where umpire_id = um_a and char_length(notes) = 200) then report := array_append(report, ('PASS  L4  a note of exactly 200 characters is accepted')::text); else report := array_append(report, ('FAIL  L4  a 200 character note was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L4  a 200 character note was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- L5
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_a, t0, t0 + interval '91 days');
    reset role;
    report := array_append(report, ('FAIL  L5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  L5  an entry longer than 90 days is refused (it is probably a typo)')::text); else report := array_append(report, ('FAIL  L5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- L6
  begin
    perform set_config('request.jwt.claim.sub', a_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', a_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_a, t0 + interval '10 days', t0 + interval '100 days');
    reset role;
    if exists (select 1 from public.umpire_availability where umpire_id = um_a and ends_at = t0 + interval '100 days') then report := array_append(report, ('PASS  L6  an entry of exactly 90 days is accepted')::text); else report := array_append(report, ('FAIL  L6  a 90 day entry was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  L6  a 90 day entry was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- Other people
  ----------------------------------------------------------------
  -- X1
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_a, t0, t0 + interval '1 hour');
    reset role;
    report := array_append(report, ('FAIL  X1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  X1  an account with no umpire record cannot add availability for an umpire')::text); else report := array_append(report, ('FAIL  X1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- X2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpire_availability;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  X2  an account with no umpire record sees no availability at all')::text); else report := array_append(report, ('FAIL  X2  an ordinary account saw availability')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  X2  an ordinary account saw availability: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpire_availability where umpire_id in (um_a, um_b);
    reset role;
    if n >= 3 then report := array_append(report, ('PASS  D1  an administrator can see every umpire''s availability')::text); else report := array_append(report, ('FAIL  D1  the administrator could not see everything')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D1  the administrator could not see everything: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at, notes) values (um_b, t0 + interval '2 days', t0 + interval '2 days 3 hours', 'added by admin') returning id into w_a;
    reset role;
    if exists (select 1 from public.umpire_availability where id = w_a and umpire_id = um_b) then report := array_append(report, ('PASS  D2  an administrator can add availability for an umpire')::text); else report := array_append(report, ('FAIL  D2  the administrator could not add an entry')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D2  the administrator could not add an entry: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- D3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.umpire_availability set notes = 'admin edit' where id = w_b; delete from public.umpire_availability where id = w_a;
    reset role;
    if (select notes from public.umpire_availability where id = w_b) = 'admin edit' and not exists (select 1 from public.umpire_availability where id = w_a) then report := array_append(report, ('PASS  D3  an administrator can change and delete an umpire''s entries')::text); else report := array_append(report, ('FAIL  D3  the administrator could not change or delete')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  D3  the administrator could not change or delete: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- O1
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    insert into public.umpire_availability (umpire_id, starts_at, ends_at) values (um_a, t0, t0 + interval '1 hour');
    reset role;
    report := array_append(report, ('FAIL  O1  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O1  a signed-out visitor cannot add availability')::text); else report := array_append(report, ('FAIL  O1  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- O2 (a signed-out visitor either gets an error or sees nothing: both are safe)
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    select count(*) into n from public.umpire_availability;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  O2  a signed-out visitor sees no availability')::text); else report := array_append(report, ('FAIL  O2  a signed-out visitor could read availability')::text); failures := failures + 1; end if;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  O2  a signed-out visitor cannot read availability')::text); else report := array_append(report, ('FAIL  O2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nAVAILABILITY CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
