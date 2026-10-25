import { supabase } from "./supabase";
import { escapeHtml } from "./ui";

type AccountRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  account_status: string;
};

type RoleRow = {
  id: string;
  description: string;
};

type UserRoleRow = {
  user_id: string;
  role_id: string;
};

// Roles that cannot be held together: the account role decides whether
// someone is a youth or an adult umpire. The database enforces this too.
const CONFLICTING_ROLE: Record<string, string> = {
  youth_umpire: "adult_umpire",
  adult_umpire: "youth_umpire",
};

// Remembered between reloads so a search is not lost after a change.
let searchTerm = "";

function roleLabel(roleId: string): string {
  const text = roleId.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function accountName(account: AccountRow): string {
  return account.display_name || account.email || "Name not provided";
}

function renderAccount(
  account: AccountRow,
  roles: RoleRow[],
  heldRoles: string[],
  isSelf: boolean,
  phone: string | null,
): string {
  const chips = heldRoles.length
    ? `<ul class="role-chips">${heldRoles.map((roleId) => {
        const role = roles.find((item) => item.id === roleId);
        // You cannot remove your own super admin role here: that would
        // be an easy way to lock yourself out.
        const canRemove = !(isSelf && roleId === "super_admin");
        return `
          <li class="role-chip" title="${escapeHtml(role?.description ?? "")}">
            <span>${escapeHtml(roleLabel(roleId))}</span>
            ${canRemove
              ? `<button type="button" class="role-chip-remove"
                  data-remove-role="${escapeHtml(roleId)}"
                  data-user-id="${escapeHtml(account.id)}"
                  aria-label="Remove ${escapeHtml(roleLabel(roleId))} from ${escapeHtml(accountName(account))}">
                  &times;
                </button>`
              : ""}
          </li>
        `;
      }).join("")}</ul>`
    : `<p class="role-chip-none">No roles yet</p>`;

  const available = roles.filter((role) => {
    if (heldRoles.includes(role.id)) return false;
    const conflict = CONFLICTING_ROLE[role.id];
    return !(conflict && heldRoles.includes(conflict));
  });

  const adder = available.length
    ? `
      <div class="role-add">
        <select data-add-select="${escapeHtml(account.id)}"
          aria-label="Role to add for ${escapeHtml(accountName(account))}">
          <option value="">Add a role&hellip;</option>
          ${available.map((role) => `
            <option value="${escapeHtml(role.id)}">
              ${escapeHtml(roleLabel(role.id))}
            </option>
          `).join("")}
        </select>
        <button type="button" class="secondary-button"
          data-add-role="${escapeHtml(account.id)}">
          Add
        </button>
      </div>
    `
    : "";

  const searchText =
    `${account.display_name ?? ""} ${account.email ?? ""} ${phone ?? ""}`
      .toLowerCase();

  return `
    <li class="role-account"
      data-search="${escapeHtml(searchText)}">
      <span class="role-account-name">
        ${escapeHtml(accountName(account))}${isSelf ? " (you)" : ""}
      </span>
      <span class="role-account-email">
        ${escapeHtml(account.email ?? "Email unavailable")}
      </span>
      <span class="role-account-contact">
        Phone: ${escapeHtml(phone ?? "not on file")}
      </span>
      ${chips}
      ${adder}
    </li>
  `;
}

export async function renderRoleManager(
  container: HTMLElement,
): Promise<void> {
  container.innerHTML = `
    <section class="directory-section">
      <h2>Roles</h2>
      <p class="directory-description">Loading accounts&hellip;</p>
    </section>
  `;

  const [
    profilesResult,
    rolesResult,
    userRolesResult,
    sessionResult,
    umpiresResult,
  ] = await Promise.all([
    supabase.from("profiles")
      .select("id, display_name, email, account_status")
      .eq("account_status", "approved")
      .order("display_name"),
    supabase.from("roles").select("id, description").order("id"),
    supabase.from("user_roles").select("user_id, role_id"),
    supabase.auth.getSession(),
    supabase.from("umpires").select("profile_id, phone"),
  ]);

  const firstError =
    profilesResult.error ?? rolesResult.error ?? userRolesResult.error;

  if (firstError) {
    container.innerHTML = `
      <section class="directory-section">
        <h2>Roles</h2>
        <p class="message error">
          Unable to load accounts and roles. Refresh and try again.
        </p>
      </section>
    `;
    console.error("Role manager load failed:", firstError.message);
    return;
  }

  const accounts = (profilesResult.data ?? []) as AccountRow[];
  const roles = (rolesResult.data ?? []) as RoleRow[];
  const userRoles = (userRolesResult.data ?? []) as UserRoleRow[];
  const currentUserId = sessionResult.data.session?.user.id ?? null;

  // A phone number is shown when the account is linked to an umpire record
  // that has one. A failed lookup only leaves the phone blank.
  if (umpiresResult.error) {
    console.error("Phone numbers not loaded:", umpiresResult.error.message);
  }
  const phoneByAccount = new Map<string, string>();
  for (const row of (umpiresResult.data ?? []) as {
    profile_id: string | null;
    phone: string | null;
  }[]) {
    if (row.profile_id && row.phone) phoneByAccount.set(row.profile_id, row.phone);
  }

  const rolesFor = (userId: string): string[] =>
    userRoles
      .filter((row) => row.user_id === userId)
      .map((row) => row.role_id)
      .sort();

  container.innerHTML = `
    <section class="directory-section" id="role-manager">
      <div class="directory-header">
        <div>
          <h2>Roles</h2>
          <p class="directory-description">
            Choose what each approved account is allowed to do.
            Only super admins can change roles.
          </p>
        </div>
        <button id="refresh-roles" class="secondary-button"
          type="button">Refresh</button>
      </div>

      <details class="role-legend">
        <summary>What each role allows</summary>
        <ul>
          ${roles.map((role) => `
            <li>
              <strong>${escapeHtml(roleLabel(role.id))}</strong>:
              ${escapeHtml(role.description)}
            </li>
          `).join("")}
        </ul>
      </details>

      <p id="role-manager-message" class="message"
        role="status" aria-live="polite"></p>

      <label for="role-search">Search accounts</label>
      <input id="role-search" type="search"
        placeholder="Search by name or email"
        value="${escapeHtml(searchTerm)}" />

      ${accounts.length
        ? `<ul class="role-list">${accounts.map((account) =>
            renderAccount(
              account,
              roles,
              rolesFor(account.id),
              account.id === currentUserId,
              phoneByAccount.get(account.id) ?? null,
            )
          ).join("")}</ul>
          <p id="role-no-match" class="directory-empty" hidden>
            No accounts match your search.
          </p>`
        : `<p class="directory-empty">
            There are no approved accounts yet. Approve an account first.
          </p>`}
    </section>
  `;

  const root = container.querySelector<HTMLElement>("#role-manager");
  if (!root) return;

  const showMessage = (text: string, kind: "error" | "success") => {
    const element = root.querySelector<HTMLElement>("#role-manager-message");
    if (element) {
      element.textContent = text;
      element.className = `message ${kind}`;
    }
  };

  const applySearch = () => {
    const term = searchTerm.trim().toLowerCase();
    let visible = 0;
    root.querySelectorAll<HTMLElement>(".role-account").forEach((item) => {
      const match = !term || (item.dataset.search ?? "").includes(term);
      item.hidden = !match;
      if (match) visible++;
    });
    const none = root.querySelector<HTMLElement>("#role-no-match");
    if (none) none.hidden = visible > 0;
  };
  applySearch();

  root.querySelector("#role-search")?.addEventListener("input", (event) => {
    searchTerm = (event.target as HTMLInputElement).value;
    applySearch();
  });

  root.querySelector("#refresh-roles")?.addEventListener("click", () => {
    void renderRoleManager(container);
  });

  const reloadWithMessage = async (
    text: string,
    kind: "error" | "success",
  ) => {
    await renderRoleManager(container);
    const element = container.querySelector<HTMLElement>(
      "#role-manager-message",
    );
    if (element) {
      element.textContent = text;
      element.className = `message ${kind}`;
    }
  };

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // ----- Remove a role -----
    const removeButton =
      target.closest<HTMLButtonElement>("[data-remove-role]");
    if (removeButton) {
      const userId = removeButton.dataset.userId ?? "";
      const roleId = removeButton.dataset.removeRole ?? "";
      const account = accounts.find((item) => item.id === userId);
      const name = account ? accountName(account) : "this account";
      const warning = roleId === "super_admin"
        ? " They will lose all administrator access."
        : "";

      if (
        !window.confirm(
          `Remove the "${roleLabel(roleId)}" role from ${name}?${warning}`,
        )
      ) {
        return;
      }

      removeButton.disabled = true;

      void (async () => {
        const { data: removed, error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role_id", roleId)
          .select("user_id");

        if (error || !removed || removed.length === 0) {
          showMessage(
            error
              ? `Could not remove the role: ${error.message}`
              : "The role was not removed. You may not have permission, " +
                "or it was already removed.",
            "error",
          );
          removeButton.disabled = false;
          return;
        }

        await reloadWithMessage(
          `Removed ${roleLabel(roleId)} from ${name}.`,
          "success",
        );
      })();
      return;
    }

    // ----- Add a role -----
    const addButton = target.closest<HTMLButtonElement>("[data-add-role]");
    if (addButton) {
      const userId = addButton.dataset.addRole ?? "";
      const select = root.querySelector<HTMLSelectElement>(
        `select[data-add-select="${CSS.escape(userId)}"]`,
      );
      const roleId = select?.value ?? "";
      const account = accounts.find((item) => item.id === userId);
      const name = account ? accountName(account) : "this account";

      if (!roleId) {
        showMessage("Choose a role to add first.", "error");
        return;
      }

      addButton.disabled = true;

      void (async () => {
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role_id: roleId,
          granted_by: currentUserId,
        });

        if (error) {
          showMessage(
            error.code === "23505"
              ? `${name} already has that role.`
              : `Could not add the role: ${error.message}`,
            "error",
          );
          addButton.disabled = false;
          return;
        }

        await reloadWithMessage(
          `Added ${roleLabel(roleId)} to ${name}.`,
          "success",
        );
      })();
    }
  });
}
