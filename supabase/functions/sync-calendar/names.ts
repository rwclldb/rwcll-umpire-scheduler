// Turning the names in the feed into our teams, fields and divisions.
//
// Teams:  a name saved by an administrator ("this feed name is that team") wins; otherwise a team in
//         the season with the same name; otherwise a name that does not look like one of ours
//         ("PA2", "Evergreen Seniors Team") is an outside team, kept on the game by name only.
//         A name that looks like ours ("MAJ 01 - Seely-Kirk") but is not found waits for a person.
// Fields: a saved name wins; otherwise one field with the same name; otherwise one field at the same
//         street address; otherwise one field whose name starts with the feed's place name
//         ("Orion" -> "Orion School"). Anything else waits for a person.
//
// The first three helpers are the same as src/games/matching.ts (the app's spreadsheet import), copied
// here because a Supabase function can only use files inside its own folder.

export function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function divisionCoreName(name: string): string {
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

export function matchDivision(label: string, divisions: { id: string; name: string }[]): string | null {
  const cleaned = label.trim();
  const wantedCore = norm(divisionCoreName(cleaned));
  const wanted = [...new Set([norm(cleaned), wantedCore])].filter(Boolean);
  if (wanted.length === 0) return null;

  const forms = divisions.map((division) => ({
    id: division.id,
    full: norm(division.name),
    core: norm(divisionCoreName(division.name)),
  }));

  const exact = forms.filter((form) => wanted.some((text) => form.full === text || form.core === text));
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;

  if (wantedCore.length >= 3) {
    const starts = forms.filter((form) => form.core.startsWith(wantedCore) || form.full.startsWith(wantedCore));
    if (starts.length === 1) return starts[0].id;
  }
  return null;
}

// League teams are written like "MAJ 02 - Kays" or "Tee 01 - Bowen".
export function looksLikeOurTeam(name: string): boolean {
  return /^[A-Za-z]+\s+\d+\s*-\s*\S/.test(name.trim());
}

// "MAJ 02 - Kays" -> "MAJ"
export function divisionPrefix(name: string): string {
  return /^([A-Za-z]+)\s+\d+/.exec(name.trim())?.[1] ?? "";
}

// ------------------------------------------------------------------ the parts of a feed event

// "MAJ 01 - Seely-Kirk @ MAJ 02 - Kays" -> away "MAJ 01 - Seely-Kirk", home "MAJ 02 - Kays".
// null when it is not a game (a practice, or anything without exactly one " @ ").
export function readTeams(summary: string): { away: string; home: string } | null {
  const parts = summary.split(/\s+@\s+/);
  if (parts.length !== 2) return null;
  const away = parts[0].trim();
  const home = parts[1].trim();
  return away && home ? { away, home } : null;
}

export function isPractice(summary: string): boolean {
  return /\bpractice\s*$/i.test(summary.trim());
}

// "Kiwanis Field > MAJ" -> place "Kiwanis Field", diamond "MAJ"
export function readPlace(description: string, location: string): { name: string; place: string; diamond: string } {
  const name = (description || location).trim();
  const [place, ...rest] = name.split(">");
  return { name, place: place.trim(), diamond: rest.join(">").trim() };
}

// "1311 Madison Avenue,Redwood City,CA-94061 US" -> "1311 madison"; "" when there is no house number.
export function addressKey(address: string | null | undefined): string {
  const match = /(^|[\s,])(\d+[a-z]?)\s+([A-Za-z]+)/i.exec((address ?? "").trim());
  return match ? `${match[2].toLowerCase()} ${match[3].toLowerCase()}` : "";
}

// ------------------------------------------------------------------ resolving

export type TeamOption = { id: string; name: string; division_id: string | null };
export type FieldOption = { id: string; name: string; address: string | null };

export type SavedName = {
  kind: "team" | "field";
  feed_key: string;
  team_id: string | null;
  location_id: string | null;
  is_outside: boolean;
  is_ignored?: boolean;
};

export type TeamResolution =
  | { kind: "team"; team: TeamOption; how: "saved" | "same name" }
  | { kind: "outside"; how: "saved" | "outside team" }
  | { kind: "ignored" }
  | { kind: "unknown" };

export type FieldResolution =
  | { kind: "field"; field: FieldOption; how: "saved" | "same name" | "address" | "start of name" }
  | { kind: "unknown" };

export function resolveTeam(name: string, teams: TeamOption[], saved: SavedName[]): TeamResolution {
  const key = norm(name);
  const kept = saved.find((row) => row.kind === "team" && row.feed_key === key);
  if (kept) {
    if (kept.is_ignored) return { kind: "ignored" };
    if (kept.is_outside) return { kind: "outside", how: "saved" };
    const team = teams.find((row) => row.id === kept.team_id);
    if (team) return { kind: "team", team, how: "saved" };
    // a saved team that is no longer in the season: fall through to the other rules
  }

  const same = teams.filter((team) => norm(team.name) === key);
  if (same.length === 1) return { kind: "team", team: same[0], how: "same name" };

  if (!looksLikeOurTeam(name)) return { kind: "outside", how: "outside team" };
  return { kind: "unknown" };
}

function onlyOne<T>(items: T[]): T | null {
  return items.length === 1 ? items[0] : null;
}

export function resolveField(
  description: string,
  location: string,
  fields: FieldOption[],
  saved: SavedName[]
): FieldResolution {
  const { name, place, diamond } = readPlace(description, location);
  const key = norm(name);

  const kept = saved.find((row) => row.kind === "field" && row.feed_key === key);
  if (kept) {
    const field = fields.find((row) => row.id === kept.location_id);
    if (field) return { kind: "field", field, how: "saved" };
  }

  const names = new Set([norm(name), norm(place), diamond ? norm(`${place} - ${diamond}`) : ""].filter(Boolean));
  const same = onlyOne(fields.filter((field) => names.has(norm(field.name))));
  if (same) return { kind: "field", field: same, how: "same name" };

  const address = addressKey(location);
  if (address) {
    const byAddress = onlyOne(fields.filter((field) => addressKey(field.address) === address));
    if (byAddress) return { kind: "field", field: byAddress, how: "address" };
  }

  const start = norm(place);
  if (start.length >= 4) {
    const byStart = onlyOne(fields.filter((field) => norm(field.name).startsWith(start)));
    if (byStart) return { kind: "field", field: byStart, how: "start of name" };
  }

  return { kind: "unknown" };
}
