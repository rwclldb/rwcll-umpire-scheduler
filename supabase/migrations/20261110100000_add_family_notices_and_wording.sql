-- Families, part 2: younger umpires with consent, editable consent wording, parents copied on
-- notices, and turning 18 happening by itself.
--
-- Needs 20261109100000 and 20261109110000 (families) and the email sending migration (20261106100000).
-- ----------------------------------------------------------------------------
-- WHAT THIS CHANGES
--   YOUNGER UMPIRES  umpire_min_age becomes 10 (it was 13). Umpires younger than 13 can now be
--                    approved, but cannot be assigned or take a game until a LINKED parent or
--                    guardian has given consent. Change it any time:
--                      update public.app_settings set value = '12' where key = 'umpire_min_age';
--   UNKNOWN AGE      While the minimum age is below 13, a youth umpire whose birth date is not
--                    entered counts as needing consent (we cannot show they are old enough).
--                    With a minimum of 13 or more, nothing changes for them.
--   CONSENT WORDING  Stored in the database, so a super admin can edit it (Families screen) with no
--                    programmer. It starts as a SAMPLE containing [[placeholders]]; while it still
--                    has any [[ ]], the database REFUSES to record consent, so nobody can consent
--                    to unfinished wording. Each consent records which version was shown.
--   PARENT COPIES    Every message sent to a youth umpire (assignments, changes, rainouts, running
--                    late, reminders) is also sent to their linked parents and guardians, marked
--                    "Copy for <name>". It is sent even if the umpire has no email of their own.
--   TURNING 18       convert_turned_18() changes every youth umpire who has turned 18 into an adult
--                    umpire. It is meant to run by itself every day (see schedule_family_jobs.sql)
--                    and can be run by hand from the Families screen. The parents are told they
--                    will no longer be copied; the new adult is told to set up their own payment
--                    account; the administrators are told who was changed.
--   WITHDRAWN        When consent is withdrawn, the administrators are told.
-- ----------------------------------------------------------------------------

begin;

-- ============================================================== younger umpires
update public.app_settings set value = '10' where key = 'umpire_min_age';

-- an umpire whose age is unknown (no birth date) is treated as needing consent while the league
-- allows umpires younger than 13 (otherwise they could skip the rule by leaving the date blank)
create or replace function public.umpire_needs_consent(p_umpire_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.umpire_age(p_umpire_id) < public.parent_consent_below_age(),
    public.umpire_min_age() < 13
      and exists (select 1 from public.umpires u where u.id = p_umpire_id and u.classification = 'youth')
  );
$$;

revoke all on function public.umpire_needs_consent(uuid) from public, anon, authenticated;

-- ============================================================== consent wording
create table public.consent_wordings (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  version text not null unique check (char_length(version) between 1 and 40),
  body text not null check (char_length(body) between 50 and 4000),
  is_sample boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now()
);

alter table public.consent_wordings enable row level security;
revoke all on table public.consent_wordings from public, anon, authenticated;
grant select on table public.consent_wordings to authenticated;

create policy "Managers read every version of the consent wording"
on public.consent_wordings for select to authenticated
using (public.is_family_manager());

insert into public.consent_wordings (version, body, is_sample, created_by_name) values (
  '2026-11-sample',
  E'SAMPLE WORDING: the league must replace this text before it is used. Replace everything in double square brackets, then save it on the Families screen.\n\n'
  || E'I am the parent or legal guardian of {child}. I give permission for {child} to umpire games for [[LEAGUE LEGAL NAME]] (the league).\n\n'
  || E'I understand and agree that:\n'
  || E'1. {child} will umpire only the games they are assigned to, and will follow the league''s umpire rules and code of conduct.\n'
  || E'2. [[Describe the supervision, for example: an adult umpire or a league representative is present at the field.]]\n'
  || E'3. The contact information the league holds for me and for {child} is correct, and I will tell the league if it changes. In an emergency the league may contact me at the number on file.\n'
  || E'4. The league will copy me on messages sent to {child} about their games (assignments, schedule changes, cancellations and reminders), using the email address of my account.\n'
  || E'5. Any payment for {child}''s work will be made to me, to the payment account I set up for this purpose, until {child} turns 18. When {child} turns 18 they become an adult umpire and are paid directly, and I will no longer be copied on their messages or see their information.\n'
  || E'6. [[Add anything your league''s insurance, safeguarding or child-safety policy requires, and the name and contact details of the league''s safety officer.]]\n\n'
  || E'I understand that I can withdraw this permission at any time on the "My family" page. {child} will not be assigned to games while permission is withdrawn.',
  true,
  'Sample wording'
);

