import { escapeHtml } from "../ui";
import { dateKey } from "./availability";
import { arrivedText, checkInState } from "./attendance";
import type { CheckInState } from "./attendance";
import { formatTime, localDateKey } from "./format";
import { notesHtml } from "./game-notes-model";
import type { UmpireGame } from "./schedule";
import { POSITION_LABEL } from "./staffing";
import type { Assignment, GameNote, Position, RunningLate } from "./types";

// The "Game day" card on an umpire's Home page: today's games, with a button to
// check in once the game is within an hour of starting. (This file works out and
// writes the card; game-day.ts makes its button work.)

export type GameDayEntry = { game: UmpireGame; state: CheckInState };

// The umpire's games for today (and any game whose check-in is open right now,
// even if it is tomorrow's), in time order. Canceled and completed games, and
// games that are over, are not shown unless they are today's.
export function gameDayEntries(
  items: UmpireGame[],
  assignments: Assignment[],
  umpireId: string,
  now: Date
): GameDayEntry[] {
  const mine = new Map(assignments.filter((row) => row.umpire_id === umpireId).map((row) => [row.game_id, row]));
  const today = dateKey(now);
  const entries: GameDayEntry[] = [];

  for (const game of items) {
    const row = mine.get(game.id);
    if (!row || game.status === "canceled") continue;

    const state = checkInState({ starts_at: game.startsAt, ends_at: game.endsAt, status: game.status }, row, now);
    if (state.kind === "closed") continue;

    if (localDateKey(game.startsAt) === today || state.kind === "open") entries.push({ game, state });
  }

  return entries.sort((a, b) => Date.parse(a.game.startsAt) - Date.parse(b.game.startsAt));
}

// Milliseconds until the next check-in opens (so the card can update itself), or null.
export function msUntilNextOpening(entries: GameDayEntry[], now: Date): number | null {
  const waits = entries
    .flatMap((entry) => (entry.state.kind === "early" ? [Date.parse(entry.state.opensAt) - now.getTime()] : []))
    .filter((ms) => ms > 0);

  return waits.length ? Math.min(...waits) : null;
}

// What the card shows beyond the game itself.
export type GameDayExtras = {
  umpireId?: string;
  partners?: Map<string, { position: string; name: string }[]>;   // the other umpires on each game (names only)
  access?: Map<string, string>;                                     // access details, where the umpire may have them
  late?: Map<string, RunningLate>;                                  // "gameId:umpireId"
};

export const LATE_CHOICES = [5, 10, 15, 20, 30, 45, 60];

// "I'm running late": shown while check-in is open (within an hour of the start, until the game ends)
function lateHtml(entry: GameDayEntry, extras?: GameDayExtras): string {
  if (entry.state.kind !== "open") return "";

  const report = extras?.umpireId ? extras.late?.get(`${entry.game.id}:${extras.umpireId}`) : undefined;
  const id = escapeHtml(entry.game.id);

  return `
    <details class="gd-late"${report ? " open" : ""}>
      <summary>${report ? `Running late (about ${report.minutes} min)` : "I'm running late"}</summary>
      <div class="gd-late-body">
        <label>About how many minutes?
          <select class="gd-late-minutes">
            ${LATE_CHOICES.map((minutes) => `<option value="${minutes}"${report?.minutes === minutes ? " selected" : ""}>${minutes}</option>`).join("")}
          </select>
        </label>
        <button type="button" class="primary-button" data-late-send="${id}">${report ? "Update" : "Tell the administrators"}</button>
        ${report ? `<button type="button" class="secondary-button" data-late-clear="${id}">I'm not late after all</button>` : ""}
      </div>
    </details>`;
}

function actionHtml(entry: GameDayEntry): string {
  const { state, game } = entry;

  switch (state.kind) {
    case "open":
      return `
        <button type="button" class="primary-button gd-button" data-checkin="${escapeHtml(game.id)}">I'm here</button>
        ${state.markedNoShow ? `<p class="gd-note">An administrator marked you as not here. If you are here, check in.</p>` : ""}`;
    case "early":
      return `<p class="gd-state">Check-in opens at ${escapeHtml(formatTime(state.opensAt))}, an hour before the game.</p>`;
    case "done":
      return `<p class="gd-state gd-done">${escapeHtml(arrivedText(game.startsAt, state.arrivedAt, "Checked in"))}</p>`;
    case "over":
      return `<p class="gd-state">${state.noShow ? "You were marked as not here." : "The game is over, and no check-in was recorded."} Ask an administrator if that is wrong.</p>`;
    default:
      return "";
  }
}

export function gameDayHtml(entries: GameDayEntry[], notes?: Map<string, GameNote[]>, extras?: GameDayExtras): string {
  if (entries.length === 0) return "";

  return `
    <section class="game-day" aria-labelledby="game-day-title">
      <h2 id="game-day-title">Game day</h2>
      <p id="game-day-message" class="message" role="status" aria-live="polite"></p>
      <ul class="gd-list">
        ${entries.map((entry) => {
          const game = entry.game;
          const map = game.address
            ? ` <a class="board-map" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(game.address)}" target="_blank" rel="noopener">${escapeHtml(game.address)}</a>`
            : "";

          return `
            <li class="gd-item gd-${entry.state.kind}">
              <div class="gd-info">
                <strong>${escapeHtml(game.time)}</strong>
                <span>${escapeHtml(game.division)} &middot; ${escapeHtml(game.home)} vs ${escapeHtml(game.away)}</span>
                <span>${escapeHtml(game.position)} at ${escapeHtml(game.field)}${map}</span>
                ${(extras?.partners?.get(game.id) ?? []).length
                  ? `<span class="gd-with"><strong>With:</strong> ${(extras!.partners!.get(game.id)!).map((partner) => `${escapeHtml(partner.name)} (${escapeHtml(POSITION_LABEL[partner.position as Position] ?? partner.position)})`).join(", ")}</span>`
                  : ""}
                ${game.directions ? `<span class="gd-directions"><strong>Parking and directions:</strong> ${escapeHtml(game.directions)}</span>` : ""}
                ${extras?.access?.get(game.id) ? `<span class="gd-access"><strong>Gate or access:</strong> ${escapeHtml(extras.access.get(game.id)!)}</span>` : ""}
              </div>
              <div class="gd-action">${actionHtml(entry)}${lateHtml(entry, extras)}</div>
              <div class="gd-notes">${notesHtml(game.id, notes?.get(game.id) ?? [], { canRemove: false })}</div>
            </li>`;
        }).join("")}
      </ul>
    </section>`;
}
