// Record shapes shared by the Games screens.

export type GameStatus = "draft" | "scheduled" | "canceled" | "completed";
export type GameType = "regular" | "tournament" | "scrimmage";

export type Game = {
  id: string;
  season_id: string;
  division_id: string;
  game_type: GameType;
  home_team_id: string | null;
  away_team_id: string | null;
  home_label: string | null;
  away_label: string | null;
  location_id: string;
  starts_at: string;
  ends_at: string;
  status: GameStatus;
  notes: string | null;
  external_game_id: string | null;
  // 0 to 4 for this game; null means "use the division's default"
  umpires_needed: number | null;
};

export type NamedOption = { id: string; name: string; is_active: boolean };
export type LocationOption = NamedOption & { address: string | null };
export type DivisionOption = NamedOption & {
  league_id: string;
  umpires_per_game: number; // the default number of umpires a game in this division needs (0 to 4)
  tournament_umpires: number | null; // the default for tournament games; null means "the same as regular games"
};
export type TeamOption = NamedOption & {
  season_id: string;
  division_id: string | null;
};
export type SeasonOption = NamedOption & { starts_on: string | null };

// Where an umpire stands. A game with 1 umpire uses the plate, with 2 the plate
// and the field, with 3 the plate, first and third base, and with 4 the plate
// and all three bases.
export type Position = "plate" | "first_base" | "second_base" | "third_base" | "field";

export type UmpireOption = {
  id: string;
  name: string;
  classification: "youth" | "adult";
  eligibility: "active" | "inactive" | "suspended";
};

export type Assignment = {
  game_id: string;
  position: Position;
  umpire_id: string;
};

// Everything the Games screens need to show names and fill drop-downs.
export type GamesContext = {
  seasons: SeasonOption[];
  divisions: DivisionOption[];
  teams: TeamOption[];
  locations: LocationOption[];
  umpireNames: Map<string, string>;
  umpires: UmpireOption[];
};
