import { readDivisionDetails, readTeamDetail } from "./season-plan";
import {
  buildSeasonPlan,
  defaultSeasonSettings,
  divisionsIn,
  programsIn,
  suggestDates,
} from "./season-plan";
import type { FileRows, SeasonImportContext, SeasonImportSettings, SeasonPlan } from "./season-plan";
import { parseCsv } from "../games/csv";
import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import type { DivisionRecord, SeasonRecord, SetupRecord, TeamRecord } from "./types";

export type SeasonImportOptions = {
  leagues: SetupRecord[];
  seasons: SeasonRecord[];
  divisions: DivisionRecord[];
  teams: TeamRecord[];
  // called after a successful import
  onImported: (message: string, seasonId: string) => void;
  onClose: () => void;
};

const NEW = "__new__";
const MAX_FILE_BYTES = 2 * 1024 * 1024;

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

  if (/season .* could not be created/i.test(message) && /duplicate|already exists/i.test(message)) {
    hint = " A season with that name already exists: choose it from the Season list to add teams to it.";
  } else if (/division .* could not be added/i.test(message) && /duplicate/i.test(message)) {
    hint = " A division with that name already exists in this league: choose it from the list instead of creating it again.";
  } else if (/team .* could not be added/i.test(message) && /duplicate/i.test(message)) {
    hint = " A team with that name is already in this season.";
  } else if (/row-level security|permission denied/i.test(message)) {
    hint = " You may not have permission to do this.";
  }

  return `Nothing was created. ${message}${hint}`;
}

