import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { loadUmpireAvailability } from "./data";
import type { AvailabilityRow } from "./data";
import { formatDate, formatTime, localDateKey } from "./format";

// The times an umpire CAN umpire. An umpire uses it for themselves; an
// administrator uses the same screen for any umpire. Times are in the
// computer's time zone, like everywhere else.
export async function renderAvailabilityEditor(
  container: HTMLElement,
  options: { umpireId: string; own: boolean; name?: string }
): Promise<void> {
  const { umpireId, own } = options;
  let editingId: string | null = null;
  let rows: AvailabilityRow[] = [];

  container.innerHTML = `
    <section class="availability">
      ${own ? `<h2>My availability</h2>` : `<h3>Availability</h3>`}
      <p class="directory-description">Loading&hellip;</p>
    </section>
  `;

  const loaded = await loadUmpireAvailability(umpireId);
  if (loaded.error) {
    console.error("Availability failed:", loaded.error);
    container.innerHTML = `
      <section class="availability">
        ${own ? `<h2>My availability</h2>` : `<h3>Availability</h3>`}
        <p class="directory-empty">The availability could not be loaded. Refresh and try again.</p>
      </section>
    `;
    return;
  }
  rows = loaded.rows;

  container.innerHTML = `
    <section class="availability">
      ${own ? `<h2>My availability</h2>` : `<h3>Availability${options.name ? `: ${escapeHtml(options.name)}` : ""}</h3>`}
      <p class="directory-description">
        ${own
          ? "Add the dates and times you can umpire. Once you have added any, you are taken to be unavailable at other times. Schedulers see this when they assign games."
          : "The times this umpire has said they can umpire. You can add or change them for them. Once any are entered, the umpire is taken to be unavailable at other times."}
      </p>
      <div id="av-empty"></div>
      <div id="av-list"></div>

      <form id="av-form" class="create-umpire-form" novalidate>
        <h3 id="av-form-title">Add a time you can umpire</h3>

        <label for="av-date">Date</label>
        <input id="av-date" type="date" required />

        <label class="season-checkbox-label">
          <input id="av-allday" type="checkbox" /> All day
        </label>

        <div id="av-times">
          <label for="av-from">From</label>
          <input id="av-from" type="time" value="08:00" />
          <label for="av-to">To</label>
          <input id="av-to" type="time" value="20:00" />
        </div>

        <label for="av-note">Note (optional)</label>
        <input id="av-note" maxlength="200" placeholder="For example: after work" />

        <div class="account-actions">
          <button id="av-save" class="primary-button" type="submit">Add</button>
          <button id="av-cancel" class="secondary-button" type="button" hidden>Cancel</button>
        </div>

        <p id="av-message" class="message" role="status" aria-live="polite"></p>
      </form>
    </section>
  `;

  const get = <T extends HTMLElement>(id: string) => container.querySelector<T>(`#${id}`)!;
  const say = (text: string, kind: "error" | "success" = "error") => {
    const element = get<HTMLElement>("av-message");
    element.textContent = text;
    element.className = text ? `message ${kind}` : "message";
  };

  const midnight = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() === 0 && d.getMinutes() === 0;
  };
  const hhmm = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const describe = (row: AvailabilityRow): string => {
    const sameDay = localDateKey(row.starts_at) === localDateKey(row.ends_at);

    if (midnight(row.starts_at) && midnight(row.ends_at)) {
      const last = new Date(Date.parse(row.ends_at) - 60_000).toISOString();
      return localDateKey(row.starts_at) === localDateKey(last)
        ? `${formatDate(row.starts_at)} \u00b7 All day`
        : `${formatDate(row.starts_at)} to ${formatDate(last)} \u00b7 All day`;
    }

    return sameDay
      ? `${formatDate(row.starts_at)} \u00b7 ${formatTime(row.starts_at)} \u2013 ${formatTime(row.ends_at)}`
      : `${formatDate(row.starts_at)} ${formatTime(row.starts_at)} \u2013 ${formatDate(row.ends_at)} ${formatTime(row.ends_at)}`;
  };

  const drawList = () => {
    get<HTMLElement>("av-empty").innerHTML =
      rows.length === 0
        ? own
          ? `<p class="av-callout">You have not told us when you can umpire. Add the dates and times you are free, so schedulers know.</p>`
          : `<p class="directory-empty">Nothing entered yet. The assignment screen will show &ldquo;no availability entered&rdquo; for this umpire.</p>`
        : "";

    get<HTMLElement>("av-list").innerHTML = rows.length
      ? `<ul class="av-list">${rows.map((row) => `
          <li class="av-item">
            <span class="av-when">${escapeHtml(describe(row))}${row.notes ? ` <em class="av-note">${escapeHtml(row.notes)}</em>` : ""}</span>
            <span class="av-actions">
              <button type="button" class="secondary-button" data-av-edit="${escapeHtml(row.id)}">Change</button>
              <button type="button" class="secondary-button" data-av-delete="${escapeHtml(row.id)}">Remove</button>
            </span>
          </li>`).join("")}</ul>`
      : "";
  };

  const showTimes = () => {
    get<HTMLElement>("av-times").hidden = get<HTMLInputElement>("av-allday").checked;
  };

  const resetForm = () => {
    editingId = null;
    get<HTMLInputElement>("av-date").value = "";
    get<HTMLInputElement>("av-allday").checked = false;
    get<HTMLInputElement>("av-from").value = "08:00";
    get<HTMLInputElement>("av-to").value = "20:00";
    get<HTMLInputElement>("av-note").value = "";
    get<HTMLElement>("av-form-title").textContent = "Add a time you can umpire";
    get<HTMLButtonElement>("av-save").textContent = "Add";
    get<HTMLButtonElement>("av-cancel").hidden = true;
    showTimes();
  };

  const refresh = async () => {
    const again = await loadUmpireAvailability(umpireId);
    if (again.error) {
      say(`The list could not be refreshed. ${again.error}`);
      return;
    }
    rows = again.rows;
    drawList();
  };

  drawList();
  showTimes();
  get<HTMLInputElement>("av-allday").addEventListener("change", showTimes);

  get<HTMLElement>("av-cancel").addEventListener("click", () => {
    resetForm();
    say("");
  });

  get<HTMLElement>("av-list").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const edit = target.closest<HTMLButtonElement>("[data-av-edit]");
    if (edit) {
      const row = rows.find((item) => item.id === edit.dataset.avEdit);
      if (!row) return;

      editingId = row.id;
      const allDay = midnight(row.starts_at) && midnight(row.ends_at)
        && localDateKey(row.starts_at) === localDateKey(new Date(Date.parse(row.ends_at) - 60_000).toISOString());

      get<HTMLInputElement>("av-date").value = localDateKey(row.starts_at);
      get<HTMLInputElement>("av-allday").checked = allDay;
      get<HTMLInputElement>("av-from").value = hhmm(row.starts_at);
      get<HTMLInputElement>("av-to").value = hhmm(row.ends_at);
      get<HTMLInputElement>("av-note").value = row.notes ?? "";
      get<HTMLElement>("av-form-title").textContent = "Change this time";
      get<HTMLButtonElement>("av-save").textContent = "Save change";
      get<HTMLButtonElement>("av-cancel").hidden = false;
      showTimes();
      say("");
      get<HTMLElement>("av-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const remove = target.closest<HTMLButtonElement>("[data-av-delete]");
    if (remove) {
      remove.disabled = true;
      void (async () => {
        const { error } = await supabase.from("umpire_availability").delete().eq("id", remove.dataset.avDelete!);
        if (error) {
          remove.disabled = false;
          say(`Could not remove it. ${error.message}`);
          return;
        }
        if (editingId === remove.dataset.avDelete) resetForm();
        await refresh();
        say("Removed.", "success");
      })();
    }
  });

  get<HTMLFormElement>("av-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const date = get<HTMLInputElement>("av-date").value;
    const allDay = get<HTMLInputElement>("av-allday").checked;
    const from = get<HTMLInputElement>("av-from").value;
    const to = get<HTMLInputElement>("av-to").value;
    const note = get<HTMLInputElement>("av-note").value.trim();

    if (!date) return say("Choose a date.");

    let start: Date;
    let end: Date;

    if (allDay) {
      start = new Date(`${date}T00:00:00`);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else {
      if (!from || !to) return say("Enter the times you can umpire from and to, or tick All day.");
      start = new Date(`${date}T${from}:00`);
      end = new Date(`${date}T${to}:00`);
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return say("That date or time is not valid.");
    if (end <= start) return say("The end time must be after the start time. For the whole day, tick All day.");
    if (end.getTime() <= Date.now()) return say("That time has already passed.");

    const twoYears = new Date();
    twoYears.setFullYear(twoYears.getFullYear() + 2);
    if (start > twoYears) return say("Choose a date within the next two years.");

    const values = { starts_at: start.toISOString(), ends_at: end.toISOString(), notes: note || null };
    const saveButton = get<HTMLButtonElement>("av-save");
    saveButton.disabled = true;

    void (async () => {
      const { error } = editingId
        ? await supabase.from("umpire_availability").update(values).eq("id", editingId)
        : await supabase.from("umpire_availability").insert({ umpire_id: umpireId, ...values });

      saveButton.disabled = false;

      if (error) {
        say(`Could not save it. ${error.message}`);
        return;
      }

      const wasEditing = editingId !== null;
      resetForm();
      await refresh();
      say(wasEditing ? "Changed." : "Added.", "success");
    })();
  });
}
