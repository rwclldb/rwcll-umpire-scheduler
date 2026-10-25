import { supabase } from "./supabase";
import { escapeHtml } from "./ui";
import { describeRoles } from "./role-names";

type ContactRow = {
  phone: string | null;
  sms_opt_in: boolean;
};

// The same pattern the database enforces: digits, spaces and + ( ) . -
const PHONE_PATTERN = /^[0-9+() .-]{7,30}$/;

// The signed-in person's own phone number and text-message preference.
// Text messages are NOT available yet: choosing them only records the
// preference, with the time it was chosen, for when the feature is turned on.
export async function renderMyDetails(
  container: HTMLElement,
  options: { heading?: boolean } = {},
): Promise<void> {
  const showHeading = options.heading ?? true;

  container.innerHTML = `
    <p class="directory-description">Loading your details&hellip;</p>
  `;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    container.innerHTML = "";
    return;
  }

  const [contactResult, profileResult, rolesResult] = await Promise.all([
    supabase.from("account_contact")
      .select("phone, sms_opt_in")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_roles")
      .select("role_id")
      .eq("user_id", user.id),
  ]);

  if (contactResult.error) {
    container.innerHTML = `
      <p class="message error">
        Unable to load your details. Refresh and try again.
      </p>
    `;
    console.error("My details load failed:", contactResult.error.message);
    return;
  }

  const contact = (contactResult.data ?? null) as ContactRow | null;
  const email = (profileResult.data as { email: string | null } | null)?.email
    ?? user.email
    ?? "";

  // (A failure to read the roles is not worth stopping for: the line just says none.)
  const roles = describeRoles(
    ((rolesResult.data ?? []) as { role_id: string }[]).map((row) => row.role_id)
  );

  container.innerHTML = `
    <section class="my-details">
      ${showHeading ? `<h2>My details</h2>` : ""}

      <p class="season-dates">
        Email: ${escapeHtml(email || "not available")}
        (this is how you sign in)
      </p>

      <p class="season-dates" id="my-roles">
        Your roles: <em>${escapeHtml(roles || "none")}</em>
      </p>

      <form id="my-details-form">
        <label for="my-phone">Phone number</label>
        <input id="my-phone" name="phone" type="tel" maxlength="30"
          autocomplete="tel" placeholder="e.g. 650-555-0123"
          value="${escapeHtml(contact?.phone ?? "")}" />

        <label class="season-checkbox-label">
          <input name="sms_opt_in" type="checkbox"
            ${contact?.sms_opt_in ? "checked" : ""} />
          I would like text message (SMS) notifications when they
          become available
        </label>
        <p class="season-dates">
          Text messages are not available yet. Choosing this only records
          your preference. Nothing will be sent until the feature is
          turned on, and you can change your mind here at any time.
        </p>

        <button id="my-details-save" class="primary-button" type="submit">
          Save my details
        </button>
        <p id="my-details-message" class="message" role="status"
          aria-live="polite"></p>
      </form>
    </section>
  `;

  const form = container.querySelector<HTMLFormElement>("#my-details-form");
  const message = container.querySelector<HTMLParagraphElement>(
    "#my-details-message",
  );
  if (!form || !message) return;

  const show = (text: string, kind: "error" | "success") => {
    message.textContent = text;
    message.className = `message ${kind}`;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const phone = String(new FormData(form).get("phone") ?? "").trim();
    const wantsSms = form.querySelector<HTMLInputElement>(
      '[name="sms_opt_in"]',
    )?.checked ?? false;

    if (phone && !PHONE_PATTERN.test(phone)) {
      show(
        "Enter the phone number using digits, spaces, and + ( ) . - only.",
        "error",
      );
      return;
    }

    if (wantsSms && !phone) {
      show("Enter a mobile number to choose text messages.", "error");
      return;
    }

    const button = container.querySelector<HTMLButtonElement>(
      "#my-details-save",
    );
    if (button) {
      button.disabled = true;
      button.textContent = "Saving…";
    }
    show("", "success");

    const { error } = await supabase.from("account_contact").upsert(
      {
        profile_id: user.id,
        phone: phone || null,
        sms_opt_in: wantsSms,
      },
      { onConflict: "profile_id" },
    );

    if (button) {
      button.disabled = false;
      button.textContent = "Save my details";
    }

    if (error) {
      show(`Could not save your details: ${error.message}`, "error");
      return;
    }

    show("Your details were saved.", "success");
  });
}
