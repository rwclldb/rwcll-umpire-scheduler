// Matching the names in the spreadsheet to the league's own names.

export function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// "Games - MAJ" and "Games - MAJ-Group" both become "MAJ".
export function cleanDivisionLabel(label: string): string {
  return label
    .replace(/^\s*games?\s*[-:]\s*/i, "")
    .replace(/\s*[-:]\s*group\s*$/i, "")
    .trim();
}

// "AA (Machine Pitch)" is called "AA" and "Majors (46-60)" is called "Majors"
// once the bracketed description is taken off.
export function divisionCoreName(name: string): string {
  return name.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
}

// The division this label most likely means, or null if it is not clear.
// Names are compared as written AND without a bracketed description, on both
// sides ("Majors (46-60)" and "Majors" are the same division).
// An exact match wins. Otherwise a label of three or more letters may be the
// start of exactly one division's name ("MAJ" for "Majors", "TEE" for "Tee Ball").
export function matchDivision(
  label: string,
  divisions: { id: string; name: string }[]
): string | null {
  const cleaned = cleanDivisionLabel(label);
  const wantedCore = norm(divisionCoreName(cleaned));
  const wanted = [...new Set([norm(cleaned), wantedCore])].filter(Boolean);
  if (wanted.length === 0) return null;

  const forms = divisions.map((division) => ({
    id: division.id,
    full: norm(division.name),
    core: norm(divisionCoreName(division.name)),
  }));

  const exact = forms.filter((form) =>
    wanted.some((text) => form.full === text || form.core === text)
  );
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;

  if (wantedCore.length >= 3) {
    const starts = forms.filter(
      (form) => form.core.startsWith(wantedCore) || form.full.startsWith(wantedCore)
    );
    if (starts.length === 1) return starts[0].id;
  }

  return null;
}

// League teams are written like "MAJ 02 - Kays" or "Tee 01 - Bowen". Anything
// else (another club's name) is more likely an outside team.
export function looksLikeOurTeam(name: string): boolean {
  return /^[A-Za-z]+\s+\d+\s*-\s*\S/.test(name.trim());
}
