// Working out what an import would do, WITHOUT changing anything.
//
// The spreadsheet rows and the administrator's matches (which division, which
// field, which team) go in; a plan comes out: which games are new, which have
// changed (and how), which are unchanged, which have problems, and which games
// the system has that the spreadsheet does not. The same plan is shown as a
// preview and then, when approved, sent to the database in one go.

import type { CalendarRow } from "./calendar";
import { divisionLabel, isPracticeRow, parseDate, parseTime, toIso } from "./calendar";
import { formatDate, formatTime, localDateKey } from "./format";
import { cleanDivisionLabel, looksLikeOurTeam, matchDivision, norm } from "./matching";
import type { DivisionOption, Game, NamedOption, TeamOption } from "./types";

// ------------------------------------------------------------------ settings

export type TeamTarget =
  | { kind: "existing"; id: string }
  | { kind: "new" } // create a team named like the spreadsheet, in the game's division
  | { kind: "label" }; // an outside team: shown by name only, not a team record

export type LocationTarget =
  | { kind: "existing"; id: string }
  | { kind: "new"; name: string };

export type ImportSettings = {
  includeEvents: Record<string, boolean>; // event label -> import its rows as games
  divisionByLabel: Record<string, string | null>; // event label -> division id
  locationByKey: Record<string, LocationTarget>; // "location|field" -> field
  teamByKey: Record<string, TeamTarget>; // normalized team name -> team
};

export type MatchContext = {
  seasonId: string;
  divisions: DivisionOption[];
  teams: TeamOption[];
  locations: NamedOption[];
};

export function locationKey(row: { location: string; field: string }): string {
  return `${row.location}|${row.field}`;
}

// The rows that will be treated as games, given which events are switched on.
function gameRowsOf(rows: CalendarRow[], includeEvents: Record<string, boolean>) {
  return rows.filter(
    (row) => !isPracticeRow(row) && includeEvents[divisionLabel(row)] !== false
  );
}

// ---------------------------------------------------------- the file summary

export type FileSummary = {
  events: { label: string; rows: number; practiceRows: number; include: boolean }[];
  divisions: { label: string; games: number }[];
  fields: { key: string; location: string; field: string; games: number }[];
  teams: { key: string; name: string; games: number }[];
};

export function summarize(rows: CalendarRow[], settings: ImportSettings): FileSummary {
  const events = new Map<string, { rows: number; practiceRows: number }>();
  for (const row of rows) {
    const label = divisionLabel(row);
    const entry = events.get(label) ?? { rows: 0, practiceRows: 0 };
    entry.rows += 1;
    if (isPracticeRow(row)) entry.practiceRows += 1;
    events.set(label, entry);
  }

  const games = gameRowsOf(rows, settings.includeEvents);

  const count = <T>(items: T[], key: (item: T) => string) => {
    const map = new Map<string, { first: T; count: number }>();
    for (const item of items) {
      const k = key(item);
      const entry = map.get(k);
      if (entry) entry.count += 1;
      else map.set(k, { first: item, count: 1 });
    }
    return map;
  };

  const divisionCounts = count(games, (row) => divisionLabel(row));
  const fieldCounts = count(games, (row) => locationKey(row));
  const teamCounts = count(
    games.flatMap((row) => [row.home, row.away]).filter((name) => name !== ""),
    (name) => norm(name)
  );

  return {
    events: [...events].map(([label, entry]) => ({
      label,
      rows: entry.rows,
      practiceRows: entry.practiceRows,
      include: entry.rows > entry.practiceRows && settings.includeEvents[label] !== false,
    })),
    divisions: [...divisionCounts].map(([label, entry]) => ({ label, games: entry.count })),
    fields: [...fieldCounts].map(([key, entry]) => ({
      key,
      location: entry.first.location,
      field: entry.first.field,
      games: entry.count,
    })),
    teams: [...teamCounts].map(([key, entry]) => ({ key, name: entry.first, games: entry.count })),
  };
}

// ------------------------------------------------------- sensible first guesses

