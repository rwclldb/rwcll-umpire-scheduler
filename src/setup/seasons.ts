import { renderChartOptions, wireChartImport } from "./age-charts";
import { wireDeleteButton } from "./delete-button";
import { reloadSetup, state } from "./state";
import { supabase } from "../supabase";
import type { SeasonRecord } from "./types";
import { escapeHtml } from "../ui";

export function renderSeasons(seasons: SeasonRecord[]): string {
  const items = seasons.length
    ? `<ul class="setup-list">${seasons.map((season) => {
        const chart = state.ageCharts.find(
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

export function renderSeasonForm(season: SeasonRecord | null): string {
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
        ${renderChartOptions(state.ageCharts, season?.age_chart_id ?? null)}
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

export function wireSeasonForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#season-form");
  if (!form) return;

  wireChartImport(form);

  wireDeleteButton(container, {
    buttonId: "#delete-season-button",
    table: "seasons",
    noun: "season",
    getId: () => state.editingSeasonId,
    inUseMessage:
      "This season can't be deleted because teams or games use it. " +
      "Remove those first, or mark the season inactive instead.",
    onDeleted: () => { state.editingSeasonId = null; },
  });

  container.querySelector("#cancel-season-button")
    ?.addEventListener("click", () => {
      state.editingSeasonId = null;
      void reloadSetup(container);
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
    const originalChartId = state.editingSeasonId
      ? state.loadedSeasons.find((season) => season.id === state.editingSeasonId)
          ?.age_chart_id ?? null
      : null;

    if (state.editingSeasonId && originalChartId && chartId !== originalChartId) {
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

    const result = state.editingSeasonId
      ? await supabase.from("seasons")
          .update(values).eq("id", state.editingSeasonId)
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

    state.editingSeasonId = null;
    await reloadSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Season saved successfully.";
      successMessage.className = "message success";
    }
  });
}
