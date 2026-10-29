import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { detectColumns, FIELD_LABELS, missingColumns, readRows } from "./calendar";
import type { CalendarRow, ColumnMap, FieldKey } from "./calendar";
import { parseCsv } from "./csv";
import { loadSeasonGames } from "./data";
import { startOfToday } from "./format";
import { cleanDivisionLabel } from "./matching";
import { buildPlan, defaultSettings, locationKey, summarize } from "./plan";
import type { ImportSettings, MatchContext, Plan } from "./plan";
import type { Game, GamesContext } from "./types";
import { appNow } from "../clock";

export type ImporterOptions = {
  context: GamesContext;
  seasonId: string;
  // called after a successful import, with a message to show
  onImported: (message: string) => void;
  onClose: () => void;
};

const NEW = "__new__";
const LABEL = "__label__";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// Shown in the order the columns are explained to the person.
const COLUMN_ORDER: FieldKey[] = [
  "externalId", "event", "group", "home", "away", "date", "start", "end",
  "field", "location", "status",
];

function makeId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// The database's refusal, in a sentence that says what to do.
function explain(message: string): string {
  let hint = "";

  if (message.includes("games_season_external_id_unique")) {
    hint = " Another game in this season already has that master Game ID.";
  } else if (message.includes("games_home_team_in_division") || message.includes("games_away_team_in_division")) {
    hint = " A team is not in that game's division.";
  } else if (message.includes("games_home_team_in_season") || message.includes("games_away_team_in_season")) {
    hint = " A team is not in this season.";
  } else if (/row-level security|permission denied/i.test(message)) {
    hint = " You may not have permission to import games.";
  }

  return `Nothing was imported. ${message}${hint}`;
}

