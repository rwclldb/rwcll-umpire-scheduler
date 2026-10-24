// Record shapes shared by the League Setup screens.

export type SetupRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

export type SeasonRecord = SetupRecord & {
  starts_on: string | null;
  ends_on: string | null;
  age_chart_id: string | null;
};

export type DivisionRecord = SetupRecord & {
  league_id: string;
  age_group: string | null;
  description: string | null;
  youngest_ll_age: number | null;
  oldest_ll_age: number | null;
};

export type LocationRecord = SetupRecord & {
  address: string | null;
  notes: string | null;
};

export type TeamRecord = SetupRecord & {
  league_id: string;
  season_id: string;
  division_id: string | null;
};

export type AgeChartRecord = {
  id: string;
  chart_year: number;
  name: string;
};

export type ChartEntry = {
  birth_month: number;
  birth_year: number;
  ll_age: number;
};
