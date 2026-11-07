-- RWCLL: TURN MESSAGES BACK ON after testing_pause_messages.sql. TEST PROJECT ONLY.
--
-- Run the whole file in the Supabase SQL Editor of the TEST project.
--
-- It puts email back in SAFE mode (every message goes to the redirect address you set in step 0.3 of the
-- test day, never to real people), and schedules the three message-creating jobs again, exactly as
-- schedule_email_jobs.sql does. (The job that sends the queue was never removed.)
--
-- It refuses to run if email_mode is 'live'.
--
-- It does NOT change email_safe_redirect or email_safe_allowlist. Check them afterwards:
--   select key, value from public.sending_settings where key like 'email_safe%' or key = 'email_mode';

do $$
begin
  if (select value from public.sending_settings where key = 'email_mode') = 'live' then
    raise exception 'STOP: email_mode is live, so this project sends to real people. This file is for the TEST project only. Nothing was changed.';
  end if;
  if coalesce((select value from public.sending_settings where key = 'email_safe_redirect'), '') = '' then
    raise exception 'STOP: email_safe_redirect is empty. Set it first (step 0.3 of the test day), so safe mode has somewhere to send everything. Nothing was changed.';
  end if;
end
$$;

update public.sending_settings set value = 'safe' where key = 'email_mode';

select cron.schedule('queue-unconfirmed-warnings', '0 15 * * *', $$ select public.queue_unconfirmed_warnings(); $$);
select cron.schedule('queue-self-assign-digest', '30 15 * * *', $$ select public.queue_self_assign_digest(); $$);
select cron.schedule('queue-game-reminders', '10 * * * *', $$ select public.queue_game_reminders(); $$);

select (select value from public.sending_settings where key = 'email_mode') as email_mode,
       (select value from public.sending_settings where key = 'email_safe_redirect') as redirect_address,
       (select count(*) from cron.job where jobname in ('queue-game-reminders', 'queue-unconfirmed-warnings', 'queue-self-assign-digest')) as message_jobs_scheduled;
