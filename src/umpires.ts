import { supabase } from "./supabase";

type UmpireClassification = "youth" | "adult";
type EligibilityStatus = "active" | "inactive" | "suspended";

type Umpire = {
  id: string;
  profile_id: string | null;
  umpire_number: string | null;
  display_name: string;
  classification: UmpireClassification;
  phone: string | null;
  eligibility_status: EligibilityStatus;
};

let directoryElement: HTMLElement | null = null;
let allUmpires: Umpire[] = [];

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character];
  });
}

function statusLabel(status: EligibilityStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "suspended":
      return "Suspended";
  }
}

function renderRows(searchTerm = "") {
  const results = document.querySelector<HTMLDivElement>("#umpire-results");
  if (!results) return;

  const query = searchTerm.trim().toLowerCase();

  const filtered = allUmpires.filter((umpire) => {
    return [
      umpire.display_name,
      umpire.umpire_number ?? "",
      umpire.classification,
      umpire.phone ?? "",
      umpire.eligibility_status
    ].some((value) => value.toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    results.innerHTML = `
      <p class="directory-empty">
        ${allUmpires.length === 0
          ? "No umpire records have been created yet."
          : "No umpires match your search."}
      </p>
    `;
    return;
  }

  results.innerHTML = `
    <div class="table-scroll">
      <table class="umpire-table">
        <thead>
          <tr>
            <th>Umpire</th>
            <th>Number</th>
            <th>Classification</th>
            <th>Phone</th>
            <th>Eligibility</th>
            <th>Account</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((umpire) => `
            <tr>
              <td>${escapeHtml(umpire.display_name)}</td>
              <td>${escapeHtml(umpire.umpire_number || "—")}</td>
              <td>${escapeHtml(
                umpire.classification === "youth" ? "Youth" : "Adult"
              )}</td>
              <td>${escapeHtml(umpire.phone || "—")}</td>
              <td>
                <span class="eligibility-badge eligibility-${umpire.eligibility_status}">
                  ${statusLabel(umpire.eligibility_status)}
                </span>
              </td>
              <td>${umpire.profile_id ? "Linked" : "Not linked"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadUmpires() {
  const results = document.querySelector<HTMLDivElement>("#umpire-results");
  const message = document.querySelector<HTMLParagraphElement>(
    "#umpire-directory-message"
  );

  if (!results) return;

  results.textContent = "Loading umpire records…";

  const { data, error } = await supabase
    .from("umpires")
    .select(`
      id,
      profile_id,
      umpire_number,
      display_name,
      classification,
      phone,
      eligibility_status
    `)
    .order("display_name");

  if (error) {
    results.textContent = "Unable to load the umpire directory.";
    if (message) {
      message.textContent = error.message;
      message.className = "message error";
    }
    return;
  }

  allUmpires = (data ?? []) as Umpire[];
  renderRows(
    document.querySelector<HTMLInputElement>("#umpire-search")?.value ?? ""
  );

  if (message) {
    message.textContent = `${allUmpires.length} umpire record(s) loaded.`;
    message.className = "message success";
  }
}

export function renderUmpireDirectory(container: HTMLElement) {
  directoryElement = container;

  container.innerHTML = `
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <p class="eyebrow">RWCLL · ADMINISTRATION</p>
          <h2>Umpire Directory</h2>
          <p class="directory-description">
            View and search registered league umpires.
          </p>
        </div>
      </div>

      <label for="umpire-search">Search umpires</label>
      <input
        id="umpire-search"
        type="search"
        placeholder="Search name, number, phone, or status"
        autocomplete="off"
      />

      <p id="umpire-directory-message" class="message"
        role="status" aria-live="polite"></p>

      <div id="umpire-results">
        Loading umpire records…
      </div>

      <button id="refresh-umpires" class="secondary-button" type="button">
        Refresh directory
      </button>
    </section>
  `;

  container.querySelector<HTMLInputElement>("#umpire-search")
    ?.addEventListener("input", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement) {
        renderRows(target.value);
      }
    });

  container.querySelector<HTMLButtonElement>("#refresh-umpires")
    ?.addEventListener("click", () => {
      void loadUmpires();
    });

  void loadUmpires();
}