import { wireDeleteButton } from "./delete-button";
import { reloadSetup, state } from "./state";
import { supabase } from "../supabase";
import type { SetupRecord } from "./types";
import { escapeHtml } from "../ui";

// A league as the League Setup screen holds it. The warning period is read
// with the league; it is missing only from places that do not need it.
type League = SetupRecord & { unconfirmed_warning_days?: number; self_assign_max_games?: number | null };

function unconfirmedText(days: number): string {
  return days === 0
    ? "No warning about unconfirmed assignments"
    : `Warns about unconfirmed assignments ${days} ${days === 1 ? "day" : "days"} before a game`;
}

export function renderLeagues(leagues: League[]): string {
  const items = leagues.length
    ? `<ul class="setup-list">${leagues.map((league) => `
        <li class="season-item">
          <div>
            <strong>${escapeHtml(league.name)}</strong>
            <span class="setup-status">
              ${league.is_active ? "Active" : "Inactive"}
            </span>
            <p class="season-dates">${unconfirmedText(league.unconfirmed_warning_days ?? 7)}</p>
            <p class="season-dates">${league.self_assign_max_games ? `An umpire can take up to ${league.self_assign_max_games} upcoming ${league.self_assign_max_games === 1 ? "game" : "games"} for themselves` : "No limit on games umpires take for themselves"}</p>
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

export function renderLeagueForm(league: League | null): string {
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

      <label for="league-unconfirmed-days">Warn about unconfirmed assignments (days before a game)</label>
      <input id="league-unconfirmed-days" name="unconfirmed_warning_days"
        type="number" min="0" max="60" step="1" inputmode="numeric"
        value="${league?.unconfirmed_warning_days ?? 7}" />
      <p class="season-dates">
        When an umpire has still not confirmed an assignment this many days
        before the game, the administrators are warned. Use 0 for no warning.
      </p>

      <label for="league-self-assign-max">Most upcoming games an umpire can take for themselves</label>
      <input id="league-self-assign-max" name="self_assign_max_games"
        type="number" min="1" max="500" step="1" inputmode="numeric"
        placeholder="No limit"
        value="${league?.self_assign_max_games ?? ""}" />
      <p class="season-dates">
        Leave blank for no limit. Games already played and canceled games do not
        count. It limits only games an umpire takes for themselves, never
        assignments an administrator makes.
      </p>
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

export function wireLeagueForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#league-form");
  if (!form) return;

  wireDeleteButton(container, {
    buttonId: "#delete-league-button",
    table: "leagues",
    noun: "league",
    getId: () => state.editingLeagueId,
    inUseMessage:
      "This league can't be deleted because divisions or teams use it. " +
      "Remove those first, or mark the league inactive instead.",
    onDeleted: () => { state.editingLeagueId = null; },
  });

  container.querySelector("#cancel-league-button")
    ?.addEventListener("click", () => {
      state.editingLeagueId = null;
      void reloadSetup(container);
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

    const daysText = String(data.get("unconfirmed_warning_days") ?? "").trim();
    const days = Number(daysText);

    if (daysText === "" || !Number.isInteger(days) || days < 0 || days > 60) {
      if (message) {
        message.textContent = "Enter a whole number of days from 0 to 60 for the unconfirmed-assignment warning.";
        message.className = "message error";
      }
      return;
    }

    const maxText = String(data.get("self_assign_max_games") ?? "").trim();
    const maxGames = maxText === "" ? null : Number(maxText);

    if (maxGames !== null && (!Number.isInteger(maxGames) || maxGames < 1 || maxGames > 500)) {
      if (message) {
        message.textContent = "Enter a whole number of games from 1 to 500 for the limit, or leave it blank for no limit.";
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

    const values = { name, is_active: isActive, unconfirmed_warning_days: days, self_assign_max_games: maxGames };

    const result = state.editingLeagueId
      ? await supabase.from("leagues")
          .update(values).eq("id", state.editingLeagueId)
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

    state.editingLeagueId = null;
    await reloadSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "League saved successfully.";
      successMessage.className = "message success";
    }
  });
}
