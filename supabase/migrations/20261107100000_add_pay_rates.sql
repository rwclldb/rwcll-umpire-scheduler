-- Pay rates: what each place pays, per game.
--
-- A rate is set for a DIVISION, a CLASSIFICATION (youth or adult), and a PLACE (plate,
-- first base, second base, third base, field), in whole CENTS. Adult rates exist so
-- the league can pay adults later; until someone sets one, an adult place pays nothing.
--
-- Rates are EFFECTIVE-DATED: a rate applies to games on or after its start date, and
-- the newest start date that has passed wins. So changing a rate never rewrites the
-- past, and a rate can be set ahead of time. Every change is kept in a log.
--
-- WHO: super admins and the treasurer (approved accounts) read and change rates.
-- Nobody else can read them (this is money). Nobody writes the tables directly.
--
-- This only sets the AMOUNTS. Working out what each umpire is owed, and paying it,
-- comes in later migrations.

begin;

-- ------------------------------------------------------------------ who may
create or replace function public.is_payments_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and p.account_status = 'approved'
      and ur.role_id in ('super_admin', 'treasurer')
  );
$$;

revoke all on function public.is_payments_manager() from public, anon;
grant execute on function public.is_payments_manager() to authenticated;

-- ------------------------------------------------------------------ the rates
create table public.pay_rates (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id) on delete cascade,
  classification text not null check (classification in ('youth', 'adult')),
  position text not null
    check (position in ('plate', 'first_base', 'second_base', 'third_base', 'field')),
  amount_cents integer not null check (amount_cents between 0 and 100000),
  effective_on date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pay_rates_unique unique (division_id, classification, position, effective_on)
);

create index pay_rates_lookup_idx
  on public.pay_rates (division_id, classification, position, effective_on);

-- every change: who, when, and what it was before and after
create table public.pay_rate_log (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null,
  division_name text not null,
  classification text not null,
  position text not null,
  effective_on date not null,
  old_cents integer,
  new_cents integer not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text not null,
  changed_at timestamptz not null default now()
);

create index pay_rate_log_time_idx on public.pay_rate_log (changed_at desc);

alter table public.pay_rates enable row level security;
alter table public.pay_rate_log enable row level security;

revoke all on table public.pay_rates, public.pay_rate_log from public, anon, authenticated;
grant select on table public.pay_rates, public.pay_rate_log to authenticated;

create policy "Super admins and the treasurer read pay rates"
on public.pay_rates for select to authenticated
using (public.is_payments_manager());

create policy "Super admins and the treasurer read the pay rate log"
on public.pay_rate_log for select to authenticated
using (public.is_payments_manager());

-- ---------------------------------------------------------------- set rates
-- p_rates is a list of {division_id, classification, position, amount_cents}.
-- A rate that is already that amount for that start date is left alone (and not logged).
-- The start date can be up to 60 days ago (for a season that has begun) or a year ahead.
create or replace function public.set_pay_rates(p_effective_on date, p_rates jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
  v_today date := (now() at time zone 'America/Los_Angeles')::date;
  v_item jsonb;
  v_division uuid;
  v_division_name text;
  v_class text;
  v_place text;
  v_cents integer;
  v_old integer;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can set pay rates.';
  end if;

  if p_effective_on is null or p_effective_on < v_today - 60 or p_effective_on > v_today + 365 then
    raise exception 'The start date must be within the last 60 days or the next year.';
  end if;

  if p_rates is null or jsonb_typeof(p_rates) <> 'array' then
    raise exception 'The rates must be a list.';
  end if;

  if jsonb_array_length(p_rates) > 500 then
    raise exception 'Too many rates at once (the most is 500).';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = v_uid;

  for v_item in select * from jsonb_array_elements(p_rates)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Each rate must have a division, classification, position and amount.';
    end if;

    begin
      v_division := (v_item ->> 'division_id')::uuid;
    exception when others then
      raise exception 'A division is not valid.';
    end;

    select d.name into v_division_name from public.divisions d where d.id = v_division;
    if not found then
      raise exception 'That division does not exist.';
    end if;

    v_class := v_item ->> 'classification';
    if v_class is null or v_class not in ('youth', 'adult') then
      raise exception 'Choose youth or adult.';
    end if;

    v_place := v_item ->> 'position';
    if v_place is null or v_place not in ('plate', 'first_base', 'second_base', 'third_base', 'field') then
      raise exception 'Choose plate, first base, second base, third base or field.';
    end if;

    -- (coalesce: a missing amount must be refused here, with a clear message)
    if coalesce(jsonb_typeof(v_item -> 'amount_cents'), '') <> 'number'
       or coalesce(v_item ->> 'amount_cents', '') !~ '^[0-9]{1,6}$' then
      raise exception 'An amount must be a whole number of cents.';
    end if;

    v_cents := (v_item ->> 'amount_cents')::integer;
    if v_cents > 100000 then
      raise exception 'An amount can be at most $1000.00.';
    end if;

    v_old := null;
    select r.amount_cents into v_old
    from public.pay_rates r
    where r.division_id = v_division and r.classification = v_class
      and r.position = v_place and r.effective_on = p_effective_on;

    if found and v_old = v_cents then
      continue;
    end if;

    if found then
      update public.pay_rates
      set amount_cents = v_cents, updated_at = now()
      where division_id = v_division and classification = v_class
        and position = v_place and effective_on = p_effective_on;
    else
      insert into public.pay_rates (division_id, classification, position, amount_cents, effective_on, created_by, created_by_name)
      values (v_division, v_class, v_place, v_cents, p_effective_on, v_uid, coalesce(v_name, 'An administrator'));
    end if;

    insert into public.pay_rate_log (division_id, division_name, classification, position, effective_on, old_cents, new_cents, changed_by, changed_by_name)
    values (v_division, v_division_name, v_class, v_place, p_effective_on, v_old, v_cents, v_uid, coalesce(v_name, 'An administrator'));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.set_pay_rates(date, jsonb) from public, anon;
grant execute on function public.set_pay_rates(date, jsonb) to authenticated;

-- ---------------------------------------------- what a place pays on a given date
-- The newest rate whose start date has passed; null if there is none (nothing is
-- owed). INTERNAL: used when working out what umpires are owed. Not callable from the app.
create or replace function public.pay_rate_for(
  p_division_id uuid,
  p_classification text,
  p_position text,
  p_on date
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select r.amount_cents
  from public.pay_rates r
  where r.division_id = p_division_id
    and r.classification = p_classification
    and r.position = p_position
    and r.effective_on <= p_on
  order by r.effective_on desc
  limit 1;
$$;

revoke all on function public.pay_rate_for(uuid, text, text, date) from public, anon, authenticated;

commit;
