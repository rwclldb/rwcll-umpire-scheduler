import { renderDivisionForm, renderDivisions, wireDivisionForm } from "./setup/divisions";
import { renderLeagueForm, renderLeagues, wireLeagueForm } from "./setup/leagues";
import { renderLocationForm, renderLocations, wireLocationForm } from "./setup/locations";
import { renderSeasonImport } from "./setup/season-import";
import { renderSeasonForm, renderSeasons, wireSeasonForm } from "./setup/seasons";
import { registerReloader, state } from "./setup/state";
import { supabase } from "./supabase";
import { openTeamEditor, renderTeamForm, renderTeamsPanel, wireTeamForm } from "./setup/teams";
import type { AgeChartRecord, DivisionRecord, LocationRecord, SeasonRecord, SetupRecord, TeamRecord } from "./setup/types";

// A message to show once, at the top, after the screen is drawn again (for
// example "Created the season ...").
let flashMessage: string | null = null;

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

  state.ageCharts = (chartsResult.data ?? []) as AgeChartRecord[];
  state.loadedSeasons = seasons;
  state.loadedLeagues = leagues;
  state.loadedDivisions = divisions;
  state.loadedTeams = teams;

  const leagueEditor = state.editingLeagueId
    ? leagues.find((league) => league.id === state.editingLeagueId) ?? null
    : null;

  const teamEditor = state.editingTeamId
    ? teams.find((team) => team.id === state.editingTeamId) ?? null
    : null;

  const locationEditor = state.editingLocationId
    ? locations.find((location) => location.id === state.editingLocationId) ?? null
    : null;

  const divisionEditor = state.editingDivisionId
    ? divisions.find((division) => division.id === state.editingDivisionId) ?? null
    : null;

  const editor = state.editingSeasonId
    ? seasons.find((season) => season.id === state.editingSeasonId) ?? null
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
        <div class="header-actions">
          <button id="import-season-button"
            class="secondary-button" type="button">Create a season from a file</button>
          <button id="refresh-league-setup"
            class="secondary-button" type="button">Refresh</button>
        </div>
      </div>

      <p id="league-setup-message" class="message"
        role="status" aria-live="polite"></p>

      <div id="season-import-editor"></div>

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
      state.editingSeasonId = null;
      state.editingLeagueId = null;
      state.editingDivisionId = null;
      state.editingLocationId = null;
      state.editingTeamId = null;
      void renderLeagueSetup(container);
    });

  // ----- Create a season from the registration files -----
  container.querySelector("#import-season-button")
    ?.addEventListener("click", () => {
      const holder = container.querySelector<HTMLElement>("#season-import-editor");
      if (!holder) return;

      renderSeasonImport(holder, {
        leagues,
        seasons,
        divisions,
        teams,
        onClose: () => {
          holder.innerHTML = "";
        },
        onImported: (text, seasonId) => {
          flashMessage = text;
          // show the new season's teams in the Teams list
          if (seasonId) state.teamSeasonFilter = seasonId;
          void renderLeagueSetup(container);
        },
      });

      holder.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  // ----- Leagues -----
  container.querySelector("#add-league-button")
    ?.addEventListener("click", () => {
      state.editingLeagueId = null;
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
        state.editingLeagueId = button.dataset.editLeague ?? null;
        const league = leagues.find((item) => item.id === state.editingLeagueId);
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
      state.teamSeasonFilter = target.value;
      teamsPanel.innerHTML = renderTeamsPanel();
    }

    if (target instanceof HTMLSelectElement && target.id === "team-division-filter") {
      state.teamDivisionFilter = target.value;
      teamsPanel.innerHTML = renderTeamsPanel();
    }
  });

  if (teamEditor) {
    wireTeamForm(container);
  }

  // ----- Locations -----
  container.querySelector("#add-location-button")
    ?.addEventListener("click", () => {
      state.editingLocationId = null;
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
        state.editingLocationId = button.dataset.editLocation ?? null;
        const location = locations.find(
          (item) => item.id === state.editingLocationId,
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

      state.editingDivisionId = null;
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
        state.editingDivisionId = button.dataset.editDivision ?? null;
        const division = divisions.find(
          (item) => item.id === state.editingDivisionId,
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
      state.editingSeasonId = null;
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
        state.editingSeasonId = button.dataset.editSeason ?? null;
        const season = seasons.find((item) => item.id === state.editingSeasonId);
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

  if (flashMessage) {
    const message = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (message) {
      message.textContent = flashMessage;
      message.className = "message success";
    }
    flashMessage = null;
  }
}

// Let the form files reload this screen after a save.
registerReloader(renderLeagueSetup);
