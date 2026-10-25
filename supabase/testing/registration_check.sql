-- RWCLL check: do the umpire registration and invitation rules work?
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261024200000_add_umpire_registration.sql.
--
-- It creates temporary test accounts INSIDE the database, signs in as each
-- of them (and as a super admin and an ordinary account), and tries both the
-- allowed and the forbidden paths. The run ENDS WITH A RED ERROR on purpose:
-- the report is carried in the error message, and raising an error
-- guarantees that everything it created is rolled back. Nothing is saved,
-- and no real person is emailed.
--
--   PASS   the rule behaved as intended
--   FAIL   a forbidden thing was allowed, or an allowed thing was refused
--
-- If it stops early with "could not create test accounts", send Claude the
-- message: some projects do not allow the SQL Editor to add accounts.

do $$
declare
  report text[] := '{}';
  failures integer := 0;

  t_admin uuid;
  t_ordinary uuid;
  t_stamp text := replace(gen_random_uuid()::text, '-', '');

  -- temporary test accounts
  u_inv uuid := gen_random_uuid();      -- invited, email confirmed
  u_unconf uuid := gen_random_uuid();   -- invited, email NOT confirmed
  u_late uuid := gen_random_uuid();     -- invited, but the invitation expires
  u_evil uuid := gen_random_uuid();     -- tries to sign up as "super_admin"
  u_youth uuid := gen_random_uuid();    -- registers as youth
  u_adult uuid := gen_random_uuid();    -- registers as adult (will be rejected)
  u_chief uuid := gen_random_uuid();    -- registers as adult (approved by a chief)
  u_sched uuid := gen_random_uuid();    -- registers as adult (a scheduler cannot approve)

  e_inv text := 'inv-' || t_stamp || '@example.test';
  e_unconf text := 'unconf-' || t_stamp || '@example.test';
  e_late text := 'late-' || t_stamp || '@example.test';
  e_evil text := 'evil-' || t_stamp || '@example.test';
  e_youth text := 'youth-' || t_stamp || '@example.test';
  e_adult text := 'adult-' || t_stamp || '@example.test';
  e_chief text := 'chief-' || t_stamp || '@example.test';
  e_sched text := 'sched-' || t_stamp || '@example.test';

  r_inv uuid; r_unconf uuid; r_late uuid; r_tmp uuid;   -- umpire records
  i_one uuid; i_two uuid;                               -- invitations
  o_inv text; o_inv2 text; o_unconf text; o_late text; o_evil text;
  o_youth text; o_youth2 text; o_adult text; o_chief text; o_sched text;
  n bigint;
  v_text text;
  v_ts timestamptz;
  v_status text;
