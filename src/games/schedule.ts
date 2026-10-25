// The umpire calendar as a table of games, for printing and for downloading.
// This file only works out WHAT is shown (rows, days, text); showing it on
// paper is print.ts.

import { escapeHtml } from "../ui";
import {
  formatDate,
  formatLongDate,
  formatTime,
  localDateKey,
  timeRange,
  weekdayName,
} from "./format";
import type { Assignment, Game, GameStatus, GameType, GamesContext } from "./types";

// How names are looked up. Anything not found has a safe fallback.
export type Lookups = {
  teamName: (teamId: string) => string;
  fieldName: (locationId: string) => string;
  fieldAddress: (locationId: string) => string;
  divisionName: (divisionId: string) => string;
  umpireName: (umpireId: string) => string;
};

export function lookupsFor(context: GamesContext): Lookups {
  const teams = new Map(context.teams.map((team) => [team.id, team.name]));
  const fields = new Map(context.locations.map((field) => [field.id, field]));
  const divisions = new Map(context.divisions.map((division) => [division.id, division.name]));

  return {
    teamName: (id) => teams.get(id) ?? "A team",
    fieldName: (id) => fields.get(id)?.name ?? "",
    fieldAddress: (id) => fields.get(id)?.address ?? "",
    divisionName: (id) => divisions.get(id) ?? "",
    umpireName: (id) => context.umpireNames.get(id) ?? "Unknown umpire",
  };
}

export type ScheduleGame = {
  id: string;
  day: string; // "2026-10-04", the day the game is on in this computer's time zone
  startsAt: string;
  endsAt: string;
  time: string; // "9:00 AM - 11:00 AM"
  start: string; // "9:00 AM"
  end: string; // "11:00 AM"
  weekday: string; // "Saturday"
  division: string;
  field: string;
  address: string;
  home: string;
  away: string;
  plate: string | null; // null: nobody assigned
  fieldUmpire: string | null;
  status: GameStatus;
  type: GameType;
  masterId: string;
  notes: string;
};

function sideText(game: Game, side: "home" | "away", look: Lookups): string {
  const teamId = side === "home" ? game.home_team_id : game.away_team_id;
  const label = side === "home" ? game.home_label : game.away_label;
  return teamId ? look.teamName(teamId) : label ?? "?";
}

const byTime = (a: { startsAt: string; field: string; home: string }, b: typeof a) =>
  Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
  a.field.localeCompare(b.field) ||
  a.home.localeCompare(b.home);

// Every game with its umpires' names, ready to print or export.
export function buildScheduleGames(
  games: Game[],
  assignments: Assignment[],
  look: Lookups
): ScheduleGame[] {
  const byGame = new Map<string, { plate?: string; field?: string }>();
  for (const row of assignments) {
    const entry = byGame.get(row.game_id) ?? {};
    entry[row.position] = look.umpireName(row.umpire_id);
    byGame.set(row.game_id, entry);
  }

  return games
    .map((game): ScheduleGame => {
      const umpires = byGame.get(game.id);
      return {
        id: game.id,
        day: localDateKey(game.starts_at),
        startsAt: game.starts_at,
        endsAt: game.ends_at,
        time: timeRange(game.starts_at, game.ends_at),
        start: formatTime(game.starts_at),
        end: formatTime(game.ends_at),
        weekday: weekdayName(game.starts_at),
        division: look.divisionName(game.division_id),
        field: look.fieldName(game.location_id),
        address: look.fieldAddress(game.location_id),
        home: sideText(game, "home", look),
        away: sideText(game, "away", look),
        plate: umpires?.plate ?? null,
        fieldUmpire: umpires?.field ?? null,
        status: game.status,
        type: game.game_type,
        masterId: game.external_game_id ?? "",
        notes: game.notes ?? "",
      };
    })
    .sort(byTime);
}

// ------------------------------------------------------------------- by day

export type DayGroup = { day: string; heading: string; games: ScheduleGame[] };

