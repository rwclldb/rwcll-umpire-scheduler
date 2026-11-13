-- Keeping the games up to date from the master calendar's feed (Sports Connect), twice a day.
--
-- The sync-calendar function (supabase/functions/sync-calendar) downloads the feed, works out what
-- changed, and then makes ONE call to apply_calendar_sync below, which saves it:
--
--   * new games are added
--   * changed games are changed; every umpire on a changed game is told what changed, and their
--     assignment goes back to "not confirmed yet", so they confirm it again
--   * games that are no longer in the feed are NOT changed: they are listed for a person to cancel
--   * nothing is ever canceled, and a game's status is never changed
--
-- Each game is saved on its own: if one game is refused, it is listed in the log and the others are
-- still saved. Every run is written to calendar_sync_runs (the sync log).
--
-- What this adds
--   games.master_source          'spreadsheet' (imported, has a master Game ID), 'feed' (added or kept
--                                up to date by the sync), or null (made by hand)
--   calendar_feed_settings       the feed's address, the season it fills, on/off, the league's time zone
--   calendar_feed_names          names in the feed that an administrator matched to a team or field
--   calendar_sync_runs           the sync log
--   save_calendar_feed_settings, save_calendar_feed_name, forget_calendar_feed_name   (scheduling admins)
--   apply_calendar_sync, record_calendar_sync_failure                               (the sync only)
--
-- Who: scheduling administrators (super admins, umpire chiefs, schedulers) read and change the
-- settings and the names, and read the log. Only the sync itself (the service role) applies a sync.

begin;

-- ===================================================================== where each game came from
alter table public.games
  add column master_source text
    constraint games_master_source_valid check (master_source in ('spreadsheet', 'feed'));

update public.games set master_source = 'spreadsheet' where external_game_id is not null;

-- A game imported from the spreadsheet (it has a master Game ID) is marked as such.
create or replace function public.games_mark_master_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.external_game_id is not null and new.master_source is null then
    new.master_source := 'spreadsheet';
  end if;
  return new;
end;
$$;

drop trigger if exists games_mark_master_source on public.games;
create trigger games_mark_master_source
  before insert or update on public.games
  for each row execute function public.games_mark_master_source();

-- The history can now also say "asked to confirm again".
alter table public.game_assignment_events
  drop constraint game_assignment_events_event_valid;

alter table public.game_assignment_events
  add constraint game_assignment_events_event_valid
  check (event in ('assigned', 'confirmed', 'declined', 'removed', 'arrived', 'no_show', 'attendance_cleared',
                   'reconfirm_requested'));

-- ===================================================================== settings (one row)
create table public.calendar_feed_settings (
  id boolean primary key default true
    constraint calendar_feed_settings_one_row check (id),
  feed_url text
    constraint calendar_feed_settings_url_valid
    check (feed_url is null or (feed_url ~ '^https://[^[:space:]]+$' and char_length(feed_url) <= 2000)),
  season_id uuid references public.seasons(id) on delete set null,
  enabled boolean not null default false,
  time_zone text not null default 'America/Los_Angeles',
  updated_at timestamptz not null default now(),
  updated_by_name text
);

insert into public.calendar_feed_settings (id) values (true);

alter table public.calendar_feed_settings enable row level security;
revoke all on table public.calendar_feed_settings from public, anon, authenticated;
grant select on table public.calendar_feed_settings to authenticated;

create policy "Scheduling admins read the calendar feed settings"
on public.calendar_feed_settings for select to authenticated
using (public.is_scheduling_admin());

