-- RWCLL: PAUSE ALL MESSAGES while you test, and start from a clean slate. TEST PROJECT ONLY.
--
-- Run the whole file in the Supabase SQL Editor of the TEST project. It is safe to run again whenever
-- you want a clean slate (messages queued by assignments you make while testing pile up as "Waiting").
--
-- It refuses to run if email_mode is 'live' (a project that sends to real people), so it does nothing there.
--
-- What it does:
--   1. turns email and text sending OFF (nothing is sent; anything queued just stays "Waiting")
--   2. stops the three jobs that create messages by themselves: the HOURLY game reminders and the two DAILY
--      jobs (unconfirmed warnings, the self-assign digest). The job that sends the queue is left alone: with
--      sending off it does nothing.
--   3. deletes every queued or sent message (emails and texts)
--   4. clears "already reminded", so reminders can be tested again from scratch
--
-- To turn it all back on afterwards: testing_resume_messages.sql

do $$
begin
  if (select value from public.sending_settings where key = 'email_mode') = 'live' then
    raise exception 'STOP: email_mode is live, so this project sends to real people. This file is for the TEST project only. Nothing was changed.';
  end if;
end
$$;

update public.sending_settings set value = 'off' where key in ('email_mode', 'sms_mode');

-- (nothing happens, and there is no error, for a job that is not scheduled)
select cron.unschedule(jobid)
from cron.job
where jobname in ('queue-game-reminders', 'queue-unconfirmed-warnings', 'queue-self-assign-digest');

delete from public.email_outbox;
delete from public.sms_outbox;

update public.game_assignments set reminded_at = null where reminded_at is not null;

-- The result: sending off, no messages left, and none of the three message-creating jobs still scheduled.
select (select value from public.sending_settings where key = 'email_mode') as email_mode,
       (select value from public.sending_settings where key = 'sms_mode') as sms_mode,
       (select count(*) from public.email_outbox) as messages_left,
       (select count(*) from cron.job where jobname in ('queue-game-reminders', 'queue-unconfirmed-warnings', 'queue-self-assign-digest')) as message_jobs_still_scheduled;
