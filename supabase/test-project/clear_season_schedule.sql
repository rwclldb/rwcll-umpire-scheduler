-- RWCLL, TEST PROJECT ONLY: delete the games of the season the master calendar sync uses, so the next
-- "Sync now" loads the schedule fresh from the master calendar.
--
-- DESTRUCTIVE. It refuses to run anywhere but the TEST project (it checks the project address stored in
-- the Vault). There is deliberately no button for this in the app.
--
-- Which season: the one chosen in Games > Master calendar sync > Settings.
--
-- What it deletes, for that season's games:
--   the games, and with them their assignments, assignment history, notes and game-day extras;
--   their post-game reports and earnings (these would otherwise block the delete);
--   the sync log (so the next sync starts fresh, with nothing "remembered").
-- What it keeps: teams, fields, umpires, accounts, matched names, the sync settings, other seasons.
-- Nobody is emailed: deleting games sends no messages.
--
-- PAST GAMES DO NOT COME BACK: the sync never adds a game that has already started. To clear only
-- games that have not started yet, change  only_future  below to true.
--
-- Afterwards: Games > Master calendar sync > Sync now (expect some names to match on the first run).

do $$
declare
  only_future boolean := false;          -- true: keep games that have already started

  test_url constant text := 'https://mucsujjpfefrfxystxse.supabase.co';
  v_url text;
  v_season uuid;
  v_season_name text;
  v_games uuid[];
  v_reports bigint; v_earnings bigint; v_runs bigint;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
  if v_url is distinct from test_url then
    raise exception 'STOP: this is not the TEST project (its address is %). Nothing was changed.', coalesce(v_url, 'not set');
  end if;

  select s.season_id, se.name into v_season, v_season_name
  from public.calendar_feed_settings s
  left join public.seasons se on se.id = s.season_id;
  if v_season is null then
    raise exception 'STOP: no season is chosen in the master calendar sync settings. Nothing was changed.';
  end if;

  select coalesce(array_agg(g.id), '{}') into v_games
  from public.games g
  where g.season_id = v_season and (not only_future or g.starts_at > now());

  delete from public.game_reports where game_id = any (v_games);
  get diagnostics v_reports = row_count;
  delete from public.earnings where game_id = any (v_games);
  get diagnostics v_earnings = row_count;
  delete from public.games where id = any (v_games);
  delete from public.calendar_sync_runs;
  get diagnostics v_runs = row_count;

  create temp table if not exists clear_season_result (what text, how_many text) on commit drop;
  insert into clear_season_result values
    ('season', v_season_name),
    ('games deleted', cardinality(v_games)::text),
    ('reports deleted', v_reports::text),
    ('earnings deleted', v_earnings::text),
    ('sync log rows deleted', v_runs::text);
end
$$;

select * from clear_season_result;
