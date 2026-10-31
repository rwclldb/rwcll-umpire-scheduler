import { supabase } from "./supabase";
import { escapeHtml } from "./ui";
import { idleNoticeText, idleStatus, parseIdleMinutes } from "./idle-logic";

// Signs a person out after a period of no activity, with a warning first.
//
// The time allowed is a setting in the database (see app_settings), with one
// value for administrators and one for umpire-only accounts, so it can be
// changed without a new release. "Activity" is any click, key press, touch or
// scroll, in any tab of this browser. This always uses the REAL time (never the
// demo clock's pretend time).

const ACTIVITY_KEY = "rwcll-last-activity-ms";
const NOTICE_KEY = "rwcll-idle-signout-notice";
const EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "wheel", "mousemove"] as const;

let stopCurrent: (() => void) | null = null;
let generation = 0;
let remembered = Date.now();

function lastActivity(): number {
  try {
    const stored = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(stored) && stored > 0 ? Math.max(stored, remembered) : remembered;
  } catch {
    return remembered;
  }
}

function recordActivity(): void {
  remembered = Date.now();
  try {
    localStorage.setItem(ACTIVITY_KEY, String(remembered));
  } catch {
    // (a browser that will not store it just uses this page's own record)
  }
}

async function readLimitMinutes(isAdministrator: boolean): Promise<number> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", isAdministrator ? "idle_logout_minutes" : "idle_logout_minutes_umpire")
    .maybeSingle();

  // (if it cannot be read, the safe default of 30 minutes applies)
  return error ? parseIdleMinutes(null) : parseIdleMinutes((data as { value?: string } | null)?.value);
}

export function stopIdleLogout(): void {
  generation += 1;
  stopCurrent?.();
  stopCurrent = null;
}

// A message for the sign-in page, once, after an automatic sign-out.
export function takeIdleNotice(): string | null {
  try {
    const text = localStorage.getItem(NOTICE_KEY);
    localStorage.removeItem(NOTICE_KEY);
    return text;
  } catch {
    return null;
  }
}

export async function startIdleLogout(options: { isAdministrator: boolean; signOut: () => void }): Promise<void> {
  stopIdleLogout();
  const mine = generation;

  const minutes = await readLimitMinutes(options.isAdministrator);
  if (mine !== generation || minutes === 0) return;   // (signed out meanwhile, or switched off)

  const limitMs = minutes * 60_000;
  recordActivity();

  let lastWrite = Date.now();
  const onActivity = () => {
    if (Date.now() - lastWrite < 1000) return;   // (at most once a second)
    lastWrite = Date.now();
    recordActivity();
  };
  EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true, capture: true }));

  const warning = document.createElement("div");
  warning.id = "idle-warning";
  warning.className = "idle-warning";
  warning.setAttribute("role", "alertdialog");
  warning.setAttribute("aria-labelledby", "idle-warning-title");
  warning.setAttribute("aria-describedby", "idle-warning-text");
  warning.hidden = true;
  warning.innerHTML = `
    <p id="idle-warning-title" class="idle-warning-title">Are you still there?</p>
    <p id="idle-warning-text">
      You will be signed out in <strong id="idle-seconds">60</strong> seconds because the app has not been used
      for ${escapeHtml(String(minutes))} ${minutes === 1 ? "minute" : "minutes"}.
    </p>
    <button type="button" id="idle-stay" class="primary-button">Stay signed in</button>
  `;
  document.body.appendChild(warning);

  warning.querySelector("#idle-stay")!.addEventListener("click", () => {
    lastWrite = Date.now();
    recordActivity();
    warning.hidden = true;
  });

  const check = () => {
    const status = idleStatus(Date.now() - lastActivity(), limitMs);

    if (status.kind === "expired") {
      try {
        localStorage.setItem(NOTICE_KEY, idleNoticeText(minutes));
      } catch {
        // (no way to leave a message; the person is still signed out)
      }
      stopIdleLogout();
      options.signOut();
      return;
    }

    if (status.kind === "warning") {
      const wasHidden = warning.hidden;
      warning.hidden = false;
      warning.querySelector("#idle-seconds")!.textContent = String(status.secondsLeft);
      if (wasHidden) warning.querySelector<HTMLButtonElement>("#idle-stay")!.focus();
    } else {
      warning.hidden = true;
    }
  };

  const timer = window.setInterval(check, 1000);
  const onVisible = () => { if (document.visibilityState === "visible") check(); };
  document.addEventListener("visibilitychange", onVisible);

  stopCurrent = () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    EVENTS.forEach((name) => window.removeEventListener(name, onActivity, { capture: true } as EventListenerOptions));
    warning.remove();
  };
}
