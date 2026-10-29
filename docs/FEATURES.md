# RWCLL Umpire Management System: What It Does

*Last updated: 26 October 2026*

A web application for managing the umpires of a Little League organization:
their accounts, the league's divisions, teams, fields and games, and which
umpire works which game. This document lists what the software **does today**.
It is added to as new features are finished. For the plan, see `ROADMAP.md`.

Features marked 🆕 were built most recently and are waiting for their first
test on the league's own database.

---

## 1. Accounts and signing in

- People sign in with an email address and password, and sign out from every screen
- New accounts confirm their email address
- A forgotten password is reset by email
- A top bar on every screen shows who is signed in and their **roles** (most important first), with a Sign out button
- **My details** lets each person keep their own phone number, choose whether to receive text messages, and see their roles
- Someone whose account is waiting for approval sees a page saying so
- Every page has its own web address, so the browser's Back and Forward buttons and bookmarks work

## 2. Roles and who can do what

- Nine roles: super admin, umpire chief, scheduler, treasurer, feedback reviewer, read-only admin, adult umpire, youth umpire, parent or guardian
- Each person sees a menu of only their own pages:
  - **Super admin:** Administration and Games. Administration opens a page of buttons (each with a short italic description) for Approvals, Roles, League Setup, Locations, Umpire Directory, Outbox and My details, and each part has its own page, address and row of tabs 🆕
  - **Umpire chief:** Umpire Management and Games
  - **Scheduler:** Umpires, Games, League Setup and My details
  - **Umpires:** a Home page with their own schedule, and My details
- Roles can be given and removed by a super admin; an account cannot be both a youth and an adult umpire, and the last super admin cannot be removed
- Permissions are enforced by the database itself, not only by what the screens show
- Personal information (phone numbers, birth dates, outside IDs, emergency contacts, notes) can be seen only by the people allowed to
- Phone, text-message preference and outside IDs are kept per account, with rules (for example, text messages cannot be on without a phone number)

## 3. Umpire records, registration and invitations

- A directory of umpires that can be searched, with each umpire's number, classification (youth or adult), contact details, eligibility (active, inactive, suspended), birth date, emergency contact, outside IDs and administrative notes
- Administrators can add an umpire record and link it to an approved account
- **Self-registration:** a person registers as an adult or a youth umpire; an administrator approves or rejects it
- Approval checks age: a youth needs a birth date and must be 13 to 17, an adult must be 18 or older, and nobody under 13 is approved this way
- **Invitations:** an administrator invites an umpire by email. The invitation lasts 30 days and can be renewed, revoked or copied. When the person confirms their email the account is linked and approved automatically
- The umpire list shows each umpire's account status: linked, pending review, invited (with the expiry date), invitation expired, not linked, rejected or suspended
- The umpire chief can approve umpire registrations; a scheduler cannot

## 4. The email Outbox

- Messages the system would send (such as invitations) are queued in an Outbox
- For each message an administrator can show it, copy it, mark it as sent, or skip it
- The Outbox updates by itself when a message is queued
- The system queues messages here by itself: to an umpire when they are assigned to a game or taken off one, to the administrators when an umpire declines, and to the administrators when assignments are still unconfirmed shortly before a game 🆕

## 5. League setup

- **Leagues, seasons, divisions, teams and fields** (with addresses) can be added and edited, and removed when nothing depends on them
- Divisions have a Little League age range, a default number of umpires per game (including none), and an optional different number for tournament games 🆕
- Divisions are listed **youngest first** (by the lowest age in their range) wherever they are chosen or listed; a division with no age range comes last 🆕
- Each field is marked as a **league field** (one this league runs) or an **away field** (one our teams travel to) 🆕
- Teams show their division, coach and whether they are active, and can be filtered by division (with the number of teams in each)
- **Little League age charts** can be imported (birth month and year to Little League age), and a season can be linked to one
- **Create a season from the registration system's files:** the team and division files are read, checked, and the season, its divisions and its teams are created in one all-or-nothing step. Division names match even when they carry a bracketed description, and teams with no coach are flagged

## 6. Games

