import type { Game } from "./types";
import { formatTime, startOfToday } from "./format";

export type Warning = {
  kind: "no_umpire" | "field_conflict" | "team_conflict";
  text: string;
};

export type WarningInput = {
  games: Game[];
  // number of umpires assigned to each game id (missing means none)
  assignedCount: Map<string, number>;
  now: Date;
  teamName: (teamId: string) => string;
  fieldName: (locationId: string) => string;
  // short description of a game's two sides, for example "Eagles vs Hawks"
  sidesText: (game: Game) => string;
};

// A game with its start and end as plain numbers, worked out once.
type Timed = { game: Game; start: number; end: number };

// Only this many conflicts are described per game and kind; the rest are
// counted ("...and 4 more"), so a badly overlapping schedule stays readable
// and fast.
const MAX_DETAIL = 3;

// Games that still need action: they are not canceled and not completed.
function needsAttention(game: Game): boolean {
  return game.status === "draft" || game.status === "scheduled";
}

type Found = { count: number; lines: string[] };

// Warnings for each game, by game id. These are WARNINGS, never blocks:
//  - no umpire: a game still to be played (today or later) with nobody assigned
//  - field conflict: another game at the same field at an overlapping time
//  - team conflict: a team is in another game at an overlapping time
// Two games overlap when each starts before the other ends, so a game that
// starts exactly when another ends is fine (back to back).
// Canceled games never cause or receive conflicts. A completed game can cause
// a conflict warning on a game still to be played, but never receives one.
export function computeWarnings(input: WarningInput): Map<string, Warning[]> {
  const result = new Map<string, Warning[]>();
  const todayStart = startOfToday(input.now).getTime();

  const timed: Timed[] = input.games.map((game) => ({
    game,
    start: Date.parse(game.starts_at),
    end: Date.parse(game.ends_at),
  }));

  // ---- no umpire assigned
  for (const { game, start } of timed) {
    if (
      needsAttention(game) &&
      start >= todayStart &&
      (input.assignedCount.get(game.id) ?? 0) === 0
    ) {
      result.set(game.id, [{ kind: "no_umpire", text: "No umpire assigned" }]);
    }
  }

  const live = timed.filter((item) => item.game.status !== "canceled");

  const timeText = new Map<string, string>();
  const describe = (game: Game) => {
    let time = timeText.get(game.id);
    if (time === undefined) {
      time = formatTime(game.starts_at);
      timeText.set(game.id, time);
    }
    return `${input.sidesText(game)} at ${time}`;
  };

  const fieldFound = new Map<string, Found>();
  const teamFound = new Map<string, Found>();

  // The line is only built if there is still room to show it.
  const note = (
    found: Map<string, Found>,
    gameId: string,
    line: () => string
  ) => {
    const entry = found.get(gameId) ?? { count: 0, lines: [] };
    entry.count += 1;
    if (entry.lines.length < MAX_DETAIL) entry.lines.push(line());
    found.set(gameId, entry);
  };

  // Every pair in a group that overlaps, once, in time order.
  const sweep = (
    group: Timed[],
    report: (earlier: Timed, later: Timed) => void
  ) => {
    const sorted = [...group].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        if (sorted[j].start >= sorted[i].end) break; // later games start after this one ends
        report(sorted[i], sorted[j]);
      }
    }
  };

  // ---- field conflicts
  const byField = new Map<string, Timed[]>();
  for (const item of live) {
    const list = byField.get(item.game.location_id) ?? [];
    list.push(item);
    byField.set(item.game.location_id, list);
  }

  for (const group of byField.values()) {
    sweep(group, (earlier, later) => {
      const field = input.fieldName(earlier.game.location_id);
      if (needsAttention(earlier.game)) {
        note(fieldFound, earlier.game.id, () =>
          `${field} is also used by ${describe(later.game)}`);
      }
      if (needsAttention(later.game)) {
        note(fieldFound, later.game.id, () =>
          `${field} is also used by ${describe(earlier.game)}`);
      }
    });
  }

  // ---- team conflicts
  const byTeam = new Map<string, Timed[]>();
  for (const item of live) {
    for (const teamId of [item.game.home_team_id, item.game.away_team_id]) {
      if (!teamId) continue;
      const list = byTeam.get(teamId) ?? [];
      list.push(item);
      byTeam.set(teamId, list);
    }
  }

  for (const [teamId, group] of byTeam) {
    sweep(group, (earlier, later) => {
      const team = input.teamName(teamId);
      if (needsAttention(earlier.game)) {
        note(teamFound, earlier.game.id, () =>
          `${team} also plays ${describe(later.game)}`);
      }
      if (needsAttention(later.game)) {
        note(teamFound, later.game.id, () =>
          `${team} also plays ${describe(earlier.game)}`);
      }
    });
  }

  // ---- collect, with a "...and N more" line when a game has many
  const finish = (
    found: Map<string, Found>,
    kind: "field_conflict" | "team_conflict",
    noun: string
  ) => {
    for (const [gameId, entry] of found) {
      const list = result.get(gameId) ?? [];
      for (const text of entry.lines) list.push({ kind, text });
      if (entry.count > entry.lines.length) {
        const more = entry.count - entry.lines.length;
        list.push({ kind, text: `...and ${more} more ${noun} conflict${more === 1 ? "" : "s"}` });
      }
      result.set(gameId, list);
    }
  };

  finish(fieldFound, "field_conflict", "field");
  finish(teamFound, "team_conflict", "team");

  return result;
}
