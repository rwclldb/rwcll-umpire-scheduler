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
- Phase 5 is half done. Stage **5a** (how many umpires a game needs, the places
  they work, the assignment screen, and the first youth umpire rule) is built
  and tested. Its newest database changes are waiting for their first run on
  your own test database.
- Stage **5b** is next: umpires assigning themselves, assignments being
  Assigned or Confirmed, and phone numbers on the printed schedule.

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

**5b. Self-assigning and confirming** ⏳ *next*

- Umpires assign themselves to open places
- Each assignment is **Assigned** (an administrator did it, the umpire still has to
  confirm) or **Confirmed** (the umpire confirmed it, or assigned themselves)
- Self-assigned places are marked as such
- Umpires confirm their assignments when they sign in
- Phone numbers of the assigned umpires on the printed schedule

**5c. Further assignment rules** ⬜

- A youth umpire cannot umpire the division they play in
- More rules for self-assigning
- Warnings for assignments that are still unconfirmed close to game time

### Phase 6: Availability ⬜

- Umpires enter when they can and cannot umpire
- The assignment screen uses it to show who is available

### Phase 7: Notifications and sending email ⬜

- Choose and set up the email service (Google Workspace or a similar service)
- Send invitations, assignments and reminders for real, instead of queuing them
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
the system should allow it. This phase depends on confirmed assignments (5b),
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

- **Phone numbers for youth umpires:** on the printed schedule, should a youth umpire's
  own number, a parent's number, or both be shown?
- **Declining:** should an umpire be able to decline an assignment, as well as confirm it?
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
- **Warnings do not block:** a clash or a missing umpire is shown, but never stops the
  person from saving. The youth age rule is different: it is a rule, so the database enforces it.
- **The master calendar** is kept elsewhere; this system keeps a copy, and administrators
  bring it up to date by importing.

---

*How this document is kept up to date: at the end of each stage, Claude moves finished
items to ✅, updates "Where we are", and adds anything new we have decided to build.*
