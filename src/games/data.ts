import { supabase } from "../supabase";
import type {
  Assignment,
  DivisionOption,
  Game,
  GamesContext,
  NamedOption,
  SeasonOption,
  TeamOption,
} from "./types";

const PAGE_SIZE = 1000;

export const GAME_COLUMNS =
  "id, season_id, division_id, game_type, home_team_id, away_team_id, " +
  "home_label, away_label, location_id, starts_at, ends_at, status, notes, " +
  "external_game_id";

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
  const [seasons, divisions, teams, locations, umpires] = await Promise.all([
    supabase.from("seasons").select("id, name, is_active, starts_on"),
    supabase.from("divisions").select("id, name, is_active, league_id").order("name"),
    fetchAll<TeamOption>((from, to) =>
      supabase
        .from("teams")
        .select("id, name, is_active, season_id, division_id")
        .order("name")
        .range(from, to)
    ),
    supabase.from("locations").select("id, name, is_active").order("name"),
    fetchAll<{ id: string; display_name: string }>((from, to) =>
      supabase.from("umpires").select("id, display_name").order("id").range(from, to)
    ),
  ]);

  const failure =
    seasons.error?.message ??
    divisions.error?.message ??
    teams.error ??
    locations.error?.message ??
    umpires.error;

  if (failure) return { context: null, error: failure };

  return {
    context: {
      seasons: (seasons.data ?? []) as SeasonOption[],
      divisions: (divisions.data ?? []) as DivisionOption[],
      teams: teams.rows,
      locations: (locations.data ?? []) as NamedOption[],
      umpireNames: new Map(umpires.rows.map((row) => [row.id, row.display_name])),
    },
    error: null,
  };
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
      .select("game_id, position, umpire_id")
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
