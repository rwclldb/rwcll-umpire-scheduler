-- The twice-a-day job for the MASTER CALENDAR SYNC.
--
-- Run this ONCE per Supabase project (test first, then live), in the SQL Editor, AFTER:
--   1. the sender secret and project address are in the Vault. They are if email sending already works
--      on this project (scripts\set-sender-secret.ps1 puts them there). To check:
--        select name from vault.secrets where name in ('sender_secret', 'project_url');   -- two rows
--   2. applying 20261113100000_add_calendar_feed_sync.sql, and
--   3. deploying the sync function:  npx supabase functions deploy sync-calendar --no-verify-jwt
--
-- Nothing needs replacing: it uses the secrets that are already in the Vault.
--
-- What it does: at about 6 in the morning and 6 in the evening it asks the sync function to download the
-- master calendar's feed and bring the games up to date. While the sync is switched off (Games, Master
-- calendar sync, Settings) the function does nothing at all.
--
-- TIMES: schedules are in UTC. 14:00 and 02:00 UTC are 6:00 AM and 6:00 PM Pacific in winter
-- (7:00 AM and 7:00 PM in summer).

select cron.schedule(
  'sync-calendar',
  '0 2,14 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-calendar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sender-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sender_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- Look at it:     select jobid, jobname, schedule, active from cron.job where jobname = 'sync-calendar';
-- More often:     select cron.alter_job((select jobid from cron.job where jobname = 'sync-calendar'), schedule := '0 2,14,20 * * *');
-- Stop it:        select cron.unschedule('sync-calendar');
-- The sync's own log is in the app (Games, Master calendar sync), or:
--                 select started_at, status, added, changed, held, not_in_feed, message from public.calendar_sync_runs order by started_at desc limit 10;