- Add, edit and delete games: season, division, game type (including tournament), home and away teams, field, start time, length, status, notes, and the master calendar's game ID
- **Tournament games** can have undecided teams ("Winner of game 12")
- The database checks every game: both teams must belong to the game's season and division, a team cannot play itself, and a game must end after it starts
- Filters by season, division, field, dates, status, and a search across teams, umpires, fields and the master ID; a view of only games with warnings
- **Warnings** (shown, never blocking): no umpire assigned, too few umpires 🆕, two games at one field at once, and a team in two games at once. A summary line counts each kind
- **Import from the master calendar spreadsheet:** the file is read, divisions, teams and fields are matched, and a preview shows what is new, changed, unchanged, or a problem. The import is all-or-nothing, and handles seasons of thousands of games
- The master calendar's game ID is kept with each game, so a later import updates the right game

## 7. Assigning umpires 🆕

- **How many umpires a game needs:** each division has a default of none to four; a division can have a separate default for tournament games; any single game can be changed. Importing the calendar never changes a game's own setting
- **The places:** one umpire works the plate; two work plate and field; three work plate, first base and third base; four work plate and all three bases
- Each game has an **Umpires** button that opens an assignment screen: choose an umpire for each place, or change how many are needed
- Each umpire in the list shows how many games they already have, and is marked if they are **busy at that time**. Choosing someone who is already in another place swaps the two
- Saving sets all the game's umpires together, or none of them
- A game is fully staffed when it has as many umpires as it needs, whatever places they hold. Lowering the number never removes anyone
- The games list shows each place with its umpire, or **OPEN** (in red) where someone is still needed, and a note when a game has its own number
- **Youth umpire age rule:** a youth umpire cannot be assigned to a division whose players start at the umpire's own Little League age or older. Such umpires are shown as unavailable, and the database refuses the assignment with the reason. The rule is not applied when it cannot be checked (no birth date, or the season's age chart does not cover the birth month), and the screen says so
- Only active umpires can be assigned, and nobody can be assigned to a canceled game
- Who made each assignment is recorded
- Super admins, umpire chiefs and schedulers can assign umpires

**Field board and calendar** 🆕

- A **Field board** tab for super admins, umpire chiefs and schedulers: one day's games field by field, league fields first, then away games
- Each game shows its time, division, teams (or an out-of-league label), notes, status, and every umpire place: confirmed, not confirmed, or needs an umpire
- A summary line (games, fields, canceled, places that need an umpire, umpires not yet confirmed), and the day can be printed
- A month calendar shows how many games there are on each day, with a red dot when places still need an umpire; pressing a day opens it
- Previous and next day, a date box, and a bookmarkable address for each day

**Game day: attendance and calling umpires** 🆕

- A **Game day** card at the top of an umpire's Home page lists today's games, with a big **I'm here** check-in button from 1 hour before the game until it ends
- The card shows when check-in opens, when you checked in (and how late), and says plainly when a game is over with no check-in recorded
- On the Field board, each umpire shows **Arrived** (with the time, and how many minutes late if after the start), **Not here yet**, or **No-show**, counted in the day's summary
- Administrators can **Mark** an arrival (now, or a time they type), a no-show, or clear it; every change is kept in the assignment history with who made it
- **Call** and **Text** links with each umpire's number (and a parent's for a youth umpire), for reaching someone who is late
- Attendance stays with an umpire when they are moved to another place on a game

**Demo clock** 🆕

- For testing and demonstrations: a small **Demo clock** box lets anyone set a **pretend date and time** (kept in that browser only), so a Saturday game can be tried on a Thursday
- It is amber and says *not real* while it is in use; **Use real time** puts it back
- The Field board, the Game day card, schedules and availability follow the pretend time, and so do check-in and recording attendance
- It appears only where the database has it switched on (the test database); where it is off the box is hidden and any pretend time is ignored

**Further assignment rules** 🆕

- An administrator can record which division a youth umpire plays in (on their record). That division is then off limits to them, however the assignment is made
- With nothing recorded, a youth umpire is also kept off any division whose ages include theirs, worked out from their birth date and the season's age chart
- An adult umpire is never affected
- The assignment panel marks such an umpire "their own division" and says why
- When an umpire takes a game for themselves, the administrators are told through the Outbox: straight away if the game starts within 48 hours, otherwise in one summary message for each day
- The daily summaries are queued when an administrator opens the Games tab (nothing runs on a timer yet); each game is told about once

**Availability** 🆕

