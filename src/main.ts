
import "./style.css";
import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";
import { renderUmpireDirectory } from "./umpires";
import { renderLeagueSetup } from "./league_setup";
import { renderRoleManager } from "./roles";
import { renderMyDetails } from "./my-details";
import { renderUmpireRegistrations } from "./registrations";
import { renderOutbox } from "./outbox";
import { addTopBar as drawTopBar, renderShell } from "./shell";
import type { ShellPage } from "./shell";

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

// Links in emails (password reset, confirmation) arrive with details in the
// address. They are read here, straight away, before Supabase tidies the
// address up.
const linkParams = new URLSearchParams(
  `${window.location.hash.replace(/^#/, "")}&${window.location.search.replace(/^\?/, "")}`
);
let recoveryMode = linkParams.get("type") === "recovery";
const linkHadError = linkParams.has("error_description");

// The Outbox is loaded from the database every time its section is opened,
// and again whenever a message is queued while it is open, so it is never
// out of date.
let outboxChangedListener: (() => void) | null = null;

function wireOutbox() {
  const details = document.querySelector<HTMLDetailsElement>("#outbox-details");
  const container = document.querySelector<HTMLElement>("#outbox-container");
  if (!details || !container) return;

  details.addEventListener("toggle", () => {
    if (details.open) {
      void renderOutbox(container);
    }
  });

  // Only one listener at a time, even if the dashboard is drawn again.
  if (outboxChangedListener) {
    document.removeEventListener("outbox:changed", outboxChangedListener);
  }
  outboxChangedListener = () => {
    if (details.isConnected && details.open) {
      void renderOutbox(container);
    }
  };
  document.addEventListener("outbox:changed", outboxChangedListener);
}

// A bar across the top of the screens that are not part of the app shell
// (the plain account page, errors, password reset), with Sign out at the right.
function addTopBar(name: string) {
  drawTopBar(app!, name, () => void signOut());
}

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

                <fieldset class="signup-kind">
                  <legend>I am signing up as</legend>
                  <label class="season-checkbox-label">
                    <input type="radio" name="signupKind"
                      value="adult_umpire" required />
                    An adult umpire (18 or older)
                  </label>
                  <label class="season-checkbox-label">
                    <input type="radio" name="signupKind"
                      value="youth_umpire" />
                    A youth umpire (13 to 17)
                  </label>
                  <div id="age-confirm" hidden>
                    <label class="season-checkbox-label">
                      <input type="checkbox" name="ageConfirm" />
                      I am 13 or older
                    </label>
                    <p class="season-dates">
                      If you are under 13, a parent or the league has to set
                      up your account. Please contact your league
                      administrator.
                    </p>
                  </div>
                </fieldset>
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
            currentView === "login"
              ? `<button id="forgot-password-button" class="link-button"
                  type="button">Forgot your password?</button>`
              : ""
          }

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

  document.querySelector("#forgot-password-button")
    ?.addEventListener("click", () => {
      renderForgotPassword();
    });

  // Choosing "youth" asks for the 13-or-older confirmation.
  document.querySelectorAll<HTMLInputElement>('input[name="signupKind"]')
    .forEach((radio) => {
      radio.addEventListener("change", () => {
        const youth = document.querySelector<HTMLInputElement>(
          'input[name="signupKind"][value="youth_umpire"]'
        )?.checked ?? false;
        const box = document.querySelector<HTMLElement>("#age-confirm");
        if (box) box.hidden = !youth;
      });
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

      const signupKind = String(data.get("signupKind") ?? "");

      if (signupKind !== "adult_umpire" && signupKind !== "youth_umpire") {
        showMessage("Please choose whether you are an adult or a youth umpire.");
        return;
      }

      if (signupKind === "youth_umpire" && !data.get("ageConfirm")) {
        showMessage(
          "Umpires under 13 cannot register themselves. Please ask a " +
          "parent or your league administrator to set up your account."
        );
        return;
      }

      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, signup_kind: signupKind },
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


async function loadProfile(session: Session, alreadyClaimed = false) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, account_status")
    .eq("id", session.user.id)
    .single<Profile>();

  // If a password reset link was opened while this was loading, the reset
  // screen must stay on top.
  if (recoveryMode) return;

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
    addTopBar("");
    return;
  }

  // A new account may have an invitation waiting, or may be a new umpire
  // registration. The database decides; it only acts once the email is
  // confirmed. Safe to repeat.
  if (profile.account_status === "pending" && !alreadyClaimed) {
    const { data: outcome } = await supabase.rpc("claim_registration");

    if (recoveryMode) return;

    if (outcome === "invited") {
      // The invitation approved this account: load it again as approved.
      await loadProfile(session, true);
      return;
    }
  }

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", session.user.id);

  if (recoveryMode) return;

  if (roleError) {
    renderAccountStatus(profile);
    showMessage("Unable to check account permissions. Please try again.");
    return;
  }

  const roleIds: string[] = (roleRows ?? []).map(
    (role: { role_id: string }) => role.role_id
  );

  if (profile.account_status === "approved") {
    const pages = pagesFor(
      {
        isSuperAdmin: roleIds.includes("super_admin"),
        isUmpireChief: roleIds.includes("umpire_chief"),
        isScheduler: roleIds.includes("scheduler"),
        isUmpire:
          roleIds.includes("youth_umpire") || roleIds.includes("adult_umpire"),
      },
      profile
    );

    if (pages.length > 0) {
      renderShell(app!, {
        name: profile.display_name,
        pages,
        onSignOut: () => void signOut(),
      });
      return;
    }
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

        <div id="my-details-container"></div>

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

  if (profile.account_status === "approved") {
    const detailsContainer =
      document.querySelector<HTMLElement>("#my-details-container");

    if (detailsContainer) {
      void renderMyDetails(detailsContainer);
    }
  }

  document.querySelector("#signout-button")?.addEventListener("click", () => {
    void signOut();
  });

  addTopBar(profile.display_name);
}


