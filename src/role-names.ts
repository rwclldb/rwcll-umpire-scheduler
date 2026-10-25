// Readable names for the roles a person holds.

// Most important first, so a person's roles always read in the same order.
const ORDER = [
  "super_admin",
  "umpire_chief",
  "scheduler",
  "treasurer",
  "feedback_reviewer",
  "read_only_admin",
  "adult_umpire",
  "youth_umpire",
  "parent_guardian",
];

// "umpire_chief" becomes "Umpire chief".
export function roleName(roleId: string): string {
  const text = roleId.replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Scheduler, Adult umpire": the roles in order of importance, each once.
// An empty text means the person holds no role.
export function describeRoles(roleIds: string[]): string {
  const unique = [...new Set(roleIds)];
  const rank = (id: string) => {
    const index = ORDER.indexOf(id);
    return index === -1 ? ORDER.length : index;
  };

  return unique
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(roleName)
    .join(", ");
}
