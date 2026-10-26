-- Availability: repeating times, and dates an umpire CANNOT umpire.
--
-- 1. "I CAN'T" ENTRIES
--    umpire_availability gets a "kind": 'available' (the existing meaning: "I can
--    umpire between these times", the default for every existing row) or
--    'unavailable' ("I cannot umpire between these times"). An 'unavailable'
--    entry overrides everything else for the times it covers.
--
-- 2. REPEATING TIMES (umpire_availability_patterns)
--    "Every Monday to Friday, 5 PM to 9 PM". Each pattern is for one SEASON and
--    ENDS AUTOMATICALLY on that season's end date, so it needs a season that has
--    an end date, and it follows the season if the end date is changed. A pattern
--    begins on its starts_on date (today, unless chosen otherwise).
--    weekdays are numbered 0 = Sunday to 6 = Saturday. The times are the
--    league's local clock times, like every other time in the app.
--
-- Who can do what is the same as for the one-off entries: an umpire manages
-- their own; scheduling administrators manage anyone's; an umpire cannot see
-- another umpire's; read-only administrators can look but not change.

begin;

-- ----------------------------------------------------------- 1. "I can't" entries
alter table public.umpire_availability
  add column kind text not null default 'available'
    constraint umpire_availability_kind_valid
      check (kind in ('available', 'unavailable'));

-- ------------------------------------------------------- 2. repeating times
create table public.umpire_availability_patterns (
  id uuid primary key default gen_random_uuid(),

  umpire_id uuid not null
    references public.umpires(id) on delete cascade,

  season_id uuid not null
    references public.seasons(id) on delete cascade,

  weekdays smallint[] not null,
  start_time time not null,
  end_time time not null,
  starts_on date not null default current_date,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint umpire_availability_patterns_weekdays_valid
    check (
      cardinality(weekdays) between 1 and 7
      and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
    ),
  constraint umpire_availability_patterns_times_valid
    check (end_time > start_time),
  constraint umpire_availability_patterns_notes_valid
    check (notes is null or char_length(notes) <= 200)
);

create index umpire_availability_patterns_umpire_idx
  on public.umpire_availability_patterns (umpire_id);

create index umpire_availability_patterns_season_idx
  on public.umpire_availability_patterns (season_id);

create trigger umpire_availability_patterns_set_updated_at
  before update on public.umpire_availability_patterns
  for each row execute function public.set_updated_at();

-- A pattern needs a season with an end date (that is when it stops), must not
-- start after that date, and keeps its weekdays tidy (no repeats, in order).
create function public.check_availability_pattern()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ends date;
begin
  select s.ends_on into v_ends
  from public.seasons s
  where s.id = new.season_id;

  if v_ends is null then
    raise exception 'A repeating time needs a season that has an end date.'
      using errcode = 'check_violation';
  end if;

  if new.starts_on > v_ends then
    raise exception 'A repeating time cannot start after the end of its season (%).', v_ends
      using errcode = 'check_violation';
  end if;

  new.weekdays := array(
    select distinct d from unnest(new.weekdays) as d order by d
  );

  return new;
end;
$$;

revoke all on function public.check_availability_pattern() from public, anon, authenticated;

create trigger umpire_availability_patterns_check
  before insert or update on public.umpire_availability_patterns
  for each row execute function public.check_availability_pattern();

-- ------------------------------------------------------------- security
alter table public.umpire_availability_patterns enable row level security;

revoke all on table public.umpire_availability_patterns from public, anon, authenticated;
grant select, insert, update, delete on table public.umpire_availability_patterns to authenticated;

create policy "Umpires and admins can view repeating availability"
  on public.umpire_availability_patterns
  for select to authenticated
  using (
    public.is_approved_admin()
    or (
      public.is_approved_user()
      and exists (
        select 1 from public.umpires u
        where u.id = umpire_availability_patterns.umpire_id
          and u.profile_id = (select auth.uid())
      )
    )
  );

create policy "Umpires and admins can add repeating availability"
  on public.umpire_availability_patterns
  for insert to authenticated
  with check (
    public.is_scheduling_admin()
    or (
      public.is_approved_user()
      and exists (
        select 1 from public.umpires u
        where u.id = umpire_availability_patterns.umpire_id
          and u.profile_id = (select auth.uid())
      )
    )
  );

create policy "Umpires and admins can update repeating availability"
  on public.umpire_availability_patterns
  for update to authenticated
  using (
    public.is_scheduling_admin()
    or (
      public.is_approved_user()
      and exists (
        select 1 from public.umpires u
        where u.id = umpire_availability_patterns.umpire_id
          and u.profile_id = (select auth.uid())
      )
    )
  )
  with check (
    public.is_scheduling_admin()
    or (
      public.is_approved_user()
      and exists (
        select 1 from public.umpires u
        where u.id = umpire_availability_patterns.umpire_id
          and u.profile_id = (select auth.uid())
      )
    )
  );

create policy "Umpires and admins can delete repeating availability"
  on public.umpire_availability_patterns
  for delete to authenticated
  using (
    public.is_scheduling_admin()
    or (
      public.is_approved_user()
      and exists (
        select 1 from public.umpires u
        where u.id = umpire_availability_patterns.umpire_id
          and u.profile_id = (select auth.uid())
      )
    )
  );

commit;
