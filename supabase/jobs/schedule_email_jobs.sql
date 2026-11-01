-- Scheduled jobs for sending messages and reminders.
--
-- Run this ONCE per Supabase project (test first, then live), in the SQL Editor,
-- AFTER:
--   1. applying 20261106100000_add_email_sending.sql, and
--   2. deploying the send-outbox function and setting its secrets
--      (see docs/EMAIL-SENDING.md).
--
-- BEFORE YOU RUN IT, replace the two placeholders below:
--   <PROJECT-REF>     the project's reference, for example tayveudoxrdkqnmcjrtu (it is
--                     in the project's web address and under Project Settings)
--   <SENDER-SECRET>   the SAME long random value you gave the function as SENDER_SECRET
--
-- Also, in the dashboard under Database > Extensions, switch ON:  pg_cron  and  pg_net
-- (the secrets are kept in Supabase's Vault, which is on by default).
--
-- Nothing is sent just because these are scheduled: the sender still does nothing
-- while email_mode is 'off', and in 'safe' mode only emails the safe list.
--
-- TIMES: schedules are in UTC. 15:00 UTC is 8:00 AM Pacific in summer (daylight
-- time) and 7:00 AM in winter.

-- ---- the two secrets the sender call needs (kept in the Vault, not in this file's jobs)
select vault.create_secret('2xP9kL4vN8cR1yB6tHq3WfJ0dM9sK2pX5uEr7C4n', 'sender_secret');
select vault.create_secret('https://mucsujjpfefrfxystxse.supabase.co', 'project_url');

-- ---- every 5 minutes: send whatever is waiting
select cron.schedule(
  'send-outbox',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sender-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sender_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- ---- every day: warn the administrators about assignments nobody has confirmed
select cron.schedule('queue-unconfirmed-warnings', '0 15 * * *', $$ select public.queue_unconfirmed_warnings(); $$);

-- ---- every day: the summary of games umpires took themselves
select cron.schedule('queue-self-assign-digest', '30 15 * * *', $$ select public.queue_self_assign_digest(); $$);

-- ---- every hour: remind umpires about a game the next day (once each)
select cron.schedule('queue-game-reminders', '10 * * * *', $$ select public.queue_game_reminders(); $$);

-- ---- every night: delete reports whose season ended over a year ago
select cron.schedule('purge-expired-reports', '15 10 * * *', $$ select public.purge_expired_reports(); $$);

-- ============================================================ looking after them
-- See what is scheduled:
--     select jobid, jobname, schedule, active from cron.job order by jobname;
-- See what happened lately (and any error):
--     select j.jobname, d.status, d.return_message, d.start_time
--     from cron.job_run_details d join cron.job j on j.jobid = d.jobid
--     order by d.start_time desc limit 20;
-- Stop one:
--     select cron.unschedule('send-outbox');
-- Stop ALL sending at once, without touching the jobs:
--     update public.sending_settings set value = 'off' where key in ('email_mode', 'sms_mode');
