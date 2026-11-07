import { escapeHtml } from "../ui";
import { formatTime } from "./format";
import type { BoardField, BoardGame, DayBoard } from "./board-model";
import type { FieldClosure } from "./types";

// Rainouts: close a field for a day (or part of it), which cancels its games,
// notes why on each, and tells the umpires. Reopening puts them back.
// (This file works out what would happen and writes the panel; board.ts makes
// the buttons work, and the database does the real work.)

export const CLOSE_REASONS = ["Rain", "Wet field", "Unsafe conditions", "Other"] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The games a closing would cancel: games not yet played or canceled that start
// within the time. (The database uses exactly the same rule.)
export function gamesToCancel(field: BoardField, fromMs: number, toMs: number): BoardGame[] {
  return field.games.filter((game) => {
    const start = Date.parse(game.startsAt);
    return (game.status === "draft" || game.status === "scheduled") && start >= fromMs && start < toMs;
  });
}

// The closing's start and end: the day, from an optional time to an optional
// time (blank means the start or the end of the day). null if it makes no sense.
export function closureWindow(dayKey: string, fromTime: string, toTime: string): { from: Date; to: Date } | null {
  const from = new Date(`${dayKey}T${fromTime || "00:00"}:00`);
  const to = toTime ? new Date(`${dayKey}T${toTime}:00`) : new Date(`${dayKey}T00:00:00`);
  if (!toTime) to.setDate(to.getDate() + 1);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to.getTime() <= from.getTime()) return null;
  return { from, to };
}

export function umpireIdsOn(games: BoardGame[]): string[] {
  return [...new Set(games.flatMap((game) => game.slots.map((slot) => slot.umpireId)).filter((id): id is string => Boolean(id)))];
}

export function closurePreview(games: BoardGame[]): string {
  if (games.length === 0) return "No games would be canceled in that time.";

  const times = games.map((game) => formatTime(game.startsAt)).join(", ");
  const umpires = umpireIdsOn(games).length;
  return `This will cancel ${plural(games.length, "game", "games")} (${times}) and tell ${plural(umpires, "umpire", "umpires")}.`;
}

// The reason as saved: the choice, with any details ("Rain: the infield is flooded").
export function reasonText(choice: string, details: string): string {
  const extra = details.trim();
  if (choice === "Other" || choice === "") return extra;
  return extra ? `${choice}: ${extra}` : choice;
}

function closureWhen(closure: FieldClosure): string {
  const hours = (Date.parse(closure.closes_to) - Date.parse(closure.closes_from)) / 3600_000;
  if (hours >= 23) return "all day";

  // one that runs to the end of the day (midnight) reads "from 11:00 AM on"
  const end = new Date(closure.closes_to);
  if (end.getHours() === 0 && end.getMinutes() === 0) return `from ${formatTime(closure.closes_from)} on`;

  return `${formatTime(closure.closes_from)} to ${formatTime(closure.closes_to)}`;
}

// Two small icons (drawn here so they look the same everywhere; the words always say the same thing).
const ICON_ATTRS = `class="closure-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"`;
const ICON_RAIN = `<svg ${ICON_ATTRS}><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`;
const ICON_CLOSED = `<svg ${ICON_ATTRS}><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

export function closurePanelHtml(board: DayBoard, closures: FieldClosure[]): string {
  const fields = board.fields
    .map((field) => ({ field, count: gamesToCancel(field, -Infinity, Infinity).length }))
    .filter((item) => item.count > 0);

  const fieldName = (id: string) => board.fields.find((field) => field.locationId === id)?.name ?? "A field";

  const item = (closure: FieldClosure) => `
          <li class="closure-item${closure.reopened_at ? " closure-reopened" : ""}">
            <span><strong>${escapeHtml(fieldName(closure.location_id))}</strong>, ${escapeHtml(closureWhen(closure))}:
              ${escapeHtml(closure.reason)}
              (${escapeHtml(plural(closure.games, "game", "games"))} canceled by ${escapeHtml(closure.created_by_name)})
              ${closure.reopened_at ? `<em>Reopened by ${escapeHtml(closure.reopened_by_name ?? "an administrator")}.</em>` : ""}</span>
            ${closure.reopened_at ? "" : `<button type="button" class="secondary-button" data-reopen="${escapeHtml(closure.id)}">Reopen</button>`}
          </li>`;

  const active = closures.filter((closure) => !closure.reopened_at);
  const reopened = closures.filter((closure) => closure.reopened_at);

  // Whenever a field is closed this is shown ABOVE the rainout section, so it cannot be hidden by closing that section.
  const banner = active.length === 0
    ? ""
    : `
    <section class="closure-banner" aria-labelledby="closure-banner-title">
      <h3 id="closure-banner-title">${ICON_CLOSED}<span>Closed today</span></h3>
      <ul class="closure-list">${active.map(item).join("")}
      </ul>
    </section>`;

  return `${banner}
    <details class="board-closure" id="board-closure-box">
      <summary>${ICON_RAIN}<span>Rainout: close a field</span></summary>
      ${fields.length === 0
        ? `<p class="closure-none">There are no games left to cancel on this day.</p>`
        : `
        <form id="closure-form" class="closure-form">
          <label>Field
            <select id="closure-field">
              ${fields.map(({ field, count }) => `<option value="${escapeHtml(field.locationId)}">${escapeHtml(field.name)} (${escapeHtml(plural(count, "game", "games"))})</option>`).join("")}
            </select>
          </label>
          <label>From <input id="closure-from" type="time" /></label>
          <label>To <input id="closure-to" type="time" /></label>
          <p class="closure-help">Leave the times blank to close the field for the whole day.</p>
          <label>Reason
            <select id="closure-reason">
              ${CLOSE_REASONS.map((reason) => `<option>${escapeHtml(reason)}</option>`).join("")}
            </select>
          </label>
          <label>Details <input id="closure-details" maxlength="150" placeholder="optional (required for Other)" /></label>
          <p id="closure-preview" class="closure-preview" role="status" aria-live="polite"></p>
          <button type="submit" class="primary-button">Cancel these games</button>
        </form>`}
      ${active.length === 0 ? `<p class="closure-today-none">No fields are closed today.</p>` : ""}
      ${reopened.length === 0
        ? ""
        : `
      <h3 class="closure-list-title">Reopened today</h3>
      <ul class="closure-list">${reopened.map(item).join("")}
      </ul>`}
    </details>`;
}
