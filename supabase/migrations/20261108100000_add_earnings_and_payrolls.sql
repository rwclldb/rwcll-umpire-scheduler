-- Earnings and payroll: what each umpire is owed, and paying it.
--
-- Needs the pay rates migration (20261107100000) applied first.
-- ----------------------------------------------------------------------------
-- THE FLOW
--   1. PAYEE     each umpire has a payee: the account that receives their pay. An
--                adult is their own payee. A youth umpire's payee is a parent or
--                guardian's account (one account can be the payee for several
--                children: they are paid as one family). A youth can never be their
--                own payee.
--   2. EARNINGS  "Work out earnings" turns each RECORDED ARRIVAL (an umpire's check-in,
--                or an administrator marking it) on a game that was not canceled into
--                an earning, at the rate in effect on the game's date. The amount is
--                SNAPSHOTTED: changing a rate later never changes what was earned. A
--                place with no rate (or $0) earns nothing and is reported.
--   3. ADJUSTMENTS  plus or minus amounts with a reason (a substitute who worked, a
--                bonus, a correction). An earning can be voided with a reason.
--   4. PAYROLL   a draft batch for a period: every unpaid earning and adjustment in it,
--                totaled for each umpire and then for each PAYEE (a family). It is
--                APPROVED by any super admin or the treasurer. Then each payee's
--                payment is recorded as made (check, bank transfer, cash or other).
--                Paying through Stripe is added in a later migration.
--   5. LOG       every step is recorded in money_log (who, what, when).
--
-- WHO: super admins and the treasurer only (is_payments_manager). Nobody else can read
-- any of this. Nobody writes the tables directly.
-- ----------------------------------------------------------------------------

begin;

-- ===================================================================== the log
create table public.money_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  detail text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  acted_at timestamptz not null default now()
);

create index money_log_time_idx on public.money_log (acted_at desc);

create or replace function public.log_money(p_action text, p_detail text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  insert into public.money_log (action, detail, actor_id, actor_name)
  values (p_action, left(p_detail, 500), (select auth.uid()), coalesce(v_name, 'The system'));
end;
$$;

revoke all on function public.log_money(text, text) from public, anon, authenticated;

-- ====================================================================== payees
alter table public.umpires
  add column payee_profile_id uuid references public.profiles(id) on delete set null;

-- who receives this umpire's pay: the payee chosen, or an adult umpire's own account
create or replace function public.payee_for_umpire(p_umpire_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.payee_profile_id is not null then u.payee_profile_id
    when u.classification = 'adult' then u.profile_id
    else null
  end
  from public.umpires u
  where u.id = p_umpire_id;
$$;

revoke all on function public.payee_for_umpire(uuid) from public, anon, authenticated;

create or replace function public.set_umpire_payee(p_umpire_id uuid, p_payee_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire public.umpires%rowtype;
  v_old text;
  v_new text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can choose who is paid.';
  end if;

  select * into v_umpire from public.umpires u where u.id = p_umpire_id;
  if not found then
    raise exception 'That umpire does not exist.';
  end if;

  if p_payee_profile_id is not null then
    if not exists (select 1 from public.profiles p where p.id = p_payee_profile_id and p.account_status = 'approved') then
      raise exception 'The payee must be an approved account.';
    end if;

    if v_umpire.classification = 'youth' and v_umpire.profile_id is not distinct from p_payee_profile_id then
      raise exception 'A youth umpire cannot be their own payee: choose a parent or guardian''s account.';
    end if;
  end if;

  if v_umpire.payee_profile_id is not distinct from p_payee_profile_id then
    return;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_old from public.profiles p where p.id = v_umpire.payee_profile_id;
  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_new from public.profiles p where p.id = p_payee_profile_id;

  update public.umpires set payee_profile_id = p_payee_profile_id where id = p_umpire_id;

  perform public.log_money('payee_changed', 'Payee for ' || v_umpire.display_name || ': ' || coalesce(v_old, 'none') || ' to ' || coalesce(v_new, 'none'));
end;
$$;

revoke all on function public.set_umpire_payee(uuid, uuid) from public, anon;
grant execute on function public.set_umpire_payee(uuid, uuid) to authenticated;

-- =============================================================== the batches
create table public.payrolls (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'discarded')),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_by_name text,
  approved_at timestamptz,
  total_cents integer not null default 0,
  constraint payrolls_period_valid check (period_end >= period_start),
  constraint payrolls_approved_consistent check ((status in ('approved', 'paid')) = (approved_at is not null))
);

-- only one draft at a time keeps things simple and safe
create unique index payrolls_one_draft_idx on public.payrolls ((status)) where status = 'draft';

-- ============================================================= what was earned
create table public.earnings (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  umpire_id uuid not null references public.umpires(id) on delete restrict,
  position text not null check (position in ('plate', 'first_base', 'second_base', 'third_base', 'field')),
  division_name text not null,
  classification text not null check (classification in ('youth', 'adult')),
  game_date date not null,
  amount_cents integer not null check (amount_cents between 1 and 100000),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by_name text,
  void_reason text,
  payroll_id uuid references public.payrolls(id) on delete set null,
  constraint earnings_void_consistent
    check ((voided_at is null) = (voided_by_name is null) and (voided_at is null) = (void_reason is null)),
  constraint earnings_one_per_game unique (game_id, umpire_id)
);

create index earnings_open_idx on public.earnings (game_date) where payroll_id is null and voided_at is null;
create index earnings_umpire_idx on public.earnings (umpire_id, game_date);

create table public.earning_adjustments (
  id uuid primary key default gen_random_uuid(),
  umpire_id uuid not null references public.umpires(id) on delete restrict,
  game_id uuid references public.games(id) on delete set null,
  amount_cents integer not null check (amount_cents <> 0 and amount_cents between -100000 and 100000),
  reason text not null check (char_length(btrim(reason)) between 1 and 200),
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by_name text,
  payroll_id uuid references public.payrolls(id) on delete set null,
  constraint adjustments_void_consistent check ((voided_at is null) = (voided_by_name is null))
);

-- each umpire's line in a payroll, and each payee's payment
create table public.payroll_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id) on delete cascade,
  umpire_id uuid not null references public.umpires(id) on delete restrict,
  umpire_name text not null,
  payee_profile_id uuid references public.profiles(id) on delete set null,
  games integer not null,
  earned_cents integer not null,
  adjustments_cents integer not null,
  total_cents integer not null,
  constraint payroll_lines_one_per_umpire unique (payroll_id, umpire_id)
);

