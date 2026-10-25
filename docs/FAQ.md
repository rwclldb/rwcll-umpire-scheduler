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
  src\                     the app (main.ts, roles.ts, umpires.ts, my-details.ts, registrations.ts, league_setup.ts, style.css, ...)
  src\setup\               the League Setup pieces (leagues, seasons, divisions, teams, locations, ...)
  supabase\migrations\     database changes, in order
  supabase\tests\          check scripts and the schema fingerprint
  scripts\                 backup and restore scripts
  docs\                    this FAQ and RECOVERY.md
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
| `rls_check_...sql`, `role_rules_check.sql`, `account_details_check.sql`, `registration_check.sql`, `schema_fingerprint.sql` | `supabase\tests` |
| `backup-live.ps1`, `restore-to-test.ps1` | `scripts` |
| App files such as `main.ts`, `roles.ts`, `umpires.ts`, `my-details.ts`, `registrations.ts`, `league_setup.ts`, `ui.ts` | `src` |
| The League Setup pieces (`leagues.ts`, `seasons.ts`, `divisions.ts`, `teams.ts`, ...) | `src\setup` |
| `style.css` | `src` (it replaces `src\style.css`) |
| `FAQ.md`, `RECOVERY.md` | `docs` |
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
