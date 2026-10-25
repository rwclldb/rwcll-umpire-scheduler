# Email setup guide (sign-up confirmation and password reset)

This switches on the emails that **Supabase** sends: "confirm your email" and "reset your password".
Until it is done, only people on your Supabase team can register on the **live** project.

It does **not** switch on the app's own messages (invitations, assignments). Those wait in the
Outbox until a sender is built (FAQ section 27).

**Do the test project first, then live.** Nothing here changes any data.

## Overview

| Part | What | Who | Time |
|---|---|---|---|
| 1 | Create a sender mailbox in Google Workspace and **test whether Google will give it an app password** | You (Workspace admin) | 15 min |
| 2 | Enter the mailbox details in Supabase (test project) | You | 10 min |
| 3 | Prove it works with an address that is **not** on your Supabase team | You | 10 min |
| 4 | Repeat Part 2 and 3 on the live project | You | 15 min |
| 5 | Fallback if Part 1 fails | You and Claude | later |

## Part 1: The Google side

### 1a. Create a dedicated sender mailbox

Do **not** use your own admin account as the sender. A password for it would unlock your admin email.

1. Open the Google **Admin console** (admin.google.com) and sign in.
2. Go to **Directory**, then **Users**, then **Add new user**.
3. Give it a name such as `RWCLL Umpires` and the address, for example `umpires@rwcll.org`. This address is what people will see as the sender, and people may reply to it, so choose something a person will read. Create it.
4. Note any **license cost**: a mailbox that can sign in needs a license. An alias or a group address **cannot** be used. Check the price on your Workspace plan before you create it.
5. Decide who reads replies. Easiest: sign in to this mailbox yourself now and then, or add forwarding to an admin's address (Gmail settings, Forwarding).

### 1b. Allow and turn on 2-Step Verification for that mailbox

An app password only exists once 2-Step Verification is on for the account.

1. In the Admin console, go to **Security**, then **Authentication**, then **2-step verification**. Make sure users in the organizational unit that holds this mailbox are **allowed to turn on** 2-Step Verification. (Google moves menus around: if you do not see these exact words, search the Admin console for "2-step verification".)
2. Open a **private/incognito browser window** and sign in as `umpires@rwcll.org`, not as yourself.
3. Go to myaccount.google.com, then **Security**, then **2-Step Verification**, and turn it on. It will ask for a phone number or an authenticator app. Use an administrator's phone, not a personal phone that may change.

### 1c. THE GO/NO-GO TEST: create an app password

Still signed in as the sender mailbox:

1. Go directly to **myaccount.google.com/apppasswords**.
2. Name it `Supabase RWCLL` and press **Create**.
3. Google shows a 16-character code. Copy it somewhere safe for the next 10 minutes (a password manager is best). Google will not show it again.

**If the App passwords page is not available, STOP and go to Part 5.** Sources disagree about whether Google
currently allows app passwords on Workspace accounts, so this test is the real answer for your account. If
you see the page and get a code, carry on.

Two things that will undo this later, so remember them:

- **Changing that mailbox's Google password revokes its app passwords.** If password reset emails suddenly stop, create a new app password and update Supabase.
- The app password is a key to that mailbox. It lives **only** in Supabase. Never paste it into chat, a file in the project, or an email.

## Part 2: The Supabase side (test project first)

1. Open the **test** project in the Supabase dashboard. Check the name at the top left.
2. Go to **Authentication**, then **Emails**, then **SMTP Settings**. Turn on **Enable custom SMTP**.
3. Fill in:

| Field | Value |
|---|---|
| Sender email address | `umpires@rwcll.org` (the mailbox from Part 1) |
| Sender name | `RWCLL Umpires` |
| Host | `smtp.gmail.com` |
| Port number | `587` (if it will not connect, try `465`) |
| Username | the **full** address, `umpires@rwcll.org` |
| Password | the 16-character app password (spaces do not matter) |
| Minimum interval per user | leave the default (60 seconds) |

4. Save. Supabase then allows **30 emails per hour** by default. Go to **Authentication**, then **Rate Limits**, and raise **emails sent** (for example to 100) so a busy sign-up day is not blocked. Google's own limit on this route is 2,000 messages per day.
5. On the **test** project, go to **Authentication**, then **Sign In / Providers**, then **Email**, and switch **Confirm email back ON**. It was off only because email did not work yet.

## Part 3: Prove it works

Use an address that is **not** on your Supabase team (a personal Gmail, for example). That is the whole point.

1. Run the app in test mode (`npm run dev -- --mode test`) and sign out.
2. Choose **Create account**, register with that personal address, and choose adult umpire.
3. Within about a minute you should get a confirmation email from `RWCLL Umpires`. Check spam too. Click the link. You should land back in the app.
4. Sign in, sign out, then use **Forgot your password?** and check that the reset email arrives and works.
5. Open the email's **Show original** (Gmail menu) and check the lines `SPF`, `DKIM` and `DMARC` all say `PASS`. If DKIM does not, see the table below.

If step 3 fails, check **Authentication**, then **Logs** in Supabase for the error text and use the table.

| What you see | Likely cause | Fix |
|---|---|---|
| "Email address ... not authorized" | Custom SMTP is not enabled or not saved | Re-check Part 2 step 2 and save again |
| "Error sending confirmation email", or authentication failed (535) | Wrong username or password, or the app password was revoked | Username must be the full address. Create a new app password and re-enter it |
| Cannot connect | Port | Try the other port (465 instead of 587) |
| Arrives in spam, or DKIM is not PASS | Google is not yet signing your domain's mail | Admin console: **Apps**, **Google Workspace**, **Gmail**, **Authenticate email**: generate and start DKIM, then add the DNS record Google shows. Ask Claude if unsure |
| Works, then stops later | The mailbox password changed (revokes app passwords) | New app password, update Supabase |

## Part 4: Live

When the test project works, repeat Part 2 on the **live** project. **Keep "Confirm email" ON for live.** Then
repeat Part 3 against live: register from a personal address, confirm, and reset a password.

Also add your website address (once it exists) to **Authentication**, **URL Configuration**, so email links come back
to the right place. Until the site is deployed, only `http://localhost:5173/**` works for testing.

## Part 5: If Google will not give an app password

Do not spend time fighting it. Use a mail service instead:

- **Brevo**: free plan of 300 emails a day. Needs an account, approval, and a few DNS records on a subdomain such as `mail.rwcll.org` (so your admin mailboxes are untouched). Free-plan emails carry a small Brevo footer.
- **Resend**: free plan of 3,000 a month with a limit of 100 a day.

Tell Claude which one, and Claude will give you the exact steps and the DNS records to add, one at a time.

## Later: the app's own messages

Invitations and (later) assignment messages are queued in the **Outbox**. They are not Supabase emails and need
their own sender. The same mailbox can be used for it, and the same decision (Google or a mail service) applies.
See FAQ section 27.
