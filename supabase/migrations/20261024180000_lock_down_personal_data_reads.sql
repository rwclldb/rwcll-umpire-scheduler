-- Lock down who can READ personal data.
--
-- Until now any approved account (including a youth umpire or a parent)
-- could read, through the API, every umpire record (names, numbers,
-- classification, phone numbers), every game assignment, and every
-- account's profile (including email addresses). No screen exposed this,
-- but the database allowed it.
--
-- After this migration:
--
--   umpires          scheduling admins (super_admin, umpire_chief,
--                    scheduler) can read all; an umpire can read only the
--                    record linked to their own account.
--   game_assignments scheduling admins can read all; an umpire can read
--                    only assignments for their own umpire record.
--   profiles         scheduling admins can read all; everyone else can
--                    read only their own profile.
--
-- Games (teams, fields, times) stay readable by approved accounts: the
-- schedule itself holds no personal data.
--
-- Nothing is deleted or changed. Writes are not affected. Parents will be
-- given read access to their own children's records later, through the
-- family links, on top of this default of "no access".

begin;

-- 1. Umpire records
drop policy "Approved users read umpire directory" on public.umpires;

create policy "Scheduling admins and the umpire read umpire records"
on public.umpires
for select to authenticated
using (
  public.is_scheduling_admin()
  or (
    public.is_approved_user()
    and profile_id = (select auth.uid())
  )
);

-- 2. Game assignments
drop policy "Approved users can view assignments" on public.game_assignments;

create policy "Scheduling admins and assigned umpires view assignments"
on public.game_assignments
for select to authenticated
using (
  public.is_scheduling_admin()
  or (
    public.is_approved_user()
    and exists (
      select 1
      from public.umpires u
      where u.id = game_assignments.umpire_id
        and u.profile_id = (select auth.uid())
    )
  )
);

-- 3. Profiles (names and email addresses)
alter policy "Read own profile or admin profile access"
on public.profiles
using (
  id = (select auth.uid())
  or public.is_scheduling_admin()
);

commit;
