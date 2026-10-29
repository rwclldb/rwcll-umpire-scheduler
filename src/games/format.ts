import { appNow } from "../clock";
// Date and time helpers for the Games screens.
// Games are stored as exact moments (UTC) and shown in the time zone of the
// computer that is looking at them.

const two = (value: number) => String(value).padStart(2, "0");

// "2026-04-18T10:00" in the computer's time zone, for a datetime-local box.
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  return (
    `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}` +
    `T${two(date.getHours())}:${two(date.getMinutes())}`
  );
}

// The exact moment (ISO, UTC) for a datetime-local box value, or null if the
// box is empty or not a valid date and time.
export function fromLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;

  const date = new Date(value); // read as local time
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

export function durationMinutes(startIso: string, endIso: string): number {
  return Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000
  );
}

// Created once and reused: making a new formatter for every call is slow.
const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

// "Sat, Apr 18", or "Sat, Apr 18, 2027" when the year is not the current one
// (or the one given), so ordinary dates stay short.
export function formatDate(
  iso: string,
  referenceYear: number = appNow().getFullYear()
): string {
  const date = new Date(iso);
  const text = dateFormat.format(date);
  return date.getFullYear() === referenceYear
    ? text.replace(/,\s*\d{4}$/, "")
    : text;
}

// "10:00 AM". Some browsers put a narrow no-break space before AM/PM; it is
// replaced with a normal space so the text is the same everywhere.
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso)).replace(/\u202f/g, " ");
}

// "2026-04-18" for the day the game is on, in the computer's time zone.
export function localDateKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

// Midnight at the start of today, in the computer's time zone.
export function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const longDateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

// "Saturday, October 4, 2026"
export function formatLongDate(iso: string): string {
  return longDateFormat.format(new Date(iso));
}

const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long" });

// "Saturday"
export function weekdayName(iso: string): string {
  return weekdayFormat.format(new Date(iso));
}

// "9:00 AM - 11:00 AM"
export function timeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} \u2013 ${formatTime(endIso)}`;
}

// (The pieces are named one by one: a time zone name cannot be combined with
// the ready-made "dateStyle" and "timeStyle" options.)
const printedFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

// "Oct 25, 2026, 9:41 AM PDT": when something was printed, with the time zone
export function formatPrinted(now: Date): string {
  return printedFormat.format(now).replace(/\u202f/g, " ");
}
