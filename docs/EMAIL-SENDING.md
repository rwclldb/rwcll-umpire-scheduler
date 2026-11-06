# Sending messages for real (Phase 7): setup guide

This switches on the app's own messages: invitations, game assignments, schedule changes, reminders,
report notices. (Sign-in emails such as "reset your password" are separate and already work: see
`EMAIL-SETUP.md`.)

**It is built to be safe.** Nothing is sent until you switch it on, you can start with a **safe mode**
that only emails addresses you list, and old waiting messages are never sent (so switching on cannot
release a backlog). **Do the test project first, then live.**

## How it works

```
  the app and the database  ->  the Outbox (a waiting list)  ->  the sender  ->  Google  ->  the person
  (assignments, reminders...)   (Administration > Outbox)        (runs every     (your
                                                                  5 minutes)     mailbox)
```

The **sender** is a small function that lives in Supabase (`send-outbox`). Every 5 minutes it takes waiting
messages, decides whether each may be sent (this is where safe mode and the age limit apply), sends it
through your Google mailbox, and records the result. A message that cannot be sent shows why in the Outbox,
with a **Try again** button.

| Part | What | Time |
|---|---|---|
| 1 | Apply the database change | 5 min |
| 2 | Deploy the sender and give it its secrets | 20 min |
| 3 | Switch on **safe mode** and send yourself a test | 15 min |
| 4 | Schedule it so it runs by itself | 10 min |
| 5 | Going live (when you are ready) | 20 min |
| 6 | Text messages (optional, later) | separate |

## Part 1: The database change

Apply `20261106100000_add_email_sending.sql` to the **test** project, as you apply every migration, then
run `run-all-checks.ps1`: `email_sending_check.sql` should show `Failures: 0`.

Nothing changes yet. Sending is **off** until Part 3.

## Part 2: Deploy the sender

You need the Supabase command-line tool (you already use it for migrations).

1. Put the sender's two files in your project, exactly here:
   - `supabase\functions\send-outbox\index.ts`
   - `supabase\functions\send-outbox\logic.ts`
2. In PowerShell, in the project folder:
   ```
   supabase login
   supabase link --project-ref <YOUR-TEST-PROJECT-REF>
   supabase functions deploy send-outbox --no-verify-jwt
   ```
   (`--no-verify-jwt` is correct: the sender is protected by its own secret instead, because the schedule
   calls it with no signed-in user.)
3. Give it its secrets. **Never paste these into chat, a file in the project, or an email.**
   ```
   supabase secrets set SMTP_USER=umpiresched@rwcll.org
   supabase secrets set SMTP_PASS=<the 16-character Google app password>
   supabase secrets set SENDER_SECRET=<a long random value you make up: 40 or more letters and numbers>
   ```
   - `SMTP_PASS` is the Google **app password** for the sender mailbox. It is best to create a **second** app
     password named `RWCLL sender` (Google: myaccount.google.com/apppasswords, signed in as that mailbox),
     rather than reusing the one in Supabase Auth, so that you can cancel one without breaking the other.
   - `SENDER_SECRET` is a password only the schedule and you know. Keep a copy: you need it again in Part 4.
     It is **not** the Google app password (that one is `SMTP_PASS`): you make `SENDER_SECRET` up yourself.
   - **If you lose it:** Supabase never shows a secret again, **but** once Part 4 is done the same value is also kept in the project's Vault.
     Run this in the SQL Editor of that project to read it (treat the result like a password):
     ```sql
     select decrypted_secret from vault.decrypted_secrets where name = 'sender_secret';
     ```
     If Part 4 has not been done, just make a new one and set it again with `supabase secrets set SENDER_SECRET=...`.
     If you ever change it after Part 4, change **both** places, or the sender answers "Forbidden":
     ```sql
     select vault.update_secret((select id from vault.secrets where name = 'sender_secret'), 'THE-NEW-VALUE');
     ```
   - Optional: `SMTP_HOST` (default `smtp.gmail.com`) and `SMTP_PORT` (default `465`).

## Part 3: Safe mode, and a test

In the Supabase **SQL Editor** of the test project:

```sql
update public.sending_settings set value = 'safe' where key = 'email_mode';
update public.sending_settings set value = 'you@rwcll.org' where key = 'email_safe_allowlist';
update public.sending_settings set value = 'https://rwclldb.github.io/rwcll-umpire-scheduler/' where key = 'app_url';
```

Put **your own** address(es) in the safe list (several may be separated by commas). In safe mode the
sender emails **only** those addresses, with **[TEST]** at the start of the subject. Every other message is
set aside (it shows as *Skipped*, with the reason), so nobody else can receive anything.

Optional: `update public.sending_settings set value = 'you@rwcll.org' where key = 'email_safe_redirect';`
sends everyone else's messages **to you** instead (with "[TEST for their-address]" in the subject), so you
can see exactly what each person would have received.

**Test it:**

1. In the app: **Administration > Outbox > Send me a test message**. The banner should say **SAFE MODE**.
2. Run the sender once by hand (PowerShell; use your project reference and your `SENDER_SECRET`):
   ```
   Invoke-RestMethod -Method Post -Uri "https://<YOUR-TEST-PROJECT-REF>.supabase.co/functions/v1/send-outbox" -Headers @{"x-sender-secret"="<YOUR SENDER_SECRET>"}
   ```
   It answers with what it did, for example `email: { mode: safe, sent: 1, skipped: 0 ... }`.