- Each umpire can enter the dates and times they **can** umpire (one date at a time, or all day, with an optional note), change or remove them, and see them listed soonest first
- An administrator can enter, change or remove availability for any umpire from that umpire's record
- An umpire sees only their own entries; administrators see everyone's
- An umpire who has entered some availability is taken to be unavailable at other times; one who has entered none is shown as "no availability entered" (never a warning)
- In the assignment panel, each umpire is marked *not available then* or *no availability entered*, and a note names a selected umpire who is not available. It is a warning only: the assignment can still be saved
- The Games list warns "Not available: Ann Lee" for a game whose umpire has entered availability that does not cover it, counted in the summary
- Games an umpire can take for themselves are still offered whatever their availability
- **Repeating times** 🆕: days of the week plus times (or all day), starting on a chosen date and ending automatically when the season does; listed in plain words
- **Dates and times an umpire can't umpire** 🆕: these always win over single and repeating times, and count even when nothing else was entered
- A month calendar shows what has been entered: available all day, part of the day, marked unavailable (striped, so it does not depend on color), and nothing; pressing a day picks it in the form
- The assignment panel and the Games list use all of it, with their own wording when an umpire marked the time unavailable

**Umpires assigning themselves** 🆕

- An administrator turns this on for a division (it is off to begin with), and can turn it off for any one umpire (it is on to begin with)
- An umpire sees the open places they may take, on their Home page, for dates they choose (the next 30 days to begin with), and takes one with a button. It is Confirmed straight away, marked as self-assigned, and they can decline it later
- The database refuses a game that overlaps one of the umpire's own, a place that is no longer open, a game that has started or been canceled, and a youth umpire's game the age rule forbids. It also refuses the umpire's request if they are not active or an administrator has switched it off for them
- A league can set the most upcoming games an umpire may take for themselves (blank for no limit); games already played and canceled games do not count, and assignments an administrator makes are never limited
- Administrators see "Confirmed (self)" on the games list, and the history records that the umpire assigned themselves

**Confirming and declining** 🆕

- Each assignment is **Assigned** until the umpire answers, then **Confirmed**; the games list shows the status beside each umpire
- On their own schedule, an umpire sees which games are waiting for their answer and can **Confirm** or **Decline** each one. Declining asks for an optional reason, frees the place, and tells the administrators
- A place that was given up is shown on the games list ("Declined: Ann Lee") while the game is still to come
- An administrator can **Mark as confirmed** for an umpire who answered another way, from the Umpires panel
- An umpire who stays on a game keeps their confirmation when other places are changed or they move to another place
- Games coming up with umpires who have not confirmed get a warning ("Not confirmed yet: Ann Lee"), counted in the summary. Each league sets how many days ahead (7 to begin with; 0 turns it off), in League Setup
- A history records who was assigned, confirmed, declined or removed, and when

## 8. Printing and downloading schedules

- **Print the schedule** for the games on screen, day by day, with the field's address under its name. An option starts each day on a new page. Open places are boxed as OPEN, places that need no umpire are left out, and canceled games are struck through
- **Print with phone numbers** (an option, off each time): each umpire's number follows their name, a youth umpire shows both their own number and a parent's (their emergency contact), an umpire with an account shows the account's number, and an umpire with no number is flagged. If the numbers cannot be looked up, nothing is printed 🆕
- **Download the schedule as a spreadsheet file (CSV)** with the date, times, division, field, address, teams, the umpire in every place, how many umpires are needed, status, type, master ID and notes. An empty cell means nobody is there, so it can be filtered. Cells are protected against spreadsheet formula tricks
- **One umpire's schedule:** an administrator picks an umpire and sees all their games, with date filters, and can print or download it
- **My schedule:** each umpire sees only their own games and their place in each, with date filters, and can print or download them. They never see another umpire's name

## 9. Colors and layout

- A consistent forest-green, black and white design
- The league logo is in the top bar (on a white badge, pressing it goes home) and at the top of the sign-in screens; replacing one file changes it everywhere 🆕
- Every text and background color pair meets accessibility contrast standards
- Screens adapt to phones: tables become cards, nothing scrolls sideways
- Printed pages show only the schedule, not the app around it

## 10. Keeping the data safe

- A **test** database separate from the live one, with a test mode for the app
- A **backup** tool for the live data, and a tool that restores a backup into the test database
- A scheduled **keep-alive** so the free database plan does not pause
- Eleven **check scripts** that try the database's rules from every kind of account and always undo themselves, and **one command that runs them all**, showing pass or fail for each
- A **FAQ** of every routine task, a **recovery guide**, and an **email setup guide**

---

*How this document is kept up to date: at the end of each stage, Claude adds what was
finished. Only things the software actually does are listed here.*
