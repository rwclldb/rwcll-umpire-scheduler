-- RWCLL check: are all the scheduled jobs there, switched on, and working?
--
-- Run in the Supabase SQL Editor, on test or live. It only READS; nothing is changed.
-- If it stops with 'schema "cron" does not exist': switch on pg_cron and pg_net (Database > Extensions).
--
-- One row per thing checked. Look at the "ok" column: every row should say OK.
--   job rows:       the job exists, is active, and its last run (if any) succeeded
--   secret rows:    the two Vault secrets the jobs use are there
--   calls row:      the last calls to the functions were answered 200
--                   404 = that function is not deployed on this project
--                   401 = SENDER_SECRET on the functions differs from the Vault (run scripts\set-sender-secret.ps1)
-- If a job is MISSING, run the file named in "fix".

with expected(jobname, fix) as (values
  ('send-outbox',                'supabase/jobs/schedule_email_jobs.sql'),
  ('queue-unconfirmed-warnings', 'supabase/jobs/schedule_email_jobs.sql'),
  ('queue-self-assign-digest',   'supabase/jobs/schedule_email_jobs.sql'),
  ('queue-game-reminders',       'supabase/jobs/schedule_email_jobs.sql'),
  ('purge-expired-reports',      'supabase/jobs/schedule_email_jobs.sql'),
  ('convert-turned-18',          'supabase/jobs/schedule_family_jobs.sql'),
  ('send-outbox-urgent',         'supabase/jobs/schedule_urgent_jobs.sql'),
  ('sync-calendar',              'supabase/jobs/schedule_calendar_sync.sql'),
  ('purge-cron-history',         'supabase/jobs/schedule_cleanup_jobs.sql')
),
last_run as (
  select distinct on (d.jobid) d.jobid, d.status, d.return_message, d.start_time
  from cron.job_run_details d
  order by d.jobid, d.start_time desc
),
jobs as (
  select
    'job ' || e.jobname as what,
    case
      when j.jobid is null then 'MISSING'
      when not j.active then 'SWITCHED OFF'
      when r.status = 'failed' then 'LAST RUN FAILED'
      else 'OK'
    end as ok,
    case
      when j.jobid is null then 'run ' || e.fix
      when not j.active then 'select cron.alter_job(' || j.jobid || ', active := true);'
      when r.status = 'failed' then left(coalesce(r.return_message, ''), 200)
      else coalesce('schedule ' || j.schedule || ', last ran ' || to_char(r.start_time, 'Mon DD HH24:MI') || ' UTC', 'schedule ' || j.schedule || ', not run yet')
    end as fix,
    1 as sort, e.jobname as name
  from expected e
  left join cron.job j on j.jobname = e.jobname
  left join last_run r on r.jobid = j.jobid
),
extra as (
  select 'job ' || j.jobname, 'NOT EXPECTED', 'not in this check''s list (fine if you added it on purpose)', 2, j.jobname
  from cron.job j
  where j.jobname not in (select jobname from expected)
),
secrets as (
  select 'secret ' || s.name,
         case when v.name is null then 'MISSING' else 'OK' end,
         case when v.name is null then 'run scripts\set-sender-secret.ps1 and paste its SQL' else '' end,
         3, s.name
  from (values ('sender_secret'), ('project_url')) s(name)
  left join vault.secrets v on v.name = s.name
),
calls as (
  select
    'calls to the functions (last 20)',
    case
      when count(*) = 0 then 'NO CALLS YET'
      when count(*) filter (where status_code = 200) = count(*) then 'OK'
      else 'SOME FAILED'
    end,
    coalesce(string_agg(distinct coalesce(status_code::text, 'no answer') || ' x' || n::text, ', '), 'wait for a job to call one, then run this again'),
    4, ''
  from (
    select status_code, count(*) over (partition by status_code) as n
    from (select status_code from net._http_response order by created desc limit 20) latest
  ) answered
)
select what, ok, fix from (
  select * from jobs
  union all select * from extra
  union all select * from secrets
  union all select * from calls
) everything
order by sort, name;
