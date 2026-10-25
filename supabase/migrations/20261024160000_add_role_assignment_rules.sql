-- Safeguards for role assignment.
--
-- Until now a super admin could, through the database, remove the last
-- super admin role (locking everyone out), give roles to accounts that
-- are not approved, or make one account both a youth and an adult umpire.
-- These rules are enforced in the database so they hold even if the
-- screen is bypassed.
--
--   1. Roles can only be granted to APPROVED accounts.
--   2. An account cannot be both youth_umpire and adult_umpire (the
--      account role decides youth or adult).
--   3. The LAST super_admin role cannot be removed.
--
-- Existing role assignments are not changed. Rules 1 and 2 apply when a
-- role is added; rule 3 applies when a role is removed.

begin;

create or replace function public.enforce_role_assignment_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.profiles p
      where p.id = new.user_id
        and p.account_status = 'approved'
    ) then
      raise exception 'Roles can only be given to approved accounts.';
    end if;

    if new.role_id = 'youth_umpire' and exists (
      select 1 from public.user_roles r
      where r.user_id = new.user_id and r.role_id = 'adult_umpire'
    ) then
      raise exception 'This account is already an adult umpire. Remove that role first.';
    end if;

    if new.role_id = 'adult_umpire' and exists (
      select 1 from public.user_roles r
      where r.user_id = new.user_id and r.role_id = 'youth_umpire'
    ) then
      raise exception 'This account is already a youth umpire. Remove that role first.';
    end if;

    return new;
  end if;

  -- DELETE
  if old.role_id = 'super_admin' and not exists (
    select 1 from public.user_roles r
    where r.role_id = 'super_admin'
      and r.user_id <> old.user_id
  ) then
    raise exception 'The last super admin cannot be removed. Make someone else a super admin first.';
  end if;

  return old;
end;
$$;

-- A trigger function is never called directly.
revoke all on function public.enforce_role_assignment_rules()
from public, anon, authenticated;

drop trigger if exists user_roles_enforce_insert_rules on public.user_roles;
create trigger user_roles_enforce_insert_rules
before insert on public.user_roles
for each row execute function public.enforce_role_assignment_rules();

drop trigger if exists user_roles_enforce_delete_rules on public.user_roles;
create trigger user_roles_enforce_delete_rules
before delete on public.user_roles
for each row execute function public.enforce_role_assignment_rules();

commit;
