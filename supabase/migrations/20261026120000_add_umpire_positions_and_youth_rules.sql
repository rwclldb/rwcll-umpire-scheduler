-- More umpires, more positions, and the first youth umpire rule.
--
-- HOW MANY UMPIRES
--   * A division's default can now be 0 to 4 (0 is for divisions that use no
--     umpires, such as Tee Ball).
--   * A division can have its own default for TOURNAMENT games
--     (tournament_umpires). Blank means "the same as regular games".
--   * A single game can still override both (umpires_needed), 0 to 4.
--
-- POSITIONS (what each number means)
--   1 umpire : plate
--   2 umpires: plate + field
--   3 umpires: plate + first base + third base
--   4 umpires: plate + first base + second base + third base
--   The database accepts plate, first_base, second_base, third_base and field.
--
-- YOUTH UMPIRE RULE (the first one; more will follow)
--   A youth umpire cannot be assigned to a game in a division whose youngest
--   Little League age is the umpire's own Little League age or older.
--   (For example a 13-year-old cannot umpire Seniors, whose players start at
--   13, and a 12-year-old cannot umpire Juniors, whose players start at 12.)
--   The umpire's Little League age comes from the season's age chart and their
--   birth month and year. The rule is skipped (never guessed) when the
--   division has no age range, the umpire has no birth date, or the season's
--   chart does not cover their birth month. Adult umpires are not affected.
--   "Not the division they play in" is not enforced yet.
--
-- FUNCTIONS
--   umpire_game_check(umpire, game)   what is wrong, or worth knowing, about
--                                     putting this umpire on this game
--   game_umpire_eligibility(game)     the same for every youth umpire, for the
--                                     assignment screen (scheduling admins)
--   set_game_umpires(game, umpires)   sets all of a game's umpires at once,
--                                     all or nothing. REPLACES the earlier
--                                     plate/field version.

begin;

-- ---------------------------------------------------- how many umpires
alter table public.divisions
  drop constraint divisions_umpires_per_game_valid;

alter table public.divisions
  add constraint divisions_umpires_per_game_valid
  check (umpires_per_game between 0 and 4);

alter table public.divisions
  add column tournament_umpires smallint
    constraint divisions_tournament_umpires_valid
    check (tournament_umpires is null or tournament_umpires between 0 and 4);

alter table public.games
  drop constraint games_umpires_needed_valid;

alter table public.games
  add constraint games_umpires_needed_valid
  check (umpires_needed is null or umpires_needed between 0 and 4);

-- -------------------------------------------------------- the positions
-- (The old rule is found by what it checks, not by its name.)
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.game_assignments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%position%'
  loop
    execute format('alter table public.game_assignments drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.game_assignments
  add constraint game_assignments_position_valid
  check (position in ('plate', 'first_base', 'second_base', 'third_base', 'field'));

-- ------------------------------------------------- the youth age rule
-- Returns nothing when there is nothing to say. Otherwise one row: "problem"
-- is a reason the umpire may not be put on the game, "note" is something worth
-- knowing (for example that the rule could not be checked).
-- Only scheduling administrators get an answer, because it is based on a
-- birth date.
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
declare
  v_class text;
  v_birth date;
  v_season uuid;
  v_division text;
  v_youngest smallint;
  v_ll_age smallint;
begin
  if not public.is_scheduling_admin() then
    return;
  end if;

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

revoke all on function public.umpire_game_check(uuid, uuid) from public, anon;
grant execute on function public.umpire_game_check(uuid, uuid) to authenticated;

-- For the assignment screen: every youth umpire who has a problem or a note
-- for this game. Umpires with nothing to report are not listed.
create or replace function public.game_umpire_eligibility(p_game_id uuid)
returns table (umpire_id uuid, problem text, note text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can check umpire eligibility.';
  end if;

  return query
  select u.id, c.problem, c.note
  from public.umpires u
  cross join lateral public.umpire_game_check(u.id, p_game_id) c
  where u.classification = 'youth';
end;
$$;

revoke all on function public.game_umpire_eligibility(uuid) from public, anon;
grant execute on function public.game_umpire_eligibility(uuid) to authenticated;

-- ------------------------------------------------- the assignment rules
create or replace function public.validate_game_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_eligibility text;
  v_problem text;
begin
  if not public.is_scheduling_admin() then
    return new;
  end if;

  -- Only check when a game or umpire is being put in: editing the notes of an
  -- old assignment must keep working.
  if tg_op = 'UPDATE'
     and new.game_id = old.game_id
     and new.umpire_id = old.umpire_id then
    return new;
  end if;

  select status into v_status from public.games where id = new.game_id;
  if v_status = 'canceled' then
    raise exception 'Umpires cannot be assigned to a canceled game.';
  end if;

  select eligibility_status into v_eligibility
  from public.umpires where id = new.umpire_id;
  if v_eligibility is not null and v_eligibility <> 'active' then
    raise exception 'That umpire is not active, so cannot be assigned to a game.';
  end if;

  select c.problem into v_problem
  from public.umpire_game_check(new.umpire_id, new.game_id) c;
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  if tg_op = 'INSERT' and new.assigned_by is null then
    new.assigned_by := (select auth.uid());
  end if;

  return new;
end;
$$;

-- --------------------------------------------------------- one step
-- p_umpires says who holds each position, for example
--   {"plate": "<umpire id>", "first_base": "<umpire id>", "third_base": null}
-- It describes the WHOLE game: a position that is missing or null ends up
-- empty. It all happens together or not at all.
drop function if exists public.set_game_umpires(uuid, uuid, uuid);

create or replace function public.set_game_umpires(
  p_game_id uuid,
  p_umpires jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pos text;
  v_val jsonb;
  v_wanted jsonb := '{}'::jsonb;
  v_ids text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can assign umpires.';
  end if;

  if not exists (select 1 from public.games where id = p_game_id) then
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
      insert into public.game_assignments (game_id, umpire_id, position)
      values (p_game_id, (v_val #>> '{}')::uuid, v_pos);
    end if;
  end loop;
end;
$$;

revoke all on function public.set_game_umpires(uuid, jsonb) from public, anon;
grant execute on function public.set_game_umpires(uuid, jsonb) to authenticated;

commit;
