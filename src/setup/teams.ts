import { wireDeleteButton } from "./delete-button";
import { reloadSetup, state } from "./state";
import { supabase } from "../supabase";
import type { DivisionRecord, TeamRecord } from "./types";
import { escapeHtml } from "../ui";

export function ageRangeLabel(division: DivisionRecord): string {
  if (division.youngest_ll_age === null || division.oldest_ll_age === null) {
    return "";
  }
  return division.youngest_ll_age === division.oldest_ll_age
    ? ` (LL age ${division.youngest_ll_age})`
    : ` (LL ages ${division.youngest_ll_age}\u2013${division.oldest_ll_age})`;
}

// Inner HTML of the Teams panel. Re-rendered in place when the
// season or division filter changes, so other open forms are not disturbed.
export function renderTeamsPanel(): string {
  const showLeague = state.loadedLeagues.length > 1;
  const inSeason = state.teamSeasonFilter
    ? state.loadedTeams.filter((team) => team.season_id === state.teamSeasonFilter)
    : state.loadedTeams;

  // The division filter shows how many teams each division has in the season
  // being looked at.
  const NONE = "__none__";
  const withoutDivision = inSeason.filter((team) => !team.division_id).length;
  const visible =
    state.teamDivisionFilter === ""
      ? inSeason
      : state.teamDivisionFilter === NONE
        ? inSeason.filter((team) => !team.division_id)
        : inSeason.filter((team) => team.division_id === state.teamDivisionFilter);

  const divisionOptions =
    `<option value="">All divisions (${inSeason.length})</option>` +
    state.loadedDivisions.map((division) => `
      <option value="${escapeHtml(division.id)}"
        ${division.id === state.teamDivisionFilter ? "selected" : ""}>
        ${escapeHtml(division.name)}
        (${inSeason.filter((team) => team.division_id === division.id).length})
      </option>
    `).join("") +
    (withoutDivision > 0 || state.teamDivisionFilter === NONE
      ? `<option value="${NONE}" ${state.teamDivisionFilter === NONE ? "selected" : ""}>
          No division (${withoutDivision})
        </option>`
      : "");

  const seasonOptions =
    `<option value="">All seasons</option>` +
    state.loadedSeasons.map((season) => `
      <option value="${escapeHtml(season.id)}"
        ${season.id === state.teamSeasonFilter ? "selected" : ""}>
        ${escapeHtml(season.name)}
      </option>
    `).join("");

  const items = visible.length
    ? `<ul class="setup-list">${visible.map((team) => {
        const season = state.loadedSeasons.find((item) => item.id === team.season_id);
        const division = state.loadedDivisions.find(
          (item) => item.id === team.division_id,
        );
        const league = state.loadedLeagues.find((item) => item.id === team.league_id);
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
        state.loadedTeams.length === 0
          ? "No teams yet. Add the teams that play in each season."
          : inSeason.length === 0
            ? "No teams in this season yet."
            : "No teams in this division."
      }</p>`;

  return `
    <h3>Teams</h3>
    <button id="add-team-button" type="button" class="primary-button">
      Add team
    </button>
    <label for="team-season-filter">Show season</label>
    <select id="team-season-filter">${seasonOptions}</select>
    <label for="team-division-filter">Show division</label>
    <select id="team-division-filter">${divisionOptions}</select>
    ${items}
  `;
}

export function renderTeamDivisionOptions(
  leagueId: string,
  selectedId: string | null,
): string {
  const options = state.loadedDivisions.filter((division) =>
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

export function renderTeamForm(team: TeamRecord | null): string {
  const activeLeagues = state.loadedLeagues.filter((league) => league.is_active);
  const activeSeasons = state.loadedSeasons.filter((season) => season.is_active);

  const leagueId = team
    ? team.league_id
    : activeLeagues.length === 1 ? activeLeagues[0].id : "";

  const seasonId = team
    ? team.season_id
    : activeSeasons.some((season) => season.id === state.teamSeasonFilter)
      ? state.teamSeasonFilter
      : activeSeasons.length === 1 ? activeSeasons[0].id : "";

  // League and season are fixed once a team exists, because games
  // will later depend on them. To change them, delete and re-add.
  const fixedFields = team
    ? `
      <p class="season-dates">
        League: ${escapeHtml(
          state.loadedLeagues.find((league) => league.id === team.league_id)?.name
            ?? "Unknown league",
        )}
      </p>
      <p class="season-dates">
        Season: ${escapeHtml(
          state.loadedSeasons.find((season) => season.id === team.season_id)?.name
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

export function openTeamEditor(container: HTMLElement, team: TeamRecord | null): void {
  const editorContainer = container.querySelector("#team-editor");
  if (!editorContainer) return;

  state.editingTeamId = team ? team.id : null;
  editorContainer.innerHTML = renderTeamForm(team);
  wireTeamForm(container);
  editorContainer.scrollIntoView({ behavior: "smooth" });
}

export function wireTeamForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#team-form");
  if (!form) return;

  wireDeleteButton(container, {
    buttonId: "#delete-team-button",
    table: "teams",
    noun: "team",
    getId: () => state.editingTeamId,
    inUseMessage:
      "This team can't be deleted because games use it. " +
      "Move or remove those games first, or mark the team " +
      "inactive instead.",
    onDeleted: () => { state.editingTeamId = null; },
  });

  container.querySelector("#cancel-team-button")
    ?.addEventListener("click", () => {
      state.editingTeamId = null;
      void reloadSetup(container);
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
    const existing = state.editingTeamId
      ? state.loadedTeams.find((item) => item.id === state.editingTeamId) ?? null
      : null;

    let leagueId: string;
    let seasonId: string;

    if (existing) {
      leagueId = existing.league_id;
      seasonId = existing.season_id;
    } else {
      leagueId = String(data.get("league_id") ?? "");
      seasonId = String(data.get("season_id") ?? "");

      if (!state.loadedLeagues.some((item) => item.id === leagueId)) {
        showError("Choose a league.");
        return;
      }
      if (!state.loadedSeasons.some((item) => item.id === seasonId)) {
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
      !state.loadedDivisions.some(
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

    state.editingTeamId = null;
    await reloadSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Team saved successfully.";
      successMessage.className = "message success";
    }
  });
}
