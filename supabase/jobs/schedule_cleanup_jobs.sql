-- Nightly housekeeping for the scheduled jobs themselves.
--
-- Run this ONCE per Supabase project (test first, then live), in the SQL Editor, after the other
-- jobs files. Running it again just replaces the job (same name), so that is harmless.
--
-- Why: pg_cron keeps a row for every run of every job in cron.job_run_details. With send-outbox every
-- 5 minutes that is about 300 rows a day, forever. This keeps the last 30 days (plenty for looking into
-- a problem) and deletes the rest.
--
-- TIMES: schedules are in UTC. 10:45 UTC is about 3 AM Pacific.

select cron.schedule(
  'purge-cron-history',
  '45 10 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '30 days' $$
);

-- Look at it:   select jobid, jobname, schedule, active from cron.job where jobname = 'purge-cron-history';
-- How big:      select count(*), min(start_time) from cron.job_run_details;
-- Stop it:      select cron.unschedule('purge-cron-history');
