import { escapeHtml } from "../ui";
import { availabilityFor } from "./availability";
import type { UmpireAvailability } from "./availability";
import { formatTime } from "./format";
import { POSITION_NAME, clashingGames, workload } from "./staffing";
import type { Assignment, Game, Position, UmpireOption } from "./types";

// Scheduling suggestions: for ONE open place on ONE game, who would be a good
// choice, best first, and WHY. This only advises. Nothing is saved until the
// scheduler presses Save, and the database still checks every rule then.
//
// Left out entirely (and counted, so it is clear why people are missing):
//   - busy: already on another game that overlaps this one
//   - cannot: marked themselves unavailable at this time
//   - rules: the database's own check says no (the youth age rule, or the division they play in)
//   - consent: under the age that needs a parent's consent, and it has not been given
//
// The rest are ranked by a simple score. Every part of it is shown as a reason.
//   start                                      50
//   said they can umpire at this time         +25
//   has entered other times, not this one     -20
//   fewer games than the others this season   +4 for each game below the average (at most +20)
//   more games than the others                -4 for each game above the average (at most -20)
//   already at this field that day, close by  +12 (saves travelling, and a gap to fill)
//   already has 2 other games that day        -10 (it would be their third); 3 or more other games: -20
// Ties go to whoever has fewer games, then by name.

export type ReasonKind = "good" | "note" | "warn";
export type Reason = { kind: ReasonKind; text: string };

export type Suggestion = {
  umpireId: string;
  name: string;
  youth: boolean;
  score: number;
  games: number; // games this season (canceled ones are not counted)
  reasons: Reason[];
};

export type LeftOut = { busy: number; cannot: number; rules: number; consent: number };

export type SuggestResult = {
  suggestions: Suggestion[]; // the best few
  more: number; // how many more could also be chosen
  leftOut: LeftOut;
  rulesChecked: boolean; // false when the database's age and division check could not be asked
  consentChecked: boolean; // false when the database's consent check could not be asked
};

export type SuggestInput = {
  game: Game;
  umpires: UmpireOption[];
  games: Game[]; // every game of the season
  assignments: Assignment[]; // every assignment of the season
  availability: Map<string, UmpireAvailability> | null; // null: not loaded (or not allowed)
  problems: Map<string, string | null> | null; // the database's own check; null: not asked
  needsConsent: Set<string> | null; // umpires who still need a parent's consent; null: not asked
  taken: Set<string>; // umpires already chosen for another place on this game
  now?: number; // the time to judge availability against (the app's current time if left out)
  limit?: number; // how many to return (5 if left out)
};

// "Close by" means the gap between the two games is no more than this.
export const CLOSE_BY_MINUTES = 120;

// A calendar day in the browser's time zone (the times shown in the app are in that zone too).
function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function minutesBetween(laterIso: string, earlierIso: string): number {
  return (Date.parse(laterIso) - Date.parse(earlierIso)) / 60000;
}

