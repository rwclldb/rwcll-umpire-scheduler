-- The every-minute job for URGENT messages.
--
-- Run this ONCE per Supabase project (test first, then live), in the SQL Editor, AFTER:
--   1. the sender secret and project address are in the Vault (scripts\set-sender-secret.ps1 puts them there;
--      check with supabase/tests/cron_jobs_check.sql),
--   2. applying 20261112100000_add_urgent_messages.sql, and
--   3. redeploying the send-outbox function:  npx supabase functions deploy send-outbox --no-verify-jwt
--
-- Nothing needs replacing: it uses the secrets that are already in the Vault.
--
-- What it does: once a minute it asks the sender for URGENT messages only (an umpire declining, a field closed,
-- a game canceled or moved, within two hours of the game). If none are waiting, the sender does nothing at all.
-- Everything else still goes in the usual 5-minute batch.
--
-- It sends nothing by itself while email_mode is 'off'. Texts only go out if sms_mode is not 'off'.

select cron.schedule(
  'send-outbox-urgent',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-outbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sender-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sender_secret')
    ),
    body := '{"only": "urgent"}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);

-- Look at it:    select jobid, jobname, schedule, active from cron.job where jobname = 'send-outbox-urgent';
-- Stop it:       select cron.unschedule('send-outbox-urgent');
-- Texts off:     update public.sending_settings set value = 'off' where key = 'sms_mode';     (email carries on)
