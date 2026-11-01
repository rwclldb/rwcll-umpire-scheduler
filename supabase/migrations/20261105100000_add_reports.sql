-- Reports: post-game reports from umpires, and reports from outside (coaches,
-- parents, the board) about an umpire.
--
-- Needs the demo clock migration (20261101100000) applied first.
-- ----------------------------------------------------------------------------
-- WHO CAN DO WHAT
--
--   READERS: the umpire chief and super admins (approved accounts). Nobody else
--   reads reports. Schedulers, other administrators and the feedback reviewer
--   role cannot.
--
--   Post-game report
--     Written by an umpire assigned to the game, from the moment it starts until
--     14 days after it ends. The umpire who wrote it can read it, and its
--     follow-ups, but cannot edit it. They can add follow-ups. At most 5 reports
--     per umpire per game.
--
--   Report from outside (about an umpire)
--     Entered, edited and followed up ONLY by readers. The umpire it is about
--     cannot see it, or know it exists.
--
--   Delete: super admins only. Nothing is ever printed or emailed with its content:
--   the umpire chief and super admins are only told that a report was filed.
--
-- RETENTION: a report is deleted automatically once a year has passed since the
-- end date of its season (purge_expired_reports). A season with no end date is
-- never deleted automatically.
--
-- CHANGE LOG (report_audit): who created, edited, followed up on, or deleted a
-- report, and when. It holds NO report text, so it is kept after a report is
-- deleted. Readers can see it.
--
-- Nobody writes these tables directly: everything goes through the functions below.
-- ----------------------------------------------------------------------------

begin;

-- ------------------------------------------------------------ who is a reader
create or replace function public.is_report_reader()
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
      and ur.role_id in ('super_admin', 'umpire_chief')
  );
$$;

create or replace function public.is_super_admin_user()
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
      and ur.role_id = 'super_admin'
  );
$$;

revoke all on function public.is_report_reader() from public, anon;
grant execute on function public.is_report_reader() to authenticated;
revoke all on function public.is_super_admin_user() from public, anon;
grant execute on function public.is_super_admin_user() to authenticated;

