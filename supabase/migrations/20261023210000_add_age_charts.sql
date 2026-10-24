-- Little League age charts and division age ranges.
--
-- Design notes:
-- * A chart is immutable once imported. There is no way to edit or
--   delete chart rows through the app. To correct a chart, import a
--   new one and explicitly point the season at it. This guarantees a
--   historical season's age calculations never change silently.
-- * Charts are imported only through import_age_chart(), which runs
--   in a single transaction: either the whole chart is saved or
--   nothing is.
-- * A season references its chart through seasons.age_chart_id.
-- * Divisions get youngest_ll_age / oldest_ll_age (integer LL ages).

begin;

-- 1. Charts
create table public.little_league_age_charts (
  id uuid primary key default gen_random_uuid(),
  chart_year integer not null
    constraint little_league_age_charts_year_valid
    check (chart_year between 2000 and 2100),
  name text not null
    constraint little_league_age_charts_name_valid
    check (btrim(name) <> '' and char_length(name) <= 100),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint little_league_age_charts_year_name_unique
    unique (chart_year, name)
);

-- 2. Chart entries: birth month + birth year -> Little League age
create table public.little_league_age_chart_entries (
  id uuid primary key default gen_random_uuid(),
  chart_id uuid not null
    references public.little_league_age_charts(id) on delete cascade,
  birth_month smallint not null
    constraint age_chart_entries_month_valid
    check (birth_month between 1 and 12),
  birth_year smallint not null
    constraint age_chart_entries_year_valid
    check (birth_year between 1900 and 2100),
  ll_age smallint not null
    constraint age_chart_entries_age_valid
    check (ll_age between 4 and 18),
  created_at timestamptz not null default now(),
  constraint age_chart_entries_month_year_unique
    unique (chart_id, birth_month, birth_year),
  constraint age_chart_entries_month_age_unique
    unique (chart_id, birth_month, ll_age)
);

-- 3. Seasons point at a chart (nullable: existing seasons have none).
-- on delete restrict: a chart used by a season cannot be removed.
alter table public.seasons
  add column age_chart_id uuid
    references public.little_league_age_charts(id) on delete restrict;

create index seasons_age_chart_idx on public.seasons(age_chart_id);

-- 4. Division age ranges (nullable so existing divisions, if any,
-- stay valid). Either both ages are set or neither is.
alter table public.divisions
  add column youngest_ll_age smallint,
  add column oldest_ll_age smallint,
  add constraint divisions_ll_age_range_valid check (
    (youngest_ll_age is null and oldest_ll_age is null)
    or (
      youngest_ll_age is not null
      and oldest_ll_age is not null
      and youngest_ll_age between 4 and 18
      and oldest_ll_age between 4 and 18
      and youngest_ll_age <= oldest_ll_age
    )
  );

-- 5. Row-level security.
-- Approved users may read charts. Nobody can insert, update, or
-- delete directly; imports go through import_age_chart() below.
alter table public.little_league_age_charts enable row level security;
alter table public.little_league_age_chart_entries enable row level security;

create policy "Approved users read age charts"
on public.little_league_age_charts
for select to authenticated
using (public.is_approved_user());

create policy "Approved users read age chart entries"
on public.little_league_age_chart_entries
for select to authenticated
using (public.is_approved_user());

revoke all on table public.little_league_age_charts
from public, anon, authenticated;
revoke all on table public.little_league_age_chart_entries
from public, anon, authenticated;

grant select on table public.little_league_age_charts to authenticated;
grant select on table public.little_league_age_chart_entries to authenticated;

-- 6. Atomic chart import.
-- p_entries is a JSON array like:
--   [{"birth_month": 3, "birth_year": 2019, "ll_age": 8}, ...]
-- Any failure (bad value, duplicate, constraint violation) rolls
-- back the whole call, so no partial chart is ever left behind.
create or replace function public.import_age_chart(
  p_chart_year integer,
  p_name text,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chart_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can import age charts';
  end if;

  if p_chart_year is null or p_chart_year not between 2000 and 2100 then
    raise exception 'Chart year must be between 2000 and 2100';
  end if;

  if v_name = '' or char_length(v_name) > 100 then
    raise exception 'Chart name is required and must be 100 characters or fewer';
  end if;

  if p_entries is null
     or jsonb_typeof(p_entries) <> 'array'
     or jsonb_array_length(p_entries) = 0 then
    raise exception 'Chart entries must be a non-empty list';
  end if;

  if jsonb_array_length(p_entries) > 1000 then
    raise exception 'Chart has too many entries';
  end if;

  insert into public.little_league_age_charts (chart_year, name, created_by)
  values (p_chart_year, v_name, (select auth.uid()))
  returning id into v_chart_id;

  insert into public.little_league_age_chart_entries
    (chart_id, birth_month, birth_year, ll_age)
  select v_chart_id, x.birth_month, x.birth_year, x.ll_age
  from jsonb_to_recordset(p_entries)
    as x(birth_month smallint, birth_year smallint, ll_age smallint);

  return v_chart_id;
end;
$$;

revoke all on function public.import_age_chart(integer, text, jsonb)
from public, anon;
grant execute on function public.import_age_chart(integer, text, jsonb)
to authenticated;

-- 7. Lookup: Little League age for a birth month/year, using the
-- chart attached to the given season. Returns NULL if the season has
-- no chart or the month/year is not in the chart; it never guesses.
-- Takes month and year only, so full birthdates need not be sent.
-- Runs as the caller, so RLS still applies.
create or replace function public.ll_age_for_season(
  p_season_id uuid,
  p_birth_year integer,
  p_birth_month integer
)
returns smallint
language sql
stable
set search_path = ''
as $$
  select e.ll_age
  from public.seasons s
  join public.little_league_age_chart_entries e
    on e.chart_id = s.age_chart_id
  where s.id = p_season_id
    and e.birth_year = p_birth_year
    and e.birth_month = p_birth_month;
$$;

revoke all on function public.ll_age_for_season(uuid, integer, integer)
from public, anon;
grant execute on function public.ll_age_for_season(uuid, integer, integer)
to authenticated;

commit;
