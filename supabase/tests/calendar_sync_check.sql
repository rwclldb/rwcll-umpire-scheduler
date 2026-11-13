-- RWCLL check: the master calendar sync (settings, matched names, applying a sync, the log, who may do what).
--
-- Run in the Supabase SQL Editor AFTER applying 20261113100000_add_calendar_feed_sync.sql and 20261113120000_calendar_feed_ignored_teams.sql.
--
-- It builds its own accounts, umpires and games, then acts as them and as the sync itself. It ENDS WITH A
-- RED ERROR on purpose: the report is carried in the error message, and raising an error guarantees
-- everything it created (and every message it queued, and every setting it changed) is rolled back.
-- Your real data is not changed.
--
--   PASS   the rule behaved as intended
--   FAIL   something invalid was allowed, or something valid was refused

do $$
declare
  report text[] := '{}';
  failures integer := 0;
  stamp text := replace(gen_random_uuid()::text, '-', '');
  t_admin uuid;
  u_acct uuid := gen_random_uuid(); x_acct uuid := gen_random_uuid();
  u_mail text;
  l1 uuid; s1 uuid; s2 uuid; loc uuid; loc2 uuid; d1 uuid; d2 uuid; tm1 uuid; tm2 uuid; tm3 uuid; tm_other uuid;
  um uuid;
  g_change uuid; g_quiet uuid; g_stale uuid; g_canceled uuid; g_sheet uuid;
  v_res jsonb; v_run public.calendar_sync_runs%rowtype; v_text text; n bigint; n2 bigint;
  v_start timestamptz := date_trunc('hour', now()) + interval '3 days';
  e_change timestamptz; e_quiet timestamptz; e_stale timestamptz; e_canceled timestamptz;
