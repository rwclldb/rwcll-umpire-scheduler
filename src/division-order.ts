// Divisions are listed youngest first: by the lowest age in their range, then
// the highest, then by name. A division with no age range goes after those that
// have one (and keeps its place among them by name).
type Ordered = {
  name: string;
  youngest_ll_age?: number | null;
  oldest_ll_age?: number | null;
};

const age = (value: number | null | undefined) =>
  value === null || value === undefined ? Number.POSITIVE_INFINITY : value;

export function compareDivisions(a: Ordered, b: Ordered): number {
  return (
    age(a.youngest_ll_age) - age(b.youngest_ll_age) ||
    age(a.oldest_ll_age) - age(b.oldest_ll_age) ||
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
}

// A new list in that order (the original is not changed).
export function sortDivisions<T extends Ordered>(divisions: T[]): T[] {
  return [...divisions].sort(compareDivisions);
}
