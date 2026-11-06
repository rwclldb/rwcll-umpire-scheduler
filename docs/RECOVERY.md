# RWCLL recovery guide

How to get the system back if the live Supabase project is lost or damaged.
Practiced successfully on the test project on 2026-10-24 (row counts matched live), and again in **November 2026** into a temporary project, with the current structure: **80 tables, 488 rows, every count matched the backup's `row-counts.txt`**. Practice again after any change to how the data is stored (see "Practicing a restore" below).

## What is protected

| Item | Where it lives | In the backup? |
|---|---|---|
| Table structure, policies, functions | `supabase/migrations/*.sql` (in Git) | Rebuilt from the files |
| All table data in `public` | Supabase database | Yes (`data.sql`) |
| Sign-in accounts and password hashes (`auth.users`) | Supabase database | Yes (`data.sql`) |
| Dashboard settings: sign-in URLs, email (SMTP) settings, email templates, extensions, API keys | Supabase dashboard | **No. Write them down now**: see "Dashboard settings" below |
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

Look for "All expected tables are present, including auth.users", for "Every table in
the schema has a data block", and for "Row counts saved in row-counts.txt". The backup
lands in a dated folder under `D:\sandbox\RWCLL-backups` with five files:

| File | What it is |
|---|---|
| `roles.sql`, `schema.sql` | the database roles and the structure |
| `data.sql` | all the data, including the sign-in accounts |
| `row-counts.txt` | **how many rows each table had in this backup** (counted from `data.sql`), one line per table: the table, a tab, the count. The restore compares against it |
| `checksums.txt` | a fingerprint of the other files, so a damaged copy is noticed. **It is written last: a folder without it is a backup that stopped part way and must not be used** |

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

## Dashboard settings: write them down now, and how to re-create them

The backup holds the data, but **not the settings you made in the Supabase dashboard**. Without them a rebuilt project cannot send sign-up
or password emails and the sign-in links will not come back to the app. **Fill in this sheet now, while LIVE works**, and keep it with
your backups (not in Git). **Secrets go in a password manager, never in the sheet.** The quickest way: take a **screenshot of each page** below
(hide the password fields) and store them with the sheet.

### The sheet

