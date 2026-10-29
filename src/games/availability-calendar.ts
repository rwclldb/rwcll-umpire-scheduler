import { dateKey, mergeWindows } from "./availability";
import type { Window } from "./availability";
import { formatTime } from "./format";
import { escapeHtml } from "../ui";
import { appNow } from "../clock";

// A month calendar of what an umpire has entered: which days they can umpire
// (all day, or part of it), and which they marked as ones they cannot.

export type DayKind = "none" | "some" | "all" | "cannot";

export type DaySummary = {
  key: string;           // "2026-10-28"
  day: number;           // 28
  kind: DayKind;
  partialCannot: boolean; // some time that day is available AND some is marked unavailable
  label: string;         // what to say about the day, for hover and screen readers
  past: boolean;
};

type Span = [number, number];

const clip = (spans: { start: number; end: number }[], from: number, to: number): Span[] =>
  spans
    .map((span): Span => [Math.max(span.start, from), Math.min(span.end, to)])
    .filter(([start, end]) => end > start);

// Take the times in `holes` out of `spans`.
const subtract = (spans: Span[], holes: Span[]): Span[] => {
  let result = spans;
  for (const [holeStart, holeEnd] of holes) {
    result = result.flatMap(([start, end]): Span[] => {
      if (holeEnd <= start || holeStart >= end) return [[start, end]];
      const pieces: Span[] = [];
      if (holeStart > start) pieces.push([start, holeStart]);
      if (holeEnd < end) pieces.push([holeEnd, end]);
      return pieces;
    });
  }
  return result;
};

const total = (spans: Span[]) => spans.reduce((sum, [start, end]) => sum + (end - start), 0);
const clock = (ms: number) => formatTime(new Date(ms).toISOString());

// Every day of a month. `windows` are the times they can umpire (one-off
// entries and repeating times already turned into dates); `exceptions` are the
// times they marked as ones they cannot.
export function daySummaries(
  year: number,
  month: number,
  windows: Window[],
  exceptions: Window[],
  now: Date = appNow()
): DaySummary[] {
  const can = mergeWindows(windows);
  const cannot = mergeWindows(exceptions);
  const todayKey = dateKey(now);
  const last = new Date(year, month + 1, 0).getDate();
  const summaries: DaySummary[] = [];

  for (let day = 1; day <= last; day++) {
    const from = new Date(year, month, day).getTime();
    const to = new Date(year, month, day + 1).getTime();
    const key = dateKey(new Date(year, month, day));

    const noGo = clip(cannot, from, to);
    const free = subtract(clip(can, from, to), noGo);
    const freeMs = total(free);
    const noGoMs = total(noGo);
    const wholeDay = to - from - 60_000;

    let kind: DayKind = "none";
    let label = "Nothing entered";

    if (freeMs >= wholeDay) {
      kind = "all";
      label = "Available all day";
    } else if (freeMs > 0) {
      kind = "some";
      label = `Available ${free.map(([start, end]) => `${clock(start)} \u2013 ${clock(end)}`).join(", ")}`;
    } else if (noGoMs > 0) {
      kind = "cannot";
      label = noGoMs >= wholeDay ? "Marked unavailable all day" : "Marked unavailable for part of the day";
    }

    const partialCannot = freeMs > 0 && noGoMs > 0;
    if (partialCannot) label += " (and marked unavailable for part of the day)";

    summaries.push({ key, day, kind, partialCannot, label, past: key < todayKey });
  }

  return summaries;
}

// The month as HTML: the title with previous/next buttons, a button for each
// day (pressing one picks that date in the form), and a key.
export function monthGridHtml(year: number, month: number, summaries: DaySummary[]): string {
  const first = new Date(year, month, 1);
  const title = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const offset = first.getDay();
  const names = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const full = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return `
    <div class="cal">
      <div class="cal-head">
        <button type="button" class="secondary-button cal-nav" data-cal-nav="-1" aria-label="Previous month">&lsaquo;</button>
        <strong class="cal-title" aria-live="polite">${escapeHtml(title)}</strong>
        <button type="button" class="secondary-button cal-nav" data-cal-nav="1" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="cal-grid">
        ${names.map((name, i) => `<span class="cal-dow" title="${full[i]}">${name}</span>`).join("")}
        ${Array.from({ length: offset }, () => `<span class="cal-blank"></span>`).join("")}
        ${summaries.map((summary) => {
          const weekday = full[new Date(year, month, summary.day).getDay()];
          const text = `${weekday}, ${first.toLocaleDateString("en-US", { month: "long" })} ${summary.day}: ${summary.label}`;
          return `<button type="button" class="cal-day cal-${summary.kind}${summary.partialCannot ? " cal-partial" : ""}${summary.past ? " cal-past" : ""}" data-cal-date="${summary.key}" title="${escapeHtml(text)}" aria-label="${escapeHtml(text)}">${summary.day}</button>`;
        }).join("")}
      </div>
      <ul class="cal-key">
        <li><span class="cal-swatch cal-all"></span> Available all day</li>
        <li><span class="cal-swatch cal-some"></span> Available part of the day</li>
        <li><span class="cal-swatch cal-cannot"></span> Marked unavailable</li>
        <li><span class="cal-swatch cal-none"></span> Nothing entered</li>
      </ul>
    </div>
  `;
}