3. Check your inbox: the message from **RWCLL Umpires**, subject starting **[TEST]**. Refresh the Outbox:
   it should say **Sent**.

If it does not work, see **If something goes wrong** below.

## Part 4: Schedule it

Open `schedule_email_jobs.sql` (it is in `supabase\jobs`), follow the instructions at the top (switch on the
`pg_cron` and `pg_net` extensions, put your project reference and `SENDER_SECRET` in), and run it once in the
SQL Editor. It schedules:

| Job | When | What it does |
|---|---|---|
| `send-outbox` | every 5 minutes | sends waiting messages |
| `queue-unconfirmed-warnings` | daily, 8 AM Pacific | tells administrators about unconfirmed assignments |
| `queue-self-assign-digest` | daily | the summary of games umpires took themselves |
| `queue-game-reminders` | hourly | reminds each umpire the day before their game (once each) |
| `purge-expired-reports` | nightly | deletes reports a year after their season ends |

## Part 5: Going live

Do this on the **live** project only when the test project has behaved for a while.

1. Repeat Parts 1 and 2 on the live project (its own migration, function and secrets).
2. Check the Google side: in the Google Admin console, **Apps > Google Workspace > Gmail > Authenticate email**
   should show **SPF and DKIM** working for `rwcll.org`, and add a **DMARC** record at your domain registrar.
   Without these, messages may land in spam. Google's own guidance explains each step.
3. Decide the settings (SQL Editor):
   ```sql
   update public.sending_settings set value = 'umpiresched@rwcll.org' where key = 'email_reply_to';  -- who replies go to
   update public.sending_settings set value = '400' where key = 'email_daily_limit';                  -- the most per 24 hours
   ```
   Google limits how many a mailbox may send each day (the limit depends on your Workspace plan; check
   it). 400 is a cautious start.
4. **First a small go-live:** keep `safe` mode, but put a few trusted umpires' addresses on the safe list.
5. When you are happy: `update public.sending_settings set value = 'live' where key = 'email_mode';`
6. **To stop everything instantly:** `update public.sending_settings set value = 'off' where key in ('email_mode', 'sms_mode');`

## Part 6: Text messages (optional, later)

Text reminders are built but **off**, and they only go to umpires whose own account agreed to text messages
(the account setting) and has a phone number. They need a texting service. The sender is written for
**Twilio**, but you can choose another later.

Before you start, know that in the US, texting for an organization generally needs a **registration** with the
carriers (called 10DLC for a normal number, or a toll-free verification). It takes days and has fees, and
carriers can refuse. Check Twilio's current requirements and prices first. The sender adds "Reply STOP to opt out" to every text.

When you are ready:

1. Create a Twilio account, get a number (or a messaging service), and complete the registration.
2. Give the sender the keys:
   ```
   supabase secrets set TWILIO_ACCOUNT_SID=<...>
   supabase secrets set TWILIO_AUTH_TOKEN=<...>
   supabase secrets set TWILIO_FROM=<your number, like +16505550100>
   ```
   (or `TWILIO_MESSAGING_SERVICE_SID` instead of `TWILIO_FROM`)
3. Start in safe mode: `update public.sending_settings set value = 'safe' where key = 'sms_mode';` and put your own
   number in `sms_safe_allowlist` (several separated by commas). Then `live` when happy.

## If something goes wrong

| What you see | What it means | What to do |
|---|---|---|
| Messages stay **Waiting** | The mode is `off`, or the schedule is not running | Check `email_mode`; run the sender by hand (Part 3 step 2) and read its answer; check `cron.job_run_details` |
| Messages become **Skipped**: "not on the safe list" | Safe mode is doing its job | Add the address to the safe list, or switch to `live`, then press **Try again** |
| Skipped: "Too old to send" | The message waited longer than `email_max_age_hours` (72) | This is deliberate. Send a fresh one |
| The sender answers "The mailbox could not be reached" | Wrong or revoked app password | Create a new app password and run `supabase secrets set SMTP_PASS=...`. **Changing the mailbox's own Google password revokes its app passwords** |
| Failed: "550 ... does not exist" | That address does not exist | Correct the person's email address, then **Try again** |
| The sender answers "The daily limit has been reached" | `email_daily_limit` messages were sent in the last 24 hours | Wait, or raise the limit (but stay under Google's own) |
| Failed after 5 tries | A lasting problem; the reason is shown | Fix the cause, then **Try again** |
| "Forbidden" | The `x-sender-secret` does not match `SENDER_SECRET` | Check both |

## What the sender will and will not do

- It sends **plain text** emails, from `umpiresched@rwcll.org`, named *RWCLL Umpires*.
- It never sends while the mode is `off`, a typo in the mode counts as `off`, and in `safe` mode it can only
  reach the safe list.
- It never sends a message older than the age limit, and never more than the daily limit.
- Access details (gate codes) and report contents are **never** put in a message: that was decided earlier, and the
  messages are built without them.
- Where a message goes for a youth umpire follows the address on their record, as it did before.
