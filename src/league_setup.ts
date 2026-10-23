
import { supabase } from "./supabase";

type SetupRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type SeasonRecord = SetupRecord & {
  starts_on: string | null;
  ends_on: string | null;
};

type DivisionRecord = SetupRecord & {
  league_id: string;
  age_group: string | null;
};

let editingSeasonId: string | null = null;

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

function renderList(
  title: string,
  records: SetupRecord[],
  emptyMessage: string,
): string {
  const items = records.length
    ? `<ul class="setup-list">${records.map((record) => `
        <li>
          <span>${escapeHtml(record.name)}</span>
          <span class="setup-status">
            ${record.is_active ? "Active" : "Inactive"}
          </span>
        </li>
      `).join("")}</ul>`
    : `<p class="directory-empty">${emptyMessage}</p>`;

  return `
    <section class="setup-panel">
      <h3>${title}</h3>
      ${items}
    </section>
  `;
}

function renderSeasons(seasons: SeasonRecord[]): string {
  const items = seasons.length
    ? `<ul class="setup-list">${seasons.map((season) => `
        <li class="season-item">
          <div>
            <strong>${escapeHtml(season.name)}</strong>
            <p class="season-dates">
              ${season.starts_on || "Start date not set"}
              &ndash;
              ${season.ends_on || "End date not set"}
            </p>
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
      `).join("")}</ul>`
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

      <label class="season-checkbox-label">
        <input name="is_active" type="checkbox"
          ${active ? "checked" : ""} />
        Active season
      </label>

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

export async function renderLeagueSetup(
  container: HTMLElement,
): Promise<void> {
  container.innerHTML = `
    <section class="directory-section">
      <h2>League Setup</h2>
      <p class="directory-description">Loading setup records…</p>
    </section>
  `;

  const [leaguesResult, seasonsResult, divisionsResult, locationsResult] =
    await Promise.all([
      supabase.from("leagues")
        .select("id, name, is_active").order("name"),
      supabase.from("seasons")
        .select("id, name, starts_on, ends_on, is_active")
        .order("starts_on", { ascending: false }),
      supabase.from("divisions")
        .select("id, name, age_group, league_id, is_active")
        .order("name"),
      supabase.from("locations")
        .select("id, name, is_active").order("name"),
    ]);

  const firstError =
    leaguesResult.error ??
    seasonsResult.error ??
    divisionsResult.error ??
    locationsResult.error;

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
  const locations = (locationsResult.data ?? []) as SetupRecord[];

  const editor = editingSeasonId
    ? seasons.find((season) => season.id === editingSeasonId) ?? null
    : null;

  container.innerHTML = `
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <h2>League Setup</h2>
          <p class="directory-description">
            Configure seasons, divisions, and game locations.
          </p>
        </div>
        <button id="refresh-league-setup"
          class="secondary-button" type="button">Refresh</button>
      </div>

      <p id="league-setup-message" class="message"
        role="status" aria-live="polite"></p>

      <div id="season-editor">
        ${editor ? renderSeasonForm(editor) : ""}
      </div>

      <div class="setup-grid">
        ${renderList("Leagues", leagues, "No leagues have been added yet.")}
        ${renderSeasons(seasons)}
        ${renderList(
          "Divisions",
          divisions.map((division) => ({
            ...division,
            name: division.age_group
              ? `${division.name} (${division.age_group})`
              : division.name,
          })),
          "No divisions have been added yet.",
        )}
        ${renderList(
          "Game Locations",
          locations,
          "No locations have been added yet.",
        )}
      </div>
    </section>
  `;

  container.querySelector("#refresh-league-setup")
    ?.addEventListener("click", () => {
      editingSeasonId = null;
      void renderLeagueSetup(container);
    });

  container.querySelector("#add-season-button")
    ?.addEventListener("click", () => {
      editingSeasonId = null;
      const editorContainer = container.querySelector("#season-editor");
      if (editorContainer) {
        editorContainer.innerHTML = renderSeasonForm(null);
        wireSeasonForm(container);
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

function wireSeasonForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#season-form");
  if (!form) return;

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
