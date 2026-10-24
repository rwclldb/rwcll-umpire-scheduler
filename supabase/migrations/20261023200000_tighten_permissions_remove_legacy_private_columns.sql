-- Tighten permissions and remove legacy private columns.
--
-- 1. Adds is_scheduling_admin(): approved super_admin, umpire_chief,
--    or scheduler. This matches the group that already manages
--    leagues, seasons, teams, locations, and umpire records.
-- 2. Uses it for writes on games, game_assignments, divisions,
--    umpire_availability, and for all access to umpire_private_details.
--    read_only_admin, treasurer, and feedback_reviewer keep read
--    access through is_approved_admin() where it is still used,
--    but can no longer write, and can no longer read private details.
-- 3. Drops the legacy emergency-contact and admin-notes columns from
--    public.umpires. The private data lives in umpire_private_details.
--    The migration aborts if any legacy data is found.

begin;

-- 1. Helper function
create or replace function public.is_scheduling_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.is_approved_user()
       and (
           public.has_role('super_admin')
           or public.has_role('umpire_chief')
           or public.has_role('scheduler')
       );
$$;

revoke all on function public.is_scheduling_admin() from public, anon;
grant execute on function public.is_scheduling_admin() to authenticated;


-- 2a. Games: only scheduling admins may write.
alter policy "Approved admins can create games"
on public.games
with check (public.is_scheduling_admin());

alter policy "Approved admins can update games"
on public.games
using (public.is_scheduling_admin())
with check (public.is_scheduling_admin());

alter policy "Approved admins can delete games"
on public.games
using (public.is_scheduling_admin());


-- 2b. Game assignments: only scheduling admins may write.
alter policy "Approved admins can create assignments"
on public.game_assignments
with check (public.is_scheduling_admin());

alter policy "Approved admins can update assignments"
on public.game_assignments
using (public.is_scheduling_admin())
with check (public.is_scheduling_admin());

alter policy "Approved admins can delete assignments"
on public.game_assignments
using (public.is_scheduling_admin());


-- 2c. Divisions: only scheduling admins may write.
alter policy "Approved admins can create divisions"
on public.divisions
with check (public.is_scheduling_admin());

alter policy "Approved admins can update divisions"
on public.divisions
using (public.is_scheduling_admin())
with check (public.is_scheduling_admin());

alter policy "Approved admins can delete divisions"
on public.divisions
using (public.is_scheduling_admin());


-- 2d. Availability: umpires still manage their own rows.
-- Only scheduling admins may write rows for other umpires.
-- The SELECT policy is unchanged, so read_only_admin can still view.
alter policy "Umpires and admins can add availability"
on public.umpire_availability
with check (
  public.is_scheduling_admin()
  or (
    public.is_approved_user()
    and exists (
      select 1
      from public.umpires u
      where u.id = umpire_availability.umpire_id
        and u.profile_id = (select auth.uid())
    )
  )
);

alter policy "Umpires and admins can update availability"
on public.umpire_availability
using (
  public.is_scheduling_admin()
  or (
    public.is_approved_user()
    and exists (
      select 1
      from public.umpires u
      where u.id = umpire_availability.umpire_id
        and u.profile_id = (select auth.uid())
    )
  )
)
with check (
  public.is_scheduling_admin()
  or (
    public.is_approved_user()
    and exists (
      select 1
      from public.umpires u
      where u.id = umpire_availability.umpire_id
        and u.profile_id = (select auth.uid())
    )
  )
);

alter policy "Umpires and admins can delete availability"
on public.umpire_availability
using (
  public.is_scheduling_admin()
  or (
    public.is_approved_user()
    and exists (
      select 1
      from public.umpires u
      where u.id = umpire_availability.umpire_id
        and u.profile_id = (select auth.uid())
    )
  )
);


-- 2e. Private umpire details: scheduling admins only.
alter policy "Approved admins can view umpire private details"
on public.umpire_private_details
using (public.is_scheduling_admin());

alter policy "Approved admins can insert umpire private details"
on public.umpire_private_details
with check (public.is_scheduling_admin());

alter policy "Approved admins can update umpire private details"
on public.umpire_private_details
using (public.is_scheduling_admin())
with check (public.is_scheduling_admin());


-- 3. Remove legacy private columns from the broadly readable table.
-- Abort (and roll back everything above) if any data is present.
do $$
begin
  if exists (
    select 1
    from public.umpires
    where emergency_contact_name is not null
       or emergency_contact_phone is not null
       or admin_notes is not null
  ) then
    raise exception
      'Legacy private data found in public.umpires. Move it to umpire_private_details before dropping these columns.';
  end if;
end
$$;

alter table public.umpires
  drop column emergency_contact_name,
  drop column emergency_contact_phone,
  drop column admin_notes;

commit;
