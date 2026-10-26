import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { formatTime } from "./format";
import { POSITIONS, POSITION_LABEL, assignmentsByGame, clashingGames, umpiresNeeded, workload } from "./staffing";
import type { Position } from "./staffing";
import type { Assignment, Game, GamesContext } from "./types";

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

// Choose the umpires for one game. Clashes are shown as warnings but never
// stop a save, because real leagues sometimes need an exception.
export function renderAssignPanel(container: HTMLElement, options: AssignOptions): void {
  const { context, game } = options;

  const division = context.divisions.find((item) => item.id === game.division_id);
  const divisionDefault = division?.umpires_per_game ?? 2;

  const current = assignmentsByGame(options.assignments).get(game.id) ?? {};
  const selection: Record<Position, string> = {
    plate: current.plate ?? "",
    field: current.field ?? "",
  };
  const originally = { ...selection };

  let needed = umpiresNeeded(game, () => divisionDefault);
  let neededValue: string = game.umpires_needed === null || game.umpires_needed === undefined
    ? ""
    : String(game.umpires_needed);

  container.innerHTML = `
    <form id="assign-form" class="create-umpire-form game-form assign-panel" novalidate>
      <h3>Umpires for this game</h3>
      <p class="season-dates"><strong>${escapeHtml(options.title)}</strong><br>${escapeHtml(options.detail)}</p>

      <label for="assign-needed">Umpires needed for this game</label>
      <select id="assign-needed">
        <option value="">Use the division's default (${divisionDefault} ${divisionDefault === 1 ? "umpire" : "umpires"})</option>
        <option value="0">No umpire needed</option>
        <option value="1">1 umpire</option>
        <option value="2">2 umpires</option>
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

  // The choices for one position: open, or any active umpire (with how many
  // games they have, and whether they are busy at this time).
  const optionsFor = (position: Position): string => {
    const choose = selection[position];

    const list = context.umpires
      .filter((umpire) => umpire.eligibility === "active" || umpire.id === choose)
      .sort((a, b) => a.name.localeCompare(b.name));

    return `
      <option value="">&mdash; open &mdash;</option>
      ${list.map((umpire) => {
        const busy = clashingGames(umpire.id, game, options.games, options.assignments).length > 0;
        const label =
          `${umpire.name}${umpire.classification === "youth" ? " (youth)" : ""}` +
          `${umpire.eligibility !== "active" ? " (not active)" : ""}` +
          ` \u00b7 ${gamesText(workload(umpire.id, options.games, options.assignments))}` +
          `${busy ? " \u00b7 busy at this time" : ""}`;
        return `<option value="${escapeHtml(umpire.id)}" ${umpire.id === choose ? "selected" : ""}>${escapeHtml(label)}</option>`;
      }).join("")}
    `;
  };

  const showNotes = () => {
    const lines: string[] = [];

    for (const position of POSITIONS) {
      const umpireId = selection[position];
      if (!umpireId) continue;

      for (const other of clashingGames(umpireId, game, options.games, options.assignments)) {
        lines.push(
          `${nameOf(umpireId)} is also assigned to ${options.sideText(other)} at ` +
          `${formatTime(other.starts_at)} (${options.fieldName(other.location_id)}), ` +
          `which overlaps this game.`
        );
      }
    }

    notes.innerHTML = lines.length
      ? `<ul class="imp-list assign-clashes">${lines.map((line) => `<li class="imp-warn">${escapeHtml(line)}</li>`).join("")}</ul>`
      : "";
  };

  // The places shown: those the game needs, plus any that already has someone.
  const drawSlots = () => {
    const shown = POSITIONS.filter(
      (position, index) => index < needed || selection[position] || originally[position]
    );

    slots.innerHTML = shown.length
      ? shown.map((position) => `
          <label for="assign-${position}">${POSITION_LABEL[position]} umpire</label>
          <select id="assign-${position}" data-position="${position}">${optionsFor(position)}</select>
        `).join("")
      : `<p class="directory-description">No umpire is needed for this game. Change the number above if one is.</p>`;

    showNotes();
  };

  drawSlots();

  neededSelect.addEventListener("change", () => {
    neededValue = neededSelect.value;
    needed = neededValue === "" ? divisionDefault : Number(neededValue);
    drawSlots();
  });

  slots.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.dataset.position) return;

    const position = target.dataset.position as Position;
    const other: Position = position === "plate" ? "field" : "plate";

    // Choosing an umpire who is already in the other place swaps the two, so
    // nobody is ever in both places.
    if (target.value && selection[other] === target.value) {
      selection[other] = selection[position];
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
    if (selection.plate !== originally.plate || selection.field !== originally.field) {
      const { error } = await supabase.rpc("set_game_umpires", {
        p_game_id: game.id,
        p_plate: selection.plate || null,
        p_field: selection.field || null,
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
