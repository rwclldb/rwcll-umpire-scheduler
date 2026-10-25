// Creating a season, its divisions and its teams from the registration
// system's spreadsheets, WITHOUT changing anything: the files and the
// administrator's choices go in, and a plan comes out (what would be created,
// what already exists, and anything wrong). The plan is shown as a preview and
// then, when approved, sent to the database in one go.

import { parseDate } from "../games/calendar";
import { divisionCoreName, matchDivision, norm } from "../games/matching";

// ------------------------------------------------------------------- reading

export type TeamRow = {
  line: number;
  program: string;
  division: string;
  team: string;
  code: string;
};

export type DivisionRow = {
  line: number;
  program: string;
  division: string;
  expectedTeams: number | null;
  startsOn: string | null; // "2026-08-30"
  endsOn: string | null;
};

// Collapses runs of spaces and removes spaces at the ends.
export function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function headingIndex(headers: string[], aliases: string[]): number | null {
  const normalized = headers.map((header) => norm(header));
  for (const alias of aliases) {
    const index = normalized.indexOf(alias);
    if (index !== -1) return index;
  }
  return null;
}

// "08/30/2026 12:00:00 AM" becomes "2026-08-30".
function dateOnly(text: string): string | null {
  const date = parseDate(text.trim().split(/\s+/)[0] ?? "");
  return date
    ? `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
    : null;
}

export type ReadResult<T> = { rows: T[]; missing: string[] };

// The "Team Detail" file: one row per team.
export function readTeamDetail(table: string[][]): ReadResult<TeamRow> {
  const headers = table[0] ?? [];
  const program = headingIndex(headers, ["programname", "program", "seasonname", "season"]);
  const division = headingIndex(headers, ["divisionname", "division", "groupname", "group"]);
  const team = headingIndex(headers, ["teamname", "team"]);
  const code = headingIndex(headers, ["teamcode", "code"]);

  const missing: string[] = [];
  if (division === null) missing.push("Division Name");
  if (team === null) missing.push("Team Name");
  if (missing.length) return { rows: [], missing };

  const cell = (row: string[], index: number | null) =>
    index === null ? "" : (row[index] ?? "");

  return {
    missing,
    rows: table.slice(1).map((row, i) => ({
      line: i + 2,
      program: clean(cell(row, program)),
      division: clean(cell(row, division)),
      team: clean(cell(row, team)),
      code: clean(cell(row, code)),
    })),
  };
}

// The "Division Details" file: one row per division.
export function readDivisionDetails(table: string[][]): ReadResult<DivisionRow> {
  const headers = table[0] ?? [];
  const program = headingIndex(headers, ["programname", "program", "seasonname", "season"]);
  const division = headingIndex(headers, ["divisionname", "division", "groupname", "group"]);
  const expected = headingIndex(headers, ["numberofteams", "teamcount", "teams"]);
  const start = headingIndex(headers, ["divisionstartdate", "startdate", "start"]);
  const end = headingIndex(headers, ["divisionenddate", "enddate", "end"]);

  if (division === null) return { rows: [], missing: ["Division Name"] };

  const cell = (row: string[], index: number | null) =>
    index === null ? "" : (row[index] ?? "");

  return {
    missing: [],
    rows: table.slice(1).map((row, i) => {
      const count = Number.parseInt(cell(row, expected), 10);
      return {
        line: i + 2,
        program: clean(cell(row, program)),
        division: clean(cell(row, division)),
        expectedTeams: Number.isFinite(count) ? count : null,
        startsOn: dateOnly(cell(row, start)),
        endsOn: dateOnly(cell(row, end)),
      };
    }),
  };
}

// ------------------------------------------------------------------ settings

export type SeasonChoice =
  | { kind: "new"; name: string; startsOn: string; endsOn: string }
  | { kind: "existing"; id: string };

export type DivisionChoice = {
  include: boolean;
  target: { kind: "existing"; id: string } | { kind: "new"; name: string };
};

export type SeasonImportSettings = {
  leagueId: string;
  program: string;
  season: SeasonChoice;
  divisions: Record<string, DivisionChoice>; // key: normalized division name in the file
  skipTeams: Record<string, boolean>; // key: the team's line number in the file
};

export type SeasonImportContext = {
  leagues: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  divisions: { id: string; name: string; league_id: string }[];
  teams: {
    id: string;
    name: string;
    season_id: string;
    league_id: string;
    division_id: string | null;
  }[];
};

export type FileRows = { teams: TeamRow[]; divisions: DivisionRow[] };

function inProgram(row: { program: string }, program: string): boolean {
  return program === "" || row.program === "" || norm(row.program) === norm(program);
}

// The different programs (seasons) named in the files.
export function programsIn(files: FileRows): string[] {
  const seen = new Map<string, string>();
  for (const row of [...files.teams, ...files.divisions]) {
    if (row.program && !seen.has(norm(row.program))) seen.set(norm(row.program), row.program);
  }
  return [...seen.values()];
}

// The divisions in the files, once each, with how many teams each has.
export type FileDivision = {
  key: string;
  name: string;
  teams: number;
  expected: number | null;
  startsOn: string | null;
  endsOn: string | null;
};

export function divisionsIn(files: FileRows, program: string): FileDivision[] {
  const map = new Map<string, FileDivision>();

  const entry = (name: string): FileDivision | null => {
    const key = norm(name);
    if (!key) return null;
    let found = map.get(key);
    if (!found) {
      found = { key, name, teams: 0, expected: null, startsOn: null, endsOn: null };
      map.set(key, found);
    }
    return found;
  };

  for (const row of files.divisions.filter((r) => inProgram(r, program))) {
    const found = entry(row.division);
    if (!found) continue;
    found.expected = row.expectedTeams;
    found.startsOn = row.startsOn;
    found.endsOn = row.endsOn;
  }

  for (const row of files.teams.filter((r) => inProgram(r, program))) {
    const found = entry(row.division);
    if (found && row.team) found.teams += 1;
  }

  return [...map.values()];
}

// Season dates suggested by the division dates: the earliest start, and the
// latest end that is within a year of it. An end date more than a year after
// the start is almost certainly a typing slip, so it is ignored and mentioned.
export function suggestDates(divisions: FileDivision[]): {
  startsOn: string;
  endsOn: string;
  ignored: string[];
} {
  const starts = divisions.map((d) => d.startsOn).filter((d): d is string => !!d).sort();
  const startsOn = starts[0] ?? "";
  if (!startsOn) return { startsOn: "", endsOn: "", ignored: [] };

  const limit = new Date(`${startsOn}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 366);
  const limitText = limit.toISOString().slice(0, 10);

  const ignored: string[] = [];
  const ends: string[] = [];
  for (const division of divisions) {
    if (!division.endsOn) continue;
    if (division.endsOn > limitText) {
      ignored.push(
        `The end date ${division.endsOn} for ${division.name} was ignored: it is more than a year after the start, so it is probably a typing slip.`
      );
    } else {
      ends.push(division.endsOn);
    }
  }

  ends.sort();
  return { startsOn, endsOn: ends[ends.length - 1] ?? "", ignored };
}

