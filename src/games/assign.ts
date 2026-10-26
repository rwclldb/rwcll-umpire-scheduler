import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { formatTime } from "./format";
import {
  MAX_UMPIRES,
  POSITIONS,
  POSITION_NAME,
  assignmentsByGame,
  clashingGames,
  countLabel,
  divisionNeed,
  layoutFor,
  umpiresNeeded,
  workload,
} from "./staffing";
import type { Assignment, Game, GamesContext, Position } from "./types";

export type AssignOptions = {
  context: GamesContext;
  game: Game;
  games: Game[]; // every game of the season, to find clashes
  assignments: Assignment[]; // every assignment of the season
  title: string; // "Eagles vs Hawks"
  detail: string; // "Mon, Oct 26 | 10:00 AM - 12:00 PM | Majors, Field A"
  sideText: (game: Game) => string;
  fieldName: (locationId: string) => string;
  // called when the panel closes; the text is a message to show, or null
  onDone: (message: string | null) => void;
};

type Eligibility = { problem: string | null; note: string | null };

const emptyPlaces = (): Record<Position, string> => ({
  plate: "",
  first_base: "",
  second_base: "",
  third_base: "",
  field: "",
});

// Choose the umpires for one game. Clashes are shown as warnings but never
// stop a save, because real leagues sometimes need an exception. Youth umpires
// the age rule does not allow are shown but cannot be chosen (the database
// enforces the rule as well).
export function renderAssignPanel(container: HTMLElement, options: AssignOptions): void {
  const { context, game } = options;

  const division = context.divisions.find((item) => item.id === game.division_id);
  const divisionDefault = divisionNeed(division, game.game_type);

  const current = assignmentsByGame(options.assignments).get(game.id) ?? {};
  const selection: Record<Position, string> = { ...emptyPlaces(), ...current };
  const originally: Record<Position, string> = { ...selection };

  let needed = umpiresNeeded(game, () => divisionDefault);
  let neededValue: string = game.umpires_needed === null || game.umpires_needed === undefined
    ? ""
    : String(game.umpires_needed);

  // who the age rule does not allow on this game, and what could not be checked
  let eligibility = new Map<string, Eligibility>();

  container.innerHTML = `
    <form id="assign-form" class="create-umpire-form game-form assign-panel" novalidate>
      <h3>Umpires for this game</h3>
      <p class="season-dates"><strong>${escapeHtml(options.title)}</strong><br>${escapeHtml(options.detail)}</p>

      <label for="assign-needed">Umpires needed for this game</label>
      <select id="assign-needed">
        <option value="">Use the division's default (${escapeHtml(countLabel(divisionDefault).replace(" needed", ""))})</option>
        ${Array.from({ length: MAX_UMPIRES + 1 }, (_, n) => `<option value="${n}">${escapeHtml(countLabel(n))}</option>`).join("")}
      </select>

      <div id="assign-slots"></div>
      <div id="assign-notes" aria-live="polite"></div>

      <div class="account-actions">
        <button id="assign-save" class="primary-button" type="submit">Save umpires</button>
        <button id="assign-cancel" class="secondary-button" type="button">Cancel</button>
      </div>

      <p id="assign-message" class="message" role="status" aria-live="polite"></p>
    </form>
  `;

  const form = container.querySelector<HTMLFormElement>("#assign-form")!;
  const neededSelect = form.querySelector<HTMLSelectElement>("#assign-needed")!;
  const slots = form.querySelector<HTMLElement>("#assign-slots")!;
  const notes = form.querySelector<HTMLElement>("#assign-notes")!;
  const message = form.querySelector<HTMLElement>("#assign-message")!;

  neededSelect.value = neededValue;

  const say = (text: string, kind: "error" | "success" = "error") => {
    message.textContent = text;
    message.className = `message ${kind}`;
  };

  const nameOf = (id: string) =>
    context.umpires.find((item) => item.id === id)?.name ?? context.umpireNames.get(id) ?? "An umpire";

  const gamesText = (n: number) => `${n} ${n === 1 ? "game" : "games"}`;

  // The choices for one place: open, or any active umpire (with how many
  // games they have, and whether they are busy at this time). An umpire the
  // age rule does not allow here is listed but cannot be chosen.
  const optionsFor = (position: Position): string => {
    const choose = selection[position];

    const list = context.umpires
      .filter((umpire) => umpire.eligibility === "active" || umpire.id === choose)
      .sort((a, b) => a.name.localeCompare(b.name));

    return `
      <option value="">&mdash; open &mdash;</option>
      ${list.map((umpire) => {
        const busy = clashingGames(umpire.id, game, options.games, options.assignments).length > 0;
        const blocked = Boolean(eligibility.get(umpire.id)?.problem) && umpire.id !== choose;
        const label =
          `${umpire.name}${umpire.classification === "youth" ? " (youth)" : ""}` +
          `${umpire.eligibility !== "active" ? " (not active)" : ""}` +
          ` \u00b7 ${gamesText(workload(umpire.id, options.games, options.assignments))}` +
          `${busy ? " \u00b7 busy at this time" : ""}` +
          `${blocked ? " \u00b7 age rule" : ""}`;
        return `<option value="${escapeHtml(umpire.id)}" ${umpire.id === choose ? "selected" : ""} ${blocked ? "disabled" : ""}>${escapeHtml(label)}</option>`;
      }).join("")}
    `;
  };

  const showNotes = () => {
    const lines: { text: string; kind: "warn" | "info" }[] = [];

    for (const position of POSITIONS) {
      const umpireId = selection[position];
      if (!umpireId) continue;

      for (const other of clashingGames(umpireId, game, options.games, options.assignments)) {
        lines.push({
          kind: "warn",
          text:
            `${nameOf(umpireId)} is also assigned to ${options.sideText(other)} at ` +
            `${formatTime(other.starts_at)} (${options.fieldName(other.location_id)}), ` +
            `which overlaps this game.`,
        });
      }

      const found = eligibility.get(umpireId);
      if (found?.problem) lines.push({ kind: "warn", text: `${nameOf(umpireId)}: ${found.problem}` });
      if (found?.note) lines.push({ kind: "info", text: `${nameOf(umpireId)}: ${found.note}` });
    }

    // Youth umpires who are not offered, so it is clear why they are missing.
    const hidden = context.umpires
      .filter((umpire) => umpire.eligibility === "active" && eligibility.get(umpire.id)?.problem && !POSITIONS.some((p) => selection[p] === umpire.id))
      .map((umpire) => umpire.name)
      .sort((a, b) => a.localeCompare(b));

    if (hidden.length) {
      lines.push({
        kind: "info",
        text: `Not available for this division because of the youth age rule: ${hidden.join(", ")}.`,
      });
    }

    notes.innerHTML = lines.length
      ? `<ul class="imp-list assign-clashes">${lines.map((line) => `<li class="${line.kind === "warn" ? "imp-warn" : "imp-note"}">${escapeHtml(line.text)}</li>`).join("")}</ul>`
      : "";
  };

  // The places shown: those the game needs, plus any that already has someone.
  const drawSlots = () => {
    const wanted = layoutFor(needed);
    const shown = POSITIONS.filter(
      (position) => wanted.includes(position) || selection[position] || originally[position]
    );

    slots.innerHTML = shown.length
      ? shown.map((position) => `
          <label for="assign-${position}">${POSITION_NAME[position]} umpire</label>
          <select id="assign-${position}" data-position="${position}">${optionsFor(position)}</select>
        `).join("")
      : `<p class="directory-description">No umpire is needed for this game. Change the number above if one is.</p>`;

    showNotes();
  };

  drawSlots();

  // The age rule needs birth dates, which only the database may see, so it
  // answers. If it cannot (for example before it has been installed) the panel
  // simply works without the extra hints; the database still enforces the rule.
  void (async () => {
    const { data, error } = await supabase.rpc("game_umpire_eligibility", { p_game_id: game.id });
    if (error || !Array.isArray(data)) return;

    eligibility = new Map(
      (data as { umpire_id: string; problem: string | null; note: string | null }[]).map((row) => [
        row.umpire_id,
        { problem: row.problem ?? null, note: row.note ?? null },
      ])
    );

    if (container.contains(form)) drawSlots();
  })();

  neededSelect.addEventListener("change", () => {
    neededValue = neededSelect.value;
    needed = neededValue === "" ? divisionDefault : Number(neededValue);
    drawSlots();
  });

  slots.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.dataset.position) return;

    const position = target.dataset.position as Position;

    // Choosing an umpire who is already in another place swaps the two, so
    // nobody is ever in two places.
    if (target.value) {
      const elsewhere = POSITIONS.find((other) => other !== position && selection[other] === target.value);
      if (elsewhere) selection[elsewhere] = selection[position];
    }

    selection[position] = target.value;
    drawSlots();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void save();
  });

  form.querySelector("#assign-cancel")?.addEventListener("click", () => options.onDone(null));

  async function save() {
    const saveButton = form.querySelector<HTMLButtonElement>("#assign-save")!;
    saveButton.disabled = true;

    // 1. the number needed, if it was changed
    const wanted = neededValue === "" ? null : Number(neededValue);
    if (wanted !== (game.umpires_needed ?? null)) {
      const { data, error } = await supabase
        .from("games")
        .update({ umpires_needed: wanted })
        .eq("id", game.id)
        .select("id");

      if (error || !data || data.length === 0) {
        saveButton.disabled = false;
        say(error ? `Could not change the number of umpires: ${error.message}` : "The number of umpires was not changed. You may not have permission.");
        return;
      }
    }

    // 2. the umpires, if they were changed
    if (POSITIONS.some((position) => selection[position] !== originally[position])) {
      const places: Record<string, string | null> = {};
      for (const position of POSITIONS) places[position] = selection[position] || null;

      const { error } = await supabase.rpc("set_game_umpires", {
        p_game_id: game.id,
        p_umpires: places,
      });

      if (error) {
        saveButton.disabled = false;
        say(`The umpires were not saved. ${error.message}`);
        return;
      }
    }

    options.onDone(`Umpires saved for ${options.title}.`);
  }
}