export function suggestUmpires(input: SuggestInput): SuggestResult {
  const { game } = input;
  const leftOut: LeftOut = { busy: 0, cannot: 0, rules: 0, consent: 0 };
  const liveGames = input.games.filter((other) => other.status !== "canceled");
  const gameById = new Map(liveGames.map((other) => [other.id, other]));

  type Candidate = {
    umpire: UmpireOption;
    games: number;
    availability: ReturnType<typeof availabilityFor> | "none";
    sameDay: Game[];
  };
  const candidates: Candidate[] = [];

  for (const umpire of input.umpires) {
    if (umpire.eligibility !== "active" || input.taken.has(umpire.id)) continue;

    if (input.problems?.get(umpire.id)) { leftOut.rules++; continue; }
    if (input.needsConsent?.has(umpire.id)) { leftOut.consent++; continue; }

    const availability = input.availability
      ? availabilityFor(game, input.availability.get(umpire.id), input.now)
      : "none";
    if (availability === "cannot") { leftOut.cannot++; continue; }

    if (clashingGames(umpire.id, game, input.games, input.assignments).length > 0) { leftOut.busy++; continue; }

    // their OTHER games on the same day (canceled games are not counted)
    const sameDay: Game[] = [];
    for (const row of input.assignments) {
      if (row.umpire_id !== umpire.id) continue;
      const other = gameById.get(row.game_id);
      if (other && other.id !== game.id && dayKey(other.starts_at) === dayKey(game.starts_at)) sameDay.push(other);
    }
    sameDay.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));

    candidates.push({
      umpire,
      games: workload(umpire.id, input.games, input.assignments),
      availability,
      sameDay,
    });
  }

  const average = candidates.length
    ? candidates.reduce((sum, candidate) => sum + candidate.games, 0) / candidates.length
    : 0;

  const gamesText = (n: number) => `${n} ${n === 1 ? "game" : "games"}`;

  const scored = candidates.map((candidate): Suggestion => {
    const reasons: Reason[] = [];
    let score = 50;

    // what they said about this time
    if (candidate.availability === "available") {
      score += 25;
      reasons.push({ kind: "good", text: "Said they can umpire at this time" });
    } else if (candidate.availability === "unavailable") {
      score -= 20;
      reasons.push({ kind: "warn", text: "Has entered other times, but not this one" });
    } else {
      reasons.push({ kind: "note", text: "Has not entered availability" });
    }

    // a fair share of the games
    const difference = Math.round(average - candidate.games);
    const bonus = Math.max(-20, Math.min(20, difference * 4));
    score += bonus;
    if (difference >= 1) {
      reasons.push({ kind: "good", text: `${gamesText(candidate.games)} this season (the others average ${Math.round(average)})` });
    } else if (difference <= -1) {
      reasons.push({ kind: "note", text: `${gamesText(candidate.games)} this season, more than most (the others average ${Math.round(average)})` });
    } else {
      reasons.push({ kind: "note", text: `${gamesText(candidate.games)} this season` });
    }

    // the same day: already at this field, close by, and how full their day is
    const closeAtField = candidate.sameDay.find((other) => {
      if (other.location_id !== game.location_id) return false;
      const gapBefore = minutesBetween(game.starts_at, other.ends_at);
      const gapAfter = minutesBetween(other.starts_at, game.ends_at);
      return (gapBefore >= 0 && gapBefore <= CLOSE_BY_MINUTES) || (gapAfter >= 0 && gapAfter <= CLOSE_BY_MINUTES);
    });
    if (closeAtField) {
      score += 12;
      reasons.push({ kind: "good", text: `Already at this field that day (${formatTime(closeAtField.starts_at)} game)` });
    }

    if (candidate.sameDay.length === 1 && !closeAtField) {
      reasons.push({ kind: "note", text: `Has another game that day (${formatTime(candidate.sameDay[0].starts_at)})` });
    } else if (candidate.sameDay.length >= 2) {
      score -= Math.min(20, (candidate.sameDay.length - 1) * 10);
      reasons.push({ kind: "warn", text: `Already has ${candidate.sameDay.length} other games that day` });
    }

    return {
      umpireId: candidate.umpire.id,
      name: candidate.umpire.name,
      youth: candidate.umpire.classification === "youth",
      score,
      games: candidate.games,
      reasons,
    };
  });

  scored.sort((a, b) => b.score - a.score || a.games - b.games || a.name.localeCompare(b.name));

  const limit = input.limit ?? 5;
  return {
    suggestions: scored.slice(0, limit),
    more: Math.max(0, scored.length - limit),
    leftOut,
    rulesChecked: input.problems !== null,
    consentChecked: input.needsConsent !== null,
  };
}

// "2 busy at this time, 1 marked unavailable, 3 not allowed by the age or division rules, 1 needs a parent's consent"
export function leftOutText(leftOut: LeftOut): string {
  const parts: string[] = [];
  if (leftOut.busy) parts.push(`${leftOut.busy} busy at this time`);
  if (leftOut.cannot) parts.push(`${leftOut.cannot} marked unavailable`);
  if (leftOut.rules) parts.push(`${leftOut.rules} not allowed by the age or division rules`);
  if (leftOut.consent) parts.push(`${leftOut.consent} ${leftOut.consent === 1 ? "needs" : "need"} a parent's consent first`);
  return parts.join(", ");
}

export function suggestionsHtml(position: Position, result: SuggestResult): string {
  const place = POSITION_NAME[position];
  const left = leftOutText(result.leftOut);

  const notes = [
    left ? `<p class="board-note suggest-leftout">Left out: ${escapeHtml(left)}.</p>` : "",
    !result.rulesChecked
      ? `<p class="board-note suggest-leftout">The age and division rules could not be checked here; the database checks them when you save.</p>`
      : "",
    !result.consentChecked
      ? `<p class="board-note suggest-leftout">Parental consent could not be checked here; the database checks it when you save.</p>`
      : "",
  ].join("");

  if (result.suggestions.length === 0) {
    return `
      <div class="suggest" data-suggest-for="${escapeHtml(position)}">
        <p class="suggest-help">No one fits the ${escapeHtml(place.toLowerCase())} place right now.</p>
        ${notes}
      </div>`;
  }

  return `
    <div class="suggest" data-suggest-for="${escapeHtml(position)}">
      <p class="suggest-help">
        Best first for the ${escapeHtml(place.toLowerCase())} place. Nothing is saved until you press <strong>Save umpires</strong>.
      </p>
      <ol class="suggest-list">
        ${result.suggestions.map((suggestion) => `
          <li class="suggest-item">
            <div class="suggest-who">
              <strong>${escapeHtml(suggestion.name)}</strong>${suggestion.youth ? " (youth)" : ""}
              <ul class="suggest-reasons">
                ${suggestion.reasons.map((reason) => `<li class="suggest-reason suggest-${reason.kind}">${escapeHtml(reason.text)}</li>`).join("")}
              </ul>
            </div>
            <button type="button" class="secondary-button suggest-use"
              data-use-umpire="${escapeHtml(suggestion.umpireId)}" data-use-position="${escapeHtml(position)}"
              aria-label="Use ${escapeHtml(suggestion.name)} for the ${escapeHtml(place.toLowerCase())} place">Use</button>
          </li>`).join("")}
      </ol>
      ${result.more > 0 ? `<p class="board-note suggest-leftout">${result.more} more could also be chosen from the list above.</p>` : ""}
      ${notes}
    </div>`;
}
