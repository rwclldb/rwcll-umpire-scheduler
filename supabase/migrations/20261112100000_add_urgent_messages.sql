-- Urgent messages.
--
-- A message about a game that starts within two hours (or has started and is not over), such as an umpire
-- declining, a field closed, a game canceled or moved, an umpire added or taken off, is URGENT:
--   * it is marked priority, and the sender sends priority messages first, and an extra job runs every
--     minute that sends ONLY urgent ones (supabase/jobs/schedule_urgent_jobs.sql)
--   * everything else waits for the usual batch (every 5 minutes)
--   * if text messages are switched on (sending_settings sms_mode is not 'off'), an urgent email is ALSO sent
--     as a text to the same person when their own account agreed to texts. That covers umpires (youth too),
--     the parents of a youth umpire (they get the "Copy for ..." email, so they get the text too) and the
--     administrators who must react.
--
-- TEXTS ON AND OFF: sms_mode ('off', 'safe', 'live') is the switch. While it is 'off' no text is queued
-- at all, and email carries on exactly as before. It only reads settings and watches the tables: nothing
-- that exists is rewritten, so it cannot change how a message is worded or who it goes to.
--
-- HOW A MESSAGE IS MARKED: a trigger on games, game assignments and running-late reports notes, for the
-- rest of the transaction, that this change concerns a game that is soon. Any message queued in the same
-- transaction is then marked priority. (A flag called rwcll.urgent, which disappears when the transaction ends.)
--
-- New settings (sending_settings):
--   urgent_window_minutes  how soon a game must start to count as urgent (120)
--   urgent_test_mode       'on' makes EVERY such change urgent, whatever the time (for testing; leave it 'off')
--
-- Needs 20261106100000_add_email_sending.sql. Safe to run twice.

begin;

insert into public.sending_settings (key, value) values
  ('urgent_window_minutes', '120'),
  ('urgent_test_mode', 'off')
on conflict (key) do nothing;

alter table public.email_outbox add column if not exists priority boolean not null default false;
alter table public.sms_outbox add column if not exists priority boolean not null default false;

create index if not exists email_outbox_urgent_idx on public.email_outbox (created_at) where priority and status = 'queued';
create index if not exists sms_outbox_urgent_idx on public.sms_outbox (created_at) where priority and status = 'queued';

-- ======================================================================== is this game urgent?
create or replace function public.game_is_urgent(p_starts_at timestamptz, p_ends_at timestamptz)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_test text;
  v_window text;
  v_minutes integer;
begin
  select s.value into v_test from public.sending_settings s where s.key = 'urgent_test_mode';
  if coalesce(v_test, 'off') = 'on' then
    return true;
  end if;

  select s.value into v_window from public.sending_settings s where s.key = 'urgent_window_minutes';
  v_minutes := case when coalesce(v_window, '') ~ '^[0-9]{1,4}$' then v_window::integer else 120 end;

  return p_starts_at is not null
    and p_starts_at <= now() + make_interval(mins => v_minutes)
    and coalesce(p_ends_at, p_starts_at + interval '3 hours') > now();
end;
$$;

-- ======================================================================== noticing urgent changes
-- (named aa_ so they run before any other trigger on the same table)
create or replace function public.urgent_watch_games()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if public.game_is_urgent(old.starts_at, old.ends_at) then
      perform set_config('rwcll.urgent', 'on', true);
    end if;
    return old;
  end if;

  -- a change umpires must hear about: canceled or put back, moved, or a different field
  if (new.status is distinct from old.status
      or new.starts_at is distinct from old.starts_at
      or new.ends_at is distinct from old.ends_at
      or new.location_id is distinct from old.location_id)
     and (public.game_is_urgent(old.starts_at, old.ends_at) or public.game_is_urgent(new.starts_at, new.ends_at)) then
    perform set_config('rwcll.urgent', 'on', true);
  end if;

  return new;
end;
$$;

drop trigger if exists aa_urgent_watch_games on public.games;
create trigger aa_urgent_watch_games
  before update or delete on public.games
  for each row execute function public.urgent_watch_games();

create or replace function public.urgent_watch_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game_id uuid;
  v_game public.games%rowtype;
begin
  if tg_op = 'DELETE' then
    v_game_id := old.game_id;
  else
    v_game_id := new.game_id;

    -- confirming, checking in and reminders change a row but not who umpires: not urgent
    if tg_op = 'UPDATE'
       and new.umpire_id is not distinct from old.umpire_id
       and new.position is not distinct from old.position
       and new.game_id is not distinct from old.game_id then
      return new;
    end if;
  end if;

  select g.* into v_game from public.games g where g.id = v_game_id;

  if found and v_game.status = 'scheduled' and public.game_is_urgent(v_game.starts_at, v_game.ends_at) then
    perform set_config('rwcll.urgent', 'on', true);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists aa_urgent_watch_assignments on public.game_assignments;
