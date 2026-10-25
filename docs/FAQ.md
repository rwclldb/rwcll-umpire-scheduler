# RWCLL project FAQ: what the shorthand means

When Claude says things like "take a fresh backup" or "link back to test", the
exact steps are below. If a phrase is not here, ask Claude to add an entry.

All PowerShell commands assume you start in the project folder:

```powershell
cd D:\sandbox\GitHubRepos\rwcll-umpire-scheduler
```

## Quick reference

| | Name in the Supabase dashboard | Reference ID | Used for |
|---|---|---|---|
| **LIVE** | Umpire Scheduler | `tayveudoxrdkqnmcjrtu` | Real data. The normal `npm run dev` uses this one. |
| **TEST** | rwcll-test | `mucsujjpfefrfxystxse` | Trying changes safely first. |

- Backups are saved in `D:\sandbox\RWCLL-backups` (outside the project on purpose).
- GitHub repository: https://github.com/rwclldb/rwcll-umpire-scheduler
- The app opens at http://localhost:5173/ when it is running.

## The safety rules

1. **Before any database push or restore, check which project is linked** (section 1).
2. **Leave the tool linked to TEST.** Link to live only for a deliberate step, and link back to test straight after.
3. **Always do the dry run first** and read what it lists before the real push.
4. **Try every database change on TEST first.**
5. **Take a fresh backup before changing LIVE.**
6. **Never commit or share** `.env` files, backups, or passwords. Never paste a database password or a secret key into a chat.

## Contents