begin
  select p.id into t_admin
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id
  where ur.role_id = 'super_admin' and p.account_status = 'approved'
  limit 1;

  if t_admin is null then
    raise exception 'This check needs an approved super admin.';
  end if;

  u_mail := 'chk-' || stamp || '-u@example.org';
  begin
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      (u_acct, u_mail, now(), '{}'::jsonb),
      (x_acct, 'chk-' || stamp || '-x@example.org', now(), '{}'::jsonb);
  exception when others then
    raise exception 'This check could not create test accounts here: %', sqlerrm;
  end;
  update public.profiles set account_status = 'approved' where id in (u_acct, x_acct);

  insert into public.leagues (name) values ('CHK L1 ' || stamp) returning id into l1;
  insert into public.seasons (name) values ('CHK S1 ' || stamp) returning id into s1;
  insert into public.seasons (name) values ('CHK S2 ' || stamp) returning id into s2;
  insert into public.locations (name) values ('CHK Field ' || stamp) returning id into loc;
  insert into public.locations (name) values ('CHK Field B ' || stamp) returning id into loc2;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div ' || stamp) returning id into d1;
  insert into public.divisions (league_id, name) values (l1, 'CHK Div2 ' || stamp) returning id into d2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T1', d1) returning id into tm1;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T2', d1) returning id into tm2;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s1, 'T3', d1) returning id into tm3;
  insert into public.teams (league_id, season_id, name, division_id) values (l1, s2, 'T-other', d1) returning id into tm_other;

  insert into public.umpires (display_name, classification, profile_id) values ('CHK Ump ' || stamp, 'adult', u_acct) returning id into um;

  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status, master_source)
  values (s1, d1, tm1, tm2, loc, v_start, v_start + interval '2 hours', 'scheduled', 'feed') returning id into g_change;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status)
  values (s1, d1, tm2, tm3, loc, v_start + interval '1 day', v_start + interval '1 day 2 hours', 'scheduled') returning id into g_quiet;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status, master_source)
  values (s1, d1, tm1, tm3, loc, v_start + interval '2 days', v_start + interval '2 days 2 hours', 'scheduled', 'feed') returning id into g_stale;
  insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status, master_source)
  values (s1, d1, tm3, tm1, loc, v_start + interval '3 days', v_start + interval '3 days 2 hours', 'canceled', 'feed') returning id into g_canceled;

  insert into public.game_assignments (game_id, umpire_id, position) values (g_change, um, 'plate');
  update public.game_assignments set status = 'confirmed', confirmed_at = now(), reminded_at = now() where game_id = g_change;

  -- set aside messages and runs that were already there (they are put back when this check rolls back)
  update public.email_outbox set status = 'skipped' where status = 'queued';
  delete from public.calendar_sync_runs;
  perform set_config('rwcll.urgent', 'off', true);

  ----------------------------------------------------------------
  -- 1. Where a game came from
  ----------------------------------------------------------------

  -- C1
  begin
    insert into public.games (season_id, division_id, home_team_id, away_team_id, location_id, starts_at, ends_at, status, external_game_id)
    values (s1, d1, tm1, tm2, loc, v_start + interval '10 days', v_start + interval '10 days 2 hours', 'scheduled', 'CHK-' || stamp) returning id into g_sheet;
    if (select master_source from public.games where id = g_sheet) = 'spreadsheet' then report := array_append(report, ('PASS  C1  a game with a master Game ID is marked as from the spreadsheet')::text); else report := array_append(report, ('FAIL  C1  a game with a master Game ID was not marked as from the spreadsheet')::text); failures := failures + 1; end if;
  exception when others then
    report := array_append(report, ('FAIL  C1  a game with a master Game ID is marked as from the spreadsheet: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 2. Applying a sync (as the sync itself)
  ----------------------------------------------------------------

  -- read these before acting as the sync (it reads games only through apply_calendar_sync here)
  select updated_at into e_change from public.games where id = g_change;
  select updated_at into e_quiet from public.games where id = g_quiet;
  select updated_at - interval '1 second' into e_stale from public.games where id = g_stale;
  select updated_at into e_canceled from public.games where id = g_canceled;

  begin
    set local role service_role;
    v_res := public.apply_calendar_sync(jsonb_build_object(
      'trigger', 'scheduled',
      'triggered_by', 'Scheduled sync',
      'season_id', s1,
      'counts', jsonb_build_object('unchanged', 4, 'games', 6),
      'inserts', jsonb_build_array(
        jsonb_build_object('division_id', d1, 'home_team_id', tm2, 'away_team_id', null, 'home_label', null, 'away_label', 'PA2',
          'location_id', loc, 'starts_at', v_start + interval '5 days', 'ends_at', v_start + interval '5 days 2 hours', 'title', 'CHK new', 'when', 'later'),
        jsonb_build_object('division_id', d1, 'home_team_id', tm2, 'away_team_id', tm3, 'home_label', null, 'away_label', null,
          'location_id', gen_random_uuid(), 'starts_at', v_start + interval '6 days', 'ends_at', v_start + interval '6 days 2 hours', 'title', 'CHK bad field', 'when', 'later')
      ),
      'updates', jsonb_build_array(
        jsonb_build_object('id', g_change, 'expected_updated_at', e_change,
          'set', jsonb_build_object('division_id', d1, 'home_team_id', tm1, 'away_team_id', tm2, 'home_label', null, 'away_label', null,
            'location_id', loc2, 'starts_at', v_start + interval '1 hour', 'ends_at', v_start + interval '3 hours'),
          'quiet', false, 'title', 'CHK changed', 'when', 'soon', 'how', 'same_day', 'changes', jsonb_build_array('Time: a -> b', 'Field: x -> y'),
          'notice_subject', 'Game changed: CHK ' || stamp, 'notice_body', 'What changed:' || E'\n' || '- Time: a -> b'),
        jsonb_build_object('id', g_quiet, 'expected_updated_at', e_quiet,
          'set', jsonb_build_object('division_id', d1, 'home_team_id', tm2, 'away_team_id', tm3, 'home_label', null, 'away_label', null,
            'location_id', loc, 'starts_at', v_start + interval '1 day', 'ends_at', v_start + interval '1 day 2 hours'),
          'quiet', true, 'title', 'CHK quiet', 'when', 'x', 'how', 'same_day', 'changes', '[]'::jsonb),
        jsonb_build_object('id', g_stale, 'expected_updated_at', e_stale,
          'set', jsonb_build_object('division_id', d1, 'home_team_id', tm1, 'away_team_id', tm3, 'home_label', null, 'away_label', null,
            'location_id', loc2, 'starts_at', v_start + interval '2 days', 'ends_at', v_start + interval '2 days 2 hours'),
          'quiet', false, 'title', 'CHK stale', 'when', 'x', 'how', 'same_day', 'changes', jsonb_build_array('Field: x -> y')),
        jsonb_build_object('id', g_canceled, 'expected_updated_at', e_canceled,
          'set', jsonb_build_object('division_id', d1, 'home_team_id', tm3, 'away_team_id', tm1, 'home_label', null, 'away_label', null,
            'location_id', loc2, 'starts_at', v_start + interval '3 days', 'ends_at', v_start + interval '3 days 2 hours'),
          'quiet', false, 'title', 'CHK canceled', 'when', 'x', 'how', 'same_day', 'changes', jsonb_build_array('Field: x -> y'))
      ),
      'held', jsonb_build_array(jsonb_build_object('key', 'k', 'title', 'CHK held', 'when', 'x', 'reasons', jsonb_build_array('r'))),
      'not_in_feed', '[]'::jsonb,
      'admin_notice', jsonb_build_object('subject', 'CHK admin notice ' || stamp, 'body', 'body'),
      'remember', jsonb_build_object('heldKeys', jsonb_build_array('k'), 'notInFeedIds', '[]'::jsonb, 'nameKeys', '[]'::jsonb)
    ));
    reset role;
  exception when others then
    reset role;
    raise exception 'apply_calendar_sync could not run at all, so the rest of this check cannot: %', sqlerrm;
  end;

  -- C2
  if exists (select 1 from public.games where season_id = s1 and away_label = 'PA2' and master_source = 'feed' and status = 'scheduled') then report := array_append(report, ('PASS  C2  a new game is added, scheduled, and marked as from the feed')::text); else report := array_append(report, ('FAIL  C2  the new game was not added as expected')::text); failures := failures + 1; end if;

  -- C3
  if (v_res->>'added')::int = 1 and exists (select 1 from public.calendar_sync_runs r where r.status = 'ok' and r.failed_games = 3) then report := array_append(report, ('PASS  C3  a game that cannot be saved is listed, and the others are still saved')::text); else report := array_append(report, ('FAIL  C3  one bad game was not handled on its own: ' || v_res::text)::text); failures := failures + 1; end if;

  -- C4
  if exists (select 1 from public.games where id = g_change and location_id = loc2 and starts_at = v_start + interval '1 hour') then report := array_append(report, ('PASS  C4  a changed game is changed')::text); else report := array_append(report, ('FAIL  C4  the changed game was not changed')::text); failures := failures + 1; end if;

  -- C5
  if exists (select 1 from public.game_assignments where game_id = g_change and status = 'assigned' and confirmed_at is null and reminded_at is null) then report := array_append(report, ('PASS  C5  its umpire must confirm again (and will be reminded again)')::text); else report := array_append(report, ('FAIL  C5  the umpire''s confirmation was kept')::text); failures := failures + 1; end if;

  -- C6
  select e.body into v_text from public.email_outbox e where e.to_email = u_mail and e.subject = 'Game changed: CHK ' || stamp and e.status = 'queued' limit 1;
  if v_text like '%What changed:%' and v_text like '%Your position: plate.%' then report := array_append(report, ('PASS  C6  the umpire is emailed what changed, with their position')::text); else report := array_append(report, ('FAIL  C6  the umpire was not emailed as expected: ' || coalesce(v_text, 'no message'))::text); failures := failures + 1; end if;

  -- C7
  if exists (select 1 from public.game_assignment_events where game_id = g_change and umpire_id = um and event = 'reconfirm_requested') then report := array_append(report, ('PASS  C7  the history says they were asked to confirm again')::text); else report := array_append(report, ('FAIL  C7  the history does not say so')::text); failures := failures + 1; end if;

  -- C8
  if (select master_source from public.games where id = g_quiet) = 'feed' and (v_res->>'changed')::int = 1 and (v_res->>'umpires_told')::int = 1 then report := array_append(report, ('PASS  C8  a quiet update (a game made by hand) is taken over without telling anyone')::text); else report := array_append(report, ('FAIL  C8  the quiet update was not handled as expected: ' || v_res::text)::text); failures := failures + 1; end if;

  -- C9
  if (select location_id from public.games where id = g_stale) = loc
     and exists (select 1 from public.calendar_sync_runs r, jsonb_array_elements(r.details->'failed') f where f->>'title' = 'CHK stale' and f->>'error' like '%changed here while%') then report := array_append(report, ('PASS  C9  a game changed here meanwhile is not overwritten, and is listed')::text); else report := array_append(report, ('FAIL  C9  a game changed meanwhile was overwritten, or not listed')::text); failures := failures + 1; end if;

  -- C10
  if (select location_id from public.games where id = g_canceled) = loc and (select status from public.games where id = g_canceled) = 'canceled'
     and exists (select 1 from public.calendar_sync_runs r, jsonb_array_elements(r.details->'failed') f where f->>'title' = 'CHK canceled' and f->>'error' like '%canceled or completed%') then report := array_append(report, ('PASS  C10  a canceled game is never changed or put back')::text); else report := array_append(report, ('FAIL  C10  a canceled game was changed')::text); failures := failures + 1; end if;

  -- C11
  select * into v_run from public.calendar_sync_runs r where r.status = 'ok' order by r.started_at desc limit 1;
  if v_run.added = 1 and v_run.changed = 1 and v_run.unchanged = 4 and v_run.held = 1 and v_run.umpires_told = 1
     and v_run.details->'remember'->'heldKeys' = '["k"]'::jsonb and jsonb_array_length(v_run.details->'changed') = 1 then report := array_append(report, ('PASS  C11  the run is written to the log, with what it did')::text); else report := array_append(report, ('FAIL  C11  the log is not as expected: ' || row_to_json(v_run)::text)::text); failures := failures + 1; end if;

  -- C12
  if exists (select 1 from public.email_outbox e where e.subject = 'CHK admin notice ' || stamp and e.to_profile_id = t_admin) then report := array_append(report, ('PASS  C12  the administrators are emailed what needs them')::text); else report := array_append(report, ('FAIL  C12  the administrators were not emailed')::text); failures := failures + 1; end if;

  ----------------------------------------------------------------
  -- 3. A sync that could not run
  ----------------------------------------------------------------

  -- C13
  begin
    delete from public.calendar_sync_runs;
    set local role service_role;
    perform public.record_calendar_sync_failure('scheduled', 'Scheduled sync', s1, 'CHK feed down ' || stamp);
    perform public.record_calendar_sync_failure('scheduled', 'Scheduled sync', s1, 'CHK feed down ' || stamp);
    reset role;
    select count(*) into n from public.calendar_sync_runs where status = 'failed' and message = 'CHK feed down ' || stamp;
    select count(*) into n2 from public.email_outbox where subject = 'Master calendar sync failed' and to_profile_id = t_admin and status = 'queued';
    if n = 2 and n2 = 1 then report := array_append(report, ('PASS  C13  a failed sync is logged each time, and administrators are emailed only the first time')::text); else report := array_append(report, ('FAIL  C13  logged ' || n || ' times, emailed ' || n2 || ' times')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C13  a failed sync is logged: ' || sqlerrm)::text); failures := failures + 1;
  end;

  ----------------------------------------------------------------
  -- 4. Settings and matched names (as an administrator)
  ----------------------------------------------------------------

  -- C14
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.save_calendar_feed_settings('webcal://calendar.example.org/feed?key=CHK', s1, true, 'America/Los_Angeles');
    reset role;
    if (select feed_url from public.calendar_feed_settings) = 'https://calendar.example.org/feed?key=CHK' and (select enabled from public.calendar_feed_settings) then report := array_append(report, ('PASS  C14  an administrator saves the settings, and webcal:// becomes https://')::text); else report := array_append(report, ('FAIL  C14  the settings were not saved as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C14  an administrator saves the settings: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C15
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.save_calendar_feed_settings('https://calendar.example.org/feed', s1, false, 'Mars/Olympus');
    reset role; report := array_append(report, ('FAIL  C15  it was allowed: an unknown time zone is refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%time zone%' then report := array_append(report, ('PASS  C15  an unknown time zone is refused')::text); else report := array_append(report, ('FAIL  C15  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C16
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.save_calendar_feed_settings(null, s1, true, 'America/Los_Angeles');
    reset role; report := array_append(report, ('FAIL  C16  it was allowed: switching on with no feed address is refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%switch the sync on%' then report := array_append(report, ('PASS  C16  switching on with no feed address is refused')::text); else report := array_append(report, ('FAIL  C16  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C17
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.save_calendar_feed_name('team', 'MAJ 02 - Kays', s1, tm2, null, false);
    perform public.save_calendar_feed_name('team', 'MAJ 02 - Kays', s1, tm3, null, false); -- a second save replaces the first
    perform public.save_calendar_feed_name('team', 'PA 2', s1, null, null, true);
    perform public.save_calendar_feed_name('field', 'Orion > A', null, null, loc, false);
    reset role;
    if (select team_id from public.calendar_feed_names where kind = 'team' and feed_key = 'maj02kays' and season_id = s1) = tm3
       and exists (select 1 from public.calendar_feed_names where kind = 'team' and feed_key = 'pa2' and is_outside and team_id is null)
       and exists (select 1 from public.calendar_feed_names where kind = 'field' and feed_key = 'oriona' and location_id = loc) then report := array_append(report, ('PASS  C17  an administrator matches team, outside-team and field names (a new match replaces the old)')::text); else report := array_append(report, ('FAIL  C17  the names were not saved as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C17  an administrator matches names: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C23
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.save_calendar_feed_name('team', 'TB 01 - Lee', s1, null, null, false, true);
    reset role;
    if exists (select 1 from public.calendar_feed_names where kind = 'team' and feed_key = 'tb01lee' and season_id = s1 and is_ignored and not is_outside and team_id is null) then report := array_append(report, ('PASS  C23  an administrator marks a team name as not tracked (its games are skipped)')::text); else report := array_append(report, ('FAIL  C23  the not-tracked name was not saved as expected')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C23  an administrator marks a team name as not tracked: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C18
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.save_calendar_feed_name('team', 'MAJ 03 - Borg', s1, tm_other, null, false);
    reset role; report := array_append(report, ('FAIL  C18  it was allowed: a team from another season is refused')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%not in this season%' then report := array_append(report, ('PASS  C18  a team from another season is refused')::text); else report := array_append(report, ('FAIL  C18  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  ----------------------------------------------------------------
  -- 5. Who may do what
  ----------------------------------------------------------------

  -- C19
  begin
    perform set_config('request.jwt.claim.sub', t_admin::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', t_admin, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.apply_calendar_sync(jsonb_build_object('season_id', s1));
    reset role; report := array_append(report, ('FAIL  C19  it was allowed: even an administrator cannot apply a sync directly (only the sync can)')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C19  even an administrator cannot apply a sync directly (only the sync can)')::text); else report := array_append(report, ('FAIL  C19  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C20
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    perform public.save_calendar_feed_settings('https://calendar.example.org/other', s1, false, 'America/Los_Angeles');
    reset role; report := array_append(report, ('FAIL  C20  it was allowed: someone who is not an administrator cannot change the settings')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlerrm like '%Only scheduling administrators%' then report := array_append(report, ('PASS  C20  someone who is not an administrator cannot change the settings')::text); else report := array_append(report, ('FAIL  C20  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  -- C21
  begin
    perform set_config('request.jwt.claim.sub', x_acct::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', x_acct, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.calendar_feed_settings;
    select count(*) into n2 from public.calendar_sync_runs;
    reset role;
    if n = 0 and n2 = 0 then report := array_append(report, ('PASS  C21  ...nor read the settings (the feed address has a key in it) or the log')::text); else report := array_append(report, ('FAIL  C21  they could read ' || n || ' settings rows and ' || n2 || ' log rows')::text); failures := failures + 1; end if;
  exception when others then
    reset role; report := array_append(report, ('FAIL  C21  reading as an ordinary user failed: ' || sqlerrm)::text); failures := failures + 1;
  end;

  -- C22
  begin
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    perform public.record_calendar_sync_failure('scheduled', 'x', s1, 'x');
    reset role; report := array_append(report, ('FAIL  C22  it was allowed: a signed-out visitor cannot write to the log')::text); failures := failures + 1;
  exception when others then
    reset role;
    if sqlstate = '42501' then report := array_append(report, ('PASS  C22  a signed-out visitor cannot write to the log')::text); else report := array_append(report, ('FAIL  C22  refused, but not for the right reason: ' || sqlerrm)::text); failures := failures + 1; end if;
  end;

  raise exception E'\n\nCALENDAR SYNC CHECK (nothing was saved; your real data and settings are unchanged)\n%\n\nFailures: %\n',
    array_to_string(report, E'\n'), failures;
end
$$;
