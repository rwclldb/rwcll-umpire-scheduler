# RWCLL recovery guide

How to get the system back if the live Supabase project is lost or damaged.
Practiced successfully on the test project on 2026-10-24 (row counts matched live).

## What is protected

| Item | Where it lives | In the backup? |
|---|---|---|
| Table structure, policies, functions | `supabase/migrations/*.sql` (in Git) | Rebuilt from the files |
| All table data in `public` | Supabase database | Yes (`data.sql`) |
| Sign-in accounts and password hashes (`auth.users`) | Supabase database | Yes (`data.sql`) |
| Dashboard settings: email templates, sign-in URL settings, email sending (SMTP) settings, API keys | Supabase dashboard | **No. Write these down separately.** |
| Uploaded files (Storage) | Supabase Storage | **No** (nothing is stored yet) |
| The app itself | Git repository + web host | In Git |

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
6. **Point everything at the new project:** `.env` (URL and publishable key), the
   GitHub secrets `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, and the web
   host's environment variables.
7. **Test:** sign in as a super-admin, open League Setup and the umpire
   directory, and run `supabase/tests/rls_check_ordinary_user.sql` (expect 0
   items needing attention).

## Things that go wrong, and why the scripts do what they do

- The backup leaves out `storage.buckets_vectors` and `storage.vector_indexes`.
  The database user cannot restore them (permission denied), and Supabase's own
  backup instructions exclude them.
- The restore deletes the 9 seeded roles first, because the migrations insert
  them and the backup contains them too.
- The restore switches off table-to-table checks during the load
  (`session_replication_role = replica`). That is what lets the circular
  `profiles` reference load, and it stops the sign-up trigger from creating
  duplicate profiles.
- If the restore fails, it rolls back and loads nothing. Read the error, fix it,
  and run again.

## Keeping the free project awake

A GitHub job (`.github/workflows/keep-alive.yml`) calls `keep_alive()` daily.
If the repository goes quiet for a long time GitHub may switch scheduled jobs
off; check the Actions tab now and then. A free project that does pause can be
restored from the Supabase dashboard.