// The matches to start from. Everything can be changed before importing.
// "keep" carries over choices already made (for example when an event is
// switched on or off), so only the new things get a fresh first guess.
export function defaultSettings(
  rows: CalendarRow[],
  context: MatchContext,
  keep?: ImportSettings
): ImportSettings {
  const includeEvents: Record<string, boolean> = {};
  for (const row of rows) {
    const label = divisionLabel(row);
    if (includeEvents[label] === undefined) includeEvents[label] = false;
    if (!isPracticeRow(row)) includeEvents[label] = true; // at least one real game
  }

  if (keep) {
    for (const [label, value] of Object.entries(keep.includeEvents)) {
      if (label in includeEvents) includeEvents[label] = value;
    }
  }

  const games = gameRowsOf(rows, includeEvents);

  const divisionByLabel: Record<string, string | null> = {};
  for (const row of games) {
    const label = divisionLabel(row);
    if (!(label in divisionByLabel)) {
      divisionByLabel[label] = matchDivision(label, context.divisions);
    }
  }

  // How many different diamonds each location has among the games.
  const fieldsAt = new Map<string, Set<string>>();
  for (const row of games) {
    const set = fieldsAt.get(row.location) ?? new Set<string>();
    set.add(row.field);
    fieldsAt.set(row.location, set);
  }

  const locationByKey: Record<string, LocationTarget> = {};
  for (const row of games) {
    const key = locationKey(row);
    if (key in locationByKey) continue;

    const single = (fieldsAt.get(row.location)?.size ?? 0) <= 1;
    const place = row.location || row.field;
    const longName = row.location && row.field ? `${row.location} - ${row.field}` : place;
    const candidates = single ? [longName, place] : [longName];

    const found = context.locations.find((location) =>
      candidates.some((candidate) => norm(location.name) === norm(candidate))
    );

    locationByKey[key] = found
      ? { kind: "existing", id: found.id }
      : { kind: "new", name: single ? place : longName };
  }

  const seasonTeams = context.teams.filter((team) => team.season_id === context.seasonId);
  const teamByKey: Record<string, TeamTarget> = {};
  for (const row of games) {
    for (const name of [row.home, row.away]) {
      const key = norm(name);
      if (!name || key in teamByKey) continue;

      const found = seasonTeams.find((team) => norm(team.name) === key);
      teamByKey[key] = found
        ? { kind: "existing", id: found.id }
        : looksLikeOurTeam(name)
          ? { kind: "new" }
          : { kind: "label" };
    }
  }

  if (keep) {
    for (const key of Object.keys(divisionByLabel)) {
      if (key in keep.divisionByLabel) divisionByLabel[key] = keep.divisionByLabel[key];
    }
    for (const key of Object.keys(locationByKey)) {
      if (key in keep.locationByKey) locationByKey[key] = keep.locationByKey[key];
    }
    for (const key of Object.keys(teamByKey)) {
      if (key in keep.teamByKey) teamByKey[key] = keep.teamByKey[key];
    }
  }

  return { includeEvents, divisionByLabel, locationByKey, teamByKey };
}

// ----------------------------------------------------------------- the plan

export type GamePayload = {
  division_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_label: string | null;
  away_label: string | null;
  location_id: string;
  starts_at: string;
  ends_at: string;
  status: string | null; // null: the spreadsheet says nothing, so keep what the game has
};

export type PlannedGame = {
  op: "insert" | "update";
  id: string | null; // the existing game's id, for an update
  externalId: string;
  line: number;
  title: string; // "MAJ 02 - Kays vs MAJ 01 - Seely-Kirk"
  when: string; // "Sun, Oct 4, 9:00 AM - 11:00 AM"
  where: string; // "Majors, Kiwanis Field"
  payload: GamePayload;
  changes: string[]; // what an update changes
  hasUmpires: boolean; // an update to a game that already has umpires assigned
};

export type Problem = { line: number; externalId: string; messages: string[] };

export type Plan = {
  totalRows: number;
  practicesSkipped: number;
  eventsSkipped: number;
  considered: number;
  games: PlannedGame[]; // new and changed games, in time order
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  problems: Problem[];
  newTeams: { id: string; name: string; divisionId: string }[];
  newLocations: { id: string; name: string }[];
  missing: Game[]; // in the system, in the same dates and divisions, but not in the file
  changedWithUmpires: number;
};

export type PlanInput = {
  rows: CalendarRow[];
  settings: ImportSettings;
  context: MatchContext;
  existingGames: Game[];
  assignedCount: Map<string, number>;
  newId: () => string;
};

