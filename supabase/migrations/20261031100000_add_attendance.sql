-- Game day: who showed up.
--
-- WHAT IT RECORDS (on each assignment)
--   attendance   NULL (nothing recorded yet), 'arrived', or 'no_show'
--   arrived_at   when they arrived (set only when attendance is 'arrived')
--   attendance_marked_by / attendance_marked_at   who recorded it, and when
--   "Late" is not stored: an umpire is late when arrived_at is after the
--   scheduled start of the game.
--
-- HOW IT IS RECORDED (nobody writes these columns directly)
--   check_in(game)
--     An umpire checks themselves in. Allowed from 1 hour before the game starts
--     until it ends, on a game that is not canceled or completed. Checking in
--     twice is harmless. An umpire an administrator marked as a no-show can
--     still check in (they turned up after all).
--   admin_set_attendance(game, umpire, 'arrived' | 'no_show' | NULL, time)
--     A scheduling administrator records, corrects or clears it (NULL clears).
--     An arrival time defaults to now; it cannot be in the future.
--   Every change is added to the assignment history (game_assignment_events).
--
-- ALSO IN THIS UPDATE
--   set_game_umpires keeps an umpire's attendance when they move to another
--   place. It also now keeps two flags it used to forget in that case (whether
--   the administrators were already told about a self-assigned game, and whether
--   an unconfirmed warning was already sent), so a move can no longer cause a
--   message to be queued a second time.

begin;

-- ---------------------------------------------------------------- the columns
alter table public.game_assignments
  add column attendance text
    constraint game_assignments_attendance_valid
    check (attendance in ('arrived', 'no_show')),
  add column arrived_at timestamptz,
  add column attendance_marked_by uuid references auth.users(id) on delete set null,
  add column attendance_marked_at timestamptz,
  add constraint game_assignments_arrived_time_valid
    check (coalesce(attendance = 'arrived', false) = (arrived_at is not null));

-- The history can now also say who arrived, who did not, and who cleared it.
alter table public.game_assignment_events
  drop constraint game_assignment_events_event_valid;

alter table public.game_assignment_events
  add constraint game_assignment_events_event_valid
  check (event in ('assigned', 'confirmed', 'declined', 'removed', 'arrived', 'no_show', 'attendance_cleared'));

-- ------------------------------------------------------ an umpire checks in
create or replace function public.check_in(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_row public.game_assignments%rowtype;
  v_game public.games%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

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

  if now() < v_game.starts_at - interval '1 hour' then
    raise exception 'You can check in from 1 hour before the game starts.';
  end if;

  if now() > v_game.ends_at then
    raise exception 'That game is over. Ask an administrator to record your attendance.';
  end if;

  if v_row.attendance = 'arrived' then
    return;
  end if;

  update public.game_assignments
  set attendance = 'arrived',
      arrived_at = now(),
      attendance_marked_by = (select auth.uid()),
      attendance_marked_at = now()
  where id = v_row.id;

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, v_umpire, v_row.position, 'arrived', (select auth.uid()), 'checked in themselves');
end;
$$;

revoke all on function public.check_in(uuid) from public, anon;
grant execute on function public.check_in(uuid) to authenticated;

-- ------------------------------------------ an administrator records attendance
create or replace function public.admin_set_attendance(
  p_game_id uuid,
  p_umpire_id uuid,
  p_attendance text,
  p_arrived_at timestamptz default null
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
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

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
    v_at := coalesce(p_arrived_at, now());

    if v_at > now() + interval '5 minutes' then
      raise exception 'The arrival time cannot be in the future.';
    end if;

    if v_at < v_game.starts_at - interval '12 hours' then
      raise exception 'The arrival time is too long before the game.';
    end if;

    update public.game_assignments
    set attendance = 'arrived',
        arrived_at = v_at,
        attendance_marked_by = (select auth.uid()),
        attendance_marked_at = now()
    where id = v_row.id;

    insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
    values (p_game_id, p_umpire_id, v_row.position, 'arrived', (select auth.uid()), 'recorded by an administrator');

  elsif p_attendance = 'no_show' then
    update public.game_assignments
    set attendance = 'no_show',
        arrived_at = null,
        attendance_marked_by = (select auth.uid()),
        attendance_marked_at = now()
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

revoke all on function public.admin_set_attendance(uuid, uuid, text, timestamptz) from public, anon;
grant execute on function public.admin_set_attendance(uuid, uuid, text, timestamptz) to authenticated;

-- ----------------------------------------- assigning umpires keeps attendance
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
      jsonb_build_object(
        'status', ga.status, 'self', ga.self_assigned, 'at', ga.confirmed_at,
        'att', ga.attendance, 'arr', ga.arrived_at,
        'by', ga.attendance_marked_by, 'mat', ga.attendance_marked_at,
        'told', ga.self_assign_notified_at, 'warned', ga.unconfirmed_warned_at
      )
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
        (game_id, umpire_id, position, status, self_assigned, confirmed_at,
         attendance, arrived_at, attendance_marked_by, attendance_marked_at,
         self_assign_notified_at, unconfirmed_warned_at)
      values (
        p_game_id,
        v_key::uuid,
        v_pos,
        coalesce(v_old -> v_key ->> 'status', 'assigned'),
        coalesce((v_old -> v_key ->> 'self')::boolean, false),
        (v_old -> v_key ->> 'at')::timestamptz,
        v_old -> v_key ->> 'att',
        (v_old -> v_key ->> 'arr')::timestamptz,
        (v_old -> v_key ->> 'by')::uuid,
        (v_old -> v_key ->> 'mat')::timestamptz,
        (v_old -> v_key ->> 'told')::timestamptz,
        (v_old -> v_key ->> 'warned')::timestamptz
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

commit;
