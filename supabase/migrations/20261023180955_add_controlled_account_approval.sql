-- Controlled account approval.
-- Only an approved Super Admin can change another user's status.

create or replace function public.set_account_status(
    target_user_id uuid,
    new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if (select auth.uid()) is null then
        raise exception 'Authentication required';
    end if;

    if not public.is_approved_user()
       or not public.has_role('super_admin') then
        raise exception 'Only an approved Super Admin can change account status';
    end if;

    if target_user_id = (select auth.uid()) then
        raise exception 'You cannot change your own account status';
    end if;

    if new_status not in ('approved', 'rejected', 'suspended') then
        raise exception 'Invalid account status';
    end if;

    update public.profiles
    set
        account_status = new_status,
        approved_by = (select auth.uid()),
        approved_at = case
            when new_status = 'approved' then now()
            else null
        end
    where id = target_user_id;

    if not found then
        raise exception 'Target user profile was not found';
    end if;
end;
$$;

-- Remove default function execution privileges and grant only to
-- authenticated users. The function performs its own authorization.
revoke all on function public.set_account_status(uuid, text)
from public, anon;

grant execute on function public.set_account_status(uuid, text)
to authenticated;