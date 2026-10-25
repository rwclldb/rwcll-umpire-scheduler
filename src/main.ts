
import "./style.css";
import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";
import { renderUmpireDirectory } from "./umpires";
import { renderLeagueSetup } from "./league_setup";
     import { renderRoleManager } from "./roles";

type AccountStatus = "pending" | "approved" | "rejected" | "suspended";

type Profile = {
  display_name: string;
  account_status: AccountStatus;
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Application container was not found.");
}

let currentView: "signup" | "login" = "login";
let busy = false;

function showMessage(message: string, kind: "error" | "success" = "error") {
  const element = document.querySelector<HTMLParagraphElement>("#message");
  if (element) {
    element.textContent = message;
    element.className = `message ${kind}`;
  }
}

function renderAuthForm() {
  app!.innerHTML = `
    <main class="page">
      <section class="auth-card">
        <p class="eyebrow">RWCLL</p>
        <h1>Umpire Management</h1>
        <p class="intro">
          Manage game assignments, scheduling, and your umpire account.
        </p>

        <div class="tabs" role="tablist" aria-label="Account access">
          <button id="login-tab" class="tab" type="button"
            aria-selected="${currentView === "login"}">
            Sign in
          </button>
          <button id="signup-tab" class="tab" type="button"
            aria-selected="${currentView === "signup"}">
            Create account
          </button>
        </div>

        <h2>${currentView === "signup" ? "Create your account" : "Welcome back"}</h2>
        <p class="form-intro">
          ${
            currentView === "signup"
              ? "Register to request access to the umpire system."
              : "Sign in to check your account and assignments."
          }
        </p>

        <form id="auth-form">
          ${
            currentView === "signup"
              ? `
                <label for="display-name">Full name</label>
                <input id="display-name" name="displayName"
                  type="text" autocomplete="name" maxlength="100"
                  required placeholder="Your full name" />
              `
              : ""
          }

          <label for="email">Email address</label>
          <input id="email" name="email" type="email"
            autocomplete="email" required maxlength="254"
            placeholder="you@example.com" />

          <label for="password">Password</label>
          <input id="password" name="password" type="password"
            autocomplete="${currentView === "signup" ? "new-password" : "current-password"}"
            minlength="8" required placeholder="At least 8 characters" />

          ${
            currentView === "signup"
              ? `
                <label for="confirm-password">Confirm password</label>
                <input id="confirm-password" name="confirmPassword"
                  type="password" autocomplete="new-password"
                  minlength="8" required placeholder="Enter password again" />
              `
              : ""
          }

          <button id="submit-button" class="primary-button" type="submit">
            ${currentView === "signup" ? "Create account" : "Sign in"}
          </button>
          <p id="message" class="message" role="status" aria-live="polite"></p>
        </form>

        <p class="security-note">
          New accounts require administrator approval before protected
          umpire features are available.
        </p>
      </section>
    </main>
  `;

  document.querySelector("#login-tab")?.addEventListener("click", () => {
    currentView = "login";
    renderAuthForm();
  });

  document.querySelector("#signup-tab")?.addEventListener("click", () => {
    currentView = "signup";
    renderAuthForm();
  });

  document.querySelector<HTMLFormElement>("#auth-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitAuthForm();
    });
}