// The matches to start from. Everything can be changed before importing.
export function defaultSeasonSettings(
  files: FileRows,
  context: SeasonImportContext,
  leagueId: string,
  chosenProgram?: string
): SeasonImportSettings {
  const program = chosenProgram ?? programsIn(files)[0] ?? "";
  const fileDivisions = divisionsIn(files, program);
  const leagueDivisions = context.divisions.filter((d) => d.league_id === leagueId);

  const divisions: Record<string, DivisionChoice> = {};
  for (const division of fileDivisions) {
    const match = matchDivision(division.name, leagueDivisions);
    divisions[division.key] = {
      // Other organizations' practice groups are not teams that need umpires.
      include: !/external/i.test(division.name),
      target: match
        ? { kind: "existing", id: match }
        : { kind: "new", name: divisionCoreName(division.name) || division.name },
    };
  }

  const sameName = context.seasons.find((season) => norm(season.name) === norm(program));
  const dates = suggestDates(fileDivisions.filter((d) => divisions[d.key]?.include));

  return {
    leagueId,
    program,
    season: sameName
      ? { kind: "existing", id: sameName.id }
      : { kind: "new", name: program, startsOn: dates.startsOn, endsOn: dates.endsOn },
    divisions,
    skipTeams: {},
  };
}

// ---------------------------------------------------------------------- plan

export type PlanDivision = {
  key: string;
  fileName: string;
  teams: number;
  expected: number | null;
  include: boolean;
  status: "existing" | "new" | "skipped";
  targetName: string;
};

export type PlanTeam = {
  line: number;
  name: string;
  fileDivision: string;
  divisionName: string;
  status: "new" | "exists" | "skipped";
  note: string;
};