-- ------------------------------------------------------------------- the tables
create table public.game_reports (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete restrict,
  season_id uuid not null references public.seasons(id) on delete restrict,
  umpire_id uuid not null references public.umpires(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  category text not null
    check (category in ('ejection', 'protest', 'conduct', 'incident', 'other')),
  body text not null
    check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index game_reports_game_idx on public.game_reports (game_id);
create index game_reports_umpire_idx on public.game_reports (umpire_id, created_at);
create index game_reports_season_idx on public.game_reports (season_id);

create table public.game_report_followups (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.game_reports(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  body text not null
    check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index game_report_followups_idx on public.game_report_followups (report_id, created_at);

create table public.outside_reports (
  id uuid primary key default gen_random_uuid(),
  umpire_id uuid not null references public.umpires(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  season_id uuid not null references public.seasons(id) on delete restrict,
  source_name text not null
    check (char_length(btrim(source_name)) between 1 and 100),
  source_role text not null
    check (source_role in ('coach', 'manager', 'parent', 'league_official', 'spectator', 'other')),
  received_on date not null,
  body text not null
    check (char_length(btrim(body)) between 1 and 4000),
  entered_by uuid references auth.users(id) on delete set null,
  entered_by_name text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index outside_reports_umpire_idx on public.outside_reports (umpire_id, received_on);
create index outside_reports_season_idx on public.outside_reports (season_id);

create table public.outside_report_followups (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.outside_reports(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  body text not null
    check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index outside_report_followups_idx on public.outside_report_followups (report_id, created_at);

-- the change log: no report text, and no foreign key, so it outlives the report
create table public.report_audit (
  id uuid primary key default gen_random_uuid(),
  report_kind text not null check (report_kind in ('game', 'outside')),
  report_id uuid not null,
  action text not null
    check (action in ('created', 'edited', 'followup', 'deleted', 'purged')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  acted_at timestamptz not null default now()
);

create index report_audit_report_idx on public.report_audit (report_id, acted_at);

-- ------------------------------------------------------------------ who can read
alter table public.game_reports enable row level security;
alter table public.game_report_followups enable row level security;
alter table public.outside_reports enable row level security;
alter table public.outside_report_followups enable row level security;
alter table public.report_audit enable row level security;

revoke all on table
  public.game_reports, public.game_report_followups,
  public.outside_reports, public.outside_report_followups, public.report_audit
from public, anon, authenticated;

grant select on table
  public.game_reports, public.game_report_followups,
  public.outside_reports, public.outside_report_followups, public.report_audit
to authenticated;

create policy "Readers, and the umpire who wrote it, read a post-game report"
on public.game_reports for select to authenticated
using (public.is_report_reader() or umpire_id = public.my_umpire_id());

create policy "Readers, and the umpire who wrote the report, read its follow-ups"
on public.game_report_followups for select to authenticated
using (
  public.is_report_reader()
  or exists (
    select 1 from public.game_reports r
    where r.id = game_report_followups.report_id
      and r.umpire_id = public.my_umpire_id()
  )
);

create policy "Only readers read reports from outside"
on public.outside_reports for select to authenticated
using (public.is_report_reader());

create policy "Only readers read follow-ups to reports from outside"
on public.outside_report_followups for select to authenticated
using (public.is_report_reader());

create policy "Only readers read the change log"
on public.report_audit for select to authenticated
using (public.is_report_reader());

-- --------------------------------------------------- telling the readers (no content)
create or replace function public.notice_report_readers(p_subject text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select distinct p.id as profile_id, p.email as email
    from public.profiles p
    join public.user_roles ur on ur.user_id = p.id
    where p.account_status = 'approved'
      and ur.role_id in ('super_admin', 'umpire_chief')
      and btrim(p.email) <> ''
  loop
    perform public.queue_notice('other', r.email, r.profile_id, p_subject, p_body);
  end loop;
end;
$$;

revoke all on function public.notice_report_readers(text, text) from public, anon, authenticated;

-- ---------------------------------------------------- an umpire writes a report
create or replace function public.file_game_report(
  p_game_id uuid,
  p_category text,
  p_body text,
  p_now timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_umpire uuid;
  v_game public.games%rowtype;
  v_now timestamptz;
  v_body text;
  v_name text;
  v_count bigint;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_umpire := public.my_umpire_id();
  if v_umpire is null then
    raise exception 'You need an approved account linked to an umpire record to write a report.';
  end if;

  v_now := public.app_now(p_now);

  if not exists (
    select 1 from public.game_assignments ga
    where ga.game_id = p_game_id and ga.umpire_id = v_umpire
  ) then
    raise exception 'You are not assigned to that game.';
  end if;

  select * into v_game from public.games g where g.id = p_game_id;

  if v_game.status = 'canceled' then
    raise exception 'That game was canceled.';
  end if;

  if p_category is null or p_category not in ('ejection', 'protest', 'conduct', 'incident', 'other') then
    raise exception 'Choose what the report is about.';
  end if;

  if v_now < v_game.starts_at then
    raise exception 'You can write a report once the game has started.';
  end if;

  if v_now > v_game.ends_at + interval '14 days' then
    raise exception 'A report can be written up to 14 days after the game.';
  end if;

  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body = '' then
    raise exception 'A report cannot be empty.';
  end if;

  if char_length(v_body) > 4000 then
    raise exception 'A report can be at most 4000 characters.';
  end if;

  select count(*) into v_count
  from public.game_reports r
  where r.game_id = p_game_id and r.umpire_id = v_umpire;

  if v_count >= 5 then
    raise exception 'You have already written the most reports allowed for this game (5). Add a follow-up to one of them instead.';
  end if;

  select coalesce(nullif(btrim(u.display_name), ''), 'An umpire') into v_name
  from public.umpires u where u.id = v_umpire;

  insert into public.game_reports (game_id, season_id, umpire_id, author_id, author_name, category, body, created_at)
  values (p_game_id, v_game.season_id, v_umpire, v_uid, v_name, p_category, v_body, v_now)
  returning id into v_id;

  insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
  values ('game', v_id, 'created', v_uid, v_name, v_now);

  perform public.notice_report_readers(
    'A post-game report was filed',
    v_name || ' filed a post-game report for ' || public.game_summary_text(p_game_id)
      || E'.\nOpen the Reports page in the app to read it.'
  );

  return v_id;
end;
$$;

revoke all on function public.file_game_report(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.file_game_report(uuid, text, text, timestamptz) to authenticated;

-- A follow-up to a post-game report: by the umpire who wrote it, or by a reader.
create or replace function public.add_game_report_followup(
  p_report_id uuid,
  p_body text,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_report public.game_reports%rowtype;
  v_reader boolean;
  v_body text;
  v_name text;
  v_now timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_report from public.game_reports r where r.id = p_report_id;

  if not found then
    raise exception 'That report does not exist.';
  end if;

  v_reader := public.is_report_reader();

  if not v_reader and v_report.umpire_id is distinct from public.my_umpire_id() then
    raise exception 'You can only add to a report you wrote.';
  end if;

  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body = '' then
    raise exception 'A follow-up cannot be empty.';
  end if;

  if char_length(v_body) > 4000 then
    raise exception 'A follow-up can be at most 4000 characters.';
  end if;

  v_now := public.app_now(p_now);

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'Someone') into v_name
  from public.profiles p where p.id = v_uid;

  insert into public.game_report_followups (report_id, author_id, author_name, body, created_at)
  values (p_report_id, v_uid, coalesce(v_name, 'Someone'), v_body, v_now);

  insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
  values ('game', p_report_id, 'followup', v_uid, coalesce(v_name, 'Someone'), v_now);

  if not v_reader then
    perform public.notice_report_readers(
      'A follow-up was added to a post-game report',
      coalesce(v_name, 'An umpire') || ' added a follow-up to a post-game report. Open the Reports page in the app to read it.'
    );
  end if;
end;
$$;

revoke all on function public.add_game_report_followup(uuid, text, timestamptz) from public, anon;
grant execute on function public.add_game_report_followup(uuid, text, timestamptz) to authenticated;

-- ------------------------------------------- reports from outside (readers only)
create or replace function public.add_outside_report(
  p_umpire_id uuid,
  p_game_id uuid,
  p_season_id uuid,
  p_source_name text,
  p_source_role text,
  p_received_on date,
  p_body text,
  p_now timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz;
  v_source text;
  v_body text;
  v_name text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_report_reader() then
    raise exception 'Only the umpire chief and super admins can add reports.';
  end if;

  v_now := public.app_now(p_now);

  if not exists (select 1 from public.umpires u where u.id = p_umpire_id) then
    raise exception 'That umpire does not exist.';
  end if;

  if not exists (select 1 from public.seasons s where s.id = p_season_id) then
    raise exception 'Choose the season this belongs to.';
  end if;

  if p_game_id is not null and not exists (select 1 from public.games g where g.id = p_game_id) then
    raise exception 'That game does not exist.';
  end if;

  v_source := regexp_replace(coalesce(p_source_name, ''), '^\s+|\s+$', '', 'g');

  if v_source = '' or char_length(v_source) > 100 then
    raise exception 'Say who reported it (up to 100 characters).';
  end if;

  if p_source_role is null or p_source_role not in ('coach', 'manager', 'parent', 'league_official', 'spectator', 'other') then
    raise exception 'Choose who the report is from.';
  end if;

  if p_received_on is null or p_received_on > (v_now at time zone 'America/Los_Angeles')::date then
    raise exception 'The date it was received cannot be empty or in the future.';
  end if;

  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body = '' then
    raise exception 'A report cannot be empty.';
  end if;

  if char_length(v_body) > 4000 then
    raise exception 'A report can be at most 4000 characters.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = v_uid;

  insert into public.outside_reports
    (umpire_id, game_id, season_id, source_name, source_role, received_on, body, entered_by, entered_by_name, created_at)
  values
    (p_umpire_id, p_game_id, p_season_id, v_source, p_source_role, p_received_on, v_body, v_uid, coalesce(v_name, 'An administrator'), v_now)
  returning id into v_id;

  insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
  values ('outside', v_id, 'created', v_uid, coalesce(v_name, 'An administrator'), v_now);

  return v_id;
end;
$$;

revoke all on function public.add_outside_report(uuid, uuid, uuid, text, text, date, text, timestamptz) from public, anon;
grant execute on function public.add_outside_report(uuid, uuid, uuid, text, text, date, text, timestamptz) to authenticated;

create or replace function public.edit_outside_report(
  p_report_id uuid,
  p_source_name text,
  p_source_role text,
  p_received_on date,
  p_body text,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz;
  v_source text;
  v_body text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_report_reader() then
    raise exception 'Only the umpire chief and super admins can change reports.';
  end if;

  if not exists (select 1 from public.outside_reports r where r.id = p_report_id) then
    raise exception 'That report does not exist.';
  end if;

  v_now := public.app_now(p_now);

  v_source := regexp_replace(coalesce(p_source_name, ''), '^\s+|\s+$', '', 'g');

  if v_source = '' or char_length(v_source) > 100 then
    raise exception 'Say who reported it (up to 100 characters).';
  end if;

  if p_source_role is null or p_source_role not in ('coach', 'manager', 'parent', 'league_official', 'spectator', 'other') then
    raise exception 'Choose who the report is from.';
  end if;

  if p_received_on is null or p_received_on > (v_now at time zone 'America/Los_Angeles')::date then
    raise exception 'The date it was received cannot be empty or in the future.';
  end if;

  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body = '' then
    raise exception 'A report cannot be empty.';
  end if;

  if char_length(v_body) > 4000 then
    raise exception 'A report can be at most 4000 characters.';
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = v_uid;

  update public.outside_reports
  set source_name = v_source, source_role = p_source_role, received_on = p_received_on,
      body = v_body, edited_at = v_now
  where id = p_report_id;

  insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
  values ('outside', p_report_id, 'edited', v_uid, coalesce(v_name, 'An administrator'), v_now);
end;
$$;

revoke all on function public.edit_outside_report(uuid, text, text, date, text, timestamptz) from public, anon;
grant execute on function public.edit_outside_report(uuid, text, text, date, text, timestamptz) to authenticated;

create or replace function public.add_outside_report_followup(
  p_report_id uuid,
  p_body text,
  p_now timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text;
  v_name text;
  v_now timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_report_reader() then
    raise exception 'Only the umpire chief and super admins can add to reports.';
  end if;

  if not exists (select 1 from public.outside_reports r where r.id = p_report_id) then
    raise exception 'That report does not exist.';
  end if;

  v_body := regexp_replace(coalesce(p_body, ''), '^\s+|\s+$', '', 'g');

  if v_body = '' then
    raise exception 'A follow-up cannot be empty.';
  end if;

  if char_length(v_body) > 4000 then
    raise exception 'A follow-up can be at most 4000 characters.';
  end if;

  v_now := public.app_now(p_now);

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator') into v_name
  from public.profiles p where p.id = v_uid;

  insert into public.outside_report_followups (report_id, author_id, author_name, body, created_at)
  values (p_report_id, v_uid, coalesce(v_name, 'An administrator'), v_body, v_now);

  insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
  values ('outside', p_report_id, 'followup', v_uid, coalesce(v_name, 'An administrator'), v_now);
end;
$$;

revoke all on function public.add_outside_report_followup(uuid, text, timestamptz) from public, anon;
grant execute on function public.add_outside_report_followup(uuid, text, timestamptz) to authenticated;

-- --------------------------------------------------------- delete (super admins)
create or replace function public.delete_report(p_kind text, p_report_id uuid, p_now timestamptz default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
  v_now timestamptz;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_super_admin_user() then
    raise exception 'Only super admins can delete reports.';
  end if;

  if p_kind is null or p_kind not in ('game', 'outside') then
    raise exception 'The kind of report must be game or outside.';
  end if;

  v_now := public.app_now(p_now);

  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'A super admin') into v_name
  from public.profiles p where p.id = v_uid;

  if p_kind = 'game' then
    delete from public.game_reports where id = p_report_id;
  else
    delete from public.outside_reports where id = p_report_id;
  end if;

  if not found then
    raise exception 'That report does not exist.';
  end if;

  insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
  values (p_kind, p_report_id, 'deleted', v_uid, coalesce(v_name, 'A super admin'), v_now);
end;
$$;

revoke all on function public.delete_report(text, uuid, timestamptz) from public, anon;
grant execute on function public.delete_report(text, uuid, timestamptz) to authenticated;

-- ------------------------------------------------------------------- retention
-- Deletes every report whose season ended more than a year ago, and logs each
-- (with no text). A season with no end date is never touched. Readers can run it
-- (the Reports page does when it opens); a scheduled job can run it too.
create or replace function public.purge_expired_reports(p_now timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz;
  v_today date;
  v_count integer := 0;
  r record;
begin
  if v_uid is not null and not public.is_report_reader() then
    raise exception 'Only the umpire chief and super admins can do that.';
  end if;

  v_now := public.app_now(p_now);
  v_today := (v_now at time zone 'America/Los_Angeles')::date;

  for r in
    select x.id
    from public.game_reports x
    join public.seasons s on s.id = x.season_id
    where s.ends_on is not null and (s.ends_on + interval '1 year')::date < v_today
  loop
    insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
    values ('game', r.id, 'purged', null, 'Automatic deletion', v_now);

    delete from public.game_reports where id = r.id;
    v_count := v_count + 1;
  end loop;

  for r in
    select x.id
    from public.outside_reports x
    join public.seasons s on s.id = x.season_id
    where s.ends_on is not null and (s.ends_on + interval '1 year')::date < v_today
  loop
    insert into public.report_audit (report_kind, report_id, action, actor_id, actor_name, acted_at)
    values ('outside', r.id, 'purged', null, 'Automatic deletion', v_now);

    delete from public.outside_reports where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.purge_expired_reports(timestamptz) from public, anon;
grant execute on function public.purge_expired_reports(timestamptz) to authenticated;

commit;
