import { supabase } from "./supabase";

type SetupRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type SeasonRecord = SetupRecord & {
  starts_on: string | null;
  ends_on: string | null;
  age_chart_id: string | null;
};

type DivisionRecord = SetupRecord & {
  league_id: string;
  age_group: string | null;
  description: string | null;
  youngest_ll_age: number | null;
  oldest_ll_age: number | null;
};

type LocationRecord = SetupRecord & {
  address: string | null;
  notes: string | null;
};

type TeamRecord = SetupRecord & {
  league_id: string;
  season_id: string;
  division_id: string | null;
};

type AgeChartRecord = {
  id: string;
  chart_year: number;
  name: string;
};

type ChartEntry = {
  birth_month: number;
  birth_year: number;
  ll_age: number;
};

let editingSeasonId: string | null = null;
let editingLeagueId: string | null = null;
let editingDivisionId: string | null = null;
let editingLocationId: string | null = null;
let editingTeamId: string | null = null;
let teamSeasonFilter = "";

// Most recently loaded data, shared by the season form helpers.
let ageCharts: AgeChartRecord[] = [];
let loadedSeasons: SeasonRecord[] = [];
let loadedLeagues: SetupRecord[] = [];
let loadedDivisions: DivisionRecord[] = [];
let loadedTeams: TeamRecord[] = [];

const CHART_MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];
const MIN_LL_AGE = 4;
const MAX_LL_AGE = 18;
const MAX_CHART_FILE_BYTES = 100 * 1024;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return replacements[character];
  });
}

// ---------------------------------------------------------------
// Age chart CSV parsing and validation
// ---------------------------------------------------------------

type ChartParseResult = {
  entries: ChartEntry[];
  errors: string[];
};

function parseAgeChartCsv(text: string): ChartParseResult {
  const errors: string[] = [];
  const entries: ChartEntry[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);

  let headerSeen = false;
  let dataRows = 0;
  const seenMonthYear = new Set<string>();
  const seenMonthAge = new Set<string>();

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (!line) continue;

    if (line.includes('"')) {
      errors.push(`Line ${lineNumber}: quotation marks are not supported.`);
      continue;
    }

    const cells = line.split(",").map((cell) => cell.trim());

    if (!headerSeen) {
      headerSeen = true;
      const expected = [...CHART_MONTHS, "AGE"];
      const actual = cells.map((cell) => cell.toUpperCase());
      const headerMatches =
        actual.length === expected.length &&
        expected.every((name, position) => actual[position] === name);

      if (!headerMatches) {
        errors.push(
          `Line ${lineNumber}: the header must be exactly ${expected.join(",")}.`,
        );
        return { entries: [], errors };
      }
      continue;
    }

    dataRows++;

    if (cells.length !== 13) {
      errors.push(
        `Line ${lineNumber}: expected 13 values but found ${cells.length}.`,
      );
      continue;
    }

    const ageText = cells[12];
    if (!/^\d+$/.test(ageText)) {
      errors.push(
        `Line ${lineNumber}: AGE "${ageText}" is not a whole number.`,
      );
      continue;
    }

    const age = Number(ageText);
    if (age < MIN_LL_AGE || age > MAX_LL_AGE) {
      errors.push(
        `Line ${lineNumber}: AGE ${age} is outside the supported range ` +
        `${MIN_LL_AGE}–${MAX_LL_AGE}.`,
      );
      continue;
    }

    const rowEntries: ChartEntry[] = [];
    const badMonths: string[] = [];

    cells.slice(0, 12).forEach((cell, position) => {
      const year = Number(cell);
      if (!/^\d{4}$/.test(cell) || year < 1900 || year > 2100) {
        badMonths.push(CHART_MONTHS[position]);
      } else {
        rowEntries.push({
          birth_month: position + 1,
          birth_year: year,
          ll_age: age,
        });
      }
    });

    if (badMonths.length > 0) {
      errors.push(
        `Line ${lineNumber}: invalid birth year in ${badMonths.join(", ")}. ` +
        `Use four-digit years.`,
      );
      continue;
    }

    const repeatedMonths: string[] = [];
    let repeatedAge = false;

    for (const entry of rowEntries) {
      if (seenMonthYear.has(`${entry.birth_month}-${entry.birth_year}`)) {
        repeatedMonths.push(CHART_MONTHS[entry.birth_month - 1]);
      }
      if (seenMonthAge.has(`${entry.birth_month}-${entry.ll_age}`)) {
        repeatedAge = true;
      }
    }

    if (repeatedMonths.length > 0) {
      errors.push(
        `Line ${lineNumber}: the birth year repeats one already used ` +
        `for ${repeatedMonths.join(", ")}.`,
      );
      continue;
    }

    if (repeatedAge) {
      errors.push(`Line ${lineNumber}: age ${age} appears more than once.`);
      continue;
    }

    for (const entry of rowEntries) {
      seenMonthYear.add(`${entry.birth_month}-${entry.birth_year}`);
      seenMonthAge.add(`${entry.birth_month}-${entry.ll_age}`);
      entries.push(entry);
    }
  }

  if (!headerSeen) {
    errors.push("The file is empty.");
  } else if (dataRows === 0) {
    errors.push("The file has a header but no data rows.");
  }

  return { entries: errors.length > 0 ? [] : entries, errors };
}

function summarizeEntries(entries: ChartEntry[]): string {
  const ages = entries.map((entry) => entry.ll_age);
  const years = entries.map((entry) => entry.birth_year);
  return (
    `${entries.length} entries, Little League ages ` +
    `${Math.min(...ages)}–${Math.max(...ages)}, birth years ` +
    `${Math.min(...years)}–${Math.max(...years)}.`
  );
}

type DivisionAges =
  | { error: string }
  | { youngest: number; oldest: number };

function validateDivisionAges(
  youngestText: string,
  oldestText: string,
): DivisionAges {
  const youngestTrimmed = youngestText.trim();
  const oldestTrimmed = oldestText.trim();

  if (!/^\d+$/.test(youngestTrimmed) || !/^\d+$/.test(oldestTrimmed)) {
    return { error: "Enter whole numbers for both the youngest and oldest age." };
  }

  const youngest = Number(youngestTrimmed);
  const oldest = Number(oldestTrimmed);

  if (
    youngest < MIN_LL_AGE || youngest > MAX_LL_AGE ||
    oldest < MIN_LL_AGE || oldest > MAX_LL_AGE
  ) {
    return {
      error: `Ages must be between ${MIN_LL_AGE} and ${MAX_LL_AGE}.`,
    };
  }

  if (youngest > oldest) {
    return { error: "The youngest age cannot be higher than the oldest age." };
  }

  return { youngest, oldest };
}

