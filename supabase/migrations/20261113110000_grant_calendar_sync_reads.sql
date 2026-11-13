-- The master calendar sync function runs as service_role. On this project service_role is not given the
-- tables automatically (each feature grants exactly what it needs), so give the sync what it reads.
-- It only READS these directly; every change goes through apply_calendar_sync (security definer).
--
-- Run in the SQL Editor after 20261113100000_add_calendar_feed_sync.sql. Safe to run again.

grant select on table
  public.seasons,
  public.divisions,
  public.locations,
  public.teams,
  public.games,
  public.game_assignments,
  public.calendar_feed_settings,
  public.calendar_feed_names,
  public.calendar_sync_runs
to service_role;
