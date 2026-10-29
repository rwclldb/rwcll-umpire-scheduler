import { arrivedText } from "./attendance";
import { dateKey } from "./availability";
import { contactText, phoneHref } from "./contacts";
import type { ContactNumbers } from "./contacts";
import { formatLongDate, formatPrinted, localDateKey, timeRange } from "./format";
import { divisionNeed, openPlaces, POSITIONS, POSITION_LABEL, umpiresNeeded } from "./staffing";
import type { Position } from "./staffing";
import type { Assignment, DivisionOption, Game, GameStatus, LocationOption } from "./types";
import { escapeHtml } from "../ui";

// The field board: one day's games by field, with who is umpiring each, and a
// month calendar that says how many games there are on each day. This file
// works the board out from the games, assignments and names it is given, and
// writes it as HTML. (Loading the data and the buttons are in board.ts.)

export type SlotState = "confirmed" | "assigned" | "open";

// Where an umpire stands on game day:
//   "arrived" / "no_show": recorded
//   "not_yet": the game has started, they are not recorded as here, and it is not over
//   null: nothing to say (the game has not started, or it is over or canceled)
export type Here = "arrived" | "no_show" | "not_yet" | null;

export type BoardSlot = {
  position: Position;
  state: SlotState;        // "assigned" means made, but the umpire has not confirmed
  name: string | null;
  selfAssigned: boolean;
  umpireId: string | null;
  here: Here;
  arrivedAt: string | null;
};

export type BoardGame = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: GameStatus;
  gameType: string;
  division: string;
  home: string;
  away: string;
  notes: string | null;
  slots: BoardSlot[];
  finished: boolean;       // completed, canceled, or already over
};

export type BoardField = {
  locationId: string;
  name: string;
  address: string | null;
  league: boolean;         // a field this league runs (not an away field)
  games: BoardGame[];
};

export type BoardSummary = {
  games: number;           // not counting canceled ones
  canceled: number;
  fields: number;
  needed: number;          // umpire places on games still to be played
  open: number;            // of those, how many are still waiting for someone
  unconfirmed: number;     // of those, how many are filled but not yet confirmed
  notHere: number;         // umpires on games that have started who are not recorded as here
  noShows: number;         // umpires recorded as no-shows
};

export type DayBoard = {
  dayKey: string;
  fields: BoardField[];
  emptyLeagueFields: string[];   // league fields with no games that day
  summary: BoardSummary;
};

export type BoardInput = {
  games: Game[];
  assignments: Assignment[];
  divisions: DivisionOption[];
  teamNames: Map<string, string>;
  locations: LocationOption[];
  umpireNames: Map<string, string>;
  now: Date;
};

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

// A game that still has to be played: not canceled, not completed, not over.
function stillToPlay(game: Game, now: Date): boolean {
  return (game.status === "draft" || game.status === "scheduled") && Date.parse(game.ends_at) > now.getTime();
}

function indexAssignments(assignments: Assignment[]): Map<string, Assignment[]> {
  const map = new Map<string, Assignment[]>();
  for (const row of assignments) {
    const list = map.get(row.game_id) ?? [];
    list.push(row);
    map.set(row.game_id, list);
  }
  return map;
}

function needFor(game: Game, divisions: Map<string, DivisionOption>): number {
  if (game.status === "canceled") return 0;
  return umpiresNeeded(game, (divisionId, type) => divisionNeed(divisions.get(divisionId), type));
}

function placesFor(game: Game, rows: Assignment[], divisions: Map<string, DivisionOption>) {
  const assigned: Partial<Record<Position, Assignment>> = {};
  for (const row of rows) assigned[row.position] = row;
  const needed = needFor(game, divisions);
  return { assigned, needed, open: openPlaces(assigned, needed) };
}

