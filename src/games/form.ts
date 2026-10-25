import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import type { Game, GamesContext, GameStatus, GameType } from "./types";
import {
  addMinutes,
  durationMinutes,
  fromLocalInput,
  toLocalInput,
} from "./format";

export type GameFormOptions = {
  game: Game | null; // null means a new game
  defaultSeasonId: string;
  defaultDivisionId: string;
  assignmentCount: number; // umpires assigned to this game (for the delete warning)
  // called when the form closes; the text is a message to show, or null
  onDone: (message: string | null) => void;
};

const UNDECIDED = "__undecided";

const STATUS_LABELS: Record<GameStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  canceled: "Canceled",
  completed: "Completed",
};

const TYPE_LABELS: Record<GameType, string> = {
  regular: "Regular season",
  tournament: "Tournament",
  scrimmage: "Scrimmage",
};

// The database's refusals, in plain words.
function friendlyError(error: { code?: string; message: string }): string {
  const text = error.message;

  if (error.code === "23505" && text.includes("games_season_external_id_unique")) {
    return "Another game in this season already has that master calendar Game ID.";
  }
  if (text.includes("games_home_team_in_division")) {
    return "The home team must belong to this season's chosen division.";
  }
  if (text.includes("games_away_team_in_division")) {
    return "The away team must belong to this season's chosen division.";
  }
  if (text.includes("games_home_team_in_season") || text.includes("games_away_team_in_season")) {
    return "Both teams must belong to the chosen season.";
  }
  if (text.includes("games_valid_time")) {
    return "The game must end after it starts.";
  }
  if (text.includes("games_different_teams")) {
    return "A team cannot play itself.";
  }
  if (error.code === "42501") {
    return "You do not have permission to change games.";
  }

  return `The game could not be saved: ${text}`;
}

