-- Umpire registration and invitations.
--
-- Two ways for an umpire to get into the system:
--
--   1. SELF-REGISTRATION. The person signs up and says whether they are a
--      youth or adult umpire. After they confirm their email and sign in, a
--      pending umpire record is created for them (inactive). A super admin or
--      umpire chief reviews it and approves (or rejects) in one step.
--
--   2. INVITATION. An administrator creates the umpire record and invites the
--      person's email address. When that person registers and confirms the
--      email, they are linked, approved and activated automatically, because
--      the administrator vouched for them. Invitations expire after 30 days
--      and can be revoked or renewed.
--
-- Safety properties (all enforced here, in the database):
--   * The sign-up choice is only a REQUEST. It never grants a role.
--   * Nothing happens for an account whose email is not confirmed.
--   * Only a super admin or umpire chief can approve or reject registrations.
--   * Approval enforces the age rules (youth needs a birth date, under 13 is
--     not approved here, adult must be 18 or older, youth must be under 18).
--
-- IMPORTANT: keep "Confirm email" switched ON in the live Supabase project.
-- Invitations rely on the email being confirmed to prove who owns it.

begin;

-- 1. What the person said they were signing up as ---------------------------
alter table public.profiles
  add column if not exists registration_kind text;

alter table public.profiles
  add constraint profiles_registration_kind_valid
  check (
    registration_kind is null
    or registration_kind in ('youth_umpire', 'adult_umpire', 'parent_guardian')
  );

-- The sign-up form sends the choice as metadata. Only known umpire values
-- are kept; anything else (for example a made-up "super_admin") is ignored.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := new.raw_user_meta_data ->> 'signup_kind';
begin
  insert into public.profiles (id, display_name, email, registration_kind)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.email, ''),
    case when v_kind in ('youth_umpire', 'adult_umpire') then v_kind else null end
  );
  return new;
end;
$$;

