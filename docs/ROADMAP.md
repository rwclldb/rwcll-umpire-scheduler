# RWCLL Umpire Management System: Roadmap

*Last updated: 26 October 2026*

This document shows **every phase of the project**, what is finished, what is
being built now, and what is still to come. It is updated at the end of each
stage of work. For what the software does *today*, see `FEATURES.md`.

| Mark | Meaning |
|---|---|
| ✅ | Done: built, tested, and in use |
| 🔧 | In progress |
| ⏳ | Next up |
| ⬜ | Not started |

The order of the phases from 6 onward is a plan, not a promise. It can change
whenever the league's needs change.

---

## Where we are

**Phases 0 to 6 are built. Phase 10 (game day) has begun.**

- Phases 0 to 4 are finished: the foundations, accounts and security, league
  setup, umpire registration, and games and schedules.
- Phase 5 is most of the way done. Stage **5a** (how many umpires a game needs,
  the places they work, the assignment screen, and the youth age rule) is built,
  tested, and in use.
- Stage **5b-1** (assignments being Assigned or Confirmed, umpires confirming or
  declining, queued messages, and the warning for assignments still unconfirmed)
  is built and tested here. Its database change is waiting for its first run on
  your own test database.
- Stage **5b-2a** (phone numbers on the printed schedule, with a youth umpire's own
  and parent's numbers) is built, tested, and in use.
- Stage **5b-2b** (umpires assigning themselves) is built and tested here. Its
  database change is waiting for its first run on your own test database.
- Phase 6 (umpires entering their availability) is built and tested here. Its
  database change is waiting for its first run on your own test database.
- Stage **5c** (a youth umpire cannot umpire the division they play in, and messages to
  administrators when an umpire takes a game) is built and tested here. Its database
  change is waiting for its first run on your own test database. That completes Phase 5.
- Availability now also has repeating times (ending with their season), dates an umpire
  can't umpire, and a month calendar. It is built and tested here; its database change is
  waiting for its first run on your own test database.
- Stage **10d** (rainouts, running late, call-around list, field notes, the umpire's day, and administrators-only notes) is built and tested here; its database change is waiting for a first run. **Stage 10c (reports) is built and tested here too, which completes Phase 10**; its database change is waiting for a first run.
- **Phase 9 (families):** parents sign up, are linked to their children by an administrator, see their children read-only, and give consent where the league requires it. Built and tested here; its database change is waiting for a first run.
- **Phase 12 (payments):** pay rates, payees, earnings and a monthly payroll are built and tested here (their database changes are waiting for a first run). You record payments by hand for now. Next is paying through Stripe (see `STRIPE-SETUP.md`).
- Phase 7 (sending messages): a first cut is built and tested here, with its database change waiting for a first run; deploying and switching it on is the next step (see `EMAIL-SENDING.md`).
- A **demo clock** (a pretend date and time, for testing and demonstrations) is built and tested
  here; its database change is waiting for its first run on your own test database.
- Phase 10 (game day) has begun. Stage **10a** (the field board and calendar) is built and in
  use. Stage **10b-1** (attendance and check-in, and Call and Text links) is built and tested
  here; its database change is waiting for its first run on your own test database. Stage **10b-2** (notes on a
  game) is built and tested here, with its own database change waiting for a first run. Next are
  10c (reports) and 10d (day-of extras).
- Sending real email (Phase 7) is postponed until you are ready, and Phase 9 (families and
  youth safeguards) waits for the board's answers.

---

- **Suggest umpires** (the first part of Phase 13) and **Download everything** (Backup and export, in Administration) are built and tested here; their database changes (`20261111100000` and `20261111110000`) are waiting for a first run on your test database. See FAQ sections 58 and 59.
- **Testing with real people:** a live **test day** for 5 to 7 board members on a video call is written (a master script and a sheet for each of seven roles, with database checks and a cleanup script). It is in `docs\testday`. The next step is a solo rehearsal, then Session 1 and Session 2 (see "Testing with real people" below and FAQ section 57).

## The phases

### Phase 0: Foundations ✅

- Two separate databases: **live** and **test**, so changes are tried safely first
- The app, with a test mode that runs against the test database
- A GitHub repository for the code
- Backing up the live data, and restoring a backup into the test database
- A keep-alive job so the free database plan does not pause
- A recovery guide, a FAQ of how to do every routine task, and an email setup guide
- Automatic safety checks for the database, and one command that runs them all

### Phase 1: Accounts, roles and security ✅

- Sign-in, sign-out, email confirmation and password reset
- Nine roles (super admin, umpire chief, scheduler, treasurer, feedback
  reviewer, read-only admin, adult umpire, youth umpire, parent or guardian)
- Security rules in the database, so people see and change only what their roles allow
- Protection for personal data (phone numbers, birth dates, outside IDs, emergency contacts)
- Account details that people manage themselves
- A menu that shows each person only their own pages, a top bar with their name and roles
- An Administration area for super admins, split into parts (approvals, roles, league setup, locations, umpire directory, outbox, my details), each with its own page

### Phase 2: League structure ✅

- Leagues, seasons, divisions, teams and fields
- Age ranges for divisions, and Little League age charts attached to seasons
- Creating a whole season (divisions and teams) from the registration system's files

### Phase 3: Umpire registration and invitations ✅

- Umpires register themselves as adult or youth; an administrator approves them
- Age rules for approval, enforced by the database
- Administrators invite umpires by email; the account is linked automatically when they confirm
- An Outbox that holds the messages the system would send

### Phase 4: Games and schedules ✅

- Creating and editing games, including tournament games with undecided bracket slots
- Importing the master calendar spreadsheet, and keeping the copy up to date
- Warnings about field and team conflicts
- Printing and downloading schedules, for administrators and for each umpire

### Phase 5: Assigning umpires ✅

**5a. The assignment screen** ✅ *(built and tested; the newest database changes have not yet had their first run on your database)*

- How many umpires a game needs: a default for each division (including none),
  an optional default for tournament games, and a setting for a single game
- The places umpires work: plate, field, first base, second base, third base
- An assignment screen that shows who is free, how busy they are, and clashes
- The first youth umpire rule: no umpiring a division at or above their own age
- Warnings for games with no umpire or too few, and OPEN places on printouts

**5b-1. Confirming and declining** ✅ *(built and tested; the database change has not yet had its first run on your database)*

- Each assignment is **Assigned** (an administrator made it, the umpire has not
  answered) or **Confirmed**; the games list shows which
- Umpires confirm or decline from their own schedule; declining takes an optional
  reason, frees the place, and tells the administrators
- An administrator can record a confirmation that came another way (such as a phone call)
- Messages are queued in the Outbox when an umpire is assigned or taken off a game,
  when an umpire declines, and when assignments are still unconfirmed
- A warning for games coming up with unconfirmed umpires, with the number of days
  set for each league (7 to begin with, 0 turns it off)
- A history of who was assigned, confirmed, declined or removed

**5b-2a. Phone numbers on printouts** ✅ *(built and tested; no database change)*

- A "print with phone numbers" option on the printed schedule (off each time you open
  the Games tab): each umpire's number, and for a youth umpire both their own and a
  parent's, taken from the emergency contact on their record
- Nothing is printed if the numbers cannot be looked up

**5b-2b. Self-assigning** ✅ *(built and tested; the database change has not yet had its first run on your database)*

- An administrator turns self-assigning on for a division (off to begin with), and can
  turn it off for any one umpire (on to begin with)
- Umpires see the open places they may take on their Home page and take one with a
  button; it is Confirmed straight away and marked as self-assigned, and they can decline
  it later
- Refused when the game overlaps one of the umpire's own, when the place is no longer
  open, when the youth age rule forbids it, or when the umpire already has as many
  upcoming games as the league's limit allows (blank for no limit; played and canceled
  games do not count; it limits only games umpires take for themselves)

**5c. Further assignment rules** ✅ *(built and tested; the database change has not yet had its first run on your database)*

- A youth umpire cannot umpire the division they play in: an administrator can record it
  on the umpire; if it is blank, any division whose ages include theirs counts
- Administrators are told when an umpire takes a game: straight away if it starts within
  48 hours, otherwise in one summary message for each day (queued when an administrator
  opens the Games tab until there is a timer)
- Decided against: a limit for each umpire (the league's limit is enough)
- More rules for self-assigning
- Warnings for assignments that are still unconfirmed close to game time

### Phase 6: Availability ✅ *(built and tested; the database change has not yet had its first run on your database)*

- Umpires enter the dates and times they CAN umpire (one date at a time, or all day);
  administrators can enter them for any umpire
- Someone who has entered some availability counts as unavailable at other times;
  someone who has entered none is shown as "no availability entered"
- The assignment screen and the Games list warn when an umpire is not available (a warning
  only, never a block); umpires are still offered games to take whatever their availability
- Repeating times (days of the week plus times) that end automatically when their season does,
  and dates an umpire can't umpire, which override everything else; a month calendar shows it all

### Phase 7: Notifications and sending email 🟡 *(first cut built and tested here; you still deploy and test it)*

- ✅ Email for **Supabase's own emails** (sign-up confirmation, password reset, invitations) is set up, from umpiresched@rwcll.org
- ✅ A **sender** for the messages the app queues in the Outbox (assignments, rainouts, running late, report notices, reminders),
  through the same Google mailbox: built (a Supabase Edge Function), with retries, a daily limit, an age limit, and **off by default**
- ✅ A **safe mode** for the test database (only approved addresses, or redirect everything to one address)
- ✅ The Outbox shows the mode and why a message failed or was set aside, with **Try again** and a test message
- ✅ **Invitations, assignments and reminders** are sent by the sender instead of only queued, once it is switched on
- ✅ **Scheduled jobs**: the unconfirmed-assignment warning and the self-assigned summary now run daily by themselves, a new
  **day-before reminder** for each umpire runs hourly, and the report deletion runs nightly
- ✅ **Text-message reminders** for people who agreed to texts: built, off, written for Twilio
- ⬜ **Left for you** (see `EMAIL-SENDING.md`): deploy the sender and set its secrets, try safe mode on the test project, schedule the jobs,
  then go live. For texts: choose a service and complete its carrier registration
- ⬜ Later ideas: an administrator **announcement** to all umpires, a daily digest instead of many emails, quiet hours, a reply-handling address

### Phase 8: Hosting and mobile ⬜

- Put the app on the web so everyone can reach it
- Make it install on a phone like an app

### Phase 9: Families and youth safeguards ✅ *(first cut built; waiting on the board's answers below)*

- ✅ **Parents sign up** as parents or guardians (with a note saying whose parent they are) and are **approved** by an umpire chief or super admin
- ✅ **Linking a parent to a youth umpire**: done only by an umpire chief or super admin (nobody links themselves), up to 4 per umpire, logged
- ✅ **Parent consent** for younger umpires, as a **rule you set** (a minimum age, and an age below which a linked parent must consent); it blocks assigning and self-assigning; unlinking withdraws it
- ✅ **Read-only access for parents**: their own children's games, earnings and the payments to them
- ✅ **Turning 18**: flagged, and one step changes them to an adult (roles, rates, pay, links)
- ✅ **Younger umpires with consent** (minimum age 10, consent below 13; both are settings), with an unknown birth date counting as needing consent
- ✅ **Editable consent wording** (a super admin edits it; it starts as a sample that cannot be consented to; each consent records the version)
- ✅ **Parents copied on every notice** to their child; **turning 18 happens by itself** with notices to the parents, the new adult (set up your own payment account) and the administrators; the administrators are told when consent is withdrawn
- ⬜ For the board: the real consent wording (the sample has [[placeholders]] for the league's legal name, supervision, insurance and safety-officer details), and the minimum age (10 is a starting point)
- ⬜ Later: a parent "set up payments" button and the new adult's "set up payments" button (with Stripe); a heads-up notice a month before someone turns 18; parents choosing which notices they get

### Phase 10: Game day 🔧 ← we are here

**10a. Field board and calendar** ✅ *(built and tested; no database change)*

- One day's games by field and time, with the umpires and which places are open or not yet
  confirmed; league fields first, then away games
- A month calendar showing how many games there are each day, and a marker for days with open places
- Print a day; bookmarkable day addresses

**10b-1. Attendance and calling umpires** ✅ *(built and tested; the database change has not yet had its first run on your database)*

- An umpire checks in from a **Game day** card on their Home page, from 1 hour before the
  game until it ends; administrators can also record, correct or clear it on the field board
- Arrived (with the time; late means after the scheduled start), **Not here yet**, and
  **No-show** shown on the board and counted in its summary; changes kept in the history
- **Call** and **Text** links with each umpire's number (and a parent's for a youth umpire)

**10b-2. Game notes** ✅ *(built and tested; the database change has not yet had its first run on your database)*

- A **note on each game** for day-of things the schedule does not say. **Admins and umpires can
  both write notes** (an umpire on that game); only administrators can remove them
- Shown on the field board, the printed day sheet and the umpire's Game day card
- Substitutions need no separate feature: a substitute known **before the printout** is handled
  by changing the assignment; after the printout, an administrator updates the system later from
  the game note. (A "who actually worked" field can be added later if it is wanted.)

**10c. Reports** ✅ *(built and tested; the database change has not yet had its first run on your database)*

- **Post-game reports** from umpires (readable by the umpire chief and super admins; the author reads their own and adds follow-ups, but cannot edit)
- **Reports from outside** (coaches, parents, the board), entered only by the umpire chief and super admins; **the umpire it is about cannot see it**
- A change log, super-admin-only deletion, and **automatic deletion a year after the season ends**

**10d. Day-of extras** ✅ *(built and tested; the database change has not yet had its first run on your database)*

- **Rainouts and field closures:** cancel or move all the games on a field and day with one action, with a
  reason, and tell the umpires
- **Running late:** a button for an umpire to tell the administrators they are running late (and by how much)
- **Call-around list:** for a game with an open place, the umpires who could cover it (allowed by the
  rules, and with availability if entered), with Call and Text, so an administrator can phone around
- **Field notes:** parking and directions, and access details such as a gate code, kept with each field
- **Umpire day view:** an umpire's own view of their day: where to go, how to get in, who else is on
  the game, and the notes
- Not needed: **injury and incident** reports (these go in the game notes) and **scores** (this app
  does not record them)

### Phase 11: Certifications and training ⬜

- Track umpire certifications and training

### Phase 12: Payments 🟡 *(rates, earnings and payroll built; paying through Stripe comes next)*

The league pays its **youth umpires** (about **monthly**); adult umpires are not paid today, but the system has the slots.
**Chosen:** **Stripe Connect** (Express accounts), paying a **parent or guardian** for each youth umpire (see below).
**Out of scope for now:** W-9s, tax forms and work-permit rules (league management handles them; added later if needed).

**What I verified about Stripe** *(please recheck prices at stripe.com/connect/pricing)*
- **Express and Custom Connect accounts need an account holder aged 18 or older.** Standard accounts allow 13+, but a parent or
  guardian must own the account for anyone under 18. So a youth umpire is paid **through a parent or guardian**.
- The league pays Stripe about **$2 per paid account per month, plus 0.25% + $0.25 per payout** (about $2.63 for a $150 payout).
- Stripe pays out only money already in the **platform balance**, added by **top-up** from the league's bank: **ACH debit takes about
  5 to 6 business days**, wire or ACH credit about 1 to 3. A failed transfer is not retried, so the system must check the balance first.

**12-0. How it is done today** ✅ *(mostly answered)*
- Paid monthly or so; a home plate **youth** umpire **$50**, a **youth field** umpire **$25**; rates **by division**; **adults not paid** (slots kept);
  **admins set the rates**

**12a. Rates and an earnings ledger**
- ✅ **Pay rates**: by division, place and youth/adult; dated; logged; set by the **treasurer and super admins** (the Payments tab)
- ✅ **The earnings ledger**: what each umpire is owed for each game worked, with adjustments (a substitute, a bonus, a correction), voids, and a log of every step
- ✅ **Payees**: a youth umpire is paid through a parent or guardian's account (siblings share one); adults are paid to themselves
- ✅ **Monthly payroll**: a draft for the period, approved by the treasurer or any super admin, then each payment recorded (check, bank transfer, cash); a spreadsheet download
- ⬜ Reports per umpire, game and season; umpires seeing their own earnings

**12b. What makes a game payable** ✅ A **recorded arrival** (the umpire's check-in, or an administrator marking it) on a game that was played and not canceled

**12c. Paying through Stripe** ⬜
- **Decided:** a **parent or guardian's** Stripe account for each family (siblings share one); **any super admin or the treasurer** approves a batch
- A parent presses **Set up payments**, which opens Stripe's own page; the payee already chosen in the app is the account that gets set up
- Test mode first, with pretend money; then, after approval, the money is sent (the app checks the Stripe balance first), and each payment is marked paid by Stripe
- Needs your Stripe account with Connect switched on (see `STRIPE-SETUP.md`); parents need a sign-in to the app. Phase 9 (linking parents to their children, and parent access) will build on the payee link

### Phase 13: Scheduling help 🟡 *(suggestions built; the rest is next)*

- ✅ **Suggest umpires** for an open place: ranked, with the reasons, leaving out anyone busy, unavailable, blocked by the age rules or needing consent (FAQ section 58)
- ⬜ Suggest for **every open game of a day** at once, with a preview you accept
- ⬜ A **workload view**: games per umpire this season, so unfairness is visible
- ⬜ Let the board **tune the scoring** (for example how much a fair share of games counts) without a code change

### Phase 14: Season management ⬜

- Start a new season from the last one
- Reports and statistics across seasons

---

## Testing with real people 🟡 *(written; not yet run)*

A **minimum-capabilities test**: board members play seven roles on a video call, on the TEST database, following one simulated game day. **91 steps in two sessions** (about 70 minutes, then about 2 hours; they can run back to back). Email is in safe mode, so every message goes to the facilitator.

- ✅ The **master script**, a **sheet for each role**, a **database check file** and a **cleanup script** (`docs\testday`, `supabase\testday`), and a seed extended with parent logins, a younger umpire, more parents and a turning-18 stand-in
- ⬜ A **solo rehearsal** by one person, fixing the wording in the Word files
- ⬜ **Session 1**, then **Session 2**, with the board members
- ⬜ Collect the notes pages and list the problems by how many people hit them; fix the **must-pass** failures first
- ⬜ Add each new phase to the test (for example **Stripe**: step 7.11 is a placeholder) and run it again before going live

**Already noticed:** after only one family is paid, that family's individual earning lines still say "Approved: payment coming" until every family is paid (the page shows the payment itself as paid). The test asks people whether that confuses them.

---

## Keeping the data safe 🟡 *(built; waiting for a first run)*

- ✅ **Download everything** (Administration > Backup and export): a super admin's zip of spreadsheets and JSON files, a log of each download, and a warning after 30 days (FAQ section 59)
- ✅ The full backup script now checks **every table** against the schema, and `RECOVERY.md` covers the email sender, its secrets and the scheduled jobs
- ⬜ Decide whether the live project should move to **Supabase Pro** (daily backups kept for 7 days; the free plan has no automatic backups)
- ⬜ A **practice restore** of a recent backup into a temporary project, to prove the recovery guide still works. **Needed:** the restore script was fixed in November 2026 (it now clears every table the migrations pre-fill), and that fix has not been practiced (`RECOVERY.md`, "Practicing a restore")

## Smaller things on the list

- Change the automatic sign-out from 30 minutes (for demonstrations) to about **10 minutes for administrators**, and something much longer (or off) for umpires (a setting; see FAQ section 49)
- **Add a person who is not an umpire** from the app: invite them with their roles, and/or a sign-up choice for them (today it takes one step in the Supabase dashboard; see FAQ section 42)
- Add the logo to printed schedules and the day sheet (it is now in the top bar and on the sign-in screens)
- Give the **umpire admin** role the same abilities as the umpire chief (it touches about 20 places in the database and a few in the app, so it needs its own careful stage)

## Questions waiting for an answer



- **Families and youth safeguards (Phase 9), for the board:** do we keep the rule that an umpire must be 13 or older? What should a parent or guardian be able to see and do? Who creates the link between a parent and a youth umpire, and how is parental consent recorded? What changes when a youth umpire turns 18? What do the league's insurance and Little League's youth-protection rules require?

- **Paying umpires (Phase 12):** how are youth umpires paid today, and how much? Does the
  league take W-9s or issue any tax forms? What do the league's accountant, insurer and
  Little League district say about paying minors (including work-permit rules) and about
  treating umpires as contractors?

## Decisions made so far

- **Who can assign umpires:** super admins, umpire chiefs and schedulers.
- **Payments:** youth umpires are paid; adult umpires generally are not, but the system
  should let the league pay them. This is a late phase, and the payment service is chosen
  only after the research in Phase 12-0.
- **Number of umpires:** a division has a default, tournaments can have their own default,
  and any single game can be changed. A game needs 0 to 4 umpires.
- **Declining:** umpires can decline as well as confirm. A decline frees the place and
  tells the administrators.
- **Unconfirmed assignments:** administrators are warned about games coming up with
  unconfirmed umpires. The number of days is set per league and starts at 7.
- **Phone numbers on printouts:** an option, for administrators; for a youth umpire,
  both their own and a parent's number (the emergency contact on their record, until
  parents have accounts of their own).
- **Reports privacy (Phase 10):** only the umpire chief and super admins read reports; schedulers, other administrators and the feedback reviewer role cannot. An umpire cannot see reports about themselves. Only the umpire chief and super admins enter outside reports. Reports are deleted automatically a year after their season ends. Defaults: the author of a post-game report reads it and adds follow-ups but cannot edit it; only super admins delete; every change is logged (never the text); nothing is printed or emailed with its content; forms remind people about facts, initials for children, no medical details, and the league's safety officer.
- **Day-of extras privacy (Phase 10):** access details (gate codes) are readable by administrators and by the umpires on a game at that field from 24 hours before until it ends. In the call-around list a youth umpire shows their own number and a parent's. Game notes can be marked administrators only. Text links appear only for people who agreed to texts; a parent's number is for calls only.
- **Game notes and substitutions (Phase 10):** admins and umpires can both write notes on a game.
  A substitute known before the printout is handled by changing the assignment; after the
  printout, an administrator updates the system later from the note.
- **Check-in and "late" (Phase 10):** an umpire can check in from 1 hour before the game starts
  until it ends; "late" means arriving after the scheduled start.
- **Attendance and reports (Phase 10):** both the umpire and administrators can mark that an
  umpire showed up. Post-game and outside reports can be read by the umpire chief and super
  admins only.
- **Own division and messages:** a youth umpire cannot umpire the division they play in (recorded
  on their record; if blank, any division whose ages include theirs). Administrators are told
  straight away when an umpire takes a game within 48 hours, otherwise in a daily summary.
- **Availability:** umpires list when they CAN umpire, as single dates and times or as repeating
  times that end automatically with their season, and can mark dates they CAN'T umpire, which
  override everything else. Being unavailable only warns administrators; the game is still
  offered to the umpire in "Games you can take". Umpires and administrators see it as a list
  and as a month calendar.
- **Self-assigning:** an administrator turns it on for each division, and can turn it off
  for any single umpire. An umpire cannot take a game that overlaps one of their own, and
  the league can set a limit on how many upcoming games an umpire can take for themselves
  (unlimited to begin with; played games do not count).
- **Warnings do not block:** a clash or a missing umpire is shown, but never stops the
  person from saving. The youth age rule is different: it is a rule, so the database enforces it.
- **The master calendar** is kept elsewhere; this system keeps a copy, and administrators
  bring it up to date by importing.

---

*How this document is kept up to date: at the end of each stage, Claude moves finished
items to ✅, updates "Where we are", and adds anything new we have decided to build.*
