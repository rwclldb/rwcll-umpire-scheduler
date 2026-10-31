import { escapeHtml } from "../ui";
import { availabilityFor } from "./availability";
import type { Availability, UmpireAvailability } from "./availability";
import { contactLinksHtml } from "./board-model";
import type { ContactNumbers } from "./contacts";
import { POSITION_LABEL, clashingGames, workload } from "./staffing";
import type { Assignment, Game, Position, UmpireOption } from "./types";

// The call-around list: for a game with an open place, the umpires who could
// take it, best first, with Call and Text. Nothing is saved about who was called.

export type CallCandidate = {
  umpireId: string;
  name: string;
  youth: boolean;
  availability: Availability;   // said they can / entered other times / nothing entered / marked "I can't"
  busy: boolean;                // already on another game at this time
  games: number;                // how many games they already have
};

// Who could take a place on this game. Left out: umpires who are not active,
// already on this game, or not allowed by the age rules (problems come from the
// database's own check).
export function callAroundList(input: {
  game: Game;
  umpires: UmpireOption[];
  games: Game[];
  assignments: Assignment[];
  availability: Map<string, UmpireAvailability> | null;
  problems: Map<string, string | null>;
  now?: number;   // the time to judge availability against (the app's current time if left out)
}): CallCandidate[] {
  const onGame = new Set(input.assignments.filter((row) => row.game_id === input.game.id).map((row) => row.umpire_id));

  const list = input.umpires
    .filter((umpire) => umpire.eligibility === "active" && !onGame.has(umpire.id) && !input.problems.get(umpire.id))
    .map((umpire): CallCandidate => ({
      umpireId: umpire.id,
      name: umpire.name,
      youth: umpire.classification === "youth",
      availability: input.availability ? availabilityFor(input.game, input.availability.get(umpire.id), input.now) : "none",
      busy: clashingGames(umpire.id, input.game, input.games, input.assignments).length > 0,
      games: workload(umpire.id, input.games, input.assignments),
    }));

  // Best first: said they can and are free; nothing entered and free; entered
  // other times and free; busy; and last, marked "I can't".
  const rank = (candidate: CallCandidate) =>
    candidate.availability === "cannot" ? 4
    : candidate.busy ? 3
    : candidate.availability === "available" ? 0
    : candidate.availability === "none" ? 1
    : 2;

  return list.sort((a, b) => rank(a) - rank(b) || a.games - b.games || a.name.localeCompare(b.name));
}

export function availabilityText(candidate: CallCandidate): string {
  switch (candidate.availability) {
    case "available": return "Said they can umpire at this time";
    case "cannot": return "Marked unavailable at this time";
    case "unavailable": return "Has not said they can at this time";
    default: return "No availability entered";
  }
}

export function callAroundHtml(
  gameId: string,
  position: Position,
  candidates: CallCandidate[],
  contacts: Map<string, ContactNumbers>
): string {
  if (candidates.length === 0) {
    return `<div class="callaround"><p class="callaround-help">There is no one else who could take this place (everyone active is already on the game, or not allowed by the age rules).</p></div>`;
  }

  return `
    <div class="callaround">
      <p class="callaround-help">
        Umpires who could take the ${escapeHtml(POSITION_LABEL[position])} place, best first. Call or text, then press
        <strong>Assign</strong> when they say yes. Nothing is saved about who you called.
      </p>
      <ul class="callaround-list">
        ${candidates.map((candidate) => `
          <li class="callaround-item">
            <div class="callaround-who">
              <strong>${escapeHtml(candidate.name)}</strong>${candidate.youth ? " (youth)" : ""}
              <span class="board-tag${candidate.availability === "available" && !candidate.busy ? "" : " board-tag-warn"}">${escapeHtml(availabilityText(candidate))}</span>
              ${candidate.busy ? `<span class="board-tag board-tag-warn">Busy at this time</span>` : ""}
              <span class="board-note">${candidate.games} ${candidate.games === 1 ? "game" : "games"}</span>
            </div>
            ${contactLinksHtml(candidate.name, contacts.get(candidate.umpireId)) || `<span class="board-contacts board-note">no phone on file</span>`}
            <button type="button" class="secondary-button callaround-assign"
              data-assign-umpire="${escapeHtml(candidate.umpireId)}" data-assign-game="${escapeHtml(gameId)}"
              data-assign-position="${escapeHtml(position)}"
              aria-label="Assign ${escapeHtml(candidate.name)} to the ${escapeHtml(POSITION_LABEL[position])} place">Assign</button>
          </li>`).join("")}
      </ul>
    </div>`;
}
