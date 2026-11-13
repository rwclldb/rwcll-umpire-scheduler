// Reading a calendar feed (iCalendar, ".ics"): the events in it, as plain values.
//
// Sports Connect's feed looks like this for each event:
//
//   BEGIN:VEVENT
//   DESCRIPTION:Kiwanis Field > MAJ                     (the place, then the diamond)
//   DTSTART:20261113T000000Z                            (UTC)
//   DTEND:20261113T013000Z
//   LOCATION:1311 Madison Avenue\,Redwood City\,CA-94061 US
//   SUMMARY:MAJ 01 - Seely-Kirk @ MAJ 02 - Kays          (away @ home)
//   UID:20261112T21065187477723                         (NOT stable: it changes on every download)
//   END:VEVENT
//
// Nothing here knows about the league; this file only reads the format.
// No imports, so it runs the same in Supabase (Deno) and in Node (for the tests).

export type FeedEvent = {
  summary: string;
  description: string;
  location: string;
  startsAt: string | null; // ISO, UTC; null if it could not be read
  endsAt: string | null;
  allDay: boolean; // a date with no time
  cancelled: boolean; // STATUS:CANCELLED
};

// One "NAME;PARAM=x:value" line, after unfolding.
type ContentLine = { name: string; params: Record<string, string>; value: string };

// Long lines are folded: a line break followed by a space or tab continues the line.
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function parseLine(line: string): ContentLine | null {
  // the value starts after the first colon that is not inside a quoted parameter
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon <= 0) return null;

  const [name, ...paramParts] = line.slice(0, colon).split(";");
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf("=");
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, "");
  }

  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

// "\," -> ","   "\;" -> ";"   "\n" -> line break   "\\" -> "\"
export function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, char: string) => (char === "n" || char === "N" ? "\n" : char)).trim();
}

// ------------------------------------------------------------------ times

// The offset (minutes east of UTC) of a time zone at a given moment.
function zoneOffsetMinutes(utcMillis: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMillis));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - utcMillis) / 60000);
}

// A wall-clock time in a time zone, as an exact moment (ISO, UTC).
export function zonedToIso(
  y: number, m: number, d: number, h: number, min: number, s: number, timeZone: string
): string {
  const guess = Date.UTC(y, m - 1, d, h, min, s);
  // two rounds settle the offset, also next to a clock change
  let moment = guess - zoneOffsetMinutes(guess, timeZone) * 60000;
  moment = guess - zoneOffsetMinutes(moment, timeZone) * 60000;
  return new Date(moment).toISOString();
}

// DTSTART / DTEND: "20261113T000000Z" (UTC), "20261113T170000" with TZID=..., a floating
// "20261113T170000" (read in the league's time zone), or "20261113" (a whole day).
function parseDateTime(
  line: ContentLine,
  fallbackZone: string
): { iso: string | null; allDay: boolean } {
  const value = line.value.trim();

  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (date || line.params.VALUE === "DATE") return { iso: null, allDay: true };

  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match) return { iso: null, allDay: false };

  const [y, m, d, h, min, s] = match.slice(1, 7).map(Number);
  if (match[7] === "Z") return { iso: new Date(Date.UTC(y, m - 1, d, h, min, s)).toISOString(), allDay: false };

  const zone = line.params.TZID || fallbackZone;
  try {
    return { iso: zonedToIso(y, m, d, h, min, s, zone), allDay: false };
  } catch {
    // an unknown TZID: read it in the league's time zone instead
    return { iso: zonedToIso(y, m, d, h, min, s, fallbackZone), allDay: false };
  }
}

// ------------------------------------------------------------------ the feed

export function looksLikeCalendar(text: string): boolean {
  return /BEGIN:VCALENDAR/i.test(text.slice(0, 2000));
}

export function parseIcs(text: string, timeZone: string): FeedEvent[] {
  const events: FeedEvent[] = [];
  let current: ContentLine[] | null = null;
  let depth = 0; // VALARM and other blocks inside an event

  for (const raw of unfold(text)) {
    const line = parseLine(raw);
    if (!line) continue;

    if (line.name === "BEGIN") {
      if (line.value.toUpperCase() === "VEVENT" && current === null) {
        current = [];
        depth = 0;
      } else if (current !== null) {
        depth++;
      }
      continue;
    }

    if (line.name === "END") {
      if (current !== null && depth > 0) {
        depth--;
      } else if (current !== null && line.value.toUpperCase() === "VEVENT") {
        events.push(toEvent(current, timeZone));
        current = null;
      }
      continue;
    }

    if (current !== null && depth === 0) current.push(line);
  }

  return events;
}

function toEvent(lines: ContentLine[], timeZone: string): FeedEvent {
  const first = (name: string) => lines.find((line) => line.name === name);
  const text = (name: string) => {
    const line = first(name);
    return line ? unescapeText(line.value) : "";
  };

  const startLine = first("DTSTART");
  const endLine = first("DTEND");
  const start = startLine ? parseDateTime(startLine, timeZone) : { iso: null, allDay: false };
  const end = endLine ? parseDateTime(endLine, timeZone) : { iso: null, allDay: false };

  return {
    summary: text("SUMMARY"),
    description: text("DESCRIPTION"),
    location: text("LOCATION"),
    startsAt: start.iso,
    endsAt: end.iso,
    allDay: start.allDay,
    cancelled: text("STATUS").toUpperCase() === "CANCELLED",
  };
}