begin
  select p.id into t_admin
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  select p.id into t_ordinary
  from public.profiles p
  where p.account_status = 'approved'
    and p.id <> t_admin
    and not exists (
      select 1 from public.user_roles ur
      where ur.user_id = p.id
        and ur.role_id in ('super_admin', 'umpire_chief', 'scheduler',
                           'treasurer', 'feedback_reviewer', 'read_only_admin')
    )
  limit 1;

  if t_admin is null or t_ordinary is null then
    raise exception 'This check needs an approved super admin and a different approved account with no admin role.';
  end if;

  ----------------------------------------------------------------
  -- Setup (as the database owner): temporary accounts and records
  ----------------------------------------------------------------
  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (u_evil,   e_evil,   now(),  jsonb_build_object('display_name', 'Evil', 'signup_kind', 'super_admin')),
      (u_youth,  e_youth,  now(),  jsonb_build_object('display_name', 'Young Registrant', 'signup_kind', 'youth_umpire')),
      (u_adult,  e_adult,  now(),  jsonb_build_object('display_name', 'Adult Registrant', 'signup_kind', 'adult_umpire')),
      (u_chief,  e_chief,  now(),  jsonb_build_object('display_name', 'Chief Target', 'signup_kind', 'adult_umpire')),
      (u_sched,  e_sched,  now(),  jsonb_build_object('display_name', 'Sched Target', 'signup_kind', 'adult_umpire'));
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;

  insert into public.umpires (display_name, classification, eligibility_status)
  values ('CHECK invitee', 'adult', 'active') returning id into r_inv;
  insert into public.umpires (display_name, classification, eligibility_status)
  values ('CHECK unconfirmed', 'adult', 'active') returning id into r_unconf;
  insert into public.umpires (display_name, classification, eligibility_status)
  values ('CHECK late', 'adult', 'active') returning id into r_late;
  insert into public.umpires (display_name, classification, eligibility_status)
  values ('CHECK spare', 'adult', 'active') returning id into r_tmp;

  -- A made-up sign-up type must be ignored and must never grant anything.
  select registration_kind into v_text from public.profiles where id = u_evil;
  select count(*) into n from public.user_roles where user_id = u_evil;
  if v_text is null and n = 0 then
    report := array_append(report, ('PASS  A1  a made-up sign-up type (super_admin) is ignored and grants nothing')::text);
  else
    report := array_append(report, ('FAIL  A1  a made-up sign-up type was accepted')::text);
    failures := failures + 1;
  end if;

  select registration_kind into v_text from public.profiles where id = u_youth;
  if v_text = 'youth_umpire' then
    report := array_append(report, ('PASS  A2  the youth sign-up choice is recorded as a request')::text);
  else
    report := array_append(report, ('FAIL  A2  the youth sign-up choice was not recorded')::text);
    failures := failures + 1;
  end if;

  ----------------------------------------------------------------
  -- As a super admin: invitations
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    i_one := public.invite_umpire(r_inv, upper(e_inv));
    report := array_append(report, ('PASS  B1  an admin can invite an email (stored in lower case)')::text);
  exception when others then
    report := array_append(report, ('FAIL  B1  invitation refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    i_two := public.invite_umpire(r_tmp, e_inv);
    select count(*) into n from public.umpire_invitations where email = e_inv and status = 'pending';
    select status into v_status from public.umpire_invitations where id = i_one;
    if n = 1 and v_status = 'revoked' then
      report := array_append(report, ('PASS  B2  a new invitation for the same email replaces the old one')::text);
    else
      report := array_append(report, (format('FAIL  B2  %s open invitations for one email; first is %s', n, v_status))::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B2  second invitation failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.invite_umpire(r_tmp, e_evil);
    report := array_append(report, ('FAIL  B3  an email that already has an account was invited')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%already uses this email%' then
      report := array_append(report, ('PASS  B3  inviting an email that already has an account is refused')::text);
    else
      report := array_append(report, ('FAIL  B3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.invite_umpire(r_tmp, 'not an email');
    report := array_append(report, ('FAIL  B4  an invalid email was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%valid email%' then
      report := array_append(report, ('PASS  B4  an invalid email is refused')::text);
    else
      report := array_append(report, ('FAIL  B4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    v_ts := public.renew_umpire_invitation(i_two);
    if v_ts > now() + interval '29 days' then
      report := array_append(report, ('PASS  B5  renewing an invitation gives it a fresh 30 days')::text);
    else
      report := array_append(report, ('FAIL  B5  renewed expiry is too soon')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B5  renew failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.revoke_umpire_invitation(i_two);
    select count(*) into n from public.umpire_invitations where email = e_inv and status = 'pending';
    if n = 0 then
      report := array_append(report, ('PASS  B6  an invitation can be revoked')::text);
    else
      report := array_append(report, ('FAIL  B6  revoked invitation is still open')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B6  revoke failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.revoke_umpire_invitation(i_two);
    report := array_append(report, ('FAIL  B7  a revoked invitation was revoked twice without complaint')::text);
    failures := failures + 1;
  exception when others then
    report := array_append(report, ('PASS  B7  revoking an invitation that is not open is refused')::text);
  end;

  -- The three invitations the claim tests will use.
  perform public.invite_umpire(r_inv, e_inv);
  perform public.invite_umpire(r_unconf, e_unconf);
  perform public.invite_umpire(r_late, e_late);

  reset role;

  -- The invited people register NOW, after the invitations exist, as they
  -- would in real life (an email that already has an account cannot be invited).
  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (u_inv,    e_inv,    now(), '{}'::jsonb),
      (u_unconf, e_unconf, null,  '{}'::jsonb),
      (u_late,   e_late,   now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;

  -- Make the "late" invitation already expired (as the database owner).
  update public.umpire_invitations set expires_at = now() - interval '1 day' where email = e_late;

  ----------------------------------------------------------------
  -- Each person signs in and the app claims their registration
  ----------------------------------------------------------------
  set local role authenticated;

  perform set_config('request.jwt.claim.sub', u_inv::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_inv, 'role', 'authenticated')::text, true);
  o_inv := public.claim_registration();
  o_inv2 := public.claim_registration();

  perform set_config('request.jwt.claim.sub', u_unconf::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_unconf, 'role', 'authenticated')::text, true);
  o_unconf := public.claim_registration();

  perform set_config('request.jwt.claim.sub', u_late::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_late, 'role', 'authenticated')::text, true);
  o_late := public.claim_registration();

  perform set_config('request.jwt.claim.sub', u_evil::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_evil, 'role', 'authenticated')::text, true);
  o_evil := public.claim_registration();

  perform set_config('request.jwt.claim.sub', u_youth::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_youth, 'role', 'authenticated')::text, true);
  o_youth := public.claim_registration();
  o_youth2 := public.claim_registration();

  perform set_config('request.jwt.claim.sub', u_adult::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_adult, 'role', 'authenticated')::text, true);
  o_adult := public.claim_registration();

  perform set_config('request.jwt.claim.sub', u_chief::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_chief, 'role', 'authenticated')::text, true);
  o_chief := public.claim_registration();

  perform set_config('request.jwt.claim.sub', u_sched::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_sched, 'role', 'authenticated')::text, true);
  o_sched := public.claim_registration();

  -- A pending registrant cannot approve themselves.
  perform set_config('request.jwt.claim.sub', u_youth::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', u_youth, 'role', 'authenticated')::text, true);
  begin
    perform public.approve_umpire_registration(u_youth, 'youth', (current_date - interval '15 years')::date);
    report := array_append(report, ('FAIL  D1  a pending registrant approved themselves')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%super admin or umpire chief%' then
      report := array_append(report, ('PASS  D1  a pending registrant cannot approve themselves')::text);
    else
      report := array_append(report, ('FAIL  D1  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  -- An ordinary account cannot approve, reject or invite.
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);

  begin
    perform public.approve_umpire_registration(u_youth, 'youth', (current_date - interval '15 years')::date);
    report := array_append(report, ('FAIL  D2  an ordinary account approved a registration')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%super admin or umpire chief%' then
      report := array_append(report, ('PASS  D2  an ordinary account cannot approve registrations')::text);
    else
      report := array_append(report, ('FAIL  D2  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.reject_umpire_registration(u_youth);
    report := array_append(report, ('FAIL  D3  an ordinary account rejected a registration')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%super admin or umpire chief%' then
      report := array_append(report, ('PASS  D3  an ordinary account cannot reject registrations')::text);
    else
      report := array_append(report, ('FAIL  D3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.invite_umpire(r_tmp, 'someone-' || t_stamp || '@example.test');
    report := array_append(report, ('FAIL  D4  an ordinary account sent an invitation')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%scheduling administrators%' then
      report := array_append(report, ('PASS  D4  an ordinary account cannot send invitations')::text);
    else
      report := array_append(report, ('FAIL  D4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  ----------------------------------------------------------------
  -- What the claims did (read as the database owner)
  ----------------------------------------------------------------
  if o_inv = 'invited' and o_inv2 = 'already'
     and exists (select 1 from public.umpires where id = r_inv and profile_id = u_inv)
     and exists (select 1 from public.profiles where id = u_inv and account_status = 'approved')
     and exists (select 1 from public.user_roles where user_id = u_inv and role_id = 'adult_umpire')
     and exists (select 1 from public.umpire_invitations where email = e_inv and status = 'accepted' and accepted_by = u_inv) then
    report := array_append(report, ('PASS  C1  an invited person who confirms their email is linked, approved and given the adult umpire role (and a second claim changes nothing)')::text);
  else
    report := array_append(report, (format('FAIL  C1  invited claim gave %s then %s, or the account was not set up', o_inv, o_inv2))::text);
    failures := failures + 1;
  end if;

  if o_unconf = 'unconfirmed'
     and exists (select 1 from public.umpires where id = r_unconf and profile_id is null)
     and exists (select 1 from public.profiles where id = u_unconf and account_status = 'pending') then
    report := array_append(report, ('PASS  C2  an invitation is NOT honoured until the email is confirmed')::text);
  else
    report := array_append(report, (format('FAIL  C2  unconfirmed email claim gave %s', o_unconf))::text);
    failures := failures + 1;
  end if;

  if o_late = 'none'
     and exists (select 1 from public.umpires where id = r_late and profile_id is null) then
    report := array_append(report, ('PASS  C3  an expired invitation is not honoured')::text);
  else
    report := array_append(report, (format('FAIL  C3  expired invitation claim gave %s', o_late))::text);
    failures := failures + 1;
  end if;

  select count(*) into n from public.umpires where profile_id = u_evil;
  if o_evil = 'none' and n = 0 then
    report := array_append(report, ('PASS  C4  an account that asked to be a "super_admin" gets no umpire record or roles')::text);
  else
    report := array_append(report, (format('FAIL  C4  made-up type claim gave %s', o_evil))::text);
    failures := failures + 1;
  end if;

  if o_youth = 'registered' and o_youth2 = 'already'
     and exists (select 1 from public.umpires where profile_id = u_youth and classification = 'youth' and eligibility_status = 'inactive')
     and exists (select 1 from public.profiles where id = u_youth and account_status = 'pending')
     and not exists (select 1 from public.user_roles where user_id = u_youth) then
    report := array_append(report, ('PASS  C5  a self-registration creates ONE inactive record awaiting review, with no roles')::text);
  else
    report := array_append(report, (format('FAIL  C5  self-registration gave %s then %s', o_youth, o_youth2))::text);
    failures := failures + 1;
  end if;

  if o_adult = 'registered' and o_chief = 'registered' and o_sched = 'registered' then
    report := array_append(report, ('PASS  C6  adult self-registrations are recorded for review')::text);
  else
    report := array_append(report, (format('FAIL  C6  adult registrations gave %s / %s / %s', o_adult, o_chief, o_sched))::text);
    failures := failures + 1;
  end if;

  ----------------------------------------------------------------
  -- As a super admin: reviewing registrations
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.approve_umpire_registration(u_youth, 'youth', null);
    report := array_append(report, ('FAIL  E1  a youth was approved without a birth date')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%birth date%' then
      report := array_append(report, ('PASS  E1  a youth cannot be approved without a birth date')::text);
    else
      report := array_append(report, ('FAIL  E1  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.approve_umpire_registration(u_youth, 'youth', (current_date - interval '10 years')::date);
    report := array_append(report, ('FAIL  E2  a 10-year-old was approved')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%under 13%' then
      report := array_append(report, ('PASS  E2  an umpire under 13 cannot be approved this way')::text);
    else
      report := array_append(report, ('FAIL  E2  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.approve_umpire_registration(u_youth, 'adult', (current_date - interval '16 years')::date);
    report := array_append(report, ('FAIL  E3  a 16-year-old was approved as an adult')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%under 18%' then
      report := array_append(report, ('PASS  E3  someone under 18 cannot be approved as an adult')::text);
    else
      report := array_append(report, ('FAIL  E3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.approve_umpire_registration(u_youth, 'youth', (current_date - interval '20 years')::date);
    report := array_append(report, ('FAIL  E4  a 20-year-old was approved as a youth')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%18 or older%' then
      report := array_append(report, ('PASS  E4  someone 18 or older cannot be approved as a youth')::text);
    else
      report := array_append(report, ('FAIL  E4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.approve_umpire_registration(u_youth, 'youth', current_date + 30);
    report := array_append(report, ('FAIL  E5  a birth date in the future was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%future%' then
      report := array_append(report, ('PASS  E5  a birth date in the future is refused')::text);
    else
      report := array_append(report, ('FAIL  E5  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.approve_umpire_registration(u_youth, 'youth', (current_date - interval '15 years')::date);
    report := array_append(report, ('PASS  E6  a valid youth registration is approved')::text);
  exception when others then
    report := array_append(report, ('FAIL  E6  a valid approval was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.approve_umpire_registration(u_youth, 'youth', (current_date - interval '15 years')::date);
    report := array_append(report, ('FAIL  E7  the same registration was approved twice')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%already reviewed%' then
      report := array_append(report, ('PASS  E7  a registration cannot be approved twice')::text);
    else
      report := array_append(report, ('FAIL  E7  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.reject_umpire_registration(u_adult);
    report := array_append(report, ('PASS  E8  an admin can reject a registration')::text);
  exception when others then
    report := array_append(report, ('FAIL  E8  rejection refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.approve_umpire_registration(u_adult, 'adult', null);
    report := array_append(report, ('FAIL  E9  a rejected registration was approved')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%already reviewed%' then
      report := array_append(report, ('PASS  E9  a rejected registration cannot then be approved')::text);
    else
      report := array_append(report, ('FAIL  E9  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  -- State after the reviews (as the database owner)
  if exists (select 1 from public.profiles where id = u_youth and account_status = 'approved')
     and exists (select 1 from public.user_roles where user_id = u_youth and role_id = 'youth_umpire')
     and exists (select 1 from public.umpires where profile_id = u_youth and eligibility_status = 'active' and classification = 'youth')
     and exists (select 1 from public.umpire_private_details d join public.umpires u on u.id = d.umpire_id where u.profile_id = u_youth and d.birth_date is not null) then
    report := array_append(report, ('PASS  F1  approval did everything: account approved, youth role granted, record activated, birth date saved')::text);
  else
    report := array_append(report, ('FAIL  F1  approval left something undone')::text);
    failures := failures + 1;
  end if;

  if exists (select 1 from public.profiles where id = u_adult and account_status = 'rejected')
     and not exists (select 1 from public.user_roles where user_id = u_adult) then
    report := array_append(report, ('PASS  F2  a rejected registration stays rejected with no roles')::text);
  else
    report := array_append(report, ('FAIL  F2  rejection did not hold')::text);
    failures := failures + 1;
  end if;

  ----------------------------------------------------------------
  -- Who may approve: a scheduler may not, an umpire chief may
  ----------------------------------------------------------------
  insert into public.user_roles (user_id, role_id) values (t_ordinary, 'scheduler');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);
  begin
    perform public.approve_umpire_registration(u_sched, 'adult', null);
    report := array_append(report, ('FAIL  G1  a scheduler approved an umpire registration')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%super admin or umpire chief%' then
      report := array_append(report, ('PASS  G1  a scheduler cannot approve umpire registrations')::text);
    else
      report := array_append(report, ('FAIL  G1  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;
  reset role;

  delete from public.user_roles where user_id = t_ordinary and role_id = 'scheduler';
  insert into public.user_roles (user_id, role_id) values (t_ordinary, 'umpire_chief');

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);
  begin
    perform public.approve_umpire_registration(u_chief, 'adult', null);
    report := array_append(report, ('PASS  G2  an umpire chief can approve an umpire registration')::text);
  exception when others then
    report := array_append(report, ('FAIL  G2  an umpire chief was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;
  reset role;

  select count(*) into n from public.user_roles where user_id = u_chief and role_id = 'adult_umpire';
  if n = 1 then
    report := array_append(report, ('PASS  G3  the chief''s approval granted the adult umpire role')::text);
  else
    report := array_append(report, ('FAIL  G3  the chief''s approval did not grant the role')::text);
    failures := failures + 1;
  end if;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nREGISTRATION CHECK (nothing was saved)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
