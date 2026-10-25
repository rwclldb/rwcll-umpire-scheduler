import { escapeHtml } from "./ui";
import { loadContext, loadSeasonGames } from "./games/data";
import { renderGameForm } from "./games/form";
import { formatDate, formatTime, localDateKey } from "./games/format";
import { computeWarnings } from "./games/warnings";
import type { Warning } from "./games/warnings";
import type {
  Assignment,
  Game,
  GameStatus,
  SeasonOption,
} from "./games/types";

type Filters = {
  seasonId: string;
  divisionId: string;
  fieldId: string;
  from: string; // a day, "2026-04-18", or empty
  to: string;
  status: string; // "not_canceled", "all", or one status
  search: string;
  onlyWarnings: boolean;
};

// Kept while the person moves between pages, so they come back to the same view.
let remembered: Filters | null = null;

const STATUS_LABELS: Record<GameStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  canceled: "Canceled",
  completed: "Completed",
};

const WARNING_LABELS: Record<Warning["kind"], string> = {
  no_umpire: "",
  field_conflict: "Field conflict: ",
  team_conflict: "Team conflict: ",
};

// The season to show first: the active one that starts latest.
function defaultSeasonId(seasons: SeasonOption[]): string {
  const ordered = [...seasons].sort((a, b) =>
    (b.starts_on ?? "").localeCompare(a.starts_on ?? "") ||
    a.name.localeCompare(b.name)
  );
  return (ordered.find((season) => season.is_active) ?? ordered[0]).id;
}

