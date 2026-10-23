
import { supabase } from "./supabase";

type SetupRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type DivisionRecord = SetupRecord & {
  league_id: string;
  age_group: string | null;
};

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
    ? `<ul class="setup-list">${records
        .map(
          (record) => `
            <li>
              <span>${escapeHtml(record.name)}</span>
              <span class="setup-status">
                ${record.is_active ? "Active" : "Inactive"}
              </span>
            </li>
          `,
        )
        .join("")}</ul>`
    : `<p class="directory-empty">${emptyMessage}</p>`;

  return `
    <section class="setup-panel">
      <h3>${title}</h3>
      ${items}
    </section>
  `;
}

export async function renderLeagueSetup(
  container: HTMLElement,
): Promise<void> {
  container.innerHTML = `
    <section class="directory-section">
      <h2>League Setup</h2>
      <p class="directory-description">
        Manage the foundation for leagues, seasons, divisions, and fields.
      </p>
      <p class="message" role="status">Loading setup records…</p>
    </section>
  `;

  const [leaguesResult, seasonsResult, divisionsResult, locationsResult] =
    await Promise.all([
      supabase
        .from("leagues")
        .select("id, name, is_active")
        .order("name"),
      supabase
        .from("seasons")
        .select("id, name, is_active")
        .order("name"),
      supabase
        .from("divisions")
        .select("id, name, age_group, league_id, is_active")
        .order("name"),
      supabase
        .from("locations")
        .select("id, name, is_active")
        .order("name"),
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
          Unable to load setup records. Please refresh and try again.
        </p>
      </section>
    `;
    console.error("League setup load failed:", firstError.message);
    return;
  }

  const leagues = (leaguesResult.data ?? []) as SetupRecord[];
  const seasons = (seasonsResult.data ?? []) as SetupRecord[];
  const divisions = (divisionsResult.data ?? []) as DivisionRecord[];
  const locations = (locationsResult.data ?? []) as SetupRecord[];

  container.innerHTML = `
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <h2>League Setup</h2>
          <p class="directory-description">
            Your starting point for seasons, divisions, and game locations.
          </p>
        </div>
        <button id="refresh-league-setup"
          class="secondary-button" type="button">
          Refresh
        </button>
      </div>

      <p id="league-setup-message" class="message"
        role="status" aria-live="polite"></p>

      <div class="setup-grid">
        ${renderList("Leagues", leagues, "No leagues have been added yet.")}
        ${renderList("Seasons", seasons, "No seasons have been added yet.")}
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

  container
    .querySelector<HTMLButtonElement>("#refresh-league-setup")
    ?.addEventListener("click", () => {
      void renderLeagueSetup(container);
    });
}