// "Scheduled Status" text from the master calendar, as one of our statuses.
// Anything unclear (including blank) says nothing, so the game keeps its status.
function mapStatus(text: string): string | null {
  const value = text.trim().toLowerCase();
  if (!value) return null;
  if (/cancel|postpone|rain|forfeit/.test(value)) return "canceled";
  if (/complete|final/.test(value)) return "completed";
  if (/schedul|confirm|active/.test(value)) return "scheduled";
  return null;
}

type Side = { name: string; key: string; target: TeamTarget };

type Resolved = {
  row: CalendarRow;
  divisionId: string;
  locationTarget: LocationTarget;
  home: Side;
  away: Side;
  startsAt: string;
  endsAt: string;
  status: string | null;
};

export function buildPlan(input: PlanInput): Plan {
  const { rows, settings, context, existingGames, assignedCount, newId } = input;

  const divisionName = new Map(context.divisions.map((d) => [d.id, d.name]));
  const teamById = new Map(context.teams.map((t) => [t.id, t]));
  const seasonTeamIds = new Set(
    context.teams.filter((t) => t.season_id === context.seasonId).map((t) => t.id)
  );
  const locationName = new Map(context.locations.map((l) => [l.id, l.name]));
  const existingByExternal = new Map<string, Game>();
  for (const game of existingGames) {
    if (game.external_game_id) existingByExternal.set(game.external_game_id, game);
  }

  const practicesSkipped = rows.filter(isPracticeRow).length;
  const gameRows = gameRowsOf(rows, settings.includeEvents);
  const eventsSkipped = rows.length - practicesSkipped - gameRows.length;

  // ---- which Game IDs appear more than once
  const linesById = new Map<string, number[]>();
  for (const row of gameRows) {
    if (!row.externalId) continue;
    const lines = linesById.get(row.externalId) ?? [];
    lines.push(row.line);
    linesById.set(row.externalId, lines);
  }

  const problems: Problem[] = [];
  const resolved: Resolved[] = [];

  // ---- pass 1: understand each row, noting everything wrong with it
  for (const row of gameRows) {
    const messages: string[] = [];

    if (!row.externalId) messages.push("It has no Game ID.");
    else if ((linesById.get(row.externalId)?.length ?? 0) > 1) {
      messages.push(
        `Game ID ${row.externalId} is used on more than one line (${linesById
          .get(row.externalId)!
          .join(", ")}). Each game needs its own ID.`
      );
    }

    const date = parseDate(row.date);
    const start = parseTime(row.start);
    const end = parseTime(row.end);
    if (!date) messages.push(`The date "${row.date}" cannot be read.`);
    if (!start) messages.push(`The start time "${row.start}" cannot be read.`);
    if (!end) messages.push(`The end time "${row.end}" cannot be read.`);

    const startsAt = date && start ? toIso(date, start) : null;
    const endsAt = date && end ? toIso(date, end) : null;
    if (date && start && !startsAt) messages.push("The start time does not exist on that date (clock change).");
    if (date && end && !endsAt) messages.push("The end time does not exist on that date (clock change).");
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      messages.push("The game ends at or before it starts.");
    }

    const label = divisionLabel(row);
    const divisionId = settings.divisionByLabel[label] ?? null;
    if (!divisionId || !divisionName.has(divisionId)) {
      messages.push(
        `Its division "${cleanDivisionLabel(label) || label}" is not matched to one of your divisions.`
      );
    }

    let locationTarget: LocationTarget | null = null;
    if (!row.location && !row.field) {
      messages.push("It has no field or location.");
    } else {
      locationTarget = settings.locationByKey[locationKey(row)] ?? null;
      if (!locationTarget) {
        messages.push(`Its field "${row.location || row.field}" is not matched.`);
      }
    }

    const sides: Side[] = [];
    for (const [which, name] of [["home", row.home], ["away", row.away]] as const) {
      const key = norm(name);
      if (!name) {
        messages.push(`It has no ${which} team.`);
        continue;
      }

      const target = settings.teamByKey[key];
      if (!target) {
        messages.push(`The team "${name}" is not matched.`);
        continue;
      }

      if (target.kind === "existing") {
        const team = teamById.get(target.id);
        if (!team || !seasonTeamIds.has(target.id)) {
          messages.push(`The team "${name}" is not a team in this season.`);
          continue;
        }
        if (divisionId && team.division_id !== divisionId) {
          messages.push(
            `The team "${team.name}" is in the ${divisionName.get(team.division_id ?? "") ?? "no"} division, but this game is in ${divisionName.get(divisionId) ?? "another division"}.`
          );
          continue;
        }
      }

      sides.push({ name, key, target });
    }

    if (sides.length === 2) {
      const [a, b] = sides;
      const sameTeam =
        a.key === b.key ||
        (a.target.kind === "existing" && b.target.kind === "existing" && a.target.id === b.target.id);
      if (sameTeam) messages.push("The same team is on both sides.");
    }

    if (messages.length > 0 || !startsAt || !endsAt || !divisionId || !locationTarget || sides.length !== 2) {
      problems.push({ line: row.line, externalId: row.externalId, messages });
      continue;
    }

    resolved.push({
      row,
      divisionId,
      locationTarget,
      home: sides[0],
      away: sides[1],
      startsAt,
      endsAt,
      status: mapStatus(row.status),
    });
  }

  // ---- pass 2: a team to be created can only live in one division
  const divisionsOfNewTeam = new Map<string, Set<string>>();
  for (const item of resolved) {
    for (const side of [item.home, item.away]) {
      if (side.target.kind !== "new") continue;
      const set = divisionsOfNewTeam.get(side.key) ?? new Set<string>();
      set.add(item.divisionId);
      divisionsOfNewTeam.set(side.key, set);
    }
  }

  const clashingTeams = new Set(
    [...divisionsOfNewTeam].filter(([, set]) => set.size > 1).map(([key]) => key)
  );

  // ---- pass 3: a new field must not already exist under that name
  const existingLocationNames = new Set(context.locations.map((l) => norm(l.name)));

  const usable: Resolved[] = [];
  for (const item of resolved) {
    const messages: string[] = [];

    for (const side of [item.home, item.away]) {
      if (side.target.kind === "new" && clashingTeams.has(side.key)) {
        messages.push(
          `The team "${side.name}" would have to be created in more than one division. Choose which team it is, or mark it as an outside team.`
        );
      }
    }

    if (
      item.locationTarget.kind === "new" &&
      existingLocationNames.has(norm(item.locationTarget.name))
    ) {
      messages.push(
        `A field called "${item.locationTarget.name}" already exists. Choose it from the list instead of creating it again.`
      );
    }

    if (messages.length > 0) {
      problems.push({ line: item.row.line, externalId: item.row.externalId, messages });
    } else {
      usable.push(item);
    }
  }

  // ---- ids for the teams and fields that will be created (only those still in use)
  const newTeams: Plan["newTeams"] = [];
  const newTeamIds = new Map<string, string>(); // team key -> id
  const newLocations: Plan["newLocations"] = [];
  const newLocationIds = new Map<string, string>(); // normalized name -> id

  const teamIdFor = (side: Side, divisionId: string): string => {
    let id = newTeamIds.get(side.key);
    if (!id) {
      id = newId();
      newTeamIds.set(side.key, id);
      newTeams.push({ id, name: side.name, divisionId });
    }
    return id;
  };

  const locationIdFor = (target: LocationTarget): string => {
    if (target.kind === "existing") return target.id;
    const key = norm(target.name);
    let id = newLocationIds.get(key);
    if (!id) {
      id = newId();
      newLocationIds.set(key, id);
      newLocations.push({ id, name: target.name });
    }
    return id;
  };

  // ---- what each side and place is called, for the descriptions
  const teamText = (side: Side) =>
    side.target.kind === "existing"
      ? teamById.get(side.target.id)?.name ?? side.name
      : side.name;

  const existingSideText = (game: Game, which: "home" | "away") => {
    const teamId = which === "home" ? game.home_team_id : game.away_team_id;
    const label = which === "home" ? game.home_label : game.away_label;
    return teamId ? teamById.get(teamId)?.name ?? "a team" : label ?? "?";
  };

  // ---- pass 4: new, changed or unchanged
  const planned: PlannedGame[] = [];
  let unchangedCount = 0;

  for (const item of usable) {
    const sideFields = (side: Side) =>
      side.target.kind === "label"
        ? { team: null, label: side.name }
        : side.target.kind === "existing"
          ? { team: side.target.id, label: null }
          : { team: teamIdFor(side, item.divisionId), label: null };

    const home = sideFields(item.home);
    const away = sideFields(item.away);
    const locationId = locationIdFor(item.locationTarget);

    const payload: GamePayload = {
      division_id: item.divisionId,
      home_team_id: home.team,
      away_team_id: away.team,
      home_label: home.label,
      away_label: away.label,
      location_id: locationId,
      starts_at: item.startsAt,
      ends_at: item.endsAt,
      status: item.status,
    };

    const newLocationText =
      item.locationTarget.kind === "new"
        ? item.locationTarget.name
        : locationName.get(item.locationTarget.id) ?? "";

    const base = {
      externalId: item.row.externalId,
      line: item.row.line,
      title: `${teamText(item.home)} vs ${teamText(item.away)}`,
      when: `${formatDate(item.startsAt)}, ${formatTime(item.startsAt)} - ${formatTime(item.endsAt)}`,
      where: `${divisionName.get(item.divisionId) ?? ""}, ${newLocationText}`,
      payload,
    };

    const existing = existingByExternal.get(item.row.externalId);

    if (!existing) {
      planned.push({ ...base, op: "insert", id: null, changes: [], hasUmpires: false });
      continue;
    }

    const changes: string[] = [];

    if (existing.division_id !== payload.division_id) {
      changes.push(
        `Division: ${divisionName.get(existing.division_id) ?? "?"} \u2192 ${divisionName.get(payload.division_id) ?? "?"}`
      );
    }
    if (
      (existing.home_team_id ?? null) !== payload.home_team_id ||
      (existing.home_label ?? null) !== payload.home_label
    ) {
      changes.push(`Home team: ${existingSideText(existing, "home")} \u2192 ${teamText(item.home)}`);
    }
    if (
      (existing.away_team_id ?? null) !== payload.away_team_id ||
      (existing.away_label ?? null) !== payload.away_label
    ) {
      changes.push(`Away team: ${existingSideText(existing, "away")} \u2192 ${teamText(item.away)}`);
    }
    if (existing.location_id !== payload.location_id) {
      changes.push(
        `Field: ${locationName.get(existing.location_id) ?? "?"} \u2192 ${newLocationText}`
      );
    }
    if (
      Date.parse(existing.starts_at) !== Date.parse(payload.starts_at) ||
      Date.parse(existing.ends_at) !== Date.parse(payload.ends_at)
    ) {
      changes.push(
        `Time: ${formatDate(existing.starts_at)}, ${formatTime(existing.starts_at)} - ${formatTime(existing.ends_at)} \u2192 ${formatDate(payload.starts_at)}, ${formatTime(payload.starts_at)} - ${formatTime(payload.ends_at)}`
      );
    }
    if (payload.status && payload.status !== existing.status) {
      changes.push(`Status: ${existing.status} \u2192 ${payload.status}`);
    }

    if (changes.length === 0) {
      unchangedCount += 1;
      continue;
    }

    planned.push({
      ...base,
      op: "update",
      id: existing.id,
      changes,
      hasUmpires: (assignedCount.get(existing.id) ?? 0) > 0,
    });
  }

  planned.sort(
    (a, b) =>
      a.payload.starts_at.localeCompare(b.payload.starts_at) ||
      a.externalId.localeCompare(b.externalId)
  );

  // ---- games the system has, in the same days and divisions, that the file lacks
  const fileIds = new Set(gameRows.map((row) => row.externalId).filter(Boolean));
  const days: string[] = [];
  const divisionsInFile = new Set<string>();
  for (const row of gameRows) {
    const date = parseDate(row.date);
    if (date) days.push(`${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`);
    const id = settings.divisionByLabel[divisionLabel(row)];
    if (id) divisionsInFile.add(id);
  }
  days.sort();

  const missing =
    days.length === 0
      ? []
      : existingGames.filter(
          (game) =>
            game.external_game_id !== null &&
            !fileIds.has(game.external_game_id) &&
            game.status !== "canceled" &&
            divisionsInFile.has(game.division_id) &&
            localDateKey(game.starts_at) >= days[0] &&
            localDateKey(game.starts_at) <= days[days.length - 1]
        );

  problems.sort((a, b) => a.line - b.line);

  return {
    totalRows: rows.length,
    practicesSkipped,
    eventsSkipped,
    considered: gameRows.length,
    games: planned,
    newCount: planned.filter((game) => game.op === "insert").length,
    changedCount: planned.filter((game) => game.op === "update").length,
    unchangedCount,
    problems,
    newTeams,
    newLocations,
    missing,
    changedWithUmpires: planned.filter((game) => game.hasUmpires).length,
  };
}
