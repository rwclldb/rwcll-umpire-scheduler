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
// A day-of note on a game (a short log: who wrote it, and when).
export type GameNote = {
  id: string;
  game_id: string;
  author_name: string;
  body: string;
  created_at: string;
  admin_only?: boolean; // only administrators (and the writer) can read it
};

// A rainout: every game at a field in a time window was canceled, with a reason.
export type FieldClosure = {
  id: string;
  location_id: string;
  closes_from: string;
  closes_to: string;
  reason: string;
  created_by_name: string;
  created_at: string;
  reopened_at: string | null;
  reopened_by_name: string | null;
  games: number; // how many games it canceled
};

// "I'm running about 15 minutes late"
export type RunningLate = {
  game_id: string;
  umpire_id: string;
  minutes: number;
  reported_at: string;
};

// ---- reports (readable only by the umpire chief and super admins; an umpire reads their own post-game reports) ----
export type ReportFollowup = { id: string; report_id: string; author_name: string; body: string; created_at: string };

export type GameReport = {
  id: string;
  game_id: string;
  season_id: string;
  umpire_id: string;
  author_name: string;
  category: "ejection" | "protest" | "conduct" | "incident" | "other";
  body: string;
  created_at: string;
};

export type OutsideReport = {
  id: string;
  umpire_id: string;
  game_id: string | null;
  season_id: string;
  source_name: string;
  source_role: "coach" | "manager" | "parent" | "league_official" | "spectator" | "other";
  received_on: string;
  body: string;
  entered_by_name: string;
  created_at: string;
  edited_at: string | null;
};

export type ReportAuditRow = { id: string; report_kind: "game" | "outside"; report_id: string; action: string; actor_name: string; acted_at: string };

export type LocationOption = NamedOption & {
  address: string | null;
  is_league_field?: boolean; // a field this league runs, as opposed to one our teams travel to
  directions?: string | null; // parking and directions (general; anyone who can see the field list can read it)
};
export type DivisionOption = NamedOption & {
  league_id: string;
  umpires_per_game: number; // the default number of umpires a game in this division needs (0 to 4)
  tournament_umpires: number | null; // the default for tournament games; null means "the same as regular games"
  youngest_ll_age?: number | null; // the lowest age in its range (divisions are listed youngest first)
  oldest_ll_age?: number | null;
};
export type TeamOption = NamedOption & {
  season_id: string;
  division_id: string | null;
};
export type SeasonOption = NamedOption & { starts_on: string | null; ends_on?: string | null };

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

export type AssignmentStatus = "assigned" | "confirmed";

export type Assignment = {
  game_id: string;
  position: Position;
  umpire_id: string;
  // "assigned": an administrator made it and the umpire has not answered;
  // "confirmed": the umpire (or an administrator for them) confirmed it
  status: AssignmentStatus;
  self_assigned: boolean;
  confirmed_at: string | null;
  // game day: null until someone records it; "arrived" has a time (arrived_at)
  attendance?: "arrived" | "no_show" | null;
  arrived_at?: string | null;
};

// An umpire gave a place up (kept so administrators can see it was declined).
export type Decline = {
  game_id: string;
  umpire_id: string;
  position: Position;
  note: string | null;
  created_at: string;
};

// Everything the Games screens need to show names and fill drop-downs.
export type GamesContext = {
  seasons: SeasonOption[];
  divisions: DivisionOption[];
  teams: TeamOption[];
  locations: LocationOption[];
  umpireNames: Map<string, string>;
  umpires: UmpireOption[];
  // league id -> how many days before a game an unconfirmed assignment is warned about (0 = never)
  unconfirmedDays: Map<string, number>;
};
