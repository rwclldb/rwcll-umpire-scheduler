import { supabase } from "./supabase";

type UmpireClassification = "youth" | "adult";
type EligibilityStatus = "active" | "inactive" | "suspended";

type UmpireRow = {
  id: string;
  profile_id: string | null;
  umpire_number: string | null;
  display_name: string;
  classification: UmpireClassification;
  phone: string | null;
  eligibility_status: EligibilityStatus;
};

// What the directory works with: the database row plus the email to show.
// The email comes from the linked account when there is one; otherwise it
// comes from the administrator-only private details.
type Umpire = UmpireRow & {
  email: string | null;
  email_from_account: boolean;
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
      umpire.email ?? "",
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
            <th>Email</th>
            <th>Phone</th>
            <th>Eligibility</th>
            <th>Account</th>
            <th>Actions</th>
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
              <td class="email-cell">${escapeHtml(umpire.email || "—")}</td>
              <td>${escapeHtml(umpire.phone || "—")}</td>
              <td>
                <span class="eligibility-badge eligibility-${umpire.eligibility_status}">
                  ${statusLabel(umpire.eligibility_status)}
                </span>
              </td>
              <td>${umpire.profile_id ? "Linked" : "Not linked"}</td>
                <td>
                <button type="button" class="secondary-button"
                    data-edit-umpire="${umpire.id}">
                    Edit
                </button>
                <button type="button" class="secondary-button"
                    data-link-umpire="${umpire.id}">
                    ${umpire.profile_id ? "Change link" : "Link account"}
                </button>
                </td>
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

  // Emails: a linked account's email wins; otherwise the email kept in the
  // administrator-only private details. If either lookup is not allowed
  // for this user, the emails are simply left blank.
  const [privateResult, accountsResult] = await Promise.all([
    supabase.from("umpire_private_details").select("umpire_id, email"),
    supabase.from("profiles").select("id, email"),
  ]);

  if (privateResult.error) {
    console.error("Umpire emails not loaded:", privateResult.error.message);
  }
  if (accountsResult.error) {
    console.error("Account emails not loaded:", accountsResult.error.message);
  }

  const recordEmails = new Map<string, string>();
  for (const row of (privateResult.data ?? []) as {
    umpire_id: string;
    email: string | null;
  }[]) {
    if (row.email) recordEmails.set(row.umpire_id, row.email);
  }

  const accountEmails = new Map<string, string>();
  for (const row of (accountsResult.data ?? []) as {
    id: string;
    email: string | null;
  }[]) {
    if (row.email) accountEmails.set(row.id, row.email);
  }

  allUmpires = ((data ?? []) as UmpireRow[]).map((umpire) => {
    const accountEmail = umpire.profile_id
      ? accountEmails.get(umpire.profile_id) ?? null
      : null;
    const recordEmail = recordEmails.get(umpire.id) ?? null;

    return {
      ...umpire,
      email: accountEmail ?? recordEmail,
      email_from_account: accountEmail !== null,
    };
  });
  renderRows(
    document.querySelector<HTMLInputElement>("#umpire-search")?.value ?? ""
  );

  if (message) {
    message.textContent = `${allUmpires.length} umpire record(s) loaded.`;
    message.className = "message success";
  }
}


async function createUmpire(form: HTMLFormElement) {
  const message = document.querySelector<HTMLParagraphElement>(
    "#create-umpire-message"
  );
  const saveButton = document.querySelector<HTMLButtonElement>(
    "#save-umpire-button"
  );

  const data = new FormData(form);

  const displayName = String(data.get("display_name") ?? "").trim();
  const umpireNumber = String(data.get("umpire_number") ?? "").trim();
  const classification = String(data.get("classification") ?? "");
  const phone = String(data.get("phone") ?? "").trim();
  const email = normalizeEmail(String(data.get("email") ?? ""));
  const eligibility = String(data.get("eligibility_status") ?? "");

  if (!displayName) {
    if (message) {
      message.textContent = "Please enter the umpire's full name.";
      message.className = "message error";
    }
    return;
  }

  if (!["youth", "adult"].includes(classification)) {
    if (message) {
      message.textContent = "Please select a valid classification.";
      message.className = "message error";
    }
    return;
  }

  if (!["active", "inactive", "suspended"].includes(eligibility)) {
    if (message) {
      message.textContent = "Please select a valid eligibility status.";
      message.className = "message error";
    }
    return;
  }

  if (email && !isValidEmail(email)) {
    if (message) {
      message.textContent = "Please enter a valid email address.";
      message.className = "message error";
    }
    return;
  }

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Creating…";
  }

  if (message) {
    message.textContent = "";
    message.className = "message";
  }

  try {
    const { data: created, error } = await supabase
      .from("umpires")
      .insert({
        display_name: displayName,
        umpire_number: umpireNumber || null,
        classification,
        phone: phone || null,
        eligibility_status: eligibility,
        profile_id: null
      })
      .select("id")
      .single();

    if (error) throw error;

    // The email is kept in the administrator-only private details.
    if (email && created) {
      const { error: emailError } = await supabase
        .from("umpire_private_details")
        .upsert(
          {
            umpire_id: created.id,
            email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "umpire_id" }
        );

      if (emailError) {
        if (message) {
          message.textContent =
            "The umpire was created, but the email could not be saved: " +
            emailError.message;
          message.className = "message error";
        }
        form.reset();
        await loadUmpires();
        return;
      }
    }

    if (message) {
      message.textContent = "Umpire created successfully.";
      message.className = "message success";
    }

    form.reset();
    await loadUmpires();
  } catch (error) {
    if (message) {
      const errorMessage = error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

      message.textContent = errorMessage.includes("umpires_umpire_number_key")
        ? "That umpire number is already in use. Please choose another."
        : `Unable to create umpire: ${errorMessage}`;

      message.className = "message error";
    }
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Create umpire";
    }
  }
}