export function buildDayBoard(input: BoardInput, dayKey: string): DayBoard {
  const divisions = new Map(input.divisions.map((division) => [division.id, division]));
  const locations = new Map(input.locations.map((location) => [location.id, location]));
  const rowsByGame = indexAssignments(input.assignments);
  const summary: BoardSummary = { games: 0, canceled: 0, fields: 0, needed: 0, open: 0, unconfirmed: 0, notHere: 0, noShows: 0 };
  const fields = new Map<string, BoardField>();

  const teamName = (id: string | null, label: string | null) =>
    id ? input.teamNames.get(id) ?? "Unknown team" : label ?? "To be decided";

  for (const game of input.games) {
    if (localDateKey(game.starts_at) !== dayKey) continue;

    const rows = rowsByGame.get(game.id) ?? [];
    const { assigned, needed, open } = placesFor(game, rows, divisions);
    const playing = stillToPlay(game, input.now);
    const slots: BoardSlot[] = [];

    if (game.status !== "canceled") {
      for (const position of POSITIONS) {
        const row = assigned[position];
        if (row) {
          const started = Date.parse(game.starts_at) <= input.now.getTime();
          const here: Here =
            row.attendance === "arrived" ? "arrived"
            : row.attendance === "no_show" ? "no_show"
            : playing && started ? "not_yet"
            : null;

          slots.push({
            position,
            state: row.status === "confirmed" ? "confirmed" : "assigned",
            name: input.umpireNames.get(row.umpire_id) ?? "Unknown umpire",
            selfAssigned: row.self_assigned,
            umpireId: row.umpire_id,
            here,
            arrivedAt: row.attendance === "arrived" ? row.arrived_at ?? null : null,
          });
        } else if (open.includes(position)) {
          slots.push({ position, state: "open", name: null, selfAssigned: false, umpireId: null, here: null, arrivedAt: null });
        }
      }
    }

    const boardGame: BoardGame = {
      id: game.id,
      startsAt: game.starts_at,
      endsAt: game.ends_at,
      status: game.status,
      gameType: game.game_type,
      division: divisions.get(game.division_id)?.name ?? "Unknown division",
      home: teamName(game.home_team_id, game.home_label),
      away: teamName(game.away_team_id, game.away_label),
      notes: game.notes,
      slots,
      finished: !playing,
    };

    const location = locations.get(game.location_id);
    let field = fields.get(game.location_id);
    if (!field) {
      field = {
        locationId: game.location_id,
        name: location?.name ?? "Unknown field",
        address: location?.address ?? null,
        league: Boolean(location?.is_league_field),
        games: [],
      };
      fields.set(game.location_id, field);
    }
    field.games.push(boardGame);

    if (game.status === "canceled") {
      summary.canceled += 1;
      continue;
    }

    summary.games += 1;
    summary.noShows += slots.filter((slot) => slot.here === "no_show").length;
    if (playing) {
      summary.notHere += slots.filter((slot) => slot.here === "not_yet").length;
      summary.needed += needed;
      summary.open += open.length;
      summary.unconfirmed += slots.filter((slot) => slot.state === "assigned").length;
    }
  }

  const list = [...fields.values()];
  for (const field of list) {
    field.games.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || Date.parse(a.endsAt) - Date.parse(b.endsAt) || a.id.localeCompare(b.id));
  }
  // our own fields first, then the fields we travel to; each in name order
  list.sort((a, b) => Number(b.league) - Number(a.league) || byName(a.name, b.name));
  summary.fields = list.filter((field) => field.games.some((game) => game.status !== "canceled")).length;

  const used = new Set(list.map((field) => field.locationId));
  const emptyLeagueFields = input.locations
    .filter((location) => location.is_league_field && location.is_active && !used.has(location.id))
    .map((location) => location.name)
    .sort(byName);

  return { dayKey, fields: list, emptyLeagueFields, summary };
}

// ---------------------------------------------------------------- the calendar

export type DayCount = {
  games: number;      // not counting canceled ones
  canceled: number;
  open: number;       // places still waiting for an umpire, on games still to be played
};