-- the wording parents see now (everyone approved can read it; the child's name goes where {child} is)
create or replace function public.current_consent_wording()
returns table (
  version text,
  body text,
  is_sample boolean
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
  select w.version, w.body, w.is_sample
  from public.consent_wordings w
  order by w.seq desc
  limit 1;
end;
$$;

-- a super admin saves new wording (a new version; old versions are kept)
create or replace function public.set_consent_wording(p_body text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');
  v_name text;
  v_prefix text := to_char(now() at time zone 'America/Los_Angeles', 'YYYY-MM-DD');
  v_version text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not (public.is_approved_user() and public.has_role('super_admin')) then
    raise exception 'Only a super admin can change the consent wording.';
  end if;

  if char_length(v_body) < 50 or char_length(v_body) > 4000 then
    raise exception 'The wording must be between 50 and 4000 characters.';
  end if;

  if strpos(v_body, '{child}') = 0 then
    raise exception 'The wording must include {child} where the child''s name should appear.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'A super admin') into v_name
  from public.profiles p where p.id = (select auth.uid());

  v_version := v_prefix || '-' || ((select count(*) from public.consent_wordings w where w.version like v_prefix || '-%') + 1);

  insert into public.consent_wordings (version, body, is_sample, created_by, created_by_name)
  values (v_version, v_body, strpos(v_body, '[[') > 0, (select auth.uid()), coalesce(v_name, 'A super admin'));

  perform public.log_family('consent_wording_changed', 'Consent wording saved as version ' || v_version
    || case when strpos(v_body, '[[') > 0 then ' (it still has [[placeholders]], so consent cannot be given yet)' else '' end);

  return v_version;
end;
$$;

revoke all on function public.current_consent_wording() from public, anon;
revoke all on function public.set_consent_wording(text) from public, anon;
grant execute on function public.current_consent_wording() to authenticated;
grant execute on function public.set_consent_wording(text) to authenticated;

-- giving consent now checks the wording: it must be finished, and it must be the version the parent read
create or replace function public.give_consent(p_umpire_id uuid, p_text_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version text := btrim(coalesce(p_text_version, ''));
  v_current text;
  v_sample boolean;
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

  select w.version, w.is_sample into v_current, v_sample
  from public.consent_wordings w
  order by w.seq desc
  limit 1;

  if v_sample then
    raise exception 'The league has not finished the consent wording yet, so consent cannot be given. Please ask the league.';
  end if;

  if v_version <> v_current then
    raise exception 'The consent wording has changed. Please reload the page and read it again.';
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

-- withdrawing consent now tells the administrators
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

  perform public.notice_admins(
    'other',
    'Consent withdrawn for ' || coalesce(v_umpire, 'an umpire'),
    coalesce(v_name, 'Someone') || ' withdrew consent for ' || coalesce(v_umpire, 'an umpire') || '.'
      || E'\n\n' || coalesce(v_umpire, 'They') || ' cannot be assigned to games until consent is given again. Games they are already assigned to are not changed, so please review them.'
  );
end;
$$;

-- ============================================================ parents copied on notices
-- Every message to an umpire goes through this. A youth umpire's linked parents and guardians get a
-- copy too (marked "Copy for <name>"), even if the umpire has no email of their own.
create or replace function public.notice_umpire(
  p_umpire_id uuid,
  p_kind text,
  p_subject text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_to text := public.umpire_notice_email(p_umpire_id);
  v_name text;
  r record;
begin
  perform public.queue_notice(
    p_kind,
    v_to,
    (select u.profile_id from public.umpires u where u.id = p_umpire_id),
    p_subject,
    p_body
  );

  select u.display_name into v_name from public.umpires u where u.id = p_umpire_id;

  for r in
    select distinct p.id as profile_id, lower(btrim(p.email)) as email
    from public.family_links l
    join public.profiles p on p.id = l.parent_id
    join public.user_roles ur on ur.user_id = p.id and ur.role_id = 'parent_guardian'
    where l.umpire_id = p_umpire_id
      and l.ended_at is null
      and p.account_status = 'approved'
      and btrim(coalesce(p.email, '')) <> ''
  loop
    if r.email is distinct from lower(btrim(coalesce(v_to, ''))) then
      perform public.queue_notice(
        p_kind,
        r.email,
        r.profile_id,
        'Copy for ' || coalesce(v_name, 'your child') || ': ' || p_subject,
        'This is a copy of a message sent to ' || coalesce(v_name, 'your child') || '.' || E'\n\n' || p_body
      );
    end if;
  end loop;
end;
$$;

-- ================================================================== turning 18
-- The work of changing one youth umpire into an adult, and telling everyone. No checks here: the two
-- functions below decide whether to call it.
create or replace function public.do_convert_to_adult(p_umpire_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire public.umpires%rowtype;
  v_age integer;
  v_actor text;
  v_parents jsonb;
  v_app text;
  v_link text := '';
  r record;
begin
  select * into v_umpire from public.umpires u where u.id = p_umpire_id;
  v_age := public.umpire_age(p_umpire_id);

  v_actor := coalesce(
    (select nullif(btrim(p.display_name), '') from public.profiles p where p.id = (select auth.uid())),
    'The system'
  );

  -- who to tell, found BEFORE the links end
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'email', p.email)), '[]'::jsonb) into v_parents
  from public.family_links l
  join public.profiles p on p.id = l.parent_id
  where l.umpire_id = p_umpire_id and l.ended_at is null and p.account_status = 'approved' and btrim(coalesce(p.email, '')) <> '';

  -- pay: an adult is paid to themselves, so any parent payee is cleared
  update public.umpires set classification = 'adult', payee_profile_id = null where id = p_umpire_id;

  if v_umpire.payee_profile_id is not null then
    perform public.log_money('payee_changed', 'Payee for ' || v_umpire.display_name || ' cleared: now an adult, paid to themselves');
  end if;

  update public.family_links
  set ended_at = now(), ended_by_name = v_actor
  where umpire_id = p_umpire_id and ended_at is null;

  if v_umpire.profile_id is not null then
    delete from public.user_roles where user_id = v_umpire.profile_id and role_id = 'youth_umpire';
    insert into public.user_roles (user_id, role_id, granted_by)
    values (v_umpire.profile_id, 'adult_umpire', (select auth.uid()))
    on conflict do nothing;
  end if;

  perform public.log_family('converted_to_adult', v_umpire.display_name || ' (age ' || coalesce(v_age::text, '?') || ') is now an adult umpire; guardian links ended');

  select s.value into v_app from public.sending_settings s where s.key = 'app_url';
  if coalesce(btrim(v_app), '') <> '' then
    v_link := E'\n\n' || btrim(v_app);
  end if;

  -- the parents: they will no longer be copied
  for r in select (e ->> 'id')::uuid as profile_id, e ->> 'email' as email from jsonb_array_elements(v_parents) e
  loop
    perform public.queue_notice(
      'other',
      r.email,
      r.profile_id,
      v_umpire.display_name || ' is now an adult umpire',
      v_umpire.display_name || ' has turned 18 and is now an adult umpire.' || E'\n\n'
        || 'From now on you will no longer be copied on their messages, and you will no longer see their games, earnings or payments in the app. Payments for their work will be made to them directly.' || E'\n\n'
        || 'Thank you for supporting them as a parent or guardian.'
    );
  end loop;

  -- the new adult: set up their own payment account
  perform public.notice_umpire(
    p_umpire_id,
    'other',
    'You are now an adult umpire: please set up your payment account',
    'You have turned 18, so you are now an adult umpire.' || E'\n\n'
      || 'What changes: your parents or guardians will no longer be copied on your messages, and payments for your games will now be made to YOU directly instead of to a parent.' || E'\n\n'
      || 'To be paid you need to set up your own payment account (we use Stripe). Please sign in and look for "Set up payments". If you do not see it yet, the league will tell you when it is ready.'
      || v_link
  );
end;
$$;

revoke all on function public.do_convert_to_adult(uuid) from public, anon, authenticated;

-- an administrator changes a youth umpire who has turned 18 (the Families screen)
create or replace function public.convert_to_adult(p_umpire_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire public.umpires%rowtype;
  v_age integer;
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

  perform public.do_convert_to_adult(p_umpire_id);
end;
$$;

-- every youth umpire who has turned 18 becomes an adult umpire. Run by the database's own schedule
-- (nobody signed in) every day, or by an administrator. Returns how many were changed.
create or replace function public.convert_turned_18()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer := 0;
  v_names text := '';
  r record;
begin
  if v_uid is not null and not public.is_family_manager() then
    raise exception 'Only a super admin or umpire chief can run this.';
  end if;

  for r in
    select u.id, u.display_name
    from public.umpires u
    where u.classification = 'youth' and public.umpire_age(u.id) >= 18
    order by u.display_name
  loop
    begin
      perform public.do_convert_to_adult(r.id);
      v_count := v_count + 1;
      v_names := v_names || E'\n- ' || r.display_name;
    exception when others then
      perform public.log_family('convert_failed', 'Could not change ' || r.display_name || ' to an adult: ' || sqlerrm);
    end;
  end loop;

  if v_count > 0 then
    perform public.notice_admins(
      'other',
      v_count || ' umpire' || case when v_count = 1 then '' else 's' end || ' turned 18 and became adult umpires',
      'These umpires turned 18 and were changed to adult umpires:' || v_names || E'\n\n'
        || 'Their parents were told they will no longer be copied, and each new adult was asked to set up their own payment account.'
    );
  end if;

  return v_count;
end;
$$;

revoke all on function public.convert_to_adult(uuid) from public, anon;
revoke all on function public.convert_turned_18() from public, anon;
grant execute on function public.convert_to_adult(uuid) to authenticated;
grant execute on function public.convert_turned_18() to authenticated;

commit;
