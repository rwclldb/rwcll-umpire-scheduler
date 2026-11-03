-- Families and youth safeguards (Phase 9, first cut).
--
-- Needs the earnings and payroll migration (20261108100000) applied first.
-- ----------------------------------------------------------------------------
-- WHAT THIS ADDS
--   PARENTS     A person can sign up as a PARENT OR GUARDIAN (with a note saying whose
--               parent they are). A super admin or umpire chief approves them, which gives
--               them the parent_guardian role.
--   LINKS       Only a super admin or umpire chief links a parent to a youth umpire. Nobody
--               can link themselves to a child. An umpire can have up to 4 guardians.
--   CONSENT     Two settings decide the rules (app_settings):
--                 umpire_min_age            nobody younger can be approved (default 13)
--                 parent_consent_below_age  an umpire younger than this cannot be assigned,
--                                           or take a game, until a LINKED parent or
--                                           guardian has given consent (default 13)
--               With the defaults nobody under 13 can be approved at all, so consent never
--               comes up. To allow younger umpires WITH consent, lower the first (for
--               example to 10) and keep the second at 13. To require consent for every
--               youth umpire, set the second to 18.
--               A consent counts only while the parent who gave it is still linked, and
--               it can be withdrawn at any time by that parent or by an administrator.
--   PARENT VIEW A parent sees, read-only, their own children's schedule, earnings and the
--               payments made to them. Nothing about anyone else, and nothing about reports.
--   TURNING 18  convert_to_adult() moves a youth who has turned 18 to an adult umpire:
--               new roles, adult rates, paid to themselves, guardian links ended.
--   LOG         every link, consent and conversion is recorded in family_log.
-- ----------------------------------------------------------------------------

begin;

-- ===================================================================== settings
alter table public.app_settings
  add constraint app_settings_age_rules_valid
  check (
    key not in ('umpire_min_age', 'parent_consent_below_age')
    or case when value ~ '^[0-9]{1,2}$' then value::integer between 5 and 18 else false end
  );

insert into public.app_settings (key, value) values
  ('umpire_min_age', '13'),
  ('parent_consent_below_age', '13');

create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.value::integer from public.app_settings s where s.key = p_key and s.value ~ '^[0-9]{1,2}$'),
    p_default
  );
$$;

create or replace function public.umpire_min_age()
returns integer language sql stable security definer set search_path = ''
as $$ select public.setting_int('umpire_min_age', 13); $$;

create or replace function public.parent_consent_below_age()
returns integer language sql stable security definer set search_path = ''
as $$ select public.setting_int('parent_consent_below_age', 13); $$;

revoke all on function public.setting_int(text, integer) from public, anon, authenticated;

-- ===================================================================== profiles
alter table public.profiles
  add column registration_note text
  check (registration_note is null or char_length(registration_note) <= 200);

-- ===================================================================== tables
create table public.family_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  umpire_id uuid not null references public.umpires(id) on delete cascade,
  relationship text not null check (relationship in ('mother', 'father', 'guardian', 'other')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by_name text,
  constraint family_links_end_consistent check ((ended_at is null) = (ended_by_name is null))
);

create unique index family_links_one_active_idx on public.family_links (parent_id, umpire_id) where ended_at is null;
create index family_links_umpire_idx on public.family_links (umpire_id) where ended_at is null;

create table public.parental_consents (
  id uuid primary key default gen_random_uuid(),
  umpire_id uuid not null references public.umpires(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  given_at timestamptz not null default now(),
  text_version text not null check (char_length(btrim(text_version)) between 1 and 40),
  withdrawn_at timestamptz,
  withdrawn_by_name text,
  constraint parental_consents_withdraw_consistent check ((withdrawn_at is null) = (withdrawn_by_name is null))
);

create unique index parental_consents_one_current_idx on public.parental_consents (umpire_id, parent_id) where withdrawn_at is null;

create table public.family_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  detail text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  acted_at timestamptz not null default now()
);

create index family_log_time_idx on public.family_log (acted_at desc);

-- ============================================================ who is who (helpers)
create or replace function public.is_family_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_approved_user() and (public.has_role('super_admin') or public.has_role('umpire_chief'));
$$;

