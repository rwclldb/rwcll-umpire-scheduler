-- RWCLL: mark a project as the PRACTICE project (step 1 of 2).
--
-- Run this ONLY in the temporary practice project you created for trying a restore (check that the
-- address bar of the dashboard contains the practice project's reference, NOT the live or test one).
--
-- It creates one empty table, public.practice_project_marker. The wipe script
-- (wipe_practice_project_data.sql) refuses to do anything in a project that does not have it, so the
-- wipe cannot be run on the live or the test project by mistake.
--
-- Safe to run twice. It changes nothing else.

create table if not exists public.practice_project_marker (
  note text default 'This is the practice project. Its data may be wiped.'
);

select 'marked: this project can now be wiped by wipe_practice_project_data.sql' as result;
