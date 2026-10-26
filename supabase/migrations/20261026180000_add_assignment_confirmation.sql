-- Confirming and declining assignments, queued messages, and the
-- "still unconfirmed" warning.
--
-- STATUS
--   Every assignment is "assigned" (an administrator made it and the umpire has
--   not yet answered) or "confirmed". Assignments that already exist become
--   "assigned"; administrators can mark them confirmed. self_assigned is for
--   the coming "umpires assign themselves" stage.
--
-- WHAT AN UMPIRE CAN DO (only through these functions, never by editing rows)
--   confirm_assignment(game)          confirm their own assignment
--   decline_assignment(game, reason)  give the place up (it becomes open again,
--                                     and the administrators are told)
--
-- WHAT AN ADMINISTRATOR CAN DO
--   admin_confirm_assignment(game, umpire)   record a confirmation that came
--                                            some other way (for example by phone)
--   queue_unconfirmed_warnings()             queue ONE message per administrator
--                                            listing assignments that are still
--                                            unconfirmed shortly before the game
--   (set_game_umpires keeps an umpire's confirmation when they stay on the game,
--   even if they move to another place.)
--
-- MESSAGES (queued in the Outbox, never sent automatically)
--   * to an umpire who is assigned to a game, or taken off one
--   * to the administrators (super admins, umpire chiefs, schedulers) when an
--     umpire declines, and when assignments are still unconfirmed
--   A message that cannot be queued (no or invalid email address) never stops
--   the real work.
--
-- THE SETTING
--   leagues.unconfirmed_warning_days: how many days before a game an
--   unconfirmed assignment is warned about (default 7; 0 turns it off).
--
-- HISTORY
--   game_assignment_events records who was assigned, confirmed, declined or
--   removed, and when. Only scheduling administrators can read it.

begin;

-- ------------------------------------------------------------ the columns
alter table public.game_assignments
  add column status text not null default 'assigned'
    constraint game_assignments_status_valid
    check (status in ('assigned', 'confirmed')),
  add column self_assigned boolean not null default false,
  add column confirmed_at timestamptz,
  add column unconfirmed_warned_at timestamptz,
  add constraint game_assignments_confirmed_time_valid
    check ((status = 'confirmed') = (confirmed_at is not null));

alter table public.leagues
  add column unconfirmed_warning_days smallint not null default 7
    constraint leagues_unconfirmed_warning_days_valid
    check (unconfirmed_warning_days between 0 and 60);

-- ------------------------------------------------------------ the history
create table public.game_assignment_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  umpire_id uuid not null references public.umpires(id) on delete cascade,
  position text not null,
  event text not null
    constraint game_assignment_events_event_valid
    check (event in ('assigned', 'confirmed', 'declined', 'removed')),
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index game_assignment_events_game_idx
  on public.game_assignment_events (game_id, created_at);

alter table public.game_assignment_events enable row level security;

revoke all on table public.game_assignment_events from public, anon, authenticated;
grant select on table public.game_assignment_events to authenticated;

create policy "Scheduling admins can read assignment events"
on public.game_assignment_events
for select
to authenticated
using (public.is_scheduling_admin());

-- ------------------------------------------------- internal helper functions
-- (None of these can be called from the app; they are used by the functions below.)

