-- Automatic sign-out after a period of no activity.
--
-- Two settings in app_settings (the table created by the demo clock migration):
--
--   idle_logout_minutes          for administrators (anyone with a role beyond umpiring)
--   idle_logout_minutes_umpire   for umpire-only accounts
--
-- Each is a whole number of minutes from 1 to 480, or 0 for "never sign out
-- automatically". The app warns a minute before signing someone out.
--
-- BOTH START AT 30 MINUTES (for demonstrations). Later, something like this is
-- suggested:
--     administrators: 10 minutes
--     umpires:        much longer, or 0 (off). An umpire at a field with the
--                     phone in a pocket should not have to sign in again just
--                     to check in to a game.
--
-- TO CHANGE ONE (Supabase SQL Editor; nobody can change these from the app):
--     update public.app_settings set value = '10' where key = 'idle_logout_minutes';
--     update public.app_settings set value = '0'  where key = 'idle_logout_minutes_umpire';
-- People already signed in pick up a change the next time they load the app.
-- (If a setting is missing, the app uses 30.)

begin;

insert into public.app_settings (key, value) values
  ('idle_logout_minutes', '30'),
  ('idle_logout_minutes_umpire', '30')
on conflict (key) do nothing;

-- These two settings must be a whole number of minutes from 0 to 480, so a
-- slip in the SQL Editor cannot leave a nonsense value behind.
alter table public.app_settings
  add constraint app_settings_idle_logout_valid
  check (
    key not in ('idle_logout_minutes', 'idle_logout_minutes_umpire')
    or case when value ~ '^[0-9]{1,3}$' then value::integer between 0 and 480 else false end
  );

commit;