export async function renderGames(container: HTMLElement): Promise<void> {
  container.innerHTML = `
    <section class="games-page">
      <h2>Games</h2>
      <p class="directory-description">Loading games&hellip;</p>
    </section>
  `;

  const { context, error } = await loadContext();

  if (!context) {
    container.innerHTML = `
      <section class="games-page">
        <h2>Games</h2>
        <p class="message error">Unable to load games. Refresh and try again.</p>
      </section>
    `;
    console.error("Games context failed:", error);
    return;
  }

  if (context.seasons.length === 0) {
    container.innerHTML = `
      <section class="games-page">
        <h2>Games</h2>
        <p class="directory-description">
          There are no seasons yet. Add a season, divisions, teams and fields
          under League Setup first, then come back to add games.
        </p>
      </section>
    `;
    return;
  }

  if (!remembered) {
    remembered = {
      seasonId: defaultSeasonId(context.seasons),
      divisionId: "",
      fieldId: "",
      from: localDateKey(new Date().toISOString()),
      to: "",
      status: "not_canceled",
      search: "",
      onlyWarnings: false,
    };
  }

  const filters = remembered;
  if (!context.seasons.some((season) => season.id === filters.seasonId)) {
    filters.seasonId = defaultSeasonId(context.seasons);
  }

  const teamNames = new Map(context.teams.map((team) => [team.id, team.name]));
  const fieldNames = new Map(context.locations.map((field) => [field.id, field.name]));
  const divisionNames = new Map(context.divisions.map((division) => [division.id, division.name]));

  let games: Game[] = [];
  let assignments: Assignment[] = [];

  const sideName = (game: Game, side: "home" | "away"): string =>
    side === "home"
      ? (game.home_team_id ? teamNames.get(game.home_team_id) : game.home_label) ?? "?"
      : (game.away_team_id ? teamNames.get(game.away_team_id) : game.away_label) ?? "?";

  const sidesText = (game: Game) =>
    `${sideName(game, "home")} vs ${sideName(game, "away")}`;

  // ---------------------------------------------------------------- page
  container.innerHTML = `
    <section class="games-page">
      <h2>Games</h2>
      <p class="directory-description">
        This is a copy of the master calendar. When the master calendar
        changes, change the game here too (or import the updated spreadsheet).
        Times are shown in your computer's time zone.
      </p>

      <div class="game-filters">
        <div>
          <label for="gf-season">Season</label>
          <select id="gf-season">
            ${context.seasons.map((season) => `
              <option value="${escapeHtml(season.id)}" ${season.id === filters.seasonId ? "selected" : ""}>${escapeHtml(season.name)}</option>
            `).join("")}
          </select>
        </div>
        <div>
          <label for="gf-division">Division</label>
          <select id="gf-division">
            <option value="">All divisions</option>
            ${context.divisions.map((division) => `
              <option value="${escapeHtml(division.id)}" ${division.id === filters.divisionId ? "selected" : ""}>${escapeHtml(division.name)}</option>
            `).join("")}
          </select>
        </div>
        <div>
          <label for="gf-field">Field</label>
          <select id="gf-field">
            <option value="">All fields</option>
            ${context.locations.map((field) => `
              <option value="${escapeHtml(field.id)}" ${field.id === filters.fieldId ? "selected" : ""}>${escapeHtml(field.name)}</option>
            `).join("")}
          </select>
        </div>
        <div>
          <label for="gf-from">From</label>
          <input id="gf-from" type="date" value="${escapeHtml(filters.from)}" />
        </div>
        <div>
          <label for="gf-to">To</label>
          <input id="gf-to" type="date" value="${escapeHtml(filters.to)}" />
        </div>
        <div>
          <label for="gf-status">Status</label>
          <select id="gf-status">
            <option value="not_canceled" ${filters.status === "not_canceled" ? "selected" : ""}>All except canceled</option>
            <option value="all" ${filters.status === "all" ? "selected" : ""}>All</option>
            ${(Object.keys(STATUS_LABELS) as GameStatus[]).map((status) => `
              <option value="${status}" ${filters.status === status ? "selected" : ""}>${STATUS_LABELS[status]}</option>
            `).join("")}
          </select>
        </div>
        <div class="game-filter-wide">
          <label for="gf-search">Search</label>
          <input id="gf-search" type="search" value="${escapeHtml(filters.search)}"
            placeholder="Team, field, umpire or master Game ID" />
        </div>
        <label class="season-checkbox-label game-filter-wide">
          <input id="gf-warnings" type="checkbox" ${filters.onlyWarnings ? "checked" : ""} />
          Only games with warnings
        </label>
      </div>

      <div class="account-actions">
        <button id="add-game" class="primary-button" type="button">Add game</button>
        <button id="refresh-games" class="secondary-button" type="button">Refresh</button>
      </div>

      <p id="games-message" class="message" role="status" aria-live="polite"></p>

      <div id="game-form-container"></div>

      <p id="game-summary" class="game-summary" role="status" aria-live="polite"></p>

      <div id="game-list"></div>
    </section>
  `;

  const get = <T extends HTMLElement>(id: string) =>
    container.querySelector<T>(`#${id}`)!;

  const say = (text: string, kind: "error" | "success" = "success") => {
    const element = get<HTMLElement>("games-message");
    element.textContent = text;
    element.className = text ? `message ${kind}` : "message";
  };

  // ------------------------------------------------------------ the list
  const matchesFilters = (game: Game): boolean => {
    if (game.season_id !== filters.seasonId) return false;
    if (filters.divisionId && game.division_id !== filters.divisionId) return false;
    if (filters.fieldId && game.location_id !== filters.fieldId) return false;

    const day = localDateKey(game.starts_at);
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;

    if (filters.status === "not_canceled" && game.status === "canceled") return false;
    if (
      filters.status !== "not_canceled" &&
      filters.status !== "all" &&
      game.status !== filters.status
    ) {
      return false;
    }

    const query = filters.search.trim().toLowerCase();
    if (query) {
      const umpires = assignments
        .filter((row) => row.game_id === game.id)
        .map((row) => context.umpireNames.get(row.umpire_id) ?? "");
      const haystack = [
        sideName(game, "home"),
        sideName(game, "away"),
        fieldNames.get(game.location_id) ?? "",
        divisionNames.get(game.division_id) ?? "",
        game.external_game_id ?? "",
        ...umpires,
      ].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  };

  const renderList = () => {
    const assignedCount = new Map<string, number>();
    const umpiresByGame = new Map<string, { plate?: string; field?: string }>();

    for (const row of assignments) {
      assignedCount.set(row.game_id, (assignedCount.get(row.game_id) ?? 0) + 1);
      const entry = umpiresByGame.get(row.game_id) ?? {};
      entry[row.position] = context.umpireNames.get(row.umpire_id) ?? "Unknown umpire";
      umpiresByGame.set(row.game_id, entry);
    }

    // Warnings look at the whole season, so a conflict with a game outside
    // the current filter is still found.
    const warnings = computeWarnings({
      games,
      assignedCount,
      now: new Date(),
      teamName: (id) => teamNames.get(id) ?? "A team",
      fieldName: (id) => fieldNames.get(id) ?? "The field",
      sidesText,
    });

    const visible = games
      .filter(matchesFilters)
      .filter((game) => !filters.onlyWarnings || (warnings.get(game.id)?.length ?? 0) > 0)
      .sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at) ||
        (fieldNames.get(a.location_id) ?? "").localeCompare(fieldNames.get(b.location_id) ?? "")
      );

    // ---- summary
    const count = (kind: Warning["kind"]) =>
      visible.filter((game) => warnings.get(game.id)?.some((w) => w.kind === kind)).length;
    const noUmpire = count("no_umpire");
    const fieldConflicts = count("field_conflict");
    const teamConflicts = count("team_conflict");

    const parts = [
      noUmpire ? `<strong>${noUmpire}</strong> ${noUmpire === 1 ? "needs" : "need"} an umpire` : "",
      fieldConflicts ? `<strong>${fieldConflicts}</strong> with a field conflict` : "",
      teamConflicts ? `<strong>${teamConflicts}</strong> with a team conflict` : "",
    ].filter(Boolean);

    const summary = get<HTMLElement>("game-summary");
    summary.className = parts.length ? "game-summary game-summary-warn" : "game-summary";
    summary.innerHTML =
      `${visible.length} ${visible.length === 1 ? "game" : "games"} shown` +
      (parts.length ? ` &middot; ${parts.join(" &middot; ")}` : " &middot; no warnings");

    // ---- table
    const list = get<HTMLElement>("game-list");

    if (visible.length === 0) {
      list.innerHTML = `
        <p class="directory-empty">
          ${games.length === 0
            ? "There are no games in this season yet. Add a game above."
            : "No games match these filters."}
        </p>
      `;
      return;
    }

    list.innerHTML = `
      <div class="table-scroll">
        <table class="umpire-table game-table" aria-label="Games">
          <thead>
            <tr>
              <th>When</th>
              <th>Game</th>
              <th>Umpires</th>
              <th>Status</th>
              <th>Warnings</th>
              <th><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            ${visible.map((game) => {
              const list = warnings.get(game.id) ?? [];
              const umpires = umpiresByGame.get(game.id);
              return `
                <tr class="${list.length ? "game-row-warn" : ""} ${game.status === "canceled" ? "game-row-canceled" : ""}">
                  <td class="game-when">
                    <span class="game-date">${escapeHtml(formatDate(game.starts_at))}</span><br>
                    <span class="game-time">${escapeHtml(formatTime(game.starts_at))} &ndash; ${escapeHtml(formatTime(game.ends_at))}</span>
                  </td>
                  <td class="game-main">
                    <span class="game-sides">${escapeHtml(sideName(game, "home"))} vs ${escapeHtml(sideName(game, "away"))}</span>
                    ${game.game_type !== "regular" ? `<span class="game-type">${escapeHtml(game.game_type)}</span>` : ""}<br>
                    <span class="game-where">${escapeHtml(divisionNames.get(game.division_id) ?? "")} &middot; ${escapeHtml(fieldNames.get(game.location_id) ?? "")}</span>
                  </td>
                  <td class="game-umpires" data-label="Umpires">${umpires
                    ? [
                        umpires.plate ? `Plate: ${escapeHtml(umpires.plate)}` : "",
                        umpires.field ? `Field: ${escapeHtml(umpires.field)}` : "",
                      ].filter(Boolean).join("<br>")
                    : "&mdash;"}</td>
                  <td class="game-status" data-label="Status">
                    <span class="game-status-text">${escapeHtml(STATUS_LABELS[game.status])}</span>
                    ${game.external_game_id
                      ? `<br><span class="game-master" title="Master calendar Game ID">${escapeHtml(game.external_game_id)}</span>`
                      : ""}
                  </td>
                  <td class="game-warn-cell" data-label="Warnings">${list.length
                    ? `<ul class="game-warnings">${list.map((warning) => `
                        <li class="game-warning game-warning-${warning.kind}">${escapeHtml(WARNING_LABELS[warning.kind] + warning.text)}</li>
                      `).join("")}</ul>`
                    : ""}</td>
                  <td><button type="button" class="secondary-button"
                    data-edit-game="${escapeHtml(game.id)}">Edit</button></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  // ------------------------------------------------------------- loading
  const reload = async (): Promise<void> => {
    get<HTMLElement>("game-list").innerHTML =
      `<p class="directory-description">Loading games&hellip;</p>`;

    const result = await loadSeasonGames(filters.seasonId);

    if (result.error) {
      games = [];
      assignments = [];
      get<HTMLElement>("game-summary").textContent = "";
      get<HTMLElement>("game-list").innerHTML =
        `<p class="message error">Unable to load the games. Press Refresh to try again.</p>`;
      console.error("Games load failed:", result.error);
      return;
    }

    games = result.games;
    assignments = result.assignments;
    renderList();
  };

  // ------------------------------------------------------------- the form
  const closeForm = () => {
    get<HTMLElement>("game-form-container").innerHTML = "";
  };

  const openForm = (game: Game | null) => {
    const formContainer = get<HTMLElement>("game-form-container");

    renderGameForm(formContainer, context, {
      game,
      defaultSeasonId: filters.seasonId,
      defaultDivisionId: filters.divisionId || context.divisions[0]?.id || "",
      assignmentCount: game
        ? assignments.filter((row) => row.game_id === game.id).length
        : 0,
      onDone: (text) => {
        closeForm();
        if (text) {
          say(text);
          void reload();
        }
      },
    });

    formContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // -------------------------------------------------------------- events
  const bind = (id: string, event: string, handler: (target: HTMLInputElement & HTMLSelectElement) => void) => {
    get<HTMLElement>(id).addEventListener(event, (e) =>
      handler(e.target as HTMLInputElement & HTMLSelectElement)
    );
  };

  bind("gf-season", "change", (t) => { filters.seasonId = t.value; closeForm(); say(""); void reload(); });
  bind("gf-division", "change", (t) => { filters.divisionId = t.value; renderList(); });
  bind("gf-field", "change", (t) => { filters.fieldId = t.value; renderList(); });
  bind("gf-from", "input", (t) => { filters.from = t.value; renderList(); });
  bind("gf-to", "input", (t) => { filters.to = t.value; renderList(); });
  bind("gf-status", "change", (t) => { filters.status = t.value; renderList(); });
  bind("gf-search", "input", (t) => { filters.search = t.value; renderList(); });
  bind("gf-warnings", "change", (t) => { filters.onlyWarnings = t.checked; renderList(); });

  get<HTMLElement>("add-game").addEventListener("click", () => { say(""); openForm(null); });
  get<HTMLElement>("refresh-games").addEventListener("click", () => { say(""); void reload(); });

  get<HTMLElement>("game-list").addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>("[data-edit-game]");
    if (!button) return;

    const game = games.find((item) => item.id === button.dataset.editGame);
    if (game) { say(""); openForm(game); }
  });

  await reload();
}

// Forgets the filters, so the next person (after a sign-out) starts fresh.
export function resetGamesView(): void {
  remembered = null;
}
