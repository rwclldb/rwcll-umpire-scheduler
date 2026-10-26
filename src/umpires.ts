import { supabase } from "./supabase";
import { queueEmail } from "./email";
import { renderAvailabilityEditor } from "./games/availability-editor";

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
  // may this umpire assign themselves to games? (on unless an administrator turns it off)
  can_self_assign?: boolean;
};

// What the directory works with: the database row plus the email to show.
// The email comes from the linked account when there is one; otherwise it
// comes from the administrator-only private details.
// An open (not accepted, not revoked) invitation. It may have expired.
type PendingInvitation = {
  id: string;
  email: string;
  expires_at: string;
};

type Umpire = UmpireRow & {
  email: string | null;
  email_from_account: boolean;
  account_status: string | null;
  account_name: string | null;
  invitation: PendingInvitation | null;
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

// Whole years since a birth date given as YYYY-MM-DD, or null if it is not
// a usable date. A date in the future gives a negative number.
function ageFromBirthDate(value: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  let age = today.getFullYear() - year;
  const month0 = today.getMonth() + 1;
  if (month0 < month || (month0 === month && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

function describeAge(birthDate: string, classification: string): string {
  if (!birthDate) {
    return (
      "Birth dates are kept for administrators only. They are used to tell " +
      "youth from adult and to find umpires under 13."
    );
  }

  const age = ageFromBirthDate(birthDate);
  if (age === null) return "Enter a valid birth date.";
  if (age < 0) return "That birth date is in the future.";

  let text = `Age ${age}.`;
  if (age < 13) {
    text +=
      " Under 13: a parent account and consent will be required before " +
      "this umpire can be active.";
  }
  if (age >= 18 && classification === "youth") {
    text +=
      " This umpire is 18 or older but is classified Youth. Change the " +
      "classification to Adult when appropriate.";
  }
  if (age < 18 && classification === "adult") {
    text += " This umpire is under 18 but is classified Adult.";
  }
  return text;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sameName(a: string, b: string): boolean {
  const clean = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  return clean(a) === clean(b);
}

// A linked umpire whose own account name differs from the roster name.
function accountNameDiffers(umpire: Umpire): boolean {
  return (
    umpire.profile_id !== null &&
    umpire.account_name !== null &&
    umpire.account_name.trim() !== "" &&
    !sameName(umpire.account_name, umpire.display_name)
  );
}

function isExpired(invitation: PendingInvitation): boolean {
  return new Date(invitation.expires_at).getTime() < Date.now();
}

// What the "Account" column says about this umpire.
function accountLabel(umpire: Umpire): string {
  if (umpire.profile_id) {
    switch (umpire.account_status) {
      case "pending": return "Pending review";
      case "rejected": return "Rejected";
      case "suspended": return "Suspended";
      default: return "Linked";
    }
  }

  if (umpire.invitation) {
    return isExpired(umpire.invitation)
      ? "Invitation expired"
      : `Invited (expires ${umpire.invitation.expires_at.slice(0, 10)})`;
  }

  return "Not linked";
}

// Adds the invitation note to the Outbox (email sending is not set up yet,
// so an administrator sends it by hand from there). A failure here must never
// undo the invitation itself, so the result is returned for the caller to
// mention.
async function queueInvitationEmail(
  umpireId: string,
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await supabase
    .from("umpire_invitations")
    .select("expires_at")
    .eq("umpire_id", umpireId)
    .eq("status", "pending")
    .maybeSingle();

  const expiresAt =
    (data as { expires_at: string } | null)?.expires_at ??
    new Date(Date.now() + 30 * 86400000).toISOString();

  return queueEmail({
    kind: "invitation",
    toEmail: email,
    subject: "You are invited to the RWCLL umpire list",
    body: invitationMessage(email, expiresAt),
  });
}

// The note an administrator copies and sends to the person. No email is
// sent by the system yet.
function invitationMessage(email: string, expiresAt: string): string {
  return [
    "You have been added to the RWCLL umpire list.",
    "",
    `To get started, go to ${window.location.origin} and choose "Create account". ` +
      `Register using exactly this email address: ${email}`,
    "",
    "Choose the umpire type that matches you, confirm your email when asked, " +
      "and sign in. You will be approved automatically.",
    "",
    `This invitation expires on ${expiresAt.slice(0, 10)}.`,
  ].join("\n");
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
      umpire.eligibility_status,
      accountLabel(umpire),
      umpire.account_name ?? ""
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
              <td>
                ${escapeHtml(accountLabel(umpire))}
                ${accountNameDiffers(umpire)
                  ? `<br><span class="season-dates">Account name: ${escapeHtml(umpire.account_name ?? "")}</span>`
                  : ""}
              </td>
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
      eligibility_status,
      can_self_assign
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
  const [privateResult, accountsResult, invitationsResult] = await Promise.all([
    supabase.from("umpire_private_details").select("umpire_id, email"),
    supabase.from("profiles").select("id, email, account_status, display_name"),
    supabase.from("umpire_invitations")
      .select("id, umpire_id, email, expires_at")
      .eq("status", "pending"),
  ]);

  if (privateResult.error) {
    console.error("Umpire emails not loaded:", privateResult.error.message);
  }
  if (accountsResult.error) {
    console.error("Account emails not loaded:", accountsResult.error.message);
  }
  if (invitationsResult.error) {
    console.error("Invitations not loaded:", invitationsResult.error.message);
  }

  const recordEmails = new Map<string, string>();
  for (const row of (privateResult.data ?? []) as {
    umpire_id: string;
    email: string | null;
  }[]) {
    if (row.email) recordEmails.set(row.umpire_id, row.email);
  }

  const accountEmails = new Map<string, string>();
  const accountStatuses = new Map<string, string>();
  const accountNames = new Map<string, string>();
  for (const row of (accountsResult.data ?? []) as {
    id: string;
    email: string | null;
    account_status: string;
    display_name: string | null;
  }[]) {
    if (row.email) accountEmails.set(row.id, row.email);
    accountStatuses.set(row.id, row.account_status);
    if (row.display_name) accountNames.set(row.id, row.display_name);
  }

  const invitations = new Map<string, PendingInvitation>();
  for (const row of (invitationsResult.data ?? []) as {
    id: string;
    umpire_id: string;
    email: string;
    expires_at: string;
  }[]) {
    invitations.set(row.umpire_id, {
      id: row.id,
      email: row.email,
      expires_at: row.expires_at,
    });
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
      account_status: umpire.profile_id
        ? accountStatuses.get(umpire.profile_id) ?? null
        : null,
      account_name: umpire.profile_id
        ? accountNames.get(umpire.profile_id) ?? null
        : null,
      invitation: invitations.get(umpire.id) ?? null,
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
  const invite = form.querySelector<HTMLInputElement>('[name="invite"]')
    ?.checked ?? false;
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

    let invited = false;
    let queuedInOutbox = false;

    if (email && created && invite) {
      // Inviting also stores the email in the private details.
      const { error: inviteError } = await supabase.rpc("invite_umpire", {
        p_umpire_id: created.id,
        p_email: email,
      });

      if (inviteError) {
        if (message) {
          message.textContent =
            "The umpire was created, but the invitation could not be " +
            "recorded: " + inviteError.message;
          message.className = "message error";
        }
        form.reset();
        await loadUmpires();
        return;
      }
      invited = true;
      queuedInOutbox = (await queueInvitationEmail(created.id, email)).ok;
    } else if (email && created) {
      // The email is kept in the administrator-only private details.
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
      message.textContent = invited
        ? queuedInOutbox
          ? "Umpire created, invitation recorded, and the message was added " +
            "to the Outbox."
          : "Umpire created and invitation recorded. Open Edit on the new " +
            "record to copy the message to send them."
        : "Umpire created successfully.";
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


// Draws the Invitation panel inside the edit form. It refreshes only the
// panel, so anything else being typed in the form is left alone.
async function refreshInvitationPanel(
  umpireId: string,
  feedback?: { text: string; kind: "error" | "success" }
): Promise<void> {
  const panel = document.querySelector<HTMLElement>("#invitation-panel");
  if (!panel) return;

  const { data, error } = await supabase
    .from("umpire_invitations")
    .select("id, email, expires_at")
    .eq("umpire_id", umpireId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    panel.innerHTML = `<p class="message error">Could not load the invitation: ${escapeHtml(error.message)}</p>`;
    return;
  }

  const invitation = (data ?? null) as PendingInvitation | null;
  const expired = invitation ? isExpired(invitation) : false;

  panel.className = "invitation-panel";
  panel.innerHTML = invitation
    ? `
      <h4>Invitation</h4>
      <p class="season-dates">
        ${expired
          ? `The invitation to <strong>${escapeHtml(invitation.email)}</strong> expired on ${escapeHtml(invitation.expires_at.slice(0, 10))}.`
          : `Invited: <strong>${escapeHtml(invitation.email)}</strong>. The invitation expires on ${escapeHtml(invitation.expires_at.slice(0, 10))}.`}
      </p>
      <div class="account-actions">
        <button type="button" class="secondary-button"
          data-invite-action="renew">Renew (30 more days)</button>
        <button type="button" class="secondary-button"
          data-invite-action="revoke">Revoke</button>
      </div>
      ${expired
        ? ""
        : `
          <label for="invitation-message">Message to send them</label>
          <textarea id="invitation-message" readonly rows="8">${escapeHtml(invitationMessage(invitation.email, invitation.expires_at))}</textarea>
          <button type="button" class="secondary-button"
            data-invite-action="copy">Copy message</button>
          <p class="season-dates">
            Email sending is not set up yet, so copy this message and send
            it yourself.
          </p>`}
      <p id="invitation-feedback" class="message" role="status"
        aria-live="polite"></p>
    `
    : `
      <h4>Invitation</h4>
      <p class="season-dates">
        Not invited yet. Type their email in the Email box above, then press
        Invite. When they register with that email and confirm it, they are
        linked and approved automatically.
      </p>
      <button type="button" class="secondary-button"
        data-invite-action="invite">Invite to register</button>
      <p id="invitation-feedback" class="message" role="status"
        aria-live="polite"></p>
    `;

  const say = (text: string, kind: "error" | "success") => {
    const element = document.querySelector<HTMLElement>("#invitation-feedback");
    if (element) {
      element.textContent = text;
      element.className = `message ${kind}`;
    }
  };

  if (feedback) say(feedback.text, feedback.kind);

  // Assigned (not added) so a refresh never stacks up duplicate handlers.
  panel.onclick = (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>("[data-invite-action]");
    if (!button) return;

    const action = button.dataset.inviteAction ?? "";

    void (async () => {
      if (action === "copy") {
        const box =
          document.querySelector<HTMLTextAreaElement>("#invitation-message");
        if (!box) return;
        try {
          await navigator.clipboard.writeText(box.value);
          say("Message copied.", "success");
        } catch {
          box.select();
          say("Press Ctrl+C to copy the selected message.", "success");
        }
        return;
      }

      if (action === "invite") {
        const email = normalizeEmail(
          document.querySelector<HTMLInputElement>("#edit-email")?.value ?? ""
        );
        if (!email || !isValidEmail(email)) {
          say("Enter a valid email address in the Email box above first.", "error");
          return;
        }

        button.disabled = true;
        const { error: inviteError } = await supabase.rpc("invite_umpire", {
          p_umpire_id: umpireId,
          p_email: email,
        });

        if (inviteError) {
          say(inviteError.message, "error");
          button.disabled = false;
          return;
        }

        const queued = await queueInvitationEmail(umpireId, email);
        await loadUmpires();
        await refreshInvitationPanel(umpireId, {
          text: queued.ok
            ? "Invitation created and added to the Outbox. You can also copy the message below and send it yourself."
            : `Invitation created, but it could not be added to the Outbox (${queued.error}). Copy the message below and send it yourself.`,
          kind: "success",
        });
        return;
      }

      if (!invitation) return;

      if (action === "renew") {
        button.disabled = true;
        const { data: expires, error: renewError } = await supabase.rpc(
          "renew_umpire_invitation",
          { p_invitation_id: invitation.id }
        );

        if (renewError) {
          say(renewError.message, "error");
          button.disabled = false;
          return;
        }

        await loadUmpires();
        await refreshInvitationPanel(umpireId, {
          text: `Invitation renewed until ${String(expires).slice(0, 10)}.`,
          kind: "success",
        });
        return;
      }

      if (action === "revoke") {
        if (
          !window.confirm(
            `Revoke the invitation to ${invitation.email}? They will no longer be approved automatically.`
          )
        ) {
          return;
        }

        button.disabled = true;
        const { error: revokeError } = await supabase.rpc(
          "revoke_umpire_invitation",
          { p_invitation_id: invitation.id }
        );

        if (revokeError) {
          say(revokeError.message, "error");
          button.disabled = false;
          return;
        }

        await loadUmpires();
        await refreshInvitationPanel(umpireId, {
          text: "Invitation revoked.",
          kind: "success",
        });
      }
    })();
  };
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
      "emergency_contact_name, emergency_contact_phone, admin_notes, email, birth_date, external_id_primary, external_id_secondary"
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

      <label class="season-checkbox-label">
        <input id="edit-can-self-assign" name="can_self_assign" type="checkbox"
          ${umpire.can_self_assign !== false ? "checked" : ""}>
        Allowed to assign themselves to games (in divisions that allow it)
      </label>

      <hr class="directory-divider">
      <h3>Private Details — Administrators Only</h3>

      ${umpire.email_from_account
        ? `<p class="season-dates">Email: ${escapeHtml(umpire.email ?? "")}
            (from the linked account; it changes when the account's email changes)</p>`
        : `<label for="edit-email">Email</label>
      <input id="edit-email" name="email" type="email"
        maxlength="254" autocomplete="off"
        value="${escapeHtml(privateDetails?.email ?? "")}">`}

      ${accountNameDiffers(umpire)
        ? `<p class="season-dates">
            The person's own account uses the name
            <strong>${escapeHtml(umpire.account_name ?? "")}</strong>.
            The roster name above is what you typed. They are the same
            person; this is only a difference in spelling or style.
          </p>
          <button type="button" class="secondary-button"
            id="use-account-name">Use the account's name</button>`
        : ""}

      ${umpire.profile_id ? "" : `<div id="invitation-panel"></div>`}

      <label for="edit-birth-date">Birth date</label>
      <input id="edit-birth-date" name="birth_date" type="date"
        value="${escapeHtml(privateDetails?.birth_date ?? "")}">
      <p id="edit-age-hint" class="season-dates"></p>

      <label for="edit-emergency-contact-name">Emergency Contact Name (for a youth umpire: a parent or guardian)</label>
      <input id="edit-emergency-contact-name"
        name="emergency_contact_name"
        value="${escapeHtml(privateDetails?.emergency_contact_name ?? "")}">

      <label for="edit-emergency-contact-phone">Emergency Contact Phone (printed as the parent's number for a youth umpire)</label>
      <input id="edit-emergency-contact-phone"
        name="emergency_contact_phone"
        value="${escapeHtml(privateDetails?.emergency_contact_phone ?? "")}">

      <label for="edit-external-id-primary">Outside ID 1 (main league database)</label>
      <input id="edit-external-id-primary" name="external_id_primary"
        maxlength="100" autocomplete="off"
        value="${escapeHtml(privateDetails?.external_id_primary ?? "")}">

      <label for="edit-external-id-secondary">Outside ID 2 (backup system)</label>
      <input id="edit-external-id-secondary" name="external_id_secondary"
        maxlength="100" autocomplete="off"
        value="${escapeHtml(privateDetails?.external_id_secondary ?? "")}">

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

    <div id="edit-availability" class="availability-admin"></div>
  `);

  // When this umpire can umpire (an administrator can enter it for them).
  const availabilityHolder = document.querySelector<HTMLElement>("#edit-availability");
  if (availabilityHolder) {
    void renderAvailabilityEditor(availabilityHolder, {
      umpireId,
      own: false,
      name: umpire.display_name,
    });
  }

  const updateAgeHint = () => {
    const hint = document.querySelector<HTMLElement>("#edit-age-hint");
    const dateInput =
      document.querySelector<HTMLInputElement>("#edit-birth-date");
    const classSelect =
      document.querySelector<HTMLSelectElement>("#edit-classification");

    if (hint && dateInput && classSelect) {
      hint.textContent = describeAge(dateInput.value, classSelect.value);
    }
  };
  document.querySelector("#edit-birth-date")
    ?.addEventListener("input", updateAgeHint);
  document.querySelector("#edit-classification")
    ?.addEventListener("change", updateAgeHint);
  updateAgeHint();

  // Copies the account's name into the Display Name box (not saved until
  // Save Changes is pressed).
  document.querySelector("#use-account-name")?.addEventListener("click", () => {
    const nameInput =
      document.querySelector<HTMLInputElement>("#edit-display-name");
    if (nameInput && umpire.account_name) {
      nameInput.value = umpire.account_name;
    }
  });

  if (!umpire.profile_id) {
    void refreshInvitationPanel(umpireId);
  }

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
  const birthDate = String(formData.get("birth_date") ?? "").trim();
  const externalIdPrimary = String(
    formData.get("external_id_primary") ?? ""
  ).trim();
  const externalIdSecondary = String(
    formData.get("external_id_secondary") ?? ""
  ).trim();
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

  if (birthDate) {
    const age = ageFromBirthDate(birthDate);
    if (age === null || age < 0 || age > 120) {
      const editMessage = document.querySelector<HTMLParagraphElement>(
        "#edit-umpire-message"
      );
      if (editMessage) {
        editMessage.textContent =
          "Enter a valid birth date that is not in the future.";
        editMessage.className = "message error";
      }
      return;
    }
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
      can_self_assign: formData.get("can_self_assign") === "on",
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
        birth_date: birthDate || null,
        external_id_primary: externalIdPrimary || null,
        external_id_secondary: externalIdSecondary || null,
        ...(hasEmailField ? { email: email || null } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "umpire_id" }
    );

  if (privateError) {
    const reason = privateError.message.includes("external_id_primary_unique")
      ? "Outside ID 1 is already used by another umpire record."
      : privateError.message.includes("external_id_secondary_unique")
        ? "Outside ID 2 is already used by another umpire record."
        : privateError.message;

    showEditor(
      `<p class="error-message">The main umpire details were saved, but the private details could not be saved: ${escapeHtml(reason)}</p>`
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

        <label class="season-checkbox-label">
          <input type="checkbox" name="invite" checked />
          Invite them to register with this email (they are approved
          automatically when they confirm it)
        </label>

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
