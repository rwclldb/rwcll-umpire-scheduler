import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import type { GamesContext } from "./types";

// Games > Master calendar sync (scheduling administrators).
//
// The sync itself runs on the server twice a day (supabase/functions/sync-calendar). This panel is
// where a person sets it up, matches the names it cannot match by itself, sees what needs them
// (games no longer on the master calendar, games held back), presses "Sync now", and reads the log.

type Settings = {
  feed_url: string | null;
  season_id: string | null;
  enabled: boolean;
  time_zone: string;
  updated_at: string;
  updated_by_name: string | null;
};

type NameRow = {
  kind: "team" | "field";
  key: string;
  name: string;
  games: number;
  matched_to: string | null;
  how: string | null;
  address?: string;
  guess_division_id?: string | null;
};

type Listed = { title: string; when: string };
type Details = {
  counts?: Record<string, number>;
  added?: Listed[];
  changed?: (Listed & { changes: string[]; assigned: number; how: string })[];
  held?: (Listed & { reasons: string[] })[];
  not_in_feed?: (Listed & { id: string; assigned: number })[];
  skipped?: (Listed & { reason: string })[];
  names?: NameRow[];
  other_event_titles?: string[];
  failed?: (Listed & { error: string })[];
};

type Run = {
  id: string;
  started_at: string;
  trigger: "scheduled" | "manual";
  triggered_by_name: string | null;
  season_id: string | null;
  status: "ok" | "failed";
  message: string | null;
  added: number;
  changed: number;
  unchanged: number;
  held: number;
  not_in_feed: number;
  umpires_told: number;
  failed_games: number;
  details: Details;
};

type SavedName = { id: string; kind: "team" | "field"; feed_key: string; season_id: string | null };

const ZONES = [
  "America/Los_Angeles", "America/Denver", "America/Phoenix", "America/Chicago",
  "America/New_York", "America/Anchorage", "Pacific/Honolulu",
];

const NEW_TEAM = "__new_team__";
const NEW_FIELD = "__new_field__";
const OUTSIDE = "__outside__";
const NOT_TRACKED = "__not_tracked__";

const HOW_TEXT: Record<string, string> = {
  saved: "matched by a person",
  "same name": "same name",
  address: "same street address",
  "start of name": "start of the name",
  "outside team": "not one of ours, so kept as a name",
};