// For every day that has a game: how many games, and whether places are open.
export function monthCounts(
  games: Game[],
  assignments: Assignment[],
  divisions: DivisionOption[],
  now: Date
): Map<string, DayCount> {
  const divisionMap = new Map(divisions.map((division) => [division.id, division]));
  const rowsByGame = indexAssignments(assignments);
  const counts = new Map<string, DayCount>();

  for (const game of games) {
    const key = localDateKey(game.starts_at);
    const entry = counts.get(key) ?? { games: 0, canceled: 0, open: 0 };

    if (game.status === "canceled") {
      entry.canceled += 1;
    } else {
      entry.games += 1;
      if (stillToPlay(game, now)) {
        entry.open += placesFor(game, rowsByGame.get(game.id) ?? [], divisionMap).open.length;
      }
    }

    counts.set(key, entry);
  }

  return counts;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function dayLabel(key: string): string {
  return formatLongDate(new Date(`${key}T12:00:00`).toISOString());
}

// The month as HTML: arrows and a title, then a button for every day. A day with
// games shows how many, and a red dot when places there still need an umpire.
export function boardCalendarHtml(
  year: number,
  month: number,
  counts: Map<string, DayCount>,
  selectedKey: string,
  todayKey: string
): string {
  const first = new Date(year, month, 1);
  const title = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const last = new Date(year, month + 1, 0).getDate();
  const names = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const full = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const cells: string[] = [];

  for (let day = 1; day <= last; day++) {
    const key = dateKey(new Date(year, month, day));
    const count = counts.get(key);
    const games = count?.games ?? 0;
    const open = count?.open ?? 0;
    const weekday = full[new Date(year, month, day).getDay()];

    let text = `${weekday}, ${first.toLocaleDateString("en-US", { month: "long" })} ${day}: ${games === 0 ? "no games" : plural(games, "game", "games")}`;
    if (count && count.canceled > 0) text += `, ${count.canceled} canceled`;
    if (open > 0) text += `, ${plural(open, "place needs", "places need")} an umpire`;

    const classes = ["cal-day", "board-day"];
    if (games > 0) classes.push("board-has");
    if (open > 0) classes.push("board-open");
    if (key === selectedKey) classes.push("board-selected");
    if (key === todayKey) classes.push("board-today");

    cells.push(`
      <button type="button" class="${classes.join(" ")}" data-board-day="${key}"
        ${key === selectedKey ? 'aria-current="date"' : ""}
        title="${escapeHtml(text)}" aria-label="${escapeHtml(text)}">
        <span class="board-daynum">${day}</span>${games > 0 ? `<span class="board-count">${games}</span>` : ""}
      </button>`);
  }

  return `
    <div class="cal board-cal">
      <div class="cal-head">
        <button type="button" class="secondary-button cal-nav" data-board-month="-1" aria-label="Previous month">&lsaquo;</button>
        <strong class="cal-title" aria-live="polite">${escapeHtml(title)}</strong>
        <button type="button" class="secondary-button cal-nav" data-board-month="1" aria-label="Next month">&rsaquo;</button>
      </div>
      <div class="cal-grid">
        ${names.map((name, i) => `<span class="cal-dow" title="${full[i]}">${name}</span>`).join("")}
        ${Array.from({ length: first.getDay() }, () => `<span class="cal-blank"></span>`).join("")}
        ${cells.join("")}
      </div>
      <ul class="cal-key">
        <li><span class="board-keynum">12</span> number of games that day (canceled games are not counted)</li>
        <li><span class="board-keydot"></span> places still need an umpire</li>
        <li><span class="board-keyring"></span> today</li>
      </ul>
    </div>
  `;
}

// ---------------------------------------------------------------- the day

export function dayTitle(key: string): string {
  return dayLabel(key);
}

export function summaryText(summary: BoardSummary): string {
  if (summary.games === 0 && summary.canceled === 0) return "No games on this day.";

  const parts = [
    plural(summary.games, "game", "games"),
    plural(summary.fields, "field", "fields"),
  ];
  if (summary.canceled > 0) parts.push(`${summary.canceled} canceled`);
  if (summary.needed > 0) {
    parts.push(
      summary.open > 0
        ? `${plural(summary.open, "place needs", "places need")} an umpire`
        : "every place has an umpire"
    );
  }
  if (summary.unconfirmed > 0) parts.push(`${summary.unconfirmed} not confirmed yet`);
  if (summary.notHere > 0) parts.push(`${summary.notHere} not here yet`);
  if (summary.noShows > 0) parts.push(plural(summary.noShows, "no-show", "no-shows"));

  return parts.join(" \u00b7 ");
}

const STATUS_LABEL: Partial<Record<GameStatus, string>> = { draft: "Draft", canceled: "Canceled", completed: "Completed" };

// Call and Text links for one number (phones start a call or a text from them).
function callLinks(name: string, number: string, label: string): string {
  const href = phoneHref(number);
  return `<span class="board-contact">${label ? `<span class="board-contact-label">${label}</span> ` : ""}<a class="board-call" href="tel:${escapeHtml(href)}" aria-label="Call ${escapeHtml(name)} at ${escapeHtml(number)}">Call</a> <a class="board-call" href="sms:${escapeHtml(href)}" aria-label="Text ${escapeHtml(name)} at ${escapeHtml(number)}">Text</a> <span class="board-phone">${escapeHtml(number)}</span></span>`;
}

// How to reach an umpire: their own number, and for a youth umpire a parent's too.
function contactHtml(name: string, contact: ContactNumbers | undefined): string {
  if (!contact) return "";

  const parts = [
    contact.own ? callLinks(name, contact.own, contact.youth ? "Own" : "") : "",
    contact.youth && contact.parent ? callLinks(name, contact.parent, "Parent") : "",
  ].filter(Boolean);

  return parts.length
    ? `<span class="board-contacts">${parts.join(" ")}</span>`
    : `<span class="board-contacts board-note">${escapeHtml(contactText(contact))}</span>`;
}

// What is recorded about whether they are here, in words (never color alone).
function hereHtml(slot: BoardSlot, game: BoardGame): string {
  if (slot.here === "arrived" && slot.arrivedAt) {
    const text = arrivedText(game.startsAt, slot.arrivedAt);
    return `<span class="board-tag ${/late/.test(text) ? "board-tag-warn" : ""}">${escapeHtml(text)}</span>`;
  }
  if (slot.here === "no_show") return `<span class="board-tag board-tag-bad">No-show</span>`;
  if (slot.here === "not_yet") return `<span class="board-tag board-tag-warn">Not here yet</span>`;
  return "";
}

// An administrator records, corrects or clears attendance.
function markHtml(slot: BoardSlot, game: BoardGame): string {
  if (!slot.umpireId || game.status === "canceled") return "";
  const data = `data-game="${escapeHtml(game.id)}" data-umpire="${escapeHtml(slot.umpireId)}"`;
  const name = escapeHtml(slot.name ?? "this umpire");

  return `
    <details class="board-mark">
      <summary aria-label="Record attendance for ${name}">Mark</summary>
      <div class="board-mark-body">
        <label>Arrived at <input type="time" class="board-mark-time" aria-label="Arrival time for ${name}; leave blank for now" /></label>
        <button type="button" class="secondary-button" data-mark="arrived" ${data}>Arrived</button>
        <button type="button" class="secondary-button" data-mark="no_show" ${data}>No-show</button>
        ${slot.here === "arrived" || slot.here === "no_show"
          ? `<button type="button" class="secondary-button" data-mark="clear" ${data}>Clear</button>`
          : ""}
      </div>
    </details>`;
}

function slotHtml(slot: BoardSlot, game: BoardGame, contacts?: Map<string, ContactNumbers>): string {
  const position = `<span class="board-pos">${escapeHtml(POSITION_LABEL[slot.position])}</span>`;

  if (slot.state === "open") {
    return `<li class="board-ump board-ump-open">${position} <strong>${game.finished ? "No umpire recorded" : "Needs an umpire"}</strong></li>`;
  }

  const tag = slot.state === "confirmed"
    ? `<span class="board-tag">Confirmed</span>`
    : `<span class="board-tag board-tag-warn">Not confirmed</span>`;

  // how to reach them, and the control to record attendance: on a row of their own
  const actions = [
    slot.umpireId ? contactHtml(slot.name ?? "this umpire", contacts?.get(slot.umpireId)) : "",
    markHtml(slot, game),
  ].filter(Boolean).join("\n");

  return `<li class="board-ump board-ump-${slot.state}">${position} ${escapeHtml(slot.name ?? "")} ${game.finished && slot.state === "assigned" ? "" : tag}${slot.selfAssigned ? ` <span class="board-note">(took it themselves)</span>` : ""} ${hereHtml(slot, game)}
    ${actions ? `<div class="board-ump-actions">${actions}</div>` : ""}</li>`;
}

function gameHtml(game: BoardGame, contacts?: Map<string, ContactNumbers>): string {
  const badges = [
    STATUS_LABEL[game.status] ? `<span class="board-badge board-badge-${game.status}">${STATUS_LABEL[game.status]}</span>` : "",
    game.gameType !== "regular" ? `<span class="board-badge">${escapeHtml(game.gameType)}</span>` : "",
  ].join(" ");

  return `
    <li class="board-game board-status-${game.status}" data-board-game="${escapeHtml(game.id)}">
      <div class="board-time">${escapeHtml(timeRange(game.startsAt, game.endsAt))}</div>
      <div class="board-main">
        <div class="board-teams">
          <span class="board-division">${escapeHtml(game.division)}</span>
          <strong>${escapeHtml(game.home)}</strong> vs <strong>${escapeHtml(game.away)}</strong>
          ${badges}
        </div>
        ${game.notes ? `<p class="board-note">${escapeHtml(game.notes)}</p>` : ""}
        ${game.slots.length ? `<ul class="board-umps">${game.slots.map((slot) => slotHtml(slot, game, contacts)).join("")}</ul>` : ""}
      </div>
    </li>`;
}

function fieldHtml(field: BoardField, contacts?: Map<string, ContactNumbers>): string {
  const maps = field.address
    ? ` <a class="board-map" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(field.address)}" target="_blank" rel="noopener">${escapeHtml(field.address)}</a>`
    : "";

  return `
    <section class="board-field" data-board-field="${escapeHtml(field.locationId)}">
      <h3>${escapeHtml(field.name)}
        <span class="field-kind ${field.league ? "field-kind-league" : "field-kind-away"}">${field.league ? "League field" : "Away field"}</span>
      </h3>
      ${maps ? `<p class="board-address">${maps}</p>` : ""}
      <ol class="board-games">${field.games.map((game) => gameHtml(game, contacts)).join("")}</ol>
    </section>`;
}

export function dayBoardHtml(board: DayBoard, contacts?: Map<string, ContactNumbers>): string {
  const league = board.fields.filter((field) => field.league);
  const away = board.fields.filter((field) => !field.league);

  return `
    ${league.map((field) => fieldHtml(field, contacts)).join("")}
    ${board.emptyLeagueFields.length
      ? `<p class="board-empty-fields">No games at: ${board.emptyLeagueFields.map(escapeHtml).join(", ")}.</p>`
      : ""}
    ${away.length
      ? `<h2 class="board-away-title">Games at other fields</h2>${away.map((field) => fieldHtml(field, contacts)).join("")}`
      : ""}
  `;
}

// The day on paper: a table for each field.
export function dayBoardPrintHtml(board: DayBoard, now: Date): string {
  const rows = (field: BoardField) => field.games.map((game) => {
    const umps = game.slots.length
      ? game.slots.map((slot) => `<div>${escapeHtml(POSITION_LABEL[slot.position])}: ${slot.state === "open" ? `<span class="print-open">OPEN</span>` : escapeHtml(slot.name ?? "")}${slot.state === "assigned" && !game.finished ? " (not confirmed)" : ""}</div>`).join("")
      : "&nbsp;";
    const status = game.status === "canceled" ? ` <span class="print-canceled-tag">CANCELED</span>` : game.status === "completed" ? ` <span class="print-tag">completed</span>` : game.status === "draft" ? ` <span class="print-tag">draft</span>` : "";

    return `<tr>
      <td>${escapeHtml(timeRange(game.startsAt, game.endsAt))}</td>
      <td>${escapeHtml(game.division)}</td>
      <td><strong>${escapeHtml(game.home)}</strong> vs <strong>${escapeHtml(game.away)}</strong>${status}</td>
      <td>${umps}</td>
    </tr>`;
  }).join("");

  const section = (field: BoardField) => `
    <section class="print-day">
      <h2>${escapeHtml(field.name)} <span class="print-count">${field.league ? "League field" : "Away field"} \u00b7 ${plural(field.games.length, "game", "games")}</span></h2>
      <table class="print-table">
        <thead><tr><th>Time</th><th>Division</th><th>Game</th><th>Umpires</th></tr></thead>
        <tbody>${rows(field)}</tbody>
      </table>
    </section>`;

  return `
    <article class="print-doc">
      <header class="print-head">
        <h1>Field board</h1>
        <p class="print-sub">${escapeHtml(dayTitle(board.dayKey))}</p>
        <p class="print-meta">${escapeHtml(summaryText(board.summary))} \u00b7 Printed ${escapeHtml(formatPrinted(now))}</p>
      </header>
      ${board.fields.length ? board.fields.map(section).join("") : "<p>No games on this day.</p>"}
    </article>`;
}