-- 2. Invitations --------------------------------------------------------------
create table public.umpire_invitations (
  id uuid primary key default gen_random_uuid(),
  umpire_id uuid not null
    references public.umpires(id) on delete cascade,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,

  constraint umpire_invitations_email_valid
    check (
      email = lower(btrim(email))
      and char_length(email) <= 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
);

-- One open invitation per email address and per umpire record.
create unique index umpire_invitations_one_pending_per_email
  on public.umpire_invitations (email)
  where status = 'pending';

create unique index umpire_invitations_one_pending_per_umpire
  on public.umpire_invitations (umpire_id)
  where status = 'pending';

alter table public.umpire_invitations enable row level security;

-- Administrators can read invitations. All changes go through the functions
-- below, so there are deliberately no insert/update/delete policies.
create policy "Scheduling admins read invitations"
on public.umpire_invitations
for select to authenticated
using (public.is_scheduling_admin());

revoke all on table public.umpire_invitations from public, anon, authenticated;
grant select on table public.umpire_invitations to authenticated;

-- 3. Functions ----------------------------------------------------------------

-- Called by the app when someone signs in. Idempotent. Returns:
--   'unconfirmed'  the email is not confirmed yet: nothing done
--   'already'      already linked to an umpire record: nothing to do
--   'blocked'      the account was rejected or suspended: nothing done
--   'invited'      a valid invitation was found: linked, approved, activated
--   'registered'   a pending umpire record was created for review
--   'none'         nothing applies
create or replace function public.claim_registration()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_confirmed timestamptz;
  v_profile public.profiles%rowtype;
  v_inv public.umpire_invitations%rowtype;
  v_class text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select u.email, u.email_confirmed_at
  into v_email, v_confirmed
  from auth.users u
  where u.id = v_uid;

  if v_email is null or v_confirmed is null then
    return 'unconfirmed';
  end if;

  select * into v_profile from public.profiles p where p.id = v_uid;
  if not found then
    return 'none';
  end if;

  if exists (select 1 from public.umpires u where u.profile_id = v_uid) then
    return 'already';
  end if;

  if v_profile.account_status in ('rejected', 'suspended') then
    return 'blocked';
  end if;

  -- 1. An invitation for this (confirmed) email address.
  select i.* into v_inv
  from public.umpire_invitations i
  join public.umpires u on u.id = i.umpire_id
  where i.status = 'pending'
    and i.expires_at > now()
    and i.email = lower(v_email)
    and u.profile_id is null
  order by i.created_at desc
  limit 1;

  if found then
    update public.umpires set profile_id = v_uid where id = v_inv.umpire_id;

    if v_profile.account_status = 'pending' then
      update public.profiles
      set account_status = 'approved',
          approved_by = v_inv.invited_by,
          approved_at = now()
      where id = v_uid;
    end if;

    select u.classification into v_class
    from public.umpires u where u.id = v_inv.umpire_id;

    insert into public.user_roles (user_id, role_id, granted_by)
    values (
      v_uid,
      case when v_class = 'youth' then 'youth_umpire' else 'adult_umpire' end,
      v_inv.invited_by
    )
    on conflict do nothing;

    update public.umpire_invitations
    set status = 'accepted', accepted_at = now(), accepted_by = v_uid
    where id = v_inv.id;

    return 'invited';
  end if;

  -- 2. A self-registration: create a pending record for review.
  if v_profile.registration_kind in ('youth_umpire', 'adult_umpire')
     and v_profile.account_status = 'pending' then
    insert into public.umpires
      (profile_id, display_name, classification, eligibility_status)
    values (
      v_uid,
      coalesce(nullif(btrim(v_profile.display_name), ''), 'New umpire'),
      case when v_profile.registration_kind = 'youth_umpire' then 'youth' else 'adult' end,
      'inactive'
    );
    return 'registered';
  end if;

  return 'none';
end;
$$;

-- Approve a self-registered umpire in one step.
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

    if v_age < 13 then
      raise exception 'Umpires under 13 cannot be approved this way. They need a parent account and consent first.';
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

create or replace function public.reject_umpire_registration(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_approved_user()
     or not (public.has_role('super_admin') or public.has_role('umpire_chief')) then
    raise exception 'Only a super admin or umpire chief can reject umpire registrations.';
  end if;

  update public.profiles
  set account_status = 'rejected',
      approved_by = (select auth.uid()),
      approved_at = null
  where id = p_profile_id
    and account_status = 'pending'
    and registration_kind in ('youth_umpire', 'adult_umpire');

  if not found then
    raise exception 'That registration was not found, or it was already reviewed.';
  end if;
end;
$$;

-- Invite a person to register as an existing (unlinked) umpire record.
create or replace function public.invite_umpire(p_umpire_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can invite umpires.';
  end if;

  if char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  if not exists (select 1 from public.umpires u where u.id = p_umpire_id) then
    raise exception 'That umpire record was not found.';
  end if;

  if exists (
    select 1 from public.umpires u
    where u.id = p_umpire_id and u.profile_id is not null
  ) then
    raise exception 'This umpire is already linked to an account.';
  end if;

  if exists (select 1 from public.profiles p where lower(p.email) = v_email) then
    raise exception 'An account already uses this email. Use "Link account" instead.';
  end if;

  -- A new invitation replaces any open one for this umpire or this email.
  update public.umpire_invitations
  set status = 'revoked'
  where status = 'pending'
    and (umpire_id = p_umpire_id or email = v_email);

  insert into public.umpire_invitations (umpire_id, email, invited_by)
  values (p_umpire_id, v_email, (select auth.uid()))
  returning id into v_id;

  insert into public.umpire_private_details (umpire_id, email)
  values (p_umpire_id, v_email)
  on conflict (umpire_id) do update set email = excluded.email;

  return v_id;
end;
$$;

create or replace function public.revoke_umpire_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can revoke invitations.';
  end if;

  update public.umpire_invitations
  set status = 'revoked'
  where id = p_invitation_id and status = 'pending';

  if not found then
    raise exception 'That invitation was not found or is no longer open.';
  end if;
end;
$$;

create or replace function public.renew_umpire_invitation(p_invitation_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can renew invitations.';
  end if;

  update public.umpire_invitations
  set expires_at = now() + interval '30 days'
  where id = p_invitation_id and status = 'pending'
  returning expires_at into v_expires;

  if v_expires is null then
    raise exception 'That invitation was not found or is no longer open.';
  end if;

  return v_expires;
end;
$$;

-- Signed-in users may call these; each one checks who is calling.
revoke all on function public.claim_registration() from public, anon;
revoke all on function public.approve_umpire_registration(uuid, text, date) from public, anon;
revoke all on function public.reject_umpire_registration(uuid) from public, anon;
revoke all on function public.invite_umpire(uuid, text) from public, anon;
revoke all on function public.revoke_umpire_invitation(uuid) from public, anon;
revoke all on function public.renew_umpire_invitation(uuid) from public, anon;

grant execute on function public.claim_registration() to authenticated;
grant execute on function public.approve_umpire_registration(uuid, text, date) to authenticated;
grant execute on function public.reject_umpire_registration(uuid) to authenticated;
grant execute on function public.invite_umpire(uuid, text) to authenticated;
grant execute on function public.revoke_umpire_invitation(uuid) to authenticated;
grant execute on function public.renew_umpire_invitation(uuid) to authenticated;

commit;
