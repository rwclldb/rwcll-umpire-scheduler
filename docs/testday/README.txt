RWCLL TEST DAY PACKAGE
======================

A live "day in the life" test for 5 to 7 people on a video call, on the TEST database (never LIVE).
89 steps in 11 phases, in TWO SESSIONS (they can also be run back to back). No real emails are sent and no money moves.

  Session 1: Setting up              phases 0 to 3    about 65 minutes   (the Treasurer can skip it)
  Session 2: Game day and after      phases 4 to 10   about 2 hours      (everyone)

WHAT IS IN HERE
  SOLO_SELF_TEST.txt   how to run the whole test by yourself first (a rehearsal): read this one first
  Print\   PDFs, landscape, ready to print:
             00_MASTER_Test_Day_Script.pdf      the facilitator's master: every step, who, expected results, database checks
             A_ ... G_ ... .pdf                 one sheet per person (only their own steps), a notes page for each session
  Edit\    the same files as Word documents, so you can change any step
  Database\
             seed.sql                  the UPDATED seed (working parent logins, Sam Young linked to Maria Smith,
                                       more parents so a payroll can be approved, and a "turning 18" stand-in, Casey Turner)
             testday_db_checks.sql     every database check, labelled by step number. READ-ONLY.
             testday_actions.sql       the THREE steps that CHANGE data (0.3, 4.2, 8.5). Run ONE section at a time, never the whole file.
             testday_cleanup.sql       puts TEST back the way the seed leaves it, so the test can be run again

IN THE PROJECT (the update zip puts them here)
  docs\testday\Print, docs\testday\Edit, docs\testday\README.txt
  supabase\testday\testday_db_checks.sql, testday_actions.sql and testday_cleanup.sql
  (They are NOT in supabase\tests, so run-all-checks.ps1 can never run the cleanup script.)
  seed.sql is not kept in the repository.

BEFORE SESSION 1 (the facilitator, about 30 minutes)
  1. Make sure the TEST site (GitHub Pages) shows the newest version: sign in as the super admin and look for the
     Families and Payments tabs.
  2. Run the updated seed.sql in the SQL Editor of the TEST project (TEST ONLY).
  3. Work through phase 0 of the master (starting-state check, safe mode for email, send yourself a test message).
  4. Send each person their sheet (PDF) and the TEST site address. Ask them to print it, or keep it open on a
     second device. Use a phone for the app itself if possible.

BETWEEN THE SESSIONS
  Do NOT run the cleanup script: Session 2 depends on what Session 1 left behind. Before Session 2 the facilitator
  runs the check in step 4.0a. If a row is wrong, a Session 1 step did not happen: do it by hand, then check again.

DURING THE CALL
  Share your screen with your email inbox open. Announce each phase. Everyone reads page 1 of their sheet first.
  Run the sender by hand when a step says so (the master has the PowerShell command).

AFTER
  Collect the notes pages. Count how many MUST-PASS steps (marked with a star) failed.
  To run the test again: testday_cleanup.sql, then the starting-state check (step 0.2).

PLEASE NOTE
  The step wording was written from the app's code and tests, not by watching a person use it. Button names may differ
  slightly. Do a SOLO REHEARSAL first: do all of one role's steps yourself, and fix the wording in the Word files.
  The database queries and the cleanup script have not been run against a real database by their author.
