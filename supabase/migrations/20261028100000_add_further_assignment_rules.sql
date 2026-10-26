-- Further assignment rules.
--
-- 1. A YOUTH UMPIRE CANNOT UMPIRE THE DIVISION THEY PLAY IN.
--    An administrator can record which division a youth umpire plays in
--    (umpires.plays_in_division_id). When it is filled in, that division is the
--    one they cannot umpire. When it is blank, they are taken to play in any
--    division whose Little League age range includes their own age (worked out
--    from their birth date and the season's age chart, as for the other youth
--    rule). A youth umpire already could not umpire a division whose players
--    start at their age or older. All of this is enforced for administrators
--    and for umpires taking games for themselves.
--
-- 2. ADMINISTRATORS ARE TOLD WHEN AN UMPIRE TAKES A GAME FOR THEMSELVES.
--    * When the game starts within 48 hours: a message straight away.
--    * Otherwise: one summary message for each day, listing what umpires took
--      that day (queue_self_assign_digest). It covers days that have ended, and
--      is queued when an administrator opens the Games tab, because nothing
--      runs on a timer yet.
--    Each self-assignment is told about once (self_assign_notified_at).
--    Self-assignments that already exist are marked as told about, so the first
--    summary does not repeat old ones.
--    (Messages wait in the Outbox; nothing is emailed yet.)

begin;

alter table public.umpires
  add column plays_in_division_id uuid
    references public.divisions(id) on delete set null;

alter table public.game_assignments
  add column self_assign_notified_at timestamptz;

update public.game_assignments
set self_assign_notified_at = now()
where self_assigned;

