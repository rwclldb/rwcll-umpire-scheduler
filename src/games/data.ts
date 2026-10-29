import { supabase } from "../supabase";
import { sortDivisions } from "../division-order";
import { groupAvailability } from "./availability";
import type { PatternRow, UmpireAvailability } from "./availability";
import { combineContacts } from "./contacts";
import type { ContactNumbers } from "./contacts";
import type {
  Assignment,
  DivisionOption,
  Game,
  GamesContext,
  LocationOption,
  SeasonOption,
  TeamOption,
  Decline,
  UmpireOption,
} from "./types";

const PAGE_SIZE = 1000;

export const GAME_COLUMNS =
  "id, season_id, division_id, game_type, home_team_id, away_team_id, " +
  "home_label, away_label, location_id, starts_at, ends_at, status, notes, " +
  "external_game_id, umpires_needed";

// The database sends at most 1,000 rows per request, so longer lists are
// read in pages until there are no more.
export async function fetchAll<T>(
  read: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await read(from, from + PAGE_SIZE - 1);
    if (error) return { rows: [], error: error.message };

    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return { rows, error: null };
}

// Seasons, divisions, teams, fields and umpire names: what the Games screens
// need to show names and to fill the drop-down lists.
export async function loadContext(): Promise<{
  context: GamesContext | null;
  error: string | null;
}> {
  const [seasons, divisions, teams, locations, umpires, leagues] = await Promise.all([
    supabase.from("seasons").select("id, name, is_active, starts_on"),
    supabase.from("divisions").select("id, name, is_active, league_id, umpires_per_game, tournament_umpires, youngest_ll_age, oldest_ll_age").order("name"),
    fetchAll<TeamOption>((from, to) =>
      supabase
        .from("teams")
        .select("id, name, is_active, season_id, division_id")
        .order("name")
        .range(from, to)
    ),
    supabase.from("locations").select("id, name, is_active, address, is_league_field").order("name"),
    fetchAll<{ id: string; display_name: string; classification: string; eligibility_status: string }>((from, to) =>
      supabase
        .from("umpires")
        .select("id, display_name, classification, eligibility_status")
        .order("id")
        .range(from, to)
    ),
    supabase.from("leagues").select("id, unconfirmed_warning_days"),
  ]);

  const failure =
    seasons.error?.message ??
    divisions.error?.message ??
    teams.error ??
    locations.error?.message ??
    umpires.error ??
    leagues.error?.message;

  if (failure) return { context: null, error: failure };

  return {
    context: {
      seasons: (seasons.data ?? []) as SeasonOption[],
      // youngest division first (by the lowest age in its range)
      divisions: sortDivisions((divisions.data ?? []) as DivisionOption[]).map((division) => ({
        ...division,
        umpires_per_game: division.umpires_per_game ?? 2,
        tournament_umpires: division.tournament_umpires ?? null,
      })),
      teams: teams.rows,
      locations: (locations.data ?? []) as LocationOption[],
      // (the row type is written out, so this line never depends on how the
      // database client's types happen to be inferred)
      umpireNames: new Map<string, string>(
        umpires.rows.map(
          (row: { id: string; display_name: string }): [string, string] => [
            row.id,
            row.display_name,
          ]
        )
      ),
      umpires: umpires.rows.map(
        (row): UmpireOption => ({
          id: row.id,
          name: row.display_name,
          classification: row.classification === "youth" ? "youth" : "adult",
          eligibility:
            row.eligibility_status === "inactive" || row.eligibility_status === "suspended"
              ? row.eligibility_status
              : "active",
        })
      ),
      unconfirmedDays: new Map(
        ((leagues.data ?? []) as { id: string; unconfirmed_warning_days: number | null }[]).map(
          (row): [string, number] => [row.id, row.unconfirmed_warning_days ?? 7]
        )
      ),
    },
    error: null,
  };
}

const ASSIGNMENT_COLUMNS = "game_id, position, umpire_id, status, self_assigned, confirmed_at, attendance, arrived_at";

// Places umpires have given up (newest first). Only administrators can read
// this; if it cannot be read the answer is simply "none", because it only adds
// a hint to the list.
export async function loadDeclines(): Promise<Decline[]> {
  const result = await fetchAll<Decline>((from, to) =>
    supabase
      .from("game_assignment_events")
      .select("game_id, umpire_id, position, note, created_at")
      .eq("event", "declined")
      .order("created_at", { ascending: false })
      .range(from, to)
  );

  return result.error ? [] : result.rows;
}

