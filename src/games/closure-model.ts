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

export function closurePanelHtml(board: DayBoard, closures: FieldClosure[]): string {
  const fields = board.fields
    .map((field) => ({ field, count: gamesToCancel(field, -Infinity, Infinity).length }))
    .filter((item) => item.count > 0);

  const fieldName = (id: string) => board.fields.find((field) => field.locationId === id)?.name ?? "A field";

  const list = closures.length === 0
    ? ""
    : `
      <h3 class="closure-list-title">Closed today</h3>
      <ul class="closure-list">
        ${closures.map((closure) => `
          <li class="closure-item${closure.reopened_at ? " closure-reopened" : ""}">
            <span><strong>${escapeHtml(fieldName(closure.location_id))}</strong>, ${escapeHtml(closureWhen(closure))}:
              ${escapeHtml(closure.reason)}
              (${escapeHtml(plural(closure.games, "game", "games"))} canceled by ${escapeHtml(closure.created_by_name)})
              ${closure.reopened_at ? `<em>Reopened by ${escapeHtml(closure.reopened_by_name ?? "an administrator")}.</em>` : ""}</span>
            ${closure.reopened_at ? "" : `<button type="button" class="secondary-button" data-reopen="${escapeHtml(closure.id)}">Reopen</button>`}
          </li>`).join("")}
      </ul>`;

  return `
    <details class="board-closure" id="board-closure-box"${closures.some((closure) => !closure.reopened_at) ? " open" : ""}>
      <summary>Rainout: close a field</summary>
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
      ${list}
    </details>`;
}