export function groupByDay(list: ScheduleGame[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const game of [...list].sort(byTime)) {
    let group = groups.get(game.day);
    if (!group) {
      group = { day: game.day, heading: formatLongDate(game.startsAt), games: [] };
      groups.set(game.day, group);
    }
    group.games.push(game);
  }

  return [...groups.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export const DAY_CSV_HEADERS = [
  "Date", "Day", "Start", "End", "Division", "Field", "Address",
  "Home", "Away", "Plate umpire", "Field umpire", "Status", "Type",
  "Master Game ID", "Notes",
];

// An empty umpire cell means the game still needs one (easy to filter on).
export function dayCsvRows(list: ScheduleGame[]): string[][] {
  return [...list].sort(byTime).map((game) => [
    game.day, game.weekday, game.start, game.end, game.division, game.field,
    game.address, game.home, game.away, game.plate ?? "", game.fieldUmpire ?? "",
    game.status, game.type, game.masterId, game.notes,
  ]);
}

// -------------------------------------------------------------- by umpire

export type UmpireGame = ScheduleGame & { position: "Plate" | "Field" };

// The games of ONE umpire, from that umpire's assignments.
export function buildUmpireSchedule(
  umpireId: string,
  games: Game[],
  assignments: (Assignment)[],
  look: Lookups
): UmpireGame[] {
  const mine = new Map<string, "Plate" | "Field">();
  for (const row of assignments) {
    if (row.umpire_id === umpireId) {
      mine.set(row.game_id, row.position === "plate" ? "Plate" : "Field");
    }
  }

  const shown = buildScheduleGames(
    games.filter((game) => mine.has(game.id)),
    [],
    look
  );

  return shown.map((game) => ({ ...game, position: mine.get(game.id)! }));
}

export const UMPIRE_CSV_HEADERS = [
  "Date", "Day", "Start", "End", "Position", "Field", "Address",
  "Division", "Home", "Away", "Status", "Master Game ID",
];

export function umpireCsvRows(list: UmpireGame[]): string[][] {
  return [...list].sort(byTime).map((game) => [
    game.day, game.weekday, game.start, game.end, game.position, game.field,
    game.address, game.division, game.home, game.away, game.status, game.masterId,
  ]);
}

// ------------------------------------------------------------------ on paper

export type PrintMeta = {
  title: string;
  lines: string[]; // what is being shown, in words
  printedAt: string;
  pagePerDay?: boolean;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function gameCell(game: ScheduleGame): string {
  return `
    <strong>${escapeHtml(game.home)}</strong> vs <strong>${escapeHtml(game.away)}</strong>
    ${game.type !== "regular" ? `<span class="print-tag">${escapeHtml(game.type)}</span>` : ""}
    ${game.status === "canceled" ? `<span class="print-canceled-tag">CANCELED</span>` : ""}
    ${game.status === "completed" ? `<span class="print-tag">completed</span>` : ""}
  `;
}

function fieldCell(game: ScheduleGame): string {
  return `${escapeHtml(game.field)}${game.address ? `<br><small>${escapeHtml(game.address)}</small>` : ""}`;
}

function umpireCell(name: string | null, game: ScheduleGame): string {
  if (game.status === "canceled") return "&mdash;";
  return name ? escapeHtml(name) : `<span class="print-open">OPEN</span>`;
}

// The whole schedule, one section per day.
export function dayPrintHtml(groups: DayGroup[], meta: PrintMeta): string {
  const total = groups.reduce((sum, group) => sum + group.games.length, 0);

  return `
    <article class="print-doc">
      <header class="print-head">
        <h1>${escapeHtml(meta.title)}</h1>
        ${meta.lines.map((line) => `<p class="print-sub">${escapeHtml(line)}</p>`).join("")}
        <p class="print-meta">
          ${plural(total, "game", "games")} on ${plural(groups.length, "day", "days")}
          &middot; Printed ${escapeHtml(meta.printedAt)}
        </p>
      </header>

      ${groups.length === 0 ? `<p>There are no games to show.</p>` : ""}

      ${groups.map((group, index) => `
        <section class="print-day ${meta.pagePerDay && index > 0 ? "print-new-page" : ""}">
          <h2>${escapeHtml(group.heading)}
            <span class="print-count">${plural(group.games.length, "game", "games")}</span>
          </h2>
          <table class="print-table">
            <thead>
              <tr>
                <th class="c-time">Time</th><th>Division</th><th>Field</th>
                <th>Game</th><th>Plate umpire</th><th>Field umpire</th>
              </tr>
            </thead>
            <tbody>
              ${group.games.map((game) => `
                <tr class="${game.status === "canceled" ? "print-canceled" : ""}">
                  <td class="c-time">${escapeHtml(game.time)}</td>
                  <td>${escapeHtml(game.division)}</td>
                  <td>${fieldCell(game)}</td>
                  <td>${gameCell(game)}</td>
                  <td>${umpireCell(game.plate, game)}</td>
                  <td>${umpireCell(game.fieldUmpire, game)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>
      `).join("")}
    </article>
  `;
}

// One umpire's games, in date order.
export function umpirePrintHtml(
  umpireName: string,
  list: UmpireGame[],
  meta: PrintMeta
): string {
  const rows = [...list].sort(byTime);

  return `
    <article class="print-doc">
      <header class="print-head">
        <h1>${escapeHtml(meta.title)}: ${escapeHtml(umpireName)}</h1>
        ${meta.lines.map((line) => `<p class="print-sub">${escapeHtml(line)}</p>`).join("")}
        <p class="print-meta">
          ${plural(rows.length, "game", "games")} &middot; Printed ${escapeHtml(meta.printedAt)}
        </p>
      </header>

      ${rows.length === 0 ? `<p>There are no games to show.</p>` : `
        <table class="print-table">
          <thead>
            <tr>
              <th>Date</th><th class="c-time">Time</th><th>Position</th>
              <th>Field</th><th>Game</th><th>Division</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((game) => `
              <tr class="${game.status === "canceled" ? "print-canceled" : ""}">
                <td>${escapeHtml(formatDate(game.startsAt))}</td>
                <td class="c-time">${escapeHtml(game.time)}</td>
                <td><strong>${escapeHtml(game.position)}</strong></td>
                <td>${fieldCell(game)}</td>
                <td>${gameCell(game)}</td>
                <td>${escapeHtml(game.division)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
    </article>
  `;
}