// All the games of one season, and the umpire assignments for them.
export async function loadSeasonGames(seasonId: string): Promise<{
  games: Game[];
  assignments: Assignment[];
  error: string | null;
}> {
  const games = await fetchAll<Game>((from, to) =>
    supabase
      .from("games")
      .select(GAME_COLUMNS)
      .eq("season_id", seasonId)
      .order("starts_at")
      .range(from, to)
  );

  if (games.error) return { games: [], assignments: [], error: games.error };

  const assignments = await fetchAll<Assignment>((from, to) =>
    supabase
      .from("game_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .order("game_id")
      .order("position")
      .range(from, to)
  );

  if (assignments.error) {
    return { games: [], assignments: [], error: assignments.error };
  }

  const ids = new Set(games.rows.map((game) => game.id));

  return {
    games: games.rows,
    assignments: assignments.rows.filter((row) => ids.has(row.game_id)),
    error: null,
  };
}

// Every game that starts within a stretch of time (for example one month), with
// the umpires assigned to them. Used by the field board and its calendar.
export async function loadGamesBetween(fromIso: string, toIso: string): Promise<{
  games: Game[];
  assignments: Assignment[];
  error: string | null;
}> {
  const games = await fetchAll<Game>((from, to) =>
    supabase
      .from("games")
      .select(GAME_COLUMNS)
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso)
      .order("starts_at")
      .range(from, to)
  );

  if (games.error) return { games: [], assignments: [], error: games.error };

  const assignments: Assignment[] = [];
  const ids = games.rows.map((game) => game.id);

  for (let start = 0; start < ids.length; start += 100) {
    const group = ids.slice(start, start + 100);
    const page = await fetchAll<Assignment>((from, to) =>
      supabase
        .from("game_assignments")
        .select(ASSIGNMENT_COLUMNS)
        .in("game_id", group)
        .order("game_id")
        .order("position")
        .range(from, to)
    );

    if (page.error) return { games: [], assignments: [], error: page.error };
    assignments.push(...page.rows);
  }

  return { games: games.rows, assignments, error: null };
}

// An entry of availability, as the editing screen shows it: a time the umpire
// can umpire ("available") or a time they cannot ("unavailable").
export type AvailabilityRow = {
  id: string;
  umpire_id: string;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  kind: "available" | "unavailable";
};

const AVAILABILITY_COLUMNS = "id, umpire_id, starts_at, ends_at, notes, kind";
const PATTERN_COLUMNS = "id, umpire_id, season_id, weekdays, start_time, end_time, starts_on, notes";

// Everything every umpire has entered that is still to come, by umpire: their
// one-off times, their "I can't" times, and their repeating times turned into
// dates. Only administrators can read other umpires' entries. If it cannot be
// read the answer is null (not "nobody has entered any"), so the screens show
// no hints rather than wrong ones.
export async function loadAvailability(): Promise<Map<string, UmpireAvailability> | null> {
  const [rows, patterns, seasons] = await Promise.all([
    fetchAll<AvailabilityRow>((from, to) =>
      supabase
        .from("umpire_availability")
        .select(AVAILABILITY_COLUMNS)
        .gt("ends_at", new Date().toISOString())
        .order("starts_at")
        .range(from, to)
    ),
    fetchAll<PatternRow>((from, to) =>
      supabase
        .from("umpire_availability_patterns")
        .select(PATTERN_COLUMNS)
        .order("starts_on")
        .range(from, to)
    ),
    supabase.from("seasons").select("id, ends_on"),
  ]);

  if (rows.error || patterns.error || seasons.error) return null;

  const seasonEnds = new Map(
    ((seasons.data ?? []) as { id: string; ends_on: string | null }[]).map((season) => [season.id, season.ends_on])
  );

  return groupAvailability(rows.rows, patterns.rows, seasonEnds);
}

// One umpire's one-off and "I can't" entries still to come (soonest first),
// for the editing screen.
export async function loadUmpireAvailability(umpireId: string): Promise<{
  rows: AvailabilityRow[];
  error: string | null;
}> {
  const result = await fetchAll<AvailabilityRow>((from, to) =>
    supabase
      .from("umpire_availability")
      .select(AVAILABILITY_COLUMNS)
      .eq("umpire_id", umpireId)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at")
      .range(from, to)
  );

  return { rows: result.rows, error: result.error };
}

// One umpire's repeating times, for the editing screen.
export async function loadUmpirePatterns(umpireId: string): Promise<{
  rows: PatternRow[];
  error: string | null;
}> {
  const result = await fetchAll<PatternRow>((from, to) =>
    supabase
      .from("umpire_availability_patterns")
      .select(PATTERN_COLUMNS)
      .eq("umpire_id", umpireId)
      .order("starts_on")
      .range(from, to)
  );

  return { rows: result.rows, error: result.error };
}