| # | Setting | Where | Write down |
|---|---|---|---|
| 1 | Project reference and web address | Project Settings, General | `tayveudoxrdkqnmcjrtu` and `https://tayveudoxrdkqnmcjrtu.supabase.co` |
| 2 | Database password; **Session pooler host** | Project Settings, Database; the **Connect** button, Session pooler | the password (password manager); the host (it looks like `aws-1-us-east-2.pooler.supabase.com`) |
| 3 | **Site URL** | Authentication, URL Configuration | the live website address |
| 4 | **Redirect URLs** | Authentication, URL Configuration | every address in the list (the live site, and `http://localhost:5173/**` for testing) |
| 5 | **Custom SMTP** (the sign-up and password emails) | Authentication, Emails, SMTP Settings | sender email address and name, host, port, username. The password is the Google **app password** of the sender mailbox (password manager). The sender mailbox is `umpiresched@rwcll.org` (check it against the dashboard: the example in `EMAIL-SETUP.md` uses a different address) |
| 6 | Email rate limit | Authentication, Rate Limits | the "emails sent" number |
| 7 | **Confirm email** | Authentication, Sign In / Providers, Email | it must be **ON for live**. Write down any other switch you changed on that page |
| 8 | Email templates, **if you changed any** | Authentication, Emails, Templates | copy the subject and body of each template you changed (if you never changed them, write "default") |
| 9 | Extensions | Database, Extensions | `pg_cron` and `pg_net` are **on** |
| 10 | Edge Function secrets | `npx supabase secrets list` shows names only | `SMTP_USER`, `SMTP_PASS` (the app password) and `SENDER_SECRET` (password manager). The values cannot be read back from Supabase |
| 11 | GitHub secrets | the repository, Settings, Secrets and variables, Actions | the names (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`); the values come from the new project after a recovery |
| 12 | Anything else you changed | Authentication or Project Settings | note it here |

### Re-creating them on a new project (in this order)

Do this after the data is restored (step 5 of "Rebuilding after a disaster" below). Check the project name at the top left of the dashboard every time.

1. **Sign-in links.** Authentication, **URL Configuration**: set the **Site URL**, and add every **Redirect URL** from the sheet.
2. **Email sending for sign-up and password reset (custom SMTP).** Authentication, **Emails**, **SMTP Settings**: turn on **Enable custom SMTP** and fill in the
   sender address, sender name, host, port (`587`, or `465` if it will not connect) and username from the sheet, with the app password. The exact fields
   are in **`EMAIL-SETUP.md`, Part 2, step 3**. If the app password is lost, create a new one for the sender mailbox (`EMAIL-SETUP.md`, Part 1c) and use the same new one in step 6 below.
3. **Email limit.** Authentication, **Rate Limits**: set "emails sent" to the number on the sheet (Supabase starts at 30 an hour).
4. **Confirm email ON.** Authentication, **Sign In / Providers**, **Email**: switch **Confirm email** on. (Invitations only work because the email is confirmed.)
5. **Templates.** Authentication, **Emails**, **Templates**: re-enter any template you had changed.
6. **Prove it works.** Follow **`EMAIL-SETUP.md`, Part 3**: register from an address that is **not** on your Supabase team, confirm it, then use "Forgot your password?".
7. **Extensions.** Database, **Extensions**: switch on **`pg_cron`** and **`pg_net`**. (The schedule files in step 6 of the rebuild need them.)
8. **App notices.** Continue with step 6 of "Rebuilding after a disaster" (secrets, deploying `send-outbox`, the two schedule files; the details are in **`EMAIL-SENDING.md`**).
9. **Update the sheet.** Write the new project's reference, address, host and password on it, and **change the live reference** in `scripts\backup-live.ps1` and
   `scripts\restore-to-test.ps1` (the `$LiveRef` line near the top of each). They use it as a safety check, so they must name the **new** live project.

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
3. **Load the data.** Run the restore script with the new project's Reference ID.
   It uses the newest **finished** backup (one that has a `checksums.txt`), verifies
   its checksums, refuses to run unless the project is empty, and loads everything in
   one transaction. It always refuses the live project's own reference.
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\restore-to-test.ps1 -ProjectRef NEW-PROJECT-REF
   ```
   You need the new project's **Session pooler host** (Connect > Session pooler)
   and its database password.
4. **Check the row counts.** The restore script compares what it loaded with `row-counts.txt` in the backup folder,
   table by table, and prints either **`ROW COUNTS MATCH the backup`** or a list of every table that differs (a difference means
   rows were not restored). A backup made before November 2026 has no `row-counts.txt`: the script then prints counts for the main
   tables, and you compare them with the live project by hand (see "Comparing counts by hand" below).
5. **Re-create the dashboard settings** (sign-in URLs, email, extensions): follow **"Re-creating them on a new project"** in the section above.
   (Step 6 below, restoring the email sender, comes after it.)
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

## Comparing counts by hand

Only needed for a backup without `row-counts.txt`, or to check a restore against the live project while it still exists. Run this in the
SQL Editor of **each** project and compare the two results (VS Code can compare two files: `code --diff live.txt other.txt`). It counts every
table in `public`, plus the sign-in accounts:

```sql
select 'public.' || table_name as table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::bigint as row_count
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
union all select 'auth.users', count(*) from auth.users
union all select 'auth.identities', count(*) from auth.identities
order by 1;
```

Tables people use constantly (`email_outbox`, `family_log`, `money_log`, `report_audit`, `game_assignment_events`, `export_log`) can differ by a few rows if the app was
used after the backup. Everything else should match exactly.

## Things that go wrong, and why the scripts do what they do

- The backup leaves out `storage.buckets_vectors` and `storage.vector_indexes`.
  The database user cannot restore them (permission denied), and Supabase's own
  backup instructions exclude them.
- The restore first deletes the rows the migrations pre-fill (roles, `app_settings`, `sending_settings` and the sample consent
  wording), because the backup contains its own copy of them. **If a future migration inserts default rows into another table,
  add a `DELETE` line for it in `restore-to-test.ps1`**, or the restore will fail on a duplicate key and load nothing. (Until
  November 2026 only the roles were pre-filled, so the practice restore of 2026-10-24 did not meet this. The November 2026 practice restore passed with the fix.)
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
3. Follow "Rebuilding after a disaster" above, using the newest backup, with the temporary project as the new one (steps 2 to 4 are enough: link, `db push`, run the restore script with `-ProjectRef` set to the temporary project's reference, compare row counts). **Take a fresh backup of LIVE first**, so the practice covers every table that exists today.
4. When the counts match, **delete the temporary project**, **restore (unpause) TEST**, and link the CLI back to TEST.

Do this once before going live, and again after any change to how the data is stored.

### Trying the practice restore again (clearing the practice project's data)

The restore script only loads into an **empty** project, so a second attempt is refused once the first has loaded data. There is no need to delete the project (that would change its
reference). Clear only the **data**; the structure, the migration history, the reference, the keys, the password and the dashboard settings all stay, so you do **not** run `db push` again.

1. Open the SQL Editor of the **practice project**. **Check that the address bar contains the practice project's reference.** It must not be the live or the test project.
2. Run `supabase\practice\mark_practice_project.sql` (it only creates an empty marker table). The wipe refuses to run without it, so it cannot be run on live or test by mistake.
3. Run `supabase\practice\wipe_practice_project_data.sql`. It deletes every row of every table in `public` and every sign-in account. The three numbers it prints at the end must be **0**.
4. Run the restore script again with `-ProjectRef` set to the practice project's reference (see "Rebuilding after a disaster", step 3).

If the first restore actually **finished** (it printed the row counts), you do not need to redo it: compare the counts by hand ("Comparing counts by hand" below). Clear and rerun when you want to see the script's own automatic comparison.

## Keeping the free project awake

A GitHub job (`.github/workflows/keep-alive.yml`) calls `keep_alive()` daily.
If the repository goes quiet for a long time GitHub may switch scheduled jobs
off; check the Actions tab now and then. A free project that does pause can be
restored from the Supabase dashboard.
