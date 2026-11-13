// HOW A GAME IN THE FEED IS RECOGNISED AS A GAME WE ALREADY HAVE.
//
// The feed has no lasting game ID (its UIDs change on every download), so games are matched by what
// they are. All the rules are in this one file, so they are easy to change:
//
//   1. SAME DAY. The same two teams (either way round, so a home/away swap is still the same game)
//      on the same day, in the league's time zone, are the same game. Any game of ours can match:
//      one from the spreadsheet import, one the sync added earlier, or one made by hand.
//      A game here that is CANCELED only matches at exactly the same start time; otherwise the
//      feed's game is a new game (for example a rained-out game the master calendar replayed
//      later the same day).
//
//   2. NEW OPPONENT. With no doubleheaders, one of OUR teams plays at most one game a day. So a feed
//      game and a game of ours, both left over after rule 1, on the same day and sharing one of our
//      teams, are the same game with the other team (and perhaps home/away, time or field) changed,
//      e.g. "McGowan vs SB2" became "PA2 @ McGowan". Only when it is unambiguous: each of the two
//      has no other such candidate. Outside teams alone (two "label:" sides) never count.
//      Switch off with RULES.newOpponentSameDay = false.
//
//   3. MOVED. A feed game left over after rules 1-2, and a game of ours left over with the same two
//      teams within RULES.moveWindowDays, are the same game moved to another day.
//
//      Rules 2 and 3 only use games of ours that came from the master calendar, are not canceled
//      and have not started. The closest pair in time is paired first.
//
//   4. Whatever is left in the feed is NEW. Whatever is left of ours (from the master calendar,
//      not canceled, not started) is NOT IN THE FEED, and is flagged for a person to look at.
//
// There are no doubleheaders, but if two candidates ever fit, the closest start time wins.

export const RULES = {
  // rule 2: one of our teams on the same day, with a different opponent, is the same game.
  newOpponentSameDay: true,
  // rule 3: how far (in days) a game may move and still be recognised. 0 turns rule 3 off.
  moveWindowDays: 60,
};

// Who plays: "team:<id>" for one of our teams, "label:<name>" for an outside team.
export type Side = string;

export type FeedGameRef = { index: number; home: Side; away: Side; startsAt: string };

export type OurGameRef = {
  id: string;
  home: Side;
  away: Side;
  startsAt: string;
  status: string;
  fromMasterCalendar: boolean;
};

export type Pair = { feedIndex: number; gameId: string; how: "same_day" | "new_opponent" | "moved" };

export type MatchResult = {
  pairs: Pair[];
  newFeedIndexes: number[];
  notInFeed: string[]; // our game ids
};

// The two teams, in an order that does not depend on who is home.
export function teamsKey(home: Side, away: Side): string {
  return [home, away].sort().join("|");
}

// "2026-11-14": the day of a moment in a time zone.
export function dayKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const DAY = 86400000;

// Pairs up two lists greedily, closest in time first. `fits` says whether a pair is allowed.
function pairClosest<F extends { startsAt: string }, O extends { startsAt: string }>(
  feed: F[],
  ours: O[],
  fits: (f: F, o: O) => boolean
): [F, O][] {
  const options: { f: F; o: O; gap: number }[] = [];
  for (const f of feed) {
    for (const o of ours) {
      if (fits(f, o)) options.push({ f, o, gap: Math.abs(Date.parse(f.startsAt) - Date.parse(o.startsAt)) });
    }
  }
  options.sort((a, b) => a.gap - b.gap);

  const usedF = new Set<F>();
  const usedO = new Set<O>();
  const pairs: [F, O][] = [];
  for (const option of options) {
    if (usedF.has(option.f) || usedO.has(option.o)) continue;
    usedF.add(option.f);
    usedO.add(option.o);
    pairs.push([option.f, option.o]);
  }
  return pairs;
}

export function matchGames(
  feed: FeedGameRef[],
  ours: OurGameRef[],
  options: { timeZone: string; now: Date; rules?: typeof RULES }
): MatchResult {
  const rules = options.rules ?? RULES;
  const now = options.now.getTime();
  const pairs: Pair[] = [];

  // ---- rule 1: same teams, same day
  const sameDay = pairClosest(feed, ours, (f, o) =>
    teamsKey(f.home, f.away) === teamsKey(o.home, o.away) &&
    dayKey(f.startsAt, options.timeZone) === dayKey(o.startsAt, options.timeZone) &&
    (o.status !== "canceled" || Date.parse(f.startsAt) === Date.parse(o.startsAt))
  );
  for (const [f, o] of sameDay) pairs.push({ feedIndex: f.index, gameId: o.id, how: "same_day" });

  const pairedFeed = new Set(pairs.map((pair) => pair.feedIndex));
  const pairedOurs = new Set(pairs.map((pair) => pair.gameId));

  // games of ours that the master calendar is expected to still list
  const stillExpected = (o: OurGameRef) =>
    o.fromMasterCalendar && o.status !== "canceled" && Date.parse(o.startsAt) > now;

  // ---- rule 2: one of our teams, same day, a different opponent
  if (rules.newOpponentSameDay) {
    const ourTeams = (f: { home: Side; away: Side }) => [f.home, f.away].filter((side) => side.startsWith("team:"));
    const fits = (f: FeedGameRef, o: OurGameRef) =>
      dayKey(f.startsAt, options.timeZone) === dayKey(o.startsAt, options.timeZone) &&
      ourTeams(f).some((side) => side === o.home || side === o.away);
    const leftFeed = feed.filter((f) => !pairedFeed.has(f.index));
    const leftOurs = ours.filter((o) => !pairedOurs.has(o.id) && stillExpected(o));
    for (const f of leftFeed) {
      const candidates = leftOurs.filter((o) => fits(f, o));
      if (candidates.length !== 1) continue;
      const o = candidates[0];
      if (leftFeed.filter((other) => fits(other, o)).length !== 1) continue;
      pairs.push({ feedIndex: f.index, gameId: o.id, how: "new_opponent" });
      pairedFeed.add(f.index);
      pairedOurs.add(o.id);
    }
  }

  // ---- rule 3: moved to another day
  if (rules.moveWindowDays > 0) {
    const leftFeed = feed.filter((f) => !pairedFeed.has(f.index));
    const leftOurs = ours.filter((o) => !pairedOurs.has(o.id) && stillExpected(o));
    const moved = pairClosest(leftFeed, leftOurs, (f, o) =>
      teamsKey(f.home, f.away) === teamsKey(o.home, o.away) &&
      Math.abs(Date.parse(f.startsAt) - Date.parse(o.startsAt)) <= rules.moveWindowDays * DAY
    );
    for (const [f, o] of moved) {
      pairs.push({ feedIndex: f.index, gameId: o.id, how: "moved" });
      pairedFeed.add(f.index);
      pairedOurs.add(o.id);
    }
  }

  // ---- rule 4: what is left
  return {
    pairs,
    newFeedIndexes: feed.filter((f) => !pairedFeed.has(f.index)).map((f) => f.index),
    notInFeed: ours.filter((o) => !pairedOurs.has(o.id) && stillExpected(o)).map((o) => o.id),
  };
}