export function renderSeasonImport(
  container: HTMLElement,
  options: SeasonImportOptions
): void {
  const activeLeagues = options.leagues.filter((league) => league.is_active);

  const context: SeasonImportContext = {
    leagues: options.leagues.map((league) => ({ id: league.id, name: league.name })),
    seasons: options.seasons.map((season) => ({ id: season.id, name: season.name })),
    divisions: options.divisions.map((division) => ({
      id: division.id,
      name: division.name,
      league_id: division.league_id,
    })),
    teams: options.teams.map((team) => ({
      id: team.id,
      name: team.name,
      season_id: team.season_id,
      league_id: team.league_id,
      division_id: team.division_id,
    })),
  };

  let files: FileRows = { teams: [], divisions: [] };
  let teamFileName = "";
  let divisionFileName = "";
  let settings: SeasonImportSettings | null = null;
  let plan: SeasonPlan | null = null;
  let datesEdited = false;
  let busy = false;

  container.innerHTML = `
    <section class="importer" id="season-importer">
      <h3>Create a season from your registration files</h3>
      <p class="directory-description">
        Choose the <strong>Team Detail</strong> file from the registration
        system. It lists every team with its division, and is enough to create
        the season, its divisions and its teams. You can also add the
        <strong>Division Details</strong> file, which fills in the season's
        dates and checks the number of teams in each division. Save each file
        as CSV first. Nothing is created until you press the button at the
        bottom, and anything that already exists is left alone.
      </p>

      <label for="si-team-file">Team Detail file (.csv)</label>
      <input id="si-team-file" type="file" accept=".csv,text/csv" />

      <label for="si-division-file">Division Details file (.csv, optional)</label>
      <input id="si-division-file" type="file" accept=".csv,text/csv" />

      <p id="si-message" class="message" role="status" aria-live="polite"></p>

      <div id="si-body"></div>

      <div class="account-actions">
        <button id="si-close" class="secondary-button" type="button">Close</button>
      </div>
    </section>
  `;

  const root = container.querySelector<HTMLElement>("#season-importer")!;
  const body = root.querySelector<HTMLElement>("#si-body")!;
  const messageEl = root.querySelector<HTMLElement>("#si-message")!;

  const say = (text: string, kind: "error" | "success" = "error") => {
    messageEl.textContent = text;
    messageEl.className = text ? `message ${kind}` : "message";
  };

  const recompute = () => {
    if (!settings) return;
    plan = buildSeasonPlan({ files, settings, context, newId: makeId });
  };

  // Fresh first guesses for the current files, league and program.
  const resetSettings = (leagueId: string, program?: string) => {
    settings = defaultSeasonSettings(files, context, leagueId, program);
    datesEdited = false;
    recompute();
    renderBody();
  };

  // ------------------------------------------------------------- rendering
  const renderBody = () => {
    if (!settings) {
      body.innerHTML = "";
      return;
    }

    const programs = programsIn(files);
    const s = settings;
    const leagueDivisions = context.divisions
      .filter((division) => division.league_id === s.leagueId)
      .sort((a, b) => a.name.localeCompare(b.name));
    const fileDivisions = divisionsIn(files, s.program);

    const seasonNew = s.season.kind === "new" ? s.season : null;

    body.innerHTML = `
      <p class="directory-description">
        ${[
          teamFileName ? `Team file: <strong>${escapeHtml(teamFileName)}</strong> (${files.teams.length} teams)` : "",
          divisionFileName ? `Division file: <strong>${escapeHtml(divisionFileName)}</strong> (${files.divisions.length} divisions)` : "",
        ].filter(Boolean).join(" &middot; ")}
      </p>

      <label for="si-league">League</label>
      <select id="si-league">
        ${activeLeagues.map((league) => `
          <option value="${escapeHtml(league.id)}" ${league.id === s.leagueId ? "selected" : ""}>${escapeHtml(league.name)}</option>
        `).join("")}
      </select>

      ${programs.length > 1 ? `
        <label for="si-program">Program in the file (one season at a time)</label>
        <select id="si-program">
          ${programs.map((program) => `
            <option value="${escapeHtml(program)}" ${program === s.program ? "selected" : ""}>${escapeHtml(program)}</option>
          `).join("")}
        </select>
      ` : ""}

      <label for="si-season">Season</label>
      <select id="si-season">
        <option value="${NEW}" ${seasonNew ? "selected" : ""}>Create a new season</option>
        ${options.seasons.map((season) => `
          <option value="${escapeHtml(season.id)}" ${s.season.kind === "existing" && s.season.id === season.id ? "selected" : ""}>Add to: ${escapeHtml(season.name)}</option>
        `).join("")}
      </select>

      <div id="si-season-new" ${seasonNew ? "" : "hidden"}>
        <label for="si-season-name">New season name</label>
        <input id="si-season-name" type="text" maxlength="100" value="${escapeHtml(seasonNew?.name ?? "")}" />
        <div class="game-filters">
          <div>
            <label for="si-season-start">Starts</label>
            <input id="si-season-start" type="date" value="${escapeHtml(seasonNew?.startsOn ?? "")}" />
          </div>
          <div>
            <label for="si-season-end">Ends</label>
            <input id="si-season-end" type="date" value="${escapeHtml(seasonNew?.endsOn ?? "")}" />
          </div>
        </div>
      </div>

      <h4>Divisions</h4>
      <p class="directory-description">
        A division you already have is matched by name (a bracketed
        description such as "(Machine Pitch)" is ignored). Otherwise a new
        division is created, named without the description; you can change
        the name. Untick a division to leave it, and its teams, out.
      </p>
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Divisions">
          <thead><tr><th>Import</th><th>In the file</th><th>Teams</th><th>Your division</th></tr></thead>
          <tbody>
            ${fileDivisions.map((division) => {
              const choice = s.divisions[division.key];
              const target = choice?.target;
              const isNew = target?.kind === "new";
              return `
                <tr>
                  <td data-label="Import">
                    <label class="season-checkbox-label"><input type="checkbox" data-div-include="${escapeHtml(division.key)}" ${choice?.include === false ? "" : "checked"} /> Import</label>
                  </td>
                  <td data-label="In the file">${escapeHtml(division.name)}</td>
                  <td data-label="Teams">${division.teams}${division.expected !== null ? ` <span class="season-dates">(file says ${division.expected})</span>` : ""}</td>
                  <td data-label="Your division">
                    <select data-div-target="${escapeHtml(division.key)}" aria-label="Division for ${escapeHtml(division.name)}" ${choice?.include === false ? "disabled" : ""}>
                      <option value="${NEW}" ${isNew ? "selected" : ""}>Create a new division</option>
                      ${leagueDivisions.map((existing) => `
                        <option value="${escapeHtml(existing.id)}" ${target?.kind === "existing" && target.id === existing.id ? "selected" : ""}>${escapeHtml(existing.name)}</option>
                      `).join("")}
                    </select>
                    <input type="text" data-div-name="${escapeHtml(division.key)}" maxlength="100"
                      value="${escapeHtml(target?.kind === "new" ? target.name : "")}"
                      aria-label="Name of the new division" ${isNew && choice?.include !== false ? "" : "hidden"} />
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <div id="si-teams"></div>
      <div id="si-preview"></div>
    `;

    renderTeams();
    renderPreview();
  };

  const renderTeams = () => {
    const el = body.querySelector<HTMLElement>("#si-teams");
    if (!el || !plan || !settings) return;

    if (plan.teams.length === 0) {
      el.innerHTML = "";
      return;
    }

    // redrawing must not close a list the person has open
    const wasOpen = el.querySelector<HTMLDetailsElement>("details")?.open ?? false;

    el.innerHTML = `
      <details id="si-teams-details" ${wasOpen ? "open" : ""}>
        <summary>Teams (${plan.teams.length}): untick any you do not want</summary>
        <div class="table-scroll">
          <table class="umpire-table imp-table" aria-label="Teams">
            <thead><tr><th>Import</th><th>Team</th><th>Division</th><th>Note</th></tr></thead>
            <tbody>
              ${plan.teams.map((team) => {
                const locked = team.status === "exists" || team.note === "its division is not being imported";
                return `
                  <tr>
                    <td data-label="Import">
                      <input type="checkbox" data-team-line="${team.line}" aria-label="Import ${escapeHtml(team.name)}"
                        ${team.status === "skipped" ? "" : "checked"} ${locked ? "disabled" : ""} />
                    </td>
                    <td data-label="Team">${escapeHtml(team.name)}</td>
                    <td data-label="Division">${escapeHtml(team.divisionName || team.fileDivision)}</td>
                    <td data-label="Note">${escapeHtml(team.note)}</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </details>
    `;
  };

  const renderPreview = () => {
    const el = body.querySelector<HTMLElement>("#si-preview");
    if (!el || !plan) return;

    const p = plan;
    const teamsWord = (n: number) => (n === 1 ? "team" : "teams");
    const divisionsWord = (n: number) => (n === 1 ? "division" : "divisions");
    const nothing = p.newDivisions.length === 0 && p.newTeams.length === 0 && p.season.kind === "existing";
    const blocked = p.problems.length > 0 || nothing || busy;

    const seasonLine =
      p.season.kind === "new"
        ? `a new season, <strong>${escapeHtml(p.season.name || "(no name)")}</strong>${p.season.startsOn || p.season.endsOn ? ` (${escapeHtml(p.season.startsOn || "?")} to ${escapeHtml(p.season.endsOn || "?")})` : ""}`
        : `the existing season <strong>${escapeHtml(p.season.name)}</strong>, which is not changed`;

    const buttonText = nothing
      ? "Nothing new to add"
      : p.season.kind === "new"
        ? `Create the season, ${p.newDivisions.length} ${divisionsWord(p.newDivisions.length)} and ${p.newTeams.length} ${teamsWord(p.newTeams.length)}`
        : `Add ${p.newTeams.length} ${teamsWord(p.newTeams.length)}${p.newDivisions.length ? ` and ${p.newDivisions.length} ${divisionsWord(p.newDivisions.length)}` : ""}`;

    el.innerHTML = `
      <h4>Preview</h4>
      <p id="si-summary" class="imp-summary">
        This will use ${seasonLine}.
      </p>
      <ul class="imp-badges">
        <li class="imp-badge imp-new"><strong id="si-count-teams">${p.newTeams.length}</strong> new ${teamsWord(p.newTeams.length)}</li>
        <li class="imp-badge imp-new"><strong id="si-count-divisions">${p.newDivisions.length}</strong> new ${divisionsWord(p.newDivisions.length)}</li>
        <li class="imp-badge"><strong id="si-count-existing">${p.existingTeams}</strong> already here</li>
        <li class="imp-badge"><strong id="si-count-skipped">${p.skippedTeams}</strong> left out</li>
        <li class="imp-badge ${p.problems.length ? "imp-problem" : ""}"><strong id="si-count-problems">${p.problems.length}</strong> ${p.problems.length === 1 ? "problem" : "problems"}</li>
      </ul>

      ${p.problems.length ? `
        <div class="imp-section imp-problems" id="si-problems">
          <h5>Please fix ${p.problems.length === 1 ? "this" : "these"} first</h5>
          <ul class="imp-list">${p.problems.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul>
        </div>
      ` : ""}

      ${p.warnings.length ? `
        <div class="imp-section" id="si-warnings">
          <h5>Worth a look</h5>
          <ul class="imp-list">${p.warnings.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul>
        </div>
      ` : ""}

      ${p.newDivisions.length ? `
        <details class="imp-section">
          <summary>New divisions (${p.newDivisions.length})</summary>
          <ul class="imp-list">${p.newDivisions.map((division) => `<li>${escapeHtml(division.name)}</li>`).join("")}</ul>
        </details>
      ` : ""}

      <div class="account-actions">
        <button id="si-apply" class="primary-button" type="button" ${blocked ? "disabled" : ""}>${escapeHtml(buttonText)}</button>
      </div>
    `;
  };

  // --------------------------------------------------------------- actions
  const apply = async () => {
    if (!plan || !settings || busy || plan.problems.length > 0) return;

    busy = true;
    say("Creating\u2026", "success");
    renderPreview();

    const { data, error } = await supabase.rpc("import_season", {
      p_league_id: settings.leagueId,
      p_season:
        plan.season.kind === "new"
          ? {
              name: plan.season.name,
              starts_on: plan.season.startsOn || null,
              ends_on: plan.season.endsOn || null,
            }
          : { id: plan.season.id },
      p_divisions: plan.newDivisions.map((division) => ({ id: division.id, name: division.name })),
      p_teams: plan.newTeams.map((team) => ({
        id: team.id,
        name: team.name,
        division_id: team.divisionId,
      })),
    });

    busy = false;

    if (error) {
      say(explain(error.message), "error");
      renderPreview();
      return;
    }

    const result = (data ?? {}) as {
      season_id?: string;
      season_created?: boolean;
      divisions_created?: number;
      teams_created?: number;
    };

    const teams = result.teams_created ?? 0;
    const divisions = result.divisions_created ?? 0;
    const seasonName = plan.season.name;

    options.onImported(
      result.season_created
        ? `Created the season "${seasonName}" with ${divisions} new ${divisions === 1 ? "division" : "divisions"} and ${teams} ${teams === 1 ? "team" : "teams"}.`
        : `Added ${teams} ${teams === 1 ? "team" : "teams"} to "${seasonName}"${divisions ? ` and created ${divisions} new ${divisions === 1 ? "division" : "divisions"}` : ""}.`,
      result.season_id ?? ""
    );
  };

  const loadFile = async (file: File, kind: "team" | "division") => {
    say("");

    if (/\.xlsx?$/i.test(file.name)) {
      say("That is an Excel file. Please save it as CSV first (File, Save as or Download, Comma-separated values) and choose that file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      say("That file is too large (the limit is 2 MB).");
      return;
    }

    let table: string[][];
    try {
      table = parseCsv(await file.text());
    } catch (error) {
      say(error instanceof Error ? error.message : "That file could not be read.");
      return;
    }

    if (table.length < 2) {
      say("That file has no rows below the headings.");
      return;
    }

    if (kind === "team") {
      const read = readTeamDetail(table);
      if (read.missing.length) {
        say(`That does not look like a Team Detail file: these headings were not found: ${read.missing.join(", ")}.`);
        return;
      }
      files = { ...files, teams: read.rows };
      teamFileName = file.name;
    } else {
      const read = readDivisionDetails(table);
      if (read.missing.length) {
        say(`That does not look like a Division Details file: these headings were not found: ${read.missing.join(", ")}.`);
        return;
      }
      files = { ...files, divisions: read.rows };
      divisionFileName = file.name;
    }

    if (activeLeagues.length === 0) {
      say("There is no active league yet. Add a league first, then come back.");
      return;
    }

    resetSettings(settings?.leagueId ?? activeLeagues[0].id, settings?.program || undefined);
  };

  // ---------------------------------------------------------------- events
  root.querySelector("#si-team-file")?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void loadFile(file, "team");
  });

  root.querySelector("#si-division-file")?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void loadFile(file, "division");
  });

  root.querySelector("#si-close")?.addEventListener("click", options.onClose);

  body.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("#si-apply")) void apply();
  });

  body.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !settings) return;

    if (target instanceof HTMLSelectElement && target.id === "si-league") {
      resetSettings(target.value, settings.program);
      return;
    }

    if (target instanceof HTMLSelectElement && target.id === "si-program") {
      resetSettings(settings.leagueId, target.value);
      return;
    }

    if (target instanceof HTMLSelectElement && target.id === "si-season") {
      if (target.value === NEW) {
        const dates = suggestDates(divisionsIn(files, settings.program).filter((d) => settings!.divisions[d.key]?.include !== false));
        settings.season = { kind: "new", name: settings.program, startsOn: dates.startsOn, endsOn: dates.endsOn };
      } else {
        settings.season = { kind: "existing", id: target.value };
      }
      recompute();
      renderBody();
      return;
    }

    if (target instanceof HTMLInputElement && target.dataset.divInclude !== undefined) {
      const choice = settings.divisions[target.dataset.divInclude];
      if (choice) choice.include = target.checked;

      // keep the suggested dates in step, unless they were typed by hand
      if (settings.season.kind === "new" && !datesEdited) {
        const dates = suggestDates(divisionsIn(files, settings.program).filter((d) => settings!.divisions[d.key]?.include !== false));
        settings.season = { ...settings.season, startsOn: dates.startsOn, endsOn: dates.endsOn };
      }
      recompute();
      renderBody();
      return;
    }

    if (target instanceof HTMLSelectElement && target.dataset.divTarget !== undefined) {
      const key = target.dataset.divTarget;
      const input = body.querySelector<HTMLInputElement>(`[data-div-name="${CSS.escape(key)}"]`);
      const choice = settings.divisions[key];
      if (!choice) return;

      if (target.value === NEW) {
        const name = input?.value.trim() || divisionsIn(files, settings.program).find((d) => d.key === key)?.name || "";
        choice.target = { kind: "new", name };
        if (input) { input.value = name; input.hidden = false; }
      } else {
        choice.target = { kind: "existing", id: target.value };
        if (input) input.hidden = true;
      }
      recompute();
      renderTeams();
      renderPreview();
      return;
    }

    if (target instanceof HTMLInputElement && target.dataset.teamLine !== undefined) {
      settings.skipTeams[target.dataset.teamLine] = !target.checked;
      recompute();
      renderTeams();
      renderPreview();
      return;
    }

    // typing dates by hand stops them being re-suggested
    if (target instanceof HTMLInputElement && (target.id === "si-season-start" || target.id === "si-season-end")) {
      if (settings.season.kind === "new") {
        datesEdited = true;
        settings.season = {
          ...settings.season,
          startsOn: target.id === "si-season-start" ? target.value : settings.season.startsOn,
          endsOn: target.id === "si-season-end" ? target.value : settings.season.endsOn,
        };
        recompute();
        renderPreview();
      }
    }
  });

  body.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !settings) return;

    if (target.id === "si-season-name" && settings.season.kind === "new") {
      settings.season = { ...settings.season, name: target.value };
      recompute();
      renderPreview();
      return;
    }

    if (target.dataset.divName !== undefined) {
      const choice = settings.divisions[target.dataset.divName];
      if (choice && choice.target.kind === "new") {
        choice.target = { kind: "new", name: target.value };
        recompute();
        renderTeams();
        renderPreview();
      }
    }
  });
}