export type SeasonPlan = {
  season: {
    kind: "new" | "existing";
    id: string | null;
    name: string;
    startsOn: string;
    endsOn: string;
  };
  divisions: PlanDivision[];
  teams: PlanTeam[];
  newDivisions: { id: string; name: string }[];
  newTeams: { id: string; name: string; divisionId: string }[];
  existingTeams: number;
  skippedTeams: number;
  notInFile: string[];
  problems: string[]; // these stop the import
  warnings: string[]; // these are worth reading but do not stop it
};

const MAX_NAME = 100;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function buildSeasonPlan(input: {
  files: FileRows;
  settings: SeasonImportSettings;
  context: SeasonImportContext;
  newId: () => string;
}): SeasonPlan {
  const { files, settings, context, newId } = input;
  const problems: string[] = [];
  const warnings: string[] = [];

  // ---- the league
  const leagueDivisions = context.divisions.filter((d) => d.league_id === settings.leagueId);
  if (!context.leagues.some((league) => league.id === settings.leagueId)) {
    problems.push("Choose the league these divisions and teams belong to.");
  }

  // ---- the season
  let seasonInfo: SeasonPlan["season"];
  let existingSeasonId: string | null = null;

  if (settings.season.kind === "existing") {
    const wanted = settings.season.id;
    const existing = context.seasons.find((season) => season.id === wanted);
    if (!existing) problems.push("The season you chose could not be found.");
    existingSeasonId = existing?.id ?? null;
    seasonInfo = { kind: "existing", id: existingSeasonId, name: existing?.name ?? "", startsOn: "", endsOn: "" };
  } else {
    const name = clean(settings.season.name);
    const { startsOn, endsOn } = settings.season;

    if (!name) problems.push("The season needs a name.");
    else if (name.length > MAX_NAME) problems.push(`The season name is too long (the limit is ${MAX_NAME} letters).`);
    else if (context.seasons.some((s) => norm(s.name) === norm(name))) {
      problems.push(`A season called "${name}" already exists. Choose it from the list to add teams to it, or give this one a different name.`);
    }

    if (startsOn && !ISO_DATE.test(startsOn)) problems.push("The season start date is not a date.");
    if (endsOn && !ISO_DATE.test(endsOn)) problems.push("The season end date is not a date.");
    if (ISO_DATE.test(startsOn) && ISO_DATE.test(endsOn) && endsOn < startsOn) {
      problems.push("The season ends before it starts.");
    }

    seasonInfo = { kind: "new", id: null, name, startsOn, endsOn };
  }

  // ---- the divisions
  const fileDivisions = divisionsIn(files, settings.program);
  const newDivisions: SeasonPlan["newDivisions"] = [];
  const divisionTarget = new Map<string, { id: string; name: string }>(); // file key -> target
  const planDivisions: PlanDivision[] = [];
  const newNames = new Map<string, string>(); // normalized new name -> first file division using it

  for (const division of fileDivisions) {
    const choice = settings.divisions[division.key];
    const include = choice ? choice.include : true;
    const target = choice?.target ?? { kind: "new" as const, name: divisionCoreName(division.name) || division.name };

    if (!include) {
      planDivisions.push({
        key: division.key, fileName: division.name, teams: division.teams,
        expected: division.expected, include: false, status: "skipped", targetName: "",
      });
      continue;
    }

    if (target.kind === "existing") {
      const found = leagueDivisions.find((d) => d.id === target.id);
      if (!found) {
        problems.push(`The division you chose for "${division.name}" is not in this league.`);
      } else {
        divisionTarget.set(division.key, { id: found.id, name: found.name });
      }
      planDivisions.push({
        key: division.key, fileName: division.name, teams: division.teams,
        expected: division.expected, include: true, status: "existing", targetName: found?.name ?? "",
      });
      continue;
    }

    const name = clean(target.name);
    if (!name) {
      problems.push(`The new division for "${division.name}" needs a name.`);
    } else if (name.length > MAX_NAME) {
      problems.push(`The division name "${name}" is too long (the limit is ${MAX_NAME} letters).`);
    } else if (leagueDivisions.some((d) => norm(d.name) === norm(name))) {
      problems.push(`A division called "${name}" already exists in this league. Choose it from the list instead of creating it again.`);
    } else if (newNames.has(norm(name))) {
      problems.push(`Two divisions in the file would both be created as "${name}". Give one of them a different name, or choose an existing division.`);
    } else {
      newNames.set(norm(name), division.name);
      const id = newId();
      newDivisions.push({ id, name });
      divisionTarget.set(division.key, { id, name });
    }

    planDivisions.push({
      key: division.key, fileName: division.name, teams: division.teams,
      expected: division.expected, include: true, status: "new", targetName: name,
    });
  }

  // ---- the teams
  const teamRows = files.teams.filter((row) => inProgram(row, settings.program));
  const seasonTeams = existingSeasonId
    ? context.teams.filter((t) => t.season_id === existingSeasonId && t.league_id === settings.leagueId)
    : [];
  const existingByName = new Map(seasonTeams.map((t) => [norm(t.name), t]));

  const planTeams: PlanTeam[] = [];
  const newTeams: SeasonPlan["newTeams"] = [];
  const linesByKey = new Map<string, number[]>();
  const seenInFile = new Set<string>();
  let existingTeams = 0;
  let skippedTeams = 0;

  // which team names are used more than once among the teams that would be imported
  for (const row of teamRows) {
    const target = divisionTarget.get(norm(row.division));
    if (!row.team || !target || settings.skipTeams[String(row.line)]) continue;
    const key = norm(row.team);
    linesByKey.set(key, [...(linesByKey.get(key) ?? []), row.line]);
  }

  for (const row of teamRows) {
    const key = norm(row.team);
    const target = divisionTarget.get(norm(row.division));
    const base = { line: row.line, name: row.team, fileDivision: row.division };

    if (!row.team) {
      warnings.push(`Line ${row.line}: a row with no team name was skipped.`);
      continue;
    }
    seenInFile.add(key);

    if (!target || settings.skipTeams[String(row.line)]) {
      skippedTeams += 1;
      planTeams.push({
        ...base, divisionName: target?.name ?? "", status: "skipped",
        note: !target ? "its division is not being imported" : "left out",
      });
      continue;
    }

    if ((linesByKey.get(key)?.length ?? 0) > 1) {
      problems.push(`The team "${row.team}" appears more than once (lines ${linesByKey.get(key)!.join(", ")}). Untick all but one.`);
    }
    if (row.team.length > MAX_NAME) {
      problems.push(`The team name "${row.team}" is too long (the limit is ${MAX_NAME} letters).`);
    }

    const note = /-\s*$/.test(row.team) ? "no coach name yet" : "";
    const existing = existingByName.get(key);

    if (existing) {
      existingTeams += 1;
      if (existing.division_id && existing.division_id !== target.id) {
        warnings.push(`"${existing.name}" is already in this season in a different division than the file puts it in. It was left as it is.`);
      }
      planTeams.push({ ...base, divisionName: target.name, status: "exists", note: "already in this season" });
      continue;
    }

    if (!linesByKey.get(key) || linesByKey.get(key)![0] === row.line) {
      newTeams.push({ id: newId(), name: row.team, divisionId: target.id });
    }
    planTeams.push({ ...base, divisionName: target.name, status: "new", note });
  }

  // ---- cross-checks and hints
  // (only meaningful when there IS a team file to compare against)
  const haveTeamFile = teamRows.length > 0;
  for (const division of planDivisions) {
    if (haveTeamFile && division.include && division.expected !== null && division.expected !== division.teams) {
      warnings.push(`${division.fileName}: the division file expects ${division.expected} teams but the team file has ${division.teams}.`);
    }
  }

  const unfinished = planTeams.filter((t) => t.status === "new" && t.note === "no coach name yet");
  if (unfinished.length) {
    warnings.push(
      `${unfinished.length} ${unfinished.length === 1 ? "team has" : "teams have"} no coach name yet (${unfinished.map((t) => t.name).join(", ")}). They will be created with the name as it is; untick them to leave them out.`
    );
  }

  const notInFile = seasonTeams.filter((t) => !seenInFile.has(norm(t.name))).map((t) => t.name);
  if (notInFile.length) {
    warnings.push(`${notInFile.length} ${notInFile.length === 1 ? "team" : "teams"} already in this season ${notInFile.length === 1 ? "is" : "are"} not in the file. They have not been touched.`);
  }

  const dates = suggestDates(fileDivisions.filter((d) => settings.divisions[d.key]?.include !== false));
  if (settings.season.kind === "new") warnings.push(...dates.ignored);

  return {
    season: seasonInfo,
    divisions: planDivisions,
    teams: planTeams,
    newDivisions,
    newTeams,
    existingTeams,
    skippedTeams,
    notInFile,
    problems,
    warnings,
  };
}
