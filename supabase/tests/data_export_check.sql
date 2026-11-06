-- RWCLL check: Download everything (begin_export, export_table, finish_export, export_log).
--
-- Run in the Supabase SQL Editor AFTER applying 20261111110000_add_data_export.sql.
--
-- It builds its own accounts and an umpire, then acts as each of them. It ENDS WITH A RED ERROR on purpose:
-- the report is carried in the error message, and raising an error guarantees everything it created
-- (including its entries in the export log) is rolled back. Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  sa2 uuid := gen_random_uuid(); ch_acct uuid := gen_random_uuid(); sc_acct uuid := gen_random_uuid(); par1 uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  um_id uuid;
  ex jsonb; ex_id uuid; ex2 jsonb; ex2_id uuid; rows jsonb;
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
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    select a, 'chk-' || stamp || '-' || i || '@example.org', now(), m::jsonb
    from (values
      (sa2, 'sa2', '{}'), (ch_acct, 'ch', '{}'), (sc_acct, 'sc', '{}'), (par1, 'par1', '{"signup_kind":"parent_guardian"}'), (x_acct, 'x', '{}')
    ) as t(a, i, m);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (sa2, ch_acct, sc_acct, par1, x_acct);
  insert into public.user_roles (user_id, role_id) values
    (sa2, 'super_admin'), (ch_acct, 'umpire_chief'), (sc_acct, 'scheduler'), (par1, 'parent_guardian');

  insert into public.umpires (display_name, classification) values ('CHK Export Umpire ' || stamp, 'adult') returning id into um_id;

  ----------------------------------------------------------------
  -- 1. A super admin downloads everything
  ----------------------------------------------------------------
  -- E1
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    ex := public.begin_export(); ex_id := (ex->>'export_id')::uuid;
    reset role;
    if ex_id is not null and jsonb_typeof(ex->'tables') = 'array' and jsonb_array_length(ex->'tables') >= 20 then report := array_append(report, ('PASS  E1  starting a download returns its id and the list of tables (at least 20)')::text); else report := array_append(report, ('FAIL  E1  the download did not start properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E1  the download did not start properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E1b
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    null;
    reset role;
    if coalesce(btrim(ex->>'by'), '') <> '' then report := array_append(report, ('PASS  E1b  it also says who is downloading (for the README in the file)')::text); else report := array_append(report, ('FAIL  E1b  no name came back')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E1b  no name came back: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E2
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    null;
    reset role;
    if ex->'tables' ? 'umpires' and ex->'tables' ? 'games' and ex->'tables' ? 'game_assignments' and ex->'tables' ? 'profiles' and ex->'tables' ? 'export_log' then report := array_append(report, ('PASS  E2  the tables offered include the main ones, and the log of downloads itself')::text); else report := array_append(report, ('FAIL  E2  a main table is missing from the list')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E2  a main table is missing from the list: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E3
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    null;
    reset role;
    if (select count(*) from jsonb_array_elements_text(ex->'tables') t where t.value not in (select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r')) = 0 and jsonb_array_length(ex->'tables') = (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r') then report := array_append(report, ('PASS  E3  the list is exactly every table in the public schema (so tables added later are included automatically)')::text); else report := array_append(report, ('FAIL  E3  the list is not every public table')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E3  the list is not every public table: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E4
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.export_log where id = ex_id and status = 'started' and exported_by = t_admin;
    reset role;
    if n = 1 then report := array_append(report, ('PASS  E4  starting a download is recorded in the export log, as started, by that super admin')::text); else report := array_append(report, ('FAIL  E4  the start was not recorded')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E4  the start was not recorded: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E5
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    rows := public.export_table(ex_id, 'umpires');
    reset role;
    if jsonb_typeof(rows) = 'array' and jsonb_array_length(rows) = (select count(*) from public.umpires) then report := array_append(report, ('PASS  E5  a table comes back as a list with exactly as many rows as the table has')::text); else report := array_append(report, ('FAIL  E5  the row count is wrong')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E5  the row count is wrong: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E6
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    null;
    reset role;
    if exists (select 1 from jsonb_array_elements(rows) r where r->>'display_name' = 'CHK Export Umpire ' || stamp and r->>'id' = um_id::text) then report := array_append(report, ('PASS  E6  ...and the rows carry the real values by column name (the test umpire is there with its id)')::text); else report := array_append(report, ('FAIL  E6  the test umpire''s values are not in the result')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E6  the test umpire''s values are not in the result: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E7
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    rows := public.export_table(ex_id, 'export_log');
    reset role;
    if jsonb_typeof(rows) = 'array' and jsonb_array_length(rows) >= 1 then report := array_append(report, ('PASS  E7  the log of downloads can be downloaded too')::text); else report := array_append(report, ('FAIL  E7  the export log table could not be read')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E7  the export log table could not be read: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E8
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'no_such_table');
    reset role;
    report := array_append(report, ('FAIL  E8  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%There is no table called%' then report := array_append(report, ('PASS  E8  a table that does not exist is refused')::text); else report := array_append(report, ('FAIL  E8  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E9
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'umpires; drop table public.umpires');
    reset role;
    report := array_append(report, ('FAIL  E9  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%There is no table called%' then report := array_append(report, ('PASS  E9  a table name with SQL in it is refused (nothing runs)')::text); else report := array_append(report, ('FAIL  E9  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E10
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'auth.users');
    reset role;
    report := array_append(report, ('FAIL  E10  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%There is no table called%' then report := array_append(report, ('PASS  E10  a table outside public (such as the sign-in accounts) cannot be read through it')::text); else report := array_append(report, ('FAIL  E10  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E11
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.umpires;
    reset role;
    if n >= 1 then report := array_append(report, ('PASS  E11  (the umpires table is still there after the refused attempts)')::text); else report := array_append(report, ('FAIL  E11  the umpires table is missing')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E11  the umpires table is missing: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 2. Finishing, and the download closing
  ----------------------------------------------------------------
  -- E12
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_export(ex_id, 31, 1234);
    reset role;
    if exists (select 1 from public.export_log where id = ex_id and status = 'finished' and tables_count = 31 and rows_count = 1234 and finished_at is not null) then report := array_append(report, ('PASS  E12  finishing records the status, the numbers and the time')::text); else report := array_append(report, ('FAIL  E12  finishing did not record properly')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E12  finishing did not record properly: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E13
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E13  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open any more%' then report := array_append(report, ('PASS  E13  once finished, a download cannot read any more tables')::text); else report := array_append(report, ('FAIL  E13  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E14
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_export(ex_id, 1, 1);
    reset role;
    report := array_append(report, ('FAIL  E14  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open any more%' then report := array_append(report, ('PASS  E14  ...and cannot be finished twice')::text); else report := array_append(report, ('FAIL  E14  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E15
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    ex2 := public.begin_export(); ex2_id := (ex2->>'export_id')::uuid;
    reset role;
    if ex2_id is not null and ex2_id <> ex_id then report := array_append(report, ('PASS  E15  a new download can be started')::text); else report := array_append(report, ('FAIL  E15  a second download could not start')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E15  a second download could not start: ' || sqlerrm)::text); failures := failures + 1;
  end;

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  update public.export_log set started_at = now() - interval '3 hours' where id = ex2_id;

  -- E16
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex2_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E16  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open any more%' then report := array_append(report, ('PASS  E16  a download left open for more than two hours closes by itself')::text); else report := array_append(report, ('FAIL  E16  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 3. Only the super admin who started it
  ----------------------------------------------------------------
  -- E17
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    ex := public.begin_export(); ex_id := (ex->>'export_id')::uuid;
    reset role;
    if ex_id is not null then report := array_append(report, ('PASS  E17  (setup: a fresh download is started by the first super admin)')::text); else report := array_append(report, ('FAIL  E17  a download could not start')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E17  a download could not start: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E18
  begin
    perform set_config('request.jwt.claim.sub', sa2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sa2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E18  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open any more%' then report := array_append(report, ('PASS  E18  ANOTHER super admin cannot read tables through someone else''s download')::text); else report := array_append(report, ('FAIL  E18  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E19
  begin
    perform set_config('request.jwt.claim.sub', sa2::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sa2, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_export(ex_id, 1, 1);
    reset role;
    report := array_append(report, ('FAIL  E19  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not open any more%' then report := array_append(report, ('PASS  E19  ...nor finish it')::text); else report := array_append(report, ('FAIL  E19  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 4. Nobody else, and nobody signed out
  ----------------------------------------------------------------
  -- E20-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.begin_export();
    reset role;
    report := array_append(report, ('FAIL  E20-ch  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E20-ch  an umpire chief cannot start a download')::text); else report := array_append(report, ('FAIL  E20-ch  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E21-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E21-ch  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E21-ch  an umpire chief cannot read a table through it, even with a valid download id')::text); else report := array_append(report, ('FAIL  E21-ch  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E22-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_export(ex_id, 1, 1);
    reset role;
    report := array_append(report, ('FAIL  E22-ch  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E22-ch  an umpire chief cannot finish one')::text); else report := array_append(report, ('FAIL  E22-ch  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E20-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.begin_export();
    reset role;
    report := array_append(report, ('FAIL  E20-sc  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E20-sc  a scheduler cannot start a download')::text); else report := array_append(report, ('FAIL  E20-sc  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E21-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E21-sc  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E21-sc  a scheduler cannot read a table through it, even with a valid download id')::text); else report := array_append(report, ('FAIL  E21-sc  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E22-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_export(ex_id, 1, 1);
    reset role;
    report := array_append(report, ('FAIL  E22-sc  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E22-sc  a scheduler cannot finish one')::text); else report := array_append(report, ('FAIL  E22-sc  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E20-pa
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.begin_export();
    reset role;
    report := array_append(report, ('FAIL  E20-pa  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E20-pa  a parent cannot start a download')::text); else report := array_append(report, ('FAIL  E20-pa  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E21-pa
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E21-pa  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E21-pa  a parent cannot read a table through it, even with a valid download id')::text); else report := array_append(report, ('FAIL  E21-pa  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E22-pa
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_export(ex_id, 1, 1);
    reset role;
    report := array_append(report, ('FAIL  E22-pa  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E22-pa  a parent cannot finish one')::text); else report := array_append(report, ('FAIL  E22-pa  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E20-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.begin_export();
    reset role;
    report := array_append(report, ('FAIL  E20-x_  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E20-x_  an ordinary account cannot start a download')::text); else report := array_append(report, ('FAIL  E20-x_  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E21-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.export_table(ex_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E21-x_  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E21-x_  an ordinary account cannot read a table through it, even with a valid download id')::text); else report := array_append(report, ('FAIL  E21-x_  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E22-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.finish_export(ex_id, 1, 1);
    reset role;
    report := array_append(report, ('FAIL  E22-x_  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only a super admin%' then report := array_append(report, ('PASS  E22-x_  an ordinary account cannot finish one')::text); else report := array_append(report, ('FAIL  E22-x_  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E23
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.begin_export();
    reset role;
    report := array_append(report, ('FAIL  E23  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  E23  a signed-out visitor cannot start a download')::text); else report := array_append(report, ('FAIL  E23  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E24
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.export_table(ex_id, 'umpires');
    reset role;
    report := array_append(report, ('FAIL  E24  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  E24  a signed-out visitor cannot read a table')::text); else report := array_append(report, ('FAIL  E24  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 5. The export log
  ----------------------------------------------------------------
  -- E25
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.export_log;
    reset role;
    if n >= 3 then report := array_append(report, ('PASS  E25  a super admin can read the export log')::text); else report := array_append(report, ('FAIL  E25  the log could not be read')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E25  the log could not be read: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E26-ch
  begin
    perform set_config('request.jwt.claim.sub', ch_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', ch_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.export_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  E26-ch  an umpire chief sees no rows of the export log')::text); else report := array_append(report, ('FAIL  E26-ch  an umpire chief could read the export log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E26-ch  an umpire chief could read the export log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E26-sc
  begin
    perform set_config('request.jwt.claim.sub', sc_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', sc_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.export_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  E26-sc  a scheduler sees no rows of the export log')::text); else report := array_append(report, ('FAIL  E26-sc  a scheduler could read the export log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E26-sc  a scheduler could read the export log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E26-pa
  begin
    perform set_config('request.jwt.claim.sub', par1::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', par1, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.export_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  E26-pa  a parent sees no rows of the export log')::text); else report := array_append(report, ('FAIL  E26-pa  a parent could read the export log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E26-pa  a parent could read the export log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E26-x_
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.export_log;
    reset role;
    if n = 0 then report := array_append(report, ('PASS  E26-x_  an ordinary account sees no rows of the export log')::text); else report := array_append(report, ('FAIL  E26-x_  an ordinary account could read the export log')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  E26-x_  an ordinary account could read the export log: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- E27
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into public.export_log (exported_by_name) values ('forged');
    reset role;
    report := array_append(report, ('FAIL  E27  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  E27  not even a super admin can write to the log directly: entries come only from the functions')::text); else report := array_append(report, ('FAIL  E27  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E28
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.export_log set rows_count = 0;
    reset role;
    report := array_append(report, ('FAIL  E28  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  E28  ...or change it')::text); else report := array_append(report, ('FAIL  E28  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- E29
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    delete from public.export_log;
    reset role;
    report := array_append(report, ('FAIL  E29  this was allowed but should have been refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  E29  ...or delete from it')::text); else report := array_append(report, ('FAIL  E29  unexpected result: ' || sqlstate || ' ' || sqlerrm)::text); failures := failures + 1; end if;
  end;


  raise exception E'\n\nDOWNLOAD EVERYTHING CHECK (nothing was saved; your real data is unchanged)\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