-- ===================================================================== names matched by a person
create table public.calendar_feed_names (
  id uuid primary key default gen_random_uuid(),
  kind text not null constraint calendar_feed_names_kind_valid check (kind in ('team', 'field')),
  feed_key text not null constraint calendar_feed_names_key_valid check (feed_key ~ '^[a-z0-9]{1,200}$'),
  feed_name text not null constraint calendar_feed_names_name_valid check (char_length(feed_name) between 1 and 300),
  season_id uuid references public.seasons(id) on delete cascade, -- teams only: team names belong to a season
  team_id uuid references public.teams(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,
  is_outside boolean not null default false,
  created_at timestamptz not null default now(),
  created_by_name text,
  constraint calendar_feed_names_shape_valid check (
    (kind = 'team' and season_id is not null and location_id is null and is_outside = (team_id is null))
    or (kind = 'field' and season_id is null and team_id is null and location_id is not null and not is_outside)
  )
);

create unique index calendar_feed_names_unique
  on public.calendar_feed_names (kind, feed_key, coalesce(season_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.calendar_feed_names enable row level security;
revoke all on table public.calendar_feed_names from public, anon, authenticated;
grant select on table public.calendar_feed_names to authenticated;

create policy "Scheduling admins read the matched calendar names"
on public.calendar_feed_names for select to authenticated
using (public.is_scheduling_admin());

-- ===================================================================== the sync log
create table public.calendar_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  trigger text not null constraint calendar_sync_runs_trigger_valid check (trigger in ('scheduled', 'manual')),
  triggered_by_name text,
  season_id uuid references public.seasons(id) on delete set null,
  status text not null constraint calendar_sync_runs_status_valid check (status in ('ok', 'failed')),
  message text,
  added integer not null default 0,
  changed integer not null default 0,
  unchanged integer not null default 0,
  held integer not null default 0,
  not_in_feed integer not null default 0,
  umpires_told integer not null default 0,
  failed_games integer not null default 0,
  details jsonb not null default '{}'::jsonb
);

create index calendar_sync_runs_started_idx on public.calendar_sync_runs (started_at desc);

alter table public.calendar_sync_runs enable row level security;
revoke all on table public.calendar_sync_runs from public, anon, authenticated;
grant select on table public.calendar_sync_runs to authenticated;

create policy "Scheduling admins read the calendar sync log"
on public.calendar_sync_runs for select to authenticated
using (public.is_scheduling_admin());

-- ===================================================================== helpers
-- The same as the sync's own norm(): lower case, letters and digits only.
create or replace function public.calendar_feed_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]', '', 'g');
$$;

create or replace function public.current_admin_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.display_name), ''), p.email, 'An administrator')
  from public.profiles p where p.id = (select auth.uid());
$$;

revoke all on function public.current_admin_name() from public, anon, authenticated;

