import type { Game } from "./types";
import { formatTime, startOfToday } from "./format";
import { openPlaces } from "./staffing";
import type { Position } from "./staffing";

export type Warning = {
  kind: "no_umpire" | "short_staffed" | "unconfirmed" | "unavailable" | "field_conflict" | "team_conflict";
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
  // How many umpires each game needs. Without it every game is taken to need
  // one, so only a game with nobody at all is flagged.
  neededFor?: (game: Game) => number;
  // Which positions are filled, so a short-staffed game can say which is missing.
  assignedPositions?: Map<string, Partial<Record<Position, string>>>;
  // For the "still not confirmed" warning: the names of the umpires on each
  // game who have not confirmed yet, and how many days ahead of a game to warn
  // (0 or missing: never).
  unconfirmedNames?: Map<string, string[]>;
  unconfirmedDaysFor?: (game: Game) => number;
  // For the "not available" warning: the names of umpires on each game who
  // entered availability that does not cover it.
  unavailableNames?: Map<string, string[]>;
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
//  - no umpire: a game that needs umpires, still to be played (today or
//    later), with nobody assigned
//  - short staffed: some umpires are assigned, but fewer than the game needs
//  - unavailable: a game still to come with an umpire who has entered
//    availability that does not cover the game (never for an umpire who has
//    entered none)
//  - unconfirmed: a game coming up within its league's warning period still has
//    umpires who have not confirmed (any other warning stays too)
//  - field conflict: another game at the same field at an overlapping time
//  - team conflict: a team is in another game at an overlapping time
// Two games overlap when each starts before the other ends, so a game that
// starts exactly when another ends is fine (back to back).
// Canceled games never cause or receive conflicts. A completed game can cause
// a conflict warning on a game still to be played, but never receives one.
const PHRASE: Record<Position, string> = {
  plate: "plate",
  first_base: "first base",
  second_base: "second base",
  third_base: "third base",
  field: "field",
};

export function computeWarnings(input: WarningInput): Map<string, Warning[]> {
  const result = new Map<string, Warning[]>();
  const todayStart = startOfToday(input.now).getTime();

  const timed: Timed[] = input.games.map((game) => ({
    game,
    start: Date.parse(game.starts_at),
    end: Date.parse(game.ends_at),
  }));

  // ---- no umpire assigned, or not enough
  for (const { game, start } of timed) {
    if (!needsAttention(game) || start < todayStart) continue;

    const needed = input.neededFor ? input.neededFor(game) : 1;
    const count = input.assignedCount.get(game.id) ?? 0;

    if (needed >= 1 && count === 0) {
      result.set(game.id, [{ kind: "no_umpire", text: "No umpire assigned" }]);
    } else if (count > 0 && count < needed) {
      const positions = input.assignedPositions?.get(game.id);
      const open = positions ? openPlaces(positions, needed) : [];
      const missing = needed - count;
      result.set(game.id, [{
        kind: "short_staffed",
        text:
          open.length === 1 ? `Needs a ${PHRASE[open[0]]} umpire`
          : positions ? `Needs ${missing} more umpires`
          : "Needs another umpire",
      }]);
    }
  }

  // ---- assignments still waiting for the umpire to confirm, shortly before the game
  if (input.unconfirmedNames && input.unconfirmedDaysFor) {
    const nowMs = input.now.getTime();

    for (const { game, start } of timed) {
      if (!needsAttention(game) || start <= nowMs) continue;

      const days = input.unconfirmedDaysFor(game);
      if (!(days > 0) || start - nowMs > days * 86_400_000) continue;

      const names = input.unconfirmedNames.get(game.id) ?? [];
      if (names.length === 0) continue;

      const shown = names.slice(0, 3).join(", ");
      const more = names.length > 3 ? ` and ${names.length - 3} more` : "";
      const list = result.get(game.id) ?? [];
      list.push({ kind: "unconfirmed", text: `Not confirmed yet: ${shown}${more}` });
      result.set(game.id, list);
    }
  }

  // ---- umpires on the game who have said they can umpire, but not then
  if (input.unavailableNames) {
    const nowMs = input.now.getTime();

    for (const { game, start } of timed) {
      if (!needsAttention(game) || start <= nowMs) continue;

      const names = input.unavailableNames.get(game.id) ?? [];
      if (names.length === 0) continue;

      const shown = names.slice(0, 3).join(", ");
      const more = names.length > 3 ? ` and ${names.length - 3} more` : "";
      const list = result.get(game.id) ?? [];
      list.push({ kind: "unavailable", text: `Not available: ${shown}${more}` });
      result.set(game.id, list);
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
