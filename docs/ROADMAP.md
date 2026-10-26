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

**We are in Phase 5, assigning umpires to games.**

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
  and parent's numbers) is built and tested here; it needs no database change.
- Stage **5b-2b** is next: umpires assigning themselves.

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

### Phase 5: Assigning umpires 🔧 ← we are here

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

**5b-2b. Self-assigning** ⏳ *next*

- Umpires assign themselves to open places, in the divisions that allow it; such
  assignments are Confirmed and marked as self-assigned

**5c. Further assignment rules** ⬜

- A youth umpire cannot umpire the division they play in
- More rules for self-assigning
- More rules for self-assigning
- Warnings for assignments that are still unconfirmed close to game time

### Phase 6: Availability ⬜

- Umpires enter when they can and cannot umpire
- The assignment screen uses it to show who is available

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

### Phase 10: Game day ⬜

- A field board showing the day's games
- Post-game reports from umpires

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

## Questions waiting for an answer

- **Self-assigning (5b-2b):** which divisions should allow it to begin with, and should an
  umpire be stopped from taking a game that overlaps another of their games? (Proposed: off
  in every division until an administrator turns it on, and yes, overlapping games are refused.)
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
- **Warnings do not block:** a clash or a missing umpire is shown, but never stops the
  person from saving. The youth age rule is different: it is a rule, so the database enforces it.
- **The master calendar** is kept elsewhere; this system keeps a copy, and administrators
  bring it up to date by importing.

---

*How this document is kept up to date: at the end of each stage, Claude moves finished
items to ✅, updates "Where we are", and adds anything new we have decided to build.*
