-- How many umpires a game needs, and rules for assigning umpires.
--
-- HOW MANY UMPIRES
--   * each DIVISION has a default: 1 or 2 umpires per game (starting at 2)
--   * each GAME may override it: 0, 1 or 2 (blank means "use the division's
--     default"). The umpire chief uses this when, for example, a two-umpire
--     game will be worked by one umpire, or a tournament game needs a
--     different number.
--   A game is fully staffed when it has at least as many umpires as it needs.
--   An import from the master calendar never changes this override.
--
-- RULES FOR ASSIGNING
--   * only an ACTIVE umpire can be assigned (not inactive or suspended)
--   * nobody can be assigned to a CANCELED game
--   * the umpire who made the assignment is recorded
--   (One umpire per position and one position per umpire in a game were
--   already enforced.)
--
-- ONE STEP
--   set_game_umpires() sets a game's plate and field umpires together, all or
--   nothing, so two umpires can be swapped and a failure changes nothing.
--   It runs with the CALLER'S permissions, so only scheduling administrators
--   can use it.

begin;

alter table public.divisions
  add column umpires_per_game smallint not null default 2
    constraint divisions_umpires_per_game_valid
    check (umpires_per_game between 1 and 2);

alter table public.games
  add column umpires_needed smallint
    constraint games_umpires_needed_valid
    check (umpires_needed is null or umpires_needed between 0 and 2);

-- Finding one umpire's games (for their own schedule) stays fast.
create index if not exists game_assignments_umpire_idx
  on public.game_assignments (umpire_id);

-- ------------------------------------------------------------------ rules
-- (The rules are only applied for scheduling administrators, so a person who
-- is not allowed to assign umpires at all still gets the normal "not allowed"
-- answer from the row-level security rules, not a different message.)
create or replace function public.validate_game_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_eligibility text;
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

  if tg_op = 'INSERT' and new.assigned_by is null then
    new.assigned_by := (select auth.uid());
  end if;

  return new;
end;
$$;

create trigger game_assignments_validate
before insert or update on public.game_assignments
for each row execute function public.validate_game_assignment();

-- ------------------------------------------------------------- one step
create or replace function public.set_game_umpires(
  p_game_id uuid,
  p_plate uuid,
  p_field uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
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

  if p_plate is not null and p_plate = p_field then
    raise exception 'The same umpire cannot be both the plate and the field umpire.';
  end if;

  -- First remove the positions that are being cleared or given to someone
  -- else (this is also what lets two umpires swap), then fill the positions
  -- that are now empty. An umpire who stays where they are is not touched at
  -- all (not even re-checked, so an umpire who has since become inactive can
  -- stay on a game while the other position is changed).
  delete from public.game_assignments
  where game_id = p_game_id
    and (
      (position = 'plate' and umpire_id is distinct from p_plate)
      or (position = 'field' and umpire_id is distinct from p_field)
    );

  if p_plate is not null and not exists (
    select 1 from public.game_assignments
    where game_id = p_game_id and position = 'plate'
  ) then
    insert into public.game_assignments (game_id, umpire_id, position)
    values (p_game_id, p_plate, 'plate');
  end if;

  if p_field is not null and not exists (
    select 1 from public.game_assignments
    where game_id = p_game_id and position = 'field'
  ) then
    insert into public.game_assignments (game_id, umpire_id, position)
    values (p_game_id, p_field, 'field');
  end if;
end;
$$;

revoke all on function public.set_game_umpires(uuid, uuid, uuid) from public, anon;
grant execute on function public.set_game_umpires(uuid, uuid, uuid) to authenticated;

commit;
