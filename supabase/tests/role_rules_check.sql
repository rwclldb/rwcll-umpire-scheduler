-- RWCLL check: do the role assignment safeguards work?
--
-- Run this in the Supabase SQL Editor AFTER applying
-- 20261024160000_add_role_assignment_rules.sql.
--
-- It tries forbidden and allowed role changes and reports the results.
-- The run ENDS WITH A RED ERROR on purpose: the report is carried in the
-- error message, and raising an error guarantees that everything the
-- script tried is rolled back. Nothing is saved.
--
--   PASS   the rule behaved as intended
--   FAIL   a forbidden change was allowed, or an allowed change was refused
--   SKIP   the test needs data you do not have (it says what)

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  youth uuid;
  admin_count integer;
  sole_admin uuid;
begin
  -- Use an approved account that has the youth_umpire role.
  select ur.user_id into youth
  from public.user_roles ur
  join public.profiles p on p.id = ur.user_id
  where ur.role_id = 'youth_umpire' and p.account_status = 'approved'
  limit 1;

  if youth is null then
    report := array_append(report, ('SKIP  tests 1 to 3 need an approved account with the youth_umpire role')::text);
  else
    -- 1. Roles cannot be given to an account that is not approved.
    begin
      update public.profiles set account_status = 'pending' where id = youth;
      insert into public.user_roles (user_id, role_id) values (youth, 'parent_guardian');
      report := array_append(report, ('FAIL  a role was given to an account that is not approved')::text);
      failures := failures + 1;
    exception when others then
      if sqlerrm like '%approved accounts%' then
        report := array_append(report, ('PASS  a role cannot be given to an account that is not approved')::text);
      else
        report := array_append(report, ('FAIL  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;

    -- 2. A youth umpire cannot also become an adult umpire.
    begin
      insert into public.user_roles (user_id, role_id) values (youth, 'adult_umpire');
      report := array_append(report, ('FAIL  a youth umpire was also made an adult umpire')::text);
      failures := failures + 1;
    exception when others then
      if sqlerrm like '%already a youth umpire%' then
        report := array_append(report, ('PASS  an account cannot be both youth and adult umpire')::text);
      else
        report := array_append(report, ('FAIL  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;

    -- 3. A valid role can still be given and removed.
    begin
      insert into public.user_roles (user_id, role_id) values (youth, 'read_only_admin');
      delete from public.user_roles where user_id = youth and role_id = 'read_only_admin';
      report := array_append(report, ('PASS  a valid role can be given and removed')::text);
    exception when others then
      report := array_append(report, ('FAIL  a valid role change was refused: ' || sqlerrm)::text);
      failures := failures + 1;
    end;
  end if;

  -- 4. The last super admin cannot be removed.
  select count(*) into admin_count from public.user_roles where role_id = 'super_admin';

  if admin_count <> 1 then
    report := array_append(report, ('SKIP  test 4 needs exactly one super admin (found ' || admin_count || ')')::text);
  else
    select user_id into sole_admin from public.user_roles where role_id = 'super_admin';
    begin
      delete from public.user_roles where user_id = sole_admin and role_id = 'super_admin';
      report := array_append(report, ('FAIL  the last super admin was removed')::text);
      failures := failures + 1;
    exception when others then
      if sqlerrm like '%last super admin%' then
        report := array_append(report, ('PASS  the last super admin cannot be removed')::text);
      else
        report := array_append(report, ('FAIL  unexpected message: ' || sqlerrm)::text);
        failures := failures + 1;
      end if;
    end;

    -- 5. With a second super admin in place, removing one is allowed.
    if youth is not null then
      begin
        insert into public.user_roles (user_id, role_id) values (youth, 'super_admin');
        delete from public.user_roles where user_id = youth and role_id = 'super_admin';
        report := array_append(report, ('PASS  a super admin can be removed when another remains')::text);
      exception when others then
        report := array_append(report, ('FAIL  removing one of two super admins was refused: ' || sqlerrm)::text);
        failures := failures + 1;
      end;
    else
      report := array_append(report, ('SKIP  test 5 needs an approved account with the youth_umpire role')::text);
    end if;
  end if;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nROLE RULES CHECK (nothing was saved)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
