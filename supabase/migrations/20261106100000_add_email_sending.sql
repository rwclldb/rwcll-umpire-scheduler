-- Sending messages for real: the sender's database side, safety settings,
-- scheduled reminders, and a text-message queue.
--
-- Needs the demo clock migration (20261101100000) applied first.
-- ----------------------------------------------------------------------------
-- HOW SENDING WORKS
--
--   The app and the database add messages to email_outbox (and sms_outbox). A
--   SENDER (the Edge Function in supabase/functions/send-outbox) runs every few
--   minutes, claims waiting messages with claim_outbox_batch, sends them, and
--   reports back with finish_outbox_message. It is the ONLY thing that sends.
--   The database never sends anything itself.
--
-- SAFETY (all of this is OFF until you switch it on, in sending_settings)
--
--   email_mode / sms_mode   off   nothing is sent (the default)
--                           safe  only to addresses/numbers on the safe list;
--                                 everything else is set aside, not sent
--                           live  sent to whoever the message is for
--   *_max_age_hours         a message older than this is NOT sent (so switching
--                           sending on cannot release a backlog of old messages)
--   email_daily_limit       the most emails sent in any 24 hours (Google limits this)
--
--   Settings can only be changed in the SQL Editor. Administrators can read them.
--
-- SCHEDULED JOBS: queue_unconfirmed_warnings, queue_self_assign_digest and the new
-- queue_game_reminders can now be run by the database's own schedule (nobody signed
-- in) as well as by an administrator. supabase/jobs/schedule_email_jobs.sql sets that up.
-- ----------------------------------------------------------------------------

begin;

-- ======================================================== settings (admins read)
create table public.sending_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  constraint sending_settings_mode_valid
    check (key not in ('email_mode', 'sms_mode') or value in ('off', 'safe', 'live')),
  constraint sending_settings_number_valid
    check (
      key not in ('email_daily_limit', 'email_max_age_hours', 'sms_max_age_hours')
      or case when value ~ '^[0-9]{1,5}$' then value::integer between 1 and 10000 else false end
    )
);

alter table public.sending_settings enable row level security;

revoke all on table public.sending_settings from public, anon, authenticated;
grant select on table public.sending_settings to authenticated;

create policy "Scheduling admins read the sending settings"
on public.sending_settings for select to authenticated
using (public.is_scheduling_admin());

insert into public.sending_settings (key, value) values
  ('email_mode', 'off'),
  ('email_safe_allowlist', ''),          -- addresses, separated by commas or spaces
  ('email_safe_redirect', ''),           -- optional: in safe mode, send everything else here instead
  ('email_daily_limit', '400'),
  ('email_max_age_hours', '72'),
  ('email_from_name', 'RWCLL Umpires'),
  ('email_reply_to', ''),
  ('app_url', ''),                       -- the address of the app, put in reminders
  ('sms_mode', 'off'),
  ('sms_safe_allowlist', ''),            -- numbers, separated by commas or spaces
  ('sms_max_age_hours', '6');

-- ===================================================== the email queue, for a sender
alter table public.email_outbox
  add column claimed_at timestamptz,
  add column next_attempt_at timestamptz;

-- a text-message queue (only for people who agreed to text messages)
create table public.sms_outbox (
  id uuid primary key default gen_random_uuid(),
  to_phone text not null check (to_phone ~ '^\+[1-9][0-9]{7,14}$'),
  to_profile_id uuid references public.profiles(id) on delete set null,
  kind text not null default 'reminder' check (kind in ('reminder', 'schedule_change', 'other')),
  body text not null check (char_length(btrim(body)) between 1 and 320),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  claimed_at timestamptz,
  next_attempt_at timestamptz,
  constraint sms_outbox_sent_consistent check ((status = 'sent') = (sent_at is not null))
);

create index sms_outbox_queue_idx on public.sms_outbox (status, created_at);

alter table public.sms_outbox enable row level security;

revoke all on table public.sms_outbox from public, anon, authenticated;
grant select on table public.sms_outbox to authenticated;

create policy "Scheduling admins read the text message queue"
on public.sms_outbox for select to authenticated
using (public.is_scheduling_admin());