export function renderGameForm(
  container: HTMLElement,
  context: GamesContext,
  options: GameFormOptions
): void {
  const { game } = options;
  const editing = game !== null;

  const status: GameStatus = game?.status ?? "scheduled";
  const gameType: GameType = game?.game_type ?? "regular";
  const duration = game ? durationMinutes(game.starts_at, game.ends_at) : 120;

  container.innerHTML = `
    <form id="game-form" class="create-umpire-form game-form" novalidate>
      <h3>${editing ? "Edit game" : "Add game"}</h3>

      ${game?.external_game_id
        ? `<p class="season-dates">
            This game has master calendar Game ID
            <strong>${escapeHtml(game.external_game_id)}</strong>, so it is a
            copy of a game on the master calendar. Changes made here may be
            replaced the next time the master calendar spreadsheet is imported.
          </p>`
        : ""}

      <label for="game-season">Season</label>
      <select id="game-season">
        ${context.seasons.map((season) => `
          <option value="${escapeHtml(season.id)}">${escapeHtml(season.name)}</option>
        `).join("")}
      </select>

      <label for="game-division">Division</label>
      <select id="game-division"></select>

      <label for="game-type">Game type</label>
      <select id="game-type">
        ${(Object.keys(TYPE_LABELS) as GameType[]).map((type) => `
          <option value="${type}" ${type === gameType ? "selected" : ""}>${TYPE_LABELS[type]}</option>
        `).join("")}
      </select>

      <label for="game-home">Home team</label>
      <select id="game-home"></select>
      <input id="game-home-label" type="text" maxlength="100" hidden
        placeholder="For example: Winner of Game 3"
        aria-label="Home side label" />

      <label for="game-away">Away team</label>
      <select id="game-away"></select>
      <input id="game-away-label" type="text" maxlength="100" hidden
        placeholder="For example: Winner of Game 4"
        aria-label="Away side label" />

      <label for="game-field">Field</label>
      <select id="game-field"></select>

      <label for="game-start">Starts</label>
      <input id="game-start" type="datetime-local"
        value="${game ? escapeHtml(toLocalInput(game.starts_at)) : ""}" />

      <label for="game-duration">Length in minutes</label>
      <input id="game-duration" type="number" min="15" max="600" step="5"
        value="${duration}" />

      <label for="game-status">Status</label>
      <select id="game-status">
        ${(Object.keys(STATUS_LABELS) as GameStatus[]).map((value) => `
          <option value="${value}" ${value === status ? "selected" : ""}>${STATUS_LABELS[value]}</option>
        `).join("")}
      </select>

      <label for="game-external-id">Master calendar Game ID (optional)</label>
      <input id="game-external-id" type="text" maxlength="100"
        value="${escapeHtml(game?.external_game_id ?? "")}"
        placeholder="Leave empty for a game that is not on the master calendar" />

      <label for="game-notes">Notes</label>
      <textarea id="game-notes" rows="3">${escapeHtml(game?.notes ?? "")}</textarea>

      <div class="account-actions">
        <button id="game-save" class="primary-button" type="submit">
          ${editing ? "Save changes" : "Add game"}
        </button>
        <button id="game-cancel" class="secondary-button" type="button">Cancel</button>
        ${editing
          ? `<button id="delete-game" class="secondary-button"
              type="button">Delete game</button>`
          : ""}
      </div>

      <p id="game-form-message" class="message" role="status"
        aria-live="polite"></p>
    </form>
  `;

  const form = container.querySelector<HTMLFormElement>("#game-form")!;
  const get = <T extends HTMLElement>(id: string) =>
    form.querySelector<T>(`#${id}`)!;

  const seasonSelect = get<HTMLSelectElement>("game-season");
  const divisionSelect = get<HTMLSelectElement>("game-division");
  const homeSelect = get<HTMLSelectElement>("game-home");
  const awaySelect = get<HTMLSelectElement>("game-away");
  const homeLabel = get<HTMLInputElement>("game-home-label");
  const awayLabel = get<HTMLInputElement>("game-away-label");
  const fieldSelect = get<HTMLSelectElement>("game-field");
  const message = get<HTMLElement>("game-form-message");

  const say = (text: string, kind: "error" | "success" = "error") => {
    message.textContent = text;
    message.className = `message ${kind}`;
  };

  // ---- the lists that depend on one another
  seasonSelect.value = game?.season_id ?? options.defaultSeasonId;

  const fillDivisions = (selected: string) => {
    divisionSelect.innerHTML = context.divisions
      .filter((division) => division.is_active || division.id === selected)
      .map((division) => `
        <option value="${escapeHtml(division.id)}">${escapeHtml(division.name)}</option>
      `).join("");
    divisionSelect.value = context.divisions.some((d) => d.id === selected)
      ? selected
      : divisionSelect.options[0]?.value ?? "";
  };

  // Only teams of the chosen season AND division can play in the game.
  const fillTeams = (
    select: HTMLSelectElement,
    label: HTMLInputElement,
    selectedTeamId: string | null,
    labelText: string | null
  ) => {
    const teams = context.teams
      .filter(
        (team) =>
          team.season_id === seasonSelect.value &&
          team.division_id === divisionSelect.value &&
          (team.is_active || team.id === selectedTeamId)
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    select.innerHTML = `
      <option value="">Choose a team</option>
      ${teams.map((team) => `
        <option value="${escapeHtml(team.id)}">${escapeHtml(team.name)}</option>
      `).join("")}
      <option value="${UNDECIDED}">Not decided yet (bracket slot)</option>
    `;

    if (labelText !== null) {
      select.value = UNDECIDED;
      label.value = labelText;
    } else if (selectedTeamId && teams.some((team) => team.id === selectedTeamId)) {
      select.value = selectedTeamId;
    } else {
      select.value = "";
    }

    label.hidden = select.value !== UNDECIDED;
  };

  const fillFields = () => {
    const current = game?.location_id ?? "";
    fieldSelect.innerHTML = `
      <option value="">Choose a field</option>
      ${context.locations
        .filter((location) => location.is_active || location.id === current)
        .map((location) => `
          <option value="${escapeHtml(location.id)}">${escapeHtml(location.name)}</option>
        `).join("")}
    `;
    fieldSelect.value = current;
  };

  fillDivisions(game?.division_id ?? options.defaultDivisionId);
  fillTeams(homeSelect, homeLabel, game?.home_team_id ?? null, game?.home_label ?? null);
  fillTeams(awaySelect, awayLabel, game?.away_team_id ?? null, game?.away_label ?? null);
  fillFields();

  // Changing the season or division changes which teams are available.
  const refillTeams = () => {
    fillTeams(
      homeSelect, homeLabel,
      homeSelect.value && homeSelect.value !== UNDECIDED ? homeSelect.value : null,
      homeSelect.value === UNDECIDED ? homeLabel.value : null
    );
    fillTeams(
      awaySelect, awayLabel,
      awaySelect.value && awaySelect.value !== UNDECIDED ? awaySelect.value : null,
      awaySelect.value === UNDECIDED ? awayLabel.value : null
    );
  };

  seasonSelect.addEventListener("change", refillTeams);
  divisionSelect.addEventListener("change", refillTeams);

  for (const [select, label] of [[homeSelect, homeLabel], [awaySelect, awayLabel]] as const) {
    select.addEventListener("change", () => {
      label.hidden = select.value !== UNDECIDED;
      if (!label.hidden) label.focus();
    });
  }

  // ---- save
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void save();
  });

  async function save() {
    const startsAt = fromLocalInput(get<HTMLInputElement>("game-start").value);
    const minutes = Number(get<HTMLInputElement>("game-duration").value);
    const externalId = get<HTMLInputElement>("game-external-id").value.trim();
    const notes = get<HTMLTextAreaElement>("game-notes").value.trim();

    const side = (
      select: HTMLSelectElement,
      label: HTMLInputElement,
      which: string
    ): { team: string | null; label: string | null } | string => {
      if (select.value === UNDECIDED) {
        const text = label.value.trim();
        return text
          ? { team: null, label: text }
          : `Type a short label for the ${which} side (for example "Winner of Game 3").`;
      }
      return select.value
        ? { team: select.value, label: null }
        : `Choose the ${which} team, or mark it as not decided yet.`;
    };

    const home = side(homeSelect, homeLabel, "home");
    const away = side(awaySelect, awayLabel, "away");

    if (!seasonSelect.value) return say("Choose a season.");
    if (!divisionSelect.value) return say("Choose a division.");
    if (typeof home === "string") return say(home);
    if (typeof away === "string") return say(away);
    if (home.team && home.team === away.team) return say("A team cannot play itself.");
    if (!fieldSelect.value) return say("Choose a field.");
    if (!startsAt) return say("Enter the date and time the game starts.");
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 600) {
      return say("The length must be a whole number of minutes between 15 and 600.");
    }

    const payload = {
      season_id: seasonSelect.value,
      division_id: divisionSelect.value,
      game_type: get<HTMLSelectElement>("game-type").value,
      home_team_id: home.team,
      away_team_id: away.team,
      home_label: home.label,
      away_label: away.label,
      location_id: fieldSelect.value,
      starts_at: startsAt,
      ends_at: addMinutes(startsAt, minutes),
      status: get<HTMLSelectElement>("game-status").value,
      notes: notes || null,
      external_game_id: externalId || null,
    };

    const saveButton = get<HTMLButtonElement>("game-save");
    saveButton.disabled = true;

    // For a change, ask for the changed row back: if the database allowed
    // the request but changed nothing (no permission, or the game was just
    // removed by someone else), that must not be reported as saved.
    const result = game
      ? await supabase.from("games").update(payload).eq("id", game.id).select("id")
      : await supabase.from("games").insert(payload);

    saveButton.disabled = false;

    if (result.error) return say(friendlyError(result.error));

    if (game && (!result.data || result.data.length === 0)) {
      return say(
        "The game was not saved. You may not have permission, or someone " +
        "else removed it. Refresh the list and try again."
      );
    }

    options.onDone(game ? "Game saved." : "Game added.");
  }

  form.querySelector("#game-cancel")?.addEventListener("click", () => {
    options.onDone(null);
  });

  // ---- delete
  form.querySelector("#delete-game")?.addEventListener("click", () => {
    if (!game) return;

    const extra = options.assignmentCount
      ? ` Its ${options.assignmentCount} umpire assignment${options.assignmentCount === 1 ? "" : "s"} will be removed too.`
      : "";
    const advice = game.external_game_id
      ? " This game is on the master calendar, so importing the spreadsheet again would add it back. Setting the status to Canceled is usually better."
      : "";

    if (!window.confirm(`Delete this game for good?${extra}${advice}`)) return;

    void (async () => {
      const { data: deleted, error } = await supabase
        .from("games")
        .delete()
        .eq("id", game.id)
        .select("id");

      if (error) return say(`The game could not be deleted: ${error.message}`);

      if (!deleted || deleted.length === 0) {
        return say(
          "The game was not deleted. You may not have permission, or " +
          "someone else already removed it."
        );
      }

      options.onDone("Game deleted.");
    })();
  });
}
