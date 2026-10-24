import type {
  AgeChartRecord,
  DivisionRecord,
  SeasonRecord,
  SetupRecord,
  TeamRecord,
} from "./types";

// Mutable state shared by the League Setup screens. Other files change it
// through this object (an imported variable cannot be reassigned).
export const state = {
  editingSeasonId: null as string | null,
  editingLeagueId: null as string | null,
  editingDivisionId: null as string | null,
  editingLocationId: null as string | null,
  editingTeamId: null as string | null,
  teamSeasonFilter: "",

  // Most recently loaded data, shared by the form helpers.
  ageCharts: [] as AgeChartRecord[],
  loadedSeasons: [] as SeasonRecord[],
  loadedLeagues: [] as SetupRecord[],
  loadedDivisions: [] as DivisionRecord[],
  loadedTeams: [] as TeamRecord[],
};

// The screen reloads itself after a save. The reload function is
// registered here so the form files do not need to import the main
// screen file (which would create a circular import).
type Reloader = (container: HTMLElement) => Promise<void>;
let reloader: Reloader | null = null;

export function registerReloader(fn: Reloader): void {
  reloader = fn;
}

export async function reloadSetup(container: HTMLElement): Promise<void> {
  if (!reloader) {
    throw new Error("League Setup has not been initialised.");
  }
  await reloader(container);
}
