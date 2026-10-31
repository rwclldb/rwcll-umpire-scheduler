-- Game day extras: rainouts, running late, field notes and access details, the
-- umpire's day view, and "administrators only" notes.
--
-- Needs the demo clock migration (20261101100000) and the game notes migration
-- (20261102100000) applied first.
--
-- ----------------------------------------------------------------------------
-- WHAT IS PRIVATE, AND WHO CAN SEE IT
--
--   Parking and directions  (locations.directions)
--       Anyone who can read the field list (they are general information).
--
--   Access details  (a gate code, a lock combination)
--       Administrators, and the umpires on a game at that field from 24 hours
--       before the game until it ends. They are kept in their own table that
--       ONLY administrators can read; an umpire gets them one game at a time
--       through get_game_access_details, which checks all of that. They are
--       never put on printed sheets or in queued messages.
--
--   Game notes marked "administrators only"
--       Administrators, and the person who wrote the note.
--
--   Running-late reports
--       Administrators, and the umpire who made the report. They carry only a
--       number of minutes the umpire chose to give: nothing about where anyone is.
--
--   Field closures (rainouts)
--       Administrators. The umpires on the games are told by message.
--
--   The other umpire's name on a game (game_partners)
--       An umpire sees the NAMES of the other umpires on their own games, and
--       nothing else about them (no phone numbers).
-- ----------------------------------------------------------------------------

begin;

-- ====================================================== 1. administrators-only notes
alter table public.game_notes
  add column admin_only boolean not null default false;

drop policy "Admins and the umpires on a game can read its notes" on public.game_notes;

create policy "Notes are read by admins, their writer, and the umpires on the game"
on public.game_notes
for select
to authenticated
using (
  public.is_approved_admin()
  or author_id = (select auth.uid())
  or (
    not admin_only
    and exists (
      select 1
      from public.game_assignments ga
      where ga.game_id = game_notes.game_id
        and ga.umpire_id = public.my_umpire_id()
    )
  )
);

-- (the new optional argument changes the function, so the old one is replaced)
drop function public.add_game_note(uuid, text, timestamptz);

create or replace function public.add_game_note(
  p_game_id uuid,
  p_body text,
  p_admin_only boolean default false,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
  v_body text;
  v_count bigint;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email)
  into v_name
  from public.profiles p
  where p.id = v_uid
    and p.account_status = 'approved';

  if v_name is null then
    raise exception 'You need an approved account to add a note.';
  end if;

  if not exists (select 1 from public.games g where g.id = p_game_id) then
    raise exception 'That game does not exist.';
  end if;

  if not (
    public.is_scheduling_admin()
    or exists (
      select 1
      from public.game_assignments ga
      where ga.game_id = p_game_id
        and ga.umpire_id = public.my_umpire_id()
    )
  ) then
    raise exception 'Only the umpires on a game and scheduling administrators can add notes to it.';
  end if;

  -- (all whitespace around the note is removed, including new lines)
  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body is null or v_body = '' then
    raise exception 'A note cannot be empty.';
  end if;

  if char_length(v_body) > 1000 then
    raise exception 'A note can be at most 1000 characters.';
  end if;

  select count(*) into v_count from public.game_notes where game_id = p_game_id;

  if v_count >= 100 then
    raise exception 'That game already has the most notes allowed (100).';
  end if;

  insert into public.game_notes (game_id, author_id, author_name, body, created_at, admin_only)
  values (p_game_id, v_uid, v_name, v_body, public.app_now(p_now), coalesce(p_admin_only, false));
end;
$$;

revoke all on function public.add_game_note(uuid, text, boolean, timestamptz) from public, anon;
grant execute on function public.add_game_note(uuid, text, boolean, timestamptz) to authenticated;

-- ============================================== 2. field notes and access details
alter table public.locations
  add column directions text
  constraint locations_directions_valid
  check (directions is null or char_length(directions) <= 1000);

create table public.location_access_notes (
  location_id uuid primary key
    references public.locations(id) on delete cascade,
  body text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint location_access_notes_body_valid
    check (char_length(btrim(body)) between 1 and 500)
);