-- ===================================================================== for administrators
create or replace function public.save_calendar_feed_settings(
  p_feed_url text,
  p_season_id uuid,
  p_enabled boolean,
  p_time_zone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := nullif(btrim(coalesce(p_feed_url, '')), '');
  v_zone text := btrim(coalesce(p_time_zone, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can change the calendar sync.';
  end if;

  -- Sports Connect gives "webcal://" addresses: they are the same address over https.
  if v_url ~* '^webcal://' then
    v_url := 'https://' || substr(v_url, 10);
  end if;
  if v_url is not null and v_url !~ '^https://[^[:space:]]+$' then
    raise exception 'The feed address must start with webcal:// or https://';
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = v_zone) then
    raise exception 'The time zone "%" is not known. Use a name such as America/Los_Angeles.', v_zone;
  end if;

  if p_season_id is not null and not exists (select 1 from public.seasons s where s.id = p_season_id) then
    raise exception 'That season was not found.';
  end if;

  if coalesce(p_enabled, false) and (v_url is null or p_season_id is null) then
    raise exception 'To switch the sync on, give the feed address and choose a season.';
  end if;

  update public.calendar_feed_settings
  set feed_url = v_url,
      season_id = p_season_id,
      enabled = coalesce(p_enabled, false),
      time_zone = v_zone,
      updated_at = now(),
      updated_by_name = public.current_admin_name()
  where id;
end;
$$;

revoke all on function public.save_calendar_feed_settings(text, uuid, boolean, text) from public, anon;
grant execute on function public.save_calendar_feed_settings(text, uuid, boolean, text) to authenticated;

-- "This name in the feed is that team / that field" (or, for a team, "an outside team").
create or replace function public.save_calendar_feed_name(
  p_kind text,
  p_feed_name text,
  p_season_id uuid,
  p_team_id uuid,
  p_location_id uuid,
  p_outside boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := public.calendar_feed_key(p_feed_name);
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_scheduling_admin() then
    raise exception 'Only scheduling administrators can match calendar names.';
  end if;
  if v_key = '' then
    raise exception 'The name is empty.';
  end if;

  if p_kind = 'team' then
    if p_season_id is null then
      raise exception 'Choose the season.';
    end if;
    if not coalesce(p_outside, false) then
      if p_team_id is null then
        raise exception 'Choose the team.';
      end if;
      if not exists (select 1 from public.teams t where t.id = p_team_id and t.season_id = p_season_id) then
        raise exception 'That team is not in this season.';
      end if;
    end if;

    delete from public.calendar_feed_names
    where kind = 'team' and feed_key = v_key and season_id = p_season_id;

    insert into public.calendar_feed_names (kind, feed_key, feed_name, season_id, team_id, is_outside, created_by_name)
    values ('team', v_key, btrim(p_feed_name), p_season_id,
            case when coalesce(p_outside, false) then null else p_team_id end,
            coalesce(p_outside, false), public.current_admin_name())
    returning id into v_id;

  elsif p_kind = 'field' then
    if p_location_id is null or not exists (select 1 from public.locations l where l.id = p_location_id) then
      raise exception 'Choose the field.';
    end if;

    delete from public.calendar_feed_names where kind = 'field' and feed_key = v_key;

    insert into public.calendar_feed_names (kind, feed_key, feed_name, location_id, created_by_name)
    values ('field', v_key, btrim(p_feed_name), p_location_id, public.current_admin_name())
    returning id into v_id;

  else
    raise exception 'Unknown kind of name "%".', p_kind;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_calendar_feed_name(text, text, uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.save_calendar_feed_name(text, text, uuid, uuid, uuid, boolean) to authenticated;

create or replace function public.forget_calendar_feed_name(p_id uuid)
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
    raise exception 'Only scheduling administrators can match calendar names.';
  end if;

  delete from public.calendar_feed_names where id = p_id;
end;
$$;

revoke all on function public.forget_calendar_feed_name(uuid) from public, anon;
grant execute on function public.forget_calendar_feed_name(uuid) to authenticated;

-- ===================================================================== for the sync only
-- p_run is what the sync-calendar function worked out (see its sync-plan.ts):
--   { trigger, triggered_by, season_id, note,
--     counts, inserts[], updates[], held[], not_in_feed[], skipped[], names[], other_event_titles[],
--     admin_notice {subject, body} | null, remember {...} }
create or replace function public.apply_calendar_sync(p_run jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_season uuid := (p_run->>'season_id')::uuid;
  v_app text;
  v_link text := '';
  v_item jsonb;
  v_game uuid;
  v_rows integer;
  v_added integer := 0;
  v_changed integer := 0;
  v_told integer := 0;
  v_added_list jsonb := '[]'::jsonb;
  v_changed_list jsonb := '[]'::jsonb;
  v_failed jsonb := '[]'::jsonb;
  v_run uuid;
  r record;
begin
  -- one sync at a time (the scheduled one and a "Sync now" could meet)
  if not pg_try_advisory_xact_lock(hashtext('rwcll_calendar_sync')) then
    raise exception 'Another sync is running right now. Try again in a minute.';
  end if;

  if v_season is null or not exists (select 1 from public.seasons s where s.id = v_season) then
    raise exception 'The season to sync into was not found.';
  end if;

  if jsonb_typeof(coalesce(p_run->'inserts', '[]')) <> 'array'
     or jsonb_typeof(coalesce(p_run->'updates', '[]')) <> 'array'
     or jsonb_array_length(coalesce(p_run->'inserts', '[]')) > 5000
     or jsonb_array_length(coalesce(p_run->'updates', '[]')) > 5000 then
    raise exception 'The sync data is not in the expected form, or is too large.';
  end if;

  select s.value into v_app from public.sending_settings s where s.key = 'app_url';
  if coalesce(btrim(v_app), '') <> '' then
    v_link := E'\n\n' || btrim(v_app);
  end if;

  -- ---- new games
  for v_item in select value from jsonb_array_elements(coalesce(p_run->'inserts', '[]')) loop
    begin
      perform set_config('rwcll.urgent', 'off', true);

      insert into public.games (
        season_id, division_id, game_type, home_team_id, away_team_id, home_label, away_label,
        location_id, starts_at, ends_at, status, master_source
      ) values (
        v_season,
        (v_item->>'division_id')::uuid,
        'regular',
        nullif(v_item->>'home_team_id', '')::uuid,
        nullif(v_item->>'away_team_id', '')::uuid,
        nullif(btrim(coalesce(v_item->>'home_label', '')), ''),
        nullif(btrim(coalesce(v_item->>'away_label', '')), ''),
        (v_item->>'location_id')::uuid,
        (v_item->>'starts_at')::timestamptz,
        (v_item->>'ends_at')::timestamptz,
        'scheduled',
        'feed'
      );

      v_added := v_added + 1;
      v_added_list := v_added_list || jsonb_build_object('title', v_item->>'title', 'when', v_item->>'when');
    exception when others then
      v_failed := v_failed || jsonb_build_object('title', v_item->>'title', 'when', v_item->>'when', 'error', sqlerrm);
    end;
  end loop;

  -- ---- changed games (and quiet ones: saved, nobody told)
  for v_item in select value from jsonb_array_elements(coalesce(p_run->'updates', '[]')) loop
    begin
      perform set_config('rwcll.urgent', 'off', true);
      v_game := (v_item->>'id')::uuid;

      update public.games
      set division_id = (v_item->'set'->>'division_id')::uuid,
          home_team_id = nullif(v_item->'set'->>'home_team_id', '')::uuid,
          away_team_id = nullif(v_item->'set'->>'away_team_id', '')::uuid,
          home_label = nullif(btrim(coalesce(v_item->'set'->>'home_label', '')), ''),
          away_label = nullif(btrim(coalesce(v_item->'set'->>'away_label', '')), ''),
          location_id = (v_item->'set'->>'location_id')::uuid,
          starts_at = (v_item->'set'->>'starts_at')::timestamptz,
          ends_at = (v_item->'set'->>'ends_at')::timestamptz,
          master_source = coalesce(master_source, 'feed')
      where id = v_game
        and season_id = v_season
        and updated_at = (v_item->>'expected_updated_at')::timestamptz
        and status not in ('canceled', 'completed');

      get diagnostics v_rows = row_count;

      if v_rows = 0 then
        v_failed := v_failed || jsonb_build_object(
          'title', v_item->>'title', 'when', v_item->>'when',
          'error', case
            when exists (select 1 from public.games g where g.id = v_game and g.status in ('canceled', 'completed'))
              then 'It is canceled or completed here, so it was left alone.'
            when not exists (select 1 from public.games g where g.id = v_game and g.season_id = v_season)
              then 'It is no longer in this season.'
            else 'It was changed here while the sync was running. It will be looked at again next time.'
          end);
        continue;
      end if;

      if coalesce((v_item->>'quiet')::boolean, false) then
        continue;
      end if;

      v_changed := v_changed + 1;
      v_changed_list := v_changed_list || jsonb_build_object(
        'title', v_item->>'title', 'when', v_item->>'when', 'how', v_item->>'how',
        'changes', coalesce(v_item->'changes', '[]'::jsonb),
        'assigned', (select count(*) from public.game_assignments ga where ga.game_id = v_game));

      -- every umpire on it: told what changed, and asked to confirm again
      for r in
        select ga.id, ga.umpire_id, ga.position
        from public.game_assignments ga
        where ga.game_id = v_game
      loop
        update public.game_assignments
        set status = 'assigned', confirmed_at = null, reminded_at = null, unconfirmed_warned_at = null
        where id = r.id;

        insert into public.game_assignment_events (game_id, umpire_id, position, event, note)
        values (v_game, r.umpire_id, r.position, 'reconfirm_requested', 'The game changed on the master calendar.');

        perform public.notice_umpire(
          r.umpire_id,
          'schedule_change',
          coalesce(v_item->>'notice_subject', 'A game you are umpiring has changed'),
          coalesce(v_item->>'notice_body', 'A game you are umpiring has changed on the master calendar.')
            || E'\n\nYour position: ' || public.position_phrase(r.position) || '.' || v_link
        );

        v_told := v_told + 1;
      end loop;
    exception when others then
      v_failed := v_failed || jsonb_build_object('title', v_item->>'title', 'when', v_item->>'when', 'error', sqlerrm);
    end;
  end loop;

  perform set_config('rwcll.urgent', 'off', true);

  -- ---- the administrators: only about things not reported before (worked out by the sync)
  if jsonb_typeof(p_run->'admin_notice') = 'object' then
    perform public.notice_admins('other', p_run->'admin_notice'->>'subject', p_run->'admin_notice'->>'body');
  end if;

  insert into public.calendar_sync_runs (
    trigger, triggered_by_name, season_id, status, message,
    added, changed, unchanged, held, not_in_feed, umpires_told, failed_games, details
  ) values (
    coalesce(p_run->>'trigger', 'scheduled'),
    p_run->>'triggered_by',
    v_season,
    'ok',
    nullif(p_run->>'note', ''),
    v_added,
    v_changed,
    coalesce((p_run->'counts'->>'unchanged')::integer, 0),
    jsonb_array_length(coalesce(p_run->'held', '[]')),
    jsonb_array_length(coalesce(p_run->'not_in_feed', '[]')),
    v_told,
    jsonb_array_length(v_failed),
    jsonb_build_object(
      'counts', coalesce(p_run->'counts', '{}'::jsonb),
      'added', v_added_list,
      'changed', v_changed_list,
      'held', coalesce(p_run->'held', '[]'::jsonb),
      'not_in_feed', coalesce(p_run->'not_in_feed', '[]'::jsonb),
      'skipped', coalesce(p_run->'skipped', '[]'::jsonb),
      'names', coalesce(p_run->'names', '[]'::jsonb),
      'other_event_titles', coalesce(p_run->'other_event_titles', '[]'::jsonb),
      'failed', v_failed,
      'remember', coalesce(p_run->'remember', '{}'::jsonb)
    )
  )
  returning id into v_run;

  delete from public.calendar_sync_runs where started_at < now() - interval '120 days';

  return jsonb_build_object(
    'run_id', v_run, 'added', v_added, 'changed', v_changed, 'umpires_told', v_told,
    'failed', jsonb_array_length(v_failed)
  );
end;
$$;

revoke all on function public.apply_calendar_sync(jsonb) from public, anon, authenticated;
grant execute on function public.apply_calendar_sync(jsonb) to service_role;

-- A run that could not even start (the feed could not be read, no settings, ...). The
-- administrators are emailed the first time it fails, not again until it has worked once more.
create or replace function public.record_calendar_sync_failure(
  p_trigger text,
  p_triggered_by text,
  p_season_id uuid,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last text;
begin
  select r.status into v_last from public.calendar_sync_runs r order by r.started_at desc limit 1;

  insert into public.calendar_sync_runs (trigger, triggered_by_name, season_id, status, message)
  values (
    case when p_trigger = 'manual' then 'manual' else 'scheduled' end,
    p_triggered_by,
    case when exists (select 1 from public.seasons s where s.id = p_season_id) then p_season_id end,
    'failed',
    left(coalesce(p_message, 'Unknown problem.'), 2000)
  );

  if v_last is distinct from 'failed' then
    perform public.notice_admins(
      'other',
      'Master calendar sync failed',
      'The master calendar sync could not run:' || E'\n\n' || left(coalesce(p_message, 'Unknown problem.'), 2000)
        || E'\n\nThe games here were not changed. You will not be emailed again about this until a sync has worked.'
        || E'\nOpen the app, go to Games, and choose Master calendar sync to see the log or to try again.'
    );
  end if;
end;
$$;

revoke all on function public.record_calendar_sync_failure(text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.record_calendar_sync_failure(text, text, uuid, text) to service_role;

commit;
