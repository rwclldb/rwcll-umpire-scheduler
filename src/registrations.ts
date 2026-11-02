import { supabase } from "./supabase";
import { ageFromBirthDate, escapeHtml } from "./ui";

type PendingProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
  registration_kind: string;
  registration_note?: string | null;
  created_at: string;
};

type UmpireLink = {
  profile_id: string | null;
};

const KIND_LABEL: Record<string, string> = {
  youth_umpire: "Youth umpire",
  adult_umpire: "Adult umpire",
  parent_guardian: "Parent or guardian",
};

// The age rules are settings (the database enforces them; these only explain early).
let minAge = 13;
let consentBelow = 13;

// What the admin sees under the birth date. The database enforces the same
// rules when Approve is pressed; this only explains them early.
function hint(birthDate: string, classification: string): string {
  if (!birthDate) {
    return classification === "youth"
      ? "A birth date is required for a youth umpire. Check it against the league's records."
      : "A birth date is optional for an adult umpire.";
  }

  const age = ageFromBirthDate(birthDate);
  if (age === null) return "Enter a valid birth date.";
  if (age < 0) return "That birth date is in the future.";

  if (age < minAge) {
    return `Age ${age}. The league's minimum age for umpires is ${minAge}, so they cannot be approved.`;
  }
  if (age < consentBelow) {
    return `Age ${age}. Under ${consentBelow}, they cannot be assigned to games until a linked parent or guardian gives consent (see Families).`;
  }
  if (classification === "youth" && age >= 18) {
    return `Age ${age}. This person is 18 or older, so approve them as an adult umpire.`;
  }
  if (classification === "adult" && age < 18) {
    return `Age ${age}. This person is under 18, so approve them as a youth umpire.`;
  }
  return `Age ${age}.`;
}

