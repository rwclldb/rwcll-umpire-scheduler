// Tests for the calendar sync's reading, matching and planning (nothing here touches a database).
// Run from the project folder with Node 23 or newer:
//
//   node --test supabase/functions/sync-calendar/
//
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIcs, zonedToIso } from "./ics.ts";
import { matchGames, RULES } from "./match.ts";
import type { OurGameRef } from "./match.ts";
import { addressKey, isPractice, readTeams, resolveField, resolveTeam } from "./names.ts";
import { buildSyncPlan } from "./sync-plan.ts";
import type { OurGame, SyncContext } from "./sync-plan.ts";

const TZ = "America/Los_Angeles";
const NOW = new Date("2026-11-12T21:00:00Z");

function event(summary: string, start: string, end: string, description = "Kiwanis Field > MAJ", location = "1311 Madison Avenue\\,Redwood City\\,CA-94061 US") {
  return [
    "BEGIN:VEVENT",
    `DESCRIPTION:${description}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `LOCATION:${location}`,
    `SUMMARY:${summary}`,
    "UID:20261112T21065187477723",
    "END:VEVENT",
  ].join("\r\n");
}

const calendar = (...events: string[]) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", ...events, "END:VCALENDAR"].join("\r\n");

// ------------------------------------------------------------------ reading the feed

test("reads events, escapes, folded lines and UTC times", () => {
  const text = calendar(
    event("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays", "20261115T160000Z", "20261115T174500Z").replace(
      "SUMMARY:MAJ 01 - Seely-Kirk @ MAJ 02 - Kays",
      "SUMMARY:MAJ 01 - Seely-Kirk @ MAJ\r\n  02 - Kays"
    )
  );
  const [one] = parseIcs(text, TZ);
  assert.equal(one.summary, "MAJ 01 - Seely-Kirk @ MAJ 02 - Kays");
  assert.equal(one.location, "1311 Madison Avenue,Redwood City,CA-94061 US");
  assert.equal(one.startsAt, "2026-11-15T16:00:00.000Z");
  assert.equal(one.endsAt, "2026-11-15T17:45:00.000Z");
});

test("reads local times with TZID, floating times, and whole days", () => {
  const text = calendar(
    event("A @ B", "20261115T090000", "20261115T110000").replace("DTSTART:", "DTSTART;TZID=America/New_York:"),
    event("C @ D", "20260704T090000", "20260704T110000"),
    event("E @ F", "20261115", "20261116").replace("DTSTART:", "DTSTART;VALUE=DATE:")
  );
  const [ny, floating, day] = parseIcs(text, TZ);
  assert.equal(ny.startsAt, "2026-11-15T14:00:00.000Z"); // 9 AM Eastern, winter
  assert.equal(floating.startsAt, "2026-07-04T16:00:00.000Z"); // 9 AM Pacific, summer
  assert.equal(day.startsAt, null);
  assert.equal(day.allDay, true);
});

test("clock changes are handled", () => {
  assert.equal(zonedToIso(2027, 3, 14, 9, 0, 0, TZ), "2027-03-14T16:00:00.000Z"); // after spring forward
  assert.equal(zonedToIso(2026, 11, 1, 9, 0, 0, TZ), "2026-11-01T17:00:00.000Z"); // after fall back
});

test("games, practices and other events are told apart", () => {
  assert.deepEqual(readTeams("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays"), { away: "MAJ 01 - Seely-Kirk", home: "MAJ 02 - Kays" });
  assert.deepEqual(readTeams("PA2 @ JUN 01 - McGowan"), { away: "PA2", home: "JUN 01 - McGowan" });
  assert.equal(readTeams("Picture Day"), null);
  assert.equal(isPractice("MAJ 04 - Smith Practice"), true);
  assert.equal(isPractice("MAJ 04 - Smith @ MAJ 03 - Borg"), false);
});

// ------------------------------------------------------------------ names

test("teams: saved name, same name, outside team, unknown", () => {
  const teams = [{ id: "t1", name: "MAJ 01 - Seely-Kirk", division_id: "d" }, { id: "t2", name: "Majors Cubs", division_id: "d" }];
  const saved = [{ kind: "team" as const, feed_key: "maj02kays", team_id: "t2", location_id: null, is_outside: false }];
  assert.equal(resolveTeam("MAJ 01 - Seely-Kirk", teams, []).kind, "team");
  const kept = resolveTeam("MAJ 02 - Kays", teams, saved);
  assert.ok(kept.kind === "team" && kept.team.id === "t2" && kept.how === "saved");
  assert.equal(resolveTeam("Evergreen Seniors Team", teams, []).kind, "outside");
  assert.equal(resolveTeam("MAJ 09 - Nobody", teams, []).kind, "unknown");
});

test("fields: same name, address, start of name, and nothing when unsure", () => {
  const fields = [
    { id: "f1", name: "Kiwanis Field", address: "1311 Madison Ave, Redwood City, CA" },
    { id: "f2", name: "Orion School", address: null },
    { id: "f3", name: "Kennedy Middle School", address: "2521 Goodwin Ave, Redwood City, CA" },
    { id: "f4", name: "Griffin Field", address: "Red Morton Park" },
    { id: "f5", name: "Bechet Field", address: "Red Morton Park" },
  ];
  const how = (description: string, location = "") => {
    const found = resolveField(description, location, fields, []);
    return found.kind === "field" ? `${found.field.id} ${found.how}` : "unknown";
  };
  assert.equal(how("Kiwanis Field > MAJ"), "f1 same name");
  assert.equal(how("Kennedy > AAA", "2521 Goodwin Avenue,Redwood City,CA-94061 US"), "f3 address");
  assert.equal(how("Orion > A"), "f2 start of name");
  assert.equal(how("Quimby > JUN", "3190 Quimby Road,San Jose,CA"), "unknown");
  assert.equal(addressKey("Red Morton Park"), "");
});

// ------------------------------------------------------------------ matching

const ours = (id: string, home: string, away: string, startsAt: string, extra: Partial<OurGameRef> = {}): OurGameRef =>
  ({ id, home, away, startsAt, status: "scheduled", fromMasterCalendar: true, ...extra });

test("same teams on the same day are the same game, even with home and away swapped", () => {
  const result = matchGames(
    [{ index: 0, home: "team:b", away: "team:a", startsAt: "2026-11-15T20:00:00Z" }],
    [ours("g1", "team:a", "team:b", "2026-11-15T17:00:00Z")],
    { timeZone: TZ, now: NOW }
  );
  assert.deepEqual(result.pairs, [{ feedIndex: 0, gameId: "g1", how: "same_day" }]);
  assert.deepEqual(result.newFeedIndexes, []);
  assert.deepEqual(result.notInFeed, []);
});

test("the day is the league's day, not UTC's", () => {
  // 5 PM Pacific on the 14th is already the 15th in UTC
  const result = matchGames(
    [{ index: 0, home: "team:a", away: "team:b", startsAt: "2026-11-15T01:00:00Z" }],
    [ours("g1", "team:a", "team:b", "2026-11-14T17:00:00Z")],
    { timeZone: TZ, now: NOW }
  );
  assert.equal(result.pairs[0]?.how, "same_day");
});

test("a game moved to another day is recognised; too far is new plus not-in-feed", () => {
  const feed = [{ index: 0, home: "team:a", away: "team:b", startsAt: "2026-11-22T17:00:00Z" }];
  const ourGames = [ours("g1", "team:a", "team:b", "2026-11-15T17:00:00Z")];
  assert.deepEqual(matchGames(feed, ourGames, { timeZone: TZ, now: NOW }).pairs, [{ feedIndex: 0, gameId: "g1", how: "moved" }]);

  const off = matchGames(feed, ourGames, { timeZone: TZ, now: NOW, rules: { ...RULES, moveWindowDays: 0 } });
  assert.deepEqual(off.newFeedIndexes, [0]);
  assert.deepEqual(off.notInFeed, ["g1"]);
});

test("a canceled game only matches at the same time; hand-made and past games are never flagged", () => {
  const result = matchGames(
    [
      { index: 0, home: "team:a", away: "team:b", startsAt: "2026-11-15T22:00:00Z" }, // replay, same day, later
      { index: 1, home: "team:c", away: "team:d", startsAt: "2026-11-15T17:00:00Z" },
    ],
    [
      ours("canceled", "team:a", "team:b", "2026-11-15T17:00:00Z", { status: "canceled" }),
      ours("same-time-canceled", "team:c", "team:d", "2026-11-15T17:00:00Z", { status: "canceled" }),
      ours("by-hand", "team:e", "team:f", "2026-11-20T17:00:00Z", { fromMasterCalendar: false }),
      ours("past", "team:g", "team:h", "2026-11-01T17:00:00Z"),
      ours("gone", "team:i", "team:j", "2026-11-20T17:00:00Z"),
    ],
    { timeZone: TZ, now: NOW }
  );
  assert.deepEqual(result.newFeedIndexes, [0]);
  assert.deepEqual(result.pairs, [{ feedIndex: 1, gameId: "same-time-canceled", how: "same_day" }]);
  assert.deepEqual(result.notInFeed, ["gone"]);
});

// ------------------------------------------------------------------ the plan

function context(games: OurGame[], assigned: [string, number][] = []): SyncContext {
  return {
    timeZone: TZ,
    now: NOW,
    season: { id: "s", name: "Fall", starts_on: null, ends_on: null },
    divisions: [{ id: "dMAJ", name: "Majors" }, { id: "dAA", name: "AA" }],
    teams: [
      { id: "t1", name: "MAJ 01 - Seely-Kirk", division_id: "dMAJ" },
      { id: "t2", name: "MAJ 02 - Kays", division_id: "dMAJ" },
      { id: "t3", name: "AA 01 - De Leon", division_id: "dAA" },
    ],
    fields: [
      { id: "f1", name: "Kiwanis Field", address: null },
      { id: "f2", name: "Mitchell Field", address: null },
    ],
    games,
    assignedCount: new Map(assigned),
    savedNames: [],
  };
}

const game = (id: string, starts: string, ends: string, extra: Partial<OurGame> = {}): OurGame => ({
  id, division_id: "dMAJ", home_team_id: "t2", away_team_id: "t1", home_label: null, away_label: null,
  location_id: "f1", starts_at: starts, ends_at: ends, status: "scheduled", master_source: "spreadsheet",
  updated_at: "2026-11-01T00:00:00.000000+00:00", ...extra,
});

test("a changed game says what changed, and is ready to tell its umpires", () => {
  const feed = parseIcs(calendar(
    event("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays", "20261115T170000Z", "20261115T184500Z", "Mitchell Field > MAJ")
  ), TZ);
  const plan = buildSyncPlan(feed, context([game("g1", "2026-11-15T16:00:00Z", "2026-11-15T17:45:00Z")], [["g1", 2]]), null);

  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.updates.length, 1);
  const [update] = plan.updates;
  assert.equal(update.quiet, false);
  assert.equal(update.assigned, 2);
  assert.deepEqual(update.changes, [
    "Time: Sun, Nov 15, 8:00 AM - 9:45 AM → Sun, Nov 15, 9:00 AM - 10:45 AM",
    "Field: Kiwanis Field → Mitchell Field",
  ]);
  assert.match(update.notice_body, /confirm this game again/);
  assert.equal(update.set.location_id, "f2");
});

test("an unchanged game is left alone; a new one is added; a missing one is flagged once", () => {
  const feed = parseIcs(calendar(
    event("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays", "20261115T160000Z", "20261115T174500Z"),
    event("PA2 @ MAJ 01 - Seely-Kirk", "20261116T160000Z", "20261116T174500Z"),
    event("MAJ 04 - Smith Practice", "20261116T010000Z", "20261116T020000Z")
  ), TZ);
  const existing = [
    game("same", "2026-11-15T16:00:00Z", "2026-11-15T17:45:00Z"),
    game("gone", "2026-11-20T16:00:00Z", "2026-11-20T17:45:00Z", { home_team_id: null, home_label: "Visitors" }),
  ];
  const plan = buildSyncPlan(feed, context(existing), null);

  assert.equal(plan.counts.practices, 1);
  assert.equal(plan.counts.unchanged, 1);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.inserts[0].home_team_id, "t1");
  assert.equal(plan.inserts[0].away_label, "PA2");
  assert.equal(plan.inserts[0].division_id, "dMAJ");
  assert.deepEqual(plan.not_in_feed.map((row) => row.id), ["gone"]);
  assert.match(plan.admin_notice?.subject ?? "", /1 game not on the calendar/);

  // the next run: the same game is still missing, so nobody is emailed again
  const again = buildSyncPlan(feed, context(existing), { heldKeys: [], notInFeedIds: ["gone"], nameKeys: [] });
  assert.equal(again.admin_notice, null);
});

test("held: unknown team, teams in two divisions; skipped: canceled here", () => {
  const feed = parseIcs(calendar(
    event("MAJ 09 - Nobody @ MAJ 02 - Kays", "20261115T160000Z", "20261115T174500Z"),
    event("AA 01 - De Leon @ MAJ 02 - Kays", "20261116T160000Z", "20261116T174500Z"),
    event("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays", "20261117T160000Z", "20261117T174500Z")
  ), TZ);
  const plan = buildSyncPlan(feed, context([
    game("rained-out", "2026-11-17T16:00:00Z", "2026-11-17T17:45:00Z", { status: "canceled" }),
  ]), null);

  assert.equal(plan.held.length, 2);
  assert.match(plan.held[0].reasons.join(" "), /not matched/);
  assert.match(plan.held[1].reasons.join(" "), /different divisions/);
  assert.equal(plan.skipped.length, 1);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.names.find((row) => row.name === "MAJ 09 - Nobody")?.matched_to, null);
});

test("one of our teams on the same day with a new opponent is the same game, changed", () => {
  // was: MAJ 02 - Kays (home) vs SB2 at 1:00 PM; now on the master calendar: MAJ 02 - Kays @ PA2 at 11:00 AM
  const feed = parseIcs(calendar(
    event("MAJ 02 - Kays @ PA2", "20261115T190000Z", "20261115T210000Z")
  ), TZ);
  const plan = buildSyncPlan(feed, context([
    game("g1", "2026-11-15T21:00:00Z", "2026-11-15T23:15:00Z", { away_team_id: null, away_label: "SB2" }),
  ], [["g1", 1]]), null);

  assert.equal(plan.inserts.length, 0);
  assert.deepEqual(plan.not_in_feed, []);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].how, "new_opponent");
  assert.equal(plan.updates[0].set.home_label, "PA2");
  assert.equal(plan.updates[0].set.away_team_id, "t2");
  assert.deepEqual(plan.updates[0].changes, [
    "Time: Sun, Nov 15, 1:00 PM - 3:15 PM → Sun, Nov 15, 11:00 AM - 1:00 PM",
    "Home team: MAJ 02 - Kays → PA2",
    "Away team: SB2 → MAJ 02 - Kays",
  ]);
});

test("a new opponent is only recognised when it is unambiguous; outside teams alone never count", () => {
  const result = matchGames(
    [
      { index: 0, home: "team:a", away: "label:x", startsAt: "2026-11-15T17:00:00Z" },
      { index: 1, home: "team:a", away: "label:y", startsAt: "2026-11-15T20:00:00Z" },
      { index: 2, home: "label:p", away: "label:q", startsAt: "2026-11-15T17:00:00Z" },
    ],
    [
      ours("a-vs-z", "team:a", "label:z", "2026-11-15T18:00:00Z"),
      ours("p-vs-r", "label:p", "label:r", "2026-11-15T17:00:00Z"),
    ],
    { timeZone: TZ, now: NOW }
  );
  assert.deepEqual(result.pairs, []);
  assert.deepEqual(result.notInFeed, ["a-vs-z", "p-vs-r"]);
});

test("a game with a team marked not tracked (Tee Ball) is skipped: not added, held or asked about", () => {
  const feed = parseIcs(calendar(
    event("TB 01 - Lee @ TB 02 - Park", "20261115T160000Z", "20261115T170000Z", "Somewhere Unknown > TB", "9 Nowhere Road")
  ), TZ);
  const ctx = context([]);
  ctx.savedNames = [{ kind: "team", feed_key: "tb01lee", team_id: null, location_id: null, is_outside: false, is_ignored: true }];
  const plan = buildSyncPlan(feed, ctx, null);

  assert.equal(plan.counts.not_tracked, 1);
  assert.equal(plan.inserts.length, 0);
  assert.equal(plan.held.length, 0);
  assert.deepEqual(plan.names.map((row) => [row.name, row.matched_to]), [["TB 01 - Lee", "Not tracked"]]);
  assert.equal(plan.admin_notice, null);
});

test("a game held back (field not matched yet) is not also listed as missing", () => {
  const feed = parseIcs(calendar(
    event("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays", "20261115T160000Z", "20261115T174500Z", "Nowhere Park > MAJ", "1 Nowhere Road")
  ), TZ);
  const plan = buildSyncPlan(feed, context([game("moved", "2026-11-15T17:00:00Z", "2026-11-15T19:00:00Z")]), null);

  assert.equal(plan.held.length, 1);
  assert.match(plan.held[0].reasons.join(" "), /not matched/);
  assert.match(plan.held[0].reasons.join(" "), /It is the game here on Sun, Nov 15, 9:00 AM/);
  assert.deepEqual(plan.not_in_feed, []);
  assert.equal(plan.updates.length, 0);
});

test("a game made by hand that matches is taken over quietly; past games are not touched", () => {
  const feed = parseIcs(calendar(
    event("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays", "20261115T160000Z", "20261115T174500Z"),
    event("MAJ 01 - Seely-Kirk @ MAJ 02 - Kays", "20261110T160000Z", "20261110T180000Z")
  ), TZ);
  const plan = buildSyncPlan(feed, context([
    game("by-hand", "2026-11-15T16:00:00Z", "2026-11-15T17:45:00Z", { master_source: null }),
    game("last-week", "2026-11-10T16:00:00Z", "2026-11-10T17:45:00Z"),
  ]), null);

  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].id, "by-hand");
  assert.equal(plan.updates[0].quiet, true);
  assert.equal(plan.counts.already_started, 1);
});