function showEditor(html: string) {
  const editor = document.querySelector<HTMLDivElement>("#umpire-editor");
  if (!editor) return;

  editor.innerHTML = html;
  editor.scrollIntoView({ behavior: "smooth", block: "start" });

  editor.querySelector<HTMLButtonElement>("[data-cancel-editor]")
    ?.addEventListener("click", () => {
      editor.replaceChildren();
    });
}


async function showEditForm(umpireId: string) {
  const umpire = allUmpires.find((item) => item.id === umpireId);

  if (!umpire) {
    showEditor("<p>Umpire record not found.</p>");
    return;
  }

  const { data: privateDetails, error } = await supabase
    .from("umpire_private_details")
    .select(
      "emergency_contact_name, emergency_contact_phone, admin_notes, email"
    )
    .eq("umpire_id", umpireId)
    .maybeSingle();

  if (error) {
    showEditor(
      `<p class="error-message">Could not load private details: ${escapeHtml(error.message)}</p>`
    );
    return;
  }

  showEditor(`
    <form id="edit-umpire-form" class="create-umpire-form">
      <h3>Edit Umpire</h3>

      <label for="edit-display-name">Display Name</label>
      <input id="edit-display-name" name="display_name" required
        value="${escapeHtml(umpire.display_name)}">

      <label for="edit-umpire-number">Umpire Number</label>
      <input id="edit-umpire-number" name="umpire_number"
        value="${escapeHtml(umpire.umpire_number ?? "")}">

      <label for="edit-classification">Classification</label>
      <select id="edit-classification" name="classification" required>
        <option value="youth" ${umpire.classification === "youth" ? "selected" : ""}>Youth</option>
        <option value="adult" ${umpire.classification === "adult" ? "selected" : ""}>Adult</option>
      </select>

      <label for="edit-phone">Phone</label>
      <input id="edit-phone" name="phone"
        value="${escapeHtml(umpire.phone ?? "")}">

      <label for="edit-eligibility">Eligibility</label>
      <select id="edit-eligibility" name="eligibility_status" required>
        <option value="active" ${umpire.eligibility_status === "active" ? "selected" : ""}>Active</option>
        <option value="inactive" ${umpire.eligibility_status === "inactive" ? "selected" : ""}>Inactive</option>
        <option value="suspended" ${umpire.eligibility_status === "suspended" ? "selected" : ""}>Suspended</option>
      </select>

      <hr class="directory-divider">
      <h3>Private Details — Administrators Only</h3>

      ${umpire.email_from_account
        ? `<p class="season-dates">Email: ${escapeHtml(umpire.email ?? "")}
            (from the linked account; it changes when the account's email changes)</p>`
        : `<label for="edit-email">Email</label>
      <input id="edit-email" name="email" type="email"
        maxlength="254" autocomplete="off"
        value="${escapeHtml(privateDetails?.email ?? "")}">`}

      <label for="edit-emergency-contact-name">Emergency Contact Name</label>
      <input id="edit-emergency-contact-name"
        name="emergency_contact_name"
        value="${escapeHtml(privateDetails?.emergency_contact_name ?? "")}">

      <label for="edit-emergency-contact-phone">Emergency Contact Phone</label>
      <input id="edit-emergency-contact-phone"
        name="emergency_contact_phone"
        value="${escapeHtml(privateDetails?.emergency_contact_phone ?? "")}">

      <label for="edit-admin-notes">Administrative Notes</label>
      <textarea id="edit-admin-notes" name="admin_notes"
        rows="4">${escapeHtml(privateDetails?.admin_notes ?? "")}</textarea>

      <p id="edit-umpire-message" class="message"
        role="status" aria-live="polite"></p>

      <div class="account-actions">
        <button type="submit">Save Changes</button>
        <button type="button" class="secondary-button" data-cancel-editor>Cancel</button>
      </div>
    </form>
  `);

  const form = document.querySelector<HTMLFormElement>("#edit-umpire-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveUmpireEdits(umpireId, new FormData(form));
  });
}



async function saveUmpireEdits(
  umpireId: string,
  formData: FormData
) {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const umpireNumber = String(formData.get("umpire_number") ?? "").trim();
  const classification = String(formData.get("classification") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const eligibility = String(formData.get("eligibility_status") ?? "");

  const emergencyContactName = String(
    formData.get("emergency_contact_name") ?? ""
  ).trim();
  const emergencyContactPhone = String(
    formData.get("emergency_contact_phone") ?? ""
  ).trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();
  // A linked umpire has no email box (the account's email is used), so
  // the stored email is left untouched in that case.
  const hasEmailField = formData.has("email");
  const email = normalizeEmail(String(formData.get("email") ?? ""));

  if (!displayName) {
    showEditor("<p>Please enter a display name.</p>");
    return;
  }

  if (!["youth", "adult"].includes(classification)) {
    showEditor("<p>Please choose a valid classification.</p>");
    return;
  }

  if (!["active", "inactive", "suspended"].includes(eligibility)) {
    showEditor("<p>Please choose a valid eligibility status.</p>");
    return;
  }

  if (hasEmailField && email && !isValidEmail(email)) {
    const editMessage = document.querySelector<HTMLParagraphElement>(
      "#edit-umpire-message"
    );
    if (editMessage) {
      editMessage.textContent = "Please enter a valid email address.";
      editMessage.className = "message error";
    }
    return;
  }

  const saveButton = document.querySelector<HTMLButtonElement>(
    '#edit-umpire-form button[type="submit"]'
  );
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
  }

  const { error: umpireError } = await supabase
    .from("umpires")
    .update({
      display_name: displayName,
      umpire_number: umpireNumber || null,
      classification,
      phone: phone || null,
      eligibility_status: eligibility,
    })
    .eq("id", umpireId);

  if (umpireError) {
    showEditor(
      `<p class="error-message">Could not save umpire: ${escapeHtml(umpireError.message)}</p>`
    );
    return;
  }

  const { error: privateError } = await supabase
    .from("umpire_private_details")
    .upsert(
      {
        umpire_id: umpireId,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        admin_notes: adminNotes || null,
        ...(hasEmailField ? { email: email || null } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "umpire_id" }
    );

  if (privateError) {
    showEditor(
      `<p class="error-message">The main umpire details were saved, but the private details could not be saved: ${escapeHtml(privateError.message)}</p>`
    );
    return;
  }

  showEditor("<p>Umpire details saved successfully.</p>");
  await loadUmpires();
}


async function showLinkForm(umpireId: string) {
  const umpire = allUmpires.find((item) => item.id === umpireId);
  if (!umpire) return;

  const editor = document.querySelector<HTMLDivElement>("#umpire-editor");
  if (!editor) return;

  editor.textContent = "Loading available accounts…";

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, account_status")
    .eq("account_status", "approved")
    .order("display_name");

  if (error) {
    editor.textContent = `Unable to load accounts: ${error.message}`;
    return;
  }

  const linkedProfileIds = new Set(
    allUmpires
      .filter((item) => item.id !== umpireId && item.profile_id)
      .map((item) => item.profile_id!)
  );

  const availableProfiles = (profiles ?? []).filter((profile) =>
    profile.id === umpire.profile_id || !linkedProfileIds.has(profile.id)
  );

  showEditor(`
    <form id="link-umpire-form" class="create-umpire-form">
      <h3>Link account: ${escapeHtml(umpire.display_name)}</h3>
      <p>Select an approved user account to associate with this umpire.
        Linking does not change the user's roles or approval status.</p>

      <label for="umpire-profile">Approved account</label>
      <select id="umpire-profile" name="profile_id">
        <option value="">No account linked</option>
        ${availableProfiles.map((profile) => `
          <option value="${escapeHtml(profile.id)}"
            ${profile.id === umpire.profile_id ? "selected" : ""}>
            ${escapeHtml(profile.display_name || "Unnamed user")}
            — ${escapeHtml(profile.email || "No email")}
          </option>
        `).join("")}
      </select>

      <p id="link-umpire-message" class="message" role="status"></p>

      <div class="account-actions">
        <button class="primary-button" type="submit">Save link</button>
        <button class="secondary-button" type="button" data-cancel-editor>Cancel</button>
      </div>
    </form>
  `);

  const form = document.querySelector<HTMLFormElement>("#link-umpire-form");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveUmpireLink(umpireId, form);
  });
}

async function saveUmpireLink(
  umpireId: string,
  form: HTMLFormElement
) {
  const message = document.querySelector<HTMLParagraphElement>(
    "#link-umpire-message"
  );
  const button = form.querySelector<HTMLButtonElement>(
    'button[type="submit"]'
  );
  const profileId = String(new FormData(form).get("profile_id") ?? "");

  if (button) {
    button.disabled = true;
    button.textContent = "Saving…";
  }

  const { error } = await supabase
    .from("umpires")
    .update({ profile_id: profileId || null })
    .eq("id", umpireId);

  if (error) {
    if (message) {
      message.textContent = `Unable to save account link: ${error.message}`;
      message.className = "message error";
    }
    if (button) {
      button.disabled = false;
      button.textContent = "Save link";
    }
    return;
  }

  showEditor(`
    <p class="message success">Account link updated successfully.</p>
  `);
  await loadUmpires();
}


export function renderUmpireDirectory(container: HTMLElement) {
  container.innerHTML = `
    <section class="directory-section">
      <div class="directory-header">
        <div>
          <p class="eyebrow">RWCLL · ADMINISTRATION</p>
          <h2>Umpire Directory</h2>
          <p class="directory-description">
            View, search, and manage registered league umpires.
          </p>
        </div>
      </div>

      <button id="toggle-create-umpire" class="primary-button" type="button"
        aria-expanded="false">
        + Create Umpire
      </button>

      <form id="create-umpire-form" class="create-umpire-form" hidden>
        <h3>New umpire</h3>

        <label for="new-umpire-name">Full name *</label>
        <input id="new-umpire-name" name="display_name"
          type="text" maxlength="100" required
          placeholder="Umpire's full name" />

        <label for="new-umpire-number">Umpire number</label>
        <input id="new-umpire-number" name="umpire_number"
          type="text" maxlength="50"
          placeholder="Optional league number" />

        <label for="new-umpire-classification">Classification *</label>
        <select id="new-umpire-classification" name="classification" required>
          <option value="youth">Youth</option>
          <option value="adult">Adult</option>
        </select>

        <label for="new-umpire-email">Email</label>
        <input id="new-umpire-email" name="email"
          type="email" maxlength="254" autocomplete="off"
          placeholder="Optional email address (administrators only)" />

        <label for="new-umpire-phone">Phone</label>
        <input id="new-umpire-phone" name="phone"
          type="tel" maxlength="30"
          placeholder="Optional phone number" />

        <label for="new-umpire-eligibility">Eligibility *</label>
        <select id="new-umpire-eligibility" name="eligibility_status" required>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>

        <p id="create-umpire-message" class="message"
          role="status" aria-live="polite"></p>

        <div class="account-actions">
          <button id="save-umpire-button" class="primary-button"
            type="submit">Create umpire</button>
          <button id="cancel-create-umpire" class="secondary-button"
            type="button">Cancel</button>
        </div>
      </form>

      <label for="umpire-search">Search umpires</label>
      <input id="umpire-search" type="search"
        placeholder="Search name, number, email, phone, or status"
        autocomplete="off" />

      <p id="umpire-directory-message" class="message"
        role="status" aria-live="polite"></p>

        <div id="umpire-editor"></div>

      <div id="umpire-results">Loading umpire records…</div>

      <button id="refresh-umpires" class="secondary-button" type="button">
        Refresh directory
      </button>
    </section>
  `;

  const form = container.querySelector<HTMLFormElement>(
    "#create-umpire-form"
  );
  const toggle = container.querySelector<HTMLButtonElement>(
    "#toggle-create-umpire"
  );

  toggle?.addEventListener("click", () => {
    if (!form || !toggle) return;

    form.hidden = !form.hidden;
    toggle.setAttribute("aria-expanded", String(!form.hidden));
    toggle.textContent = form.hidden ? "+ Create Umpire" : "− Close Form";

    if (!form.hidden) {
      container.querySelector<HTMLInputElement>("#new-umpire-name")?.focus();
    }
  });

  container.querySelector<HTMLButtonElement>("#cancel-create-umpire")
    ?.addEventListener("click", () => {
      form?.reset();
      if (form) form.hidden = true;
      toggle?.setAttribute("aria-expanded", "false");
      if (toggle) toggle.textContent = "+ Create Umpire";
    });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    void createUmpire(form);
  });

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

  container.querySelector<HTMLDivElement>("#umpire-results")
  ?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const editId = target.dataset.editUmpire;
    const linkId = target.dataset.linkUmpire;

    if (editId) void showEditForm(editId);
    if (linkId) void showLinkForm(linkId);
  });

  void loadUmpires();
}