// Umpires who signed up themselves, confirmed their email, and are waiting
// for a super admin or umpire chief to review them.
export async function renderUmpireRegistrations(
  container: HTMLElement,
): Promise<void> {
  container.innerHTML = `
    <section class="directory-section">
      <h2>Umpire registrations</h2>
      <p class="directory-description">Loading registrations&hellip;</p>
    </section>
  `;

  const [ageRule, consentRule] = await Promise.all([supabase.rpc("umpire_min_age"), supabase.rpc("parent_consent_below_age")]);
  if (typeof ageRule.data === "number") minAge = ageRule.data;
  if (typeof consentRule.data === "number") consentBelow = consentRule.data;

  const profilesResult = await supabase
    .from("profiles")
    .select("id, display_name, email, registration_kind, registration_note, created_at")
    .eq("account_status", "pending")
    .in("registration_kind", ["youth_umpire", "adult_umpire", "parent_guardian"])
    .order("created_at");

  if (profilesResult.error) {
    container.innerHTML = `
      <section class="directory-section">
        <h2>Umpire registrations</h2>
        <p class="message error">
          Unable to load registrations. Refresh and try again.
        </p>
      </section>
    `;
    console.error("Registrations load failed:", profilesResult.error.message);
    return;
  }

  const pending = (profilesResult.data ?? []) as PendingProfile[];

  // Only people who have confirmed their email and signed in have an umpire
  // record. That also keeps sign-ups with made-up emails out of this list.
  let linked: UmpireLink[] = [];
  if (pending.length > 0) {
    const umpiresResult = await supabase
      .from("umpires")
      .select("profile_id")
      .in("profile_id", pending.map((profile) => profile.id));

    if (umpiresResult.error) {
      console.error("Registrations lookup failed:", umpiresResult.error.message);
    } else {
      linked = (umpiresResult.data ?? []) as UmpireLink[];
    }
  }

  const waiting = pending.filter((profile) =>
    profile.registration_kind !== "parent_guardian" && linked.some((row) => row.profile_id === profile.id)
  );
  const parentsWaiting = pending.filter((profile) => profile.registration_kind === "parent_guardian");

  container.innerHTML = `
    <section class="directory-section" id="registrations">
      <div class="directory-header">
        <div>
          <h2>Umpire registrations</h2>
          <p class="directory-description">
            People who signed up as umpires and confirmed their email.
            Approving does everything in one step: approves the account,
            gives the youth or adult umpire role, and activates the record.
          </p>
        </div>
        <button id="refresh-registrations" class="secondary-button"
          type="button">Refresh</button>
      </div>

      <p id="registrations-message" class="message"
        role="status" aria-live="polite"></p>

      ${waiting.length
        ? `<ul class="role-list">${waiting.map((profile) => {
            const kind = profile.registration_kind;
            const classification = kind === "youth_umpire" ? "youth" : "adult";
            const name = profile.display_name || "Name not provided";
            return `
              <li class="role-account" data-profile-id="${escapeHtml(profile.id)}">
                <span class="role-account-name">${escapeHtml(name)}</span>
                <span class="role-account-email">
                  ${escapeHtml(profile.email ?? "Email unavailable")}
                </span>
                <span class="role-account-contact">
                  Signed up as: ${escapeHtml(KIND_LABEL[kind] ?? kind)}
                  &middot; ${escapeHtml(profile.created_at.slice(0, 10))}
                </span>

                <label for="reg-class-${escapeHtml(profile.id)}">Approve as</label>
                <select id="reg-class-${escapeHtml(profile.id)}"
                  data-reg-class="${escapeHtml(profile.id)}">
                  <option value="adult" ${classification === "adult" ? "selected" : ""}>
                    Adult umpire
                  </option>
                  <option value="youth" ${classification === "youth" ? "selected" : ""}>
                    Youth umpire
                  </option>
                </select>

                <label for="reg-birth-${escapeHtml(profile.id)}">Birth date</label>
                <input id="reg-birth-${escapeHtml(profile.id)}" type="date"
                  data-reg-birth="${escapeHtml(profile.id)}" />
                <p class="season-dates" data-reg-hint="${escapeHtml(profile.id)}">
                  ${escapeHtml(hint("", classification))}
                </p>

                <div class="account-actions">
                  <button type="button" class="primary-button"
                    data-approve="${escapeHtml(profile.id)}">Approve</button>
                  <button type="button" class="secondary-button"
                    data-reject="${escapeHtml(profile.id)}">Reject</button>
                </div>
              </li>
            `;
          }).join("")}</ul>`
        : `<p class="directory-empty">
            No umpire registrations are waiting for review.
          </p>`}

      <h3>Parent and guardian registrations</h3>
      <p class="directory-description">
        Approving gives them the parent role. You then link them to their child in
        <strong>Families</strong>: nobody can link themselves to a child.
      </p>
      ${parentsWaiting.length
        ? `<ul class="role-list">${parentsWaiting.map((profile) => `
            <li class="role-account" data-parent-id="${escapeHtml(profile.id)}">
              <span class="role-account-name">${escapeHtml(profile.display_name || "Name not provided")}</span>
              <span class="role-account-email">${escapeHtml(profile.email ?? "Email unavailable")}</span>
              <span class="role-account-contact">
                Signed up as: Parent or guardian &middot; ${escapeHtml(profile.created_at.slice(0, 10))}
              </span>
              <span class="role-account-contact">Says they are the parent of: ${escapeHtml(profile.registration_note || "(nothing written)")}</span>
              <div class="account-actions">
                <button type="button" class="primary-button" data-approve-parent="${escapeHtml(profile.id)}">Approve</button>
                <button type="button" class="secondary-button" data-reject-parent="${escapeHtml(profile.id)}">Reject</button>
              </div>
            </li>`).join("")}</ul>`
        : `<p class="directory-empty">No parent or guardian registrations are waiting for review.</p>`}
    </section>
  `;

  const root = container.querySelector<HTMLElement>("#registrations");
  if (!root) return;

  const show = (text: string, kind: "error" | "success") => {
    const element = root.querySelector<HTMLElement>("#registrations-message");
    if (element) {
      element.textContent = text;
      element.className = `message ${kind}`;
    }
  };

  const reloadWithMessage = async (text: string) => {
    await renderUmpireRegistrations(container);
    const element = container.querySelector<HTMLElement>(
      "#registrations-message",
    );
    if (element) {
      element.textContent = text;
      element.className = "message success";
    }
  };

  const fieldsFor = (id: string) => ({
    select: root.querySelector<HTMLSelectElement>(
      `[data-reg-class="${CSS.escape(id)}"]`,
    ),
    date: root.querySelector<HTMLInputElement>(
      `[data-reg-birth="${CSS.escape(id)}"]`,
    ),
    hint: root.querySelector<HTMLElement>(
      `[data-reg-hint="${CSS.escape(id)}"]`,
    ),
  });

  const refreshHint = (id: string) => {
    const { select, date, hint: hintElement } = fieldsFor(id);
    if (select && date && hintElement) {
      hintElement.textContent = hint(date.value, select.value);
    }
  };

  const onFieldChange = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.regClass ?? target.dataset.regBirth;
    if (id) refreshHint(id);
  };
  root.addEventListener("input", onFieldChange);
  root.addEventListener("change", onFieldChange);

  root.querySelector("#refresh-registrations")
    ?.addEventListener("click", () => {
      void renderUmpireRegistrations(container);
    });

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // ----- Parents and guardians -----
    const approveParent = target.closest<HTMLButtonElement>("[data-approve-parent]");
    const rejectParent = target.closest<HTMLButtonElement>("[data-reject-parent]");
    if (approveParent || rejectParent) {
      const button = (approveParent ?? rejectParent) as HTMLButtonElement;
      const id = (approveParent ? approveParent.dataset.approveParent : rejectParent?.dataset.rejectParent) ?? "";
      const name = pending.find((item) => item.id === id)?.display_name || "this person";

      if (rejectParent && !window.confirm(`Reject the registration from ${name}? They will not get access.`)) return;
      button.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc(approveParent ? "approve_parent_registration" : "reject_parent_registration", { p_profile_id: id });
        if (error) {
          show(`Could not ${approveParent ? "approve" : "reject"}: ${error.message}`, "error");
          button.disabled = false;
          return;
        }
        await reloadWithMessage(approveParent ? `Approved ${name} as a parent or guardian. Link them to their child in Families.` : `Rejected the registration from ${name}.`);
      })();
      return;
    }

    // ----- Approve -----
    const approve = target.closest<HTMLButtonElement>("[data-approve]");
    if (approve) {
      const id = approve.dataset.approve ?? "";
      const { select, date } = fieldsFor(id);
      const classification = select?.value ?? "";
      const birthDate = date?.value ?? "";
      const profile = waiting.find((item) => item.id === id);
      const name = profile?.display_name || "this person";

      if (classification === "youth" && !birthDate) {
        show("Enter a birth date to approve a youth umpire.", "error");
        return;
      }

      if (birthDate) {
        const age = ageFromBirthDate(birthDate);
        if (age === null || age < 0) {
          show("Enter a valid birth date that is not in the future.", "error");
          return;
        }
        if (age < minAge) {
          show(`The league's minimum age for umpires is ${minAge}, so they cannot be approved.`, "error");
          return;
        }
        if (classification === "adult" && age < 18) {
          show("This person is under 18, so approve them as a youth umpire.", "error");
          return;
        }
        if (classification === "youth" && age >= 18) {
          show("This person is 18 or older, so approve them as an adult umpire.", "error");
          return;
        }
      }

      approve.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("approve_umpire_registration", {
          p_profile_id: id,
          p_classification: classification,
          p_birth_date: birthDate || null,
        });

        if (error) {
          show(`Could not approve: ${error.message}`, "error");
          approve.disabled = false;
          return;
        }

        await reloadWithMessage(
          `Approved ${name} as ${classification === "youth" ? "a youth" : "an adult"} umpire.`,
        );
      })();
      return;
    }

    // ----- Reject -----
    const reject = target.closest<HTMLButtonElement>("[data-reject]");
    if (reject) {
      const id = reject.dataset.reject ?? "";
      const profile = waiting.find((item) => item.id === id);
      const name = profile?.display_name || "this person";

      if (
        !window.confirm(
          `Reject the registration from ${name}? They will not get access.`,
        )
      ) {
        return;
      }

      reject.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("reject_umpire_registration", {
          p_profile_id: id,
        });

        if (error) {
          show(`Could not reject: ${error.message}`, "error");
          reject.disabled = false;
          return;
        }

        await reloadWithMessage(`Rejected the registration from ${name}.`);
      })();
    }
  });
}
