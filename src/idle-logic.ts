// Signing out after a period of no activity: the decisions, without the screen.

export const DEFAULT_IDLE_MINUTES = 30;
export const MAX_IDLE_MINUTES = 480;      // 8 hours
export const WARNING_SECONDS = 60;

// The number of minutes from a setting ("30"), or the default when it is
// missing or makes no sense. 0 means "never sign out automatically".
export function parseIdleMinutes(value: string | null | undefined): number {
  if (value === null || value === undefined) return DEFAULT_IDLE_MINUTES;

  const text = value.trim();
  if (!/^\d+$/.test(text)) return DEFAULT_IDLE_MINUTES;

  const minutes = Number(text);
  if (minutes === 0) return 0;

  return minutes >= 1 && minutes <= MAX_IDLE_MINUTES ? minutes : DEFAULT_IDLE_MINUTES;
}

// Is it time to warn, to sign out, or neither? (idle and limit in milliseconds)
export type IdleStatus =
  | { kind: "active" }
  | { kind: "warning"; secondsLeft: number }
  | { kind: "expired" };

export function idleStatus(idleMs: number, limitMs: number, warningMs = WARNING_SECONDS * 1000): IdleStatus {
  if (idleMs >= limitMs) return { kind: "expired" };

  // (a very short limit gets a short warning: never more than half of it)
  const warnFrom = limitMs - Math.min(warningMs, limitMs / 2);
  if (idleMs >= warnFrom) return { kind: "warning", secondsLeft: Math.ceil((limitMs - idleMs) / 1000) };

  return { kind: "active" };
}

// The roles that are only for umpiring. Anyone with any other role can see more
// (other people's details, the whole schedule), so they count as administrators.
const UMPIRE_ONLY_ROLES = ["youth_umpire", "adult_umpire", "parent_guardian"];

export function hasAdministratorRole(roleIds: string[]): boolean {
  return roleIds.some((role) => !UMPIRE_ONLY_ROLES.includes(role));
}

export function idleNoticeText(minutes: number): string {
  return `You were signed out because the app was not used for ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}
