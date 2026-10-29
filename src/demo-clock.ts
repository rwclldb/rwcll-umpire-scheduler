import { supabase } from "./supabase";
import { appNow, clearDemoClock, demoClockActive, setDemoClock } from "./clock";
import { escapeHtml } from "./ui";

// The "Demo clock": a small control, for testing and demonstrations, that sets a
// PRETEND time so a Saturday game can be tried on a Thursday.
//
// It is shown only when the database has the demo clock switched on (the setting
// demo_clock_allowed, which can only be changed in the database, and which is
// off unless it was deliberately turned on, as for the test database).

async function demoClockAllowed(): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "demo_clock_allowed")
    .maybeSingle();

  return !error && (data as { value?: string } | null)?.value === "true";
}

const when = (date: Date) =>
  date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\u202f/g, " ");

const two = (n: number) => String(n).padStart(2, "0");
const dateValue = (date: Date) => `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
const timeValue = (date: Date) => `${two(date.getHours())}:${two(date.getMinutes())}`;

let ticker: number | undefined;

export function removeDemoClock(): void {
  document.getElementById("demo-clock")?.remove();
  if (ticker !== undefined) window.clearInterval(ticker);
  ticker = undefined;
}

export async function mountDemoClock(): Promise<void> {
  removeDemoClock();

  if (!(await demoClockAllowed())) {
    // a pretend time left over in this browser must not apply where it is not allowed
    if (demoClockActive()) {
      clearDemoClock();
      window.location.reload();
    }
    return;
  }

  const active = demoClockActive();
  const now = appNow();

  const box = document.createElement("div");
  box.id = "demo-clock";
  box.className = `demo-clock${active ? " demo-clock-on" : ""}`;
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", "Demo clock");
  box.innerHTML = `
    <div class="demo-clock-row">
      <span class="demo-clock-text">${active
        ? `Pretend time: <strong id="demo-clock-now">${escapeHtml(when(now))}</strong> (not real)`
        : "Demo clock"}</span>
      <button type="button" id="demo-clock-open" class="secondary-button">${active ? "Change" : "Set pretend time"}</button>
      ${active ? `<button type="button" id="demo-clock-reset" class="secondary-button">Use real time</button>` : ""}
    </div>
    <form id="demo-clock-form" class="demo-clock-form" hidden>
      <label>Date <input id="demo-clock-date" type="date" required value="${dateValue(now)}" /></label>
      <label>Time <input id="demo-clock-time" type="time" required value="${timeValue(now)}" /></label>
      <button type="submit" class="primary-button">Set</button>
      <button type="button" id="demo-clock-cancel" class="secondary-button">Cancel</button>
      <p class="demo-clock-help">The app will behave as if it were this time, and the clock keeps ticking from here. It applies to this browser only.</p>
    </form>`;
  document.body.appendChild(box);

  const form = box.querySelector<HTMLFormElement>("#demo-clock-form")!;

  box.querySelector("#demo-clock-open")?.addEventListener("click", () => {
    form.hidden = !form.hidden;
  });
  box.querySelector("#demo-clock-cancel")?.addEventListener("click", () => {
    form.hidden = true;
  });

  box.querySelector("#demo-clock-reset")?.addEventListener("click", () => {
    clearDemoClock();
    window.location.reload();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const date = box.querySelector<HTMLInputElement>("#demo-clock-date")!.value;
    const time = box.querySelector<HTMLInputElement>("#demo-clock-time")!.value;
    const chosen = new Date(`${date}T${time}:00`);
    if (Number.isNaN(chosen.getTime())) return;

    setDemoClock(chosen);
    window.location.reload();   // so every screen starts again from the new time
  });

  // keep the shown time moving
  if (active) {
    ticker = window.setInterval(() => {
      const element = document.getElementById("demo-clock-now");
      if (!element) return removeDemoClock();
      element.textContent = when(appNow());
    }, 15_000);
  }
}
