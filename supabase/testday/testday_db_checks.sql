-- RWCLL TEST DAY: database checks. READ-ONLY: nothing in this file changes any data.
-- Run these in the Supabase SQL Editor of the TEST project, at the step number in each heading.
-- The editor shows only the LAST query's result: to see a particular query, select just its text and press Run.
-- (The three steps that CHANGE data, 0.3, 4.2 and 8.5, are in a separate file: testday_actions.sql.)
-- The comment after each query says what you should see.

-- ============================================================ 0.1  accounts exist
select count(*) as accounts, 41 as expected
from auth.users where email like '%@rwcll.test';        -- 30 umpires + 10 parents + Casey Turner

select value as demo_clock_allowed from public.app_settings where key = 'demo_clock_allowed';   -- true

-- ============================================================ 0.2  starting state (every row: n should equal expected)
select 'games on Nov 14' as what, count(*) as n, 24 as expected
from public.games where (starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14'
union all select 'assignments on Nov 14', count(*), 17
from public.game_assignments a join public.games g on g.id = a.game_id
where (g.starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14'
union all select 'youth pay rates (6 divisions x plate and field)', count(*), 12 from public.pay_rates r where r.classification = 'youth' and r.position in ('plate', 'field') and r.effective_on = '2026-09-12'
union all select 'adult pay rates', count(*), 0 from public.pay_rates r where r.classification = 'adult'
union all select 'earnings', count(*), 0 from public.earnings
union all select 'payrolls', count(*), 0 from public.payrolls
union all select 'queued or sent emails', count(*), 0 from public.email_outbox
union all select 'consents', count(*), 0 from public.parental_consents
union all select 'waiting parent registrations (Rita Miller)', count(*), 1
from public.profiles where registration_kind = 'parent_guardian' and account_status = 'pending'
union all select 'Sam Young linked to Maria Smith', count(*), 1
from public.family_links l join public.umpires u on u.id = l.umpire_id join public.profiles p on p.id = l.parent_id
where u.display_name = 'Sam Young' and p.display_name = 'Maria Smith' and l.ended_at is null
union all select 'Casey Turner is a youth', count(*), 1
from public.umpires where display_name = 'Casey Turner' and classification = 'youth';
-- If any row is wrong, run testday_cleanup.sql and then this check again.

-- ============================================================ 1.7  the new people
select p.display_name, p.email, p.account_status, string_agg(ur.role_id, ', ') as roles
from public.profiles p left join public.user_roles ur on ur.user_id = p.id
where p.display_name like 'Test %' or p.display_name = 'Rita Miller'
group by p.display_name, p.email, p.account_status order by 1;
-- The new umpire (named "Test ..."): approved, with the adult_umpire role.  Rita Miller: approved, parent_guardian.

select u.display_name as child, p.display_name as parent, l.relationship, l.created_by_name
from public.family_links l join public.umpires u on u.id = l.umpire_id join public.profiles p on p.id = l.parent_id
where u.display_name = 'Oliver Miller' and l.ended_at is null;
-- One row: Oliver Miller / Rita Miller / mother, made by the person who linked her.

-- ============================================================ 2.x  who is assigned on Nov 14 (run after steps 2.4 to 2.8, and any time)
select (g.starts_at at time zone 'America/Los_Angeles')::time as local_start, u.display_name, a.position, a.status, a.attendance, a.self_assigned
from public.game_assignments a join public.games g on g.id = a.game_id join public.umpires u on u.id = a.umpire_id
where (g.starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14'
order by 1, 3;
-- Before Phase 2 there are 17 rows. After Phase 2 you also see Liam Smith (plate, 9:00) and Michael Chang's new plate game at 9:00,
-- on top of his two seeded games (plate 12:30 and plate 17:00): 19 rows in all.

-- ============================================================ 3.6  consent
select u.display_name as child, p.display_name as parent, c.text_version, c.given_at, c.withdrawn_at
from public.parental_consents c join public.umpires u on u.id = c.umpire_id join public.profiles p on p.id = c.parent_id
order by c.given_at;
-- After step 3.3: one row, Sam Young / Maria Smith / 2026-11-demo, not withdrawn.

-- ============================================================ mail  the email queue (newest first; run it at any time)
select created_at at time zone 'America/Los_Angeles' as local_time, status, to_email, left(subject, 90) as subject, last_error
from public.email_outbox order by created_at desc limit 40;
-- status 'queued' = waiting for the sender; 'sent' = sent to YOUR inbox (because of safe mode); 'failed' shows why.

-- ============================================================ 4.0a  SESSION 2 STARTING CHECK (the results of Session 1 must still be there)
select 'Liam Smith is the plate umpire of a Nov 14 game' as what, count(*) as n, 1 as expected
from public.game_assignments a join public.games g on g.id = a.game_id join public.umpires u on u.id = a.umpire_id
where u.display_name = 'Liam Smith (Youth)' and a.position = 'plate' and (g.starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14'
union all select 'Michael Chang has three Nov 14 games (9:00 new, 12:30 and 17:00 seeded)', count(*), 3
from public.game_assignments a join public.games g on g.id = a.game_id join public.umpires u on u.id = a.umpire_id
where u.display_name = 'Michael Chang' and (g.starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14'
union all select 'Sam Young has his mother''s consent', count(*), 1
from public.parental_consents c join public.umpires u on u.id = c.umpire_id where u.display_name = 'Sam Young' and c.withdrawn_at is null
union all select 'Sam Young is assigned to a Nov 14 game', count(*), 1
from public.game_assignments a join public.games g on g.id = a.game_id join public.umpires u on u.id = a.umpire_id
where u.display_name = 'Sam Young' and (g.starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14'
union all select 'Rita Miller is approved and linked to Oliver Miller', count(*), 1
from public.family_links l join public.umpires u on u.id = l.umpire_id join public.profiles p on p.id = l.parent_id
where u.display_name = 'Oliver Miller' and p.display_name = 'Rita Miller' and p.account_status = 'approved' and l.ended_at is null
union all select 'the new Test umpire is approved', count(*), 1
from public.profiles where display_name like 'Test %' and account_status = 'approved'
union all select 'email is in safe mode', count(*), 1
from public.sending_settings where key = 'email_mode' and value = 'safe';
-- Every row: n = expected. A row that is wrong means a Session 1 step did not happen (or the test was cleaned up
-- between sessions): do that step quickly by hand (it is on the sheet of the person named in the row), then run this again.

-- ============================================================ 4.1  how many reminders to expect
select count(*) as assignments_to_remind
from public.game_assignments a join public.games g on g.id = a.game_id
where g.status = 'scheduled' and a.reminded_at is null
  and g.starts_at >  '2026-11-13 09:00:00-08'::timestamptz + interval '20 hours'
  and g.starts_at <= '2026-11-13 09:00:00-08'::timestamptz + interval '28 hours';
-- 15: the 12 seeded assignments on games that start by 1:00 PM, plus Liam, Michael Chang's new 9:00 game and Sam Young.
-- (The 5 seeded assignments on the games at 3:30 PM and 5:00 PM are outside the reminder window, so they wait.)

-- ============================================================ 5.x  arrivals and late marks on Nov 14
select (g.starts_at at time zone 'America/Los_Angeles')::time as game_start, u.display_name, a.position, a.attendance,
       a.arrived_at at time zone 'America/Los_Angeles' as arrived_local
from public.game_assignments a join public.games g on g.id = a.game_id join public.umpires u on u.id = a.umpire_id
where (g.starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14' and a.attendance is not null
order by 1;
-- Liam Smith: arrived about 08:50 (on time).  Michael Chang's 12:30 game: arrived about 12:20.  The stand-in for the 9:00 AA game: arrived about 09:12 (late).

select (g.starts_at at time zone 'America/Los_Angeles')::time as game_start, t1.name as home, t2.name as away, g.status
from public.games g
join public.teams t1 on t1.id = g.home_team_id join public.teams t2 on t2.id = g.away_team_id
where (g.starts_at at time zone 'America/Los_Angeles')::date = '2026-11-14' and g.status = 'canceled';
-- While the field is closed: the 11:00 A-Mets vs A-Phillies game (Kennedy Middle School) is canceled. After "Reopen" it is gone from this list.

select c.reason, c.closes_from at time zone 'America/Los_Angeles' as from_local, c.closes_to at time zone 'America/Los_Angeles' as to_local, c.reopened_at
from public.field_closures c order by c.created_at desc limit 3;

select n.admin_only, left(n.body, 70) as note, n.author_name
from public.game_notes n where n.body like 'TEST:%' order by n.created_at;
-- Two notes: one visible to umpires (admin_only = false) and one admin_only = true.

select m.minutes, u.display_name, m.reported_at at time zone 'America/Los_Angeles' as reported_local
from public.running_late_reports m join public.umpires u on u.id = m.umpire_id;

-- ============================================================ 6.x  reports
select author_name, category, left(body, 60) as report from public.game_reports order by created_at desc limit 5;
select entered_by_name, source_role, left(body, 60) as report from public.outside_reports order by created_at desc limit 5;

-- ============================================================ 7.2  earnings worked out
select count(*) as earnings, sum(amount_cents) / 100.0 as dollars
from public.earnings where voided_at is null;
-- 127 earnings, 5475.00 dollars (after step 7.2 and before any payroll changes).

-- ============================================================ 7.4 to 7.8  the payroll
select p.status, p.period_start, p.period_end, p.total_cents / 100.0 as total_dollars
from public.payrolls p order by p.created_at desc;
-- After 7.4: draft, 5479.50.  After 7.7: approved.

select m.payee_name, m.umpire_count, m.amount_cents / 100.0 as dollars, m.status, m.method, m.reference
from public.payroll_payments m order by m.payee_name;
-- After approval: 10 families.  Maria Smith 244.50; Dana Johnson 450.00; Chris Brown 875.00; Rosa Garcia 275.00; Rita Miller 275.00;
-- Pat Nguyen 700.00; Lee Kim 450.00; Sue Patel 685.00; Tom Reyes 700.00; Ana Silva 825.00.  Maria's shows paid / check / TEST-1001 after step 7.8.

-- ============================================================ 7.12  reconciliation (the three numbers must agree)
select p.total_cents / 100.0 as payroll_total,
       (select coalesce(sum(m.amount_cents), 0) from public.payroll_payments m where m.payroll_id = p.id) / 100.0 as payments_total,
       (select coalesce(sum(e.amount_cents), 0) from public.earnings e where e.payroll_id = p.id and e.voided_at is null) / 100.0
       + (select coalesce(sum(a.amount_cents), 0) from public.earning_adjustments a where a.payroll_id = p.id and a.voided_at is null) / 100.0 as items_total,
       (select count(*) from public.payroll_lines l where l.payroll_id = p.id and l.payee_profile_id is null) as lines_without_payee
from public.payrolls p where p.status in ('approved', 'paid') order by p.created_at desc limit 1;
-- payroll_total = payments_total = items_total = 5479.50, and lines_without_payee = 0.

select acted_at at time zone 'America/Los_Angeles' as local_time, actor_name, action, left(detail, 90) as detail
from public.money_log order by acted_at desc limit 25;

-- ============================================================ 8.9  after Casey turns 18
select u.display_name, u.classification, u.payee_profile_id,
       (select string_agg(ur.role_id, ', ') from public.user_roles ur where ur.user_id = u.profile_id) as roles,
       (select count(*) from public.family_links l where l.umpire_id = u.id and l.ended_at is null) as active_parent_links
from public.umpires u where u.display_name = 'Casey Turner';
-- adult / no payee set (an adult is paid to themselves) / adult_umpire / 0 active parent links.

select acted_at at time zone 'America/Los_Angeles' as local_time, actor_name, action, left(detail, 100) as detail
from public.family_log order by acted_at desc limit 25;
-- Includes "Casey Turner (age 18) is now an adult umpire; guardian links ended" by "The system", and the consent given and withdrawn.
