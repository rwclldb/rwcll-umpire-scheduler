import { wireDeleteButton } from "./delete-button";
import { reloadSetup, state } from "./state";
import { supabase } from "../supabase";
import type { LocationRecord } from "./types";
import { escapeHtml } from "../ui";

export function renderLocations(locations: LocationRecord[]): string {
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
            <span class="field-kind ${location.is_league_field ? "field-kind-league" : "field-kind-away"}">
              ${location.is_league_field ? "League field" : "Away field"}
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

export function renderLocationForm(location: LocationRecord | null): string {
  const name = location?.name ?? "";
  const address = location?.address ?? "";
  const notes = location?.notes ?? "";
  const active = location?.is_active ?? true;
  // most new fields are ones this league runs
  const leagueField = location?.is_league_field ?? true;

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

      <label class="season-checkbox-label">
        <input name="is_league_field" type="checkbox"
          ${leagueField ? "checked" : ""} />
        A field this league runs
      </label>
      <p class="season-dates">
        Leave this unticked for a field our teams travel to (an away field).
      </p>
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

export function wireLocationForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>("#location-form");
  if (!form) return;

  wireDeleteButton(container, {
    buttonId: "#delete-location-button",
    table: "locations",
    noun: "location",
    getId: () => state.editingLocationId,
    inUseMessage:
      "This location can't be deleted because games use it. " +
      "Move or remove those games first, or mark the location " +
      "inactive instead.",
    onDeleted: () => { state.editingLocationId = null; },
  });

  container.querySelector("#cancel-location-button")
    ?.addEventListener("click", () => {
      state.editingLocationId = null;
      void reloadSetup(container);
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
    const isLeagueField = form.querySelector<HTMLInputElement>(
      '[name="is_league_field"]',
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
      is_league_field: isLeagueField,
    };

    const result = state.editingLocationId
      ? await supabase.from("locations")
          .update(values).eq("id", state.editingLocationId)
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

    state.editingLocationId = null;
    await reloadSetup(container);

    const successMessage = container.querySelector<HTMLParagraphElement>(
      "#league-setup-message",
    );
    if (successMessage) {
      successMessage.textContent = "Location saved successfully.";
      successMessage.className = "message success";
    }
  });
}
