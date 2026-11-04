-- RWCLL TEST DAY: cleanup. TEST DATABASE ONLY. NEVER RUN THIS ON THE LIVE PROJECT.
--
-- Puts the test database back to where the seed leaves it, so the test day can be run again:
--   * every queued and sent message is deleted
--   * earnings, adjustments, payrolls and the money log are deleted, and the two payees set in step 7.6 are cleared
--   * consents, the family log, and parent links made during the test are removed; links ended by the test are restored
--   * Rita Miller goes back to a waiting registration, and Casey Turner back to a 17-year-old youth
--   * assignments made on Nov 14 and Nov 21 during the test are removed, and arrivals, reminders, running-late reports
--     and any notes or reports whose text starts with "TEST:" are removed
--   * the Kennedy Middle School rainout is undone
--
-- It does NOT remove accounts that testers created by signing up (delete those in Supabase: Authentication, Users),
-- and it does not change the email settings (safe mode stays on).
-- It has not been run by the person who wrote it: run it on TEST, then run testday_db_checks.sql section 0.2.

begin;

-- messages
delete from public.email_outbox;
delete from public.sms_outbox;

-- money
delete from public.payroll_payments;
delete from public.payroll_lines;
update public.earnings set payroll_id = null;
update public.earning_adjustments set payroll_id = null;
delete from public.payrolls;
delete from public.earnings;
delete from public.earning_adjustments;
delete from public.money_log;
update public.umpires set payee_profile_id = null
where id in ('20000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000018');   -- Oliver Miller, Elijah Davis

-- families and consent
delete from public.parental_consents;
delete from public.family_log;
delete from public.family_links where created_by_name <> 'Seed data';
update public.family_links set ended_at = null, ended_by_name = null where created_by_name = 'Seed data';
delete from public.consent_wordings where version not in ('2026-11-sample', '2026-11-demo');

-- Rita Miller back to a waiting parent registration
update public.profiles set account_status = 'pending', approved_at = null, approved_by = null
where id = '90000000-0000-0000-0000-000000000005';
delete from public.user_roles where user_id = '90000000-0000-0000-0000-000000000005';

-- Casey Turner back to a youth who is about to turn 18
update public.umpires set classification = 'youth', payee_profile_id = '90000000-0000-0000-0000-000000000006'
where id = '20000000-0000-0000-0000-000000000033';
update public.umpire_private_details set birth_date = (current_date - interval '17 years 11 months')::date
where umpire_id = '20000000-0000-0000-0000-000000000033';
delete from public.user_roles where user_id = '10000000-0000-0000-0000-000000000033' and role_id = 'adult_umpire';
insert into public.user_roles (user_id, role_id) values ('10000000-0000-0000-0000-000000000033', 'youth_umpire') on conflict do nothing;

-- the rainout at Kennedy Middle School: put its games back, then remove the closure
update public.games g set status = c.previous_status
from public.field_closure_games c
join public.field_closures fc on fc.id = c.closure_id
where g.id = c.game_id and fc.location_id = 'e0000000-0000-0000-0000-000000000003' and fc.created_at > now() - interval '3 days';
delete from public.field_closures
where location_id = 'e0000000-0000-0000-0000-000000000003' and created_at > now() - interval '3 days';

-- assignments made during the test (the seeded ones have ids starting 40000000-), arrivals, reminders, running late
delete from public.game_assignments
where id::text not like '40000000-%'
  and game_id in (select id from public.games where (starts_at at time zone 'America/Los_Angeles')::date in ('2026-11-14', '2026-11-21'));
update public.game_assignments set attendance = null, arrived_at = null, attendance_marked_by = null, attendance_marked_at = null
where game_id in (select id from public.games where (starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14');
update public.game_assignments set reminded_at = null where reminded_at is not null;
delete from public.running_late_reports;

-- notes and reports typed during the test (their text starts with "TEST:")
delete from public.game_notes where body like 'TEST:%';
delete from public.game_reports where body like 'TEST:%';
delete from public.outside_reports where body like 'TEST:%';

commit;