// The seasons a repeating time can belong to (it ends when its season does).
export type AvailabilitySeason = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

export async function loadSeasonOptions(): Promise<{
  seasons: AvailabilitySeason[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, starts_on, ends_on, is_active")
    .order("starts_on", { ascending: false });

  return { seasons: (data ?? []) as AvailabilitySeason[], error: error?.message ?? null };
}

// The games with these ids (asked for in groups of 100 so each request stays short).
export async function loadGamesByIds(ids: string[]): Promise<{ games: Game[]; error: string | null }> {
  const unique = [...new Set(ids)];
  const games: Game[] = [];

  for (let start = 0; start < unique.length; start += 100) {
    const group = unique.slice(start, start + 100);
    const page = await fetchAll<Game>((from, to) =>
      supabase.from("games").select(GAME_COLUMNS).in("id", group).order("starts_at").range(from, to)
    );

    if (page.error) return { games: [], error: page.error };
    games.push(...page.rows);
  }

  return { games, error: null };
}

// The phone numbers of these umpires, for a printed schedule: the account's
// phone (else the one on the umpire record) and, for a youth umpire, the
// emergency contact's. Only scheduling administrators can read these, and this
// is called only when someone asks to print with phone numbers.
export async function loadContactNumbers(umpireIds: string[]): Promise<{
  contacts: Map<string, ContactNumbers>;
  error: string | null;
}> {
  const ids = [...new Set(umpireIds)];
  const contacts = new Map<string, ContactNumbers>();

  // Asked for in groups of 100 so each request stays short.
  for (let start = 0; start < ids.length; start += 100) {
    const group = ids.slice(start, start + 100);

    const umpires = await supabase
      .from("umpires")
      .select("id, profile_id, phone, classification")
      .in("id", group);
    if (umpires.error) return { contacts: new Map(), error: umpires.error.message };

    const rows = (umpires.data ?? []) as {
      id: string;
      profile_id: string | null;
      phone: string | null;
      classification: string;
    }[];

    const profileIds = rows.map((row) => row.profile_id).filter((id): id is string => Boolean(id));
    const youthIds = rows.filter((row) => row.classification === "youth").map((row) => row.id);

    const accounts = profileIds.length
      ? await supabase.from("account_contact").select("profile_id, phone").in("profile_id", profileIds)
      : { data: [], error: null };
    if (accounts.error) return { contacts: new Map(), error: accounts.error.message };

    const parents = youthIds.length
      ? await supabase
          .from("umpire_private_details")
          .select("umpire_id, emergency_contact_phone")
          .in("umpire_id", youthIds)
      : { data: [], error: null };
    if (parents.error) return { contacts: new Map(), error: parents.error.message };

    const accountPhones = new Map(
      ((accounts.data ?? []) as { profile_id: string; phone: string | null }[]).map(
        (row): [string, string | null] => [row.profile_id, row.phone]
      )
    );
    const parentPhones = new Map(
      ((parents.data ?? []) as { umpire_id: string; emergency_contact_phone: string | null }[]).map(
        (row): [string, string | null] => [row.umpire_id, row.emergency_contact_phone]
      )
    );

    for (const [id, value] of combineContacts(rows, accountPhones, parentPhones)) {
      contacts.set(id, value);
    }
  }

  return { contacts, error: null };
}

// Every game one umpire is assigned to, across all seasons. An umpire can read
// only their own assignments, so this works for the umpire themselves and for
// administrators.
export async function loadUmpireGames(umpireId: string): Promise<{
  games: Game[];
  assignments: Assignment[];
  error: string | null;
}> {
  const assignments = await fetchAll<Assignment>((from, to) =>
    supabase
      .from("game_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("umpire_id", umpireId)
      .order("game_id")
      .range(from, to)
  );

  if (assignments.error) return { games: [], assignments: [], error: assignments.error };

  // The games are asked for in groups of 100 so the request stays short.
  const ids = [...new Set(assignments.rows.map((row) => row.game_id))];
  const games: Game[] = [];

  for (let start = 0; start < ids.length; start += 100) {
    const group = ids.slice(start, start + 100);
    const page = await fetchAll<Game>((from, to) =>
      supabase
        .from("games")
        .select(GAME_COLUMNS)
        .in("id", group)
        .order("starts_at")
        .range(from, to)
    );

    if (page.error) return { games: [], assignments: [], error: page.error };
    games.push(...page.rows);
  }

  return { games, assignments: assignments.rows, error: null };
}
