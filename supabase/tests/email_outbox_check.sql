-- RWCLL check: does the email outbox work and stay private?
--
-- Run in the Supabase SQL Editor AFTER applying
-- 20261024210000_add_email_outbox.sql.
--
-- It signs in (inside the database) as a super admin and as an ordinary
-- account. The run ENDS WITH A RED ERROR on purpose: the report is carried in
-- the error message, and raising an error guarantees that everything it
-- tried is rolled back. Nothing is saved and nothing is emailed.
--
--   PASS   the rule behaved as intended
--   FAIL   a forbidden thing was allowed, or an allowed thing was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  t_admin uuid;
  t_ordinary uuid;
  m1 uuid;
  m2 uuid;
  n bigint;
  r record;
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
  -- As a super admin
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_admin::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    m1 := public.queue_email('invitation', '  Test.Person@Example.TEST ', 'Hello', 'Body text');
    select * into r from public.email_outbox where id = m1;
    if r.status = 'queued' and r.to_email = 'test.person@example.test'
       and r.created_by = t_admin and r.sent_at is null and r.attempts = 0 then
      report := array_append(report, ('PASS  B1  an admin can queue a message (address cleaned up, status queued, creator recorded)')::text);
    else
      report := array_append(report, ('FAIL  B1  the queued message is not as expected')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B1  queueing was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.queue_email('other', 'not an email', 'Hello', 'Body');
    report := array_append(report, ('FAIL  B2  a message to an invalid address was queued')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  B2  an invalid address is refused')::text);
    else
      report := array_append(report, ('FAIL  B2  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.queue_email('other', 'a@example.test', '   ', 'Body');
    report := array_append(report, ('FAIL  B3  a message with no subject was queued')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  B3  an empty subject is refused')::text);
    else
      report := array_append(report, ('FAIL  B3  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.queue_email('other', 'a@example.test', 'Hello', '');
    report := array_append(report, ('FAIL  B4  a message with no body was queued')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  B4  an empty body is refused')::text);
    else
      report := array_append(report, ('FAIL  B4  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.queue_email('nonsense', 'a@example.test', 'Hello', 'Body');
    report := array_append(report, ('FAIL  B5  an unknown message type was accepted')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '23514' then
      report := array_append(report, ('PASS  B5  an unknown message type is refused')::text);
    else
      report := array_append(report, ('FAIL  B5  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.mark_email_sent(m1);
    select * into r from public.email_outbox where id = m1;
    if r.status = 'sent' and r.sent_via = 'manual' and r.sent_at is not null and r.attempts = 1 then
      report := array_append(report, ('PASS  B6  marking a message sent records how, when, and the attempt')::text);
    else
      report := array_append(report, ('FAIL  B6  the sent message is not as expected')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B6  marking sent was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.mark_email_sent(m1);
    report := array_append(report, ('FAIL  B7  a message was marked sent twice')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%no longer waiting%' then
      report := array_append(report, ('PASS  B7  a message cannot be marked sent twice')::text);
    else
      report := array_append(report, ('FAIL  B7  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    m2 := public.queue_email('reminder', 'second@example.test', 'Second', 'Second body');
    perform public.skip_email(m2);
    select count(*) into n from public.email_outbox where id = m2 and status = 'skipped';
    if n = 1 then
      report := array_append(report, ('PASS  B8  a queued message can be set aside (skipped)')::text);
    else
      report := array_append(report, ('FAIL  B8  skipping did not work')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  B8  skipping was refused: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  begin
    perform public.skip_email(m2);
    report := array_append(report, ('FAIL  B9  a skipped message was skipped again')::text);
    failures := failures + 1;
  exception when others then
    report := array_append(report, ('PASS  B9  a message that is not waiting cannot be skipped')::text);
  end;

  begin
    insert into public.email_outbox (to_email, subject, body) values ('x@example.test', 's', 'b');
    report := array_append(report, ('FAIL  B10  an admin wrote to the outbox table directly')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  B10  the outbox cannot be written directly, only through the functions')::text);
    else
      report := array_append(report, ('FAIL  B10  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    update public.email_outbox set status = 'sent' where id = m2;
    report := array_append(report, ('FAIL  B11  an admin edited the outbox table directly')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  B11  the outbox cannot be edited directly')::text);
    else
      report := array_append(report, ('FAIL  B11  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  select count(*) into n from public.email_outbox;
  if n >= 2 then
    report := array_append(report, ('PASS  B12  an admin can read the outbox')::text);
  else
    report := array_append(report, ('FAIL  B12  an admin cannot read the outbox')::text);
    failures := failures + 1;
  end if;

  begin
    perform public.enqueue_email('other', 'a@example.test', 'Hello', 'Body');
    report := array_append(report, ('FAIL  B13  the internal enqueue function was callable by a signed-in user')::text);
    failures := failures + 1;
  exception when others then
    if sqlstate = '42501' then
      report := array_append(report, ('PASS  B13  the internal enqueue function cannot be called from the app')::text);
    else
      report := array_append(report, ('FAIL  B13  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  reset role;

  ----------------------------------------------------------------
  -- As an ordinary account
  ----------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.queue_email('other', 'a@example.test', 'Hello', 'Body');
    report := array_append(report, ('FAIL  C1  an ordinary account queued a message')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%scheduling administrators%' then
      report := array_append(report, ('PASS  C1  an ordinary account cannot queue email')::text);
    else
      report := array_append(report, ('FAIL  C1  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  begin
    perform public.mark_email_sent(m1);
    report := array_append(report, ('FAIL  C2  an ordinary account changed the outbox')::text);
    failures := failures + 1;
  exception when others then
    if sqlerrm like '%scheduling administrators%' then
      report := array_append(report, ('PASS  C2  an ordinary account cannot change the outbox')::text);
    else
      report := array_append(report, ('FAIL  C2  unexpected message: ' || sqlerrm)::text);
      failures := failures + 1;
    end if;
  end;

  select count(*) into n from public.email_outbox;
  if n = 0 then
    report := array_append(report, ('PASS  C3  an ordinary account cannot read anyone''s queued email')::text);
  else
    report := array_append(report, (format('FAIL  C3  an ordinary account can read %s message(s)', n))::text);
    failures := failures + 1;
  end if;

  reset role;

  ----------------------------------------------------------------
  -- The internal path that future triggers will use (database owner)
  ----------------------------------------------------------------
  -- With NOBODY signed in (the sign-in settings left over from the tests above
  -- are cleared first), the message is recorded with no creator.
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);

  begin
    m1 := public.enqueue_email('assignment', 'umpire@example.test', 'You have a game', 'Details');
    select * into r from public.email_outbox where id = m1;
    if r.status = 'queued' and r.created_by is null and r.kind = 'assignment' then
      report := array_append(report, ('PASS  D1  the internal enqueue path works with nobody signed in (for future automatic emails)')::text);
    else
      report := array_append(report, ('FAIL  D1  the internal message is not as expected')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  D1  internal enqueue failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- When a signed-in person's action triggers it, the message records who.
  perform set_config('request.jwt.claim.sub', t_ordinary::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', t_ordinary, 'role', 'authenticated')::text, true);

  begin
    m2 := public.enqueue_email('schedule_change', 'umpire@example.test', 'Game moved', 'Details');
    select * into r from public.email_outbox where id = m2;
    if r.status = 'queued' and r.created_by = t_ordinary then
      report := array_append(report, ('PASS  D2  an automatic message records which signed-in person triggered it')::text);
    else
      report := array_append(report, ('FAIL  D2  the triggering person was not recorded')::text);
      failures := failures + 1;
    end if;
  exception when others then
    report := array_append(report, ('FAIL  D2  internal enqueue failed: ' || sqlerrm)::text);
    failures := failures + 1;
  end;

  -- Always end with an error so that nothing can be saved.
  raise exception E'\n\nEMAIL OUTBOX CHECK (nothing was saved, nothing was emailed)\n\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
