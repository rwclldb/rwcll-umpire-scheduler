-- RWCLL check: do the account-details rules work?
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261024190000_add_account_details.sql.
--
-- It signs in (inside the database) as a super admin and as an ordinary
-- account and tries allowed and forbidden things. The run ENDS WITH A RED
-- ERROR on purpose: the report is carried in the error message, and raising
-- an error guarantees that everything it tried is rolled back.
--
--   PASS   the rule behaved as intended
--   FAIL   a forbidden change was allowed, or an allowed change was refused
--   SKIP   the test needs data you do not have (it says what)

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  admin_id uuid;
  owner_id uuid;
  other_id uuid;
  u1 uuid;
  u2 uuid;
  n bigint;
  stamp timestamptz;
  shared_id text := 'CHECK-' || gen_random_uuid()::text;
begin
  -- Cast of characters
  select p.id into admin_id
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  select p.id into owner_id
  from public.profiles p
  where p.account_status = 'approved'
    and not exists (
      select 1 from public.user_roles ur
      where ur.user_id = p.id
        and ur.role_id in ('super_admin', 'umpire_chief', 'scheduler',
                           'treasurer', 'feedback_reviewer', 'read_only_admin')
    )
  limit 1;

  if admin_id is null or owner_id is null then
    raise exception 'This check needs an approved super admin and an approved account with no admin role.';
  end if;

  select p.id into other_id
  from public.profiles p
  where p.account_status = 'approved' and p.id <> admin_id and p.id <> owner_id
  limit 1;

  select id into u1 from public.umpires order by id limit 1;
  select id into u2 from public.umpires order by id offset 1 limit 1;

  ----------------------------------------------------------------
  -- As the super admin
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  if other_id is null then
    report := array_append(report, ('SKIP  tests A1, A2 and A4 need a second approved account')::text);
  else
    begin
      insert into public.account_contact (profile_id, phone)
      values (other_id, '650-555-0111')
      on conflict (profile_id) do update set phone = excluded.phone;
      report := array_append(report, ('PASS  A1  an admin can fix another account''s phone number')::text);
    exception when others then
      report := array_append(report, ('FAIL  A1  admin could not save a phone number: ' || sqlerrm)::text);
      failures := failures + 1;
    end;

    begin
      update public.account_contact set sms_opt_in = true where profile_id = other_id;
      report := array_append(report, ('FAIL  A2  an admin turned text messages ON for someone else')::text);
      failures := failures + 1;
    exception when others then
      if sqlerrm like '%account holder%' then
        report := array_append(report, ('PASS  A2  an admin cannot turn text messages on for someone else')::text);
      else
        report := array_append(report, ('FAIL  A2  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;
  end if;

  begin
    insert into public.account_admin_details (profile_id, external_id_primary)
    values (owner_id, shared_id)
    on conflict (profile_id) do update set external_id_primary = excluded.external_id_primary;
    report := array_append(report, ('PASS  A3  an admin can save an account''s outside ID')::text);
  exception when others then
    report := array_append(report, ('FAIL  A3  admin could not save an outside ID: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  if other_id is not null then
    begin
      insert into public.account_admin_details (profile_id, external_id_primary)
      values (other_id, shared_id)
      on conflict (profile_id) do update set external_id_primary = excluded.external_id_primary;
      report := array_append(report, ('FAIL  A4  the same outside ID was given to two accounts')::text);
      failures := failures + 1;
    exception when others then
      if sqlstate = '23505' then
        report := array_append(report, ('PASS  A4  one outside ID cannot belong to two accounts')::text);
      else
        report := array_append(report, ('FAIL  A4  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;
  end if;

  if u1 is null or u2 is null then
    report := array_append(report, ('SKIP  tests A5 and A6 need at least two umpire records')::text);
  else
    begin
      insert into public.umpire_private_details (umpire_id, birth_date, external_id_primary)
      values (u1, date '2012-05-01', shared_id || '-U')
      on conflict (umpire_id) do update
        set birth_date = excluded.birth_date,
            external_id_primary = excluded.external_id_primary;
      report := array_append(report, ('PASS  A5  an admin can save an umpire''s birth date and outside ID')::text);
    exception when others then
      report := array_append(report, ('FAIL  A5  umpire details were refused: ' || sqlerrm)::text);
      failures := failures + 1;
    end;

    begin
      insert into public.umpire_private_details (umpire_id, external_id_primary)
      values (u2, shared_id || '-U')
      on conflict (umpire_id) do update
        set external_id_primary = excluded.external_id_primary;
      report := array_append(report, ('FAIL  A6  the same outside ID was given to two umpires')::text);
      failures := failures + 1;
    exception when others then
      if sqlstate = '23505' then
        report := array_append(report, ('PASS  A6  one outside ID cannot belong to two umpires')::text);
      else
        report := array_append(report, ('FAIL  A6  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;
  end if;

  reset role;

  ----------------------------------------------------------------
  -- As an ordinary account (the account holder)
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.account_contact (profile_id, phone, sms_opt_in)
    values (owner_id, '650-555-0100', true)
    on conflict (profile_id) do update
      set phone = excluded.phone, sms_opt_in = excluded.sms_opt_in;
    select sms_opt_in_at into stamp from public.account_contact where profile_id = owner_id;
    if stamp is not null then
      report := array_append(report, ('PASS  B1  the account holder can save a phone and turn text messages on (time recorded)')::text);
    else
      report := array_append(report, ('FAIL  B1  text messages are on but no consent time was recorded')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B1  the account holder was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    update public.account_contact set sms_opt_in = false where profile_id = owner_id;
    select sms_opt_in_at into stamp from public.account_contact where profile_id = owner_id;
    if stamp is null then
      report := array_append(report, ('PASS  B2  turning text messages off clears the consent time')::text);
    else
      report := array_append(report, ('FAIL  B2  consent time was kept after turning text messages off')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B2  could not turn text messages off: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    update public.account_contact set phone = null, sms_opt_in = true where profile_id = owner_id;
    report := array_append(report, ('FAIL  B3  text messages were allowed without a phone number')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  B3  text messages cannot be on without a phone number')::text);
    else
      report := array_append(report, ('FAIL  B3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.account_contact set phone = 'call me maybe' where profile_id = owner_id;
    report := array_append(report, ('FAIL  B4  a phone number with letters was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  B4  a phone number with letters is refused')::text);
    else
      report := array_append(report, ('FAIL  B4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  if other_id is not null then
    begin
      insert into public.account_contact (profile_id, phone)
      values (other_id, '650-555-0999')
      on conflict (profile_id) do update set phone = excluded.phone;
      report := array_append(report, ('FAIL  B5  an ordinary account changed another account''s contact details')::text);
      failures := failures + 1;
    exception when others then
      if sqlstate = '42501' then
        report := array_append(report, ('PASS  B5  an ordinary account cannot change another account''s contact details')::text);
      else
        report := array_append(report, ('FAIL  B5  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;

    select count(*) into n from public.account_contact where profile_id <> owner_id;
    if n = 0 then
      report := array_append(report, ('PASS  B6  an ordinary account cannot read other people''s contact details')::text);
    else
      report := array_append(report, (format('FAIL  B6  an ordinary account can read %s other contact row(s)', n))::text);
      failures := failures + 1;
    end if;
  end if;

  select count(*) into n from public.account_admin_details;
  if n = 0 then
    report := array_append(report, ('PASS  B7  an ordinary account cannot read outside IDs (not even its own)')::text);
  else
    report := array_append(report, (format('FAIL  B7  an ordinary account can read %s outside ID row(s)', n))::text);
    failures := failures + 1;
  end if;

  begin
    insert into public.account_admin_details (profile_id, external_id_primary)
    values (owner_id, 'SELF-' || shared_id)
    on conflict (profile_id) do update set external_id_primary = excluded.external_id_primary;
    report := array_append(report, ('FAIL  B8  an ordinary account set its own outside ID')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  B8  an ordinary account cannot set outside IDs')::text);
    else
      report := array_append(report, ('FAIL  B8  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  ----------------------------------------------------------------
  -- Unique emails, ignoring letter case (as the database owner)
  ----------------------------------------------------------------
  if other_id is null then
    report := array_append(report, ('SKIP  C1  needs a second approved account')::text);
  else
    begin
      update public.profiles
      set email = upper((select email from public.profiles where id = owner_id))
      where id = other_id;
      report := array_append(report, ('FAIL  C1  two accounts were given the same email (different letter case)')::text);
      failures := failures + 1;
    exception when others then
      if sqlstate = '23505' then
        report := array_append(report, ('PASS  C1  emails must be unique even when the letter case differs')::text);
      else
        report := array_append(report, ('FAIL  C1  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;
  end if;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nACCOUNT DETAILS CHECK (nothing was saved)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
