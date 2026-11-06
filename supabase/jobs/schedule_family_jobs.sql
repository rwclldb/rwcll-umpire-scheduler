-- Scheduled job for families: turn youth umpires into adult umpires on their 18th birthday.
--
-- Run this ONCE per Supabase project (test first, then live), in the SQL Editor, AFTER applying
-- 20261110100000_add_family_notices_and_wording.sql. It uses the same pg_cron that
-- schedule_email_jobs.sql already set up, so nothing else needs switching on.
--
-- Every day at 15:20 UTC (about 8:20 AM Pacific) it changes every youth umpire who has turned 18
-- into an adult umpire. It tells their parents (they will no longer be copied), tells the new
-- adult to set up their own payment account, and tells the administrators who was changed. It is
-- safe to run every day: it changes nobody twice.

select cron.schedule('convert-turned-18', '20 15 * * *', $$ select public.convert_turned_18(); $$);

-- To run it by hand right now:   select public.convert_turned_18();
-- To see what happened lately:
--     select j.jobname, d.status, d.return_message, d.start_time
--     from cron.job_run_details d join cron.job j on j.jobid = d.jobid
--     where j.jobname = 'convert-turned-18' order by d.start_time desc limit 10;
-- To stop it:                    select cron.unschedule('convert-turned-18');
