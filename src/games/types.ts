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
};

export type NamedOption = { id: string; name: string; is_active: boolean };
export type DivisionOption = NamedOption & { league_id: string };
export type TeamOption = NamedOption & {
  season_id: string;
  division_id: string | null;
};
export type SeasonOption = NamedOption & { starts_on: string | null };

export type Assignment = {
  game_id: string;
  position: "plate" | "field";
  umpire_id: string;
};

// Everything the Games screens need to show names and fill drop-downs.
export type GamesContext = {
  seasons: SeasonOption[];
  divisions: DivisionOption[];
  teams: TeamOption[];
  locations: NamedOption[];
  umpireNames: Map<string, string>;
};
