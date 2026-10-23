
-- RWCLL: add reusable divisions / age groups.
create table public.divisions (
  id uuid primary key default gen_random_uuid(),

  league_id uuid not null
    references public.leagues(id) on delete restrict,

  name text not null,
  age_group text,
  description text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  constraint divisions_name_per_league
    unique (league_id, name)
);

-- Link teams to a division.
-- Nullable during initial rollout so existing team records,
-- if any, are not broken.
alter table public.teams
  add column division_id uuid
    references public.divisions(id) on delete restrict;

create index teams_division_idx
  on public.teams(division_id);

-- Protect divisions with row-level security.
alter table public.divisions enable row level security;

create policy "Approved users can view divisions"
on public.divisions
for select to authenticated
using (public.is_approved_user());

create policy "Approved admins can create divisions"
on public.divisions
for insert to authenticated
with check (public.is_approved_admin());

create policy "Approved admins can update divisions"
on public.divisions
for update to authenticated
using (public.is_approved_admin())
with check (public.is_approved_admin());

create policy "Approved admins can delete divisions"
on public.divisions
for delete to authenticated
using (public.is_approved_admin());

grant select, insert, update, delete
on public.divisions to authenticated;
