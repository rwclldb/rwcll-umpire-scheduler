-- RWCLL check: the automatic sign-out settings.
--
-- Run in the Supabase SQL Editor AFTER applying 20261103100000_add_idle_logout_settings.sql.
--
-- It changes the settings INSIDE its own run to test them, and ENDS WITH A RED
-- ERROR on purpose: the report is carried in the error message, and raising an
-- error guarantees that everything it did is rolled back. Your real settings
-- are not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  x_acct uuid := gen_random_uuid();
  n bigint; v text;
begin
  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    values (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create a test account here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id = x_acct;

  ----------------------------------------------------------------
  -- S1
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.app_settings where key in ('idle_logout_minutes', 'idle_logout_minutes_umpire');
    reset role;
    if n = 2 then report := array_append(report, ('PASS  S1  both settings exist, and any signed-in person can read them (the app needs them)')::text); else report := array_append(report, ('FAIL  S1  a setting is missing or unreadable')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  S1  a setting is missing or unreadable: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- S2
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.app_settings set value = '999' where key = 'idle_logout_minutes';
    reset role;
    report := array_append(report, ('FAIL  S2  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S2  a signed-in person cannot change a setting from the app')::text); else report := array_append(report, ('FAIL  S2  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- S3
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform 1 from public.app_settings;
    reset role;
    report := array_append(report, ('FAIL  S3  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  S3  a signed-out visitor cannot read the settings')::text); else report := array_append(report, ('FAIL  S3  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- (setup, not a test: start from known values)
  reset role;
  update public.app_settings set value = '30' where key in ('idle_logout_minutes', 'idle_logout_minutes_umpire');

  -- V1
  begin
    reset role;
    update public.app_settings set value = '10' where key = 'idle_logout_minutes'; update public.app_settings set value = '240' where key = 'idle_logout_minutes_umpire'; select value into v from public.app_settings where key = 'idle_logout_minutes';
    reset role;
    if v = '10' then report := array_append(report, ('PASS  V1  an ordinary value is accepted (10 minutes for administrators, 240 for umpires)')::text); else report := array_append(report, ('FAIL  V1  a normal value was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V1  a normal value was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V2
  begin
    reset role;
    update public.app_settings set value = '0' where key = 'idle_logout_minutes_umpire'; select value into v from public.app_settings where key = 'idle_logout_minutes_umpire';
    reset role;
    if v = '0' then report := array_append(report, ('PASS  V2  0 (never sign out automatically) is accepted')::text); else report := array_append(report, ('FAIL  V2  0 was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V2  0 was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V3
  begin
    reset role;
    update public.app_settings set value = '480' where key = 'idle_logout_minutes'; select value into v from public.app_settings where key = 'idle_logout_minutes';
    reset role;
    if v = '480' then report := array_append(report, ('PASS  V3  the longest allowed, 480 minutes (8 hours), is accepted')::text); else report := array_append(report, ('FAIL  V3  480 was refused')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V3  480 was refused: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- V4
  begin
    reset role;
    update public.app_settings set value = '481' where key = 'idle_logout_minutes';
    reset role;
    report := array_append(report, ('FAIL  V4  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V4  481 minutes is refused')::text); else report := array_append(report, ('FAIL  V4  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V5
  begin
    reset role;
    update public.app_settings set value = 'abc' where key = 'idle_logout_minutes';
    reset role;
    report := array_append(report, ('FAIL  V5  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V5  text that is not a number is refused')::text); else report := array_append(report, ('FAIL  V5  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V6
  begin
    reset role;
    update public.app_settings set value = '-5' where key = 'idle_logout_minutes';
    reset role;
    report := array_append(report, ('FAIL  V6  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V6  a negative number is refused')::text); else report := array_append(report, ('FAIL  V6  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V7
  begin
    reset role;
    update public.app_settings set value = '1.5' where key = 'idle_logout_minutes_umpire';
    reset role;
    report := array_append(report, ('FAIL  V7  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V7  a number with a decimal point is refused')::text); else report := array_append(report, ('FAIL  V7  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V8
  begin
    reset role;
    update public.app_settings set value = '' where key = 'idle_logout_minutes';
    reset role;
    report := array_append(report, ('FAIL  V8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '23514' then report := array_append(report, ('PASS  V8  an empty value is refused (delete the setting to use the default instead)')::text); else report := array_append(report, ('FAIL  V8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- V9
  begin
    reset role;
    update public.app_settings set value = 'true' where key = 'demo_clock_allowed'; select value into v from public.app_settings where key = 'demo_clock_allowed';
    reset role;
    if v = 'true' then report := array_append(report, ('PASS  V9  the rule applies only to these two settings (the demo clock setting still takes ''true'')')::text); else report := array_append(report, ('FAIL  V9  another setting was affected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  V9  another setting was affected: ' || sqlerrm)::text); failures := failures + 1;
  end;


  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nAUTOMATIC SIGN-OUT SETTINGS CHECK (nothing was saved; your real settings were not changed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