-- is the signed-in person an approved parent or guardian who is linked to this umpire?
create or replace function public.is_guardian_of(p_umpire_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_approved_user()
     and public.has_role('parent_guardian')
     and exists (
       select 1 from public.family_links l
       where l.umpire_id = p_umpire_id and l.parent_id = (select auth.uid()) and l.ended_at is null
     );
$$;

revoke all on function public.is_family_manager() from public, anon;
revoke all on function public.is_guardian_of(uuid) from public, anon;
grant execute on function public.is_family_manager() to authenticated;
grant execute on function public.is_guardian_of(uuid) to authenticated;

create or replace function public.log_family(p_action text, p_detail text)
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

  insert into public.family_log (action, detail, actor_id, actor_name)
  values (p_action, left(p_detail, 500), (select auth.uid()), coalesce(v_name, 'The system'));
end;
$$;

revoke all on function public.log_family(text, text) from public, anon, authenticated;

-- ============================================================ age and consent rules
-- their age in whole years today (California's date), or null if there is no birth date
create or replace function public.umpire_age(p_umpire_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select extract(year from age((now() at time zone 'America/Los_Angeles')::date, d.birth_date))::integer
  from public.umpire_private_details d
  where d.umpire_id = p_umpire_id and d.birth_date is not null;
$$;

create or replace function public.umpire_needs_consent(p_umpire_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.umpire_age(p_umpire_id) < public.parent_consent_below_age(), false);
$$;

-- a consent counts only while the parent who gave it is still linked, and has not withdrawn it
create or replace function public.umpire_has_consent(p_umpire_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parental_consents c
    join public.family_links l on l.parent_id = c.parent_id and l.umpire_id = c.umpire_id and l.ended_at is null
    where c.umpire_id = p_umpire_id and c.withdrawn_at is null
  );
$$;

create or replace function public.umpire_blocked_by_consent(p_umpire_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.umpire_needs_consent(p_umpire_id) and not public.umpire_has_consent(p_umpire_id);
$$;

revoke all on function public.umpire_age(uuid) from public, anon, authenticated;
revoke all on function public.umpire_needs_consent(uuid) from public, anon, authenticated;
revoke all on function public.umpire_has_consent(uuid) from public, anon, authenticated;
revoke all on function public.umpire_blocked_by_consent(uuid) from public, anon, authenticated;
revoke all on function public.umpire_min_age() from public, anon;
revoke all on function public.parent_consent_below_age() from public, anon;
grant execute on function public.umpire_min_age() to authenticated;
grant execute on function public.parent_consent_below_age() to authenticated;

-- ====================================================================== access
alter table public.family_links enable row level security;
alter table public.parental_consents enable row level security;
alter table public.family_log enable row level security;

revoke all on table public.family_links, public.parental_consents, public.family_log from public, anon, authenticated;
grant select on table public.family_links, public.parental_consents, public.family_log to authenticated;

create policy "Managers read links, and a parent reads their own" on public.family_links
  for select to authenticated using (public.is_family_manager() or parent_id = (select auth.uid()));
create policy "Managers read consents, and a parent reads their own" on public.parental_consents
  for select to authenticated using (public.is_family_manager() or parent_id = (select auth.uid()));
create policy "Managers read the family log" on public.family_log
  for select to authenticated using (public.is_family_manager());

-- ============================================================= approving parents
create or replace function public.approve_parent_registration(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can approve a parent or guardian.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_name
  from public.profiles p
  where p.id = p_profile_id and p.account_status = 'pending' and p.registration_kind = 'parent_guardian';

  if v_name is null then
    raise exception 'That registration was not found, or it was already reviewed.';
  end if;

  update public.profiles
  set account_status = 'approved', approved_by = (select auth.uid()), approved_at = now()
  where id = p_profile_id;

  insert into public.user_roles (user_id, role_id, granted_by)
  values (p_profile_id, 'parent_guardian', (select auth.uid()))
  on conflict do nothing;

  perform public.log_family('parent_approved', 'Approved ' || v_name || ' as a parent or guardian');
end;
$$;

create or replace function public.reject_parent_registration(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can reject a parent or guardian.';
  end if;

  update public.profiles
  set account_status = 'rejected', approved_by = (select auth.uid()), approved_at = null
  where id = p_profile_id and account_status = 'pending' and registration_kind = 'parent_guardian';

  if not found then
    raise exception 'That registration was not found, or it was already reviewed.';
  end if;

  perform public.log_family('parent_rejected', 'Rejected a parent or guardian registration');
end;
$$;

-- ===================================================================== linking
create or replace function public.link_guardian(p_umpire_id uuid, p_parent_id uuid, p_relationship text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire public.umpires%rowtype;
  v_parent text;
  v_name text;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can link a parent or guardian.';
  end if;

  select * into v_umpire from public.umpires u where u.id = p_umpire_id;
  if not found then
    raise exception 'That umpire does not exist.';
  end if;

  if v_umpire.classification <> 'youth' then
    raise exception 'Only a youth umpire can have a parent or guardian linked.';
  end if;

  if p_relationship is null or p_relationship not in ('mother', 'father', 'guardian', 'other') then
    raise exception 'Choose mother, father, guardian or other.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_parent
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id and ur.role_id = 'parent_guardian'
  where p.id = p_parent_id and p.account_status = 'approved';

  if v_parent is null then
    raise exception 'Choose an approved parent or guardian account.';
  end if;

  if v_umpire.profile_id is not distinct from p_parent_id then
    raise exception 'A youth umpire cannot be their own parent or guardian.';
  end if;

  if exists (select 1 from public.family_links l where l.parent_id = p_parent_id and l.umpire_id = p_umpire_id and l.ended_at is null) then
    raise exception 'That parent or guardian is already linked to this umpire.';
  end if;

  if (select count(*) from public.family_links l where l.umpire_id = p_umpire_id and l.ended_at is null) >= 4 then
    raise exception 'An umpire can have at most 4 parents or guardians linked.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  insert into public.family_links (parent_id, umpire_id, relationship, created_by, created_by_name)
  values (p_parent_id, p_umpire_id, p_relationship, (select auth.uid()), coalesce(v_name, 'An administrator'))
  returning id into v_id;

  perform public.log_family('guardian_linked', 'Linked ' || v_parent || ' (' || p_relationship || ') to ' || v_umpire.display_name);

  return v_id;
end;
$$;

create or replace function public.unlink_guardian(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.family_links%rowtype;
  v_name text;
  v_parent text;
  v_umpire text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can unlink a parent or guardian.';
  end if;

  select * into v_link from public.family_links l where l.id = p_link_id and l.ended_at is null;
  if not found then
    raise exception 'That link does not exist, or it has already ended.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = (select auth.uid());

  update public.family_links set ended_at = now(), ended_by_name = coalesce(v_name, 'An administrator') where id = p_link_id;

  -- a consent given by a parent who is no longer linked is withdrawn (so re-linking them later does
  -- not quietly bring it back: they would have to give it again)
  update public.parental_consents
  set withdrawn_at = now(), withdrawn_by_name = coalesce(v_name, 'An administrator')
  where umpire_id = v_link.umpire_id and parent_id = v_link.parent_id and withdrawn_at is null;

  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_parent from public.profiles p where p.id = v_link.parent_id;
  select u.display_name into v_umpire from public.umpires u where u.id = v_link.umpire_id;

  perform public.log_family('guardian_unlinked', 'Unlinked ' || coalesce(v_parent, 'a parent') || ' from ' || coalesce(v_umpire, 'an umpire'));
end;
$$;

-- ===================================================================== consent
create or replace function public.give_consent(p_umpire_id uuid, p_text_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text := btrim(coalesce(p_text_version, ''));
  v_umpire text;
  v_parent text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_guardian_of(p_umpire_id) then
    raise exception 'Only a linked parent or guardian can give consent.';
  end if;

  if not public.umpire_needs_consent(p_umpire_id) then
    raise exception 'This umpire does not need a parent''s consent.';
  end if;

  if v_version = '' or char_length(v_version) > 40 then
    raise exception 'The consent wording is missing.';
  end if;

  if exists (select 1 from public.parental_consents c where c.umpire_id = p_umpire_id and c.parent_id = (select auth.uid()) and c.withdrawn_at is null) then
    return;
  end if;

  insert into public.parental_consents (umpire_id, parent_id, text_version)
  values (p_umpire_id, (select auth.uid()), v_version);

  select u.display_name into v_umpire from public.umpires u where u.id = p_umpire_id;
  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_parent from public.profiles p where p.id = (select auth.uid());
  perform public.log_family('consent_given', coalesce(v_parent, 'A parent') || ' gave consent for ' || coalesce(v_umpire, 'an umpire'));
end;
$$;

create or replace function public.withdraw_consent(p_umpire_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_umpire text;
  v_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'Someone') into v_name
  from public.profiles p where p.id = (select auth.uid());

  if public.is_guardian_of(p_umpire_id) then
    update public.parental_consents
    set withdrawn_at = now(), withdrawn_by_name = coalesce(v_name, 'Someone')
    where umpire_id = p_umpire_id and parent_id = (select auth.uid()) and withdrawn_at is null;
  elsif public.is_family_manager() then
    update public.parental_consents
    set withdrawn_at = now(), withdrawn_by_name = coalesce(v_name, 'Someone')
    where umpire_id = p_umpire_id and withdrawn_at is null;
  else
    raise exception 'Only a linked parent or guardian, or an administrator, can withdraw consent.';
  end if;

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'There is no consent to withdraw.';
  end if;

  select u.display_name into v_umpire from public.umpires u where u.id = p_umpire_id;
  perform public.log_family('consent_withdrawn', coalesce(v_name, 'Someone') || ' withdrew consent for ' || coalesce(v_umpire, 'an umpire'));
end;
$$;

-- ================================================================== turning 18
create or replace function public.convert_to_adult(p_umpire_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire public.umpires%rowtype;
  v_age integer;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can change a youth umpire to an adult.';
  end if;

  select * into v_umpire from public.umpires u where u.id = p_umpire_id;
  if not found then
    raise exception 'That umpire does not exist.';
  end if;

  if v_umpire.classification <> 'youth' then
    raise exception 'That umpire is already an adult.';
  end if;

  v_age := public.umpire_age(p_umpire_id);
  if v_age is null then
    raise exception 'Enter their birth date first, so we can check they are 18.';
  end if;

  if v_age < 18 then
    raise exception 'That umpire is not 18 yet.';
  end if;

  -- pay: an adult is paid to themselves, so any parent payee is cleared
  update public.umpires set classification = 'adult', payee_profile_id = null where id = p_umpire_id;

  if v_umpire.payee_profile_id is not null then
    perform public.log_money('payee_changed', 'Payee for ' || v_umpire.display_name || ' cleared: now an adult, paid to themselves');
  end if;

  update public.family_links
  set ended_at = now(), ended_by_name = coalesce((select nullif(btrim(p.display_name), '') from public.profiles p where p.id = (select auth.uid())), 'An administrator')
  where umpire_id = p_umpire_id and ended_at is null;

  if v_umpire.profile_id is not null then
    delete from public.user_roles where user_id = v_umpire.profile_id and role_id = 'youth_umpire';
    insert into public.user_roles (user_id, role_id, granted_by)
    values (v_umpire.profile_id, 'adult_umpire', (select auth.uid()))
    on conflict do nothing;
  end if;

  perform public.log_family('converted_to_adult', v_umpire.display_name || ' (age ' || v_age || ') is now an adult umpire; guardian links ended');
end;
$$;

-- ============================================================ lists for the screens
-- Every youth umpire, with their age, consent and guardians (for the Families screen).
create or replace function public.families_overview()
returns table (
  umpire_id uuid,
  display_name text,
  eligibility_status text,
  has_account boolean,
  age integer,
  turns_18_on date,
  needs_consent boolean,
  has_consent boolean,
  guardians jsonb
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

  if not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can see this list.';
  end if;

  return query
  select
    u.id,
    u.display_name,
    u.eligibility_status,
    (u.profile_id is not null),
    public.umpire_age(u.id),
    (select (d.birth_date + interval '18 years')::date from public.umpire_private_details d where d.umpire_id = u.id and d.birth_date is not null),
    public.umpire_needs_consent(u.id),
    public.umpire_has_consent(u.id),
    coalesce((
      select jsonb_agg(jsonb_build_object(
               'link_id', l.id,
               'parent_id', l.parent_id,
               'name', coalesce(nullif(btrim(p.display_name), ''), p.email),
               'email', p.email,
               'relationship', l.relationship,
               'consent', exists (select 1 from public.parental_consents c where c.umpire_id = l.umpire_id and c.parent_id = l.parent_id and c.withdrawn_at is null)
             ) order by l.created_at)
      from public.family_links l
      join public.profiles p on p.id = l.parent_id
      where l.umpire_id = u.id and l.ended_at is null
    ), '[]'::jsonb)
  from public.umpires u
  where u.classification = 'youth'
  order by u.display_name;
end;
$$;

-- every approved parent and guardian account, with how many children each is linked to
create or replace function public.parent_accounts()
returns table (
  profile_id uuid,
  display_name text,
  email text,
  registration_note text,
  children integer
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

  if not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can see this list.';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(btrim(p.display_name), ''), p.email),
    p.email,
    p.registration_note,
    (select count(*)::integer from public.family_links l where l.parent_id = p.id and l.ended_at is null)
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id and ur.role_id = 'parent_guardian'
  where p.account_status = 'approved'
  order by 2;
end;
$$;

-- ---------------------------------------------------------------- the parent's view
create or replace function public.my_family()
returns table (
  umpire_id uuid,
  display_name text,
  eligibility_status text,
  age integer,
  needs_consent boolean,
  has_consent boolean,
  i_consented boolean,
  relationship text
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

  if not (public.is_approved_user() and public.has_role('parent_guardian')) then
    raise exception 'This is for approved parents and guardians.';
  end if;

  return query
  select
    u.id,
    u.display_name,
    u.eligibility_status,
    public.umpire_age(u.id),
    public.umpire_needs_consent(u.id),
    public.umpire_has_consent(u.id),
    exists (select 1 from public.parental_consents c where c.umpire_id = u.id and c.parent_id = l.parent_id and c.withdrawn_at is null),
    l.relationship
  from public.family_links l
  join public.umpires u on u.id = l.umpire_id
  where l.parent_id = (select auth.uid()) and l.ended_at is null
  order by u.display_name;
end;
$$;

-- a child's games: the last 60 days and the next 120 (read-only; no gate codes or reports)
create or replace function public.family_schedule(p_umpire_id uuid)
returns table (
  game_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  game_status text,
  division_name text,
  location_name text,
  home_team text,
  away_team text,
  place text,
  assignment_status text,
  attendance text
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

  if not public.is_guardian_of(p_umpire_id) then
    raise exception 'You are not linked to that umpire.';
  end if;

  return query
  select
    g.id,
    g.starts_at,
    g.ends_at,
    g.status,
    d.name,
    loc.name,
    th.name,
    ta.name,
    ga.position,
    ga.status,
    ga.attendance
  from public.game_assignments ga
  join public.games g on g.id = ga.game_id
  left join public.divisions d on d.id = g.division_id
  left join public.locations loc on loc.id = g.location_id
  left join public.teams th on th.id = g.home_team_id
  left join public.teams ta on ta.id = g.away_team_id
  where ga.umpire_id = p_umpire_id
    and g.starts_at between now() - interval '60 days' and now() + interval '120 days'
  order by g.starts_at;
end;
$$;

-- a child's earnings and adjustments, and where each stands (read-only)
create or replace function public.family_earnings(p_umpire_id uuid)
returns table (
  kind text,
  on_date date,
  label text,
  place text,
  amount_cents integer,
  state text
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

  if not public.is_guardian_of(p_umpire_id) then
    raise exception 'You are not linked to that umpire.';
  end if;

  return query
  select * from (
    select
      'earning'::text as kind,
      e.game_date as on_date,
      e.division_name as label,
      e.position as place,
      e.amount_cents,
      case when pr.status is null or pr.status = 'draft' then 'waiting' else pr.status end as state
    from public.earnings e
    left join public.payrolls pr on pr.id = e.payroll_id
    where e.umpire_id = p_umpire_id and e.voided_at is null
    union all
    select
      'adjustment'::text,
      (a.created_at at time zone 'America/Los_Angeles')::date,
      a.reason,
      null::text,
      a.amount_cents,
      case when pr.status is null or pr.status = 'draft' then 'waiting' else pr.status end
    from public.earning_adjustments a
    left join public.payrolls pr on pr.id = a.payroll_id
    where a.umpire_id = p_umpire_id and a.voided_at is null
  ) earned
  order by on_date desc, kind;
end;
$$;

-- the payments made to the signed-in person (a parent paid for their children, or an adult
-- umpire paid to themselves); only approved or paid payrolls, never a draft
create or replace function public.my_payments()
returns table (
  payment_id uuid,
  period_start date,
  period_end date,
  amount_cents integer,
  umpire_count integer,
  status text,
  method text,
  paid_at timestamptz
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

  if not public.is_approved_user() then
    raise exception 'This is for approved accounts.';
  end if;

  return query
  select m.id, pr.period_start, pr.period_end, m.amount_cents, m.umpire_count, m.status, m.method, m.paid_at
  from public.payroll_payments m
  join public.payrolls pr on pr.id = m.payroll_id
  where m.payee_profile_id = (select auth.uid()) and pr.status in ('approved', 'paid')
  order by pr.period_end desc;
end;
$$;

-- ================================================================== permissions
revoke all on function public.approve_parent_registration(uuid) from public, anon;
revoke all on function public.reject_parent_registration(uuid) from public, anon;
revoke all on function public.link_guardian(uuid, uuid, text) from public, anon;
revoke all on function public.unlink_guardian(uuid) from public, anon;
revoke all on function public.give_consent(uuid, text) from public, anon;
revoke all on function public.withdraw_consent(uuid) from public, anon;
revoke all on function public.convert_to_adult(uuid) from public, anon;
revoke all on function public.families_overview() from public, anon;
revoke all on function public.parent_accounts() from public, anon;
revoke all on function public.my_family() from public, anon;
revoke all on function public.family_schedule(uuid) from public, anon;
revoke all on function public.family_earnings(uuid) from public, anon;
revoke all on function public.my_payments() from public, anon;
grant execute on function public.approve_parent_registration(uuid) to authenticated;
grant execute on function public.reject_parent_registration(uuid) to authenticated;
grant execute on function public.link_guardian(uuid, uuid, text) to authenticated;
grant execute on function public.unlink_guardian(uuid) to authenticated;
grant execute on function public.give_consent(uuid, text) to authenticated;
grant execute on function public.withdraw_consent(uuid) to authenticated;
grant execute on function public.convert_to_adult(uuid) to authenticated;
grant execute on function public.families_overview() to authenticated;
grant execute on function public.parent_accounts() to authenticated;
grant execute on function public.my_family() to authenticated;
grant execute on function public.family_schedule(uuid) to authenticated;
grant execute on function public.family_earnings(uuid) to authenticated;
grant execute on function public.my_payments() to authenticated;

-- ===================================================== the rules in existing functions
-- (the same functions as before, with one change each: the minimum age is a setting; an
-- umpire who needs a parent's consent and does not have it cannot be assigned or take a
-- game; a parent or guardian can sign up)
create or replace function public.approve_umpire_registration(
  p_profile_id uuid,
  p_classification text,
  p_birth_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_age integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_approved_user()
     or not (public.has_role('super_admin') or public.has_role('umpire_chief')) then
    raise exception 'Only a super admin or umpire chief can approve umpire registrations.';
  end if;

  if p_classification not in ('youth', 'adult') then
    raise exception 'Choose youth or adult.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_profile_id
      and p.account_status = 'pending'
      and p.registration_kind in ('youth_umpire', 'adult_umpire')
  ) then
    raise exception 'That registration was not found, or it was already reviewed.';
  end if;

  select u.id into v_umpire
  from public.umpires u
  where u.profile_id = p_profile_id;

  if v_umpire is null then
    raise exception 'That person has not finished registering yet.';
  end if;

  if p_birth_date is null then
    if p_classification = 'youth' then
      raise exception 'Enter a birth date to approve a youth umpire.';
    end if;
  else
    if p_birth_date > current_date then
      raise exception 'The birth date cannot be in the future.';
    end if;

    v_age := extract(year from age(current_date, p_birth_date))::integer;

    if v_age < public.umpire_min_age() then
      raise exception 'Umpires must be at least % years old.', public.umpire_min_age();
    end if;
    if p_classification = 'adult' and v_age < 18 then
      raise exception 'This person is under 18, so they cannot be approved as an adult umpire.';
    end if;
    if p_classification = 'youth' and v_age >= 18 then
      raise exception 'This person is 18 or older, so approve them as an adult umpire.';
    end if;
  end if;

  update public.profiles
  set account_status = 'approved',
      approved_by = (select auth.uid()),
      approved_at = now()
  where id = p_profile_id;

  update public.umpires
  set classification = p_classification,
      eligibility_status = 'active'
  where id = v_umpire;

  if p_birth_date is not null then
    insert into public.umpire_private_details (umpire_id, birth_date)
    values (v_umpire, p_birth_date)
    on conflict (umpire_id) do update set birth_date = excluded.birth_date;
  end if;

  insert into public.user_roles (user_id, role_id, granted_by)
  values (
    p_profile_id,
    case when p_classification = 'youth' then 'youth_umpire' else 'adult_umpire' end,
    (select auth.uid())
  )
  on conflict do nothing;
end;
$$;

create or replace function public.validate_game_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_eligibility text;
  v_problem text;
begin
  if not public.is_scheduling_admin() then
    return new;
  end if;

  -- Only check when a game or umpire is being put in: editing the notes of an
  -- old assignment must keep working.
  if tg_op = 'UPDATE'
     and new.game_id = old.game_id
     and new.umpire_id = old.umpire_id then
    return new;
  end if;

  select status into v_status from public.games where id = new.game_id;
  if v_status = 'canceled' then
    raise exception 'Umpires cannot be assigned to a canceled game.';
  end if;

  select eligibility_status into v_eligibility
  from public.umpires where id = new.umpire_id;
  if v_eligibility is not null and v_eligibility <> 'active' then
    raise exception 'That umpire is not active, so cannot be assigned to a game.';
  end if;

  if public.umpire_blocked_by_consent(new.umpire_id) then
    raise exception 'That umpire is under % and needs a parent or guardian''s consent before they can be assigned.', public.parent_consent_below_age();
  end if;

  select c.problem into v_problem
  from public.umpire_game_check(new.umpire_id, new.game_id) c;
  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  if tg_op = 'INSERT' and new.assigned_by is null then
    new.assigned_by := (select auth.uid());
  end if;

  return new;
end;
$$;

create or replace function public.self_assign(p_game_id uuid, p_place text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_game public.games%rowtype;
  v_division public.divisions%rowtype;
  v_max smallint;
  v_upcoming integer;
  v_problem text;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to take a game.';
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.eligibility_status = 'active'
  ) then
    raise exception 'Only active umpires can take games.';
  end if;

  if public.umpire_blocked_by_consent(v_umpire) then
    raise exception 'You need a parent or guardian''s consent before you can take games.';
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.can_self_assign
  ) then
    raise exception 'An administrator has turned off taking games for yourself for you. Please contact them.';
  end if;

  -- One person at a time per game, so two umpires cannot take the same place.
  select * into v_game from public.games where id = p_game_id for update;
  if not found then
    raise exception 'That game was not found.';
  end if;

  if v_game.status not in ('draft', 'scheduled') then
    raise exception 'That game is not open for assigning.';
  end if;

  if v_game.starts_at <= now() then
    raise exception 'That game has already started.';
  end if;

  select * into v_division from public.divisions where id = v_game.division_id;
  if not v_division.allow_self_assign then
    raise exception 'Umpires cannot assign themselves to games in this division.';
  end if;

  if exists (
    select 1 from public.game_assignments ga
    where ga.game_id = p_game_id and ga.umpire_id = v_umpire
  ) then
    raise exception 'You are already assigned to that game.';
  end if;

  if p_place is null or not (p_place = any (public.game_open_places(p_game_id))) then
    raise exception 'That place is not open (it may have just been taken).';
  end if;

  if exists (
    select 1
    from public.game_assignments me
    join public.games og on og.id = me.game_id
    where me.umpire_id = v_umpire
      and og.id <> v_game.id
      and og.status <> 'canceled'
      and og.starts_at < v_game.ends_at
      and og.ends_at > v_game.starts_at
  ) then
    raise exception 'You already have a game at that time.';
  end if;

  select lg.self_assign_max_games into v_max
  from public.leagues lg
  where lg.id = v_division.league_id;

  if v_max is not null then
    select count(*) into v_upcoming
    from public.game_assignments me
    join public.games og on og.id = me.game_id
    where me.umpire_id = v_umpire
      and og.status <> 'canceled'
      and og.ends_at > now();

    if v_upcoming >= v_max then
      raise exception 'You already have the most games you can take for yourself (%). Decline one first, or ask an administrator.', v_max;
    end if;
  end if;

  select c.problem into v_problem
  from public.umpire_game_check_internal(v_umpire, p_game_id) c;

  if v_problem is not null then
    raise exception '%', v_problem;
  end if;

  insert into public.game_assignments
    (game_id, umpire_id, position, status, self_assigned, confirmed_at, assigned_by)
  values
    (p_game_id, v_umpire, p_place, 'confirmed', true, now(), (select auth.uid()));

  insert into public.game_assignment_events (game_id, umpire_id, position, event, actor_id, note)
  values (p_game_id, v_umpire, p_place, 'assigned', (select auth.uid()), 'assigned themselves');

  -- Tell the administrators. When the game is close (within 48 hours) they are
  -- told straight away; otherwise it goes in the daily summary
  -- (queue_self_assign_digest), so it is marked as not yet told about.
  if v_game.starts_at <= now() + interval '48 hours' then
    select display_name into v_name from public.umpires where id = v_umpire;

    update public.game_assignments
    set self_assign_notified_at = now()
    where game_id = p_game_id and umpire_id = v_umpire;

    perform public.notice_admins(
      'assignment',
      'Umpire took a game within 48 hours: ' || coalesce(v_name, 'An umpire'),
      coalesce(v_name, 'An umpire') || ' has taken the ' || public.position_phrase(p_place)
        || ' place for ' || public.game_summary_text(p_game_id) || E'.\n\n'
        || 'The game is within 48 hours, so you are told straight away. '
        || 'Games further ahead are in a daily summary.'
    );
  end if;
end;
$$;

create or replace function public.self_assign_options(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns table (game_id uuid, place text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_upcoming integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    return;
  end if;

  if not exists (
    select 1 from public.umpires u
    where u.id = v_umpire and u.eligibility_status = 'active' and u.can_self_assign
      and not public.umpire_blocked_by_consent(u.id)
  ) then
    return;
  end if;

  -- Games still to come that this umpire already has (played and canceled ones do not count).
  select count(*) into v_upcoming
  from public.game_assignments me
  join public.games og on og.id = me.game_id
  where me.umpire_id = v_umpire
    and og.status <> 'canceled'
    and og.ends_at > now();

  return query
  select g.id, o.place
  from public.games g
  join public.divisions d on d.id = g.division_id
  join public.leagues lg on lg.id = d.league_id
  cross join lateral unnest(public.game_open_places(g.id)) as o(place)
  where d.allow_self_assign
    and g.status in ('draft', 'scheduled')
    and g.starts_at > now()
    and (p_from is null or g.starts_at >= p_from)
    and (p_to is null or g.starts_at < p_to)
    and (lg.self_assign_max_games is null or v_upcoming < lg.self_assign_max_games)
    and not exists (
      select 1 from public.game_assignments me
      where me.game_id = g.id and me.umpire_id = v_umpire
    )
    and not exists (
      select 1
      from public.game_assignments me
      join public.games og on og.id = me.game_id
      where me.umpire_id = v_umpire
        and og.id <> g.id
        and og.status <> 'canceled'
        and og.starts_at < g.ends_at
        and og.ends_at > g.starts_at
    )
    and not exists (
      select 1
      from public.umpire_game_check_internal(v_umpire, g.id) c
      where c.problem is not null
    )
  order by g.starts_at, g.id, o.place
  limit 500;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := new.raw_user_meta_data ->> 'signup_kind';
  v_note text;
begin
  -- a parent or guardian can say whose parent they are (kept so an administrator can link them)
  if v_kind = 'parent_guardian' then
    v_note := nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'registration_note', '')), 200), '');
  end if;

  insert into public.profiles (id, display_name, email, registration_kind, registration_note)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.email, ''),
    case when v_kind in ('youth_umpire', 'adult_umpire', 'parent_guardian') then v_kind else null end,
    v_note
  );
  return new;
end;
$$;

commit;
