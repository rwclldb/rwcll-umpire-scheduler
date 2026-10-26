// How many umpires a game needs, which of its places are still open, and who
// already has a game at the same time.
//
// A game is staffed by COUNT: it needs a certain number of umpires, and any
// umpires assigned count towards it. So if the chief decides a two-umpire game
// will be worked by one umpire, that one umpire (wherever they are listed)
// is enough.

import type { Assignment, Game } from "./types";

export type Position = "plate" | "field";

// The plate umpire is filled first, then the field umpire.
export const POSITIONS: Position[] = ["plate", "field"];

export const POSITION_LABEL: Record<Position, string> = {
  plate: "Plate",
  field: "Field",
};

// This game's own setting, or else its division's default (2 when unknown).
export function umpiresNeeded(
  game: Pick<Game, "umpires_needed" | "division_id">,
  divisionDefault: (divisionId: string) => number
): number {
  return game.umpires_needed ?? divisionDefault(game.division_id);
}

export type SlotState = "assigned" | "open" | "not_needed";

// For each position: someone is there, it is still open (a person is
// needed), or it is not needed.
export function slotStates(
  assigned: Partial<Record<Position, unknown>>,
  needed: number
): Record<Position, SlotState> {
  const count = POSITIONS.filter((position) => assigned[position]).length;
  let openLeft = Math.max(0, needed - count);

  const result = {} as Record<Position, SlotState>;
  for (const position of POSITIONS) {
    if (assigned[position]) {
      result[position] = "assigned";
    } else if (openLeft > 0) {
      result[position] = "open";
      openLeft -= 1;
    } else {
      result[position] = "not_needed";
    }
  }

  return result;
}

// The assignments of each game, by position.
export function assignmentsByGame(
  assignments: Assignment[]
): Map<string, Partial<Record<Position, string>>> {
  const map = new Map<string, Partial<Record<Position, string>>>();

  for (const row of assignments) {
    const entry = map.get(row.game_id) ?? {};
    entry[row.position] = row.umpire_id;
    map.set(row.game_id, entry);
  }

  return map;
}

// Two games overlap when each starts before the other ends. Back to back is fine.
function overlap(a: Pick<Game, "starts_at" | "ends_at">, b: Pick<Game, "starts_at" | "ends_at">): boolean {
  return (
    Date.parse(a.starts_at) < Date.parse(b.ends_at) &&
    Date.parse(b.starts_at) < Date.parse(a.ends_at)
  );
}

// The OTHER games this umpire is already assigned to at the same time as this
// one. Canceled games do not count.
export function clashingGames(
  umpireId: string,
  game: Game,
  games: Game[],
  assignments: Assignment[]
): Game[] {
  const mine = new Set(
    assignments.filter((row) => row.umpire_id === umpireId).map((row) => row.game_id)
  );

  return games.filter(
    (other) =>
      other.id !== game.id &&
      mine.has(other.id) &&
      other.status !== "canceled" &&
      overlap(game, other)
  );
}

// How many games this umpire is assigned to in these games (canceled ones are not counted).
export function workload(umpireId: string, games: Game[], assignments: Assignment[]): number {
  const live = new Set(games.filter((game) => game.status !== "canceled").map((game) => game.id));
  return assignments.filter((row) => row.umpire_id === umpireId && live.has(row.game_id)).length;
}