async function loadAgeCharts(): Promise<AgeChartRecord[] | null> {
  const { data, error } = await supabase
    .from("little_league_age_charts")
    .select("id, chart_year, name")
    .order("chart_year", { ascending: false })
    .order("name");

  if (error) {
    console.error("Age chart load failed:", error.message);
    return null;
  }
  return (data ?? []) as AgeChartRecord[];
}

// ---------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------

type DeletableTable =
  | "leagues"
  | "seasons"
  | "divisions"
  | "locations"
  | "teams";

// Shared by every Delete button. Asks for confirmation, deletes the
// record, and explains clearly if the database refuses because other
// records still use it.
function wireDeleteButton(
  container: HTMLElement,
  options: {
    buttonId: string;
    table: DeletableTable;
    noun: string;
    getId: () => string | null;
    inUseMessage: string;
    onDeleted: () => void;
  },
): void {
  const button = container.querySelector<HTMLButtonElement>(options.buttonId);
  if (!button) return;

  button.addEventListener("click", async () => {
    const recordId = options.getId();
    if (!recordId) return;

    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    const recordName = button.closest("form")
      ?.querySelector<HTMLInputElement>('[name="name"]')?.defaultValue ?? "";

    const confirmed = window.confirm(
      `Delete the ${options.noun} "${recordName}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    const originalLabel = button.textContent ?? "Delete";
    button.disabled = true;
    button.textContent = "Deleting…";

    const { data: deleted, error } = await supabase
      .from(options.table)
      .delete()
      .eq("id", recordId)
      .select("id");

    if (error || !deleted || deleted.length === 0) {
      if (message) {
        message.textContent = error?.code === "23503"
          ? options.inUseMessage
          : error
            ? `Could not delete ${options.noun}: ${error.message}`
            : `The ${options.noun} was not deleted. You may not have ` +
              `permission, or it was already removed.`;
        message.className = "message error";
      }
      button.disabled = false;
      button.textContent = originalLabel;
      return;
    }

    options.onDeleted();
    await renderLeagueSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent =
        `${options.noun.charAt(0).toUpperCase()}${options.noun.slice(1)} deleted.`;
      successMessage.className = "message success";
    }
  });
}

function ageRangeLabel(division: DivisionRecord): string {
  if (division.youngest_ll_age === null || division.oldest_ll_age === null) {
    return "";
  }
  return division.youngest_ll_age === division.oldest_ll_age
    ? ` (LL age ${division.youngest_ll_age})`
    : ` (LL ages ${division.youngest_ll_age}\u2013${division.oldest_ll_age})`;
}

// Inner HTML of the Teams panel. Re-rendered in place when the
// season filter changes, so other open forms are not disturbed.
function renderTeamsPanel(): string {
  const showLeague = loadedLeagues.length > 1;
  const visible = teamSeasonFilter
    ? loadedTeams.filter((team) => team.season_id === teamSeasonFilter)
    : loadedTeams;

  const seasonOptions =
    `<option value="">All seasons</option>` +
    loadedSeasons.map((season) => `
      <option value="${escapeHtml(season.id)}"
        ${season.id === teamSeasonFilter ? "selected" : ""}>
        ${escapeHtml(season.name)}
      </option>
    `).join("");

  const items = visible.length
    ? `<ul class="setup-list">${visible.map((team) => {
        const season = loadedSeasons.find((item) => item.id === team.season_id);
        const division = loadedDivisions.find(
          (item) => item.id === team.division_id,
        );
        const league = loadedLeagues.find((item) => item.id === team.league_id);
        const details = [
          season ? season.name : "Unknown season",
          division ? division.name : "No division",
          showLeague && league ? league.name : "",
        ].filter((part) => part !== "").join(", ");

        return `
        <li class="season-item">
          <div>
            <strong>${escapeHtml(team.name)}</strong>
            <p class="season-dates">${escapeHtml(details)}</p>
            <span class="setup-status">
              ${team.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-team="${escapeHtml(team.id)}">
            Edit
          </button>
        </li>
      `;
      }).join("")}</ul>`
    : `<p class="directory-empty">${
        loadedTeams.length === 0
          ? "No teams yet. Add the teams that play in each season."
          : "No teams in this season yet."
      }</p>`;

  return `
    <h3>Teams</h3>
    <button id="add-team-button" type="button" class="primary-button">
      Add team
    </button>
    <label for="team-season-filter">Show season</label>
    <select id="team-season-filter">${seasonOptions}</select>
    ${items}
  `;
}

function renderTeamDivisionOptions(
  leagueId: string,
  selectedId: string | null,
): string {
  const options = loadedDivisions.filter((division) =>
    division.league_id === leagueId &&
    (division.is_active || division.id === selectedId)
  );

  return (
    `<option value="">No division</option>` +
    options.map((division) => `
      <option value="${escapeHtml(division.id)}"
        ${division.id === selectedId ? "selected" : ""}>
        ${escapeHtml(division.name + ageRangeLabel(division))}
      </option>
    `).join("")
  );
}

function renderTeamForm(team: TeamRecord | null): string {
  const activeLeagues = loadedLeagues.filter((league) => league.is_active);
  const activeSeasons = loadedSeasons.filter((season) => season.is_active);

  const leagueId = team
    ? team.league_id
    : activeLeagues.length === 1 ? activeLeagues[0].id : "";

  const seasonId = team
    ? team.season_id
    : activeSeasons.some((season) => season.id === teamSeasonFilter)
      ? teamSeasonFilter
      : activeSeasons.length === 1 ? activeSeasons[0].id : "";

  // League and season are fixed once a team exists, because games
  // will later depend on them. To change them, delete and re-add.
  const fixedFields = team
    ? `
      <p class="season-dates">
        League: ${escapeHtml(
          loadedLeagues.find((league) => league.id === team.league_id)?.name
            ?? "Unknown league",
        )}
      </p>
      <p class="season-dates">
        Season: ${escapeHtml(
          loadedSeasons.find((season) => season.id === team.season_id)?.name
            ?? "Unknown season",
        )}
      </p>
    `
    : `
      <label for="team-league">League</label>
      <select id="team-league" name="league_id" required>
        ${activeLeagues.length === 1 ? "" : `<option value="">Choose a league</option>`}
        ${activeLeagues.map((league) => `
          <option value="${escapeHtml(league.id)}"
            ${league.id === leagueId ? "selected" : ""}>
            ${escapeHtml(league.name)}
          </option>
        `).join("")}
      </select>

      <label for="team-season">Season</label>
      <select id="team-season" name="season_id" required>
        ${activeSeasons.length === 1 ? "" : `<option value="">Choose a season</option>`}
        ${activeSeasons.map((season) => `
          <option value="${escapeHtml(season.id)}"
            ${season.id === seasonId ? "selected" : ""}>
            ${escapeHtml(season.name)}
          </option>
        `).join("")}
      </select>
    `;

  return `
    <form id="team-form" class="create-umpire-form">
      <h3>${team ? "Edit team" : "Add team"}</h3>

      ${fixedFields}

      <label for="team-name">Team name</label>
      <input id="team-name" name="name" required maxlength="100"
        value="${escapeHtml(team?.name ?? "")}"
        placeholder="e.g. Tigers" />

      <label for="team-division">Division (optional)</label>
      <select id="team-division" name="division_id">
        ${renderTeamDivisionOptions(leagueId, team?.division_id ?? null)}
      </select>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${(team?.is_active ?? true) ? "checked" : ""} />
        Active team
      </label>
      ${team
        ? `<button id="delete-team-button" type="button"
            class="secondary-button">
            Delete team
          </button>`
        : ""}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save team
        </button>
        <button id="cancel-team-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `;
}

function openTeamEditor(container: HTMLElement, team: TeamRecord | null): void {
  const editorContainer = container.querySelector("#team-editor");
  if (!editorContainer) return;

  editingTeamId = team ? team.id : null;
  editorContainer.innerHTML = renderTeamForm(team);
  wireTeamForm(container);
  editorContainer.scrollIntoView({ behavior: "smooth" });
}

function renderLocations(locations: LocationRecord[]): string {
  const items = locations.length
    ? `<ul class="setup-list">${locations.map((location) => `
        <li class="season-item">
          <div>
            <strong>${escapeHtml(location.name)}</strong>
            ${location.address
              ? `<p class="season-dates">${escapeHtml(location.address)}</p>`
              : ""}
            ${location.notes
              ? `<p class="season-dates">${escapeHtml(location.notes)}</p>`
              : ""}
            <span class="setup-status">
              ${location.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-location="${escapeHtml(location.id)}">
            Edit
          </button>
        </li>
      `).join("")}</ul>`
    : `<p class="directory-empty">
        No game locations yet. Add the fields where games are played.
      </p>`;

  return `
    <section class="setup-panel">
      <h3>Game Locations</h3>
      <button id="add-location-button" type="button"
        class="primary-button">
        Add location
      </button>
      ${items}
    </section>
  `;
}

function renderLocationForm(location: LocationRecord | null): string {
  const name = location?.name ?? "";
  const address = location?.address ?? "";
  const notes = location?.notes ?? "";
  const active = location?.is_active ?? true;

  return `
    <form id="location-form" class="create-umpire-form">
      <h3>${location ? "Edit location" : "Add location"}</h3>

      <label for="location-name">Location name</label>
      <input id="location-name" name="name" required maxlength="100"
        value="${escapeHtml(name)}"
        placeholder="e.g. Field 1" />

      <label for="location-address">Address (optional)</label>
      <input id="location-address" name="address" maxlength="200"
        value="${escapeHtml(address)}" />

      <label for="location-notes">Notes (optional)</label>
      <textarea id="location-notes" name="notes"
        rows="3" maxlength="500">${escapeHtml(notes)}</textarea>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${active ? "checked" : ""} />
        Active location
      </label>
      ${location
        ? `<button id="delete-location-button" type="button"
            class="secondary-button">
            Delete location
          </button>`
        : ""}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save location
        </button>
        <button id="cancel-location-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `;
}

function renderLeagues(leagues: SetupRecord[]): string {
  const items = leagues.length
    ? `<ul class="setup-list">${leagues.map((league) => `
        <li class="season-item">
          <div>
            <strong>${escapeHtml(league.name)}</strong>
            <span class="setup-status">
              ${league.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-league="${escapeHtml(league.id)}">
            Edit
          </button>
        </li>
      `).join("")}</ul>`
    : `<p class="directory-empty">
        No leagues yet. Add a league before you create divisions.
      </p>`;

  return `
    <section class="setup-panel">
      <h3>Leagues</h3>
      <button id="add-league-button" type="button"
        class="primary-button">
        Add league
      </button>
      ${items}
    </section>
  `;
}

function renderLeagueForm(league: SetupRecord | null): string {
  const name = league?.name ?? "";
  const active = league?.is_active ?? true;

  return `
    <form id="league-form" class="create-umpire-form">
      <h3>${league ? "Edit league" : "Add league"}</h3>

      <label for="league-name">League name</label>
      <input id="league-name" name="name" required maxlength="100"
        value="${escapeHtml(name)}"
        placeholder="Your league's name" />

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${active ? "checked" : ""} />
        Active league
      </label>
      ${league
        ? `<button id="delete-league-button" type="button"
            class="secondary-button">
            Delete league
          </button>`
        : ""}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save league
        </button>
        <button id="cancel-league-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `;
}

function renderDivisions(
  divisions: DivisionRecord[],
  leagues: SetupRecord[],
): string {
  const showLeague = leagues.length > 1;

  const items = divisions.length
    ? `<ul class="setup-list">${divisions.map((division) => {
        const league = leagues.find((item) => item.id === division.league_id);
        const range =
          division.youngest_ll_age !== null && division.oldest_ll_age !== null
            ? division.youngest_ll_age === division.oldest_ll_age
              ? `LL age ${division.youngest_ll_age}`
              : `LL ages ${division.youngest_ll_age}\u2013${division.oldest_ll_age}`
            : "No age range set";

        return `
        <li class="season-item">
          <div>
            <strong>${escapeHtml(division.name)}</strong>
            ${division.age_group
              ? `<span class="setup-status">${escapeHtml(division.age_group)}</span>`
              : ""}
            <p class="season-dates">${escapeHtml(range)}</p>
            ${showLeague && league
              ? `<p class="season-dates">${escapeHtml(league.name)}</p>`
              : ""}
            ${division.description
              ? `<p class="season-dates">${escapeHtml(division.description)}</p>`
              : ""}
            <span class="setup-status">
              ${division.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-division="${escapeHtml(division.id)}">
            Edit
          </button>
        </li>
      `;
      }).join("")}</ul>`
    : `<p class="directory-empty">No divisions have been added yet.</p>`;

  return `
    <section class="setup-panel">
      <h3>Divisions</h3>
      <button id="add-division-button" type="button"
        class="primary-button">
        Add division
      </button>
      ${items}
    </section>
  `;
}

function renderDivisionForm(
  division: DivisionRecord | null,
  leagues: SetupRecord[],
): string {
  const name = division?.name ?? "";
  const description = division?.description ?? "";
  const youngest = division?.youngest_ll_age ?? "";
  const oldest = division?.oldest_ll_age ?? "";
  const active = division?.is_active ?? true;

  const activeLeagues = leagues.filter((league) => league.is_active);
  const preselect = activeLeagues.length === 1 ? activeLeagues[0].id : "";

  const leagueField = division
    ? `
      <p class="season-dates">
        League: ${escapeHtml(
          leagues.find((league) => league.id === division.league_id)?.name
            ?? "Unknown league",
        )}
      </p>
    `
    : `
      <label for="division-league">League</label>
      <select id="division-league" name="league_id" required>
        ${activeLeagues.length === 1 ? "" : `<option value="">Choose a league</option>`}
        ${activeLeagues.map((league) => `
          <option value="${escapeHtml(league.id)}"
            ${league.id === preselect ? "selected" : ""}>
            ${escapeHtml(league.name)}
          </option>
        `).join("")}
      </select>
    `;

  return `
    <form id="division-form" class="create-umpire-form">
      <h3>${division ? "Edit division" : "Add division"}</h3>

      ${leagueField}

      <label for="division-name">Division name</label>
      <input id="division-name" name="name" required maxlength="100"
        value="${escapeHtml(name)}"
        placeholder="e.g. Minors" />

      <label for="division-youngest">
        Youngest Little League age (${MIN_LL_AGE}\u2013${MAX_LL_AGE})
      </label>
      <input id="division-youngest" name="youngest_ll_age" required
        type="number" inputmode="numeric" step="1"
        min="${MIN_LL_AGE}" max="${MAX_LL_AGE}"
        value="${escapeHtml(String(youngest))}" />

      <label for="division-oldest">
        Oldest Little League age (${MIN_LL_AGE}\u2013${MAX_LL_AGE})
      </label>
      <input id="division-oldest" name="oldest_ll_age" required
        type="number" inputmode="numeric" step="1"
        min="${MIN_LL_AGE}" max="${MAX_LL_AGE}"
        value="${escapeHtml(String(oldest))}" />

      <label for="division-description">Description (optional)</label>
      <textarea id="division-description" name="description"
        rows="3" maxlength="500">${escapeHtml(description)}</textarea>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${active ? "checked" : ""} />
        Active division
      </label>
      ${division
        ? `<button id="delete-division-button" type="button"
            class="secondary-button">
            Delete division
          </button>`
        : ""}

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save division
        </button>
        <button id="cancel-division-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `;
}

function renderSeasons(seasons: SeasonRecord[]): string {
  const items = seasons.length
    ? `<ul class="setup-list">${seasons.map((season) => {
        const chart = ageCharts.find(
          (item) => item.id === season.age_chart_id,
        );
        const chartLabel = season.age_chart_id
          ? `Age chart: ${chart ? chart.name : "unavailable"}`
          : "No age chart selected";

        return `
        <li class="season-item">
          <div>
            <strong>${escapeHtml(season.name)}</strong>
            <p class="season-dates">
              ${season.starts_on || "Start date not set"}
              &ndash;
              ${season.ends_on || "End date not set"}
            </p>
            <p class="season-dates">${escapeHtml(chartLabel)}</p>
            <span class="setup-status">
              ${season.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <button type="button"
            class="secondary-button season-edit-button"
            data-edit-season="${escapeHtml(season.id)}">
            Edit
          </button>
        </li>
      `;
      }).join("")}</ul>`
    : `<p class="directory-empty">No seasons have been added yet.</p>`;

  return `
    <section class="setup-panel">
      <h3>Seasons</h3>
      <button id="add-season-button" type="button"
        class="primary-button">
        Add season
      </button>
      ${items}
    </section>
  `;
}

function renderChartOptions(
  charts: AgeChartRecord[],
  selectedId: string | null,
): string {
  return (
    `<option value="">No chart selected</option>` +
    charts.map((chart) => `
      <option value="${escapeHtml(chart.id)}"
        ${chart.id === selectedId ? "selected" : ""}>
        ${escapeHtml(chart.name)}
      </option>
    `).join("")
  );
}

function renderSeasonForm(season: SeasonRecord | null): string {
  const name = season?.name ?? "";
  const startsOn = season?.starts_on ?? "";
  const endsOn = season?.ends_on ?? "";
  const active = season?.is_active ?? true;

  return `
    <form id="season-form" class="create-umpire-form">
      <h3>${season ? "Edit season" : "Add season"}</h3>

      <label for="season-name">Season name</label>
      <input id="season-name" name="name" required maxlength="100"
        value="${escapeHtml(name)}"
        placeholder="e.g. Spring 2027" />

      <label for="season-start">Start date</label>
      <input id="season-start" name="starts_on" type="date"
        value="${escapeHtml(startsOn)}" />

      <label for="season-end">End date</label>
      <input id="season-end" name="ends_on" type="date"
        value="${escapeHtml(endsOn)}" />

      <label for="season-chart">Little League age chart</label>
      <select id="season-chart" name="age_chart_id">
        ${renderChartOptions(ageCharts, season?.age_chart_id ?? null)}
      </select>

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${active ? "checked" : ""} />
        Active season
      </label>
      ${season
        ? `<button id="delete-season-button" type="button"
            class="secondary-button">
            Delete season
          </button>`
        : ""}

      <div id="chart-import">
        <hr class="directory-divider" />
        <h3>Import a new age chart</h3>
        <p class="directory-description">
          Upload the annual chart as a CSV file. Imported charts cannot
          be edited. To fix a mistake, import a corrected chart under
          a new name.
        </p>

        <label for="chart-file">Chart CSV file</label>
        <input id="chart-file" type="file" accept=".csv,text/csv" />

        <label for="chart-year">Chart year</label>
        <input id="chart-year" type="number" min="2000" max="2100"
          step="1" placeholder="e.g. 2027" />

        <label for="chart-name">Chart name</label>
        <input id="chart-name" type="text" maxlength="100"
          placeholder="e.g. 2027 Little League Age Chart" />

        <div id="chart-import-feedback" role="status"
          aria-live="polite"></div>

        <button id="chart-import-button" type="button"
          class="secondary-button" disabled>
          Import chart
        </button>
        <hr class="directory-divider" />
      </div>

      <div class="account-actions">
        <button type="submit" class="primary-button">
          Save season
        </button>
        <button id="cancel-season-button" type="button"
          class="secondary-button">
          Cancel
        </button>
      </div>
    </form>
  `;
}

// ---------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------

export async function renderLeagueSetup(
  container: HTMLElement,
): Promise<void> {
  container.innerHTML = `
    <section class="directory-section">
      <h2>League Setup</h2>
      <p class="directory-description">Loading setup records…</p>
    </section>
  `;

  const [
    leaguesResult,
    seasonsResult,
    divisionsResult,
    locationsResult,
    chartsResult,
    teamsResult,
  ] = await Promise.all([
    supabase.from("leagues")
      .select("id, name, is_active").order("name"),
    supabase.from("seasons")
      .select("id, name, starts_on, ends_on, is_active, age_chart_id")
      .order("starts_on", { ascending: false }),
    supabase.from("divisions")
      .select("id, name, age_group, league_id, description, youngest_ll_age, oldest_ll_age, is_active")
      .order("name"),
    supabase.from("locations")
      .select("id, name, address, notes, is_active").order("name"),
    supabase.from("little_league_age_charts")
      .select("id, chart_year, name")
      .order("chart_year", { ascending: false })
      .order("name"),
    supabase.from("teams")
      .select("id, league_id, season_id, division_id, name, is_active")
      .order("name"),
  ]);

  const firstError =
    leaguesResult.error ??
    seasonsResult.error ??
    divisionsResult.error ??
    locationsResult.error ??
    chartsResult.error ??
    teamsResult.error;

  if (firstError) {
    container.innerHTML = `
      <section class="directory-section">
        <h2>League Setup</h2>
        <p class="message error">
          Unable to load setup records. Refresh and try again.
        </p>
      </section>
    `;
    console.error("League setup load failed:", firstError.message);
    return;
  }

  const leagues = (leaguesResult.data ?? []) as SetupRecord[];
  const seasons = (seasonsResult.data ?? []) as SeasonRecord[];
  const divisions = (divisionsResult.data ?? []) as DivisionRecord[];
  const locations = (locationsResult.data ?? []) as LocationRecord[];
  const teams = (teamsResult.data ?? []) as TeamRecord[];

  ageCharts = (chartsResult.data ?? []) as AgeChartRecord[];
  loadedSeasons = seasons;
  loadedLeagues = leagues;
  loadedDivisions = divisions;
  loadedTeams = teams;

  const leagueEditor = editingLeagueId
    ? leagues.find((league) => league.id === editingLeagueId) ?? null
    : null;

  const teamEditor = editingTeamId
    ? teams.find((team) => team.id === editingTeamId) ?? null
    : null;

  const locationEditor = editingLocationId
    ? locations.find((location) => location.id === editingLocationId) ?? null
    : null;

  const divisionEditor = editingDivisionId
    ? divisions.find((division) => division.id === editingDivisionId) ?? null
    : null;

  const editor = editingSeasonId
    ? seasons.find((season) => season.id === editingSeasonId) ?? null
    : null;

  container.innerHTML = `
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <h2>League Setup</h2>
          <p class="directory-description">
            Configure leagues, seasons, divisions, and game locations.
          </p>
        </div>
        <button id="refresh-league-setup"
          class="secondary-button" type="button">Refresh</button>
      </div>

      <p id="league-setup-message" class="message"
        role="status" aria-live="polite"></p>

      <div id="league-editor">
        ${leagueEditor ? renderLeagueForm(leagueEditor) : ""}
      </div>

      <div id="season-editor">
        ${editor ? renderSeasonForm(editor) : ""}
      </div>

      <div id="division-editor">
        ${divisionEditor ? renderDivisionForm(divisionEditor, leagues) : ""}
      </div>

      <div id="team-editor">
        ${teamEditor ? renderTeamForm(teamEditor) : ""}
      </div>

      <div id="location-editor">
        ${locationEditor ? renderLocationForm(locationEditor) : ""}
      </div>

      <div class="setup-grid">
        ${renderLeagues(leagues)}
        ${renderSeasons(seasons)}
        ${renderDivisions(divisions, leagues)}
        <section id="teams-panel" class="setup-panel">
          ${renderTeamsPanel()}
        </section>
        ${renderLocations(locations)}
      </div>
    </section>
  `;

  container.querySelector("#refresh-league-setup")
    ?.addEventListener("click", () => {
      editingSeasonId = null;
      editingLeagueId = null;
      editingDivisionId = null;
      editingLocationId = null;
      editingTeamId = null;
      void renderLeagueSetup(container);
    });

  // ----- Leagues -----
  container.querySelector("#add-league-button")
    ?.addEventListener("click", () => {
      editingLeagueId = null;
      const editorContainer = container.querySelector("#league-editor");
      if (editorContainer) {
        editorContainer.innerHTML = renderLeagueForm(null);
        wireLeagueForm(container);
        editorContainer.scrollIntoView({ behavior: "smooth" });
      }
    });

  container.querySelectorAll<HTMLButtonElement>("[data-edit-league]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        editingLeagueId = button.dataset.editLeague ?? null;
        const league = leagues.find((item) => item.id === editingLeagueId);
        const editorContainer = container.querySelector("#league-editor");

        if (league && editorContainer) {
          editorContainer.innerHTML = renderLeagueForm(league);
          wireLeagueForm(container);
          editorContainer.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

  if (leagueEditor) {
    wireLeagueForm(container);
  }

  // ----- Teams -----
  const teamsPanel = container.querySelector<HTMLElement>("#teams-panel");

  teamsPanel?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("#add-team-button")) {
      if (
        !leagues.some((league) => league.is_active) ||
        !seasons.some((season) => season.is_active)
      ) {
        const message = container.querySelector<HTMLParagraphElement>(
          "#league-setup-message",
        );
        if (message) {
          message.textContent =
            "Add an active league and an active season before you create teams.";
          message.className = "message error";
        }
        return;
      }
      openTeamEditor(container, null);
      return;
    }

    const editButton = target.closest<HTMLElement>("[data-edit-team]");
    if (editButton) {
      const team = teams.find((item) => item.id === editButton.dataset.editTeam);
      if (team) openTeamEditor(container, team);
    }
  });

  teamsPanel?.addEventListener("change", (event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.id === "team-season-filter") {
      teamSeasonFilter = target.value;
      teamsPanel.innerHTML = renderTeamsPanel();
    }
  });

  if (teamEditor) {
    wireTeamForm(container);
  }

  // ----- Locations -----
  container.querySelector("#add-location-button")
    ?.addEventListener("click", () => {
      editingLocationId = null;
      const editorContainer = container.querySelector("#location-editor");
      if (editorContainer) {
        editorContainer.innerHTML = renderLocationForm(null);
        wireLocationForm(container);
        editorContainer.scrollIntoView({ behavior: "smooth" });
      }
    });

  container.querySelectorAll<HTMLButtonElement>("[data-edit-location]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        editingLocationId = button.dataset.editLocation ?? null;
        const location = locations.find(
          (item) => item.id === editingLocationId,
        );
        const editorContainer = container.querySelector("#location-editor");

        if (location && editorContainer) {
          editorContainer.innerHTML = renderLocationForm(location);
          wireLocationForm(container);
          editorContainer.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

  if (locationEditor) {
    wireLocationForm(container);
  }

  // ----- Divisions -----
  container.querySelector("#add-division-button")
    ?.addEventListener("click", () => {
      const message = container.querySelector<HTMLParagraphElement>(
        "#league-setup-message",
      );

      if (!leagues.some((league) => league.is_active)) {
        if (message) {
          message.textContent =
            "Add an active league before you create divisions.";
          message.className = "message error";
        }
        return;
      }

      editingDivisionId = null;
      const editorContainer = container.querySelector("#division-editor");
      if (editorContainer) {
        editorContainer.innerHTML = renderDivisionForm(null, leagues);
        wireDivisionForm(container);
        editorContainer.scrollIntoView({ behavior: "smooth" });
      }
    });

  container.querySelectorAll<HTMLButtonElement>("[data-edit-division]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        editingDivisionId = button.dataset.editDivision ?? null;
        const division = divisions.find(
          (item) => item.id === editingDivisionId,
        );
        const editorContainer = container.querySelector("#division-editor");

        if (division && editorContainer) {
          editorContainer.innerHTML = renderDivisionForm(division, leagues);
          wireDivisionForm(container);
          editorContainer.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

  if (divisionEditor) {
    wireDivisionForm(container);
  }

  // ----- Seasons -----
  container.querySelector("#add-season-button")
    ?.addEventListener("click", () => {
      editingSeasonId = null;
      const editorContainer = container.querySelector("#season-editor");
      if (editorContainer) {
        editorContainer.innerHTML = renderSeasonForm(null);
        wireSeasonForm(container);
        editorContainer.scrollIntoView({ behavior: "smooth" });
      }
    });

  container.querySelectorAll<HTMLButtonElement>("[data-edit-season]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        editingSeasonId = button.dataset.editSeason ?? null;
        const season = seasons.find((item) => item.id === editingSeasonId);
        const editorContainer = container.querySelector("#season-editor");

        if (season && editorContainer) {
          editorContainer.innerHTML = renderSeasonForm(season);
          wireSeasonForm(container);
          editorContainer.scrollIntoView({ behavior: "smooth" });
        }
      });
    });

  if (editor) {
    wireSeasonForm(container);
  }
}

// ---------------------------------------------------------------
// League form
// ---------------------------------------------------------------

function wireLeagueForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#league-form");
  if (!form) return;

  wireDeleteButton(container, {
    buttonId: "#delete-league-button",
    table: "leagues",
    noun: "league",
    getId: () => editingLeagueId,
    inUseMessage:
      "This league can't be deleted because divisions or teams use it. " +
      "Remove those first, or mark the league inactive instead.",
    onDeleted: () => { editingLeagueId = null; },
  });

  container.querySelector("#cancel-league-button")
    ?.addEventListener("click", () => {
      editingLeagueId = null;
      void renderLeagueSetup(container);
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const isActive = form.querySelector<HTMLInputElement>(
      '[name="is_active"]',
    )?.checked ?? false;

    if (!name) {
      if (message) {
        message.textContent = "Enter a league name.";
        message.className = "message error";
      }
      return;
    }

    const saveButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }

    const values = { name, is_active: isActive };

    const result = editingLeagueId
      ? await supabase.from("leagues")
          .update(values).eq("id", editingLeagueId)
      : await supabase.from("leagues").insert(values);

    if (result.error) {
      if (message) {
        message.textContent = result.error.code === "23505"
          ? "A league with that name already exists. Choose a different name."
          : `Could not save league: ${result.error.message}`;
        message.className = "message error";
      }
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save league";
      }
      return;
    }

    editingLeagueId = null;
    await renderLeagueSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "League saved successfully.";
      successMessage.className = "message success";
    }
  });
}

// ---------------------------------------------------------------
// Team form
// ---------------------------------------------------------------

function wireTeamForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#team-form");
  if (!form) return;

  wireDeleteButton(container, {
    buttonId: "#delete-team-button",
    table: "teams",
    noun: "team",
    getId: () => editingTeamId,
    inUseMessage:
      "This team can't be deleted because games use it. " +
      "Move or remove those games first, or mark the team " +
      "inactive instead.",
    onDeleted: () => { editingTeamId = null; },
  });

  container.querySelector("#cancel-team-button")
    ?.addEventListener("click", () => {
      editingTeamId = null;
      void renderLeagueSetup(container);
    });

  // When choosing a league for a new team, show only that league's divisions.
  const leagueSelect = form.querySelector<HTMLSelectElement>("#team-league");
  const divisionSelect = form.querySelector<HTMLSelectElement>("#team-division");
  leagueSelect?.addEventListener("change", () => {
    if (divisionSelect) {
      divisionSelect.innerHTML = renderTeamDivisionOptions(
        leagueSelect.value,
        null,
      );
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    const showError = (text: string) => {
      if (message) {
        message.textContent = text;
        message.className = "message error";
      }
    };

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const divisionId = String(data.get("division_id") ?? "") || null;
    const isActive = form.querySelector<HTMLInputElement>(
      '[name="is_active"]',
    )?.checked ?? false;

    // League and season are chosen only when a team is first created.
    const existing = editingTeamId
      ? loadedTeams.find((item) => item.id === editingTeamId) ?? null
      : null;

    let leagueId: string;
    let seasonId: string;

    if (existing) {
      leagueId = existing.league_id;
      seasonId = existing.season_id;
    } else {
      leagueId = String(data.get("league_id") ?? "");
      seasonId = String(data.get("season_id") ?? "");

      if (!loadedLeagues.some((item) => item.id === leagueId)) {
        showError("Choose a league.");
        return;
      }
      if (!loadedSeasons.some((item) => item.id === seasonId)) {
        showError("Choose a season.");
        return;
      }
    }

    if (!name) {
      showError("Enter a team name.");
      return;
    }

    if (
      divisionId &&
      !loadedDivisions.some(
        (item) => item.id === divisionId && item.league_id === leagueId,
      )
    ) {
      showError("Choose a division that belongs to the team's league.");
      return;
    }

    const saveButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }

    const values = {
      name,
      division_id: divisionId,
      is_active: isActive,
    };

    const result = existing
      ? await supabase.from("teams").update(values).eq("id", existing.id)
      : await supabase.from("teams").insert({
          ...values,
          league_id: leagueId,
          season_id: seasonId,
        });

    if (result.error) {
      showError(
        result.error.code === "23505"
          ? "A team with that name already exists in this league and " +
            "season. Choose a different name."
          : `Could not save team: ${result.error.message}`,
      );
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save team";
      }
      return;
    }

    editingTeamId = null;
    await renderLeagueSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Team saved successfully.";
      successMessage.className = "message success";
    }
  });
}

