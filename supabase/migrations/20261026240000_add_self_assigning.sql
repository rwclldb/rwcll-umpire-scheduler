-- Umpires assigning themselves to games.
--
-- THE SWITCHES
--   divisions.allow_self_assign   an administrator turns self-assigning ON for a
--                                 division (OFF to begin with)
--   umpires.can_self_assign       ON for every umpire to begin with; an
--                                 administrator can turn it OFF for one umpire
--   leagues.self_assign_max_games the most games an umpire can have coming up
--                                 when they take one for themselves (blank means
--                                 no limit). Games already played and canceled
--                                 games do not count. Assignments an
--                                 administrator makes are never limited.
--
-- THE RULES (all enforced here, so nothing in the app can get around them)
--   An umpire can take a game for themselves only when
--     * their account is approved and linked to an ACTIVE umpire record, and
--       their own switch is on,
--     * the game's division allows it, and the game is still to come and not
--       canceled,
--     * the place is OPEN (a game is staffed by count, as everywhere else),
--     * they are not already on the game, and no other game of theirs overlaps it,
--     * they are under the limit, if there is one, and
--     * the youth age rule allows it (the same rule as for administrators).
--   Such an assignment is Confirmed straight away and marked as self-assigned.
--   An umpire who took a game can still decline it (the same Decline as before).
--
-- FUNCTIONS
--   self_assign_options(from, to)  the games and places this umpire could take now
--   self_assign(game, place)       take one
--   (internal) game_open_places(game), umpire_game_check_internal(umpire, game)

begin;

-- --------------------------------------------------------------- switches
alter table public.divisions
  add column allow_self_assign boolean not null default false;

alter table public.umpires
  add column can_self_assign boolean not null default true;

alter table public.leagues
  add column self_assign_max_games smallint
    constraint leagues_self_assign_max_games_valid
    check (self_assign_max_games is null or self_assign_max_games between 1 and 500);

-- -------------------------------------------- the age rule, usable by anyone
-- The same rule as umpire_game_check (see the earlier migration), without the
-- "administrators only" gate, for the self-assign functions. NOT callable from
-- the app. umpire_game_check is now a thin gate around it.
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
  v_birth date;
  v_season uuid;
  v_division text;
  v_youngest smallint;
  v_ll_age smallint;
begin
  select u.classification into v_class
  from public.umpires u
  where u.id = p_umpire_id;

  if v_class is distinct from 'youth' then
    return;
  end if;

  select g.season_id, d.name, d.youngest_ll_age
  into v_season, v_division, v_youngest
  from public.games g
  join public.divisions d on d.id = g.division_id
  where g.id = p_game_id;

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

  if v_youngest >= v_ll_age then
    problem := format(
      'A youth umpire with Little League age %s cannot umpire %s (its players start at age %s).',
      v_ll_age, v_division, v_youngest
    );
    note := null;
    return next;
  end if;
end;
$$;

revoke all on function public.umpire_game_check_internal(uuid, uuid) from public, anon, authenticated;

create or replace function public.umpire_game_check(
  p_umpire_id uuid,
  p_game_id uuid
)
returns table (problem text, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_scheduling_admin() then
    return;
  end if;

  return query
  select c.problem, c.note
  from public.umpire_game_check_internal(p_umpire_id, p_game_id) c;
end;
$$;

-- -------------------------------------------------- which places are open
-- The places of a game that still need an umpire, in order. A game needs a
-- number of umpires (its own setting, or its division's, or the division's
-- tournament number) and is staffed by COUNT, exactly as on the Games screen:
--   1: plate   2: plate, field   3: plate, first, third   4: plate, first, second, third
create or replace function public.game_open_places(p_game_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_needed integer;
  v_layout text[];
  v_taken text[];
  v_open_left integer;
  v_result text[] := '{}';
  v_place text;
begin
  select coalesce(
    g.umpires_needed,
    case when g.game_type = 'tournament' and d.tournament_umpires is not null
         then d.tournament_umpires
         else d.umpires_per_game end
  )
  into v_needed
  from public.games g
  join public.divisions d on d.id = g.division_id
  where g.id = p_game_id;

  if v_needed is null then
    return '{}';
  end if;

  v_layout := case v_needed
    when 0 then array[]::text[]
    when 1 then array['plate']
    when 2 then array['plate', 'field']
    when 3 then array['plate', 'first_base', 'third_base']
    else array['plate', 'first_base', 'second_base', 'third_base']
  end;

  select coalesce(array_agg(ga.position), array[]::text[])
  into v_taken
  from public.game_assignments ga
  where ga.game_id = p_game_id;

  v_open_left := greatest(0, v_needed - coalesce(array_length(v_taken, 1), 0));

  foreach v_place in array v_layout
  loop
    exit when v_open_left <= 0;

    if not (v_place = any (v_taken)) then
      v_result := v_result || v_place;
      v_open_left := v_open_left - 1;
    end if;
  end loop;

  return v_result;
end;
$$;

revoke all on function public.game_open_places(uuid) from public, anon, authenticated;

-- ------------------------------------------------- what an umpire could take
-- The games and places the signed-in umpire could take for themselves right
-- now, soonest first (at most 500). An umpire who cannot take any game at all
-- (no linked account, not active, switched off) simply gets nothing. It shows
-- no names: only a game and a place.
create or replace function public.self_assign_options(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (game_id uuid, place text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_upcoming integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    return;
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.eligibility_status = 'active' and u.can_self_assign
  ) then
    return;
  end if;

  -- Games still to come that this umpire already has (played and canceled ones do not count).
  select count(*) into v_upcoming
  from public.game_assignments me
  join public.games og on og.id = me.game_id
  where me.umpire_id = v_umpire
    and og.status <> 'canceled'
    and og.ends_at > now();

  return query
  select g.id, o.place
  from public.games g
  join public.divisions d on d.id = g.division_id
  join public.leagues lg on lg.id = d.league_id
  cross join lateral unnest(public.game_open_places(g.id)) as o(place)
  where d.allow_self_assign
    and g.status in ('draft', 'scheduled')
    and g.starts_at > now()
    and (p_from is null or g.starts_at >= p_from)
    and (p_to is null or g.starts_at < p_to)
    and (lg.self_assign_max_games is null or v_upcoming < lg.self_assign_max_games)
    and not exists (
      select 1 from public.game_assignments me
      where me.game_id = g.id and me.umpire_id = v_umpire
    )
    and not exists (
      select 1
      from public.game_assignments me
      join public.games og on og.id = me.game_id
      where me.umpire_id = v_umpire
        and og.id <> g.id
        and og.status <> 'canceled'
        and og.starts_at < g.ends_at
        and og.ends_at > g.starts_at
    )
    and not exists (
      select 1
      from public.umpire_game_check_internal(v_umpire, g.id) c
      where c.problem is not null
    )
  order by g.starts_at, g.id, o.place
  limit 500;
end;
$$;

revoke all on function public.self_assign_options(timestamptz, timestamptz) from public, anon;
grant execute on function public.self_assign_options(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------- taking a game
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
end;
$$;

revoke all on function public.self_assign(uuid, text) from public, anon;
grant execute on function public.self_assign(uuid, text) to authenticated;

commit;
