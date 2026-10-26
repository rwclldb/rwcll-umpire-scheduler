// How many umpires a game needs, which of its places are still open, and who
// already has a game at the same time.
//
// A game is staffed by COUNT: it needs a certain number of umpires (0 to 4),
// and any umpires assigned count towards it. So if the chief decides a
// two-umpire game will be worked by one umpire, that one umpire (wherever they
// are listed) is enough.

import type { Assignment, DivisionOption, Game, Position } from "./types";

export type { Position };

// The order the places are listed in.
export const POSITIONS: Position[] = ["plate", "first_base", "second_base", "third_base", "field"];

// Short names for lists and printouts, and full names for sentences.
export const POSITION_LABEL: Record<Position, string> = {
  plate: "Plate",
  first_base: "1B",
  second_base: "2B",
  third_base: "3B",
  field: "Field",
};

export const POSITION_NAME: Record<Position, string> = {
  plate: "Plate",
  first_base: "First base",
  second_base: "Second base",
  third_base: "Third base",
  field: "Field",
};

export const MAX_UMPIRES = 4;

// The places a game of each size uses.
const LAYOUT: Record<number, Position[]> = {
  0: [],
  1: ["plate"],
  2: ["plate", "field"],
  3: ["plate", "first_base", "third_base"],
  4: ["plate", "first_base", "second_base", "third_base"],
};

export function layoutFor(needed: number): Position[] {
  return LAYOUT[Math.max(0, Math.min(MAX_UMPIRES, Math.trunc(needed) || 0))];
}

// "2 umpires (plate, field)"
export function needLabel(needed: number): string {
  if (needed === 0) return "No umpire needed";
  const places = layoutFor(needed).map((position) => POSITION_LABEL[position]).join(", ");
  return `${needed} ${needed === 1 ? "umpire" : "umpires"} (${places})`;
}

// "No umpire", "1 umpire", "3 umpires"
export function countLabel(needed: number): string {
  return needed === 0 ? "No umpire needed" : `${needed} ${needed === 1 ? "umpire" : "umpires"}`;
}

// The division's number for this kind of game: tournament games use the
// division's tournament number when it has one.
export function divisionNeed(
  division: Pick<DivisionOption, "umpires_per_game" | "tournament_umpires"> | undefined,
  gameType: string | undefined
): number {
  if (!division) return 2;
  if (gameType === "tournament" && division.tournament_umpires !== null && division.tournament_umpires !== undefined) {
    return division.tournament_umpires;
  }
  return division.umpires_per_game ?? 2;
}

// This game's own setting, or else its division's default (2 when unknown).
export function umpiresNeeded(
  game: Pick<Game, "umpires_needed" | "division_id"> & { game_type?: string },
  divisionDefault: (divisionId: string, gameType?: string) => number
): number {
  return game.umpires_needed ?? divisionDefault(game.division_id, game.game_type);
}

export type SlotState = "assigned" | "open" | "not_needed";

// For each position: someone is there, it is still open (a person is
// needed), or it is not needed. Open places are taken from the game's layout,
// in order, as many as are still missing.
export function slotStates(
  assigned: Partial<Record<Position, unknown>>,
  needed: number
): Record<Position, SlotState> {
  const count = POSITIONS.filter((position) => assigned[position]).length;
  let openLeft = Math.max(0, needed - count);

  const result = {} as Record<Position, SlotState>;
  for (const position of POSITIONS) {
    result[position] = assigned[position] ? "assigned" : "not_needed";
  }

  for (const position of layoutFor(needed)) {
    if (!assigned[position] && openLeft > 0) {
      result[position] = "open";
      openLeft -= 1;
    }
  }

  return result;
}

// The places still waiting for someone, in order.
export function openPlaces(assigned: Partial<Record<Position, unknown>>, needed: number): Position[] {
  const states = slotStates(assigned, needed);
  return POSITIONS.filter((position) => states[position] === "open");
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