create or replace function public.position_phrase(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p
    when 'plate' then 'plate'
    when 'first_base' then 'first base'
    when 'second_base' then 'second base'
    when 'third_base' then 'third base'
    when 'field' then 'field'
    else p
  end;
$$;

-- "Eagles vs Hawks on Monday, October 26 at 10:00 AM (Field A, Majors)".
-- Times are shown in the league's local time (Pacific).
create or replace function public.game_summary_text(p_game_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(ht.name, g.home_label, 'TBD') || ' vs ' || coalesce(aw.name, g.away_label, 'TBD')
    || ' on ' || to_char(g.starts_at at time zone 'America/Los_Angeles', 'FMDay, FMMonth FMDD')
    || ' at ' || to_char(g.starts_at at time zone 'America/Los_Angeles', 'FMHH12:MI AM')
    || ' (' || coalesce(l.name, 'field to be announced') || ', ' || d.name || ')'
  from public.games g
  join public.divisions d on d.id = g.division_id
  left join public.teams ht on ht.id = g.home_team_id
  left join public.teams aw on aw.id = g.away_team_id
  left join public.locations l on l.id = g.location_id
  where g.id = p_game_id;
$$;

-- Where a notice for this umpire goes: the linked account's email, otherwise
-- the email on the umpire record.
create or replace function public.umpire_notice_email(p_umpire_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(btrim(coalesce(nullif(btrim(p.email), ''), pd.email, '')), '')
  from public.umpires u
  left join public.profiles p on p.id = u.profile_id
  left join public.umpire_private_details pd on pd.umpire_id = u.id
  where u.id = p_umpire_id;
$$;

-- Queue one message. It does nothing, quietly, when the address is missing or
-- not a valid address, or when the message cannot be queued for any reason.
create or replace function public.queue_notice(
  p_kind text,
  p_to_email text,
  p_to_profile uuid,
  p_subject text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_to_email is null
     or char_length(p_to_email) > 254
     or p_to_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return;
  end if;

  begin
    perform public.enqueue_email(p_kind, p_to_email, left(p_subject, 200), left(p_body, 10000), p_to_profile);
  exception when others then
    null;
  end;
end;
$$;

create or replace function public.notice_umpire(
  p_umpire_id uuid,
  p_kind text,
  p_subject text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.queue_notice(
    p_kind,
    public.umpire_notice_email(p_umpire_id),
    (select u.profile_id from public.umpires u where u.id = p_umpire_id),
    p_subject,
    p_body
  );
end;
$$;

-- The people who are told when an umpire declines or assignments go unconfirmed.
create or replace function public.notice_admins(
  p_kind text,
  p_subject text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select distinct p.id as profile_id, p.email as email
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.account_status = 'approved'
      and ur.role_id in ('super_admin', 'umpire_chief', 'scheduler')
      and btrim(p.email) <> ''
  loop
    perform public.queue_notice(p_kind, r.email, r.profile_id, p_subject, p_body);
  end loop;
end;
$$;

revoke all on function public.position_phrase(text) from public, anon, authenticated;
revoke all on function public.game_summary_text(uuid) from public, anon, authenticated;
revoke all on function public.umpire_notice_email(uuid) from public, anon, authenticated;
revoke all on function public.queue_notice(text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.notice_umpire(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.notice_admins(text, text, text) from public, anon, authenticated;

-- ----------------------------------------------- the umpire answers
-- Finds the signed-in person's umpire record (they must have an approved account).
create or replace function public.my_umpire_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.umpires u
  join public.profiles p on p.id = u.profile_id
  where u.profile_id = (select auth.uid())
    and p.account_status = 'approved';
$$;

revoke all on function public.my_umpire_id() from public, anon;
grant execute on function public.my_umpire_id() to authenticated;

create or replace function public.confirm_assignment(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_row public.game_assignments%rowtype;
  v_game_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to confirm an assignment.';
  end if;

  select * into v_row
  from public.game_assignments
  where game_id = p_game_id and umpire_id = v_umpire;

  if not found then
    raise exception 'You are not assigned to that game.';
  end if;

  select status into v_game_status from public.games where id = p_game_id;
  if v_game_status = 'canceled' then
    raise exception 'That game has been canceled.';
  end if;

  if v_row.status = 'confirmed' then
    return;
  end if;

  update public.game_assignments
  set status = 'confirmed', confirmed_at = now()
  where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
  values (p_game_id, v_umpire, v_row.position, 'confirmed', (select auth.uid()));
end;
$$;

create or replace function public.decline_assignment(p_game_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_name text;
  v_row public.game_assignments%rowtype;
  v_game public.games%rowtype;
  v_reason text := left(btrim(coalesce(p_reason, '')), 500);
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to decline an assignment.';
  end if;

  select * into v_row
  from public.game_assignments
  where game_id = p_game_id and umpire_id = v_umpire;

  if not found then
    raise exception 'You are not assigned to that game.';
  end if;

  select * into v_game from public.games where id = p_game_id;

  if v_game.status = 'canceled' then
    raise exception 'That game has been canceled.';
  end if;

  if v_game.starts_at <= now() then
    raise exception 'That game has already started. Please contact an administrator.';
  end if;

  delete from public.game_assignments where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, v_umpire, v_row.position, 'declined', (select auth.uid()), nullif(v_reason, ''));

  select display_name into v_name from public.umpires where id = v_umpire;

  perform public.notice_admins(
    'schedule_change',
    'Umpire declined: ' || coalesce(v_name, 'An umpire'),
    coalesce(v_name, 'An umpire') || ' has declined the ' || public.position_phrase(v_row.position)
      || ' place for ' || public.game_summary_text(p_game_id) || E'.\n\n'
      || case when v_reason <> '' then 'Reason given: ' || v_reason || E'\n\n' else '' end
      || 'The place is open again and needs someone else.'
  );
end;
$$;

revoke all on function public.confirm_assignment(uuid) from public, anon;
grant execute on function public.confirm_assignment(uuid) to authenticated;
revoke all on function public.decline_assignment(uuid, text) from public, anon;
grant execute on function public.decline_assignment(uuid, text) to authenticated;

-- ----------------------------------------------- an administrator confirms
create or replace function public.admin_confirm_assignment(p_game_id uuid, p_umpire_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.game_assignments%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can confirm an assignment for an umpire.';
  end if;

  select * into v_row
  from public.game_assignments
  where game_id = p_game_id and umpire_id = p_umpire_id;

  if not found then
    raise exception 'That umpire is not assigned to that game.';
  end if;

  if v_row.status = 'confirmed' then
    return;
  end if;

  update public.game_assignments
  set status = 'confirmed', confirmed_at = now()
  where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, p_umpire_id, v_row.position, 'confirmed', (select auth.uid()), 'confirmed by an administrator');
end;
$$;

revoke all on function public.admin_confirm_assignment(uuid, uuid) from public, anon;
grant execute on function public.admin_confirm_assignment(uuid, uuid) to authenticated;

-- ------------------------------------------- the "still unconfirmed" warning
-- Queues ONE message for each administrator, listing every assignment that is
-- still unconfirmed and whose game is coming up within its league's number of
-- days. Each assignment is warned about once. Returns how many assignments
-- were included. Calling it again straight away returns 0.
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
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
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

revoke all on function public.queue_unconfirmed_warnings() from public, anon;
grant execute on function public.queue_unconfirmed_warnings() to authenticated;

-- --------------------------------------------- setting a game's umpires
-- The same as before, and now it also
--   * keeps an umpire's confirmation when they stay on the game (even in
--     another place),
--   * records who was assigned or removed, and
--   * queues a message to an umpire who is assigned or taken off the game.
-- It now runs with elevated rights (it writes the history and the messages),
-- so it checks for a scheduling administrator itself, first thing.
create or replace function public.set_game_umpires(
  p_game_id uuid,
  p_umpires jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pos text;
  v_val jsonb;
  v_key text;
  v_wanted jsonb := '{}'::jsonb;
  v_ids text[];
  v_old jsonb;
  v_game_status text;
  v_summary text;
  r record;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can assign umpires.';
  end if;

  select status into v_game_status from public.games where id = p_game_id;
  if not found then
    raise exception 'That game was not found.';
  end if;

  if p_umpires is null or jsonb_typeof(p_umpires) <> 'object' then
    raise exception 'The umpires must be given as positions and umpire ids.';
  end if;

  for v_pos, v_val in select key, value from jsonb_each(p_umpires)
  loop
    if v_pos not in ('plate', 'first_base', 'second_base', 'third_base', 'field') then
      raise exception 'Unknown position: %', v_pos;
    end if;

    if jsonb_typeof(v_val) = 'null' then
      continue;
    end if;

    if jsonb_typeof(v_val) <> 'string' then
      raise exception 'The umpire for % must be an id or empty.', v_pos;
    end if;

    v_wanted := v_wanted || jsonb_build_object(v_pos, v_val);
  end loop;

  select array_agg(value #>> '{}') into v_ids from jsonb_each(v_wanted);

  if (select count(*) from unnest(v_ids))
     <> (select count(distinct x) from unnest(v_ids) as x) then
    raise exception 'The same umpire cannot hold two places in one game.';
  end if;

  -- How each umpire stands now (to keep confirmations, and to tell who is new).
  select coalesce(
    jsonb_object_agg(
      ga.umpire_id::text,
      jsonb_build_object('status', ga.status, 'self', ga.self_assigned, 'at', ga.confirmed_at)
    ),
    '{}'::jsonb
  )
  into v_old
  from public.game_assignments ga
  where ga.game_id = p_game_id;

  v_summary := public.game_summary_text(p_game_id);

  -- Umpires who are leaving the game altogether.
  for r in
    select ga.umpire_id, ga.position
    from public.game_assignments ga
    where ga.game_id = p_game_id
      and not (ga.umpire_id::text = any (coalesce(v_ids, '{}'::text[])))
  loop
    insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
    values (p_game_id, r.umpire_id, r.position, 'removed', (select auth.uid()));

    if v_game_status <> 'canceled' then
      perform public.notice_umpire(
        r.umpire_id,
        'schedule_change',
        'You are no longer assigned to a game',
        'You have been taken off the ' || public.position_phrase(r.position) || ' place for ' || v_summary || '.'
      );
    end if;
  end loop;

  -- First remove the places that are being cleared or given to someone else
  -- (this is also what lets two umpires swap), then fill the places that are
  -- now empty. An umpire who stays where they are is not touched at all (not
  -- even re-checked, so an umpire who has since become inactive can stay on
  -- a game while another place is changed).
  delete from public.game_assignments ga
  where ga.game_id = p_game_id
    and ga.umpire_id::text is distinct from (v_wanted ->> ga.position);

  for v_pos, v_val in select key, value from jsonb_each(v_wanted)
  loop
    if not exists (
      select 1 from public.game_assignments ga
      where ga.game_id = p_game_id and ga.position = v_pos
    ) then
      v_key := v_val #>> '{}';

      insert into public.game_assignments
        (game_id, umpire_id, position, status, self_assigned, confirmed_at)
      values (
        p_game_id,
        v_key::uuid,
        v_pos,
        coalesce(v_old -> v_key ->> 'status', 'assigned'),
        coalesce((v_old -> v_key ->> 'self')::boolean, false),
        (v_old -> v_key ->> 'at')::timestamptz
      );

      -- Someone new on the game: record it and let them know.
      if not (v_old ? v_key) then
        insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
        values (p_game_id, v_key::uuid, v_pos, 'assigned', (select auth.uid()));

        perform public.notice_umpire(
          v_key::uuid,
          'assignment',
          'You have been assigned to a game',
          'You have been assigned as the ' || public.position_phrase(v_pos) || ' umpire for '
            || v_summary || E'.\n\nPlease sign in to confirm or decline this assignment.'
        );
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.set_game_umpires(uuid, jsonb) from public, anon;
grant execute on function public.set_game_umpires(uuid, jsonb) to authenticated;

commit;
