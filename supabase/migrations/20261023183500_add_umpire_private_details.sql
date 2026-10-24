-- Records public.umpire_private_details in the migration history.
--
-- This table was originally created by hand in the SQL Editor, so no
-- migration described it. This file matches the live definition exactly
-- (columns, constraints, policies, grants as of the live database check)
-- so that a brand-new database can be built from the migration files.
--
-- It is safe to run on a database that already has the table: every
-- step is skipped or leaves the same final result.
--
-- On a fresh build the policies are created with the ORIGINAL rule
-- (is_approved_admin). The later migration
-- 20261023200000_tighten_permissions_remove_legacy_private_columns.sql
-- tightens them to is_scheduling_admin(), matching the live database.

begin;

create table if not exists public.umpire_private_details (
  umpire_id uuid primary key
    references public.umpires(id) on delete cascade,
  emergency_contact_name text,
  emergency_contact_phone text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.umpire_private_details enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'umpire_private_details'
      and policyname = 'Approved admins can view umpire private details'
  ) then
    create policy "Approved admins can view umpire private details"
    on public.umpire_private_details
    for select to authenticated
    using (public.is_approved_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'umpire_private_details'
      and policyname = 'Approved admins can insert umpire private details'
  ) then
    create policy "Approved admins can insert umpire private details"
    on public.umpire_private_details
    for insert to authenticated
    with check (public.is_approved_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'umpire_private_details'
      and policyname = 'Approved admins can update umpire private details'
  ) then
    create policy "Approved admins can update umpire private details"
    on public.umpire_private_details
    for update to authenticated
    using (public.is_approved_admin())
    with check (public.is_approved_admin());
  end if;
end
$$;

-- No ordinary-user delete, and no anonymous access.
revoke all on table public.umpire_private_details
from public, anon, authenticated;

grant select, insert, update
on table public.umpire_private_details
to authenticated;

commit;