alter table public.location_access_notes enable row level security;

revoke all on table public.location_access_notes from public, anon, authenticated;
grant select on table public.location_access_notes to authenticated;

create policy "Only administrators read access details"
on public.location_access_notes
for select
to authenticated
using (public.is_approved_admin());

create or replace function public.set_location_access_details(p_location_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can change access details.';
  end if;

  if not exists (select 1 from public.locations l where l.id = p_location_id) then
    raise exception 'That field does not exist.';
  end if;

  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body = '' then
    delete from public.location_access_notes where location_id = p_location_id;
    return;
  end if;

  if char_length(v_body) > 500 then
    raise exception 'Access details can be at most 500 characters.';
  end if;

  insert into public.location_access_notes (location_id, body, updated_by, updated_at)
  values (p_location_id, v_body, (select auth.uid()), now())
  on conflict (location_id) do update
  set body = excluded.body, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.set_location_access_details(uuid, text) from public, anon;
grant execute on function public.set_location_access_details(uuid, text) to authenticated;

-- The access details for the field a game is at: for an administrator, any time;
-- for an umpire on the game, from 24 hours before it starts until it ends;
-- otherwise nothing (null).
create or replace function public.get_game_access_details(p_game_id uuid, p_now timestamptz default null)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_game public.games%rowtype;
  v_now timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select * into v_game from public.games g where g.id = p_game_id;
  if not found then
    return null;
  end if;

  if not public.is_approved_admin() then
    v_now := public.app_now(p_now);

    if v_game.status = 'canceled'
       or v_now < v_game.starts_at - interval '24 hours'
       or v_now > v_game.ends_at
       or not exists (
         select 1 from public.game_assignments ga
         where ga.game_id = p_game_id and ga.umpire_id = public.my_umpire_id()
       ) then
      return null;
    end if;
  end if;

  return (select n.body from public.location_access_notes n where n.location_id = v_game.location_id);
end;
$$;

revoke all on function public.get_game_access_details(uuid, timestamptz) from public, anon;
grant execute on function public.get_game_access_details(uuid, timestamptz) to authenticated;

-- ====================================================== 3. rainouts (field closures)
create table public.field_closures (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  closes_from timestamptz not null,
  closes_to timestamptz not null,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text not null,
  created_at timestamptz not null default now(),
  reopened_at timestamptz,
  reopened_by_name text,
  constraint field_closures_window_valid check (closes_to > closes_from),
  constraint field_closures_reason_valid check (char_length(btrim(reason)) between 1 and 200)
);

create index field_closures_location_idx on public.field_closures (location_id, closes_from);

-- the games a closure canceled, and what each was before (so reopening can put them back)
create table public.field_closure_games (
  closure_id uuid not null references public.field_closures(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  previous_status text not null,
  primary key (closure_id, game_id)
);

alter table public.field_closures enable row level security;
alter table public.field_closure_games enable row level security;

revoke all on table public.field_closures, public.field_closure_games from public, anon, authenticated;
grant select on table public.field_closures, public.field_closure_games to authenticated;

create policy "Administrators read closures"
on public.field_closures for select to authenticated
using (public.is_approved_admin());

create policy "Administrators read the games a closure canceled"
on public.field_closure_games for select to authenticated
using (public.is_approved_admin());

-- Cancels every game at a field that starts in the window (draft or scheduled
-- games only), adds a note to each saying why, and tells the umpires on them.
create or replace function public.close_field(
  p_location_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_reason text,
  p_now timestamptz default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
  v_reason text;
  v_now timestamptz;
  v_closure uuid;
  v_game record;
  v_umpire record;
  v_summary text;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can close a field.';
  end if;

  v_now := public.app_now(p_now);
  v_reason := regexp_replace(coalesce(p_reason, ''), '^\s+|\s+$', '', 'g');

  if v_reason = '' then
    raise exception 'Give a reason.';
  end if;

  if char_length(v_reason) > 200 then
    raise exception 'The reason can be at most 200 characters.';
  end if;

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'The closing must end after it starts.';
  end if;

  if p_to - p_from > interval '7 days' then
    raise exception 'A closing can be at most 7 days long.';
  end if;

  if not exists (select 1 from public.locations l where l.id = p_location_id) then
    raise exception 'That field does not exist.';
  end if;

  if not exists (
    select 1 from public.games g
    where g.location_id = p_location_id
      and g.status in ('draft', 'scheduled')
      and g.starts_at >= p_from and g.starts_at < p_to
  ) then
    raise exception 'There are no games to cancel on that field in that time.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_name
  from public.profiles p where p.id = v_uid;

  insert into public.field_closures (location_id, closes_from, closes_to, reason, created_by, created_by_name, created_at)
  values (p_location_id, p_from, p_to, v_reason, v_uid, coalesce(v_name, 'An administrator'), v_now)
  returning id into v_closure;

  for v_game in
    select g.id, g.status
    from public.games g
    where g.location_id = p_location_id
      and g.status in ('draft', 'scheduled')
      and g.starts_at >= p_from and g.starts_at < p_to
    order by g.starts_at
  loop
    insert into public.field_closure_games (closure_id, game_id, previous_status)
    values (v_closure, v_game.id, v_game.status);

    update public.games set status = 'canceled' where id = v_game.id;

    insert into public.game_notes (game_id, author_id, author_name, body, created_at)
    values (v_game.id, v_uid, coalesce(v_name, 'An administrator'), 'Canceled: ' || v_reason, v_now);

    v_summary := public.game_summary_text(v_game.id);

    for v_umpire in select ga.umpire_id from public.game_assignments ga where ga.game_id = v_game.id
    loop
      perform public.notice_umpire(
        v_umpire.umpire_id,
        'schedule_change',
        'Game canceled',
        'Canceled: ' || v_summary || E'.\nReason: ' || v_reason || E'.\nYou do not need to come.'
      );
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.close_field(uuid, timestamptz, timestamptz, text, timestamptz) from public, anon;
grant execute on function public.close_field(uuid, timestamptz, timestamptz, text, timestamptz) to authenticated;

-- Puts back the games a closure canceled (only those still canceled), and tells
-- the umpires on them. A game changed by hand since then is left alone.
create or replace function public.reopen_closure(p_closure_id uuid, p_now timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
  v_now timestamptz;
  v_closure public.field_closures%rowtype;
  v_game record;
  v_umpire record;
  v_summary text;
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can reopen a field.';
  end if;

  select * into v_closure from public.field_closures c where c.id = p_closure_id;

  if not found then
    raise exception 'That closing does not exist.';
  end if;

  if v_closure.reopened_at is not null then
    raise exception 'That closing has already been reopened.';
  end if;

  v_now := public.app_now(p_now);

  select coalesce(nullif(btrim(p.display_name), ''), p.email) into v_name
  from public.profiles p where p.id = v_uid;

  for v_game in
    select cg.game_id, cg.previous_status
    from public.field_closure_games cg
    join public.games g on g.id = cg.game_id
    where cg.closure_id = p_closure_id and g.status = 'canceled'
    order by g.starts_at
  loop
    update public.games set status = v_game.previous_status where id = v_game.game_id;

    insert into public.game_notes (game_id, author_id, author_name, body, created_at)
    values (v_game.game_id, v_uid, coalesce(v_name, 'An administrator'), 'Back on: the field is open again.', v_now);

    v_summary := public.game_summary_text(v_game.game_id);

    for v_umpire in select ga.umpire_id from public.game_assignments ga where ga.game_id = v_game.game_id
    loop
      perform public.notice_umpire(
        v_umpire.umpire_id,
        'schedule_change',
        'Game back on',
        'Back on: ' || v_summary || E'.\nThe field is open again, so this game is being played.'
      );
    end loop;

    v_count := v_count + 1;
  end loop;

  update public.field_closures
  set reopened_at = v_now, reopened_by_name = coalesce(v_name, 'An administrator')
  where id = p_closure_id;

  return v_count;
end;
$$;

revoke all on function public.reopen_closure(uuid, timestamptz) from public, anon;
grant execute on function public.reopen_closure(uuid, timestamptz) to authenticated;

-- ============================================================ 4. running late
create table public.running_late_reports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  umpire_id uuid not null references public.umpires(id) on delete cascade,
  minutes integer not null check (minutes between 1 and 180),
  reported_at timestamptz not null default now(),
  unique (game_id, umpire_id)
);

alter table public.running_late_reports enable row level security;

revoke all on table public.running_late_reports from public, anon, authenticated;
grant select on table public.running_late_reports to authenticated;

create policy "Administrators and the umpire read running-late reports"
on public.running_late_reports for select to authenticated
using (public.is_approved_admin() or umpire_id = public.my_umpire_id());

create or replace function public.report_running_late(
  p_game_id uuid,
  p_minutes integer,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umpire uuid;
  v_row public.game_assignments%rowtype;
  v_game public.games%rowtype;
  v_now timestamptz;
  v_before integer;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to do this.';
  end if;

  v_now := public.app_now(p_now);

  select * into v_row from public.game_assignments where game_id = p_game_id and umpire_id = v_umpire;
  if not found then
    raise exception 'You are not assigned to that game.';
  end if;

  select * into v_game from public.games where id = p_game_id;

  if v_game.status = 'canceled' then
    raise exception 'That game has been canceled.';
  end if;

  if v_game.status = 'completed' then
    raise exception 'That game is already marked completed.';
  end if;

  if p_minutes is null or p_minutes < 1 or p_minutes > 180 then
    raise exception 'Say how many minutes late, from 1 to 180.';
  end if;

  if v_now > v_game.ends_at then
    raise exception 'That game is over.';
  end if;

  if v_now < v_game.starts_at - interval '12 hours' then
    raise exception 'It is too early to say you are running late.';
  end if;

  if v_row.attendance = 'arrived' then
    raise exception 'You have already checked in.';
  end if;

  select minutes into v_before from public.running_late_reports where game_id = p_game_id and umpire_id = v_umpire;

  insert into public.running_late_reports (game_id, umpire_id, minutes, reported_at)
  values (p_game_id, v_umpire, p_minutes, v_now)
  on conflict (game_id, umpire_id) do update
  set minutes = excluded.minutes, reported_at = excluded.reported_at;

  -- tell the administrators (once for each change, not each tap)
  if v_before is distinct from p_minutes then
    select u.display_name into v_name from public.umpires u where u.id = v_umpire;

    perform public.notice_admins(
      'other',
      v_name || ' is running late',
      v_name || ' says they are running about ' || p_minutes || ' minutes late for '
        || public.game_summary_text(p_game_id) || ' (' || public.position_phrase(v_row.position) || E').'
    );
  end if;
end;
$$;

revoke all on function public.report_running_late(uuid, integer, timestamptz) from public, anon;
grant execute on function public.report_running_late(uuid, integer, timestamptz) to authenticated;

create or replace function public.clear_running_late(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  delete from public.running_late_reports
  where game_id = p_game_id and umpire_id = public.my_umpire_id();
end;
$$;

revoke all on function public.clear_running_late(uuid) from public, anon;
grant execute on function public.clear_running_late(uuid) to authenticated;

-- ============================================ 5. who else is on my games (names only)
create or replace function public.game_partners(p_game_ids uuid[])
returns table (game_id uuid, place text, umpire_name text)   -- ("position" is a reserved word here)
language sql
stable
security definer
set search_path = ''
as $$
  select ga.game_id, ga.position, u.display_name
  from public.game_assignments ga
  join public.umpires u on u.id = ga.umpire_id
  where ga.game_id = any(p_game_ids)
    and ga.umpire_id <> public.my_umpire_id()
    and exists (
      select 1 from public.game_assignments me
      where me.game_id = ga.game_id and me.umpire_id = public.my_umpire_id()
    )
  order by ga.game_id, ga.position;
$$;

revoke all on function public.game_partners(uuid[]) from public, anon;
grant execute on function public.game_partners(uuid[]) to authenticated;

commit;
