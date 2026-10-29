// What time is it, for the app?
//
// Normally the real time. For testing and demonstrations a PRETEND time can be
// set (see demo-clock.ts): the app then behaves as if it were that time, and the
// pretend clock keeps ticking from the moment it was set. The pretend time is
// kept for this browser only.
//
// Things that are records of real events (when something was printed or saved,
// when an invitation expires) keep using the real time on purpose.

const KEY = "rwcll-demo-clock-offset-ms";

function readOffset(): number {
  try {
    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    const value = stored === null ? 0 : Number(stored);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

let offset = readOffset();

export const appNowMs = (): number => Date.now() + offset;

export const appNow = (): Date => new Date(appNowMs());

// Is a pretend time in use?
export const demoClockActive = (): boolean => offset !== 0;

// The pretend "now", to send to the database (which only uses it if the demo
// clock is switched on there). null when no pretend time is set.
export function demoNowIso(): string | null {
  return offset === 0 ? null : appNow().toISOString();
}

export function setDemoClock(pretendNow: Date): void {
  offset = pretendNow.getTime() - Date.now();
  try {
    localStorage.setItem(KEY, String(offset));
  } catch {
    // (a browser that will not store it just forgets it on reload)
  }
}

export function clearDemoClock(): void {
  offset = 0;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // (nothing to remove)
  }
}