type PendingProfile = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function renderAdminPage(container: HTMLElement) {
  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · ADMINISTRATION</p>
        <h1>Account Management</h1>
        <p class="intro">Review new account requests.</p>

        <details class="role-legend">
          <summary>My details (phone and text messages)</summary>
          <div id="my-details-admin"></div>
        </details>

        <details class="role-legend" id="outbox-details">
          <summary>Outbox (messages waiting to be sent)</summary>
          <div id="outbox-container"></div>
        </details>

        <p id="admin-message" class="message"
          role="status" aria-live="polite"></p>

        <div id="registrations-container"></div>

        <hr class="directory-divider" />

        <h2>Other pending accounts</h2>
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
      </section>
    </main>
  `;

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

  const myDetailsAdmin =
    document.querySelector<HTMLElement>("#my-details-admin");

  if (myDetailsAdmin) {
    void renderMyDetails(myDetailsAdmin, { heading: false });
  }

  const registrationsContainer =
    document.querySelector<HTMLElement>("#registrations-container");

  if (registrationsContainer) {
    void renderUmpireRegistrations(registrationsContainer);
  }

  wireOutbox();
}

// A smaller page for the umpire chief: review new umpire registrations and
// manage the umpire directory.
function renderChiefPage(container: HTMLElement) {
  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · UMPIRE CHIEF</p>
        <h1>Umpire Management</h1>
        <p class="intro">
          Review new umpire registrations and manage the umpire directory.
        </p>

        <details class="role-legend">
          <summary>My details (phone and text messages)</summary>
          <div id="my-details-admin"></div>
        </details>

        <details class="role-legend" id="outbox-details">
          <summary>Outbox (messages waiting to be sent)</summary>
          <div id="outbox-container"></div>
        </details>

        <div id="registrations-container"></div>

        <hr class="directory-divider" />

        <div id="umpire-directory-container"></div>
      </section>
    </main>
  `;

  const directoryContainer =
    document.querySelector<HTMLElement>("#umpire-directory-container");

  if (directoryContainer) {
    renderUmpireDirectory(directoryContainer);
  }

  const registrationsContainer =
    document.querySelector<HTMLElement>("#registrations-container");

  if (registrationsContainer) {
    void renderUmpireRegistrations(registrationsContainer);
  }

  const myDetailsAdmin =
    document.querySelector<HTMLElement>("#my-details-admin");

  if (myDetailsAdmin) {
    void renderMyDetails(myDetailsAdmin, { heading: false });
  }

  wireOutbox();
}

// The umpire directory, for people who manage umpires but are not the chief.
function renderUmpiresPage(container: HTMLElement) {
  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card">
        <details class="role-legend" id="outbox-details">
          <summary>Outbox (messages waiting to be sent)</summary>
          <div id="outbox-container"></div>
        </details>

        <div id="umpire-directory-container"></div>
      </section>
    </main>
  `;

  const directoryContainer =
    container.querySelector<HTMLElement>("#umpire-directory-container");

  if (directoryContainer) {
    renderUmpireDirectory(directoryContainer);
  }

  wireOutbox();
}

function renderSetupPage(container: HTMLElement) {
  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card">
        <div id="league-setup-container"></div>
      </section>
    </main>
  `;

  const setupContainer =
    container.querySelector<HTMLElement>("#league-setup-container");

  if (setupContainer) {
    void renderLeagueSetup(setupContainer);
  }
}

