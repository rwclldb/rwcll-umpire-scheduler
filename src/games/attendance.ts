import { formatTime } from "./format";

// Game day: who showed up.
//
// An umpire can check in from 1 hour before the game starts until it ends (the
// database enforces the same rule). "Late" is not stored: an umpire is late when
// they arrived after the scheduled start of the game.

export const CHECK_IN_LEAD_MINUTES = 60;

export type AttendanceValue = "arrived" | "no_show" | null | undefined;

// Whole minutes after the scheduled start that someone arrived (0 if on time or
// early; never less than 1 if they were even a little late).
export function lateMinutes(startsAt: string, arrivedAt: string): number {
  const diff = Date.parse(arrivedAt) - Date.parse(startsAt);
  return diff > 0 ? Math.max(1, Math.round(diff / 60_000)) : 0;
}

// "Arrived 8:52 AM", or "Arrived 9:12 AM \u00b7 12 min late"
export function arrivedText(startsAt: string, arrivedAt: string, word = "Arrived"): string {
  const late = lateMinutes(startsAt, arrivedAt);
  return `${word} ${formatTime(arrivedAt)}${late > 0 ? ` \u00b7 ${late} min late` : ""}`;
}

export type CheckInState =
  | { kind: "early"; opensAt: string }          // too soon: it opens at this time
  | { kind: "open"; markedNoShow: boolean }     // the umpire can check in now
  | { kind: "done"; arrivedAt: string }         // already checked in (or marked arrived)
  | { kind: "over"; noShow: boolean }           // the game is over and nothing was recorded
  | { kind: "closed" };                         // canceled or completed: nothing to do

export function checkInState(
  game: { starts_at: string; ends_at: string; status: string },
  assignment: { attendance?: AttendanceValue; arrived_at?: string | null },
  now: Date
): CheckInState {
  if (game.status === "canceled") return { kind: "closed" };

  if (assignment.attendance === "arrived" && assignment.arrived_at) {
    return { kind: "done", arrivedAt: assignment.arrived_at };
  }

  if (game.status === "completed") return { kind: "closed" };

  const start = Date.parse(game.starts_at);
  const end = Date.parse(game.ends_at);
  const time = now.getTime();

  if (time > end) return { kind: "over", noShow: assignment.attendance === "no_show" };

  const opens = start - CHECK_IN_LEAD_MINUTES * 60_000;
  if (time < opens) return { kind: "early", opensAt: new Date(opens).toISOString() };

  // (an umpire an administrator marked as a no-show can still check in)
  return { kind: "open", markedNoShow: assignment.attendance === "no_show" };
}
