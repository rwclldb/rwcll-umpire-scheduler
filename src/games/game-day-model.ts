import { escapeHtml } from "../ui";
import { dateKey } from "./availability";
import { arrivedText, checkInState } from "./attendance";
import type { CheckInState } from "./attendance";
import { formatTime, localDateKey } from "./format";
import type { UmpireGame } from "./schedule";
import type { Assignment } from "./types";

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

export function gameDayHtml(entries: GameDayEntry[]): string {
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
              </div>
              <div class="gd-action">${actionHtml(entry)}</div>
            </li>`;
        }).join("")}
      </ul>
    </section>`;
}
