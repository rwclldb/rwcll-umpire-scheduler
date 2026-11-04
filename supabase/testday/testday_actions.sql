-- RWCLL TEST DAY: ACTIONS. THESE CHANGE DATA. TEST DATABASE ONLY.
--
-- Run ONE section at a time, only when its step in the script says so:
--   select the section's text (from its heading line to the last line before the next heading) and press Run.
-- Do NOT RUN THE WHOLE FILE. (It would switch email settings, queue reminders and make Casey Turner an adult, all at once.)
-- If you do by accident: run testday_cleanup.sql, and set the email settings again in step 0.3.

-- SAFETY: if you run the WHOLE file, this block stops everything with an error, so nothing below runs.
-- When you select ONE section's text and press Run, this block is not part of what runs.
do $$
begin
  raise exception 'STOP: you ran the WHOLE testday_actions.sql file. Nothing was changed. Select ONE section (its heading and its lines, down to the next heading) and press Run.';
end
$$;

-- ============================================================ 0.3  ACTION: email safe mode (one block: change PUT-YOUR-REAL-EMAIL-HERE to the inbox you read, then run the whole block)
update public.sending_settings set value = 'safe' where key = 'email_mode';
update public.sending_settings set value = 'PUT-YOUR-REAL-EMAIL-HERE' where key = 'email_safe_redirect';
update public.sending_settings set value = 'https://rwclldb.github.io/rwcll-umpire-scheduler/' where key = 'app_url';
-- clear the safe list, so that NOBODY receives their own messages: every message goes to the redirect address only
-- (you can put your addresses back in email_safe_allowlist after the test)
update public.sending_settings set value = '' where key = 'email_safe_allowlist';
select key, value from public.sending_settings where key in ('email_mode', 'email_safe_redirect', 'email_safe_allowlist', 'app_url') order by key;
-- email_mode must say safe, the redirect must be YOUR address, and email_safe_allowlist must be empty.
-- Every message goes to the redirect address, marked [TEST for ...].

-- ============================================================ 4.2  ACTION: queue the day-before reminders as if it were Fri Nov 13, 9:00 AM
select public.queue_game_reminders(p_now := '2026-11-13 09:00:00-08'::timestamptz) as reminders_queued;
-- Should equal the number from the check in step 4.1 (15). Running it a second time returns 0 (nobody is reminded twice).

-- ============================================================ 8.5  ACTION: Casey Turner turns 18 today, then the daily job runs
update public.umpire_private_details
set birth_date = ((now() at time zone 'America/Los_Angeles')::date - interval '18 years')::date
where umpire_id = '20000000-0000-0000-0000-000000000033';
select public.convert_turned_18() as umpires_changed;
-- 1.  (If it says more than 1, a seed umpire had already turned 18: look at the family log below.)
