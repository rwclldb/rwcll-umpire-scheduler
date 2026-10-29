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
7. [Running all the checks at once](#7-running-all-the-checks-at-once)
8. [Find an ordinary account's id](#8-find-an-ordinary-accounts-id)
9. [Run the app (normal and test mode)](#9-run-the-app)
10. [Run the build check](#10-run-the-build-check)
11. [Commit and push to GitHub ("push changes to the repo")](#11-commit-and-push-to-github)
12. [Work on a branch and merge it back](#12-work-on-a-branch-and-merge-it-back)
13. [Undo or go back](#13-undo-or-go-back)
14. [Compare test and live ("run the fingerprint")](#14-compare-test-and-live)
15. [Practice a restore](#15-practice-a-restore)
16. [Check or repair the migration history](#16-check-or-repair-the-migration-history)
17. [Supabase dashboard tasks](#17-supabase-dashboard-tasks)
18. [What each script is](#18-what-each-script-is)
19. [Typical sequences](#19-typical-sequences)
20. [Troubleshooting](#20-troubleshooting)
21. [Glossary](#21-glossary)
22. [Where things live](#22-where-things-live)
23. [Put files from Claude into the project](#23-put-files-from-claude-into-the-project)
24. [Clean up leftover test records](#24-clean-up-leftover-test-records)
25. [Where personal data is stored and who can see it](#25-where-personal-data-is-stored-and-who-can-see-it)
26. [How umpire registration and invitations work](#26-how-umpire-registration-and-invitations-work)
27. [Email: why sign-up fails on live, and the plan](#27-email-why-sign-up-fails-on-live-and-the-plan)
28. [The Outbox: email stubs, and how to switch on real sending](#28-the-outbox-email-stubs-and-how-to-switch-on-real-sending)
29. [Rules about teams and games](#29-rules-about-teams-and-games)
30. [Menus and pages: who sees what](#30-menus-and-pages-who-sees-what)
31. [The Games tab](#31-the-games-tab)
32. [Importing games from the master calendar](#32-importing-games-from-the-master-calendar)
33. [Creating a season from the registration files](#33-creating-a-season-from-the-registration-files)
34. [Printing and exporting schedules](#34-printing-and-exporting-schedules)
35. [Colors and appearance](#35-colors-and-appearance)
36. [Assigning umpires, and how many a game needs](#36-assigning-umpires-and-how-many-a-game-needs)
37. [Confirming, declining and reminders](#37-confirming-declining-and-reminders)
38. [Umpires assigning themselves](#38-umpires-assigning-themselves)
39. [Availability: when umpires can umpire](#39-availability-when-umpires-can-umpire)
40. [Further assignment rules: the division they play in, and messages about games umpires take](#40-further-assignment-rules-the-division-they-play-in-and-messages-about-games-umpires-take)
41. [Availability: repeating times, dates you can't umpire, and the calendar](#41-availability-repeating-times-dates-you-cant-umpire-and-the-calendar)
42. [Adding a person who is not an umpire (and giving them roles)](#42-adding-a-person-who-is-not-an-umpire-and-giving-them-roles)
43. [Fields and divisions: league fields, away fields, and the order of divisions](#43-fields-and-divisions-league-fields-away-fields-and-the-order-of-divisions)
44. [The field board and calendar](#44-the-field-board-and-calendar)
45. [The league logo](#45-the-league-logo)
46. [Game day: attendance, checking in, and calling umpires](#46-game-day-attendance-checking-in-and-calling-umpires)

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
4. `rls_check_ordinary_user.sql` has a line `test_user uuid := '00000000-...'`. **Leave it as it is**: the script then picks an approved ordinary account by itself (preferring one linked to an umpire record) and says which kind it used. Only replace the zeros if you want it to test as one particular account (section 8). Do not hard-code an id into the saved file: the test and live projects have different ids.
5. Click **Run**.
6. **The run ends with a red error. That is expected.** The report is inside the error message, and raising an error guarantees nothing is saved. The editor may also warn about "destructive operations" because the text contains delete statements; that is expected too.
7. Read the report lines (`PASS`, `FAIL`, `CHECK`, `SKIP`, `INFO`).

| Script | Proves | Good result |
|---|---|---|
| `rls_check_ordinary_user.sql` | An ordinary account cannot change setup data, give itself roles, approve accounts, or read other people's data | `Items needing attention: 0` |
| `rls_check_admin_access.sql` | A super admin can still read everything | `Failures: 0` |
| `role_rules_check.sql` | The role safeguards work (approved accounts only, youth/adult exclusive, last super admin protected) | `Failures: 0` (a `SKIP` is fine) |
| `account_details_check.sql` | The account-details rules work (only the account holder can turn text messages on, outside IDs are admin-only and unique, emails are unique) | `Failures: 0` |
| `further_rules_check.sql` | The youth umpire's own-division rule works (recorded division, or worked out from age; adults unaffected; direct writes and self-assigning too) and the messages to administrators when an umpire takes a game work (straight away within 48 hours, otherwise one summary per day, never twice) | `Failures: 0` |
| `attendance_check.sql` | Attendance works (an umpire can check in from 1 hour before the game until it ends, and not otherwise; an administrator can record, correct and clear it; nobody can write it directly; moving umpires between places keeps it; the history records it) | `Failures: 0` |
| `league_field_check.sql` | The league-field marker on fields works (a new field defaults to an away field; administrators can change it; an ordinary account and a signed-out visitor cannot) | `Failures: 0` |
| `availability_patterns_check.sql` | Repeating availability and "I can't" entries work (an umpire manages only their own; days of the week, times, notes and the season are checked; a repeating time needs a season with an end date; a signed-out visitor sees nothing) | `Failures: 0` |
| `availability_check.sql` | Availability works (an umpire manages only their own entries and sees nobody else's; an administrator manages anyone's; an entry cannot end before it starts, last more than 90 days, or carry a note over 200 characters; a signed-out visitor sees nothing) | `Failures: 0` |
| `self_assignment_check.sql` | Umpires assigning themselves works (only where a division allows it and the umpire is allowed; overlapping games, taken places, played and canceled games, the limit on upcoming games and the youth age rule are all refused; the places offered are right; a signed-out visitor cannot) | `Failures: 0` |
| `assignment_confirmation_check.sql` | Confirming, declining, the history, the queued messages and the "still unconfirmed" warning work (an umpire can answer only for themselves; a decline frees the place and tells the administrators; the warning is queued once per assignment and respects the league's number of days; nobody can edit the history) | `Failures: 0` |
| `umpire_assignments_check.sql` | The umpires-per-game settings, the places (plate to third base) and the assignment rules work (0 to 4 umpires; tournament numbers; active umpires only; nobody on a canceled game; the youth age rule; swaps work; a refused change saves nothing; only scheduling admins can assign) | `Failures: 0` |
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

## 7. Running all the checks at once

There are about ten check scripts. Instead of pasting each into the SQL Editor, one command runs all of them and says which ones have problems.

**Run it** from the project folder:

```
powershell -ExecutionPolicy Bypass -File .\scripts\run-all-checks.ps1
```

It asks for the **Session pooler host** and the database **password** (typed hidden, never saved), the same as `restore-to-test.ps1`. It defaults to the **test** project. For live:

```
powershell -ExecutionPolicy Bypass -File .\scripts\run-all-checks.ps1 -Target live
```

It asks you to type `LIVE` first. To run only some checks, add `-Only` and part of a file name, for example `-Only games`.

**What you see**

```
  [ PASS ]  account_details_check.sql    16 tests passed
  [ FAIL ]  games_rules_check.sql        1 problem in 18 tests
            FAIL  G3  a team from a different division was accepted
  [ STOP ]  import_games_check.sql       could not finish: ERROR: relation ... does not exist

RESULT: 2 OF 10 CHECKS NEED ATTENTION on TEST
```

| Mark | Meaning |
|---|---|
| **PASS** | The check ran to the end and found no problems |
| **FAIL** | The check ran, and one or more tests failed (the failing lines are shown) |
| **STOP** | The check could not finish (for example a missing table, or a typing slip in the script). **This is never counted as a pass.** |

The last line is the answer: **ALL ... CHECKS PASSED**, or how many need attention and which. A full log of every check's output is saved in `D:\sandbox\RWCLL-backups\check-results` (named with the project and time), which is handy to send to Claude if something fails.

**It is safe on live.** Every check runs inside a transaction that is **always rolled back**, even if a check script had a mistake, so nothing is ever saved.

**New checks are included automatically.** Any file in `supabase\tests` with `check` in its name is run (`schema_fingerprint.sql` is not a check, so it is skipped).

**Where it looks for the check scripts.** It finds the project itself (from where `run-all-checks.ps1` lives), so it does not matter which folder you run it from. It looks in `supabase\tests` first, then in the other likely places (`supabase`, `scripts`, `docs`, `tests`, `sql`, and the project folder), and says if it had to use a different folder. If it finds **no** check scripts, it lists where it looked and tells you to create `supabase\tests` and copy the `*_check.sql` files into it. If it sees them in your **Downloads** folder, it gives the exact commands to move them.

**If it will not start:** "psql was not found" means passing the real location with `-PsqlPath`; "Could not connect" shows the reason from the database (a wrong host or password are the usual causes).

## 8. Find an ordinary account's id

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

## 9. Run the app

**Normal (this uses the LIVE project, so changes you make are real):**

```powershell
npm run dev
```

**Test mode (uses the TEST project):**

```powershell
npm run dev -- --mode test
```

Test mode needs a file named `.env.test` (section 17). To be sure which project you are on:
press **F12**, open the **Network** tab, type `supabase` in the filter, and reload.
The requests should go to `mucsujj...` for test, or `tayveud...` for live.

Open http://localhost:5173/ in the browser. Stop the app with **Ctrl+C** in the terminal.

## 10. Run the build check

```powershell
npm run build
```

A good result ends with a line like `built in 150ms` and no errors. If it prints errors,
copy them exactly and send them to Claude.

## 11. Commit and push to GitHub

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

## 12. Work on a branch and merge it back

A branch is a safe side copy for risky changes. If it goes wrong, you can walk away from it.

```powershell
git status
git checkout -b name-of-the-change
```

...make changes, test, and commit (section 11)...

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

## 13. Undo or go back

| I want to... | Command | Careful |
|---|---|---|
| See what changed | `git status`, then `git diff` | Read-only |
| Throw away my unsaved edits to one file | `git restore path\to\file` | **Cannot be undone** |
| Leave a branch and return to the main one | `git checkout main` | Commit or stash first |
| Undo my last commit but keep the changes | `git reset --soft HEAD~1` | Only if it is **not pushed** yet |
| Anything else | Ask Claude first | |

## 14. Compare test and live

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

## 15. Practice a restore

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

## 16. Check or repair the migration history

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

## 17. Supabase dashboard tasks

- **Find a project's publishable key:** Project Settings, then API Keys. It is designed to be public, but still do not paste it into chat.
- **Create `.env.test`** in the project folder (it is already ignored by Git) with two lines:
  ```
  VITE_SUPABASE_URL=https://mucsujjpfefrfxystxse.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=paste-the-TEST-publishable-key-here
  ```
- **Allow the app's address for email links** (password reset): Authentication, then URL Configuration, then Redirect URLs. Add `http://localhost:5173/**`. Do this on **both** projects. A website address is added here later too.
- **Reset a database password:** Project Settings, then Database, then Reset database password.
- **Approve an account:** sign in to the app as super admin, open **Administration**, then **Approvals**; pending accounts and umpire registrations are there. Then use **Roles** to give it roles.

## 18. What each script is

| File | What it does | Changes data? |
|---|---|---|
| `scripts\backup-live.ps1` | Saves a backup of the LIVE project to `D:\sandbox\RWCLL-backups` | No (reads only) |
| `scripts\restore-to-test.ps1` | Loads a backup into an empty TEST project | Test only |
| `scripts\run-all-checks.ps1` (and `scripts\run-checks.mjs`) | Runs **every** check script below against TEST or LIVE and reports which ones have problems (section 7) | No (every check is rolled back) |
| `supabase\tests\rls_check_ordinary_user.sql` | Tries forbidden actions as an ordinary account (picks one by itself) | No (always rolls back) |
| `supabase\tests\rls_check_admin_access.sql` | Confirms a super admin can read everything | No (always rolls back) |
| `supabase\tests\role_rules_check.sql` | Tests the role safeguards | No (always rolls back) |
| `supabase\tests\account_details_check.sql` | Tests the phone, text-message, outside-ID and unique-email rules | No (always rolls back) |
| `supabase\tests\email_outbox_check.sql` | Tests the Outbox rules | No (always rolls back) |
| `supabase\tests\further_rules_check.sql` | Tests the own-division rule and the messages about self-assigned games (builds its own league, divisions, age chart, umpires and sign-in accounts; your data is not changed) | No (always rolls back) |
| `supabase\tests\attendance_check.sql` | Tests attendance and check-in (builds its own league, games, umpires and sign-in accounts; your data is not changed) | No (always rolls back) |
| `supabase\tests\league_field_check.sql` | Tests the league-field marker on locations (your data is not changed) | No (always rolls back) |
| `supabase\tests\availability_patterns_check.sql` | Tests repeating availability and the "I can't" entries (builds its own sign-in accounts, umpires and seasons; your data is not changed) | No (always rolls back) |
| `supabase\tests\availability_check.sql` | Tests the availability rules (builds its own sign-in accounts and umpires; your data is not changed) | No (always rolls back) |
| `supabase\tests\self_assignment_check.sql` | Tests umpires assigning themselves (builds its own league, umpires and sign-in accounts; your data is not changed) | No (always rolls back) |
| `supabase\tests\assignment_confirmation_check.sql` | Tests confirming, declining, the history, the queued messages and the unconfirmed warning (builds its own league, umpires and sign-in accounts; your data is not changed) | No (always rolls back) |
| `supabase\tests\umpire_assignments_check.sql` | Tests the umpires-per-game settings, the places, the youth age rule and the assignment rules (builds its own tiny league, umpires and age chart; your data is not used) | No (always rolls back) |
| `supabase\tests\import_season_check.sql` | Tests the season import function (builds its own tiny leagues; your data is not used) | No (always rolls back) |
| `supabase\tests\import_games_check.sql` | Tests the spreadsheet import function (builds its own tiny league; your data is not used) | No (always rolls back) |
| `supabase\tests\games_master_id_check.sql` | Tests the master calendar Game ID rules (builds its own tiny league; your data is not used) | No (always rolls back) |
| `supabase\tests\games_rules_check.sql` | Tests the team and game rules (builds its own tiny league; your data is not used) | No (always rolls back) |
| `supabase\tests\registration_check.sql` | Tests sign-up, invitations and approval (creates temporary test accounts) | No (always rolls back) |
| `supabase\tests\schema_fingerprint.sql` | Summarises a database's structure for comparison | No (reads only) |
| `supabase\migrations\*.sql` | The database changes, applied in file-name order | Yes, when pushed |
| `.github\workflows\keep-alive.yml` | Calls the database daily so the free plan does not pause it | No |

## 19. Typical sequences

**A new database change**

1. Save the migration file into `supabase\migrations`.
2. Check TEST is linked, dry run, push (section 3).
3. Run the check scripts on test (section 6).
4. Try the app in test mode (section 9).
5. Take a fresh backup (section 4).
6. Roll out to live and run the checks there (section 5).
7. Link back to test (section 2), then commit and push (section 11).

**A new screen or code change**

1. Copy the new files into `src`.
2. `npm run build` (section 10).
3. `npm run dev -- --mode test` and try it (section 9).
4. Commit and push (section 11).

## 20. Troubleshooting

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
| The reset link opens a page that doesn't sign you in | The Redirect URL is missing | Section 17, "Allow the app's address" |
| `Supabase configuration is missing` | The `.env` file is missing or misnamed | Check `.env` (or `.env.test` in test mode) |
| App opens on port 5174 instead of 5173 | Another copy is still running | Close the other terminal (Ctrl+C), or add the new port to Redirect URLs |
| `running scripts is disabled` | PowerShell blocks `.ps1` files by default | Run them exactly as written here, with `-ExecutionPolicy Bypass -File` |
| `npm run build` prints errors | A code problem | Copy the errors exactly and send them to Claude |
| `git push` is rejected | GitHub has changes you do not | Ask Claude before doing anything else |
| The Outbox looks empty after inviting someone | Older versions only reloaded when opened. The current version updates by itself and has a **Refresh** button. | Press **Refresh**. If it is still empty, run this in the SQL Editor to see what really exists: `select created_at, kind, to_email, subject, status from public.email_outbox order by created_at desc limit 10;` |
| VS Code shows a red underline (for example "Cannot find module") but `npm run build` is fine | VS Code's TypeScript checker is out of date. It often misses files that were just added, moved or replaced. | Press `Ctrl+Shift+P`, type **TypeScript: Restart TS Server**, and press Enter. The real compiler (`npm run build`) is the one to trust. |
| `Cannot find module "../supabase"` (or `"../ui"`, `"./types"`) in a file inside a folder | The file is in the wrong folder, or VS Code rewrote its `import` lines when the file was dragged. `./` means the same folder, `../` means one folder up. | Check the file's folder against the layout in section 23. When VS Code asks "Update imports for moved file?", answer **No**, or re-copy the file. |
| `Property 'X' does not exist on type ...` (for example `umpires_needed` on `Game`) after copying files | An old copy of a file is still in place, most often one of the **two `types.ts` files** (`src\games` and `src\setup`). Check them with the `Select-String` commands in section 23, then unzip the update zip over the project again |
| League Setup (or another screen) says `Unable to load setup records` | The app asked the database for something it does not have yet, almost always because the newest migration has not been applied to the database in use. The page now shows the database's own message underneath: *column ... does not exist* means exactly this. Check which database you are on (sections 1 and 9: test mode shows `mucsujj` in the browser's Network tab), then apply the migration (section 3) and run the checks (section 7). You can also see the message in the browser console (F12), on the line starting `League setup load failed` |
| The season import says "A season called ... already exists" | You chose **Create a new season** but one with that name is already there | In the **Season** list, choose **Add to: that season** (to add teams to it), or give the new season a different name. |
| Signing up on **live** says the email "cannot be used as it is not authorized" | Supabase's built-in email sender only reaches your own team's addresses (error code `email_address_not_authorized`). Sign-up needs a confirmation email, so everyone else is refused. | A real email provider has to be connected (see section 27). Until then only team members can register on live. |
| Someone signed up as an umpire but is not in **Umpire registrations** | They must confirm their email and then sign in once; the record is created at that sign-in | Ask them to confirm the email and sign in. People who never confirm never appear (this keeps spam out). |
| An invited person registered but was not approved automatically | The email must match the invitation exactly, be **confirmed**, and the invitation must be open (not expired or revoked) and the record not already linked. They must also **sign in once** after confirming. | Open Edit on their umpire record: the Invitation panel shows the status. Renew it if it expired. |

## 21. Glossary

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

## 22. Where things live

```
rwcll-umpire-scheduler\
  src\                     the app (main.ts, roles.ts, umpires.ts, my-details.ts, registrations.ts, email.ts, outbox.ts, shell.ts, league_setup.ts, style.css, ...)
  src\setup\               the League Setup pieces (leagues, seasons, divisions, teams, locations, ...)
  supabase\migrations\     database changes, in order
  supabase\tests\          check scripts and the schema fingerprint
  scripts\                 backup, restore and run-all-checks scripts
  docs\                    this FAQ, RECOVERY.md and EMAIL-SETUP.md
  .github\workflows\       the daily keep-alive job
  .env                     LIVE settings        (never committed)
  .env.test                TEST settings        (never committed)
D:\sandbox\RWCLL-backups\  backups              (outside the project, never committed)
```

## 23. Put files from Claude into the project

When Claude says "copy the file into `src`" or "save the migration", this is where each kind of file goes.
If the same file already exists, **overwrite it**.

| The file | Goes in |
|---|---|
| A `.sql` whose name starts with a 14-digit number, like `20261024180000_...sql` | `supabase\migrations` |
| `rls_check_...sql`, `role_rules_check.sql`, `account_details_check.sql`, `registration_check.sql`, `email_outbox_check.sql`, `games_rules_check.sql`, `games_master_id_check.sql`, `import_games_check.sql`, `import_season_check.sql`, `umpire_assignments_check.sql`, `assignment_confirmation_check.sql`, `self_assignment_check.sql`, `availability_check.sql`, `availability_patterns_check.sql`, `further_rules_check.sql`, `league_field_check.sql`, `attendance_check.sql`, `schema_fingerprint.sql` | `supabase\tests` |
| `backup-live.ps1`, `restore-to-test.ps1`, `run-all-checks.ps1`, `run-checks.mjs` | `scripts` |
| App files such as `main.ts`, `roles.ts`, `umpires.ts`, `my-details.ts`, `registrations.ts`, `email.ts`, `outbox.ts`, `shell.ts`, `role-names.ts`, `games.ts`, `league_setup.ts`, `ui.ts` | `src` |
| `csv-out.ts`, `schedule.ts`, `print.ts`, `umpire-schedule.ts`, `my-schedule.ts` (printing and exporting), `staffing.ts`, `assign.ts`, `contacts.ts`, `open-games.ts`, `take-options.ts`, `availability.ts`, `availability-calendar.ts`, `board.ts`, `board-model.ts`, `attendance.ts`, `game-day.ts`, `game-day-model.ts`, `availability-editor.ts` (assigning umpires, phone numbers, games to take, availability) | `src\games` |
| `season-plan.ts`, `season-import.ts`, `teams.ts`, `state.ts` | `src\setup` (the folder that already holds the other setup files) |
| `types.ts`, `format.ts`, `warnings.ts`, `data.ts`, `form.ts`, `csv.ts`, `calendar.ts`, `matching.ts`, `plan.ts`, `importer.ts` (the files in the `games` folder; see also the next row) | `src\games` (a folder inside `src`, next to `games.ts`) |
| The League Setup pieces (`leagues.ts`, `seasons.ts`, `divisions.ts`, `teams.ts`, ...) | `src\setup` |
| `style.css` | `src` (it replaces `src\style.css`) |
| `FAQ.md`, `RECOVERY.md`, `EMAIL-SETUP.md`, `ROADMAP.md`, `FEATURES.md` | `docs` |
| `keep-alive.yml` | `.github\workflows` |
| A `.zip` | Unzip into the project folder (see below). **This is the safest way**: the folders inside the zip put every file in its right place |

**Two files are both called `types.ts`.** One belongs in `src\games` and a different one belongs in `src\setup`. In a list of downloads they look identical, so they are easy to mix up or to skip. If a file lands in the wrong folder, or an old copy stays behind, the build shows errors such as *Property 'umpires_needed' does not exist on type 'Game'*. To check, run these from the project folder; each should print one or more matching lines:

```powershell
Select-String -Path src\games\types.ts -Pattern "umpires_needed","tournament_umpires"
Select-String -Path src\setup\types.ts -Pattern "tournament_umpires"
```

If either prints nothing, copy that file again from the zip. Using a zip avoids the problem, because it keeps the two files in their own folders.

To unzip a download so its folders land in the right places (replace the path with where you saved it):

```powershell
Expand-Archive -Path "$HOME\Downloads\league-setup-split.zip" -DestinationPath . -Force
```

Afterwards:

- If your browser added `(1)` or `_1` to a file name (for example `league_setup_1.ts`), **rename it to the exact name** before copying.
- Run `git status`. You should see the files you copied listed as modified or new, and nothing else. Anything unexpected: ask Claude.
- Warnings about `LF` and `CRLF` line endings are harmless.

## 24. Clean up leftover test records

**Leagues, seasons, divisions, teams:** open **Administration**, then **League Setup** (a scheduler has a **League Setup** tab). **Locations** are in **Administration**, then **Locations**. Press **Edit** on the
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

## 25. Where personal data is stored and who can see it

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
| Availability: single times, and dates an umpire cannot umpire | `umpire_availability` | Scheduling admins; an umpire sees only their own | The umpire, and scheduling admins |
| Availability: repeating times | `umpire_availability_patterns` | Scheduling admins; an umpire sees only their own | The umpire, and scheduling admins |
| Game assignments | `game_assignments` | Scheduling admins; an umpire sees only their own | Scheduling admins |

Things worth knowing:

- **Phone numbers in lists:** if someone has both an account phone (set on **My details**) and a phone on their umpire record, the lists show the **account phone**. The umpire-record phone is the fallback.
- **Email in the directory:** a linked umpire shows their **account's** email. An unlinked umpire shows the email an admin typed on the umpire record.
- **Outside IDs** (ID 1: main league database, ID 2: backup system) are unique: one outside record cannot be attached to two people. They never appear in any list the person can see.
- **Text messages are not available yet.** The "My details" box only records a preference, with the time it was chosen.
- **Birth dates** are for administrators only. They are used to tell youth from adult and to find umpires under 13.

## 26. How umpire registration and invitations work

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

## 27. Email: why sign-up fails on live, and the plan

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

## 28. The Outbox: email stubs, and how to switch on real sending

Real email sending is **not switched on yet**. So that it can be added later without changing any screen,
everything that wants to send an email adds the message to an **Outbox** instead.

**What you can do today** (super admin or umpire chief). A super admin opens **Administration**, then **Outbox**; an umpire chief opens **Outbox (messages waiting to be sent)** on the Umpire Management page. It lists waiting messages. For each one: open it, press **Copy message**, send it yourself from your
own email, then press **Mark as sent**. **Skip** sets a message aside without sending it. "Everything" shows the
history. Inviting an umpire now also adds the invitation message to the Outbox.

**Two different kinds of email (they are set up separately):**

| Kind | Examples | Sent by | Switched on by |
|---|---|---|---|
| **Sign-in emails** | Confirm your email, reset your password | Supabase Auth | Entering SMTP details in the Supabase dashboard (section 27) |
| **App messages** | Invitations, game assignments, schedule changes, reminders | The Outbox | A sender that reads the Outbox (to be built when you are ready) |

**How real sending will be switched on later** (nothing here needs to be done now):

1. Choose the route in section 27 and get its SMTP details.
2. A small scheduled server function reads **waiting** Outbox messages, sends each one through that service, and records the result (`sent` by `smtp`, or `failed` with the reason so it can be retried).
3. The screens keep working unchanged. The Outbox then becomes a record of what was sent, and "Mark as sent" is only needed if something fails.

**For whoever builds the next features:** every screen asks for an email through one function (`queueEmail` in `src\email.ts`),
which calls the database function `queue_email`. Automatic emails triggered inside the database (for example "an assignment
changed") use the internal function `enqueue_email`, which cannot be called from the app.

## 29. Rules about teams and games

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

## 30. Menus and pages: who sees what

After signing in, an approved person sees a **top bar** (their name, their **roles** in small italics beneath it, and **Sign out**) and, if they have more than one page, a **menu** of tabs under it. Which pages they get depends on their roles. People with several roles get the pages of each.

| Role | Pages |
|---|---|
| Super admin | **Administration** (a page of buttons for Approvals, Roles, League Setup, Locations, Umpire Directory, Outbox and My details; see below) **Games** and **Field board** |
| Umpire chief | **Umpire Management** (registrations, umpire directory, Outbox, My details), **Games** and **Field board** |
| Scheduler | **Umpires** (directory and Outbox), **Games**, **Field board**, **League Setup**, **My details** |
| Youth or adult umpire | **Home** (a **Game day** card for today's games with a check-in button, their own printable schedule, **My availability**, and games they can take), **My details** |
| Treasurer, feedback reviewer, read-only admin, parent | The plain account page for now (their pages come with their features) |

Combinations: chief and scheduler get *Umpire Management*, *Games* and *League Setup*. A scheduler who is also an umpire gets *Umpires*, *Games*, *League Setup*, *As an umpire*, and *My details*.

**The Administration tab** (super admin) opens a page of buttons, one for each part, with a small italic line under each saying what it is for. Press a button to open that part. Inside a part, a row of tabs across the top (**Overview**, then every part) lets you jump to another part without going back, and the browser's Back and Forward buttons work too. Each part has its own address, so you can bookmark it (for example `#/admin/roles`).

| Part | What it is for |
|---|---|
| **Approvals** | New accounts and umpire registrations waiting for approval, and the other pending accounts |
| **Roles** | Giving people their roles, and what each role allows |
| **League Setup** | Leagues, seasons, divisions and teams, and creating a season from the registration files |
| **Locations** | The fields where games are played, with their addresses, marked as a league field (one this league runs) or an away field (one our teams travel to) |
| **Umpire Directory** | Everyone who umpires: records, contact details, invitations, linking to accounts |
| **Outbox** | Messages waiting to be sent (invitations, assignments, reminders) |
| **My details** | Your own phone number and text-message preference |

Other roles are unchanged: an **umpire chief** still has one **Umpire Management** page (with a collapsible Outbox), and a **scheduler** still has a **League Setup** tab that shows everything, locations included.

**Your roles** are listed under your name in the top bar (most important first, for example *Super admin, Scheduler, Adult umpire*), and again on **My details**. Hover over them to see the full list on a small screen.

**The address bar follows the page**, for example `.../#/setup`. Back, Forward, and bookmarks work. If the address names a page the person is not allowed to see, they get their first page instead. **Signing out clears it**, so the next person starts at their own first page.

**Availability and assignments will each be a new tab** in this menu.

## 31. The Games tab

**Who:** super admins, umpire chiefs and schedulers. Find it in the menu as **Games**.

**The idea.** The master calendar belongs to the league; the umpire system holds a **copy** of it. When the master calendar changes, an administrator makes the same change here, either by editing the game on this tab or (coming next) by importing the updated spreadsheet. Games copied from the master calendar carry its **Game ID**, which is how a re-import will know which game to update instead of adding a duplicate. A game made by hand has no Game ID, and an import will never touch it.

**Reading the list.** It opens on the current season, from **today** onward, hiding canceled games. Change **Season**, **Division**, **Field**, **From**/**To**, or **Status**, or type in **Search** (it finds teams, fields, umpires, divisions and master Game IDs). **Only games with warnings** shows just the ones that need attention. The line above the list counts what you are looking at. Times are shown in your computer's time zone. On a phone each game is a small card.

**Warnings.** They never stop you from saving anything. They are there to be seen:

| Warning | When it appears |
|---|---|
| **No umpire assigned** | A draft or scheduled game that needs umpires, today or later, with nobody assigned. (Games in the past, canceled games and completed games are never flagged, and neither is a game that needs no umpire.) |
| **Needs a field umpire** (or plate, first base, ...) | Some umpires are assigned, but fewer than the game needs. It names the place that is still open, or says *Needs 2 more umpires* when several are. |
| **Not available: Ann Lee** | An umpire on a game still to come has entered availability that does **not** cover the game, or has marked the time as one they **can't** umpire (this works even if they entered nothing else). Never shown for an umpire who entered nothing at all. See sections 39 and 41. |
| **Field conflict** | Another game is at the same field at an overlapping time. A game that starts exactly when the previous one ends is **not** a conflict. |
| **Team conflict** | A team is in another game at an overlapping time, even at a different field. |

Canceled games never cause or receive conflicts. A game with many conflicts shows the first three and "...and N more".

**Add a game** with the **Add game** button. Choose the season and division first: the team lists then show only that season's, that division's, active teams. For a tournament slot that is not decided yet, choose **Not decided yet (bracket slot)** and type a short label such as "Winner of Game 3". The **Master calendar Game ID** is optional.

**Edit a game** with its **Edit** button. If it has a master Game ID, the form reminds you that your change may be replaced the next time the spreadsheet is imported.

**Delete a game** only if it should never have existed. A game that is on the master calendar is better set to **Canceled**, because importing again would otherwise add it back. Deleting a game also removes its umpire assignments, and the confirmation tells you how many.

**Assigning umpires** is described in section 36, and **printing and downloading the schedule** in section 34.

**What comes next on this tab**

1. Umpires entering their availability.

**Importing from the master calendar spreadsheet** is built: see section 32.

## 32. Importing games from the master calendar

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

**Do the season first.** Create the season, divisions and teams from the registration files (section 33), then import the calendar. The calendar then finds every team and division by itself, so only the fields need creating.

**Tips**

- Let the import create teams and fields using the master calendar's own names. Later imports then match by themselves.
- If you rename a team or field afterwards, the next import will not recognise it and will offer to create it again (the preview shows those games as changed). Choose the renamed team or field from the list in the matches, and everything lines up again.
- A file whose headings are different (for example *Game ID* instead of *Match ID*) is usually recognised. If not, the **Columns in the file** panel opens and you choose which column holds what.
- Limits: files up to 5 MB and 5,000 games at a time.

## 33. Creating a season from the registration files

**Where:** League Setup, **Create a season from a file**. **Who:** super admins, umpire chiefs and schedulers.

**What it does.** It reads the registration system's exports and creates, in one step, a **season**, its **divisions** and its **teams**, so you do not have to type them in. You do this once per season, before importing the calendar (section 32).

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

**After it has run:** open **Seasons** to choose an age chart, and **Divisions** to set each division's age range if you use them. Then import the calendar (section 32): its teams, divisions and games line up automatically. The **Teams** list in League Setup can be filtered by season **and by division** (each division shows how many teams it has).

**Limits:** files up to 2 MB, 200 divisions and 2,000 teams at a time.

## 34. Printing and exporting schedules

**Where:** the **Games** tab (super admins, umpire chiefs and schedulers). Umpires print their own from their **Home** page.

**The day-by-day schedule.** On the Games tab, set the filters to what you want (season, division, field, dates, status), then:

| Button | What you get |
|---|---|
| **Print schedule** | A printable page with a heading for each day, and under it a table: time, division, field (with its address), the two teams, the plate umpire and the field umpire. It prints exactly the games shown on screen. |
| **Download CSV** | The same games as a spreadsheet file (opens in Excel or Google Sheets), one row per game. An umpire spot that is still empty is an **empty cell**, so you can filter for it. |
| *Start each day on a new page* (tick box) | Each day begins on a fresh sheet, handy for posting one day at a time. |

On paper, an umpire spot that is still empty is boxed and marked **OPEN**, so it stands out even on a black-and-white printer. Canceled games (when you choose to show them) are struck through and marked CANCELED. A long day continues onto the next page with its column headings repeated. The printout header says what is being shown and when it was printed, with the time zone.

**Tip: save as PDF.** In the print window, choose **Save as PDF** as the printer to email the schedule instead of printing it.

**One umpire's schedule.** Press **One umpire's schedule**, choose an umpire, and you see all their games across every season, with **From** and **To** dates (it starts from today; clear **From** to include past games) and **Include canceled games**. **Print this schedule** and **Download CSV** then act on what is shown. It lists the date, time, position (**Plate** or **Field**), the field with its address, the game and the division.

**For umpires.** Each umpire's **Home** page has **My schedule** with the same dates, **Print this schedule** and **Download CSV**. An umpire can see **only their own games**, with their own position, and **never another umpire's name**, even when they work a game together. If their account is not connected to an umpire record yet, the page says so.

**CSV columns.** Day schedule: Date, Day, Start, End, Division, Field, Address, Home, Away, Plate umpire, Field umpire, Status, Type, Master Game ID, Notes. Umpire schedule: Date, Day, Start, End, Position, Field, Address, Division, Home, Away, Status, Master Game ID. Dates are written as `2026-10-04` so they sort correctly. Text that begins with `=`, `+`, `-` or `@` gets a `'` in front, so a spreadsheet never treats a name as a formula.

**Times** are shown in the time zone of the computer doing the printing.

### Printing with phone numbers

Under the filters there is a checkbox, **When printing, include phone numbers**. It is **off** each time you open the Games tab (it is never remembered, on purpose), and it affects the **printout only**; the spreadsheet download never includes phone numbers.

- With it on, each umpire's number follows their name: *Plate: Ann Lee · 650-555-1234*.
- A **youth umpire** shows both numbers: *Own 650-555-1111 · Parent 408-555-2222*. The parent's number is the **Emergency Contact Phone** on the umpire's record, so for a youth umpire, enter a parent or guardian there (the form says so).
- Someone with a sign-in account shows the **account's** phone number; the phone on the umpire record is used only when there is no account number.
- An umpire with no number anywhere shows *no phone on file*, so the gap is easy to spot before the schedule is handed out.
- The page says *Includes private phone numbers: keep this page private*. Only scheduling administrators can print numbers; an umpire's own schedule never shows anyone else's.
- The numbers are looked up when you press Print, only for the umpires on the printed games. If they cannot be looked up, **nothing is printed** and the reason is shown, so you never get a printout that quietly lacks numbers.

## 35. Colors and appearance

The app uses the league colors: **forest green, black and white**, with neutral grays. The white button text and the green links all pass the standard contrast test (the textbook "forest green" `#228b22` does not, so a slightly deeper green is used).

| Use | Color |
|---|---|
| Main green (buttons, links, headings accents) | `#1b6b3a` |
| Darker green (hover, active text) | `#14532d` |
| Light green tint (selected tab, highlights) | `#e6f2ea` |
| Top bar | black `#0f1210` with a green rule |
| Green for use on black | `#4fbf7a` |
| Text | near-black `#14171a`, with grays `#4a4f52` and `#656b6e` |
| Page background | `#f2f4f2` |

Red and amber are kept for **errors** and **warnings** only, so they keep their meaning. All of it lives in `style.css`. When the graphical theming happens later, these are the colors to start from.

## 36. Assigning umpires, and how many a game needs

**Who:** super admins, umpire chiefs and schedulers. Every game on the **Games** tab has an **Umpires** button next to **Edit**.

**How many umpires a game needs**

- Each **division** has a default, from **No umpire** to **4 umpires**. Change it in **League Setup**, under the division, at **Umpires needed per game**. A division that uses no umpires at all (Wiffle, Tee Ball, A Ball) is set to **No umpire**: its games then show no OPEN places and no warnings.
- A division can also have its own number for **tournament games** (**Umpires needed for tournament games**). Leave it on **Same as regular games** unless tournaments differ.
- Any single **game** can use its own number, **No umpire needed** to **4 umpires**. Set it in the game's **Edit** form (**Umpires needed for this game**) or in the **Umpires** panel. Leave it on **Use the division's default** to follow the division (the choice tells you what that number is, and for a tournament game it uses the tournament number).
- Importing the master calendar never changes this setting, so your choices survive a re-import.

**The places.** The number decides which places are used:

| Umpires | Places |
|---|---|
| 1 | Plate |
| 2 | Plate, Field |
| 3 | Plate, First base (1B), Third base (3B) |
| 4 | Plate, First base, Second base, Third base |

**A game is fully staffed when it has at least as many umpires as it needs.** It is counted by number, not by place: if you change a two-umpire game to **1 umpire** and the umpire who is there is listed as the *field* umpire, the game is still fully staffed. Lowering a game's number never removes anyone: everyone already assigned stays on the game.

**What the list shows.** In the **Umpires** column: each umpire's place and name, **OPEN** (in red) for a place that still needs someone, nothing for a place the game does not need, and a note such as *3 needed (set for this game)* when the game has its own number. Warnings: **No umpire assigned** (nobody yet) and **Needs a field umpire** / **Needs 2 more umpires** (some, but not all). The summary line counts them (*2 need an umpire*, *1 partly staffed*).

**The Umpires panel**

1. Press **Umpires** on the game. The panel shows the game and **Umpires needed for this game**.
2. Choose an umpire for each place shown. Each list shows the **active** umpires, in name order, with how many games they already have this season. Youth umpires are marked *(youth)*.
3. Choosing someone who is already in another place **swaps** the two.
4. **Save umpires.** The umpires are saved together, all or nothing. **Cancel** saves nothing.

**The youth umpire age rule.** A **youth umpire cannot umpire a division whose players start at the umpire's own Little League age, or older.** For example a 13-year-old cannot umpire Seniors (players start at 13), and a 12-year-old cannot umpire Juniors (players start at 12), but a 13-year-old can umpire Juniors.

- The umpire's **Little League age** comes from their birth month and year and the **season's age chart**, so each season needs its age chart set up (see League Setup) for the rule to work.
- Such an umpire is still listed in the panel, marked **age rule**, but cannot be chosen, and the panel says who is not available. The database refuses it as well, with the reason.
- **The rule never guesses.** If a youth umpire has no birth date on file, or the season's chart does not cover their birth month, they are **not** blocked. The panel shows a note ("the youth age rule could not be checked") and you decide. If a division has no age range set, no one is blocked from it.
- Adult umpires are not affected.
- A youth umpire also cannot umpire **the division they themselves play in** (section 40).

**Clash warnings.** An umpire who already has a game that overlaps this one is marked **busy at this time** in the list, and a note under the choices says which game. This is a **warning only**: you can still save, because real leagues sometimes need an exception. Canceled games never count as a clash, and a game that starts exactly when another ends is not a clash.

**What the database refuses** (and tells you why)

| Refused | Why |
|---|---|
| An umpire who is **inactive or suspended** | Only active umpires can be put on a game. An umpire who became inactive *after* being assigned can stay on that game. |
| A **youth umpire** the age rule does not allow | See above. |
| Any umpire on a **canceled game** | Canceled games need no umpires. You can still clear the umpires of a game that was canceled later. |
| The **same umpire in two places** | One person cannot hold two places in a game. |
| Anyone who is **not a scheduling administrator** | Umpires and other accounts cannot assign umpires. |

Who made each assignment is recorded.

**Printing and CSV.** The printed schedule has one **Umpires** column with a line for each place: *Plate: Ann Lee*, or *1B:* **OPEN**. A game that needs no umpire shows a dash. The CSV has a column for every place (**Plate umpire**, **Field umpire**, **1B umpire**, **2B umpire**, **3B umpire**) and **Umpires needed**, and an empty cell means nobody is there.

**One umpire's own view.** An umpire sees only their own games on their **My schedule**, with their place (for example *First base*), and an administrator can look at any one umpire's schedule from the Games tab (section 34). Both show the games you assign here.

**Availability** (when an umpire can umpire) is in section 39. (Confirming and declining are in section 37, umpires assigning themselves in section 38, and phone numbers on the printed schedule in section 34.)

**Check script:** `umpire_assignments_check.sql` tests all of the above in the database (section 6).

## 37. Confirming, declining and reminders

**What the statuses mean.** Every assignment is **Assigned** (an administrator made it and the umpire has not answered yet) or **Confirmed**. The games list shows the status after each umpire's name. Assignments that existed before this feature all start as Assigned; an administrator can mark them confirmed, so expect one batch of reminders the first time (see below).

**What an umpire does.** On their **Home** page, **My schedule** says how many games are waiting for their answer. Each such game has two buttons:

- **Confirm:** the game shows Confirmed.
- **Decline:** asks first, with an optional reason (up to 500 characters). Declining removes the umpire from the game, so the place is **open** again, and the administrators are told. An umpire can decline up to the moment the game starts; after that they must contact an administrator. They can decline even after confirming.

An umpire can only answer for themselves, and only through these buttons. A game that has been played, or canceled, shows no buttons.

**What an administrator sees**

- The status beside each umpire on the Games list, and a count in the summary (*4 not confirmed yet*).
- A note on the Games list when someone gave a place up: *Declined: Ann Lee (Plate, Tue, Oct 27)*. It stays while the game is still to come and the umpire is not back on it.
- In the **Umpires** panel for a game, each umpire's status. **Mark as confirmed** records a confirmation that came another way (for example by phone). It is recorded in the history as an administrator's doing.
- If you change other places on a game, an umpire who stays on it **keeps their confirmation**, even if they move to another place. Someone newly added starts as Assigned.

**The warning about unconfirmed assignments**

- A game coming up with umpires who have not confirmed shows *Not confirmed yet: Ann Lee, Bob Ray* (three names, then "and 2 more").
- How many days ahead is a setting for each league, in **League Setup** (edit the league). It starts at **7**. **0 turns the warning off.**
- Opening the **Games** tab also checks once for assignments that have newly come within the warning period, and queues **one message for each administrator** listing them. Each assignment is included only once, so the same warning is never queued twice. A message says so on the Games tab when it queues one.
- The message goes out when an administrator opens the Games tab, because nothing runs on a timer yet. Sending reminders on a schedule comes with real email sending (see the roadmap).

**Messages the system queues** (they wait in the Outbox, section 28; nothing is emailed yet)

| When | To | Kind |
|---|---|---|
| An umpire is assigned to a game | That umpire ("You have been assigned...") | assignment |
| An umpire is taken off a game | That umpire | schedule change |
| An umpire declines | Every super admin, umpire chief and scheduler | schedule change |
| Assignments are still unconfirmed shortly before the game | Every super admin, umpire chief and scheduler | reminder |

An umpire's message goes to the email on their account, or to the email on their umpire record if they have no account. If an umpire has no usable email, nothing is queued and the assignment still works. Only super admins and umpire chiefs see the Outbox screen.

**The history.** Every assignment, confirmation, decline and removal is recorded with who did it and when (and the reason, for a decline). Only scheduling administrators can read it, and nobody can change it by hand. A report from it is planned, and it will support payments later.

**Check script:** `assignment_confirmation_check.sql` tests all of the above in the database (section 6).

## 38. Umpires assigning themselves

**The three switches.** Nothing happens until an administrator turns it on.

| Switch | Where | To begin with |
|---|---|---|
| **Umpires can assign themselves to games in this division** | League Setup, edit the division | **Off** for every division |
| **Allowed to assign themselves to games** | The umpire's record (edit the umpire) | **On** for every umpire. Turn it off for one umpire to stop them |
| **Most upcoming games an umpire can take for themselves** | League Setup, edit the league | **Blank: no limit** |

**What an umpire sees and does.** On their **Home** page, under **My schedule**, a section **Games you can take** lists open places in games they are allowed to take, for the next 30 days (change **From** and **To** to look further). Each game has a button for each open place (*Take Plate*, *Take Field*, ...). Taking one:

- puts the game on their schedule **Confirmed straight away**, marked as taken by themselves;
- can be undone: they can **Decline** it from their schedule like any other game, and the place becomes open again.

If nothing is offered, the section is not shown at all. If a place was taken by someone else a moment earlier, the umpire is told and the list is refreshed.

**The rules.** The database decides what is offered and checks again when an umpire takes a game, so nothing in the app can get around them. An umpire can take a game only when:

- their account is approved and linked to an **active** umpire record, and the switch on their record is on;
- the game's division allows it, and the game has **not started** and is **not canceled**;
- the place is **open** (games are staffed by number, as everywhere else);
- they are **not already on that game**, and **no other game of theirs overlaps it** (a game that starts as another ends is fine);
- they are **under the limit**, if the league has one; and
- the **youth rules** allow it (sections 36 and 40).

**About the limit.** It counts the umpire's own games that are still to come, **whoever assigned them**; games already played and canceled games do **not** count. It applies **only to games an umpire takes for themselves**: an administrator can always assign more. When an umpire is at the limit they are offered nothing, until a game is played or they decline one.

**What an administrator sees.** The Games list shows **Confirmed (self)** after such an umpire's name; the Umpires panel says *they assigned themselves*; and the history records it. Administrators are also told when an umpire takes a game (section 40).

**Check script:** `self_assignment_check.sql` tests all of the above in the database (section 6).

## 39. Availability: when umpires can umpire

**What it is.** Each umpire can tell the league the dates and times they **can** umpire. Schedulers then see, when assigning, who has said they are free.

**How an umpire enters it.** On their **Home** page, under **My schedule**, the section **My availability** has a list of the times they have entered and a form:

- **Date**, then **From** and **To** times, or tick **All day** for the whole day;
- an optional **Note** (for example *after work*), up to 200 characters.

**Add** saves it. Each entry in the list has **Change** and **Remove**. Only entries still to come are shown. An entry is one date; to be free on several days, add several entries. An entry can last at most 90 days (the database refuses anything longer, which usually means a typing slip).

**How it is read.** This is the part to understand:

- An umpire who has entered **some** availability is taken to be **unavailable at every other time**. Two entries that touch or overlap count as one (8 AM to 12 PM and 12 PM to 5 PM together cover a game from 9 AM to 3 PM). A game is covered only if **all** of it falls inside what they entered.
- An umpire who has entered **nothing** (or only times that have passed) is simply **"no availability entered"**. That is not a warning: until people have filled it in, you do not know.

**What administrators see.** It only **warns**; it never blocks.

- In the **Umpires** panel for a game, beside each umpire's name: *not available then*, or *no availability entered* (nothing is added for an umpire who is free). A note under the choices repeats it for the umpires you have selected. You can still save.
- On the **Games** list, a warning *Not available: Ann Lee* on a game still to come whose umpire has entered availability that does not cover it, counted in the summary (*5 with an unavailable umpire*). It also appears under **Only games with warnings**.
- If the availability cannot be read for any reason, **none** of these appear, rather than wrong ones.

**An umpire is still offered games they are not available for.** In **Games you can take** (section 38) availability is not used, as you decided. An umpire who takes a game at a time they did not mark free will show up in the warning above.

**For an administrator.** Open **Administration**, **Umpire Directory**, edit the umpire: below the form is **Availability** for that umpire, where you can add, change or remove entries for them (for example after a phone call).

**Privacy.** An umpire sees only their own entries. Administrators can see everyone's.

**Repeating times** (for example "every weekday after 5 PM"), **dates an umpire can't umpire**, and a **month calendar** are in section 41.

**Check script:** `availability_check.sql` tests the database rules (section 6).

## 40. Further assignment rules: the division they play in, and messages about games umpires take

### A youth umpire cannot umpire the division they play in

**Recording it.** Open **Administration**, **Umpire Directory**, and edit the umpire. **Division they play in (youth umpires)** lists your divisions, with **Not set** first. Choose the division and press **Save Changes**. If a division is later deleted, it is simply cleared from the umpires who had it.

**How the rule works:**

| What is on the umpire's record | Cannot umpire |
|---|---|
| A division is chosen | That division, plus any division whose players start at their Little League age or older (section 36) |
| **Not set** | Any division whose ages **include** theirs (for example, a 12-year-old with nothing recorded cannot umpire Majors if its ages are 11 to 12), plus any whose players start at their age or older |

So recording the division makes the rule **more accurate**: a 13-year-old recorded as playing Majors can umpire Juniors, but a 13-year-old with nothing recorded cannot, because Juniors' ages include 13.

- **It needs no birth date when a division is recorded.** The recorded division is blocked regardless. Without a recorded division, the age rule still needs a birth date and the season's age chart; if either is missing the umpire is not blocked, and the panel shows a note (as in section 36).
- A division with **no age range** cannot be worked out from age, so it is blocked only for an umpire who has it recorded as theirs.
- **Adult umpires are not affected**, even if a division is recorded.
- In the **Umpires** panel for a game, such an umpire is listed but cannot be chosen, and is marked **their own division**; a note says *Not available because it is the division they play in*. The database refuses it as well (for administrators, for direct writes, and for an umpire taking a game for themselves, where it also stops the game being offered).

### Messages to administrators when an umpire takes a game

When an umpire takes a game for themselves (section 38), the administrators (super admins, umpire chiefs and schedulers) are told, through the **Outbox**:

| The game starts | What is queued |
|---|---|
| **Within 48 hours** | A message **straight away**: *Umpire took a game within 48 hours: Ann Lee* |
| **More than 48 hours ahead** | Nothing yet. It goes in **one summary for that day**: *Umpires took 3 games on Monday, October 26*, listing each umpire, place and game |

- **When the daily summary is queued.** Nothing in the system runs on a timer yet, so the summary for each **finished day** (Pacific time) is queued when an administrator **opens the Games tab**. If nobody opens it for a few days, one summary is queued for **each** of those days. Games taken **today** wait until tomorrow. When the summary is queued the Games tab says so. Sending real email on a timer comes with the email work (section 27).
- **Each game is told about once.** A game announced straight away is not repeated in a summary, and a summary is never queued twice.
- **Games taken before this update** are marked as already told about, so the first summary does not repeat old ones.
- Nothing is emailed yet. As with every message, an administrator copies it from the Outbox and sends it, or leaves it (section 27).

**Decided against:** a limit for each umpire (the league's limit applies to everyone).

**Check script:** `further_rules_check.sql` tests all of this in the database (section 6).

## 41. Availability: repeating times, dates you can't umpire, and the calendar

This adds to section 39. The **My availability** screen (and the **Availability** part of an umpire's record, for administrators) now has a choice at the top of the form: **What do you want to add?**

| Choice | What it is |
|---|---|
| **A time I can umpire (one date)** | A single date and times, or **All day**, as before |
| **A repeating time I can umpire** | Days of the week plus times, **ending automatically when its season ends** |
| **A date or time I can't umpire** | A single date and times, or **All day**, that **overrides everything else** |

### Repeating times

1. Choose **A repeating time I can umpire**.
2. Tick the **days of the week** (the **Mon-Fri** and **Sat, Sun** buttons tick several at once; **Clear** unticks them).
3. Choose the **From** and **To** times, or tick **All day**.
4. **Starting** is the first day it applies. Leave it blank for today.
5. Choose the **season**. The page says *It ends automatically on Dec 6, the end of Fall 2026.*
6. **Add.**

It then appears under **Repeating times** in words, for example *Every Mon-Fri, 5:00 PM - 9:00 PM, until Dec 6 (end of Fall 2026)*. **Change** and **Remove** work as for single times.

- **It ends with its season.** Nobody has to remember to remove it. If an administrator changes the season's end date, the repeating time follows. Once the season has ended it disappears from the list.
- **It needs a season with an end date.** Only seasons with an end date that has not passed are offered. If there is none, the page says so: an administrator can set the end date in **League Setup** (edit the season).
- **Times are the league's local clock times**, like everything else. A repeating time is worked out from today to the end of the season (never more than a year ahead).
- A repeating time and single times simply **add together**: the umpire can umpire whenever any of them says so.

### Dates and times you can't umpire

Choose **A date or time I can't umpire**. These **always win**: if an umpire marked a Saturday as one they can't umpire, they are **not available** for any game that overlaps it, even if a repeating time or a single time says they can.

- It works **even if they entered nothing else**: an umpire who only entered "I can't on Nov 7" is shown as unavailable for games that overlap Nov 7, but there is still no warning for other days (they have not said when they *can* umpire).
- A game that only **touches** the unavailable time at its edge (it ends as the unavailable time starts) is not affected.

### How administrators see it

Wherever section 39 said *not available*, an umpire who marked the time as one they can't umpire is shown in the same way, with their own wording:

- In the **Umpires** panel: *marked unavailable* beside the name, and a note *Ann Lee has marked themselves unavailable at this time*. (An umpire whose repeating or single times simply miss the game is *not available then*, as before.) It is still only a warning: you can save.
- On the **Games** list: *Not available: Ann Lee*, counted in the summary.
- **Games you can take** (section 38) still ignore availability.

### The calendar

Under the lists is a **month calendar**, with arrows to move between months. It shows what the umpire has entered, with the *can't* times already taken out:

| What you see | Meaning |
|---|---|
| **Solid green** | Available all day |
| **Light green** | Available for part of the day (hover or tap a day for the hours). A small red dot means part of the day is also marked unavailable |
| **Red with stripes** | Marked unavailable (the stripes are there so it does not depend on color) |
| **White** | Nothing entered |
| **Dashed border** | A day that has already passed |

**Press a day** to put that date into the form below (the **Starting** date for a repeating time, or the **Date** for a single time).

**Check script:** `availability_patterns_check.sql` tests the database rules (section 6).

## 42. Adding a person who is not an umpire (and giving them roles)

**Short answer:** it can be done from the app **except for creating the account itself**, which today needs one step in the Supabase dashboard (no SQL).

**Why.** The **Create account** page only offers *an adult umpire* or *a youth umpire*. There is no choice for a board member, scheduler or other volunteer, and signing them up as an umpire would create an umpire registration that then has to be rejected. The invitation feature (section 26) is for umpire records.

**How to do it today:**

1. Open your Supabase project, **Authentication**, **Users**, then add a user (the button is called **Add user**, then **Create new user**; the labels may differ slightly). Enter their **email** and a **password**, and tick the option to **auto confirm** the user, so no email is needed.
2. In the app, sign in as super admin and open **Administration**, then **Approvals**. The person appears under **Other pending accounts**. Press **Approve**.
3. Open **Roles**, find them, and give them the roles they need (for example **scheduler** or **umpire chief**). Roles can only be given to an approved account, which is why step 2 comes first.
4. Give them the email and password and ask them to sign in. Once email is set up (section 27), they can use **Forgot password** to choose their own.

**What is planned** (see the roadmap): inviting a person with their roles from the app (an administrator enters an email and the roles, and the person is approved with them when they sign up, like umpire invitations), and/or a third sign-up choice for people who are not umpires. Parents and guardians will need a sign-up path too (Phase 9), so this will probably be done together.

## 43. Fields and divisions: league fields, away fields, and the order of divisions

**Divisions are listed youngest first.** Wherever divisions are listed or chosen (League Setup, the teams panel, the Games filter, and an umpire's **Division they play in**), they are in order of the **lowest age in their range**, then the highest, then by name. For example: A (5 to 7), AA (6 to 9), AAA (8 to 11), Majors (9 to 12), Juniors (12 to 14), Seniors (13 to 16). A division with **no age range goes last**. To change where a division appears, change its age range in League Setup.

**League fields and away fields.** Each field in **Administration**, **Locations** is marked:

| Marker | Meaning |
|---|---|
| **League field** | A field this league runs (our home fields) |
| **Away field** | A field our teams travel to (for example, *Away Field - Menlo Park*) |

- When you **add or edit** a field, tick or untick **A field this league runs**. The box starts **ticked** for a new field, because most fields you add by hand are your own.
- A field that appears in a **game import** and did not exist yet is created as an **away field** (it is more likely to be one), so check the marker afterwards.
- When the database change was applied, **every existing field became a league field**. Untick any away fields once.
- The marker will be used by the field board (Phase 10), which will show only the league's own fields.

**Check script:** `league_field_check.sql` (section 6).

## 44. The field board and calendar

The **Field board** tab (for super admins, umpire chiefs and schedulers) shows **one day's games, field by field**, with who is umpiring each. It is for looking at a day and for printing it; to change a game or its umpires, use the **Games** tab. It needs no database change.

### The day

- **Today** is shown when you open the tab. **Previous day**, **Today** and **Next day** move around, the **Go to** box jumps to any date, and **Print this day** makes a day sheet (a table for each field).
- Each field is a card, with its name, whether it is a **League field** or an **Away field**, and its address (press it to open a map). The league's own fields come first, then a heading **Games at other fields** for away games. League fields with no games that day are listed in one line (*No games at: Kennedy.*).
- Each game shows its **time**, **division**, the two teams (an opponent from another league shows as a label, such as *Menlo Park LL*), any note on the game, and **every umpire place**:

| You see | Meaning |
|---|---|
| **Plate  Ann Lee  Confirmed** | The umpire is on the game and has confirmed |
| **Field  Bob Ray  Not confirmed** | An umpire is assigned but has not answered yet |
| **Field  Needs an umpire** | Nobody is assigned to that place yet |
| *(took it themselves)* | The umpire took the game for themselves (section 38) |
| **Canceled**, **Draft**, **Completed** | The game's status. Canceled games are struck through and have no places |

- A game that is **already over** shows *No umpire recorded* instead of *Needs an umpire*, because it is too late to fill it.
- The line under the date adds it up: *4 games, 3 fields, 1 canceled, 3 places need an umpire, 2 not confirmed yet*. Games already over, and canceled games, are not counted in the places.

### The calendar

Beside the board (above it on a phone, where it starts tucked away under **Calendar**) is a **month calendar**. Each day with games shows **how many**; a **red dot** means some places on that day still need an umpire. The day shown is outlined, and today has a ring. **Press a day** to open its board; the arrows move between months without changing the day you are looking at. Canceled games are not counted in the number.

### Good to know

- Each day has its own address (for example `#/board/2026-10-31`), so you can bookmark it, and Back and Forward work.
- The board keeps what it loaded for a minute, so stepping between days is quick. Press **Refresh** to load the latest.
- Only people who can already see the games and their umpires get the board. Umpires do not (they have **Home**); a view for them comes later.
- It is the first part of Phase 10 (game day). **Attendance, checking in, and Call and Text links are in section 46.** Notes on games and substitutions are planned next.

## 45. The league logo

The Redwood City Little League logo appears in two places:

- **In the top bar** on every screen after you sign in, at the left, on a small **white badge** (the logo has dark outlines that would disappear against the black bar). Pressing it takes you home, to your first tab.
- **At the top of the sign-in screens**: signing in or creating an account, forgot password, choosing a new password, and the page that says your account is waiting for approval.

Its description for screen readers is *Redwood City Little League*. If the picture file is ever missing, the app still works and that description is shown instead.

**To change the logo** (for example, to a higher-resolution version):

1. Save the new picture as **`rwcll-logo.png`** (a transparent PNG).
2. Put it in the project's **`public`** folder, replacing the file that is there. The name must stay the same.
3. Run `npm run build`, then push as usual. If you still see the old one in a browser, refresh it with **Ctrl+F5** (or clear the site's cached files on a phone).

**What size?** The header shows it about 34 pixels tall and the sign-in screens up to about 120 pixels tall. A picture around **600 pixels wide** stays sharp on high-resolution phone screens. Keep the same shape (a bit wider than tall) so it fits the badge.

**The app icon is separate.** The icon that shows in the browser tab and when someone adds the app to a phone's home screen is not this file, and is not changed by it.

## 46. Game day: attendance, checking in, and calling umpires

### For an umpire: checking in

On the day of a game, your **Home** page has a **Game day** card at the very top listing today's games. For each one:

| You see | Meaning |
|---|---|
| **I'm here** (a big button) | Check-in is open. Press it when you arrive |
| *Check-in opens at 1:00 PM, an hour before the game* | It is too early. The card updates by itself when it opens |
| **Checked in 8:52 AM** (or *Checked in 9:12 AM, 12 min late*) | Done. You are late if you checked in after the scheduled start |
| *The game is over, and no check-in was recorded* | Too late to check in. Ask an administrator if that is wrong |

- **Check-in opens 1 hour before the game starts and closes when it ends.** It does not use your location.
- If an administrator marked you as **not here** and you are, the card says so and you can still check in.
- A canceled game, or one already marked completed, is not shown.

### For an administrator: the Field board

On the **Field board** (section 44), each umpire's line now says where they stand:

| Tag | Meaning |
|---|---|
| **Arrived 8:52 AM** | They checked in, or you recorded it. If it was after the scheduled start it adds **12 min late** (amber) |
| **Not here yet** | The game has started, they are not recorded as here, and it is not over |
| **No-show** | You recorded that they did not come |

The line under the date counts them: *1 not here yet*, *2 no-shows*. A game that is already over never shows *Not here yet*.

**Recording attendance:** press **Mark** beside an umpire, then **Arrived** (it uses the time in the box, or **now** if the box is blank), **No-show**, or **Clear** (which appears once something is recorded). A time must be on the day of the game and cannot be in the future. You can correct it later, even after the game. Every change is added to the assignment history, with who made it.

### Calling or texting an umpire

Under each umpire is **Call** and **Text** with their number, so if one is late you can reach them from the board. On a phone the buttons start a call or a text; on a computer they may open a calling app or do nothing.

- The numbers are the same ones you can already see on the printed schedule: the account's number, otherwise the one on the umpire's record. A **youth umpire** shows their **own** number and a **parent's** (the emergency contact), each with its own Call and Text.
- *no phone on file* means there is no number to use.
- Only people who can see the Field board (super admins, umpire chiefs and schedulers) see them.

### Good to know

- **Late** is not saved separately: it is simply an arrival after the scheduled start. An umpire who checks in at exactly the start time is on time.
- If you move an umpire to a different place on a game, **their attendance goes with them**. Taking them off the game removes it.
- This update also fixes a small slip: moving a self-assigned umpire to another place could have caused the administrators to be told about the game a second time. It no longer does.
- **Database change:** `20261031100000_add_attendance.sql`; the check script is `attendance_check.sql` (section 6).
- Planned next: a note on each game, and recording a substitution (who actually worked it).
