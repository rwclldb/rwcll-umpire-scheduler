// Availability: when an umpire has said they CAN umpire (and when they cannot).
//
// Each entry is a window of time. Repeating times ("every Monday to Friday, 5 to
// 9 PM, until the end of the season") are turned into windows too. An umpire who
// has entered some availability still to come is taken to be unavailable at every
// other time. An umpire who has entered none is simply "none": we do not know,
// and that is not a warning. A time the umpire marked "I can't" beats everything.

export type Window = { starts_at: string; ends_at: string };

// What an umpire has entered, as plain windows: the times they can umpire
// (one-off entries and repeating times, already turned into dates) and the times
// they marked as ones they cannot.
export type UmpireAvailability = { windows: Window[]; exceptions: Window[] };

export const NO_AVAILABILITY: UmpireAvailability = { windows: [], exceptions: [] };

// "available": the whole game is inside what they entered
// "unavailable": they have entered availability, but it does not cover the game
// "none": they have entered no availability that is still to come
// "cannot": they marked a time that overlaps the game as one they cannot umpire
export type Availability = "available" | "unavailable" | "none" | "cannot";

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
  entry: UmpireAvailability | Window[] | undefined,
  now: number = Date.now()
): Availability {
  const { windows, exceptions } = Array.isArray(entry)
    ? { windows: entry, exceptions: [] as Window[] }
    : entry ?? NO_AVAILABILITY;

  const start = Date.parse(game.starts_at);
  const end = Date.parse(game.ends_at);

  // A time they marked "I can't" wins over everything, even with nothing else entered.
  if (exceptions.some((span) => Date.parse(span.starts_at) < end && Date.parse(span.ends_at) > start)) {
    return "cannot";
  }

  // Only what is still to come counts as "entered".
  const upcoming = mergeWindows(windows).filter((span) => span.end > now);
  if (upcoming.length === 0) return "none";

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


// ------------------------------------------------------------ repeating times

// One repeating time, as stored. weekdays: 0 = Sunday to 6 = Saturday.
// start_time and end_time are clock times like "17:00" or "17:00:00".
// starts_on is a date like "2026-10-28". It ends on its season's end date.
export type PatternRow = {
  id: string;
  umpire_id: string;
  season_id: string;
  weekdays: number[];
  start_time: string;
  end_time: string;
  starts_on: string;
  notes: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

// "2026-10-28" for a date, in the computer's time zone.
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// A date like "2026-10-28" as midnight that day in the computer's time zone.
export function parseDateKey(key: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key ?? "");
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseClock(value: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null;
}

// A repeating time written as plain windows, one for each matching day from
// today (or its start date, if later) to the end of its season, and never more
// than maxDays ahead. A pattern whose season has no end date gives nothing.
// "All day" is stored as 00:00 to 23:59 and runs to midnight.
export function expandPattern(
  pattern: PatternRow,
  seasonEndsOn: string | null | undefined,
  today: Date = new Date(),
  maxDays = 366
): Window[] {
  const seasonEnd = parseDateKey(seasonEndsOn);
  const startsOn = parseDateKey(pattern.starts_on);
  const from = parseClock(pattern.start_time);
  const to = parseClock(pattern.end_time);
  if (!seasonEnd || !startsOn || !from || !to) return [];

  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const cap = new Date(first.getFullYear(), first.getMonth(), first.getDate() + maxDays);
  const last = seasonEnd < cap ? seasonEnd : cap;
  const allDay = from.h === 0 && from.m === 0 && to.h === 23 && to.m === 59;
  const days = new Set(pattern.weekdays);
  const windows: Window[] = [];

  for (
    let day = startsOn > first ? new Date(startsOn) : first;
    day <= last;
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  ) {
    if (!days.has(day.getDay())) continue;

    const y = day.getFullYear();
    const m = day.getMonth();
    const d = day.getDate();

    windows.push({
      starts_at: new Date(y, m, d, from.h, from.m).toISOString(),
      ends_at: (allDay ? new Date(y, m, d + 1) : new Date(y, m, d, to.h, to.m)).toISOString(),
    });
  }

  return windows;
}

export function expandPatterns(
  patterns: PatternRow[],
  seasonEnds: Map<string, string | null>,
  today: Date = new Date()
): Window[] {
  return patterns.flatMap((pattern) => expandPattern(pattern, seasonEnds.get(pattern.season_id), today));
}

// Everything every umpire entered, by umpire: the one-off entries (and the
// "I can't" ones) together with their repeating times turned into dates.
export function groupAvailability(
  rows: { umpire_id: string; starts_at: string; ends_at: string; kind?: string }[],
  patterns: PatternRow[],
  seasonEnds: Map<string, string | null>,
  today: Date = new Date()
): Map<string, UmpireAvailability> {
  const map = new Map<string, UmpireAvailability>();
  const entryFor = (umpireId: string) => {
    let entry = map.get(umpireId);
    if (!entry) {
      entry = { windows: [], exceptions: [] };
      map.set(umpireId, entry);
    }
    return entry;
  };

  for (const row of rows) {
    const window = { starts_at: row.starts_at, ends_at: row.ends_at };
    (row.kind === "unavailable" ? entryFor(row.umpire_id).exceptions : entryFor(row.umpire_id).windows).push(window);
  }

  for (const pattern of patterns) {
    entryFor(pattern.umpire_id).windows.push(
      ...expandPattern(pattern, seasonEnds.get(pattern.season_id), today)
    );
  }

  return map;
}

// ------------------------------------------------------- saying it in words

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "Every day", "Every Mon\u2013Fri", "Every Sat, Sun", "Every Mon, Wed, Fri".
// Weeks run Monday to Sunday here; three or more days in a row become a range.
export function describeDays(weekdays: number[]): string {
  const have = new Set(weekdays);
  if ([0, 1, 2, 3, 4, 5, 6].every((day) => have.has(day))) return "Every day";

  const order = [1, 2, 3, 4, 5, 6, 0];
  const parts: string[] = [];
  let i = 0;

  while (i < order.length) {
    if (!have.has(order[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < order.length && have.has(order[j + 1])) j++;

    if (j - i + 1 >= 3) {
      parts.push(`${DAY_NAMES[order[i]]}\u2013${DAY_NAMES[order[j]]}`);
    } else {
      for (let k = i; k <= j; k++) parts.push(DAY_NAMES[order[k]]);
    }
    i = j + 1;
  }

  return `Every ${parts.join(", ")}`;
}

// "5:00 PM" for "17:00" or "17:00:00".
export function clockText(value: string): string {
  const time = parseClock(value);
  if (!time) return value;

  const hour = time.h % 12 === 0 ? 12 : time.h % 12;
  return `${hour}:${pad(time.m)} ${time.h < 12 ? "AM" : "PM"}`;
}

// "Jun 30", or "Jun 30, 2027" when it is not this year.
export function shortDate(key: string, today: Date = new Date()): string {
  const date = parseDateKey(key);
  if (!date) return key;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
  });
}

// "Every Mon\u2013Fri, 5:00 PM \u2013 9:00 PM, until Jun 30 (end of Spring 2027)"
// ("from Nov 2" is added when it has not started yet).
export function describePattern(
  pattern: PatternRow,
  season: { name: string; ends_on: string | null } | undefined,
  today: Date = new Date()
): string {
  const allDay = /^00:00/.test(pattern.start_time) && /^23:59/.test(pattern.end_time);
  const times = allDay ? "all day" : `${clockText(pattern.start_time)} \u2013 ${clockText(pattern.end_time)}`;
  const starts = parseDateKey(pattern.starts_on);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const from = starts && starts > todayMidnight ? `, from ${shortDate(pattern.starts_on, today)}` : "";
  const until = season?.ends_on
    ? ` until ${shortDate(season.ends_on, today)} (end of ${season.name})`
    : "";

  return `${describeDays(pattern.weekdays)}, ${times}${from},${until}`.replace(/,$/, "");
}
