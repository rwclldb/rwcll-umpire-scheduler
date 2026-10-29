import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { dateKey, describePattern, expandPatterns, shortDate } from "./availability";
import type { PatternRow } from "./availability";
import { daySummaries, monthGridHtml } from "./availability-calendar";
import { loadSeasonOptions, loadUmpireAvailability, loadUmpirePatterns } from "./data";
import type { AvailabilityRow, AvailabilitySeason } from "./data";
import { formatDate, formatTime, localDateKey } from "./format";
import { appNow, appNowMs } from "../clock";

type EntryType = "one" | "repeat" | "cannot";

const TITLES: Record<EntryType, string> = {
  one: "Add a time you can umpire",
  repeat: "Add a repeating time you can umpire",
  cannot: "Add a date or time you can't umpire",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// When an umpire can umpire (and when they cannot). An umpire uses it for
// themselves; an administrator uses the same screen for any umpire. They can
// enter single times, repeating times (which end with their season), and dates
// they cannot umpire, and see them as a list and as a month calendar. Times are
// in the computer's time zone, like everywhere else.
export async function renderAvailabilityEditor(
  container: HTMLElement,
  options: { umpireId: string; own: boolean; name?: string }
): Promise<void> {
  const { umpireId, own } = options;
  let editing: { type: EntryType; id: string } | null = null;
  let rows: AvailabilityRow[] = [];
  let patterns: PatternRow[] = [];
  let seasons: AvailabilitySeason[] = [];
  const now = appNow();
  let month = { year: now.getFullYear(), month: now.getMonth() };

  const heading = (text = "") =>
    own ? `<h2>My availability</h2>` : `<h3>Availability${text ? `: ${escapeHtml(text)}` : ""}</h3>`;

  container.innerHTML = `
    <section class="availability">
      ${heading()}
      <p class="directory-description">Loading&hellip;</p>
    </section>
  `;

  const [loadedRows, loadedPatterns, loadedSeasons] = await Promise.all([
    loadUmpireAvailability(umpireId),
    loadUmpirePatterns(umpireId),
    loadSeasonOptions(),
  ]);

  if (loadedRows.error || loadedPatterns.error) {
    console.error("Availability failed:", loadedRows.error ?? loadedPatterns.error);
    container.innerHTML = `
      <section class="availability">
        ${heading()}
        <p class="directory-empty">The availability could not be loaded. Refresh and try again.</p>
      </section>
    `;
    return;
  }

  rows = loadedRows.rows;
  patterns = loadedPatterns.rows;
  seasons = loadedSeasons.seasons;

  container.innerHTML = `
    <section class="availability">
      ${heading(options.name)}
      <p class="directory-description">
        ${own
          ? "Tell schedulers when you can umpire, as single dates, as repeating times, or both. Once you have added any, you are taken to be unavailable at other times. Dates you cannot umpire always win."
          : "The times this umpire can umpire, and the dates they cannot. You can add or change them for them. Once any times are entered, the umpire is taken to be unavailable at other times. Dates they cannot umpire always win."}
      </p>
      <div id="av-empty"></div>
      <div id="av-lists"></div>
      <div id="av-calendar"></div>

      <form id="av-form" class="create-umpire-form" novalidate>
        <h3 id="av-form-title">${TITLES.one}</h3>

        <label for="av-type">What do you want to add?</label>
        <select id="av-type">
          <option value="one">A time I can umpire (one date)</option>
          <option value="repeat">A repeating time I can umpire</option>
          <option value="cannot">A date or time I can't umpire</option>
        </select>

        <div id="av-repeat-fields">
          <fieldset class="av-days">
            <legend>Days of the week</legend>
            <div class="av-day-row">
              ${DAY_ORDER.map((day) => `
                <label class="av-day"><input type="checkbox" name="av-day" value="${day}" /> ${DAY_NAMES[day]}</label>`).join("")}
            </div>
            <div class="av-shortcuts">
              <button type="button" class="secondary-button" data-av-days="1,2,3,4,5">Mon&ndash;Fri</button>
              <button type="button" class="secondary-button" data-av-days="6,0">Sat, Sun</button>
              <button type="button" class="secondary-button" data-av-days="">Clear</button>
            </div>
          </fieldset>

          <label for="av-start-on">Starting</label>
          <input id="av-start-on" type="date" />

          <label for="av-season">Season</label>
          <select id="av-season"></select>
          <p id="av-season-hint" class="season-dates"></p>
        </div>

        <div id="av-date-fields">
          <label for="av-date">Date</label>
          <input id="av-date" type="date" required />
        </div>

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

  const todayKey = () => dateKey(appNow());
  const seasonById = (id: string) => seasons.find((season) => season.id === id);

  // Seasons a repeating time can be for: they have an end date that has not passed.
  const eligibleSeasons = () =>
    seasons
      .filter((season) => season.ends_on && season.ends_on >= todayKey())
      .sort((a, b) => Number(b.is_active) - Number(a.is_active));

  const midnight = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() === 0 && d.getMinutes() === 0;
  };
  const hhmm = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const isAllDay = (row: AvailabilityRow) =>
    midnight(row.starts_at) && midnight(row.ends_at)
    && localDateKey(row.starts_at) === localDateKey(new Date(Date.parse(row.ends_at) - 60_000).toISOString());

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

  // A repeating time still counts while its season has not ended.
  const livePatterns = () =>
    patterns.filter((pattern) => {
      const end = seasonById(pattern.season_id)?.ends_on;
      return Boolean(end) && (end as string) >= todayKey();
    });

  const drawLists = () => {
    const oneOff = rows.filter((row) => row.kind !== "unavailable");
    const cannot = rows.filter((row) => row.kind === "unavailable");
    const repeating = livePatterns();

    get<HTMLElement>("av-empty").innerHTML =
      repeating.length === 0 && oneOff.length === 0
        ? own
          ? `<p class="av-callout">You have not told us when you can umpire. Add the dates and times you are free, so schedulers know.</p>`
          : `<p class="directory-empty">Nothing entered yet. The assignment screen will show &ldquo;no availability entered&rdquo; for this umpire.</p>`
        : "";

    const section = (title: string, items: { id: string; type: EntryType; text: string; note: string | null }[]) =>
      items.length === 0
        ? ""
        : `<h3 class="av-sub">${title}</h3>
           <ul class="av-list">${items.map((item) => `
             <li class="av-item">
               <span class="av-when">${escapeHtml(item.text)}${item.note ? ` <em class="av-note">${escapeHtml(item.note)}</em>` : ""}</span>
               <span class="av-actions">
                 <button type="button" class="secondary-button" data-av-edit="${escapeHtml(item.id)}" data-av-type="${item.type}">Change</button>
                 <button type="button" class="secondary-button" data-av-delete="${escapeHtml(item.id)}" data-av-type="${item.type}">Remove</button>
               </span>
             </li>`).join("")}</ul>`;

    get<HTMLElement>("av-lists").innerHTML =
      section("Repeating times", repeating.map((pattern) => ({
        id: pattern.id,
        type: "repeat" as const,
        text: describePattern(pattern, seasonById(pattern.season_id)),
        note: pattern.notes,
      })))
      + section("Times I can umpire", oneOff.map((row) => ({ id: row.id, type: "one" as const, text: describe(row), note: row.notes })))
      + section("Dates and times I can't umpire", cannot.map((row) => ({ id: row.id, type: "cannot" as const, text: describe(row), note: row.notes })));
  };

  const drawCalendar = () => {
    const seasonEnds = new Map(seasons.map((season) => [season.id, season.ends_on]));
    const windows = [
      ...rows.filter((row) => row.kind !== "unavailable").map((row) => ({ starts_at: row.starts_at, ends_at: row.ends_at })),
      ...expandPatterns(patterns, seasonEnds),
    ];
    const exceptions = rows.filter((row) => row.kind === "unavailable").map((row) => ({ starts_at: row.starts_at, ends_at: row.ends_at }));

    get<HTMLElement>("av-calendar").innerHTML = monthGridHtml(
      month.year,
      month.month,
      daySummaries(month.year, month.month, windows, exceptions)
    );
  };

  const drawSeasons = () => {
    const eligible = eligibleSeasons();
    const select = get<HTMLSelectElement>("av-season");
    const keep = select.value;

    select.innerHTML = eligible.length
      ? eligible.map((season) => `<option value="${escapeHtml(season.id)}">${escapeHtml(season.name)} (ends ${escapeHtml(shortDate(season.ends_on as string))})</option>`).join("")
      : `<option value="">No season with an end date</option>`;
    select.disabled = eligible.length === 0;
    if (keep && eligible.some((season) => season.id === keep)) select.value = keep;

    showSeasonHint();
  };

  function showSeasonHint() {
    const season = seasonById(get<HTMLSelectElement>("av-season").value);
    get<HTMLElement>("av-season-hint").textContent = season?.ends_on
      ? `It ends automatically on ${shortDate(season.ends_on)}, the end of ${season.name}.`
      : "A repeating time needs a season with an end date. An administrator can set one in League Setup.";
  }

  const currentType = (): EntryType => editing?.type ?? (get<HTMLSelectElement>("av-type").value as EntryType);

  const showFields = () => {
    const type = currentType();
    get<HTMLElement>("av-repeat-fields").hidden = type !== "repeat";
    get<HTMLElement>("av-date-fields").hidden = type === "repeat";
    get<HTMLElement>("av-times").hidden = get<HTMLInputElement>("av-allday").checked;
    if (!editing) get<HTMLElement>("av-form-title").textContent = TITLES[type];
  };

  const resetForm = () => {
    editing = null;
    get<HTMLSelectElement>("av-type").disabled = false;
    get<HTMLInputElement>("av-date").value = "";
    get<HTMLInputElement>("av-start-on").value = "";
    get<HTMLInputElement>("av-allday").checked = false;
    get<HTMLInputElement>("av-from").value = "08:00";
    get<HTMLInputElement>("av-to").value = "20:00";
    get<HTMLInputElement>("av-note").value = "";
    container.querySelectorAll<HTMLInputElement>("input[name='av-day']").forEach((box) => { box.checked = false; });
    get<HTMLButtonElement>("av-save").textContent = "Add";
    get<HTMLButtonElement>("av-cancel").hidden = true;
    showFields();
  };

  const refresh = async () => {
    const [again, againPatterns] = await Promise.all([loadUmpireAvailability(umpireId), loadUmpirePatterns(umpireId)]);
    if (again.error || againPatterns.error) {
      say(`The list could not be refreshed. ${again.error ?? againPatterns.error}`);
      return;
    }
    rows = again.rows;
    patterns = againPatterns.rows;
    drawLists();
    drawCalendar();
  };

  drawLists();
  drawCalendar();
  drawSeasons();
  showFields();

  get<HTMLSelectElement>("av-type").addEventListener("change", () => { say(""); showFields(); });
  get<HTMLInputElement>("av-allday").addEventListener("change", showFields);
  get<HTMLSelectElement>("av-season").addEventListener("change", showSeasonHint);

  get<HTMLElement>("av-cancel").addEventListener("click", () => {
    resetForm();
    say("");
  });

  // ---- buttons in the page: change, remove, the calendar, the day shortcuts
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const shortcut = target.closest<HTMLButtonElement>("[data-av-days]");
    if (shortcut) {
      const wanted = new Set((shortcut.dataset.avDays ?? "").split(",").filter(Boolean).map(Number));
      container.querySelectorAll<HTMLInputElement>("input[name='av-day']").forEach((box) => {
        box.checked = wanted.has(Number(box.value));
      });
      return;
    }

    const nav = target.closest<HTMLButtonElement>("[data-cal-nav]");
    if (nav) {
      const moved = new Date(month.year, month.month + Number(nav.dataset.calNav), 1);
      month = { year: moved.getFullYear(), month: moved.getMonth() };
      drawCalendar();
      return;
    }

    const dayButton = target.closest<HTMLButtonElement>("[data-cal-date]");
    if (dayButton) {
      // pressing a day picks it in the form
      get<HTMLInputElement>(currentType() === "repeat" ? "av-start-on" : "av-date").value = dayButton.dataset.calDate ?? "";
      say("");
      return;
    }

    const edit = target.closest<HTMLButtonElement>("[data-av-edit]");
    if (edit) {
      const type = edit.dataset.avType as EntryType;
      const id = edit.dataset.avEdit as string;

      if (type === "repeat") {
        const pattern = patterns.find((item) => item.id === id);
        if (!pattern) return;

        editing = { type, id };
        get<HTMLSelectElement>("av-type").value = "repeat";
        container.querySelectorAll<HTMLInputElement>("input[name='av-day']").forEach((box) => {
          box.checked = pattern.weekdays.includes(Number(box.value));
        });
        const allDay = /^00:00/.test(pattern.start_time) && /^23:59/.test(pattern.end_time);
        get<HTMLInputElement>("av-allday").checked = allDay;
        get<HTMLInputElement>("av-from").value = pattern.start_time.slice(0, 5);
        get<HTMLInputElement>("av-to").value = pattern.end_time.slice(0, 5);
        get<HTMLInputElement>("av-start-on").value = pattern.starts_on;
        get<HTMLInputElement>("av-note").value = pattern.notes ?? "";
        get<HTMLSelectElement>("av-season").value = pattern.season_id;
        showSeasonHint();
      } else {
        const row = rows.find((item) => item.id === id);
        if (!row) return;

        editing = { type, id };
        get<HTMLSelectElement>("av-type").value = type;
        get<HTMLInputElement>("av-date").value = localDateKey(row.starts_at);
        get<HTMLInputElement>("av-allday").checked = isAllDay(row);
        get<HTMLInputElement>("av-from").value = hhmm(row.starts_at);
        get<HTMLInputElement>("av-to").value = hhmm(row.ends_at);
        get<HTMLInputElement>("av-note").value = row.notes ?? "";
      }

      get<HTMLSelectElement>("av-type").disabled = true;
      get<HTMLElement>("av-form-title").textContent = "Change this time";
      get<HTMLButtonElement>("av-save").textContent = "Save change";
      get<HTMLButtonElement>("av-cancel").hidden = false;
      showFields();
      say("");
      get<HTMLElement>("av-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    const remove = target.closest<HTMLButtonElement>("[data-av-delete]");
    if (remove) {
      remove.disabled = true;
      const table = remove.dataset.avType === "repeat" ? "umpire_availability_patterns" : "umpire_availability";

      void (async () => {
        const { error } = await supabase.from(table).delete().eq("id", remove.dataset.avDelete!);
        if (error) {
          remove.disabled = false;
          say(`Could not remove it. ${error.message}`);
          return;
        }
        if (editing?.id === remove.dataset.avDelete) resetForm();
        await refresh();
        say("Removed.", "success");
      })();
    }
  });

  // ---- saving
  const finish = async (error: { message: string } | null) => {
    get<HTMLButtonElement>("av-save").disabled = false;

    if (error) {
      say(`Could not save it. ${error.message}`);
      return;
    }

    const wasEditing = editing !== null;
    resetForm();
    await refresh();
    say(wasEditing ? "Changed." : "Added.", "success");
  };

  get<HTMLFormElement>("av-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const type = currentType();
    const allDay = get<HTMLInputElement>("av-allday").checked;
    const from = get<HTMLInputElement>("av-from").value;
    const to = get<HTMLInputElement>("av-to").value;
    const note = get<HTMLInputElement>("av-note").value.trim();

    if (!allDay && (!from || !to)) {
      return say("Enter the times from and to, or tick All day.");
    }
    if (!allDay && to <= from) {
      return say("The end time must be after the start time. For the whole day, tick All day.");
    }

    const saveButton = get<HTMLButtonElement>("av-save");

    // ------------------------------------------------ a repeating time
    if (type === "repeat") {
      const days = [...container.querySelectorAll<HTMLInputElement>("input[name='av-day']:checked")]
        .map((box) => Number(box.value))
        .sort((a, b) => a - b);
      if (days.length === 0) return say("Choose at least one day of the week.");

      const season = seasonById(get<HTMLSelectElement>("av-season").value);
      if (!season || !season.ends_on) {
        return say("A repeating time needs a season with an end date. An administrator can set one in League Setup.");
      }

      const startsOn = get<HTMLInputElement>("av-start-on").value || todayKey();
      if (!editing && startsOn < todayKey()) return say("The start date cannot be in the past.");
      if (startsOn > season.ends_on) return say(`That is after the end of the season (${shortDate(season.ends_on)}).`);

      const values = {
        season_id: season.id,
        weekdays: days,
        start_time: allDay ? "00:00" : from,
        end_time: allDay ? "23:59" : to,
        starts_on: startsOn,
        notes: note || null,
      };

      saveButton.disabled = true;
      void (async () => {
        const { error } = editing
          ? await supabase.from("umpire_availability_patterns").update(values).eq("id", editing.id)
          : await supabase.from("umpire_availability_patterns").insert({ umpire_id: umpireId, ...values });
        await finish(error);
      })();
      return;
    }

    // ------------------------------------------ one date: a time they can, or cannot
    const date = get<HTMLInputElement>("av-date").value;
    if (!date) return say("Choose a date.");

    let start: Date;
    let end: Date;

    if (allDay) {
      start = new Date(`${date}T00:00:00`);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else {
      start = new Date(`${date}T${from}:00`);
      end = new Date(`${date}T${to}:00`);
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return say("That date or time is not valid.");
    if (end <= start) return say("The end time must be after the start time. For the whole day, tick All day.");
    if (end.getTime() <= appNowMs()) return say("That time has already passed.");

    const twoYears = appNow();
    twoYears.setFullYear(twoYears.getFullYear() + 2);
    if (start > twoYears) return say("Choose a date within the next two years.");

    const values = {
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      notes: note || null,
      kind: type === "cannot" ? "unavailable" : "available",
    };

    saveButton.disabled = true;
    void (async () => {
      const { error } = editing
        ? await supabase.from("umpire_availability").update(values).eq("id", editing.id)
        : await supabase.from("umpire_availability").insert({ umpire_id: umpireId, ...values });
      await finish(error);
    })();
  });
}