create table public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  payroll_id uuid not null references public.payrolls(id) on delete cascade,
  payee_profile_id uuid references public.profiles(id) on delete set null,
  payee_name text not null,
  amount_cents integer not null check (amount_cents > 0),
  umpire_count integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  method text check (method is null or method in ('check', 'bank_transfer', 'cash', 'other')),
  reference text check (reference is null or char_length(reference) <= 100),
  paid_at timestamptz,
  paid_by_name text,
  constraint payroll_payments_paid_consistent check ((status = 'paid') = (paid_at is not null))
);

-- ======================================================================= access
alter table public.money_log enable row level security;
alter table public.payrolls enable row level security;
alter table public.earnings enable row level security;
alter table public.earning_adjustments enable row level security;
alter table public.payroll_lines enable row level security;
alter table public.payroll_payments enable row level security;

revoke all on table
  public.money_log, public.payrolls, public.earnings, public.earning_adjustments,
  public.payroll_lines, public.payroll_payments
from public, anon, authenticated;

grant select on table
  public.money_log, public.payrolls, public.earnings, public.earning_adjustments,
  public.payroll_lines, public.payroll_payments
to authenticated;

create policy "Payments managers read the money log" on public.money_log for select to authenticated using (public.is_payments_manager());
create policy "Payments managers read payrolls" on public.payrolls for select to authenticated using (public.is_payments_manager());
create policy "Payments managers read earnings" on public.earnings for select to authenticated using (public.is_payments_manager());
create policy "Payments managers read adjustments" on public.earning_adjustments for select to authenticated using (public.is_payments_manager());
create policy "Payments managers read payroll lines" on public.payroll_lines for select to authenticated using (public.is_payments_manager());
create policy "Payments managers read payments" on public.payroll_payments for select to authenticated using (public.is_payments_manager());

