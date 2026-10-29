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
- Phase 10 (game day) has begun: stage **10a**, the field board and calendar, is built and
  tested here (it needs no database change). Next are 10b (attendance, game notes,
  substitutions, call and text links), 10c (reports) and 10d (day-of extras).
- Sending real email (Phase 7) is postponed until you are ready, and Phase 9 (families and
  youth safeguards) waits for the board's answers.

---

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

### Phase 7: Notifications and sending email ⬜

- Choose and set up the email service (Google Workspace or a similar service)
- Send invitations, assignments and reminders for real, instead of queuing them
- Send the reminder about unconfirmed assignments on a schedule, not only when an
  administrator opens the Games page
- Text-message reminders, for people who have agreed to them

### Phase 8: Hosting and mobile ⬜

- Put the app on the web so everyone can reach it
- Make it install on a phone like an app

### Phase 9: Families and youth safeguards ⬜

- Link parents and guardians to youth umpires
- Parent consent for umpires under 13 before they can be active
- Read-only access for parents

### Phase 10: Game day 🔧 ← we are here

**10a. Field board and calendar** ✅ *(built and tested; no database change)*

- One day's games by field and time, with the umpires and which places are open or not yet
  confirmed; league fields first, then away games
- A month calendar showing how many games there are each day, and a marker for days with open places
- Print a day; bookmarkable day addresses

**10b. Day-of actions** ⬜

- **Attendance:** confirm that each umpire showed up (and when), with late and no-show recorded.
  Both the umpire (checking in) and administrators can mark it
- A **note on each game**, and a way to record a **substitution** (the umpire assigned could not
  come; someone else worked it), keeping the original assignment on record
- **Call or text an umpire from a game** (for example, when one is late): phone numbers become
  links that start a call or text on a phone

**10c. Reports** ⬜

- **Post-game reports** from umpires
- **Reports from outside** (coaches, parents, the board) that administrators add to an umpire's record
- Reports can be read by the umpire chief and super admins only

**10d. Day-of extras** ⬜ *(ideas, to be chosen)*

- Rainouts and field closures that cancel or move many games at once, and tell the umpires
- A "running late" button for umpires; a call-around list of available umpires for an uncovered game
- Field notes (parking, gate codes) and directions; an umpire's own "my day" view
- Incident and injury reports; recording the final score

### Phase 11: Certifications and training ⬜

- Track umpire certifications and training

### Phase 12: Payments ⬜ *(late; needs research first)*

The league pays its **youth umpires**; adult umpires are generally not paid, but
the system should allow it. This phase depends on confirmed assignments (5b-1),
check-in (Phase 10), hosting (Phase 8) and parent links (Phase 9).

**12-0. Find out how it is done today** ⏳ *(before any building)*
- How, how much, how often and by whom umpires are paid now; what records exist
- What the league's treasurer, accountant, insurer and Little League district advise
  about paying minors and how umpires are classified (see "Questions waiting")

**12a. Rates and an earnings ledger** ⬜
- Rates by place, division and game type; a treasurer's screen to set them
- Each confirmed game produces what the umpire is owed (youth, or adults when enabled)
- Payment history and reports per umpire, game and season, with spreadsheet downloads
- The treasurer pays however the league pays today, and records it here

**12b. Check-in as the trigger** ⬜ *(shared with Phase 10)*
- A confirmed check-in is what makes a game payable

**12c. Paying through a service** ⬜
- Choose the payment service after the research above. Candidates looked at so far:
  Stripe Connect, PayPal Payouts, ArbiterPay, or continuing to pay by check or bank
  transfer from the ledger
- Practice first with fake money, then pay a batch only after the treasurer approves it,
  and only later automatically
- Youth umpires paid through a parent or guardian, as the chosen service requires
- Tax paperwork as the league's advisor directs

### Phase 13: Scheduling help ⬜

- Suggestions for who to assign to a game

### Phase 14: Season management ⬜

- Start a new season from the last one
- Reports and statistics across seasons

---

## Smaller things on the list

- **Sign out automatically** after a period of no activity (something like 30 minutes, with a warning first)
- **Add a person who is not an umpire** from the app: invite them with their roles, and/or a sign-up choice for them (today it takes one step in the Supabase dashboard; see FAQ section 42)
- Use the league logo in the app (it already serves as the app icon and favicon)
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