export function renderImporter(container: HTMLElement, options: ImporterOptions): void {
  const { context } = options;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  let seasonId = options.seasonId;
  let table: string[][] | null = null;
  let columns: ColumnMap | null = null;
  let rows: CalendarRow[] = [];
  let settings: ImportSettings | null = null;
  let existing: Game[] = [];
  let assignedCount = new Map<string, number>();
  let plan: Plan | null = null;
  let busy = false;

  container.innerHTML = `
    <section class="importer" id="importer">
      <h3>Import games from a spreadsheet</h3>
      <p class="directory-description">
        Choose the master calendar file (saved as CSV). Nothing is changed
        until you press <strong>Import</strong> at the bottom. Games are matched
        on the master Game ID: games already here are updated, new ones are
        added, and nothing is added twice. Times in the file are read as
        <strong>${escapeHtml(zone)}</strong> time (your computer's time zone).
      </p>

      <label for="imp-season">Import into season</label>
      <select id="imp-season">
        ${context.seasons.map((season) => `
          <option value="${escapeHtml(season.id)}" ${season.id === seasonId ? "selected" : ""}>${escapeHtml(season.name)}</option>
        `).join("")}
      </select>

      <label for="imp-file">Master calendar file (.csv)</label>
      <input id="imp-file" type="file" accept=".csv,text/csv" />

      <p id="imp-message" class="message" role="status" aria-live="polite"></p>

      <div id="imp-body"></div>

      <div class="account-actions">
        <button id="imp-close" class="secondary-button" type="button">Close</button>
      </div>
    </section>
  `;

  const root = container.querySelector<HTMLElement>("#importer")!;
  const body = root.querySelector<HTMLElement>("#imp-body")!;
  const messageEl = root.querySelector<HTMLElement>("#imp-message")!;

  const say = (text: string, kind: "error" | "success" = "error") => {
    messageEl.textContent = text;
    messageEl.className = text ? `message ${kind}` : "message";
  };

  const matchContext = (): MatchContext => ({
    seasonId,
    divisions: context.divisions,
    teams: context.teams,
    locations: context.locations,
  });

  // ------------------------------------------------------ loading and planning
  let ready: Promise<void> = Promise.resolve();

  const loadExisting = async () => {
    const result = await loadSeasonGames(seasonId);
    if (result.error) {
      existing = [];
      assignedCount = new Map();
      say("Could not read this season's games, so changes cannot be worked out. Close and try again.");
      return;
    }

    existing = result.games;
    assignedCount = new Map();
    for (const row of result.assignments) {
      assignedCount.set(row.game_id, (assignedCount.get(row.game_id) ?? 0) + 1);
    }
  };

  const recompute = () => {
    if (!settings) return;
    plan = buildPlan({
      rows,
      settings,
      context: matchContext(),
      existingGames: existing,
      assignedCount,
      newId: makeId,
    });
  };

  // Reads the file again with the current columns and makes fresh first guesses.
  const rebuild = () => {
    if (!table || !columns) return;

    const missing = missingColumns(columns);
    rows = missing.length ? [] : readRows(table, columns);
    settings = missing.length ? null : defaultSettings(rows, matchContext());
    plan = null;

    if (settings) recompute();
    renderBody();
  };

  // --------------------------------------------------------------- rendering
  const gamesWord = (n: number) => (n === 1 ? "game" : "games");

  const renderBody = () => {
    if (!table || !columns) {
      body.innerHTML = "";
      return;
    }

    const headers = table[0];
    const missing = missingColumns(columns);

    const columnsHtml = `
      <details id="imp-columns" ${missing.length ? "open" : ""}>
        <summary>Columns in the file (${headers.length})</summary>
        ${missing.length
          ? `<p class="message error">These could not be found, so please choose them below: ${missing.map((key) => escapeHtml(FIELD_LABELS[key])).join(", ")}.</p>`
          : `<p class="directory-description">These were recognised from the headings. Change one only if it is wrong.</p>`}
        <div class="table-scroll">
          <table class="umpire-table imp-table" aria-label="Columns">
            <thead><tr><th>Needed for</th><th>Column in your file</th></tr></thead>
            <tbody>
              ${COLUMN_ORDER.map((key) => `
                <tr>
                  <td data-label="Needed for">${escapeHtml(FIELD_LABELS[key])}</td>
                  <td data-label="Column in your file">
                    <select data-column="${key}" aria-label="${escapeHtml(FIELD_LABELS[key])}">
                      <option value="">(none)</option>
                      ${headers.map((header, index) => `
                        <option value="${index}" ${columns![key] === index ? "selected" : ""}>${escapeHtml(header)}</option>
                      `).join("")}
                    </select>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </details>
    `;

    if (missing.length || !settings) {
      body.innerHTML = columnsHtml;
      return;
    }

    const summary = summarize(rows, settings);

    const eventsHtml = `
      <h4>What is in the file</h4>
      <p class="directory-description">
        ${rows.length} rows. Practices (rows with "Practice" where the
        opponent would be) are skipped automatically. Untick any other kind
        of row you do not want as games.
      </p>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Kinds of rows">
          <thead><tr><th>Kind of row</th><th>Rows</th><th>Import as games</th></tr></thead>
          <tbody>
            ${summary.events.map((event) => {
              const gameRows = event.rows - event.practiceRows;
              return `
                <tr>
                  <td data-label="Kind of row">${escapeHtml(event.label || "(no name)")}</td>
                  <td data-label="Rows">${event.rows}${event.practiceRows ? ` (${event.practiceRows} practice)` : ""}</td>
                  <td data-label="Import as games">
                    ${gameRows === 0
                      ? `<span class="season-dates">Practices: skipped</span>`
                      : `<label class="season-checkbox-label"><input type="checkbox" data-event="${escapeHtml(event.label)}" ${event.include ? "checked" : ""} /> Import</label>`}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    const divisionsHtml = summary.divisions.length ? `
      <h4>Divisions</h4>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Divisions">
          <thead><tr><th>In the file</th><th>Games</th><th>Your division</th></tr></thead>
          <tbody>
            ${summary.divisions.map((item) => `
              <tr>
                <td data-label="In the file">${escapeHtml(cleanDivisionLabel(item.label) || item.label)}</td>
                <td data-label="Games">${item.games}</td>
                <td data-label="Your division">
                  <select data-division="${escapeHtml(item.label)}" aria-label="Division for ${escapeHtml(item.label)}">
                    <option value="">Choose a division&hellip;</option>
                    ${context.divisions.map((division) => `
                      <option value="${escapeHtml(division.id)}" ${settings!.divisionByLabel[item.label] === division.id ? "selected" : ""}>${escapeHtml(division.name)}</option>
                    `).join("")}
                  </select>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    ` : "";

    const fieldsHtml = summary.fields.length ? `
      <h4>Fields</h4>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Fields">
          <thead><tr><th>In the file</th><th>Games</th><th>Your field</th></tr></thead>
          <tbody>
            ${summary.fields.map((item) => {
              const target = settings!.locationByKey[item.key];
              const isNew = target?.kind === "new";
              return `
                <tr>
                  <td data-label="In the file">${escapeHtml(item.location || item.field)}${item.location && item.field ? ` <span class="season-dates">(${escapeHtml(item.field)})</span>` : ""}</td>
                  <td data-label="Games">${item.games}</td>
                  <td data-label="Your field">
                    <select data-field="${escapeHtml(item.key)}" aria-label="Field for ${escapeHtml(item.location || item.field)}">
                      <option value="${NEW}" ${isNew ? "selected" : ""}>Create a new field</option>
                      ${context.locations.map((location) => `
                        <option value="${escapeHtml(location.id)}" ${target?.kind === "existing" && target.id === location.id ? "selected" : ""}>${escapeHtml(location.name)}</option>
                      `).join("")}
                    </select>
                    <input type="text" data-field-name="${escapeHtml(item.key)}" maxlength="100"
                      value="${escapeHtml(target?.kind === "new" ? target.name : "")}"
                      aria-label="Name of the new field" ${isNew ? "" : "hidden"} />
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : "";

    const seasonTeams = context.teams
      .filter((team) => team.season_id === seasonId)
      .sort((a, b) => a.name.localeCompare(b.name));

    const teamsHtml = summary.teams.length ? `
      <h4>Teams</h4>
      <p class="directory-description">
        Teams that match one of this season's teams are matched for you.
        Names that look like league teams are set to be created; other names
        (other clubs) are kept as plain names, with no team record.
      </p>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Teams">
          <thead><tr><th>In the file</th><th>Games</th><th>Your team</th></tr></thead>
          <tbody>
            ${summary.teams.map((item) => {
              const target = settings!.teamByKey[item.key];
              return `
                <tr>
                  <td data-label="In the file">${escapeHtml(item.name)}</td>
                  <td data-label="Games">${item.games}</td>
                  <td data-label="Your team">
                    <select data-team="${escapeHtml(item.key)}" aria-label="Team for ${escapeHtml(item.name)}">
                      <option value="${NEW}" ${target?.kind === "new" ? "selected" : ""}>Create a new team</option>
                      <option value="${LABEL}" ${target?.kind === "label" ? "selected" : ""}>Outside team (name only)</option>
                      ${seasonTeams.map((team) => `
                        <option value="${escapeHtml(team.id)}" ${target?.kind === "existing" && target.id === team.id ? "selected" : ""}>${escapeHtml(team.name)}</option>
                      `).join("")}
                    </select>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : "";

    body.innerHTML = `
      ${columnsHtml}
      ${eventsHtml}
      ${divisionsHtml}
      ${fieldsHtml}
      ${teamsHtml}
      <div id="imp-preview"></div>
    `;

    renderPreview();
  };

  const renderPreview = () => {
    const el = body.querySelector<HTMLElement>("#imp-preview");
    if (!el || !plan) return;

    const p = plan;
    const todo = p.games.length;
    const changed = p.games.filter((game) => game.op === "update");
    const added = p.games.filter((game) => game.op === "insert");

    el.innerHTML = `
      <h4>Preview</h4>
      <p id="imp-summary" class="imp-summary">
        ${p.considered} ${gamesWord(p.considered)} found in the file${p.practicesSkipped ? `, ${p.practicesSkipped} practice rows skipped` : ""}${p.eventsSkipped ? `, ${p.eventsSkipped} rows skipped (switched off)` : ""}.
      </p>

      <ul class="imp-badges">
        <li class="imp-badge imp-new"><strong id="imp-count-new">${p.newCount}</strong> new</li>
        <li class="imp-badge imp-changed"><strong id="imp-count-changed">${p.changedCount}</strong> changed</li>
        <li class="imp-badge"><strong id="imp-count-unchanged">${p.unchangedCount}</strong> unchanged</li>
        <li class="imp-badge ${p.problems.length ? "imp-problem" : ""}"><strong id="imp-count-problems">${p.problems.length}</strong> ${p.problems.length === 1 ? "problem" : "problems"}</li>
        <li class="imp-badge ${p.missing.length ? "imp-changed" : ""}"><strong id="imp-count-missing">${p.missing.length}</strong> not in the file</li>
      </ul>

      ${p.newTeams.length || p.newLocations.length ? `
        <p id="imp-creates" class="imp-creates">
          Will also be created: ${[
            p.newTeams.length ? `${p.newTeams.length} new ${p.newTeams.length === 1 ? "team" : "teams"}` : "",
            p.newLocations.length ? `${p.newLocations.length} new ${p.newLocations.length === 1 ? "field" : "fields"}` : "",
          ].filter(Boolean).join(" and ")}.
        </p>
        <details>
          <summary>Show what will be created</summary>
          <ul class="imp-list">
            ${p.newTeams.map((team) => `<li>Team: ${escapeHtml(team.name)} <span class="season-dates">(${escapeHtml(context.divisions.find((d) => d.id === team.divisionId)?.name ?? "")})</span></li>`).join("")}
            ${p.newLocations.map((location) => `<li>Field: ${escapeHtml(location.name)}</li>`).join("")}
          </ul>
        </details>
      ` : ""}

      ${p.problems.length ? `
        <div class="imp-section imp-problems">
          <h5>${p.problems.length} ${p.problems.length === 1 ? "row has" : "rows have"} a problem and will be skipped</h5>
          <ul class="imp-list">
            ${p.problems.map((problem) => `
              <li>Line ${problem.line}${problem.externalId ? ` (Game ID ${escapeHtml(problem.externalId)})` : ""}: ${problem.messages.map(escapeHtml).join(" ")}</li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${changed.length ? `
        <div class="imp-section" id="imp-changed-list">
          <h5>${changed.length} ${gamesWord(changed.length)} will be changed</h5>
          ${p.changedWithUmpires ? `<p class="imp-warn">${p.changedWithUmpires} of these ${p.changedWithUmpires === 1 ? "has" : "have"} umpires assigned, so they may need to be told.</p>` : ""}
          <ul class="imp-list">
            ${changed.map((game) => `
              <li>
                <strong>${escapeHtml(game.title)}</strong> <span class="season-dates">(Game ID ${escapeHtml(game.externalId)})</span>
                ${game.hasUmpires ? `<span class="imp-umpires">umpires assigned</span>` : ""}
                <ul>${game.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul>
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}

      ${added.length ? `
        <details class="imp-section" id="imp-new-list">
          <summary>${added.length} new ${gamesWord(added.length)}</summary>
          <ul class="imp-list">
            ${added.map((game) => `
              <li><strong>${escapeHtml(game.title)}</strong> <span class="season-dates">${escapeHtml(game.when)}, ${escapeHtml(game.where)} (Game ID ${escapeHtml(game.externalId)})</span></li>
            `).join("")}
          </ul>
        </details>
      ` : ""}

      ${p.missing.length ? `
        <div class="imp-section" id="imp-missing-list">
          <h5>${p.missing.length} ${gamesWord(p.missing.length)} here ${p.missing.length === 1 ? "is" : "are"} not in the file</h5>
          <p class="directory-description">
            They fall on the same days and in the same divisions as the file.
            They have <strong>not</strong> been touched. If they were removed from
            the master calendar, open each one on the Games tab and set it to Canceled.
          </p>
          <ul class="imp-list">
            ${p.missing.map((game) => `<li>Game ID ${escapeHtml(game.external_game_id ?? "")}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      <div class="account-actions">
        <button id="imp-apply" class="primary-button" type="button" ${todo === 0 || busy ? "disabled" : ""}>
          ${todo === 0
            ? "Nothing to import"
            : `Import ${todo} ${gamesWord(todo)} (${p.newCount} new, ${p.changedCount} changed)`}
        </button>
      </div>
    `;
  };

  // ------------------------------------------------------------------ actions
  const apply = async () => {
    if (!plan || busy || plan.games.length === 0) return;

    if (
      plan.problems.length > 0 &&
      !window.confirm(
        `${plan.problems.length} ${plan.problems.length === 1 ? "row has a problem and will" : "rows have problems and will"} be skipped. Import the other games anyway?`
      )
    ) {
      return;
    }

    busy = true;
    say("Importing\u2026", "success");
    renderPreview();

    const { data, error } = await supabase.rpc("import_games", {
      p_season_id: seasonId,
      p_new_teams: plan.newTeams.map((team) => ({
        id: team.id,
        name: team.name,
        division_id: team.divisionId,
      })),
      p_new_locations: plan.newLocations.map((location) => ({
        id: location.id,
        name: location.name,
      })),
      p_games: plan.games.map((game) => ({
        op: game.op,
        id: game.id,
        external_game_id: game.externalId,
        ...game.payload,
      })),
    });

    busy = false;

    if (error) {
      say(explain(error.message), "error");
      renderPreview();
      return;
    }

    const result = (data ?? {}) as {
      games_inserted?: number;
      games_updated?: number;
      teams_created?: number;
      locations_created?: number;
    };

    const parts = [
      `Imported ${(result.games_inserted ?? 0) + (result.games_updated ?? 0)} games (${result.games_inserted ?? 0} new, ${result.games_updated ?? 0} changed).`,
    ];
    if (result.teams_created) parts.push(`Created ${result.teams_created} ${result.teams_created === 1 ? "team" : "teams"}.`);
    if (result.locations_created) parts.push(`Created ${result.locations_created} ${result.locations_created === 1 ? "field" : "fields"}.`);

    const today = startOfToday(appNow()).toISOString();
    if (plan.games.some((game) => game.payload.starts_at < today)) {
      parts.push("The list starts from today: change From to see earlier games.");
    }

    options.onImported(parts.join(" "));
  };

  const loadFile = async (file: File) => {
    say("");
    table = null;
    columns = null;
    settings = null;
    plan = null;
    renderBody();

    if (/\.xlsx?$/i.test(file.name)) {
      say("That is an Excel file. Please save it as CSV first (in Excel or Google Sheets: File, Save as or Download, Comma-separated values) and choose that file.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      say("That file is too large (the limit is 5 MB).");
      return;
    }

    let parsed: string[][];
    try {
      parsed = parseCsv(await file.text());
    } catch (error) {
      say(error instanceof Error ? error.message : "That file could not be read.");
      return;
    }

    if (parsed.length < 2) {
      say("That file has no rows below the headings.");
      return;
    }

    await ready;

    table = parsed;
    columns = detectColumns(parsed[0]);
    rebuild();
  };

  // ------------------------------------------------------------------- events
  root.querySelector("#imp-file")?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void loadFile(file);
  });

  root.querySelector("#imp-season")?.addEventListener("change", (event) => {
    seasonId = (event.target as HTMLSelectElement).value;
    ready = loadExisting().then(() => {
      if (table) rebuild();
    });
  });

  root.querySelector("#imp-close")?.addEventListener("click", options.onClose);

  body.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("#imp-apply")) void apply();
  });

  body.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // a different column for one purpose: read the whole file again
    if (target instanceof HTMLSelectElement && target.dataset.column && columns) {
      columns[target.dataset.column as FieldKey] =
        target.value === "" ? null : Number(target.value);
      rebuild();
      return;
    }

    if (!settings) return;

    if (target instanceof HTMLInputElement && target.dataset.event !== undefined) {
      settings.includeEvents[target.dataset.event] = target.checked;
      settings = defaultSettings(rows, matchContext(), settings);
      recompute();
      renderBody();
      return;
    }

    if (target instanceof HTMLSelectElement && target.dataset.division !== undefined) {
      settings.divisionByLabel[target.dataset.division] = target.value || null;
    } else if (target instanceof HTMLSelectElement && target.dataset.field !== undefined) {
      const key = target.dataset.field;
      const input = body.querySelector<HTMLInputElement>(`[data-field-name="${CSS.escape(key)}"]`);

      if (target.value === NEW) {
        const first = rows.find((row) => locationKey(row) === key);
        const name = input?.value.trim() || first?.location || first?.field || "New field";
        settings.locationByKey[key] = { kind: "new", name };
        if (input) { input.value = name; input.hidden = false; }
      } else {
        settings.locationByKey[key] = { kind: "existing", id: target.value };
        if (input) input.hidden = true;
      }
    } else if (target instanceof HTMLSelectElement && target.dataset.team !== undefined) {
      settings.teamByKey[target.dataset.team] =
        target.value === NEW ? { kind: "new" }
        : target.value === LABEL ? { kind: "label" }
        : { kind: "existing", id: target.value };
    } else {
      return;
    }

    recompute();
    renderPreview();
  });

  // typing a different name for a field that will be created
  body.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.dataset.fieldName === undefined || !settings) return;

    const name = target.value.trim();
    if (name) {
      settings.locationByKey[target.dataset.fieldName] = { kind: "new", name };
      recompute();
      renderPreview();
    }
  });

  ready = loadExisting();
}