1. [Check which project is linked](#1-check-which-project-is-linked)
2. [Link to a project ("link to live", "link back to test")](#2-link-to-a-project)
3. [Apply a database change to the test project ("push the database to test")](#3-apply-a-database-change-to-the-test-project)
4. [Take a fresh backup](#4-take-a-fresh-backup)
5. [Roll a database change out to live](#5-roll-a-database-change-out-to-live)
6. [Run a check script in the SQL Editor ("run the security check")](#6-run-a-check-script-in-the-sql-editor)
7. [Find an ordinary account's id](#7-find-an-ordinary-accounts-id)
8. [Run the app (normal and test mode)](#8-run-the-app)
9. [Run the build check](#9-run-the-build-check)
10. [Commit and push to GitHub ("push changes to the repo")](#10-commit-and-push-to-github)
11. [Work on a branch and merge it back](#11-work-on-a-branch-and-merge-it-back)
12. [Undo or go back](#12-undo-or-go-back)
13. [Compare test and live ("run the fingerprint")](#13-compare-test-and-live)
14. [Practice a restore](#14-practice-a-restore)
15. [Check or repair the migration history](#15-check-or-repair-the-migration-history)
16. [Supabase dashboard tasks](#16-supabase-dashboard-tasks)
17. [What each script is](#17-what-each-script-is)
18. [Typical sequences](#18-typical-sequences)
19. [Troubleshooting](#19-troubleshooting)
20. [Glossary](#20-glossary)
21. [Where things live](#21-where-things-live)
22. [Put files from Claude into the project](#22-put-files-from-claude-into-the-project)
23. [Clean up leftover test records](#23-clean-up-leftover-test-records)
24. [Where personal data is stored and who can see it](#24-where-personal-data-is-stored-and-who-can-see-it)
25. [How umpire registration and invitations work](#25-how-umpire-registration-and-invitations-work)
26. [Email: why sign-up fails on live, and the plan](#26-email-why-sign-up-fails-on-live-and-the-plan)
27. [The Outbox: email stubs, and how to switch on real sending](#27-the-outbox-email-stubs-and-how-to-switch-on-real-sending)
28. [Rules about teams and games](#28-rules-about-teams-and-games)
29. [Menus and pages: who sees what](#29-menus-and-pages-who-sees-what)
30. [The Games tab](#30-the-games-tab)
31. [Importing games from the master calendar](#31-importing-games-from-the-master-calendar)
32. [Creating a season from the registration files](#32-creating-a-season-from-the-registration-files)

---

## 1. Check which project is linked

```powershell
npx supabase projects list
```

Look at the **LINKED** column. The `●` is beside the project the tool will act on.

- `rwcll-test` (reference starts `mucsujj`) means TEST. This is the safe default.
- `Umpire Scheduler` (reference starts `tayveud`) means **LIVE**. Be careful.

## 2. Link to a project

**"Link to test" / "link back to test":**

```powershell
npx supabase link --project-ref mucsujjpfefrfxystxse
npx supabase projects list
```

**"Link to live":**

```powershell
npx supabase link --project-ref tayveudoxrdkqnmcjrtu
npx supabase projects list
```

Always run `projects list` afterwards and confirm the `●` is where you intended.
If the tool asks for a database password, enter the password for *that* project
(you can reset it under Project Settings, then Database, in the dashboard).

## 3. Apply a database change to the test project

Also called "push the database to test" or "apply the migration to test".

1. Save the new `.sql` file into `supabase\migrations`.
2. Confirm TEST is linked (section 1).
3. Preview. This changes nothing:
   ```powershell
   npx supabase db push --linked --dry-run
   ```
   It must list **only the new file(s)** you expect. If it lists anything else, stop and ask Claude.
4. Apply it:
   ```powershell
   npx supabase db push --linked
   ```
   When it asks "Do you want to push these migrations?", answer `Y`.
5. Confirm it landed:
   ```powershell
   npx supabase migration list --linked
   ```
   The new version should appear in **both** the Local and Remote columns.
6. Run whichever check scripts Claude names (section 6), against the **test** project.

## 4. Take a fresh backup

Do this before every change to LIVE, before any bulk import, and weekly during the season.

1. Start **Docker Desktop** and wait until it says it is running.
2. Run:
   ```powershell
   npx supabase link --project-ref tayveudoxrdkqnmcjrtu
   powershell -ExecutionPolicy Bypass -File .\scripts\backup-live.ps1
   npx supabase link --project-ref mucsujjpfefrfxystxse
   ```
3. Look for **"All expected tables are present, including auth.users"** near the end of the output. A yellow warning listing missing tables means the backup is not complete: ask Claude.
4. The backup is a new dated folder in `D:\sandbox\RWCLL-backups` containing `roles.sql`, `schema.sql`, `data.sql` and `checksums.txt`.

Backups contain personal data and sign-in records. Keep them off GitHub, off email,
and on an encrypted drive. Delete old copies you no longer need.

## 5. Roll a database change out to live

Only after it has passed on TEST.

1. **Take a fresh backup** (section 4).
2. Link to live and check the marker:
   ```powershell
   npx supabase link --project-ref tayveudoxrdkqnmcjrtu
   npx supabase projects list
   ```
3. Preview. It must list only the migration(s) you expect:
   ```powershell
   npx supabase db push --linked --dry-run
   ```
4. Apply, answering `Y` when asked:
   ```powershell
   npx supabase db push --linked
   ```
5. Confirm both columns show the new version:
   ```powershell
   npx supabase migration list --linked
   ```
6. Run the check scripts Claude names against the **live** project (section 6). Check the project name at the top left of the dashboard first.
7. **Link back to test:**
   ```powershell
   npx supabase link --project-ref mucsujjpfefrfxystxse
   npx supabase projects list
   ```

## 6. Run a check script in the SQL Editor

Also called "run the security check", "run the rules check", and so on.

1. Open the Supabase dashboard and pick the project you mean. **Check the project name at the top left.**
2. Open **SQL Editor** and start a new query.
3. Open the script file from `supabase\tests`, copy **all** of it, and paste it in.
4. If the script has a line like `test_user uuid := '00000000-...'`, replace the zeros with an account id (section 7).
5. Click **Run**.
6. **The run ends with a red error. That is expected.** The report is inside the error message, and raising an error guarantees nothing is saved. The editor may also warn about "destructive operations" because the text contains delete statements; that is expected too.
7. Read the report lines (`PASS`, `FAIL`, `CHECK`, `SKIP`, `INFO`).

| Script | Proves | Good result |
|---|---|---|
| `rls_check_ordinary_user.sql` | An ordinary account cannot change setup data, give itself roles, approve accounts, or read other people's data | `Items needing attention: 0` |
| `rls_check_admin_access.sql` | A super admin can still read everything | `Failures: 0` |
| `role_rules_check.sql` | The role safeguards work (approved accounts only, youth/adult exclusive, last super admin protected) | `Failures: 0` (a `SKIP` is fine) |
| `account_details_check.sql` | The account-details rules work (only the account holder can turn text messages on, outside IDs are admin-only and unique, emails are unique) | `Failures: 0` |
| `import_season_check.sql` | Creating a season from a file works and is all-or-nothing (a refused import saves nothing; only scheduling admins can run it) | `Failures: 0` |
| `import_games_check.sql` | The spreadsheet import works and is all-or-nothing (a failed import saves nothing; only scheduling admins can run it) | `Failures: 0` |
| `games_master_id_check.sql` | The master calendar Game ID rules work (optional, unique within a season, no stray spaces) | `Failures: 0` |
| `games_rules_check.sql` | The team and game rules work (a team's division is in its league; a game's teams are in its season and division; bracket slots; game types) | `Failures: 0` |
| `email_outbox_check.sql` | The Outbox works and stays private (only scheduling admins can queue or read, no direct writes, the internal path cannot be called from the app) | `Failures: 0` |
| `registration_check.sql` | Registration and invitations work (sign-up choices grant nothing, unconfirmed or expired invitations are not honoured, approval enforces the age rules, only a super admin or umpire chief can approve) | `Failures: 0` |

A `SKIP` is not a failure. It means there was nothing to test against yet (for example, no games exist
so "edit games" cannot be tried). An `INFO` line is just something worth knowing.

Run the relevant scripts after any change to permissions: on test first, then on live
after rolling it out.

## 7. Find an ordinary account's id

For `rls_check_ordinary_user.sql` you need the id of an **approved account with no admin
role** (for example a youth umpire). In the SQL Editor of the project you are testing:

```sql
select p.id, p.display_name, p.account_status,
       coalesce(string_agg(ur.role_id, ', '), '(no roles)') as roles
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
group by p.id
order by p.display_name;
```

Copy the `id` of a suitable row into the script. Ids differ between projects only
for accounts created after the test project was restored from a live backup.

## 8. Run the app

**Normal (this uses the LIVE project, so changes you make are real):**

```powershell
npm run dev
```

**Test mode (uses the TEST project):**

```powershell
npm run dev -- --mode test
```

Test mode needs a file named `.env.test` (section 16). To be sure which project you are on:
press **F12**, open the **Network** tab, type `supabase` in the filter, and reload.
The requests should go to `mucsujj...` for test, or `tayveud...` for live.

Open http://localhost:5173/ in the browser. Stop the app with **Ctrl+C** in the terminal.

## 9. Run the build check

```powershell
npm run build
```

A good result ends with a line like `built in 150ms` and no errors. If it prints errors,
copy them exactly and send them to Claude.

## 10. Commit and push to GitHub

Also called "push changes to the repo". A **commit** saves a snapshot on your computer;
a **push** copies your commits to GitHub.

```powershell
git status
git ls-files .env .env.local
git add -A
git commit -m "Short description of what changed"
git push
```

- `git status` shows what changed. Read it; do not skip it.
- `git ls-files .env .env.local` must print **nothing**. If it prints a file name, stop and ask Claude before committing.
- If `git push` says there is no upstream branch, run `git push -u origin your-branch-name`.
- If `git push` is rejected, ask Claude before doing anything else.
- To see recent commits: `git log --oneline -5`.

## 11. Work on a branch and merge it back

A branch is a safe side copy for risky changes. If it goes wrong, you can walk away from it.

```powershell
git status
git checkout -b name-of-the-change
```

...make changes, test, and commit (section 10)...

When it works, bring it into `main`:

```powershell
git checkout main
git merge name-of-the-change
git branch -d name-of-the-change
git push
```

If it does **not** work, just return to `main` and your project is back to how it was:

```powershell
git checkout main
```

To see which branch you are on: `git branch --show-current`.

## 12. Undo or go back

| I want to... | Command | Careful |
|---|---|---|
| See what changed | `git status`, then `git diff` | Read-only |
| Throw away my unsaved edits to one file | `git restore path\to\file` | **Cannot be undone** |
| Leave a branch and return to the main one | `git checkout main` | Commit or stash first |
| Undo my last commit but keep the changes | `git reset --soft HEAD~1` | Only if it is **not pushed** yet |
| Anything else | Ask Claude first | |

## 13. Compare test and live

Also called "run the fingerprint". It proves two databases have the same structure.

1. In the **test** project's SQL Editor, run `supabase\tests\schema_fingerprint.sql`.
2. Use the download button above the results grid and save the CSV as `fingerprint_test.csv`.
3. Repeat in the **live** project and save `fingerprint_live.csv`.
4. Compare the files:
   ```powershell
   fc.exe fingerprint_test.csv fingerprint_live.csv
   ```
   `FC: no differences encountered` means they match. (Use `fc.exe`, not `fc`: in PowerShell plain `fc` is a different command.)
5. If they differ, upload both files to Claude to see exactly which rows differ.

The result has about 10 rows (one per category), so the editor's 100-row limit cannot hide anything.

## 14. Practice a restore

Proves a backup can really rebuild the data. It loads a backup into the **test** project and only
works if the test project is **empty**. Details are in `docs\RECOVERY.md`.

1. You need `psql` installed (PostgreSQL command line tools, version 17) and a recent backup.
2. In the **test** project's dashboard, click **Connect**, choose **Session pooler**, and note the **host** (it looks like `aws-0-us-east-2.pooler.supabase.com`).
3. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\restore-to-test.ps1
   ```
4. Enter the host, then the test project's database password (typing is hidden). Type `RESTORE` when asked.
5. Compare the row counts it prints with the live project (Claude gives you the count query).

If the restore fails, it rolls back and loads nothing.

## 15. Check or repair the migration history

**See it:**

```powershell
npx supabase migration list --linked
```

Local = files in your project. Remote = what the linked project has recorded. A blank
Remote entry means that migration is not applied (or was applied by hand and not recorded).

**Record by-hand migrations as applied** (rare; Claude will give you the exact numbers):

```powershell
npx supabase migration repair --status applied 20261023183500 --linked
```

The version number is the 14-digit prefix of the file name. Check that you copied every digit.

## 16. Supabase dashboard tasks

- **Find a project's publishable key:** Project Settings, then API Keys. It is designed to be public, but still do not paste it into chat.
- **Create `.env.test`** in the project folder (it is already ignored by Git) with two lines:
  ```
  VITE_SUPABASE_URL=https://mucsujjpfefrfxystxse.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=paste-the-TEST-publishable-key-here
  ```
- **Allow the app's address for email links** (password reset): Authentication, then URL Configuration, then Redirect URLs. Add `http://localhost:5173/**`. Do this on **both** projects. A website address is added here later too.
- **Reset a database password:** Project Settings, then Database, then Reset database password.
- **Approve an account:** sign in to the app as super admin; pending accounts appear at the top. Then use the Roles section to give it roles.

## 17. What each script is

| File | What it does | Changes data? |
|---|---|---|
| `scripts\backup-live.ps1` | Saves a backup of the LIVE project to `D:\sandbox\RWCLL-backups` | No (reads only) |
| `scripts\restore-to-test.ps1` | Loads a backup into an empty TEST project | Test only |
| `supabase\tests\rls_check_ordinary_user.sql` | Tries forbidden actions as an ordinary account | No (always rolls back) |
| `supabase\tests\rls_check_admin_access.sql` | Confirms a super admin can read everything | No (always rolls back) |
| `supabase\tests\role_rules_check.sql` | Tests the role safeguards | No (always rolls back) |
| `supabase\tests\account_details_check.sql` | Tests the phone, text-message, outside-ID and unique-email rules | No (always rolls back) |
| `supabase\tests\email_outbox_check.sql` | Tests the Outbox rules | No (always rolls back) |
| `supabase\tests\import_season_check.sql` | Tests the season import function (builds its own tiny leagues; your data is not used) | No (always rolls back) |
| `supabase\tests\import_games_check.sql` | Tests the spreadsheet import function (builds its own tiny league; your data is not used) | No (always rolls back) |
| `supabase\tests\games_master_id_check.sql` | Tests the master calendar Game ID rules (builds its own tiny league; your data is not used) | No (always rolls back) |
| `supabase\tests\games_rules_check.sql` | Tests the team and game rules (builds its own tiny league; your data is not used) | No (always rolls back) |
| `supabase\tests\registration_check.sql` | Tests sign-up, invitations and approval (creates temporary test accounts) | No (always rolls back) |
| `supabase\tests\schema_fingerprint.sql` | Summarises a database's structure for comparison | No (reads only) |
| `supabase\migrations\*.sql` | The database changes, applied in file-name order | Yes, when pushed |
| `.github\workflows\keep-alive.yml` | Calls the database daily so the free plan does not pause it | No |

## 18. Typical sequences

**A new database change**

1. Save the migration file into `supabase\migrations`.
2. Check TEST is linked, dry run, push (section 3).
3. Run the check scripts on test (section 6).
4. Try the app in test mode (section 8).
5. Take a fresh backup (section 4).
6. Roll out to live and run the checks there (section 5).
7. Link back to test (section 2), then commit and push (section 10).

**A new screen or code change**

1. Copy the new files into `src`.
2. `npm run build` (section 9).
3. `npm run dev -- --mode test` and try it (section 8).
4. Commit and push (section 10).

## 19. Troubleshooting

| What you see | What it means | What to do |
|---|---|---|
| `Access token not provided` | The tool is not signed in | `npx supabase login` |
| The dry run lists **more** files than expected | Something is out of step | Stop. Send Claude the output. |
| The dry run lists **nothing** | Already applied, or the file is in the wrong folder | Check `supabase\migrations`, then `migration list --linked` |
| `Docker Desktop is not installed or not running` | The backup needs Docker | Start Docker Desktop and wait until it says it is running |
| Backup script: `linked to ... not the live project` | The tool is linked to test | Link to live first (section 2) |
| Restore script: `already contains data` | Safety check: it only loads into an empty project | Expected. Ask Claude before emptying the test project. |
| The SQL Editor shows a red error ending in a report | That is how check scripts deliver results | Read the `PASS`/`FAIL` lines. Not a problem. |
| `malformed array literal` in a check script | You are running an old copy of the script | Use the newest version of the file |
| The password reset email never arrives | The built-in email sender only reaches your own team's addresses, and sends 2 per hour | Test with your own admin email; a real email provider is needed for everyone else |
| The reset link opens a page that doesn't sign you in | The Redirect URL is missing | Section 16, "Allow the app's address" |
| `Supabase configuration is missing` | The `.env` file is missing or misnamed | Check `.env` (or `.env.test` in test mode) |
| App opens on port 5174 instead of 5173 | Another copy is still running | Close the other terminal (Ctrl+C), or add the new port to Redirect URLs |
| `running scripts is disabled` | PowerShell blocks `.ps1` files by default | Run them exactly as written here, with `-ExecutionPolicy Bypass -File` |
| `npm run build` prints errors | A code problem | Copy the errors exactly and send them to Claude |
| `git push` is rejected | GitHub has changes you do not | Ask Claude before doing anything else |
| The Outbox looks empty after inviting someone | Older versions only reloaded when opened. The current version updates by itself and has a **Refresh** button. | Press **Refresh**. If it is still empty, run this in the SQL Editor to see what really exists: `select created_at, kind, to_email, subject, status from public.email_outbox order by created_at desc limit 10;` |
| VS Code shows a red underline (for example "Cannot find module") but `npm run build` is fine | VS Code's TypeScript checker is out of date. It often misses files that were just added, moved or replaced. | Press `Ctrl+Shift+P`, type **TypeScript: Restart TS Server**, and press Enter. The real compiler (`npm run build`) is the one to trust. |
| `Cannot find module "../supabase"` (or `"../ui"`, `"./types"`) in a file inside a folder | The file is in the wrong folder, or VS Code rewrote its `import` lines when the file was dragged. `./` means the same folder, `../` means one folder up. | Check the file's folder against the layout in section 22. When VS Code asks "Update imports for moved file?", answer **No**, or re-copy the file. |
| The season import says "A season called ... already exists" | You chose **Create a new season** but one with that name is already there | In the **Season** list, choose **Add to: that season** (to add teams to it), or give the new season a different name. |
| Signing up on **live** says the email "cannot be used as it is not authorized" | Supabase's built-in email sender only reaches your own team's addresses (error code `email_address_not_authorized`). Sign-up needs a confirmation email, so everyone else is refused. | A real email provider has to be connected (see section 26). Until then only team members can register on live. |
| Someone signed up as an umpire but is not in **Umpire registrations** | They must confirm their email and then sign in once; the record is created at that sign-in | Ask them to confirm the email and sign in. People who never confirm never appear (this keeps spam out). |
| An invited person registered but was not approved automatically | The email must match the invitation exactly, be **confirmed**, and the invitation must be open (not expired or revoked) and the record not already linked. They must also **sign in once** after confirming. | Open Edit on their umpire record: the Invitation panel shows the status. Renew it if it expired. |

## 20. Glossary

- **Live:** the real project, with real data.
- **Test:** a practice copy with the same structure, for trying changes safely.
- **Linked:** the project the Supabase tool will act on right now.
- **Migration:** a `.sql` file describing one database change. Files are applied in file-name order.
- **Dry run:** a preview that shows what would happen and changes nothing.
- **Push (database):** apply migrations to the linked project. **Push (Git):** send commits to GitHub. They are different things.
- **Commit:** a saved snapshot of your files on your computer.
- **Branch:** a side copy of the code for trying risky changes.
- **Row-level security (RLS):** database rules that decide which rows each person may read or change.
- **Publishable key:** the project's public identifier used by the app. Safe to be in the app; never confuse it with a secret key.
- **Secret / service-role key:** a powerful key that must never be in the app or in Git.
- **Session pooler:** the connection type used by `restore-to-test.ps1`.
- **Fingerprint:** a one-page summary of a database's structure, used to compare two projects.

## 21. Where things live

```
rwcll-umpire-scheduler\
  src\                     the app (main.ts, roles.ts, umpires.ts, my-details.ts, registrations.ts, email.ts, outbox.ts, shell.ts, league_setup.ts, style.css, ...)
  src\setup\               the League Setup pieces (leagues, seasons, divisions, teams, locations, ...)
  supabase\migrations\     database changes, in order
  supabase\tests\          check scripts and the schema fingerprint
  scripts\                 backup and restore scripts
  docs\                    this FAQ, RECOVERY.md and EMAIL-SETUP.md
  .github\workflows\       the daily keep-alive job
  .env                     LIVE settings        (never committed)
  .env.test                TEST settings        (never committed)
D:\sandbox\RWCLL-backups\  backups              (outside the project, never committed)
```

## 22. Put files from Claude into the project

When Claude says "copy the file into `src`" or "save the migration", this is where each kind of file goes.
If the same file already exists, **overwrite it**.

| The file | Goes in |
|---|---|
| A `.sql` whose name starts with a 14-digit number, like `20261024180000_...sql` | `supabase\migrations` |
| `rls_check_...sql`, `role_rules_check.sql`, `account_details_check.sql`, `registration_check.sql`, `email_outbox_check.sql`, `games_rules_check.sql`, `games_master_id_check.sql`, `import_games_check.sql`, `import_season_check.sql`, `schema_fingerprint.sql` | `supabase\tests` |
| `backup-live.ps1`, `restore-to-test.ps1` | `scripts` |
| App files such as `main.ts`, `roles.ts`, `umpires.ts`, `my-details.ts`, `registrations.ts`, `email.ts`, `outbox.ts`, `shell.ts`, `games.ts`, `league_setup.ts`, `ui.ts` | `src` |
| `season-plan.ts`, `season-import.ts` (the two season import files) | `src\setup` (the folder that already holds the other setup files) |
| `types.ts`, `format.ts`, `warnings.ts`, `data.ts`, `form.ts`, `csv.ts`, `calendar.ts`, `matching.ts`, `plan.ts`, `importer.ts` (the ten files in the `games` folder) | `src\games` (a folder inside `src`, next to `games.ts`) |
| The League Setup pieces (`leagues.ts`, `seasons.ts`, `divisions.ts`, `teams.ts`, ...) | `src\setup` |
| `style.css` | `src` (it replaces `src\style.css`) |
| `FAQ.md`, `RECOVERY.md`, `EMAIL-SETUP.md` | `docs` |
| `keep-alive.yml` | `.github\workflows` |
| A `.zip` | Unzip into the project folder (see below) |

To unzip a download so its folders land in the right places (replace the path with where you saved it):

```powershell
Expand-Archive -Path "$HOME\Downloads\league-setup-split.zip" -DestinationPath . -Force
```

Afterwards:

- If your browser added `(1)` or `_1` to a file name (for example `league_setup_1.ts`), **rename it to the exact name** before copying.
- Run `git status`. You should see the files you copied listed as modified or new, and nothing else. Anything unexpected: ask Claude.
- Warnings about `LF` and `CRLF` line endings are harmless.

## 23. Clean up leftover test records

**Leagues, seasons, divisions, teams, locations:** open the League Setup screen, press **Edit** on the
record, and use its **Delete** button. A record that something else uses cannot be deleted (you will get a message
saying what uses it). Remove the things that use it first, or mark it inactive instead.

**Age charts** cannot be deleted from the app, on purpose: a chart that a season uses must never change.
To see which charts exist and whether any season uses them, run this in the SQL Editor:

```sql
select c.name, c.chart_year,
       (select count(*) from public.little_league_age_chart_entries e where e.chart_id = c.id) as entries,
       (select string_agg(s.name, ', ') from public.seasons s where s.age_chart_id = c.id) as used_by_seasons
from public.little_league_age_charts c
order by c.name;
```

To remove a leftover chart that **no season uses** (put its exact name in the quotes). Its entries are removed
with it, and the `not exists` line stops this from touching a chart that is in use:

```sql
delete from public.little_league_age_charts c
where c.name = 'EXACT CHART NAME HERE'
  and not exists (select 1 from public.seasons s where s.age_chart_id = c.id);
```

If a season does use the chart, first edit that season in the app and point it at the chart you want to keep.
On **live**, take a fresh backup before deleting (section 4).

## 24. Where personal data is stored and who can see it

"Scheduling admins" means the **super admin, umpire chief, and scheduler** roles.
This is enforced by the database itself, not just by the screens.

| Data | Stored in | Who can read it | Who can change it |
|---|---|---|---|
| Sign-in email | The account (and a copy on the profile) | The account holder; scheduling admins | Not editable in the app yet |
| Account phone number and text-message preference | `account_contact` | The account holder; scheduling admins | The account holder. An admin can fix a phone number but **cannot turn text messages on** for someone else. |
| Umpire record: name, number, youth or adult, eligibility, phone | `umpires` | Scheduling admins; an umpire sees only their own | Scheduling admins |
| Umpire private details: email (before they have an account), birth date, emergency contact, notes, outside IDs | `umpire_private_details` | Scheduling admins only | Scheduling admins |
| An account's outside IDs | `account_admin_details` | Scheduling admins only (the person never sees them) | Scheduling admins |
| Roles | `user_roles` | You see your own; super admins see all | Super admins only |
| Umpire invitations | `umpire_invitations` | Scheduling admins | Only through the invite, renew and revoke functions |
| Queued emails (the Outbox) | `email_outbox` | Scheduling admins only | Only through the queue, mark-sent and skip functions |
| Game assignments | `game_assignments` | Scheduling admins; an umpire sees only their own | Scheduling admins |

Things worth knowing:

- **Phone numbers in lists:** if someone has both an account phone (set on **My details**) and a phone on their umpire record, the lists show the **account phone**. The umpire-record phone is the fallback.
- **Email in the directory:** a linked umpire shows their **account's** email. An unlinked umpire shows the email an admin typed on the umpire record.
- **Outside IDs** (ID 1: main league database, ID 2: backup system) are unique: one outside record cannot be attached to two people. They never appear in any list the person can see.
- **Text messages are not available yet.** The "My details" box only records a preference, with the time it was chosen.
- **Birth dates** are for administrators only. They are used to tell youth from adult and to find umpires under 13.

## 25. How umpire registration and invitations work

There are two ways an umpire gets into the system. Both end the same way: a linked account
with the youth or adult umpire role and an active umpire record.

**1. The umpire signs themselves up**

1. On the sign-up screen they choose **adult umpire** or **youth umpire (13 to 17)**. A youth must tick "I am 13 or older". Under-13s cannot sign themselves up: a parent or the league must set them up (a later step).
2. They confirm their email and sign in. At that first sign-in an inactive umpire record is created for them. **The sign-up choice is only a request: it never grants a role.**
3. A **super admin or umpire chief** sees them under **Umpire registrations**, enters the birth date (required for youth, optional for adults), checks youth or adult, and presses **Approve**. One press approves the account, gives the youth or adult umpire role, activates the record and saves the birth date.
4. **Reject** closes the registration with no access.

The database refuses an approval that breaks the age rules: no birth date for a youth, under 13, an adult under 18, a youth 18 or older, or a birth date in the future.

**2. An administrator invites the umpire**

1. In the umpire directory, press **Create Umpire**, fill in the name, type and **email**, and leave **"Invite them to register with this email"** ticked. Or open **Edit** on an umpire who has no account, type their email in the Email box, and press **Invite to register**.
2. The Edit form's **Invitation** panel shows who was invited and when it expires, with a ready-to-send message and a **Copy message** button. **Email sending is not set up yet, so copy that message and send it to the person yourself.**
3. The person goes to the website, chooses **Create account**, and registers with **exactly that email**. They confirm it and sign in. They are then **linked, approved and given the youth or adult umpire role automatically**, because an administrator vouched for them. (The record's own youth or adult setting decides the role.)
4. An invitation lasts **30 days**. **Renew** gives it 30 more days; **Revoke** cancels it. A new invitation for the same email or record replaces the old one.
5. If the email already has an account, the system says so: use **Link account** instead.

**The "Account" column in the directory**

| It says | Meaning |
|---|---|
| Linked | Connected to an approved account |
| Pending review | The person signed themselves up and is waiting for approval |
| Invited (expires ...) | An open invitation exists |
| Invitation expired | The invitation ran out: open Edit and press Renew |
| Not linked | No account and no invitation |
| Rejected / Suspended | The linked account was rejected or suspended |

**Until the email provider is connected, nobody outside your Supabase team can register on live.** The sign-up screen reports the email as "not authorized". The test project is unaffected because "Confirm email" is off there.

**Rules that keep this safe**

- Nothing happens until the person's **email is confirmed**. That is how an invitation proves the right person is claiming it. **Never switch "Confirm email" off on the live project.**
- Only the **super admin and umpire chief** can approve or reject registrations. A scheduler cannot.
- People who sign up but never confirm their email never appear in any list.

**Testing a sign-up on the TEST project.** Supabase's built-in email only reaches your own team's addresses, so you cannot confirm many made-up emails. On the **test** project only, open the dashboard, then Authentication, then Sign In / Providers, then Email, and switch **Confirm email off**. New sign-ups on test are then confirmed instantly, so you can use made-up addresses like `youth.one@example.test`. Leave live alone.

**Trying an invitation on the TEST project** (with **Confirm email** switched off there, as described above):

1. In test mode as super admin, press **Create Umpire**: name `Test Invitee`, adult, email `invitee.one@example.test`, invite box ticked. Press Create.
2. Press **Edit** on the new record and look at the Invitation panel and the message.
3. Sign out. Choose **Create account**, register with `invitee.one@example.test` (choose adult umpire), and sign in.
4. You should land on **Account approved**. Sign back in as super admin: the directory should show **Linked**, and the Roles list should show the new account with the **Adult umpire** role.

## 26. Email: why sign-up fails on live, and the plan

**What happens today.** Supabase includes a built-in email sender for testing. It only delivers to
addresses on your Supabase project team, and only a few messages per hour. Everyone else gets the
error "Email address ... cannot be used as it is not authorized". Sign-up, password reset and
invitations all need email, so on **live** only your own team can use them. The **test** project works
because "Confirm email" is switched off there, so no email is sent.

**The fix.** Connect a real email service ("custom SMTP") that Supabase uses for sign-up confirmation
and password-reset emails. There are two sensible routes, and we do not have to choose yet.

**Step by step, including a ten-minute go/no-go test for Route A: `docs\EMAIL-SETUP.md`.**

**Route A: your league's Google Workspace (the first thing to look at)**

- Supabase signs in to Google's mail server with a username and password: server `smtp.gmail.com`, port 587 (or 465), username = the full address of a **dedicated Workspace mailbox**, password = a Google **app password** (this needs 2-Step Verification on that mailbox, and your Workspace administrator may need to allow app passwords).
- Google's own documentation gives a limit of **2,000 messages per day** for this route.
- Google already signs mail from your domain if your admin mailboxes work, so **no new provider and probably no new DNS records**.
- Replies land in a real inbox that a person can read, if you use a shared address such as `umpires@rwcll.org` as the sender.
- Things to check: the mailbox must be a real, licensed Workspace user (an alias or a group cannot sign in), so there may be a licence cost; and the app password is a key to that mailbox, so it is stored only in Supabase and never shared.

**Route B: a mail service such as Brevo or Resend**

- Brevo's free plan allows 300 emails a day; Resend's allows 100 a day (3,000 a month). Both need an account and a few DNS records on a **subdomain** such as `mail.rwcll.org`, so your admin mailboxes are not touched.
- More deliverability reporting, but one more service to look after.

**About rwcll.org.** Umpires do **not** need an rwcll.org address: their own emails stay as they are. The domain only
provides the **"From" identity** of the system's messages.

**What will be needed (either route):**

1. The sender mailbox or provider account, and its SMTP details.
2. The SMTP details entered in the Supabase dashboard (Authentication, then SMTP Settings) for the test and live projects.
3. A test: register from an address that is **not** on the Supabase team.

**Keep in mind:** invitations rely on the email being confirmed, so "Confirm email" must stay **on** for live.

## 27. The Outbox: email stubs, and how to switch on real sending

Real email sending is **not switched on yet**. So that it can be added later without changing any screen,
everything that wants to send an email adds the message to an **Outbox** instead.

**What you can do today** (super admin or umpire chief). Open **Outbox (messages waiting to be sent)** on your
dashboard. It lists waiting messages. For each one: open it, press **Copy message**, send it yourself from your
own email, then press **Mark as sent**. **Skip** sets a message aside without sending it. "Everything" shows the
history. Inviting an umpire now also adds the invitation message to the Outbox.

**Two different kinds of email (they are set up separately):**

| Kind | Examples | Sent by | Switched on by |
|---|---|---|---|
| **Sign-in emails** | Confirm your email, reset your password | Supabase Auth | Entering SMTP details in the Supabase dashboard (section 26) |
| **App messages** | Invitations, game assignments, schedule changes, reminders | The Outbox | A sender that reads the Outbox (to be built when you are ready) |

**How real sending will be switched on later** (nothing here needs to be done now):

1. Choose the route in section 26 and get its SMTP details.
2. A small scheduled server function reads **waiting** Outbox messages, sends each one through that service, and records the result (`sent` by `smtp`, or `failed` with the reason so it can be retried).
3. The screens keep working unchanged. The Outbox then becomes a record of what was sent, and "Mark as sent" is only needed if something fails.

**For whoever builds the next features:** every screen asks for an email through one function (`queueEmail` in `src\email.ts`),
which calls the database function `queue_email`. Automatic emails triggered inside the database (for example "an assignment
changed") use the internal function `enqueue_email`, which cannot be called from the app.

## 28. Rules about teams and games

These are enforced by the database itself, so they hold no matter which screen is used.

**Teams**

- A team's **division must belong to the team's own league**. The Teams screen only offers that league's divisions, and the database refuses anything else.
- A division that has teams **cannot be moved to another league**.
- A team with games **cannot be deleted**. Mark it inactive instead.

**Games**

- Every game belongs to a **season** and a **division**.
- **Both teams must be in the game's season and in the game's division.** A team with no division cannot play in a division game: set the team's division first.
- A side can be an **undecided bracket slot** such as "Winner of Game 3" (a short label, up to 100 characters) instead of a team. Each side is **either** a team **or** a label, never both and never neither. This is how tournament brackets will work.
- A game has a **type**: regular, tournament, or scrimmage.
- A team cannot play itself, and a game must end after it starts.
- The "last changed" time is kept by the database.
- A game can carry the **master calendar's Game ID**. It is optional, **unique within a season** (so the master calendar may restart its numbering each year), and may not start or end with a space.

**Not enforced as a hard rule (the games screen will warn instead):** two games at the same field at overlapping times, and a team in two games at once. Real leagues sometimes need exceptions, so these will be warnings you can see, not walls.

**Games with umpires** (the plate and field umpires, availability, and conflicts) come with the assignment screens.

## 29. Menus and pages: who sees what

After signing in, an approved person sees a **top bar** (their name and **Sign out**) and, if they have more than one page, a **menu** of tabs under it. Which pages they get depends on their roles. People with several roles get the pages of each.

| Role | Pages |
|---|---|
| Super admin | **Administration** (accounts, registrations, roles, league setup, umpire directory, Outbox, My details) and **Games** |
| Umpire chief | **Umpire Management** (registrations, umpire directory, Outbox, My details) and **Games** |
| Scheduler | **Umpires** (directory and Outbox), **Games**, **League Setup**, **My details** |
| Youth or adult umpire | **Home**, **My details** |
| Treasurer, feedback reviewer, read-only admin, parent | The plain account page for now (their pages come with their features) |

Combinations: chief and scheduler get *Umpire Management*, *Games* and *League Setup*. A scheduler who is also an umpire gets *Umpires*, *Games*, *League Setup*, *As an umpire*, and *My details*.

**The address bar follows the page**, for example `.../#/setup`. Back, Forward, and bookmarks work. If the address names a page the person is not allowed to see, they get their first page instead. **Signing out clears it**, so the next person starts at their own first page.

**Availability and assignments will each be a new tab** in this menu.

## 30. The Games tab

**Who:** super admins, umpire chiefs and schedulers. Find it in the menu as **Games**.

**The idea.** The master calendar belongs to the league; the umpire system holds a **copy** of it. When the master calendar changes, an administrator makes the same change here, either by editing the game on this tab or (coming next) by importing the updated spreadsheet. Games copied from the master calendar carry its **Game ID**, which is how a re-import will know which game to update instead of adding a duplicate. A game made by hand has no Game ID, and an import will never touch it.

**Reading the list.** It opens on the current season, from **today** onward, hiding canceled games. Change **Season**, **Division**, **Field**, **From**/**To**, or **Status**, or type in **Search** (it finds teams, fields, umpires, divisions and master Game IDs). **Only games with warnings** shows just the ones that need attention. The line above the list counts what you are looking at. Times are shown in your computer's time zone. On a phone each game is a small card.

**Warnings.** They never stop you from saving anything. They are there to be seen:

| Warning | When it appears |
|---|---|
| **No umpire assigned** | A draft or scheduled game, today or later, with nobody assigned. (Games in the past, canceled games and completed games are never flagged.) |
| **Field conflict** | Another game is at the same field at an overlapping time. A game that starts exactly when the previous one ends is **not** a conflict. |
| **Team conflict** | A team is in another game at an overlapping time, even at a different field. |

Canceled games never cause or receive conflicts. A game with only one of its two umpires assigned is not flagged yet; that comes with the assignment screens. A game with many conflicts shows the first three and "...and N more".

**Add a game** with the **Add game** button. Choose the season and division first: the team lists then show only that season's, that division's, active teams. For a tournament slot that is not decided yet, choose **Not decided yet (bracket slot)** and type a short label such as "Winner of Game 3". The **Master calendar Game ID** is optional.

**Edit a game** with its **Edit** button. If it has a master Game ID, the form reminds you that your change may be replaced the next time the spreadsheet is imported.

**Delete a game** only if it should never have existed. A game that is on the master calendar is better set to **Canceled**, because importing again would otherwise add it back. Deleting a game also removes its umpire assignments, and the confirmation tells you how many.

**What comes next on this tab**

1. **Export and print** the calendar with fields, teams and umpire assignments.
2. **Assigning umpires**, and umpires entering their availability.

**Importing from the master calendar spreadsheet** is built: see section 31.

## 31. Importing games from the master calendar

**Where:** Games tab, **Import from spreadsheet**. **Who:** super admins, umpire chiefs and schedulers.

**Get the file.** Export the master calendar and save it as **CSV** (in Excel or Google Sheets: File, Save as or Download, *Comma-separated values*). Excel files (`.xlsx`) are not read directly.

**The steps on screen**

1. Choose the **season** to import into, then choose the **file**. Nothing is saved yet.
2. **What is in the file.** Every kind of row (for example `Games - MAJ`, `Practices`) is listed. **Practices are skipped automatically**, because a practice has the word "Practice" where the opponent would be. Untick any other kind you do not want.
3. **Matches.** The screen matches the file's names to yours and you can change any of them:
   - **Divisions:** `MAJ` is matched to *Majors*, `TEE` to *Tee Ball*, and so on. If a name cannot be matched, choose the division yourself; games without a division are held back and listed as problems.
   - **Fields:** a field you already have is matched. Otherwise it is set to **Create a new field**, named after the location in the file (you can type a different name).
   - **Teams:** a team with the same name as one of this season's teams is matched. A name that looks like a league team (`MAJ 02 - Kays`) is set to **Create a new team**, in the game's division. Any other name (another club) is set to **Outside team (name only)**, which keeps the name on the game without making a team record.
4. **Preview.** It counts the games that are **new**, **changed** (and says exactly how), **unchanged**, have **problems**, or are **not in the file**. It also says which teams and fields will be created.
5. **Import.** One button says exactly what it will do. Everything is saved together, or, if anything is wrong, **nothing is saved** and the message names the game.

**How games are matched.** By the master calendar's **Game ID** (the `Match ID` column) within the season. A game that is already here is **updated** (teams, field, time, division, and status if the file gives one). A game that is not here is **added**. A game made by hand has no Game ID and is never touched. **Notes and Game IDs are never changed by an import.**

**Importing the same file again changes nothing:** it shows 0 new, 0 changed, and the button says "Nothing to import". This is safe to do whenever you are unsure.

**When the master calendar changes**, export it again and import it. The preview lists each change in words, for example `Time: Sun, Oct 4, 9:00 AM - 11:00 AM -> 9:30 AM - 11:30 AM`. A changed game that **already has umpires assigned** is flagged, so you know who may need to be told.

**Games that disappear from the master calendar.** If a game is here but not in the file (in the same days and divisions the file covers), the preview lists it under **not in the file**. It is **not deleted or changed**. Open it on the Games tab and set it to **Canceled**.

**Times.** The file's times are read in **your computer's time zone**, which the import screen states. Import from a computer set to the league's time zone.

**Do the season first.** Create the season, divisions and teams from the registration files (section 32), then import the calendar. The calendar then finds every team and division by itself, so only the fields need creating.

**Tips**

- Let the import create teams and fields using the master calendar's own names. Later imports then match by themselves.
- If you rename a team or field afterwards, the next import will not recognise it and will offer to create it again (the preview shows those games as changed). Choose the renamed team or field from the list in the matches, and everything lines up again.
- A file whose headings are different (for example *Game ID* instead of *Match ID*) is usually recognised. If not, the **Columns in the file** panel opens and you choose which column holds what.
- Limits: files up to 5 MB and 5,000 games at a time.

## 32. Creating a season from the registration files

**Where:** League Setup, **Create a season from a file**. **Who:** super admins, umpire chiefs and schedulers.

**What it does.** It reads the registration system's exports and creates, in one step, a **season**, its **divisions** and its **teams**, so you do not have to type them in. You do this once per season, before importing the calendar (section 31).

**The two files** (save each as **CSV** first)

| File | What it gives | Needed? |
|---|---|---|
| **Team Detail** | Every team, with its division and program (season) name | Yes. It is enough on its own |
| **Division Details** | The season's start and end dates, and how many teams each division should have | Optional |

**Words.** The registration system's "Program" (for example *2026 Fall Ball*) becomes a **season**. Your league (for example RWCLL) is chosen from a list. Divisions belong to the league and are reused from season to season, so a division you already have is matched, not created again.

**What you see, and what is decided for you**

1. **League and season.** If a season with the program's name already exists, it is chosen ("Add to: ..."), and only teams are added to it; its name and dates are never changed. Otherwise a **new season** is created, with a name and dates you can edit.
2. **Divisions.** Each is matched to one of yours by name. A bracketed description is ignored (`Majors (46-60)` matches `Majors`). A division you do not have is created, named **without** the description (`Majors`), and you can change that name. **External Teams** is **switched off** by default: those are other organizations' practice groups, not teams that need umpires. Untick any division to leave it and its teams out.
3. **Teams.** Each team is created in its division. Teams already in the season are left alone. Open **Teams** to untick any you do not want. A team with no coach name yet (for example `AA 06 -`) is created as it is and flagged; untick it to leave it out.
4. **Season dates.** If you add the Division Details file, the dates come from the earliest start and the latest end. An end date more than a year after the start (for example 2027 instead of 2026) is treated as a typing slip, ignored, and mentioned.
5. **Preview and button.** The preview counts what will be created and lists problems (which stop the button) and things worth a look. The button says exactly what it will do. Everything is saved together, or, if anything is wrong, **nothing is saved** and the message names the season, division or team.

**Running it again is safe.** The season is found by name, nothing is created twice, and the button says "Nothing new to add". If the registration system later gets **another team**, import the new Team Detail file: only that team is added. A team the registration has moved to another division is **not** moved here (you are warned), and teams here that are not in the file are listed but never touched.

**After it has run:** open **Seasons** to choose an age chart, and **Divisions** to set each division's age range if you use them. Then import the calendar (section 31): its teams, divisions and games line up automatically.

**Limits:** files up to 2 MB, 200 divisions and 2,000 teams at a time.
