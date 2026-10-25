// Reading the master calendar spreadsheet: finding its columns, and turning
// its text into dates and times.

export type FieldKey =
  | "externalId"
  | "event"
  | "group"
  | "home"
  | "away"
  | "date"
  | "start"
  | "end"
  | "field"
  | "location"
  | "status";

export type ColumnMap = Record<FieldKey, number | null>;

export const FIELD_LABELS: Record<FieldKey, string> = {
  externalId: "Game ID",
  event: "Event type (and division)",
  group: "Group (used if there is no event type)",
  home: "Home team",
  away: "Away team",
  date: "Date",
  start: "Start time",
  end: "End time",
  field: "Field",
  location: "Location",
  status: "Status",
};

// These must be found for the import to work. Field or Location: at least one.
export const REQUIRED_FIELDS: FieldKey[] = [
  "externalId",
  "home",
  "away",
  "date",
  "start",
  "end",
];

// The order matters: each column is given to only one purpose.
const ALIASES: [FieldKey, string[]][] = [
  ["externalId", ["matchid", "gameid", "eventid", "matchnumber", "gamenumber", "id"]],
  ["date", ["date", "gamedate", "matchdate"]],
  ["start", ["starttime", "start", "begintime"]],
  ["end", ["endtime", "end", "finishtime"]],
  ["home", ["hometeam", "home"]],
  ["away", ["awayteam", "away", "visitingteam", "visitor"]],
  ["event", ["eventname", "event", "eventtype", "type"]],
  ["group", ["groupname", "group", "divisionname", "division"]],
  ["field", ["field", "diamond"]],
  ["location", ["location", "venue", "facility", "park", "site", "complex"]],
  ["status", ["scheduledstatus", "matchstatus", "status"]],
];

export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Works out which column holds what, from the headings.
export function detectColumns(headers: string[]): ColumnMap {
  const result: ColumnMap = {
    externalId: null, event: null, group: null, home: null, away: null,
    date: null, start: null, end: null, field: null, location: null, status: null,
  };

  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();

  for (const [key, aliases] of ALIASES) {
    for (const alias of aliases) {
      const index = normalized.findIndex((h, i) => h === alias && !used.has(i));
      if (index !== -1) {
        result[key] = index;
        used.add(index);
        break;
      }
    }
  }

  return result;
}

// Which required things are still missing a column.
export function missingColumns(columns: ColumnMap): FieldKey[] {
  const missing = REQUIRED_FIELDS.filter((key) => columns[key] === null);
  if (columns.field === null && columns.location === null) missing.push("location");
  return missing;
}

export type CalendarRow = {
  line: number; // the line number in the file, counting the heading as line 1
  externalId: string;
  event: string;
  group: string;
  home: string;
  away: string;
  date: string;
  start: string;
  end: string;
  field: string;
  location: string;
  status: string;
};

// The table's first row is the headings. Every other row becomes a CalendarRow.
export function readRows(table: string[][], columns: ColumnMap): CalendarRow[] {
  const cell = (row: string[], key: FieldKey): string => {
    const index = columns[key];
    return index === null ? "" : (row[index] ?? "").trim();
  };

  return table.slice(1).map((row, i) => ({
    line: i + 2,
    externalId: cell(row, "externalId"),
    event: cell(row, "event"),
    group: cell(row, "group"),
    home: cell(row, "home"),
    away: cell(row, "away"),
    date: cell(row, "date"),
    start: cell(row, "start"),
    end: cell(row, "end"),
    field: cell(row, "field"),
    location: cell(row, "location"),
    status: cell(row, "status"),
  }));
}

// A practice is listed with the word "Practice" where the opponent would be.
export function isPracticeRow(row: CalendarRow): boolean {
  return row.away.trim().toLowerCase() === "practice";
}

// The text that says which division a row belongs to.
export function divisionLabel(row: CalendarRow): string {
  return row.event || row.group;
}

// ------------------------------------------------------------ dates and times

export type DateParts = { y: number; m: number; d: number };
export type TimeParts = { h: number; m: number };

// "10/04/2026", "10/4/26" (month first, as in the US) or "2026-10-04".
export function parseDate(text: string): DateParts | null {
  const value = text.trim();

  let match = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/.exec(value);
  if (match) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    return validDate(year, Number(match[1]), Number(match[2]));
  }

  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) return validDate(Number(match[1]), Number(match[2]), Number(match[3]));

  return null;
}

function validDate(y: number, m: number, d: number): DateParts | null {
  const check = new Date(y, m - 1, d);
  return check.getFullYear() === y && check.getMonth() === m - 1 && check.getDate() === d
    ? { y, m, d }
    : null;
}

// "9:00 AM", "9:00am", "9 AM", "13:30" or "09:00".
export function parseTime(text: string): TimeParts | null {
  const value = text.trim();

  let match = /^(\d{1,2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]?\.?$/.exec(value);
  if (match) {
    const hour = Number(match[1]);
    const minute = match[2] === undefined ? 0 : Number(match[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    const pm = match[3].toLowerCase() === "p";
    return { h: (hour % 12) + (pm ? 12 : 0), m: minute };
  }

  match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour <= 23 && minute <= 59 ? { h: hour, m: minute } : null;
  }

  return null;
}

// The exact moment (ISO, UTC) for a date and time on this computer's clock, or
// null if that moment does not exist (for example during the spring clock change).
export function toIso(date: DateParts, time: TimeParts): string | null {
  const moment = new Date(date.y, date.m - 1, date.d, time.h, time.m);

  return moment.getFullYear() === date.y &&
    moment.getMonth() === date.m - 1 &&
    moment.getDate() === date.d &&
    moment.getHours() === time.h &&
    moment.getMinutes() === time.m
    ? moment.toISOString()
    : null;
}