-- ============================================================ work out earnings
-- Turns every recorded arrival, on a game that was not canceled, in the period, that
-- has no earning yet, into an earning at the rate for that game's date. Safe to run
-- again: it only adds what is new. Returns how many were added, their total, and how
-- many arrivals earned nothing because that place has no rate.
create or replace function public.generate_earnings(p_from date, p_through date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Los_Angeles')::date;
  v_created integer := 0;
  v_total bigint := 0;
  v_no_rate integer := 0;
  v_rate integer;
  r record;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can work out earnings.';
  end if;

  if p_from is null or p_through is null or p_through < p_from then
    raise exception 'Choose a start date and an end date (the end cannot be before the start).';
  end if;

  if p_through - p_from > 400 then
    raise exception 'Choose a period of at most 400 days.';
  end if;

  if p_through > v_today then
    raise exception 'The end date cannot be in the future (those games have not been played).';
  end if;

  for r in
    select
      ga.game_id,
      ga.umpire_id,
      ga.position as place,
      g.division_id,
      coalesce(d.name, 'A division') as division_name,
      u.classification as kind,
      (g.starts_at at time zone 'America/Los_Angeles')::date as game_date
    from public.game_assignments ga
    join public.games g on g.id = ga.game_id
    join public.umpires u on u.id = ga.umpire_id
    left join public.divisions d on d.id = g.division_id
    where ga.attendance = 'arrived'
      and g.status <> 'canceled'
      and (g.starts_at at time zone 'America/Los_Angeles')::date between p_from and p_through
      and not exists (select 1 from public.earnings e where e.game_id = ga.game_id and e.umpire_id = ga.umpire_id)
    order by g.starts_at, u.display_name
  loop
    v_rate := public.pay_rate_for(r.division_id, r.kind, r.place, r.game_date);

    if v_rate is null or v_rate = 0 then
      v_no_rate := v_no_rate + 1;
      continue;
    end if;

    insert into public.earnings (game_id, umpire_id, position, division_name, classification, game_date, amount_cents)
    values (r.game_id, r.umpire_id, r.place, r.division_name, r.kind, r.game_date, v_rate);

    v_created := v_created + 1;
    v_total := v_total + v_rate;
  end loop;

  perform public.log_money('earnings_generated', 'Worked out earnings from ' || p_from || ' to ' || p_through || ': ' || v_created || ' added (' || v_total || ' cents), ' || v_no_rate || ' with no rate');

  return jsonb_build_object('created', v_created, 'total_cents', v_total, 'no_rate', v_no_rate);
end;
$$;

revoke all on function public.generate_earnings(date, date) from public, anon;
grant execute on function public.generate_earnings(date, date) to authenticated;

-- ===================================================== voiding and adjustments
create or replace function public.void_earning(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.earnings%rowtype;
  v_reason text;
  v_name text;
  v_umpire text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can void an earning.';
  end if;

  select * into v_row from public.earnings e where e.id = p_id;
  if not found then
    raise exception 'That earning does not exist.';
  end if;

  if v_row.voided_at is not null then
    raise exception 'That earning is already voided.';
  end if;

  if v_row.payroll_id is not null then
    raise exception 'That earning is already in a payroll. Discard the payroll first, or add an adjustment instead.';
  end if;

  v_reason := regexp_replace(coalesce(p_reason, ''), '^\s+|\s+$', '', 'g');
  if v_reason = '' or char_length(v_reason) > 200 then
    raise exception 'Give a reason (up to 200 characters).';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  update public.earnings
  set voided_at = now(), voided_by_name = coalesce(v_name, 'An administrator'), void_reason = v_reason
  where id = p_id;

  select u.display_name into v_umpire from public.umpires u where u.id = v_row.umpire_id;
  perform public.log_money('earning_voided', 'Voided ' || v_row.amount_cents || ' cents for ' || coalesce(v_umpire, 'an umpire') || ' (' || v_row.game_date || '): ' || v_reason);
end;
$$;

create or replace function public.add_adjustment(p_umpire_id uuid, p_game_id uuid, p_amount_cents integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
  v_name text;
  v_umpire text;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can add an adjustment.';
  end if;

  select u.display_name into v_umpire from public.umpires u where u.id = p_umpire_id;
  if not found then
    raise exception 'That umpire does not exist.';
  end if;

  if p_game_id is not null and not exists (select 1 from public.games g where g.id = p_game_id) then
    raise exception 'That game does not exist.';
  end if;

  if p_amount_cents is null or p_amount_cents = 0 or p_amount_cents < -100000 or p_amount_cents > 100000 then
    raise exception 'The amount must be a whole number of cents, not zero, between -$1000.00 and $1000.00.';
  end if;

  v_reason := regexp_replace(coalesce(p_reason, ''), '^\s+|\s+$', '', 'g');
  if v_reason = '' or char_length(v_reason) > 200 then
    raise exception 'Give a reason (up to 200 characters).';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  insert into public.earning_adjustments (umpire_id, game_id, amount_cents, reason, created_by, created_by_name)
  values (p_umpire_id, p_game_id, p_amount_cents, v_reason, (select auth.uid()), coalesce(v_name, 'An administrator'))
  returning id into v_id;

  perform public.log_money('adjustment_added', 'Adjustment of ' || p_amount_cents || ' cents for ' || v_umpire || ': ' || v_reason);

  return v_id;
end;
$$;

create or replace function public.void_adjustment(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.earning_adjustments%rowtype;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can void an adjustment.';
  end if;

  select * into v_row from public.earning_adjustments a where a.id = p_id;
  if not found then
    raise exception 'That adjustment does not exist.';
  end if;

  if v_row.voided_at is not null then
    raise exception 'That adjustment is already voided.';
  end if;

  if v_row.payroll_id is not null then
    raise exception 'That adjustment is already in a payroll. Discard the payroll first.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  update public.earning_adjustments set voided_at = now(), voided_by_name = coalesce(v_name, 'An administrator') where id = p_id;

  perform public.log_money('adjustment_voided', 'Voided an adjustment of ' || v_row.amount_cents || ' cents: ' || v_row.reason);
end;
$$;

revoke all on function public.void_earning(uuid, text) from public, anon;
revoke all on function public.add_adjustment(uuid, uuid, integer, text) from public, anon;
revoke all on function public.void_adjustment(uuid) from public, anon;
grant execute on function public.void_earning(uuid, text) to authenticated;
grant execute on function public.add_adjustment(uuid, uuid, integer, text) to authenticated;
grant execute on function public.void_adjustment(uuid) to authenticated;

-- ====================================================================== payroll
-- Works out each umpire's line and each payee's payment for a draft payroll, from
-- whatever is attached to it now and each umpire's CURRENT payee. (Used when the draft
-- is created and again when it is approved, so choosing a payee in between counts.)
create or replace function public.rebuild_payroll_payments(p_payroll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.payroll_payments where payroll_id = p_payroll_id;
  delete from public.payroll_lines where payroll_id = p_payroll_id;

  insert into public.payroll_lines (payroll_id, umpire_id, umpire_name, payee_profile_id, games, earned_cents, adjustments_cents, total_cents)
  select
    p_payroll_id,
    u.id,
    u.display_name,
    public.payee_for_umpire(u.id),
    coalesce(e.games, 0),
    coalesce(e.earned, 0),
    coalesce(a.adjusted, 0),
    coalesce(e.earned, 0) + coalesce(a.adjusted, 0)
  from public.umpires u
  left join (
    select umpire_id, count(*)::integer as games, sum(amount_cents)::integer as earned
    from public.earnings where payroll_id = p_payroll_id and voided_at is null group by umpire_id
  ) e on e.umpire_id = u.id
  left join (
    select umpire_id, sum(amount_cents)::integer as adjusted
    from public.earning_adjustments where payroll_id = p_payroll_id and voided_at is null group by umpire_id
  ) a on a.umpire_id = u.id
  where e.umpire_id is not null or a.umpire_id is not null;

  insert into public.payroll_payments (payroll_id, payee_profile_id, payee_name, amount_cents, umpire_count)
  select
    p_payroll_id,
    l.payee_profile_id,
    coalesce(nullif(btrim(p.display_name), ''), p.email),
    sum(l.total_cents)::integer,
    count(*)::integer
  from public.payroll_lines l
  join public.profiles p on p.id = l.payee_profile_id
  where l.payroll_id = p_payroll_id and l.payee_profile_id is not null
  group by l.payee_profile_id, p.display_name, p.email
  having sum(l.total_cents) > 0;

  update public.payrolls
  set total_cents = (select coalesce(sum(l.total_cents), 0) from public.payroll_lines l where l.payroll_id = p_payroll_id)
  where id = p_payroll_id;
end;
$$;

revoke all on function public.rebuild_payroll_payments(uuid) from public, anon, authenticated;

create or replace function public.create_payroll(p_period_start date, p_period_end date, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_id uuid;
  v_earnings integer;
  v_adjustments integer;
  v_note text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can create a payroll.';
  end if;

  if p_period_start is null or p_period_end is null or p_period_end < p_period_start then
    raise exception 'Choose a start date and an end date (the end cannot be before the start).';
  end if;

  if p_period_end - p_period_start > 400 then
    raise exception 'Choose a period of at most 400 days.';
  end if;

  if exists (select 1 from public.payrolls where status = 'draft') then
    raise exception 'Approve or discard the payroll in progress first.';
  end if;

  v_note := nullif(regexp_replace(coalesce(p_note, ''), '^\s+|\s+$', '', 'g'), '');
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'The note can be at most 200 characters.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  insert into public.payrolls (period_start, period_end, note, created_by, created_by_name)
  values (p_period_start, p_period_end, v_note, (select auth.uid()), coalesce(v_name, 'An administrator'))
  returning id into v_id;

  update public.earnings
  set payroll_id = v_id
  where payroll_id is null and voided_at is null and game_date between p_period_start and p_period_end;
  get diagnostics v_earnings = row_count;

  update public.earning_adjustments
  set payroll_id = v_id
  where payroll_id is null and voided_at is null;
  get diagnostics v_adjustments = row_count;

  if v_earnings + v_adjustments = 0 then
    raise exception 'There is nothing to pay in that period. Work out earnings first.';
  end if;

  perform public.rebuild_payroll_payments(v_id);

  perform public.log_money('payroll_created', 'Created a payroll for ' || p_period_start || ' to ' || p_period_end || ' with ' || v_earnings || ' earnings and ' || v_adjustments || ' adjustments');

  return v_id;
end;
$$;

create or replace function public.discard_payroll(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can discard a payroll.';
  end if;

  select status into v_status from public.payrolls where id = p_id;
  if not found then
    raise exception 'That payroll does not exist.';
  end if;

  if v_status <> 'draft' then
    raise exception 'Only a payroll that has not been approved can be discarded.';
  end if;

  update public.earnings set payroll_id = null where payroll_id = p_id;
  update public.earning_adjustments set payroll_id = null where payroll_id = p_id;
  delete from public.payroll_payments where payroll_id = p_id;
  delete from public.payroll_lines where payroll_id = p_id;
  update public.payrolls set status = 'discarded', total_cents = 0 where id = p_id;

  perform public.log_money('payroll_discarded', 'Discarded a draft payroll');
end;
$$;

create or replace function public.approve_payroll(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_name text;
  v_missing text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can approve a payroll.';
  end if;

  select status into v_status from public.payrolls where id = p_id;
  if not found then
    raise exception 'That payroll does not exist.';
  end if;

  if v_status <> 'draft' then
    raise exception 'Only a draft payroll can be approved.';
  end if;

  -- pick up any payee chosen since the draft was made
  perform public.rebuild_payroll_payments(p_id);

  select string_agg(l.umpire_name, ', ' order by l.umpire_name) into v_missing
  from public.payroll_lines l
  where l.payroll_id = p_id and l.payee_profile_id is null and l.total_cents <> 0;

  if v_missing is not null then
    raise exception 'These umpires have no payee yet: %. Choose a payee for each, then approve again.', v_missing;
  end if;

  select string_agg(coalesce(nullif(btrim(p.display_name), ''), p.email), ', ') into v_missing
  from (
    select l.payee_profile_id from public.payroll_lines l
    where l.payroll_id = p_id and l.payee_profile_id is not null
    group by l.payee_profile_id having sum(l.total_cents) < 0
  ) neg
  join public.profiles p on p.id = neg.payee_profile_id;

  if v_missing is not null then
    raise exception 'The total for % is negative. Correct the adjustments, then approve again.', v_missing;
  end if;

  if not exists (select 1 from public.payroll_payments where payroll_id = p_id) then
    raise exception 'There is nothing to pay in this payroll (every total is zero).';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  update public.payrolls
  set status = 'approved', approved_by = (select auth.uid()), approved_by_name = coalesce(v_name, 'An administrator'), approved_at = now()
  where id = p_id;

  perform public.log_money('payroll_approved', 'Approved a payroll totaling ' || (select total_cents from public.payrolls where id = p_id) || ' cents');
end;
$$;

-- Records that a payee was paid by hand (check, bank transfer, cash or other).
create or replace function public.record_payment(p_payment_id uuid, p_method text, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payroll_payments%rowtype;
  v_status text;
  v_name text;
  v_reference text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can record a payment.';
  end if;

  select * into v_payment from public.payroll_payments where id = p_payment_id;
  if not found then
    raise exception 'That payment does not exist.';
  end if;

  select status into v_status from public.payrolls where id = v_payment.payroll_id;
  if v_status <> 'approved' then
    raise exception 'A payment can only be recorded once the payroll is approved.';
  end if;

  if v_payment.status = 'paid' then
    raise exception 'That payment is already recorded as paid.';
  end if;

  if p_method is null or p_method not in ('check', 'bank_transfer', 'cash', 'other') then
    raise exception 'Choose how it was paid: check, bank transfer, cash or other.';
  end if;

  v_reference := nullif(regexp_replace(coalesce(p_reference, ''), '^\s+|\s+$', '', 'g'), '');
  if v_reference is not null and char_length(v_reference) > 100 then
    raise exception 'The reference can be at most 100 characters.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  update public.payroll_payments
  set status = 'paid', method = p_method, reference = v_reference, paid_at = now(), paid_by_name = coalesce(v_name, 'An administrator')
  where id = p_payment_id;

  if not exists (select 1 from public.payroll_payments where payroll_id = v_payment.payroll_id and status = 'pending') then
    update public.payrolls set status = 'paid' where id = v_payment.payroll_id;
  end if;

  perform public.log_money('payment_recorded', 'Recorded ' || v_payment.amount_cents || ' cents paid to ' || v_payment.payee_name || ' by ' || p_method);
end;
$$;

revoke all on function public.create_payroll(date, date, text) from public, anon;
revoke all on function public.discard_payroll(uuid) from public, anon;
revoke all on function public.approve_payroll(uuid) from public, anon;
revoke all on function public.record_payment(uuid, text, text) from public, anon;
grant execute on function public.create_payroll(date, date, text) to authenticated;
grant execute on function public.discard_payroll(uuid) to authenticated;
grant execute on function public.approve_payroll(uuid) to authenticated;
grant execute on function public.record_payment(uuid, text, text) to authenticated;

-- ============================================================ lists for the screen
-- The Payments screen asks the database for exactly the lists it needs, rather than
-- depending on a treasurer being able to read the umpire directory and everyone's
-- profile. Both are for payments managers only.
create or replace function public.payments_umpire_list()
returns table (
  umpire_id uuid,
  display_name text,
  classification text,
  eligibility_status text,
  has_account boolean,
  payee_id uuid,
  effective_payee_id uuid,
  effective_payee_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can see this list.';
  end if;

  return query
  select
    u.id,
    u.display_name,
    u.classification,
    u.eligibility_status,
    (u.profile_id is not null),
    u.payee_profile_id,
    public.payee_for_umpire(u.id),
    (select coalesce(nullif(btrim(p.display_name), ''), p.email)
     from public.profiles p where p.id = public.payee_for_umpire(u.id))
  from public.umpires u
  order by u.display_name;
end;
$$;

-- approved accounts that could receive pay (parents and guardians first)
create or replace function public.payee_candidates()
returns table (
  profile_id uuid,
  display_name text,
  email text,
  is_parent boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_payments_manager() then
    raise exception 'Only the treasurer and super admins can see this list.';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(btrim(p.display_name), ''), p.email),
    p.email,
    exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role_id = 'parent_guardian')
  from public.profiles p
  where p.account_status = 'approved'
  order by 4 desc, 2
  limit 2000;
end;
$$;

revoke all on function public.payments_umpire_list() from public, anon;
revoke all on function public.payee_candidates() from public, anon;
grant execute on function public.payments_umpire_list() to authenticated;
grant execute on function public.payee_candidates() to authenticated;

commit;