// ---------------------------------------------------------------
// Location form
// ---------------------------------------------------------------

function wireLocationForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#location-form");
  if (!form) return;

  wireDeleteButton(container, {
    buttonId: "#delete-location-button",
    table: "locations",
    noun: "location",
    getId: () => editingLocationId,
    inUseMessage:
      "This location can't be deleted because games use it. " +
      "Move or remove those games first, or mark the location " +
      "inactive instead.",
    onDeleted: () => { editingLocationId = null; },
  });

  container.querySelector("#cancel-location-button")
    ?.addEventListener("click", () => {
      editingLocationId = null;
      void renderLeagueSetup(container);
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const notes = String(data.get("notes") ?? "").trim();
    const isActive = form.querySelector<HTMLInputElement>(
      '[name="is_active"]',
    )?.checked ?? false;

    if (!name) {
      if (message) {
        message.textContent = "Enter a location name.";
        message.className = "message error";
      }
      return;
    }

    const saveButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }

    const values = {
      name,
      address: address || null,
      notes: notes || null,
      is_active: isActive,
    };

    const result = editingLocationId
      ? await supabase.from("locations")
          .update(values).eq("id", editingLocationId)
      : await supabase.from("locations").insert(values);

    if (result.error) {
      if (message) {
        message.textContent = result.error.code === "23505"
          ? "A location with that name already exists. Choose a different name."
          : `Could not save location: ${result.error.message}`;
        message.className = "message error";
      }
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save location";
      }
      return;
    }

    editingLocationId = null;
    await renderLeagueSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Location saved successfully.";
      successMessage.className = "message success";
    }
  });
}