-- ------------------------------------------------ the youth age rules, extended
-- (internal; NOT callable from the app. umpire_game_check is the administrators'
-- gate around it, and the self-assign functions use it directly.)
create or replace function public.umpire_game_check_internal(
  p_umpire_id uuid,
  p_game_id uuid
)
returns table (problem text, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_class text;
  v_plays uuid;
  v_birth date;
  v_season uuid;
  v_game_division uuid;
  v_division text;
  v_youngest smallint;
  v_oldest smallint;
  v_ll_age smallint;
begin
  select u.classification, u.plays_in_division_id
  into v_class, v_plays
  from public.umpires u
  where u.id = p_umpire_id;

  if v_class is distinct from 'youth' then
    return;
  end if;

  select g.season_id, g.division_id, d.name, d.youngest_ll_age, d.oldest_ll_age
  into v_season, v_game_division, v_division, v_youngest, v_oldest
  from public.games g
  join public.divisions d on d.id = g.division_id
  where g.id = p_game_id;

  -- The division recorded as the one they play in is never theirs to umpire.
  -- (This needs no birth date and no age range.)
  if v_plays is not null and v_plays = v_game_division then
    problem := format('A youth umpire cannot umpire the division they play in (%s).', v_division);
    note := null;
    return next;
    return;
  end if;

  if v_youngest is null then
    return;
  end if;

  select pd.birth_date into v_birth
  from public.umpire_private_details pd
  where pd.umpire_id = p_umpire_id;

  if v_birth is null then
    problem := null;
    note := 'No birth date is on file, so the youth age rule could not be checked.';
    return next;
    return;
  end if;

  v_ll_age := public.ll_age_for_season(
    v_season,
    extract(year from v_birth)::integer,
    extract(month from v_birth)::integer
  );

  if v_ll_age is null then
    problem := null;
    note := 'The season''s age chart does not cover this birth month, so the youth age rule could not be checked.';
    return next;
    return;
  end if;

  -- A division whose players start at their age or older.
  if v_youngest >= v_ll_age then
    problem := format(
      'A youth umpire with Little League age %s cannot umpire %s (its players start at age %s).',
      v_ll_age, v_division, v_youngest
    );
    note := null;
    return next;
    return;
  end if;

  -- No division recorded: they are taken to play in any division whose ages include theirs.
  if v_plays is null and v_oldest is not null and v_ll_age <= v_oldest then
    problem := format(
      'A youth umpire with Little League age %s cannot umpire %s, a division whose ages (%s to %s) include theirs.',
      v_ll_age, v_division, v_youngest, v_oldest
    );
    note := null;
    return next;
  end if;
end;
$$;

revoke all on function public.umpire_game_check_internal(uuid, uuid) from public, anon, authenticated;

-- ----------------------------------------------------- taking a game (with the message)
create or replace function public.self_assign(p_game_id uuid, p_place text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_game public.games%rowtype;
  v_division public.divisions%rowtype;
  v_max smallint;
  v_upcoming integer;
  v_problem text;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to take a game.';
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.eligibility_status = 'active'
  ) then
    raise exception 'Only active umpires can take games.';
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.can_self_assign
  ) then
    raise exception 'An administrator has turned off taking games for yourself for you. Please contact them.';
  end if;

  -- One person at a time per game, so two umpires cannot take the same place.
  select * into v_game from public.games where id = p_game_id for update;
  if not found then
    raise exception 'That game was not found.';
  end if;

  if v_game.status not in ('draft', 'scheduled') then
    raise exception 'That game is not open for assigning.';
  end if;

  if v_game.starts_at <= now() then
    raise exception 'That game has already started.';
  end if;

  select * into v_division from public.divisions where id = v_game.division_id;
  if not v_division.allow_self_assign then
    raise exception 'Umpires cannot assign themselves to games in this division.';
  end if;

  if exists (
    select 1 from public.game_assignments ga
    where ga.game_id = p_game_id and ga.umpire_id = v_umpire
  ) then
    raise exception 'You are already assigned to that game.';
  end if;

  if p_place is null or not (p_place = any (public.game_open_places(p_game_id))) then
    raise exception 'That place is not open (it may have just been taken).';
  end if;

  if exists (
    select 1
    from public.game_assignments me
    join public.games og on og.id = me.game_id
    where me.umpire_id = v_umpire
      and og.id <> v_game.id
      and og.status <> 'canceled'
      and og.starts_at < v_game.ends_at
      and og.ends_at > v_game.starts_at
  ) then
    raise exception 'You already have a game at that time.';
  end if;

  select lg.self_assign_max_games into v_max
  from public.leagues lg
  where lg.id = v_division.league_id;

  if v_max is not null then
    select count(*) into v_upcoming
    from public.game_assignments me
    join public.games og on og.id = me.game_id
    where me.umpire_id = v_umpire
      and og.status <> 'canceled'
      and og.ends_at > now();

    if v_upcoming >= v_max then
      raise exception 'You already have the most games you can take for yourself (%). Decline one first, or ask an administrator.', v_max;
    end if;
  end if;

  select c.problem into v_problem
  from public.umpire_game_check_internal(v_umpire, p_game_id) c;

  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  insert into public.game_assignments
    (game_id, umpire_id, position, status, self_assigned, confirmed_at, assigned_by)
  values
    (p_game_id, v_umpire, p_place, 'confirmed', true, now(), (select auth.uid()));

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, v_umpire, p_place, 'assigned', (select auth.uid()), 'assigned themselves');

  -- Tell the administrators. When the game is close (within 48 hours) they are
  -- told straight away; otherwise it goes in the daily summary
  -- (queue_self_assign_digest), so it is marked as not yet told about.
  if v_game.starts_at <= now() + interval '48 hours' then
    select display_name into v_name from public.umpires where id = v_umpire;

    update public.game_assignments
    set self_assign_notified_at = now()
    where game_id = p_game_id and umpire_id = v_umpire;

    perform public.notice_admins(
      'assignment',
      'Umpire took a game within 48 hours: ' || coalesce(v_name, 'An umpire'),
      coalesce(v_name, 'An umpire') || ' has taken the ' || public.position_phrase(p_place)
        || ' place for ' || public.game_summary_text(p_game_id) || E'.\n\n'
        || 'The game is within 48 hours, so you are told straight away. '
        || 'Games further ahead are in a daily summary.'
    );
  end if;
end;
$$;


-- ----------------------------------------- the daily summary for administrators
-- Queues ONE message per day for each administrator, listing the games umpires
-- took for themselves on days that have ended (Pacific time) and that nobody
-- has been told about yet. Games within 48 hours were told about at the time.
-- Returns how many self-assignments were included; calling it again straight
-- away returns 0.
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
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
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

revoke all on function public.queue_self_assign_digest() from public, anon;
grant execute on function public.queue_self_assign_digest() to authenticated;

commit;
