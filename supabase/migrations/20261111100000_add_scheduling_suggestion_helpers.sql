-- Scheduling suggestions: one question the assignment screen needs to ask the database.
--
-- "Which active umpires cannot be assigned yet because they still need a parent's or guardian's consent?"
-- The "Suggest umpires" button uses this to leave them out of its list, so it never proposes someone the
-- database would refuse when the schedule is saved.
--
-- It answers ONLY for scheduling administrators (everyone else gets an empty list), and only with the ids of
-- the umpires concerned: the same thing assignment_blocked_by_consent() already tells an administrator one
-- umpire at a time. It reveals nothing about parents, birth dates or consents.
--
-- Needs 20261109100000_add_families_and_consent.sql (and its fix) applied. Safe to run twice.

begin;

create or replace function public.umpires_needing_consent()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.umpires u
  where public.is_scheduling_admin()
    and u.eligibility_status = 'active'
    and public.umpire_blocked_by_consent(u.id);
$$;

revoke all on function public.umpires_needing_consent() from public, anon;
grant execute on function public.umpires_needing_consent() to authenticated;

commit;
