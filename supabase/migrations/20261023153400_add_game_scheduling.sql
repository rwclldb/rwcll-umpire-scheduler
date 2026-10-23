
-- RWCLL scheduling foundation
-- Creates games, game assignments, and umpire availability.

-- 1. Games
create table public.games (
  id uuid primary key default gen_random_uuid(),

  season_id uuid not null
    references public.seasons(id) on delete restrict,

  home_team_id uuid not null
    references public.teams(id) on delete restrict,

  away_team_id uuid not null
    references public.teams(id) on delete restrict,

  location_id uuid not null
    references public.locations(id) on delete restrict,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'canceled', 'completed')),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint games_valid_time
    check (ends_at > starts_at),

  constraint games_different_teams
    check (home_team_id <> away_team_id)
);

create index games_season_idx on public.games(season_id);
create index games_starts_at_idx on public.games(starts_at);
create index games_location_time_idx
  on public.games(location_id, starts_at);


-- 2. Umpire assignments
-- Each game has one plate slot and one field slot.
-- Assignment status is intentionally not needed because
-- scheduler assignments are final.

create table public.game_assignments (
  id uuid primary key default gen_random_uuid(),

  game_id uuid not null
    references public.games(id) on delete cascade,

  umpire_id uuid not null
    references public.umpires(id) on delete restrict,

  position text not null
    check (position in ('plate', 'field')),

  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  notes text,

  constraint game_assignments_one_per_position
    unique (game_id, position),

  constraint game_assignments_umpire_once_per_game
    unique (game_id, umpire_id)
);

create index game_assignments_umpire_idx
  on public.game_assignments(umpire_id);


-- 3. Umpire availability
-- Umpires submit the time ranges when they ARE available.
-- Use timezone-aware timestamps.

create table public.umpire_availability (
  id uuid primary key default gen_random_uuid(),

  umpire_id uuid not null
    references public.umpires(id) on delete cascade,

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint umpire_availability_valid_time
    check (ends_at > starts_at)
);

create index umpire_availability_umpire_time_idx
  on public.umpire_availability(umpire_id, starts_at, ends_at);


-- 4. Enable row-level security
alter table public.games enable row level security;
alter table public.game_assignments enable row level security;
alter table public.umpire_availability enable row level security;


-- 5. Games policies

create policy "Approved users can view games"
on public.games
for select to authenticated
using (public.is_approved_user());

create policy "Approved admins can create games"
on public.games
for insert to authenticated
with check (public.is_approved_admin());

create policy "Approved admins can update games"
on public.games
for update to authenticated
using (public.is_approved_admin())
with check (public.is_approved_admin());

create policy "Approved admins can delete games"
on public.games
for delete to authenticated
using (public.is_approved_admin());


-- 6. Assignment policies

create policy "Approved users can view assignments"
on public.game_assignments
for select to authenticated
using (public.is_approved_user());

create policy "Approved admins can create assignments"
on public.game_assignments
for insert to authenticated
with check (public.is_approved_admin());

create policy "Approved admins can update assignments"
on public.game_assignments
for update to authenticated
using (public.is_approved_admin())
with check (public.is_approved_admin());

create policy "Approved admins can delete assignments"
on public.game_assignments
for delete to authenticated
using (public.is_approved_admin());


-- 7. Availability policies
-- A user can manage availability only for an umpire record
-- linked to their own approved account. Approved admins can
-- manage availability for any umpire.

create policy "Umpires and admins can view availability"
on public.umpire_availability
for select to authenticated
using (
  public.is_approved_admin()
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

create policy "Umpires and admins can add availability"
on public.umpire_availability
for insert to authenticated
with check (
  public.is_approved_admin()
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

create policy "Umpires and admins can update availability"
on public.umpire_availability
for update to authenticated
using (
  public.is_approved_admin()
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
  public.is_approved_admin()
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

create policy "Umpires and admins can delete availability"
on public.umpire_availability
for delete to authenticated
using (
  public.is_approved_admin()
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


-- 8. Grant table privileges.
-- RLS policies above still determine which rows users can access.

grant select, insert, update, delete
on public.games to authenticated;

grant select, insert, update, delete
on public.game_assignments to authenticated;

grant select, insert, update, delete
on public.umpire_availability to authenticated;