function renderDetailsPage(container: HTMLElement) {
  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card">
        <div id="my-details-page"></div>
      </section>
    </main>
  `;

  const detailsContainer =
    container.querySelector<HTMLElement>("#my-details-page");

  if (detailsContainer) {
    void renderMyDetails(detailsContainer);
  }
}

// The umpire's own home page. Availability and assignments will appear here
// when scheduling is switched on.
function renderUmpireHomePage(
  container: HTMLElement,
  name: string,
  openDetails: (() => void) | null
) {
  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · UMPIRE</p>
        <h1>Welcome${name ? `, ${escapeHtml(name)}` : ""}</h1>
        <p class="intro">
          Your umpire account is active. Your availability and your game
          assignments will appear here as soon as scheduling is switched on.
          Meanwhile, please keep your contact details up to date.
        </p>
        ${openDetails
          ? `<button id="home-open-details" class="secondary-button"
              type="button">Open My details</button>`
          : ""}
      </section>
    </main>
  `;

  if (openDetails) {
    container.querySelector("#home-open-details")
      ?.addEventListener("click", openDetails);
  }
}

// The pages a signed-in person can see, from their roles.
//  - super admin: Administration (everything, as before)
//  - umpire chief: Umpire Management
//  - scheduler: Umpires and League Setup
//  - youth or adult umpire: Home
//  - My details, for everyone whose page does not already include it
function pagesFor(
  flags: {
    isSuperAdmin: boolean;
    isUmpireChief: boolean;
    isScheduler: boolean;
    isUmpire: boolean;
  },
  profile: Profile
): ShellPage[] {
  const pages: ShellPage[] = [];

  if (flags.isSuperAdmin) {
    pages.push({
      id: "admin",
      label: "Administration",
      render: (container) => renderAdminPage(container),
    });
  } else {
    if (flags.isUmpireChief) {
      pages.push({
        id: "chief",
        label: "Umpire Management",
        render: (container) => renderChiefPage(container),
      });
    }

    if (flags.isScheduler) {
      if (!flags.isUmpireChief) {
        pages.push({ id: "umpires", label: "Umpires", render: renderUmpiresPage });
      }
      pages.push({ id: "setup", label: "League Setup", render: renderSetupPage });
    }
  }

  // The administration and chief pages already include My details.
  const hasDetailsPage = !flags.isSuperAdmin && !flags.isUmpireChief;

  if (flags.isUmpire) {
    pages.push({
      id: "home",
      label: pages.length === 0 ? "Home" : "As an umpire",
      render: (container, navigate) =>
        renderUmpireHomePage(
          container,
          profile.display_name,
          hasDetailsPage ? () => navigate("details") : null
        ),
    });
  }

  if (hasDetailsPage && pages.length > 0) {
    pages.push({ id: "details", label: "My details", render: renderDetailsPage });
  }

  return pages;
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
    .is("registration_kind", null)
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


function renderForgotPassword() {
  app!.innerHTML = `
    <main class="page">
      <section class="auth-card">
        <p class="eyebrow">RWCLL</p>
        <h1>Reset your password</h1>
        <p class="intro">
          Enter the email address you registered with. If an account exists
          for it, we will send a link that lets you choose a new password.
        </p>

        <form id="forgot-form">
          <label for="forgot-email">Email address</label>
          <input id="forgot-email" name="email" type="email"
            autocomplete="email" required maxlength="254"
            placeholder="you@example.com" />

          <button id="forgot-submit" class="primary-button" type="submit">
            Send reset link
          </button>
          <p id="message" class="message" role="status"
            aria-live="polite"></p>
        </form>

        <button id="forgot-back" class="secondary-button" type="button">
          Back to sign in
        </button>
      </section>
    </main>
  `;

  document.querySelector("#forgot-back")?.addEventListener("click", () => {
    currentView = "login";
    renderAuthForm();
  });

  document.querySelector<HTMLFormElement>("#forgot-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitForgotPassword();
    });
}

