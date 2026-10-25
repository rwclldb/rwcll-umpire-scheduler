-- Account details: contact phone, text-message preference, outside IDs,
-- and birth dates for umpires.
--
--   account_contact        phone + text-message (SMS) preference, one row per
--                          account. Readable and editable by the account
--                          holder and by scheduling admins. ONLY the account
--                          holder can turn text messages ON (consent).
--   account_admin_details  the two outside IDs for an account (links to other
--                          systems). Scheduling admins only; the account
--                          holder never sees them.
--   umpire_private_details gains birth_date and the same two outside IDs
--                          (administrators only, like the rest of that table)
--                          and, at last, a server-side updated_at.
--
-- Also adds a database-level rule that sign-in emails are unique even when
-- the letter case differs (Supabase Auth already enforces this; this is a
-- second line of defence).
--
-- Text messages are not available yet. The preference is only recorded.

begin;

-- 1. Unique emails, ignoring letter case
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email <> '';

-- 2. Umpire private details: birth date and outside IDs
alter table public.umpire_private_details
  add column if not exists birth_date date,
  add column if not exists external_id_primary text,
  add column if not exists external_id_secondary text;

alter table public.umpire_private_details
  add constraint umpire_private_details_birth_date_valid
    check (
      birth_date is null
      or birth_date between date '1900-01-01' and date '2100-12-31'
    ),
  add constraint umpire_private_details_external_ids_valid
    check (
      (external_id_primary is null
        or (external_id_primary = btrim(external_id_primary)
            and char_length(external_id_primary) between 1 and 100))
      and
      (external_id_secondary is null
        or (external_id_secondary = btrim(external_id_secondary)
            and char_length(external_id_secondary) between 1 and 100))
    );

create unique index umpire_private_details_external_id_primary_unique
  on public.umpire_private_details (external_id_primary)
  where external_id_primary is not null;

create unique index umpire_private_details_external_id_secondary_unique
  on public.umpire_private_details (external_id_secondary)
  where external_id_secondary is not null;

drop trigger if exists umpire_private_details_set_updated_at
  on public.umpire_private_details;
create trigger umpire_private_details_set_updated_at
before update on public.umpire_private_details
for each row execute function public.set_updated_at();

-- 3. Account contact (phone and text-message preference)
create table public.account_contact (
  profile_id uuid primary key
    references public.profiles(id) on delete cascade,
  phone text,
  sms_opt_in boolean not null default false,
  sms_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint account_contact_phone_valid
    check (phone is null or phone ~ '^[0-9+() .-]{7,30}$'),
  constraint account_contact_sms_needs_phone
    check (not sms_opt_in or phone is not null)
);

create trigger account_contact_set_updated_at
before update on public.account_contact
for each row execute function public.set_updated_at();

-- Text messages can only be turned ON by the account holder, and the time
-- of consent is recorded by the server, not by the browser.
create or replace function public.enforce_account_contact_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sms_opt_in then
    if tg_op = 'INSERT' or old.sms_opt_in is distinct from true then
      if (select auth.uid()) is distinct from new.profile_id then
        raise exception 'Only the account holder can choose to receive text messages.';
      end if;
      new.sms_opt_in_at := now();
    else
      new.sms_opt_in_at := old.sms_opt_in_at;
    end if;
  else
    new.sms_opt_in_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_account_contact_rules()
from public, anon, authenticated;

create trigger account_contact_enforce_rules
before insert or update on public.account_contact
for each row execute function public.enforce_account_contact_rules();

alter table public.account_contact enable row level security;

create policy "Account holder and scheduling admins read contact details"
on public.account_contact
for select to authenticated
using (
  public.is_scheduling_admin()
  or (public.is_approved_user() and profile_id = (select auth.uid()))
);

create policy "Account holder and scheduling admins add contact details"
on public.account_contact
for insert to authenticated
with check (
  public.is_scheduling_admin()
  or (public.is_approved_user() and profile_id = (select auth.uid()))
);

create policy "Account holder and scheduling admins update contact details"
on public.account_contact
for update to authenticated
using (
  public.is_scheduling_admin()
  or (public.is_approved_user() and profile_id = (select auth.uid()))
)
with check (
  public.is_scheduling_admin()
  or (public.is_approved_user() and profile_id = (select auth.uid()))
);

revoke all on table public.account_contact from public, anon, authenticated;
grant select, insert, update on table public.account_contact to authenticated;

-- 4. Account administrator details (outside IDs)
create table public.account_admin_details (
  profile_id uuid primary key
    references public.profiles(id) on delete cascade,
  external_id_primary text,
  external_id_secondary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint account_admin_details_external_ids_valid
    check (
      (external_id_primary is null
        or (external_id_primary = btrim(external_id_primary)
            and char_length(external_id_primary) between 1 and 100))
      and
      (external_id_secondary is null
        or (external_id_secondary = btrim(external_id_secondary)
            and char_length(external_id_secondary) between 1 and 100))
    )
);

create unique index account_admin_details_external_id_primary_unique
  on public.account_admin_details (external_id_primary)
  where external_id_primary is not null;

create unique index account_admin_details_external_id_secondary_unique
  on public.account_admin_details (external_id_secondary)
  where external_id_secondary is not null;

create trigger account_admin_details_set_updated_at
before update on public.account_admin_details
for each row execute function public.set_updated_at();

alter table public.account_admin_details enable row level security;

create policy "Scheduling admins read account admin details"
on public.account_admin_details
for select to authenticated
using (public.is_scheduling_admin());

create policy "Scheduling admins add account admin details"
on public.account_admin_details
for insert to authenticated
with check (public.is_scheduling_admin());

create policy "Scheduling admins update account admin details"
on public.account_admin_details
for update to authenticated
using (public.is_scheduling_admin())
with check (public.is_scheduling_admin());

revoke all on table public.account_admin_details
from public, anon, authenticated;
grant select, insert, update on table public.account_admin_details
to authenticated;

commit;
