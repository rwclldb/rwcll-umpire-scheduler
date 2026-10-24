import { wireDeleteButton } from "./delete-button";
import { reloadSetup, state } from "./state";
import { supabase } from "../supabase";
import type { SetupRecord } from "./types";
import { escapeHtml } from "../ui";

export function renderLeagues(leagues: SetupRecord[]): string {
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

export function renderLeagueForm(league: SetupRecord | null): string {
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

    const saveButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";
    }

    const values = { name, is_active: isActive };

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