// ---------------------------------------------------------------
// Division form
// ---------------------------------------------------------------

function wireDivisionForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#division-form");
  if (!form) return;

  container.querySelector("#cancel-division-button")
    ?.addEventListener("click", () => {
      editingDivisionId = null;
      void renderLeagueSetup(container);
    });

  wireDeleteButton(container, {
    buttonId: "#delete-division-button",
    table: "divisions",
    noun: "division",
    getId: () => editingDivisionId,
    inUseMessage:
      "This division can't be deleted because teams use it. " +
      "Move or remove those teams first, or mark the division " +
      "inactive instead.",
    onDeleted: () => { editingDivisionId = null; },
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    const showError = (text: string) => {
      if (message) {
        message.textContent = text;
        message.className = "message error";
      }
    };

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const isActive = form.querySelector<HTMLInputElement>(
      '[name="is_active"]',
    )?.checked ?? false;

    // The league of an existing division cannot be changed here.
    let leagueId: string | null = null;
    if (!editingDivisionId) {
      leagueId = String(data.get("league_id") ?? "") || null;
      if (!leagueId || !loadedLeagues.some((item) => item.id === leagueId)) {
        showError("Choose a league.");
        return;
      }
    }

    if (!name) {
      showError("Enter a division name.");
      return;
    }

    const ages = validateDivisionAges(
      String(data.get("youngest_ll_age") ?? ""),
      String(data.get("oldest_ll_age") ?? ""),
    );
    if ("error" in ages) {
      showError(ages.error);
      return;
    }

    const saveButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }

    const values = {
      name,
      youngest_ll_age: ages.youngest,
      oldest_ll_age: ages.oldest,
      description: description || null,
      is_active: isActive,
    };

    const result = editingDivisionId
      ? await supabase.from("divisions")
          .update(values).eq("id", editingDivisionId)
      : await supabase.from("divisions")
          .insert({ ...values, league_id: leagueId });

    if (result.error) {
      if (result.error.code === "23505") {
        showError(
          "A division with that name already exists in this league. " +
          "Choose a different name.",
        );
      } else if (result.error.code === "23514") {
        showError(
          `The age range was not accepted. Use whole ages from ` +
          `${MIN_LL_AGE} to ${MAX_LL_AGE}, with the youngest no higher ` +
          `than the oldest.`,
        );
      } else {
        showError(`Could not save division: ${result.error.message}`);
      }
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save division";
      }
      return;
    }

    editingDivisionId = null;
    await renderLeagueSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Division saved successfully.";
      successMessage.className = "message success";
    }
  });
}