create trigger aa_urgent_watch_assignments
  before insert or update or delete on public.game_assignments
  for each row execute function public.urgent_watch_assignments();

create or replace function public.urgent_watch_running_late()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
begin
  select g.* into v_game from public.games g where g.id = new.game_id;

  if found and public.game_is_urgent(v_game.starts_at, v_game.ends_at) then
    perform set_config('rwcll.urgent', 'on', true);
  end if;

  return new;
end;
$$;

drop trigger if exists aa_urgent_watch_running_late on public.running_late_reports;
create trigger aa_urgent_watch_running_late
  before insert or update on public.running_late_reports
  for each row execute function public.urgent_watch_running_late();

-- ======================================================================== marking the messages
create or replace function public.urgent_stamp_message()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('rwcll.urgent', true), '') = 'on' then
    new.priority := true;
  end if;
  return new;
end;
$$;

drop trigger if exists aa_urgent_stamp on public.email_outbox;
create trigger aa_urgent_stamp
  before insert on public.email_outbox
  for each row execute function public.urgent_stamp_message();

drop trigger if exists aa_urgent_stamp on public.sms_outbox;
create trigger aa_urgent_stamp
  before insert on public.sms_outbox
  for each row execute function public.urgent_stamp_message();

-- ======================================================================== an urgent email, also as a text
-- Only when texts are not 'off', only to an approved account whose OWN setting agreed to texts and has a
-- phone number. Parents are covered because they are sent a "Copy for ..." email, which is urgent too.
create or replace function public.urgent_email_also_by_text()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode text;
  v_profile uuid;
  v_phone text;
begin
  if not new.priority then
    return new;
  end if;

  select s.value into v_mode from public.sending_settings s where s.key = 'sms_mode';
  if coalesce(v_mode, 'off') = 'off' then
    return new;
  end if;

  select p.id into v_profile
  from public.profiles p
  where lower(btrim(coalesce(p.email, ''))) = lower(btrim(coalesce(new.to_email, '')))
    and p.account_status = 'approved'
  limit 1;

  if v_profile is null then
    return new;
  end if;

  select public.to_e164(ac.phone) into v_phone
  from public.account_contact ac
  where ac.profile_id = v_profile and ac.sms_opt_in is true;

  if v_phone is null then
    return new;
  end if;

  insert into public.sms_outbox (to_phone, to_profile_id, kind, body, priority)
  values (
    v_phone,
    v_profile,
    'schedule_change',
    left('RWCLL umpires: ' || regexp_replace(btrim(coalesce(new.subject, '')), '\s+', ' ', 'g'), 300),
    true
  );

  return new;
end;
$$;

drop trigger if exists urgent_email_also_by_text on public.email_outbox;
create trigger urgent_email_also_by_text
  after insert on public.email_outbox
  for each row execute function public.urgent_email_also_by_text();

-- ======================================================================== the sender (service role only)
-- The usual claims now take urgent messages first.
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
    order by o.priority desc, o.created_at
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
    order by o.priority desc, o.created_at
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

-- The every-minute job claims ONLY urgent messages.
create or replace function public.claim_urgent_outbox_batch(p_limit integer, p_now timestamptz default null)
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
      and o.priority
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

create or replace function public.claim_urgent_sms_batch(p_limit integer, p_now timestamptz default null)
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
      and o.priority
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

-- "Is anything urgent waiting?" lets the every-minute job do nothing (not even connect to the mailbox) when there is not.
create or replace function public.urgent_waiting_count(p_now timestamptz default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    (select count(*) from public.email_outbox o
      where o.status = 'queued' and o.priority and o.claimed_at is null
        and (o.next_attempt_at is null or o.next_attempt_at <= coalesce(p_now, now())))
    +
    (select count(*) from public.sms_outbox o
      where o.status = 'queued' and o.priority and o.claimed_at is null
        and (o.next_attempt_at is null or o.next_attempt_at <= coalesce(p_now, now())))
  )::integer;
$$;

revoke all on function public.claim_urgent_outbox_batch(integer, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_urgent_sms_batch(integer, timestamptz) from public, anon, authenticated;
revoke all on function public.urgent_waiting_count(timestamptz) from public, anon, authenticated;
revoke all on function public.game_is_urgent(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_urgent_outbox_batch(integer, timestamptz) to service_role;
grant execute on function public.claim_urgent_sms_batch(integer, timestamptz) to service_role;
grant execute on function public.urgent_waiting_count(timestamptz) to service_role;

commit;
