
-- Phase 1: Foundation and access control
-- No real user data should be added until the policies are tested.

create extension if not exists pgcrypto;

-- 1. Profiles: one profile per authenticated Supabase user.
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    email text not null default '',
    account_status text not null default 'pending'
        check (account_status in ('pending', 'approved', 'rejected', 'suspended')),
    approved_by uuid references public.profiles(id),
    approved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. Available roles.
create table public.roles (
    id text primary key,
    description text not null
);

insert into public.roles (id, description) values
    ('super_admin', 'Full system access, including role management'),
    ('umpire_chief', 'Manage umpires, assignments, and feedback'),
    ('scheduler', 'Manage games, schedules, and assignments'),
    ('treasurer', 'Manage umpire earnings and payments'),
    ('youth_umpire', 'Self-service access for youth umpires'),
    ('adult_umpire', 'Self-service access for adult umpires'),
    ('parent_guardian', 'Optional guardian access, subject to defined permissions'),
    ('feedback_reviewer', 'Review authorized umpire feedback'),
    ('read_only_admin', 'Read-only administrative access');

-- 3. Role assignments. Users can have multiple roles.
create table public.user_roles (
    user_id uuid not null references public.profiles(id) on delete cascade,
    role_id text not null references public.roles(id),
    granted_by uuid references public.profiles(id),
    granted_at timestamptz not null default now(),
    primary key (user_id, role_id)
);

-- 4. Umpire directory. An umpire need not have an account yet.
create table public.umpires (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid unique references public.profiles(id) on delete set null,
    umpire_number text unique,
    display_name text not null,
    classification text not null
        check (classification in ('youth', 'adult')),
    phone text,
    eligibility_status text not null default 'active'
        check (eligibility_status in ('active', 'inactive', 'suspended')),
    emergency_contact_name text,
    emergency_contact_phone text,
    admin_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 5. Reference data used by future scheduling features.
create table public.leagues (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table public.seasons (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    starts_on date,
    ends_on date,
    is_active boolean not null default true,
    check (ends_on is null or starts_on is null or ends_on >= starts_on),
    created_at timestamptz not null default now()
);

create table public.teams (
    id uuid primary key default gen_random_uuid(),
    league_id uuid not null references public.leagues(id),
    season_id uuid not null references public.seasons(id),
    name text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (league_id, season_id, name)
);

create table public.locations (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    address text,
    notes text,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- 6. Keep updated_at current when a row is changed.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger umpires_set_updated_at
before update on public.umpires
for each row execute function public.set_updated_at();

-- 7. Create a pending profile when a user registers.
-- Account approval and role assignment remain separate actions.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, email)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'display_name', ''),
        coalesce(new.email, '')
    );
    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 8. Security helper functions.
-- SECURITY DEFINER lets policies check protected tables without
-- recursively invoking their own RLS policies.
create function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid())
          and p.account_status = 'approved'
    );
$$;

create function public.has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.user_roles ur
        where ur.user_id = (select auth.uid())
          and ur.role_id = required_role
    );
$$;

create function public.is_approved_admin()
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
           or public.has_role('treasurer')
           or public.has_role('feedback_reviewer')
           or public.has_role('read_only_admin')
       );
$$;

-- Prevent these helpers from being called by anonymous users.
revoke all on function public.is_approved_user() from public, anon;
revoke all on function public.has_role(text) from public, anon;
revoke all on function public.is_approved_admin() from public, anon;

grant execute on function public.is_approved_user() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_approved_admin() to authenticated;

-- 9. Enable row-level security on all application tables.
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.umpires enable row level security;
alter table public.leagues enable row level security;
alter table public.seasons enable row level security;
alter table public.teams enable row level security;
alter table public.locations enable row level security;

-- Profiles: users can read their own profile; approved administrators
-- can read profiles for administration. No client-side profile writes yet.
create policy "Read own profile or admin profile access"
on public.profiles for select
to authenticated
using (
    id = (select auth.uid())
    or public.is_approved_admin()
);

-- Role definitions are visible only to approved users.
create policy "Approved users read role definitions"
on public.roles for select
to authenticated
using (public.is_approved_user());

-- Users can see their own role assignments.
-- Only a super admin can grant or revoke roles through client access.
create policy "Read own roles or super admin reads all"
on public.user_roles for select
to authenticated
using (
    user_id = (select auth.uid())
    or (
        public.is_approved_user()
        and public.has_role('super_admin')
    )
);

create policy "Super admins grant roles"
on public.user_roles for insert
to authenticated
with check (
    public.is_approved_user()
    and public.has_role('super_admin')
    and (
        granted_by = (select auth.uid())
        or granted_by is null
    )
);

create policy "Super admins revoke roles"
on public.user_roles for delete
to authenticated
using (
    public.is_approved_user()
    and public.has_role('super_admin')
);

-- Umpire directory: approved users can read the directory.
-- Only designated administrative roles can change it.
create policy "Approved users read umpire directory"
on public.umpires for select
to authenticated
using (public.is_approved_user());

create policy "Authorized admins add umpires"
on public.umpires for insert
to authenticated
with check (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
);

create policy "Authorized admins update umpires"
on public.umpires for update
to authenticated
using (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
)
with check (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
);

create policy "Authorized admins delete umpires"
on public.umpires for delete
to authenticated
using (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
    )
);

-- Reference tables: approved users can read; only scheduling
-- administrators can maintain the data.
create policy "Approved users read leagues"
on public.leagues for select to authenticated
using (public.is_approved_user());

create policy "Scheduling admins manage leagues"
on public.leagues for all to authenticated
using (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
)
with check (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
);

create policy "Approved users read seasons"
on public.seasons for select to authenticated
using (public.is_approved_user());

create policy "Scheduling admins manage seasons"
on public.seasons for all to authenticated
using (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
)
with check (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
);

create policy "Approved users read teams"
on public.teams for select to authenticated
using (public.is_approved_user());

create policy "Scheduling admins manage teams"
on public.teams for all to authenticated
using (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
)
with check (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
);

create policy "Approved users read locations"
on public.locations for select to authenticated
using (public.is_approved_user());

create policy "Scheduling admins manage locations"
on public.locations for all to authenticated
using (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
)
with check (
    public.is_approved_user()
    and (
        public.has_role('super_admin')
        or public.has_role('umpire_chief')
        or public.has_role('scheduler')
    )
);

-- Intentionally no public/anonymous access policies.
-- Do not grant administrator roles through user-editable metadata.
