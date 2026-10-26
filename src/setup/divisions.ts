import { MAX_LL_AGE, MIN_LL_AGE } from "./constants";
import { wireDeleteButton } from "./delete-button";
import { reloadSetup, state } from "./state";
import { supabase } from "../supabase";
import type { DivisionRecord, SetupRecord } from "./types";
import { escapeHtml } from "../ui";

export type DivisionAges =
  | { error: string }
  | { youngest: number; oldest: number };

export function validateDivisionAges(
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

export function renderDivisions(
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
            <p class="season-dates">${(division.umpires_per_game ?? 2) === 1 ? "1 umpire" : "2 umpires"} per game</p>
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

export function renderDivisionForm(
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

      <label for="division-umpires">Umpires needed per game</label>
      <select id="division-umpires" name="umpires_per_game">
        <option value="2" ${(division?.umpires_per_game ?? 2) === 2 ? "selected" : ""}>2 umpires (plate and field)</option>
        <option value="1" ${division?.umpires_per_game === 1 ? "selected" : ""}>1 umpire</option>
      </select>
      <p class="season-dates">
        This is the starting number for every game in the division. The
        umpire chief can change it for an individual game.
      </p>

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

export function wireDivisionForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#division-form");
  if (!form) return;

  container.querySelector("#cancel-division-button")
    ?.addEventListener("click", () => {
      state.editingDivisionId = null;
      void reloadSetup(container);
    });

  wireDeleteButton(container, {
    buttonId: "#delete-division-button",
    table: "divisions",
    noun: "division",
    getId: () => state.editingDivisionId,
    inUseMessage:
      "This division can't be deleted because teams use it. " +
      "Move or remove those teams first, or mark the division " +
      "inactive instead.",
    onDeleted: () => { state.editingDivisionId = null; },
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
    if (!state.editingDivisionId) {
      leagueId = String(data.get("league_id") ?? "") || null;
      if (!leagueId || !state.loadedLeagues.some((item) => item.id === leagueId)) {
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
      umpires_per_game: Number(data.get("umpires_per_game")) === 1 ? 1 : 2,
      description: description || null,
      is_active: isActive,
    };

    const result = state.editingDivisionId
      ? await supabase.from("divisions")
          .update(values).eq("id", state.editingDivisionId)
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

    state.editingDivisionId = null;
    await reloadSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Division saved successfully.";
      successMessage.className = "message success";
    }
  });
}