-- a phone number as +15555550123, or null if it does not look like one
create or replace function public.to_e164(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_phone is null then null
    when btrim(p_phone) like '+%'
         and regexp_replace(p_phone, '[^0-9]', '', 'g') ~ '^[1-9][0-9]{7,14}$'
      then '+' || regexp_replace(p_phone, '[^0-9]', '', 'g')
    when regexp_replace(p_phone, '[^0-9]', '', 'g') ~ '^[2-9][0-9]{9}$'
      then '+1' || regexp_replace(p_phone, '[^0-9]', '', 'g')
    when regexp_replace(p_phone, '[^0-9]', '', 'g') ~ '^1[2-9][0-9]{9}$'
      then '+' || regexp_replace(p_phone, '[^0-9]', '', 'g')
    else null
  end;
$$;

-- ============================================ functions the sender uses (service role only)
-- Claims up to p_limit waiting messages (oldest first) and returns them. A claim
-- that was never finished (the sender stopped) is released after 10 minutes.
create or replace function public.claim_outbox_batch(p_limit integer, p_now timestamptz default null)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
begin
  update public.email_outbox o
  set claimed_at = null
  where o.status = 'queued' and o.claimed_at is not null and o.claimed_at < v_now - interval '10 minutes';

  return query
  with picked as (
    select o.id
    from public.email_outbox o
    where o.status = 'queued'
      and o.claimed_at is null
      and (o.next_attempt_at is null or o.next_attempt_at <= v_now)
    order by o.created_at
    limit greatest(coalesce(p_limit, 0), 0)
    for update skip locked
  )
  update public.email_outbox o
  set claimed_at = v_now, attempts = o.attempts + 1
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

-- Records what happened to a claimed message.
--   sent    it went out
--   retry   it could not be sent yet (a temporary problem): try again later, up to 5 tries
--   failed  it can never be sent (for example the address does not exist)
--   skipped it was set aside on purpose (safe mode, too old, sending off)
create or replace function public.finish_outbox_message(
  p_id uuid,
  p_result text,
  p_error text default null,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_tries integer;
begin
  if p_result not in ('sent', 'retry', 'failed', 'skipped') then
    raise exception 'The result must be sent, retry, failed or skipped.';
  end if;

  select attempts into v_tries from public.email_outbox where id = p_id;
  if not found then
    raise exception 'That message does not exist.';
  end if;

  if p_result = 'sent' then
    update public.email_outbox
    set status = 'sent', sent_via = 'smtp', sent_at = v_now, claimed_at = null, last_error = null
    where id = p_id;

  elsif p_result = 'retry' and v_tries < 5 then
    -- wait longer each time: 5 minutes, 30 minutes, 2 hours, 6 hours
    update public.email_outbox
    set claimed_at = null,
        last_error = left(p_error, 500),
        next_attempt_at = v_now + case v_tries when 1 then interval '5 minutes' when 2 then interval '30 minutes' when 3 then interval '2 hours' else interval '6 hours' end
    where id = p_id;

  elsif p_result in ('retry', 'failed') then
    update public.email_outbox
    set status = 'failed', claimed_at = null, last_error = left(coalesce(p_error, 'Could not be sent.'), 500)
    where id = p_id;

  else
    update public.email_outbox
    set status = 'skipped', claimed_at = null, last_error = left(p_error, 500)
    where id = p_id;
  end if;
end;
$$;

-- how many emails went out in the last 24 hours (for the daily limit)
create or replace function public.outbox_sent_last_day(p_now timestamptz default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.email_outbox
  where status = 'sent' and sent_at > coalesce(p_now, now()) - interval '24 hours';
$$;

create or replace function public.claim_sms_batch(p_limit integer, p_now timestamptz default null)
returns setof public.sms_outbox
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
begin
  update public.sms_outbox o
  set claimed_at = null
  where o.status = 'queued' and o.claimed_at is not null and o.claimed_at < v_now - interval '10 minutes';

  return query
  with picked as (
    select o.id
    from public.sms_outbox o
    where o.status = 'queued'
      and o.claimed_at is null
      and (o.next_attempt_at is null or o.next_attempt_at <= v_now)
    order by o.created_at
    limit greatest(coalesce(p_limit, 0), 0)
    for update skip locked
  )
  update public.sms_outbox o
  set claimed_at = v_now, attempts = o.attempts + 1
  from picked
  where o.id = picked.id
  returning o.*;
end;
$$;

create or replace function public.finish_sms_message(
  p_id uuid,
  p_result text,
  p_error text default null,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_tries integer;
begin
  if p_result not in ('sent', 'retry', 'failed', 'skipped') then
    raise exception 'The result must be sent, retry, failed or skipped.';
  end if;

  select attempts into v_tries from public.sms_outbox where id = p_id;
  if not found then
    raise exception 'That message does not exist.';
  end if;

  if p_result = 'sent' then
    update public.sms_outbox set status = 'sent', sent_at = v_now, claimed_at = null, last_error = null where id = p_id;
  elsif p_result = 'retry' and v_tries < 3 then
    update public.sms_outbox
    set claimed_at = null, last_error = left(p_error, 500),
        next_attempt_at = v_now + case v_tries when 1 then interval '5 minutes' else interval '30 minutes' end
    where id = p_id;
  elsif p_result in ('retry', 'failed') then
    update public.sms_outbox set status = 'failed', claimed_at = null, last_error = left(coalesce(p_error, 'Could not be sent.'), 500) where id = p_id;
  else
    update public.sms_outbox set status = 'skipped', claimed_at = null, last_error = left(p_error, 500) where id = p_id;
  end if;
end;
$$;

-- only the sender (the service role) can use these; nobody signed in through the app can
revoke all on function public.claim_outbox_batch(integer, timestamptz) from public, anon, authenticated;
revoke all on function public.finish_outbox_message(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.outbox_sent_last_day(timestamptz) from public, anon, authenticated;
revoke all on function public.claim_sms_batch(integer, timestamptz) from public, anon, authenticated;
revoke all on function public.finish_sms_message(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_outbox_batch(integer, timestamptz) to service_role;
grant execute on function public.finish_outbox_message(uuid, text, text, timestamptz) to service_role;
grant execute on function public.outbox_sent_last_day(timestamptz) to service_role;
grant execute on function public.claim_sms_batch(integer, timestamptz) to service_role;
grant execute on function public.finish_sms_message(uuid, text, text, timestamptz) to service_role;
grant select, update on table public.email_outbox, public.sms_outbox to service_role;
grant select on table public.sending_settings to service_role;


-- Gives claimed messages back untouched (the sender had to stop before reaching
-- them), without counting a try.
create or replace function public.release_outbox_claims(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox
  set claimed_at = null, attempts = greatest(attempts - 1, 0)
  where id = any(p_ids) and status = 'queued' and claimed_at is not null;
$$;

create or replace function public.release_sms_claims(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sms_outbox
  set claimed_at = null, attempts = greatest(attempts - 1, 0)
  where id = any(p_ids) and status = 'queued' and claimed_at is not null;
$$;

revoke all on function public.release_outbox_claims(uuid[]) from public, anon, authenticated;
revoke all on function public.release_sms_claims(uuid[]) from public, anon, authenticated;
grant execute on function public.release_outbox_claims(uuid[]) to service_role;
grant execute on function public.release_sms_claims(uuid[]) to service_role;

-- ================================================== administrators: retry, and a test message
create or replace function public.retry_outbox_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can retry a message.';
  end if;

  update public.email_outbox
  set status = 'queued', attempts = 0, claimed_at = null, next_attempt_at = null
  where id = p_id and status in ('failed', 'skipped');

  if not found then
    raise exception 'Only a failed or skipped message can be retried.';
  end if;
end;
$$;

-- A message to the administrator's own address, to prove sending works.
create or replace function public.queue_test_email()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can send a test message.';
  end if;

  select lower(btrim(p.email)) into v_email from public.profiles p where p.id = v_uid;

  if v_email is null or v_email = '' then
    raise exception 'Your account has no email address.';
  end if;

  perform public.enqueue_email(
    'other',
    v_email,
    'Test message from RWCLL Umpire Management',
    'This is a test message. If you are reading it, sending email from the app works.',
    v_uid
  );
end;
$$;

revoke all on function public.retry_outbox_message(uuid) from public, anon;
grant execute on function public.retry_outbox_message(uuid) to authenticated;
revoke all on function public.queue_test_email() from public, anon;
grant execute on function public.queue_test_email() to authenticated;

-- =============================== the existing reminder functions can run on a schedule
-- (the same two functions as before; the only change is who may call them: an
-- administrator, or the database's own scheduled job)
create or replace function public.queue_unconfirmed_warnings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_lines text;
begin
  -- an administrator, or the database's own scheduled job (when nobody is signed in)
  if (select auth.uid()) is not null and not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can queue these warnings.';
  end if;

  with claimed as (
    update public.game_assignments ga
    set unconfirmed_warned_at = now()
    from public.games g
    join public.divisions d on d.id = g.division_id
    join public.leagues lg on lg.id = d.league_id
    where ga.game_id = g.id
      and ga.status = 'assigned'
      and ga.unconfirmed_warned_at is null
      and g.status not in ('canceled', 'completed')
      and lg.unconfirmed_warning_days > 0
      and g.starts_at > now()
      and g.starts_at <= now() + make_interval(days => lg.unconfirmed_warning_days)
    returning ga.game_id, ga.umpire_id, ga.position
  )
  select
    count(*),
    string_agg(
      '- ' || u.display_name || ' (' || public.position_phrase(c.position) || '): '
        || public.game_summary_text(c.game_id),
      E'\n' order by gm.starts_at, u.display_name
    )
  into v_count, v_lines
  from claimed c
  join public.games gm on gm.id = c.game_id
  join public.umpires u on u.id = c.umpire_id;

  if coalesce(v_count, 0) = 0 then
    return 0;
  end if;

  perform public.notice_admins(
    'reminder',
    v_count || ' umpire assignment' || case when v_count = 1 then '' else 's' end || ' still not confirmed',
    'These umpire assignments have not been confirmed, and the games are coming up:' || E'\n\n'
      || v_lines || E'\n\n'
      || 'An umpire confirms or declines when they sign in. You can also mark an assignment as confirmed yourself.'
  );

  return v_count;
end;
$$;

create or replace function public.queue_self_assign_digest()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  r record;
begin
  -- an administrator, or the database's own scheduled job (when nobody is signed in)
  if (select auth.uid()) is not null and not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can queue this summary.';
  end if;

  for r in
    with claimed as (
      update public.game_assignments ga
      set self_assign_notified_at = now()
      where ga.self_assigned
        and ga.self_assign_notified_at is null
        and (ga.assigned_at at time zone 'America/Los_Angeles')::date
            < (now() at time zone 'America/Los_Angeles')::date
      returning ga.game_id, ga.umpire_id, ga.position, ga.assigned_at
    )
    select
      (c.assigned_at at time zone 'America/Los_Angeles')::date as day,
      count(*)::integer as n,
      string_agg(
        '- ' || u.display_name || ' (' || public.position_phrase(c.position) || '): '
          || public.game_summary_text(c.game_id),
        E'\n' order by gm.starts_at, u.display_name
      ) as lines
    from claimed c
    join public.games gm on gm.id = c.game_id
    join public.umpires u on u.id = c.umpire_id
    group by 1
    order by 1
  loop
    v_total := v_total + r.n;

    perform public.notice_admins(
      'assignment',
      'Umpires took ' || r.n || ' game' || case when r.n = 1 then '' else 's' end
        || ' on ' || to_char(r.day, 'FMDay, FMMonth FMDD'),
      'These games were taken by umpires for themselves on '
        || to_char(r.day, 'FMDay, FMMonth FMDD') || E':\n\n' || r.lines
    );
  end loop;

  return v_total;
end;
$$;

revoke all on function public.queue_unconfirmed_warnings() from public, anon;
grant execute on function public.queue_unconfirmed_warnings() to authenticated;
revoke all on function public.queue_self_assign_digest() from public, anon;
grant execute on function public.queue_self_assign_digest() to authenticated;

-- =================================================== a reminder the day before a game
alter table public.game_assignments add column reminded_at timestamptz;

-- Reminds each umpire about a scheduled game starting in 20 to 28 hours (once per
-- assignment), and asks them to confirm if they have not. Also queues a text
-- message, but only for an umpire whose account agreed to text messages.
create or replace function public.queue_game_reminders(p_now timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz;
  v_app text;
  v_summary text;
  v_phone text;
  v_profile uuid;
  v_ask text;
  v_link text;
  v_text text;
  v_count integer := 0;
  r record;
begin
  if v_uid is not null and not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can queue reminders.';
  end if;

  v_now := public.app_now(p_now);

  select s.value into v_app from public.sending_settings s where s.key = 'app_url';

  for r in
    select ga.id as assignment_id, ga.game_id, ga.umpire_id, ga.position as place, ga.status as assignment_status
    from public.game_assignments ga
    join public.games g on g.id = ga.game_id
    where ga.reminded_at is null
      and g.status = 'scheduled'
      and g.starts_at > v_now + interval '20 hours'
      and g.starts_at <= v_now + interval '28 hours'
    order by g.starts_at
  loop
    update public.game_assignments set reminded_at = v_now where id = r.assignment_id;

    v_summary := public.game_summary_text(r.game_id);

    -- what to add to the message
    v_ask := '';
    if r.assignment_status = 'assigned' then
      v_ask := E'\n\nYou have not confirmed this game yet. Please open the app and confirm it, or tell us you cannot make it.';
    end if;

    v_link := '';
    if coalesce(btrim(v_app), '') <> '' then
      v_link := E'\n\n' || btrim(v_app);
    end if;

    perform public.notice_umpire(
      r.umpire_id,
      'reminder',
      'Reminder: you umpire tomorrow',
      'Reminder: you are umpiring ' || v_summary || ' (' || public.position_phrase(r.place) || ').' || v_ask || v_link
    );

    -- a text message too, if their own account agreed to texts
    v_phone := null;
    v_profile := null;
    select public.to_e164(ac.phone), u.profile_id into v_phone, v_profile
    from public.umpires u
    join public.account_contact ac on ac.profile_id = u.profile_id
    where u.id = r.umpire_id and ac.sms_opt_in is true;

    if v_phone is not null then
      v_text := 'RWCLL umpires: reminder, you are umpiring ' || v_summary || '.';
      if r.assignment_status = 'assigned' then
        v_text := v_text || ' Please confirm in the app.';
      end if;

      insert into public.sms_outbox (to_phone, to_profile_id, kind, body)
      values (v_phone, v_profile, 'reminder', left(v_text, 320));
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.queue_game_reminders(timestamptz) from public, anon;
grant execute on function public.queue_game_reminders(timestamptz) to authenticated;

commit;