async function submitForgotPassword() {
  if (busy) return;

  const form = document.querySelector<HTMLFormElement>("#forgot-form");
  const button = document.querySelector<HTMLButtonElement>("#forgot-submit");
  if (!form || !button) return;

  const email = String(new FormData(form).get("email") ?? "")
    .trim()
    .toLowerCase();

  busy = true;
  button.disabled = true;
  button.textContent = "Sending…";
  showMessage("");

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`
    });

    if (error) throw error;

    // The same wording is used whether or not an account exists, so this
    // screen cannot be used to find out who has an account.
    showMessage(
      "If an account exists for that email, a reset link is on its way. " +
      "Check your inbox and spam folder. The link works for a limited time.",
      "success"
    );
  } catch (error) {
    showMessage(
      error instanceof Error
        ? error.message
        : "Could not send the reset link. Please try again."
    );
  } finally {
    busy = false;
    const submit = document.querySelector<HTMLButtonElement>("#forgot-submit");
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Send reset link";
    }
  }
}

function renderSetNewPassword() {
  app!.innerHTML = `
    <main class="page">
      <section class="auth-card">
        <p class="eyebrow">RWCLL</p>
        <h1>Choose a new password</h1>
        <p class="intro">
          Enter a new password for your account. Use at least 8 characters.
        </p>

        <form id="new-password-form">
          <label for="new-password">New password</label>
          <input id="new-password" name="password" type="password"
            autocomplete="new-password" minlength="8" required
            placeholder="At least 8 characters" />

          <label for="new-password-confirm">Confirm new password</label>
          <input id="new-password-confirm" name="confirmPassword"
            type="password" autocomplete="new-password" minlength="8"
            required placeholder="Enter password again" />

          <button id="new-password-submit" class="primary-button"
            type="submit">Save new password</button>
          <p id="message" class="message" role="status"
            aria-live="polite"></p>
        </form>

        <button id="new-password-cancel" class="secondary-button"
          type="button">Cancel</button>
      </section>
    </main>
  `;

  document.querySelector("#new-password-cancel")
    ?.addEventListener("click", () => {
      void signOut();
    });

  document.querySelector<HTMLFormElement>("#new-password-form")
    ?.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitNewPassword();
    });

  addTopBar("");
}

async function submitNewPassword() {
  if (busy) return;

  const form = document.querySelector<HTMLFormElement>("#new-password-form");
  const button =
    document.querySelector<HTMLButtonElement>("#new-password-submit");
  if (!form || !button) return;

  const data = new FormData(form);
  const password = String(data.get("password") ?? "");
  const confirmPassword = String(data.get("confirmPassword") ?? "");

  if (password.length < 8) {
    showMessage("Your password must be at least 8 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("The passwords do not match.");
    return;
  }

  busy = true;
  button.disabled = true;
  button.textContent = "Saving…";
  showMessage("");

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;

    // End any other sign-ins that were still using the old password.
    await supabase.auth.signOut({ scope: "others" });

    recoveryMode = false;
    window.history.replaceState(null, "", window.location.pathname);

    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session) {
      await loadProfile(sessionData.session);
    } else {
      currentView = "login";
      renderAuthForm();
      showMessage("Your password was changed. Please sign in.", "success");
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : "";
    showMessage(
      /session missing|not authenticated/i.test(text)
        ? "This reset link has expired or was already used. " +
          "Please request a new one."
        : text || "Could not change the password. Please try again."
    );
  } finally {
    busy = false;
    const submit =
      document.querySelector<HTMLButtonElement>("#new-password-submit");
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Save new password";
    }
  }
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    showMessage(error.message);
    return;
  }

  recoveryMode = false;
  currentView = "login";

  // Forget which page was open, so the next person starts at their first page.
  window.history.replaceState(null, "", window.location.pathname);

  renderAuthForm();
}

async function initialize() {
  // Opened from a password reset email: show the new-password screen.
  if (recoveryMode) {
    renderSetNewPassword();
    return;
  }

  renderAuthForm();

  if (linkHadError) {
    // Expired or already-used email links arrive with an error in the address.
    window.history.replaceState(null, "", window.location.pathname);
    showMessage(
      "That email link is invalid or has expired. " +
      "If you were resetting your password, please request a new link."
    );
    return;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showMessage("Unable to check your current session. Please sign in again.");
    return;
  }

  if (data.session) {
    await loadProfile(data.session);
  }
}

// A password reset link signs the person in briefly and announces it here.
supabase.auth.onAuthStateChange((event: string) => {
  if (event === "PASSWORD_RECOVERY") {
    recoveryMode = true;
    if (!document.querySelector("#new-password-form")) {
      renderSetNewPassword();
    }
  }
});

void initialize();
