// Availability: when an umpire has said they CAN umpire.
//
// Each entry is a window of time. An umpire who has entered some availability
// still to come is taken to be unavailable at every other time. An umpire who
// has entered none is simply "none": we do not know, and that is not a warning.

export type Window = { starts_at: string; ends_at: string };

// "available": the whole game is inside what they entered
// "unavailable": they have entered availability, but it does not cover the game
// "none": they have entered no availability that is still to come
export type Availability = "available" | "unavailable" | "none";

// Overlapping or touching windows joined into longer ones (8am-12pm and
// 12pm-5pm together cover 9am-3pm). Windows that make no sense are ignored.
export function mergeWindows(windows: Window[]): { start: number; end: number }[] {
  const spans = windows
    .map((window) => ({ start: Date.parse(window.starts_at), end: Date.parse(window.ends_at) }))
    .filter((span) => Number.isFinite(span.start) && Number.isFinite(span.end) && span.end > span.start)
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }

  return merged;
}

export function availabilityFor(
  game: { starts_at: string; ends_at: string },
  windows: Window[],
  now: number = Date.now()
): Availability {
  // Only what is still to come counts as "entered".
  const upcoming = mergeWindows(windows).filter((span) => span.end > now);
  if (upcoming.length === 0) return "none";

  const start = Date.parse(game.starts_at);
  const end = Date.parse(game.ends_at);

  return upcoming.some((span) => span.start <= start && span.end >= end) ? "available" : "unavailable";
}

// Rows from the database, grouped by umpire.
export function groupWindows(
  rows: { umpire_id: string; starts_at: string; ends_at: string }[]
): Map<string, Window[]> {
  const map = new Map<string, Window[]>();

  for (const row of rows) {
    const list = map.get(row.umpire_id) ?? [];
    list.push({ starts_at: row.starts_at, ends_at: row.ends_at });
    map.set(row.umpire_id, list);
  }

  return map;
}

// The most an entry can last (the database enforces this too).
export const MAX_WINDOW_DAYS = 90;
