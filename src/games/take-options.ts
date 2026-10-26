// Which places of each game an umpire could take (kept apart from the screen
// so it can be tested on its own).
import { POSITIONS } from "./staffing";
import type { Position } from "./types";

export type TakeOption = { game_id: string; place: string };

// The open places of each game, in the order the places are normally filled
// (plate first), each game once, in the order the games first appear.
export function groupOptions(options: TakeOption[]): Map<string, Position[]> {
  const grouped = new Map<string, Set<string>>();

  for (const option of options) {
    const places = grouped.get(option.game_id) ?? new Set<string>();
    places.add(option.place);
    grouped.set(option.game_id, places);
  }

  const result = new Map<string, Position[]>();
  for (const [gameId, places] of grouped) {
    result.set(gameId, POSITIONS.filter((position) => places.has(position)));
  }

  return result;
}