// The same as the sync's own norm(): lower case, letters and digits only.
const keyOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function whenText(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function runSummary(run: Run): string {
  if (run.status === "failed") return `Failed: ${run.message ?? "unknown problem"}`;
  const parts = [
    `${run.added} added`,
    `${run.changed} changed`,
    run.umpires_told ? `${plural(run.umpires_told, "umpire")} told` : "",
    run.held ? `${run.held} held` : "",
    run.not_in_feed ? `${run.not_in_feed} not on the calendar` : "",
    run.failed_games ? `${run.failed_games} could not be saved` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

// ------------------------------------------------------------------ the line at the top of Games

// "Master calendar: synced Thu, Nov 12, 6:00 AM. 2 changed. 3 things need a person." (or nothing,
// before the sync has ever been set up). Errors are quiet: the Games tab works without it.
export async function syncStatusHtml(): Promise<string> {
  const [settings, runs] = await Promise.all([
    supabase.from("calendar_feed_settings").select("enabled, feed_url").maybeSingle(),
    supabase.from("calendar_sync_runs").select("started_at, status, message, added, changed, held, not_in_feed, details")
      .order("started_at", { ascending: false }).limit(1),
  ]);

  if (settings.error || !settings.data) return "";
  const last = (runs.data ?? [])[0] as Run | undefined;

  if (!settings.data.enabled) {
    return settings.data.feed_url || last
      ? `<p class="imp-warn">The master calendar sync is <strong>switched off</strong>. Changes on the master calendar are not copied here.</p>`
      : "";
  }
  if (!last) return `<p class="directory-description">Master calendar sync is on. It has not run yet.</p>`;

  if (last.status === "failed") {
    return `<p class="imp-warn"><strong>The last master calendar sync failed</strong> (${escapeHtml(whenText(last.started_at))}): ${escapeHtml(last.message ?? "")}</p>`;
  }

  const unmatched = (last.details.names ?? []).filter((row) => row.matched_to === null).length;
  const attention = last.held + last.not_in_feed + unmatched;
  return `
    <p class="${attention ? "imp-warn" : "directory-description"}">
      Master calendar: synced ${escapeHtml(whenText(last.started_at))}
      (${last.added} added, ${last.changed} changed).
      ${attention ? `<strong>${plural(attention, "thing")} need${attention === 1 ? "s" : ""} a person</strong>: open <em>Master calendar sync</em>.` : ""}
    </p>`;
}

// ------------------------------------------------------------------ the panel

export type SyncPanelOptions = {
  context: GamesContext;
  onClose: () => void;
  // something was saved that the rest of the Games tab should see (new teams or fields, synced games)
  onChanged: (message: string) => void;
};

export async function renderCalendarSync(container: HTMLElement, options: SyncPanelOptions): Promise<void> {
  const { context } = options;

  container.innerHTML = `
    <section class="importer" id="calendar-sync">
      <h3>Master calendar sync</h3>
      <p class="directory-description">Loading&hellip;</p>
    </section>`;

  const [settingsAnswer, runsAnswer, namesAnswer] = await Promise.all([
    supabase.from("calendar_feed_settings").select("feed_url, season_id, enabled, time_zone, updated_at, updated_by_name").maybeSingle(),
    supabase.from("calendar_sync_runs").select("*").order("started_at", { ascending: false }).limit(20),
    supabase.from("calendar_feed_names").select("id, kind, feed_key, season_id"),
  ]);

  if (!container.isConnected) return;

  const loadError = settingsAnswer.error ?? runsAnswer.error ?? namesAnswer.error;
  if (loadError || !settingsAnswer.data) {
    container.innerHTML = `
      <section class="importer" id="calendar-sync">
        <h3>Master calendar sync</h3>
        <p class="message error">Could not load the sync settings${loadError ? `: ${escapeHtml(loadError.message)}` : ""}. Has the latest database update been applied?</p>
        <div class="account-actions"><button id="cs-close" class="secondary-button" type="button">Close</button></div>
      </section>`;
    container.querySelector("#cs-close")?.addEventListener("click", options.onClose);
    return;
  }

  const settings = settingsAnswer.data as Settings;
  const runs = (runsAnswer.data ?? []) as Run[];
  const savedNames = (namesAnswer.data ?? []) as SavedName[];
  const lastOk = runs.find((run) => run.status === "ok");
  const seasonId = settings.season_id ?? "";

  // games flagged as "not on the calendar" that someone has canceled since: no longer worth showing
  const notInFeed = lastOk?.details.not_in_feed ?? [];
  let stillOpen = new Set(notInFeed.map((game) => game.id));
  if (notInFeed.length > 0) {
    const { data } = await supabase.from("games").select("id, status").in("id", notInFeed.map((game) => game.id));
    if (data) stillOpen = new Set(data.filter((row) => row.status !== "canceled").map((row) => row.id as string));
  }
  if (!container.isConnected) return;

  const zones = ZONES.includes(settings.time_zone) ? ZONES : [settings.time_zone, ...ZONES];
  const seasonTeams = context.teams.filter((team) => team.season_id === seasonId);
  const divisionName = new Map(context.divisions.map((division) => [division.id, division.name]));
  const names = lastOk?.details.names ?? [];
  const savedFor = (row: NameRow) =>
    savedNames.find((saved) => saved.kind === row.kind && saved.feed_key === row.key && (row.kind === "field" || saved.season_id === seasonId));
  // names the last sync could not match; the ones matched since then are used by the next sync
  const unmatched = names.filter((row) => row.matched_to === null && !savedFor(row));
  const matchedSince = names.filter((row) => row.matched_to === null && savedFor(row));

  // ---- one name's choice box
  const choiceHtml = (row: NameRow, index: number) => {
    if (row.kind === "team") {
      const guess = row.guess_division_id ? divisionName.get(row.guess_division_id) : null;
      const byDivision = [...seasonTeams].sort((a, b) =>
        (divisionName.get(a.division_id ?? "") ?? "").localeCompare(divisionName.get(b.division_id ?? "") ?? "") || a.name.localeCompare(b.name));
      return `
        <select data-name-index="${index}" aria-label="Which team is ${escapeHtml(row.name)}">
          <option value="">Choose&hellip;</option>
          ${guess ? `<option value="${NEW_TEAM}">Create a new team "${escapeHtml(row.name)}" in ${escapeHtml(guess)}</option>` : ""}
          <option value="${OUTSIDE}">Outside team (name only)</option>
          <option value="${NOT_TRACKED}">Not tracked: skip its games (e.g. Tee Ball)</option>
          ${byDivision.map((team) => `
            <option value="${escapeHtml(team.id)}">${escapeHtml(team.name)}${team.division_id ? ` (${escapeHtml(divisionName.get(team.division_id) ?? "")})` : ""}</option>`).join("")}
        </select>`;
    }
    const place = row.name.split(">")[0].trim();
    return `
      <select data-name-index="${index}" aria-label="Which field is ${escapeHtml(row.name)}">
        <option value="">Choose&hellip;</option>
        <option value="${NEW_FIELD}">Create a new field "${escapeHtml(place)}"</option>
        ${context.locations.map((field) => `
          <option value="${escapeHtml(field.id)}">${escapeHtml(field.name)}${field.is_active ? "" : " (inactive)"}</option>`).join("")}
      </select>`;
  };

  const nameTable = (rows: NameRow[], all: boolean) => `
    <div class="table-scroll">
      <table class="umpire-table imp-table">
        <thead><tr><th>On the master calendar</th><th>Games</th><th>${all ? "Matched to" : "Is"}</th><th></th></tr></thead>
        <tbody>
          ${rows.map((row) => {
            const index = names.indexOf(row);
            const saved = savedFor(row);
            return `
              <tr>
                <td>${row.kind === "team" ? "Team" : "Field"}: <strong>${escapeHtml(row.name)}</strong>
                  ${row.address ? `<br /><small>${escapeHtml(row.address)}</small>` : ""}</td>
                <td>${row.games}</td>
                <td>
                  ${all && row.matched_to ? `${escapeHtml(row.matched_to)} <small>(${escapeHtml(HOW_TEXT[row.how ?? ""] ?? row.how ?? "")})</small><br />` : ""}
                  ${choiceHtml(row, index)}
                </td>
                <td>
                  <button type="button" class="secondary-button" data-save-name="${index}">Save</button>
                  ${saved ? `<button type="button" class="secondary-button" data-forget-name="${escapeHtml(saved.id)}">Forget</button>` : ""}
                </td>
              </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    ${rows.length > 1 ? `
      <div class="account-actions">
        <button type="button" class="primary-button" data-save-all>Save all chosen</button>
      </div>` : ""}`;

  const listed = <T extends Listed>(items: T[], extra: (item: T) => string = () => "") =>
    `<ul class="imp-list">${items.map((item) => `<li><strong>${escapeHtml(item.title)}</strong>, ${escapeHtml(item.when)}${extra(item)}</li>`).join("")}</ul>`;

  const openNotInFeed = notInFeed.filter((game) => stillOpen.has(game.id));
  const held = lastOk?.details.held ?? [];
  const skipped = lastOk?.details.skipped ?? [];
  const failed = lastOk?.details.failed ?? [];

  container.innerHTML = `
    <section class="importer" id="calendar-sync">
      <h3>Master calendar sync</h3>
      <p class="directory-description">
        Twice a day, the games are brought up to date from the master calendar's feed in Sports Connect.
        New games are added and changed games are changed. Every umpire on a changed game is emailed
        what changed and asked to confirm it again. Nothing is ever canceled here by the sync: games
        that disappear from the master calendar are listed below for a person to cancel.
      </p>

      <p id="cs-message" class="message" role="status" aria-live="polite"></p>

      <div class="account-actions">
        <button id="cs-sync" class="primary-button" type="button">Sync now</button>
        <button id="cs-close" class="secondary-button" type="button">Close</button>
      </div>

      ${matchedSince.length ? `
        <p class="message">Matched since the last sync: ${matchedSince.map((row) => `<strong>${escapeHtml(row.name)}</strong>`).join(", ")}.
          The lists below are from the last sync. Choose <strong>Sync now</strong> to use the new
          match${matchedSince.length === 1 ? "" : "es"} straight away (or wait for the next scheduled sync).</p>` : ""}

      ${unmatched.length ? `
        <div class="imp-section imp-problems">
          <h4>Names to match (${unmatched.length})</h4>
          <p class="directory-description">The master calendar uses these names, and the sync cannot tell which of
            ours they are. Games that use them are held back until they are matched. A match is remembered.</p>
          ${nameTable(unmatched, false)}
        </div>` : ""}

      ${openNotInFeed.length ? `
        <div class="imp-section imp-problems">
          <h4>Here, but no longer on the master calendar (${openNotInFeed.length})</h4>
          <p class="directory-description">If the game is off, find it in the games list and set it to
            <strong>Canceled</strong>; it then drops off this list. If it is still on, its teams may have been changed on the
            master calendar, or it was moved more than 60 days: check it against the master calendar.</p>
          ${listed(openNotInFeed, (game) => game.assigned ? ` <span class="imp-umpires">${plural(game.assigned, "umpire")} assigned</span>` : "")}
        </div>` : ""}

      ${held.length ? `
        <div class="imp-section imp-problems">
          <h4>Held back (${held.length})</h4>
          <p class="directory-description">On the master calendar, but not added or changed here until this is fixed.</p>
          ${listed(held, (game) => `<ul>${game.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>`)}
        </div>` : ""}

      ${failed.length ? `
        <div class="imp-section imp-problems">
          <h4>Could not be saved last time (${failed.length})</h4>
          ${listed(failed, (game) => `<ul><li>${escapeHtml(game.error)}</li></ul>`)}
        </div>` : ""}

      ${skipped.length ? `
        <div class="imp-section">
          <h4>Left alone (${skipped.length})</h4>
          ${listed(skipped, (game) => `<ul><li>${escapeHtml(game.reason)}</li></ul>`)}
        </div>` : ""}

      <details class="imp-section" ${settings.feed_url ? "" : "open"}>
        <summary><strong>Settings</strong>${settings.enabled ? " (on)" : " (off)"}</summary>

        <label for="cs-url">Calendar feed address (from Sports Connect: the "webcal://" subscribe link)</label>
        <input id="cs-url" type="text" value="${escapeHtml(settings.feed_url ?? "")}" placeholder="webcal://calendar.bluesombrero.com/api/v1/Calendar?..." autocomplete="off" spellcheck="false" />

        <label for="cs-season">Put the games in season</label>
        <select id="cs-season">
          <option value="">Choose a season&hellip;</option>
          ${context.seasons.map((season) => `
            <option value="${escapeHtml(season.id)}" ${season.id === seasonId ? "selected" : ""}>${escapeHtml(season.name)}</option>`).join("")}
        </select>
        <p class="directory-description">Games outside the season's start and end dates are ignored. When a new
          season starts, choose it here.</p>

        <label for="cs-zone">The league's time zone (used to tell which day a game is on, and in the emails)</label>
        <select id="cs-zone">
          ${zones.map((zone) => `<option value="${escapeHtml(zone)}" ${zone === settings.time_zone ? "selected" : ""}>${escapeHtml(zone.replace("_", " "))}</option>`).join("")}
        </select>

        <label class="season-checkbox-label">
          <input id="cs-enabled" type="checkbox" ${settings.enabled ? "checked" : ""} />
          Sync twice a day
        </label>

        <div class="account-actions">
          <button id="cs-save" class="secondary-button" type="button">Save settings</button>
        </div>
        ${settings.updated_by_name ? `<p class="directory-description">Last changed by ${escapeHtml(settings.updated_by_name)}, ${escapeHtml(whenText(settings.updated_at))}.</p>` : ""}
      </details>

      ${names.length ? `
        <details class="imp-section">
          <summary><strong>All names on the master calendar, and how they are matched</strong></summary>
          <p class="directory-description">To change a match, choose a different one and Save. Forget removes a match a person made.</p>
          ${nameTable(names, true)}
        </details>` : ""}

      <details class="imp-section" open>
        <summary><strong>Log</strong> (the last ${runs.length} syncs)</summary>
        ${runs.length === 0 ? `<p class="directory-description">The sync has not run yet.</p>` : `
          <ul class="imp-list">
            ${runs.map((run) => `
              <li>
                <details>
                  <summary>${escapeHtml(whenText(run.started_at))}
                    (${run.trigger === "manual" ? `Sync now, ${escapeHtml(run.triggered_by_name ?? "")}` : "scheduled"}):
                    ${escapeHtml(runSummary(run))}</summary>
                  ${run.message && run.status === "ok" ? `<p>${escapeHtml(run.message)}</p>` : ""}
                  ${run.details.counts ? `<p class="directory-description">The feed had ${run.details.counts.events ?? 0} events:
                    ${run.details.counts.games ?? 0} games, ${run.details.counts.practices ?? 0} practices skipped${
                      run.details.counts.other_events ? `, ${run.details.counts.other_events} other events skipped` : ""}${
                      run.details.counts.outside_season ? `, ${run.details.counts.outside_season} games outside the season's dates` : ""}${
                      run.details.counts.not_tracked ? `, ${run.details.counts.not_tracked} games of teams not tracked skipped` : ""}.
                    ${run.unchanged} games were already up to date.</p>` : ""}
                  ${run.details.added?.length ? `<h5>Added</h5>${listed(run.details.added)}` : ""}
                  ${run.details.changed?.length ? `<h5>Changed</h5>${listed(run.details.changed, (game) =>
                    `${game.assigned ? ` <span class="imp-umpires">${plural(game.assigned, "umpire")} told</span>` : ""}<ul>${game.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul>`)}` : ""}
                  ${run.details.other_event_titles?.length ? `<h5>Not games (skipped)</h5><ul class="imp-list">${run.details.other_event_titles.map((title) => `<li>${escapeHtml(title)}</li>`).join("")}</ul>` : ""}
                </details>
              </li>`).join("")}
          </ul>`}
      </details>
    </section>`;

  const root = container.querySelector<HTMLElement>("#calendar-sync")!;
  const messageEl = root.querySelector<HTMLElement>("#cs-message")!;
  const say = (text: string, kind: "error" | "success" = "error") => {
    messageEl.textContent = text;
    messageEl.className = text ? `message ${kind}` : "message";
  };
  const value = (id: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!.value;

  root.querySelector("#cs-close")!.addEventListener("click", options.onClose);

  // ---- settings
  root.querySelector("#cs-save")!.addEventListener("click", async () => {
    const { error } = await supabase.rpc("save_calendar_feed_settings", {
      p_feed_url: value("cs-url").trim() || null,
      p_season_id: value("cs-season") || null,
      p_enabled: root.querySelector<HTMLInputElement>("#cs-enabled")!.checked,
      p_time_zone: value("cs-zone"),
    });
    if (error) return say(`The settings were not saved. ${error.message}`);
    options.onChanged("The sync settings were saved.");
  });

  // ---- sync now
  const syncButton = root.querySelector<HTMLButtonElement>("#cs-sync")!;
  syncButton.addEventListener("click", async () => {
    syncButton.disabled = true;
    say("Syncing with the master calendar…", "success");

    const { data, error } = await supabase.functions.invoke("sync-calendar", { body: {} });
    syncButton.disabled = false;

    if (error) {
      // the function's own message, when it gave one
      let text = error.message;
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) text = body.error;
      } catch {
        // keep the general message
      }
      return say(`The sync did not work. ${text}`);
    }

    const result = data as { added: number; changed: number; umpires_told: number; held: number; not_in_feed: number; failed: number; note?: string };
    options.onChanged(
      result.note ||
      `Synced: ${result.added} added, ${result.changed} changed${result.umpires_told ? ` (${plural(result.umpires_told, "umpire")} told)` : ""}` +
      `${result.held ? `, ${result.held} held back` : ""}${result.not_in_feed ? `, ${result.not_in_feed} no longer on the master calendar` : ""}` +
      `${result.failed ? `, ${result.failed} could not be saved` : ""}.`
    );
  });

  // ---- matching a name
  root.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement;

    const forget = target.closest<HTMLButtonElement>("[data-forget-name]");
    if (forget) {
      const { error } = await supabase.rpc("forget_calendar_feed_name", { p_id: forget.dataset.forgetName });
      if (error) return say(`Not changed. ${error.message}`);
      options.onChanged("The match was forgotten. The next sync matches that name by itself again.");
      return;
    }

    // one row, or every row of a table that has a choice
    const save = target.closest<HTMLButtonElement>("[data-save-name]");
    const saveAll = target.closest<HTMLButtonElement>("[data-save-all]");
    if (!save && !saveAll) return;

    const chosen: { row: NameRow; choice: string }[] = [];
    if (save) {
      const row = names[Number(save.dataset.saveName)];
      const choice = root.querySelector<HTMLSelectElement>(`select[data-name-index="${save.dataset.saveName}"]`)?.value ?? "";
      if (!row || !choice) return say("Choose what the name is first.");
      chosen.push({ row, choice });
    } else {
      const table = saveAll!.closest(".imp-section");
      table?.querySelectorAll<HTMLSelectElement>("select[data-name-index]").forEach((select) => {
        const row = names[Number(select.dataset.nameIndex)];
        if (row && select.value) chosen.push({ row, choice: select.value });
      });
      if (chosen.length === 0) return say("Choose what at least one name is first.");
    }
    if (chosen.some(({ row }) => row.kind === "team") && !seasonId) return say("Choose the season in the settings first.");

    const button = (save ?? saveAll)!;
    button.disabled = true;
    say(chosen.length > 1 ? `Saving ${chosen.length} matches…` : "", "success");

    const createdFields = new Map<string, string>(); // two names on one new field ("X > MAJ", "X > AA"): create it once
    const saved: string[] = [];
    const problems: string[] = [];
    for (const { row, choice } of chosen) {
      try {
        await saveName(row, choice, createdFields);
        saved.push(row.name);
      } catch (problem) {
        problems.push(`${row.name}: ${problem instanceof Error ? problem.message : String(problem)}`);
      }
    }

    if (saved.length === 0) {
      button.disabled = false;
      return say(problems.join(" "));
    }
    const done = saved.length === 1 ? `"${saved[0]}" is matched.` : `${saved.length} names are matched.`;
    options.onChanged(
      problems.length
        ? `${done} Not saved: ${problems.join(" ")}`
        : `${done} Choose Sync now to use ${saved.length === 1 ? "it" : "them"} straight away, or wait for the next sync.`
    );
  });

  async function saveName(row: NameRow, choice: string, createdFields: Map<string, string>): Promise<void> {
    let teamId: string | null = null;
    let locationId: string | null = null;

    if (choice === NEW_TEAM) {
      const division = context.divisions.find((item) => item.id === row.guess_division_id);
      if (!division) throw new Error("The division for the new team was not found.");
      const { data, error } = await supabase.from("teams")
        .insert({ league_id: division.league_id, season_id: seasonId, division_id: division.id, name: row.name })
        .select("id").single();
      if (error) throw new Error(`The team could not be created. ${error.message}`);
      teamId = data.id as string;
    } else if (choice === NEW_FIELD) {
      const place = row.name.split(">")[0].trim() || row.name;
      const already = createdFields.get(keyOf(place));
      if (already) {
        locationId = already;
      } else {
        if (context.locations.some((field) => keyOf(field.name) === keyOf(place))) {
          throw new Error(`A field called "${place}" already exists. Choose it from the list instead.`);
        }
        const { data, error } = await supabase.from("locations")
          .insert({ name: place, address: row.address ?? null })
          .select("id").single();
        if (error) throw new Error(`The field could not be created. ${error.message}`);
        locationId = data.id as string;
        createdFields.set(keyOf(place), locationId);
      }
    } else if (row.kind === "team" && choice !== OUTSIDE && choice !== NOT_TRACKED) {
      teamId = choice;
    } else if (row.kind === "field") {
      locationId = choice;
    }

    const { error } = await supabase.rpc("save_calendar_feed_name", {
      p_kind: row.kind,
      p_feed_name: row.name,
      p_season_id: row.kind === "team" ? seasonId : null,
      p_team_id: teamId,
      p_location_id: locationId,
      p_outside: row.kind === "team" && choice === OUTSIDE,
      p_ignored: row.kind === "team" && choice === NOT_TRACKED,
    });
    if (error) throw new Error(error.message);
  }
}
