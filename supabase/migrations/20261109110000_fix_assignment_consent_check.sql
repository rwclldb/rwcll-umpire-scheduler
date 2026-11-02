-- Fix for 20261109100000: assigning an umpire failed for administrators with "permission denied for
-- function umpire_blocked_by_consent", because the assignment rule (which runs as the signed-in
-- administrator) called a system-only helper. It now calls an admin-only wrapper instead.
--
-- Safe to run whether or not the first version had this problem (every statement is "create or replace").

begin;

-- The assignment rule runs as the signed-in ADMINISTRATOR (it is a trigger), so it cannot call the
-- system-only helper above. This wrapper is what it calls: it answers only for scheduling
-- administrators, and says "no" to everyone else, so it reveals nothing about any child.
create or replace function public.assignment_blocked_by_consent(p_umpire_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_scheduling_admin() and public.umpire_blocked_by_consent(p_umpire_id);
$$;

revoke all on function public.assignment_blocked_by_consent(uuid) from public, anon;
grant execute on function public.assignment_blocked_by_consent(uuid) to authenticated;

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

  if public.assignment_blocked_by_consent(new.umpire_id) then
    raise exception 'That umpire is under % and needs a parent or guardian''s consent before they can be assigned.', public.parent_consent_below_age();
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

commit;
