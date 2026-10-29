-- A demo clock, for testing and demonstrations.
--
-- THE PROBLEM
--   Time-of-game actions (checking in, recording an arrival) depend on the time,
--   so a demo on a Thursday cannot try a Saturday game.
--
-- THE ANSWER
--   In the app, a small "Demo clock" control sets a PRETEND time for that browser.
--   The pretend time is passed to check_in and admin_set_attendance, which use it
--   INSTEAD of the real time, but ONLY if this database has the demo clock
--   switched on. It is OFF by default, so on a database where it was never
--   switched on a pretend time is ignored and cannot change anything.
--
-- SWITCHING IT ON (TEST DATABASE ONLY; seed.sql does this)
--     update public.app_settings set value = 'true' where key = 'demo_clock_allowed';
--   and off again:
--     update public.app_settings set value = 'false' where key = 'demo_clock_allowed';
--   (Nobody can change this setting from the app.)
--
-- WHAT THE PRETEND TIME COVERS
--   The screens (Field board, Game day card, schedules, availability) and
--   check-in and attendance. Other database rules still use the real time (for
--   example "a game that has started cannot be taken").

begin;

-- ----------------------------------------------------------------- the setting
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

revoke all on table public.app_settings from public, anon, authenticated;
grant select on table public.app_settings to authenticated;

create policy "Signed-in people can read settings"
on public.app_settings
for select
to authenticated
using (true);

insert into public.app_settings (key, value) values ('demo_clock_allowed', 'false');

create or replace function public.demo_clock_allowed()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.value = 'true' from public.app_settings s where s.key = 'demo_clock_allowed'), false);
$$;

revoke all on function public.demo_clock_allowed() from public, anon;
grant execute on function public.demo_clock_allowed() to authenticated;

-- The time to use: a pretend time if one is given AND the demo clock is on;
-- otherwise the real time. (Internal; used by the functions below.)
create or replace function public.app_now(p_override timestamptz default null)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_override is not null and public.demo_clock_allowed() then p_override
    else now()
  end;
$$;

revoke all on function public.app_now(timestamptz) from public, anon, authenticated;

-- ------------------------------------------ check-in and attendance use it
-- (each gets a new optional last argument, so the old versions are replaced)
drop function public.check_in(uuid);
drop function public.admin_set_attendance(uuid, uuid, text, timestamptz);

create or replace function public.check_in(p_game_id uuid, p_now timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_row public.game_assignments%rowtype;
  v_game public.games%rowtype;
  v_now timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  -- the real time, or the pretend time when the demo clock is switched on
  v_now := public.app_now(p_now);

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to check in.';
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

  if v_game.status = 'completed' then
    raise exception 'That game is already marked completed. Ask an administrator to record your attendance.';
  end if;

  if v_now < v_game.starts_at - interval '1 hour' then
    raise exception 'You can check in from 1 hour before the game starts.';
  end if;

  if v_now > v_game.ends_at then
    raise exception 'That game is over. Ask an administrator to record your attendance.';
  end if;

  if v_row.attendance = 'arrived' then
    return;
  end if;

  update public.game_assignments
  set attendance = 'arrived',
      arrived_at = v_now,
      attendance_marked_by = (select auth.uid()),
      attendance_marked_at = v_now
  where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, v_umpire, v_row.position, 'arrived', (select auth.uid()), 'checked in themselves');
end;
$$;

create or replace function public.admin_set_attendance(
  p_game_id uuid,
  p_umpire_id uuid,
  p_attendance text,
  p_arrived_at timestamptz default null,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.game_assignments%rowtype;
  v_game public.games%rowtype;
  v_at timestamptz;
  v_now timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  -- the real time, or the pretend time when the demo clock is switched on
  v_now := public.app_now(p_now);

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can record attendance.';
  end if;

  if p_attendance is not null and p_attendance not in ('arrived', 'no_show') then
    raise exception 'Attendance must be arrived, no_show, or blank.';
  end if;

  select * into v_row
  from public.game_assignments
  where game_id = p_game_id and umpire_id = p_umpire_id;

  if not found then
    raise exception 'That umpire is not assigned to that game.';
  end if;

  select * into v_game from public.games where id = p_game_id;

  if v_game.status = 'canceled' then
    raise exception 'That game has been canceled.';
  end if;

  if p_attendance = 'arrived' then
    v_at := coalesce(p_arrived_at, v_now);

    if v_at > v_now + interval '5 minutes' then
      raise exception 'The arrival time cannot be in the future.';
    end if;

    if v_at < v_game.starts_at - interval '12 hours' then
      raise exception 'The arrival time is too long before the game.';
    end if;

    update public.game_assignments
    set attendance = 'arrived',
        arrived_at = v_at,
        attendance_marked_by = (select auth.uid()),
        attendance_marked_at = v_now
    where id = v_row.id;

    insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
    values (p_game_id, p_umpire_id, v_row.position, 'arrived', (select auth.uid()), 'recorded by an administrator');

  elsif p_attendance = 'no_show' then
    update public.game_assignments
    set attendance = 'no_show',
        arrived_at = null,
        attendance_marked_by = (select auth.uid()),
        attendance_marked_at = v_now
    where id = v_row.id;

    insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
    values (p_game_id, p_umpire_id, v_row.position, 'no_show', (select auth.uid()));

  else
    update public.game_assignments
    set attendance = null,
        arrived_at = null,
        attendance_marked_by = null,
        attendance_marked_at = null
    where id = v_row.id;

    insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id)
    values (p_game_id, p_umpire_id, v_row.position, 'attendance_cleared', (select auth.uid()));
  end if;
end;
$$;

revoke all on function public.check_in(uuid, timestamptz) from public, anon;
grant execute on function public.check_in(uuid, timestamptz) to authenticated;

revoke all on function public.admin_set_attendance(uuid, uuid, text, timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_set_attendance(uuid, uuid, text, timestamptz, timestamptz) to authenticated;

commit;
