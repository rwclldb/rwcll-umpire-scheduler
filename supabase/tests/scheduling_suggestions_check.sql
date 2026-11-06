-- RWCLL check: scheduling suggestions (the umpires_needing_consent() question).
--
-- Run in the Supabase SQL Editor AFTER applying 20261111100000_add_scheduling_suggestion_helpers.sql
-- (and the families migrations before it).
--
-- It builds its own accounts and umpires, then acts as each of them. It ENDS WITH A RED ERROR on purpose:
-- the report is carried in the error message, and raising an error guarantees everything it created is
-- rolled back. Your real data and settings are not changed.
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
  ch_acct uuid := gen_random_uuid(); sc_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid(); par1 uuid := gen_random_uuid();
  um_kid uuid; um_unk uuid; um_16 uuid; um_ad uuid; um_off uuid; um_cons uuid;
  wv text;
  arr uuid[]; n bigint; n2 bigint;
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
    select a, 'chk-' || stamp || '-' || i || '@example.org', now(), m::jsonb
    from (values
      (ch_acct, 'ch', '{}'), (sc_acct, 'sc', '{}'), (x_acct, 'x', '{}'), (par1, 'par1', '{"signup_kind":"parent_guardian"}')
    ) as t(a, i, m);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (ch_acct, sc_acct, x_acct, par1);
  update public.profiles set display_name = 'CHK Parent ' || stamp where id = par1;
  insert into public.user_roles (user_id, role_id) values
    (ch_acct, 'umpire_chief'), (sc_acct, 'scheduler'), (par1, 'parent_guardian');

  update public.app_settings set value = '10' where key = 'umpire_min_age';
  update public.app_settings set value = '13' where key = 'parent_consent_below_age';

  insert into public.umpires (display_name, classification) values ('CHK Kid ' || stamp, 'youth') returning id into um_kid;
  insert into public.umpires (display_name, classification) values ('CHK Unknown ' || stamp, 'youth') returning id into um_unk;
  insert into public.umpires (display_name, classification) values ('CHK Sixteen ' || stamp, 'youth') returning id into um_16;
  insert into public.umpires (display_name, classification) values ('CHK Adult ' || stamp, 'adult') returning id into um_ad;
  insert into public.umpires (display_name, classification, eligibility_status) values ('CHK Inactive Kid ' || stamp, 'youth', 'inactive') returning id into um_off;
  insert into public.umpires (display_name, classification) values ('CHK Consented ' || stamp, 'youth') returning id into um_cons;
  insert into public.umpire_private_details (umpire_id, birth_date) values
    (um_kid, ((ca - interval '11 years' - interval '30 days')::date)),
    (um_16, ((ca - interval '16 years' - interval '30 days')::date)),
    (um_off, ((ca - interval '11 years' - interval '30 days')::date)),
    (um_cons, ((ca - interval '11 years' - interval '30 days')::date));

  insert into public.family_links (parent_id, umpire_id, relationship, created_by_name) values
    (par1, um_kid, 'mother', 'x'), (par1, um_cons, 'mother', 'x');

  ----------------------------------------------------------------
  -- 1. Who is listed
  ----------------------------------------------------------------
  -- S0
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.set_consent_wording('I am the parent or legal guardian of {child}. I give permission for {child} to umpire games for the league, and I understand I can withdraw this at any time.');
    reset role;
    if true then report := array_append(report, ('PASS  S0  (setup: a super admin saves finished consent wording, so consent can be given)')::text); else report := array_append(report, ('FAIL  S0  the wording was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S0  the wording was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  select version into wv from public.consent_wordings order by seq desc limit 1;

  -- S1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(x), '{}') into arr from public.umpires_needing_consent() x;
    reset role;
    if um_kid = any(arr) and um_unk = any(arr) then report := array_append(report, ('PASS  S1  a super admin is told that the 11-year-old with no consent, and the youth with no birth date (minimum age 10), need consent')::text); else report := array_append(report, ('FAIL  S1  an umpire who needs consent was not listed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  an umpire who needs consent was not listed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(x), '{}') into arr from public.umpires_needing_consent() x;
    reset role;
    if not (um_16 = any(arr)) and not (um_ad = any(arr)) then report := array_append(report, ('PASS  S2  ...but not a 16-year-old, nor an adult')::text); else report := array_append(report, ('FAIL  S2  someone who does not need consent was listed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S2  someone who does not need consent was listed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(x), '{}') into arr from public.umpires_needing_consent() x;
    reset role;
    if not (um_off = any(arr)) then report := array_append(report, ('PASS  S3  an umpire who is not active is never listed (they cannot be assigned anyway)')::text); else report := array_append(report, ('FAIL  S3  an inactive umpire was listed')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S3  an inactive umpire was listed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpires_needing_consent();
    select count(*) into n2 from public.umpires u where u.eligibility_status = 'active' and public.assignment_blocked_by_consent(u.id);
    reset role;
    if n = n2 then report := array_append(report, ('PASS  S4  the list agrees exactly with what the assignment rule says about each active umpire')::text); else report := array_append(report, ('FAIL  S4  the list and the assignment rule disagree')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S4  the list and the assignment rule disagree: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 2. Who may ask
  ----------------------------------------------------------------
  -- S5
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(x), '{}') into arr from public.umpires_needing_consent() x;
    reset role;
    if um_kid = any(arr) then report := array_append(report, ('PASS  S5  an umpire chief gets the same answer')::text); else report := array_append(report, ('FAIL  S5  the chief was not told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S5  the chief was not told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S6
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(x), '{}') into arr from public.umpires_needing_consent() x;
    reset role;
    if um_kid = any(arr) then report := array_append(report, ('PASS  S6  a scheduler gets the same answer (they assign umpires)')::text); else report := array_append(report, ('FAIL  S6  the scheduler was not told')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S6  the scheduler was not told: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S7
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpires_needing_consent();
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S7  a parent gets an empty list: it reveals nothing about any child')::text); else report := array_append(report, ('FAIL  S7  a parent was told something')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S7  a parent was told something: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S8
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpires_needing_consent();
    reset role;
    if n = 0 then report := array_append(report, ('PASS  S8  an ordinary account gets an empty list')::text); else report := array_append(report, ('FAIL  S8  an ordinary account was told something')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S8  an ordinary account was told something: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S9
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.umpires_needing_consent();
    reset role;
    report := array_append(report, ('FAIL  S9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S9  a signed-out visitor cannot call it')::text); else report := array_append(report, ('FAIL  S9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 3. It follows consent
  ----------------------------------------------------------------
  -- S10
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.give_consent(um_cons, wv);
    reset role;
    if true then report := array_append(report, ('PASS  S10  (setup: the mother gives consent for the second child)')::text); else report := array_append(report, ('FAIL  S10  consent was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S10  consent was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S11
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(x), '{}') into arr from public.umpires_needing_consent() x;
    reset role;
    if not (um_cons = any(arr)) and um_kid = any(arr) then report := array_append(report, ('PASS  S11  once a parent consents the child leaves the list, and the child without consent stays')::text); else report := array_append(report, ('FAIL  S11  the list did not follow the consent')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S11  the list did not follow the consent: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S12
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.withdraw_consent(um_cons);
    reset role;
    if true then report := array_append(report, ('PASS  S12  (setup: the mother withdraws it again)')::text); else report := array_append(report, ('FAIL  S12  withdrawing was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S12  withdrawing was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S13
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select coalesce(array_agg(x), '{}') into arr from public.umpires_needing_consent() x;
    reset role;
    if um_cons = any(arr) then report := array_append(report, ('PASS  S13  ...and the child is listed again')::text); else report := array_append(report, ('FAIL  S13  the withdrawal did not put the child back on the list')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S13  the withdrawal did not put the child back on the list: ' || sqlerrm)::text); failures := failures + 1;
  end;


  raise exception E'\n\nSCHEDULING SUGGESTIONS CHECK (nothing was saved; your real data is unchanged)\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
