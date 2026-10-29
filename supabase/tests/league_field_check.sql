-- RWCLL check: the league-field marker on locations.
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261030100000_add_league_field_marker.sql.
--
-- It ENDS WITH A RED ERROR on purpose: the report is carried in the error
-- message, and raising an error guarantees that everything it created is rolled
-- back. Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  x_acct uuid := gen_random_uuid();
  loc uuid; loc2 uuid;
  v boolean;
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
    values (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create a test account here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id = x_acct;

  ----------------------------------------------------------------
  -- F1
  begin
    reset role;
    insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc; select is_league_field into v from public.locations where id = loc;
    reset role;
    if v = false then report := array_append(report, ('PASS  F1  a field created without saying is NOT a league field (it defaults to an away field)')::text); else report := array_append(report, ('FAIL  F1  the default is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F1  the default is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.locations (name, is_league_field) values ('CHK Home ' || stamp, true) returning id into loc2; update public.locations set is_league_field = false where id = loc; update public.locations set is_league_field = true where id = loc;
    reset role;
    if (select is_league_field from public.locations where id = loc2) = true and (select is_league_field from public.locations where id = loc) = true then report := array_append(report, ('PASS  F2  an administrator can create a league field, and change a field to or from a league field')::text); else report := array_append(report, ('FAIL  F2  the administrator could not set it')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F2  the administrator could not set it: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.locations set is_league_field = false where id = loc2;
    reset role;
    if (select is_league_field from public.locations where id = loc2) = false then report := array_append(report, ('PASS  F3  ...and can change it back to an away field')::text); else report := array_append(report, ('FAIL  F3  the change did not stick')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F3  the change did not stick: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.locations set is_league_field = null where id = loc;
    reset role;
    report := array_append(report, ('FAIL  F4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23502' then report := array_append(report, ('PASS  F4  the marker cannot be left blank')::text); else report := array_append(report, ('FAIL  F4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- F5
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.locations set is_league_field = not is_league_field where id = loc;
    reset role;
    if (select is_league_field from public.locations where id = loc) = true then report := array_append(report, ('PASS  F5  an ordinary account cannot change it')::text); else report := array_append(report, ('FAIL  F5  an ordinary account changed a field')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  F5  an ordinary account changed a field: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- F6
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    update public.locations set is_league_field = true where id = loc;
    reset role;
    report := array_append(report, ('FAIL  F6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  F6  a signed-out visitor cannot change it')::text); else report := array_append(report, ('FAIL  F6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nLEAGUE FIELD CHECK (nothing was saved; your real data was not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
