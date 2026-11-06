# RWCLL recovery guide

How to get the system back if the live Supabase project is lost or damaged.
Practiced successfully on the test project on 2026-10-24 (row counts matched live). The league has grown since: **practice again before relying on this guide** (see "Practicing a restore" below).

## What is protected

| Item | Where it lives | In the backup? |
|---|---|---|
| Table structure, policies, functions | `supabase/migrations/*.sql` (in Git) | Rebuilt from the files |
| All table data in `public` | Supabase database | Yes (`data.sql`) |
| Sign-in accounts and password hashes (`auth.users`) | Supabase database | Yes (`data.sql`) |
| Dashboard settings: email templates, sign-in URL settings, email sending (SMTP) settings, API keys | Supabase dashboard | **No. Write these down separately.** |
| Uploaded files (Storage) | Supabase Storage | **No** (nothing is stored yet) |
| The app itself | Git repository + web host | In Git |
| The email sender (Edge Function `send-outbox`) | `supabase/functions/send-outbox` (in Git) | Redeploy it (step 6 below) |
| Email sending secrets (`SMTP_USER`, `SMTP_PASS`, `SENDER_SECRET`) | Supabase secrets | **No. Write these down separately.** They cannot be read back. |
| Scheduled jobs (sending email every few minutes, day-before reminders, the turning-18 check) | The database's `cron` schema | **No.** Run the schedule files again (step 6 below) |
| A readable copy of the league's data | Administration > Backup and export | Separate, extra copy (see below) |

The backup files contain personal data and sign-in records. Keep them off GitHub,
off email, and on an encrypted drive. Delete copies you no longer need.

## Taking a backup

Do this before applying any migration to live, before any bulk import, and weekly
during the season. Docker Desktop must be running.

```powershell
cd D:\sandbox\GitHubRepos\rwcll-umpire-scheduler
npx supabase link --project-ref tayveudoxrdkqnmcjrtu
powershell -ExecutionPolicy Bypass -File .\scripts\backup-live.ps1
npx supabase link --project-ref mucsujjpfefrfxystxse
```

Look for "All expected tables are present, including auth.users". The backup
lands in a dated folder under `D:\sandbox\RWCLL-backups`.

## Other copy: "Download everything" (in the app)

A super admin can open **Administration > Backup and export** and press **Download everything**. It gives a zip of
spreadsheets (CSV) and JSON files, one pair for every table of the league's data, and the app records who did it and
when (and warns after 30 days). Use it as an extra copy that anyone with a super-admin login can take without Docker.

It is **not** the disaster-recovery backup: it holds no sign-in accounts or passwords, and nothing in it can be loaded back by
itself. It has the same private information as the full backup (including children), so keep it the same way.

## What the free plan does and does not give you

As of November 2026, Supabase's documentation says automatic backups are **not included on the Free plan**, and it recommends
that free projects export their data regularly and keep copies elsewhere. **Pro** (about $25 per month; check the current price)
keeps 7 days of daily backups. Free projects also pause after a week of inactivity, which the keep-alive job below prevents.
Whichever plan you use, the weekly backup above is the copy you control.

## Rebuilding after a disaster

1. **Create a new Supabase project.** The free plan allows 2 active projects, so
   you may need to delete or pause the test project first. Note the new project's
   Reference ID and its database password.
2. **Link the tool to it and rebuild the structure:**
   ```powershell
   npx supabase link --project-ref NEW-PROJECT-REF
   npx supabase db push --linked
   ```
   The dry run (`--dry-run`) should list all migrations.
3. **Load the data.** Open `scripts\restore-to-test.ps1` and change the
   `$TestRef` line near the top to the new project's Reference ID. Then run it.
   It verifies the backup's checksums, refuses to run unless the project is
   empty, and loads everything in one transaction.
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\restore-to-test.ps1
   ```
   You need the new project's **Session pooler host** (Connect > Session pooler)
   and its database password.
4. **Compare row counts** with the numbers the script prints against what you
   expect (the last known counts are in the most recent backup log).
5. **Re-create the dashboard settings** (email, sign-in URLs).
6. **Restore email sending.** Neither the secrets nor the scheduled jobs are in the backup:
   ```powershell
   npx supabase secrets set SMTP_USER=... SMTP_PASS=... SENDER_SECRET=...
   npx supabase functions deploy send-outbox
   ```
   Then run `schedule_email_jobs.sql` and `schedule_family_jobs.sql` (both in `supabase\jobs`) in the SQL Editor, following
   the instructions at the top of each, and send a test message (see `EMAIL-SENDING.md`). Keep email in **safe mode** until
   you have checked it.
7. **Point everything at the new project:** `.env` (URL and publishable key), the
   GitHub secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, and the web
   host's environment variables.
8. **Test:** sign in as a super-admin, open League Setup and the umpire
   directory, and run `supabase/tests/rls_check_ordinary_user.sql` (expect 0
   items needing attention).

## Things that go wrong, and why the scripts do what they do

- The backup leaves out `storage.buckets_vectors` and `storage.vector_indexes`.
  The database user cannot restore them (permission denied), and Supabase's own
  backup instructions exclude them.
- The restore first deletes the rows the migrations pre-fill (roles, `app_settings`, `sending_settings` and the sample consent
  wording), because the backup contains its own copy of them. **If a future migration inserts default rows into another table,
  add a `DELETE` line for it in `restore-to-test.ps1`**, or the restore will fail on a duplicate key and load nothing. (Until
  November 2026 only the roles were pre-filled, so the practice restore of 2026-10-24 did not meet this.)
- The restore switches off table-to-table checks during the load
  (`session_replication_role = replica`). That is what lets the circular
  `profiles` reference load, and it stops the sign-up trigger from creating
  duplicate profiles.
- The backup script now compares the tables defined in `schema.sql` with the ones that have data in `data.sql` and prints a
  warning for any that are missing, so tables added later (families, payments, reports and so on) are checked too.
- If the restore fails, it rolls back and loads nothing. Read the error, fix it,
  and run again.

## Practicing a restore

The restore script only loads into an **empty** project, so TEST (which holds the sample data) is refused. The safe way to practice:

1. In the Supabase dashboard, **pause the TEST project** (this frees one of the two free project slots). Do not delete it.
2. Create a temporary project (for example `rwcll-restore-practice`). Note its Reference ID, database password and Session pooler host.
3. Follow "Rebuilding after a disaster" above, using the newest backup, with the temporary project as the new one (steps 2 to 4 are enough: link, `db push`, run the restore script, compare row counts).
4. When the counts match, **delete the temporary project**, **restore (unpause) TEST**, and link the CLI back to TEST.

Do this once before going live, and again after any change to how the data is stored.

## Keeping the free project awake

A GitHub job (`.github/workflows/keep-alive.yml`) calls `keep_alive()` daily.
If the repository goes quiet for a long time GitHub may switch scheduled jobs
off; check the Actions tab now and then. A free project that does pause can be
restored from the Supabase dashboard.