// ---------------------------------------------------------------
// Season form and age chart import
// ---------------------------------------------------------------

function showChartFeedback(
  form: HTMLFormElement,
  kind: "error" | "success" | "info",
  headline: string,
  details: string[] = [],
): void {
  const element = form.querySelector<HTMLElement>("#chart-import-feedback");
  if (!element) return;

  const shown = details.slice(0, 8);
  const more = details.length > shown.length
    ? `<p>…and ${details.length - shown.length} more.</p>`
    : "";
  const list = shown.length
    ? `<ul>${shown.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  element.innerHTML =
    `<p class="message ${kind === "info" ? "" : kind}">` +
    `${escapeHtml(headline)}</p>${list}${more}`;
}

function wireChartImport(form: HTMLFormElement): void {
  const fileInput = form.querySelector<HTMLInputElement>("#chart-file");
  const yearInput = form.querySelector<HTMLInputElement>("#chart-year");
  const nameInput = form.querySelector<HTMLInputElement>("#chart-name");
  const importButton =
    form.querySelector<HTMLButtonElement>("#chart-import-button");
  const chartSelect = form.querySelector<HTMLSelectElement>("#season-chart");

  if (!fileInput || !yearInput || !nameInput || !importButton || !chartSelect) {
    return;
  }

  let pendingEntries: ChartEntry[] = [];

  // Pressing Enter in an import field must not submit the season form.
  form.querySelector("#chart-import")
    ?.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        event.preventDefault();
      }
    });

  fileInput.addEventListener("change", async () => {
    pendingEntries = [];
    importButton.disabled = true;

    const file = fileInput.files?.[0];
    if (!file) {
      showChartFeedback(form, "info", "");
      return;
    }

    if (file.size > MAX_CHART_FILE_BYTES) {
      showChartFeedback(
        form,
        "error",
        "That file is too large for an age chart. Choose the chart CSV.",
      );
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      showChartFeedback(form, "error", "The file could not be read.");
      return;
    }

    const result = parseAgeChartCsv(text);

    if (result.errors.length > 0) {
      showChartFeedback(
        form,
        "error",
        "This file can't be imported. Fix these problems and choose it again:",
        result.errors,
      );
      return;
    }

    pendingEntries = result.entries;

    const yearInName = file.name.match(/(20\d{2})/);
    if (!yearInput.value && yearInName) {
      yearInput.value = yearInName[1];
    }
    if (!nameInput.value.trim() && yearInput.value) {
      nameInput.value = `${yearInput.value} Little League Age Chart`;
    }

    showChartFeedback(
      form,
      "success",
      `File checked: ${summarizeEntries(pendingEntries)} ` +
        `Confirm the year and name, then select Import chart.`,
    );
    importButton.disabled = false;
  });

  importButton.addEventListener("click", async () => {
    const year = Number(yearInput.value);
    const name = nameInput.value.trim();

    if (pendingEntries.length === 0) {
      showChartFeedback(form, "error", "Choose a chart CSV file first.");
      return;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      showChartFeedback(
        form,
        "error",
        "Enter a chart year between 2000 and 2100.",
      );
      return;
    }

    if (!name) {
      showChartFeedback(form, "error", "Enter a chart name.");
      return;
    }

    importButton.disabled = true;
    importButton.textContent = "Importing…";

    const { data, error } = await supabase.rpc("import_age_chart", {
      p_chart_year: year,
      p_name: name,
      p_entries: pendingEntries,
    });

    importButton.textContent = "Import chart";

    if (error) {
      showChartFeedback(
        form,
        "error",
        error.code === "23505"
          ? "A chart with this year and name already exists. " +
            "Choose a different name."
          : `Could not import the chart: ${error.message}`,
      );
      importButton.disabled = false;
      return;
    }

    const newChartId = typeof data === "string" ? data : null;
    const refreshed = await loadAgeCharts();

    pendingEntries = [];
    fileInput.value = "";

    if (!refreshed) {
      showChartFeedback(
        form,
        "success",
        "The chart was imported, but the list could not refresh. " +
          "Select Refresh at the top of League Setup.",
      );
      return;
    }

    ageCharts = refreshed;
    chartSelect.innerHTML = renderChartOptions(ageCharts, newChartId);

    showChartFeedback(
      form,
      "success",
      "Chart imported and selected. It is saved, but it is not attached " +
        "to this season until you select Save season.",
    );
  });
}

function wireSeasonForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#season-form");
  if (!form) return;

  wireChartImport(form);

  wireDeleteButton(container, {
    buttonId: "#delete-season-button",
    table: "seasons",
    noun: "season",
    getId: () => editingSeasonId,
    inUseMessage:
      "This season can't be deleted because teams or games use it. " +
      "Remove those first, or mark the season inactive instead.",
    onDeleted: () => { editingSeasonId = null; },
  });

  container.querySelector("#cancel-season-button")
    ?.addEventListener("click", () => {
      editingSeasonId = null;
      void renderLeagueSetup(container);
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const startsOn = String(data.get("starts_on") ?? "") || null;
    const endsOn = String(data.get("ends_on") ?? "") || null;
    const chartId = String(data.get("age_chart_id") ?? "") || null;
    const isActive = form.querySelector<HTMLInputElement>(
      '[name="is_active"]',
    )?.checked ?? false;

    if (!name) {
      if (message) {
        message.textContent = "Enter a season name.";
        message.className = "message error";
      }
      return;
    }

    if (startsOn && endsOn && endsOn < startsOn) {
      if (message) {
        message.textContent = "The end date must be on or after the start date.";
        message.className = "message error";
      }
      return;
    }

    // Changing an existing chart changes every LL age calculated for
    // this season, so require an explicit confirmation.
    const originalChartId = editingSeasonId
      ? loadedSeasons.find((season) => season.id === editingSeasonId)
          ?.age_chart_id ?? null
      : null;

    if (editingSeasonId && originalChartId && chartId !== originalChartId) {
      const confirmed = window.confirm(
        "This season already uses an age chart. Changing it changes the " +
        "Little League ages calculated for this season. Change the chart?",
      );
      if (!confirmed) return;
    }

    const saveButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }

    const values = {
      name,
      starts_on: startsOn,
      ends_on: endsOn,
      age_chart_id: chartId,
      is_active: isActive,
    };

    const result = editingSeasonId
      ? await supabase.from("seasons")
          .update(values).eq("id", editingSeasonId)
      : await supabase.from("seasons").insert(values);

    if (result.error) {
      if (message) {
        message.textContent = `Could not save season: ${result.error.message}`;
        message.className = "message error";
      }
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Save season";
      }
      return;
    }

    editingSeasonId = null;
    await renderLeagueSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Season saved successfully.";
      successMessage.className = "message success";
    }
  });
}