async function submitAuthForm() {
  if (busy) return;

  const form = document.querySelector<HTMLFormElement>("#auth-form");
  const button = document.querySelector<HTMLButtonElement>("#submit-button");
  if (!form || !button) return;

  const data = new FormData(form);
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");

  busy = true;
  button.disabled = true;
  button.textContent = currentView === "signup" ? "Creating account…" : "Signing in…";
  showMessage("");

  try {
    if (currentView === "signup") {
      const displayName = String(data.get("displayName") ?? "").trim();
      const confirmPassword = String(data.get("confirmPassword") ?? "");

      if (!displayName) {
        showMessage("Please enter your full name.");
        return;
      }

      if (password.length < 8) {
        showMessage("Your password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        showMessage("The passwords do not match.");
        return;
      }

      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      if (result.session) {
        await loadProfile(result.session);
      } else {
        renderAuthForm();
        showMessage(
          "Registration submitted. Check your email for a confirmation link. " +
          "After confirming, sign in to check your account approval status.",
          "success"
        );
      }
    } else {
      const { data: result, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      await loadProfile(result.session);
    }
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";
    showMessage(message);
  } finally {
    busy = false;
    const submitButton = document.querySelector<HTMLButtonElement>("#submit-button");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        currentView === "signup" ? "Create account" : "Sign in";
    }
  }
}


async function loadProfile(session: Session) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, account_status")
    .eq("id", session.user.id)
    .single<Profile>();

  if (error || !profile) {
    app!.innerHTML = `
      <main class="page">
        <section class="auth-card">
          <h1>Account status unavailable</h1>
          <p>We couldn't load your profile. Please try again later.</p>
          <button id="signout-button" class="secondary-button">
            Sign out
          </button>
        </section>
      </main>
    `;
    document.querySelector("#signout-button")?.addEventListener(
      "click",
      () => void signOut()
    );
    return;
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", session.user.id);

  if (roleError) {
    renderAccountStatus(profile);
    showMessage("Unable to check account permissions. Please try again.");
    return;
  }

  const isSuperAdmin =
    roleRows?.some((role) => role.role_id === "super_admin") ?? false;

  if (profile.account_status === "approved" && isSuperAdmin) {
    renderAdminDashboard(profile);
    return;
  }

  renderAccountStatus(profile);
}


function renderAccountStatus(profile: Profile) {
  const details: Record<AccountStatus, { title: string; text: string }> = {
    pending: {
      title: "Awaiting approval",
      text: "Your account has been created, but an administrator must approve it before you can access protected umpire features."
    },
    approved: {
      title: "Account approved",
      text: "Your account is approved. The scheduling dashboard will be added in a later step."
    },
    rejected: {
      title: "Account not approved",
      text: "Your account has not been approved. Please contact your league administrator if you believe this is a mistake."
    },
    suspended: {
      title: "Account suspended",
      text: "Access to the umpire system is currently suspended. Please contact your league administrator."
    }
  };

  const status = details[profile.account_status] ?? details.pending;

  app!.innerHTML = `
    <main class="page">
      <section class="auth-card">
        <p class="eyebrow">RWCLL</p>
        <h1 id="account-heading"></h1>
        <p id="account-message" class="intro"></p>
        <div class="status">
          <span class="status-dot"></span>
          <span id="account-status"></span>
        </div>
        <button id="signout-button" class="secondary-button" type="button">
          Sign out
        </button>
      </section>
    </main>
  `;

  // Use textContent for database values rather than injecting them as HTML.
  document.querySelector("#account-heading")!.textContent = status.title;
  document.querySelector("#account-message")!.textContent = status.text;
  document.querySelector("#account-status")!.textContent =
    `Signed in as ${profile.display_name || "user"} · ${profile.account_status}`;

  document.querySelector("#signout-button")?.addEventListener("click", () => {
    void signOut();
  });
}


type PendingProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function renderAdminDashboard(profile: Profile) {
  app!.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · ADMINISTRATION</p>
        <h1>Account Management</h1>
        <p class="intro">Review new account requests.</p>

        <p id="admin-message" class="message"
          role="status" aria-live="polite"></p>

        <h2>Pending accounts</h2>
        <div id="pending-accounts">
          <p>Loading pending accounts…</p>
        </div>

        <button id="refresh-accounts" class="secondary-button"
          type="button">Refresh list</button>

        <hr class="directory-divider" />

        <div id="role-manager-container"></div>

        <hr class="directory-divider" />

        <div id="league-setup-container"></div>

        <div id="umpire-directory-container"></div>

        <p class="security-note">
          Signed in as ${escapeHtml(profile.display_name || "Administrator")}
        </p>

        <button id="signout-button" class="secondary-button"
          type="button">Sign out</button>
      </section>
    </main>
  `;

  document.querySelector("#signout-button")?.addEventListener(
    "click",
    () => void signOut()
  );

  document.querySelector("#refresh-accounts")?.addEventListener(
    "click",
    () => void loadPendingAccounts()
  );

  document.querySelector("#pending-accounts")?.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;

      const userId = target.dataset.userId;
      const status = target.dataset.status;

      if (
        !userId ||
        (status !== "approved" && status !== "rejected")
      ) {
        return;
      }

      void updateAccountStatus(userId, status);
    }
  );

  void loadPendingAccounts();

  const directoryContainer =
  document.querySelector<HTMLElement>("#umpire-directory-container");

  if (directoryContainer) {
    renderUmpireDirectory(directoryContainer);
  }

  const leagueSetupContainer =
    document.querySelector<HTMLElement>("#league-setup-container");

  if (leagueSetupContainer) {
    void renderLeagueSetup(leagueSetupContainer);
  }

  const roleManagerContainer =
    document.querySelector<HTMLElement>("#role-manager-container");

  if (roleManagerContainer) {
    void renderRoleManager(roleManagerContainer);
  }
}

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

async function loadPendingAccounts() {
  const container = document.querySelector<HTMLDivElement>(
    "#pending-accounts"
  );

  if (!container) return;

  container.replaceChildren();
  const loading = document.createElement("p");
  loading.textContent = "Loading pending accounts…";
  container.append(loading);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("account_status", "pending")
    .order("display_name");

  container.replaceChildren();

  if (error) {
    const message = document.createElement("p");
    message.textContent = "Unable to load pending accounts.";
    container.append(message);
    showAdminMessage(error.message);
    return;
  }

  const accounts = (data ?? []) as PendingProfile[];

  if (accounts.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "There are no pending accounts.";
    container.append(empty);
    return;
  }

  for (const account of accounts) {
    const card = document.createElement("div");
    card.className = "pending-account";

    const name = document.createElement("h3");
    name.textContent = account.display_name || "Name not provided";

    const email = document.createElement("p");
    email.textContent = account.email || "Email unavailable";

    const actions = document.createElement("div");
    actions.className = "account-actions";

    for (const action of [
      { label: "Approve", status: "approved" },
      { label: "Reject", status: "rejected" }
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = action.label;
      button.className =
        action.status === "approved"
          ? "primary-button"
          : "secondary-button";
      button.dataset.userId = account.id;
      button.dataset.status = action.status;
      actions.append(button);
    }

    card.append(name, email, actions);
    container.append(card);
  }
}

async function updateAccountStatus(
  userId: string,
  newStatus: "approved" | "rejected"
) {
  const message =
    newStatus === "approved"
      ? "Approve this account?"
      : "Reject this account?";

  if (!window.confirm(message)) return;

  const buttons = document.querySelectorAll<HTMLButtonElement>(
    `[data-user-id="${CSS.escape(userId)}"]`
  );

  buttons.forEach((button) => {
    button.disabled = true;
  });

  const { error } = await supabase.rpc("set_account_status", {
    target_user_id: userId,
    new_status: newStatus
  });

  if (error) {
    showAdminMessage(`Could not update account: ${error.message}`);
    buttons.forEach((button) => {
      button.disabled = false;
    });
    return;
  }

  showAdminMessage(
    newStatus === "approved"
      ? "Account approved."
      : "Account rejected.",
    "success"
  );

  await loadPendingAccounts();
}

function showAdminMessage(
  message: string,
  kind: "error" | "success" = "error"
) {
  const element = document.querySelector<HTMLParagraphElement>(
    "#admin-message"
  );

  if (element) {
    element.textContent = message;
    element.className = `message ${kind}`;
  }
}


async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    showMessage(error.message);
    return;
  }

  currentView = "login";
  renderAuthForm();
}

async function initialize() {
  renderAuthForm();

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showMessage("Unable to check your current session. Please sign in again.");
    return;
  }

  if (data.session) {
    await loadProfile(data.session);
  }
}

void initialize();
