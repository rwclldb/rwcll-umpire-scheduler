import { appNow, demoClockActive } from "./clock";
import { escapeHtml } from "./ui";

// The time, in the top bar next to the logo, so everyone looks at the same clock. It is the APP's time:
// the pretend time when one is set (and then it says "pretend"), otherwise the real time. It is shown in
// the league's own time zone (Pacific), whatever the computer's setting.

const ZONE = "America/Los_Angeles";

export function clockParts(when: Date): { date: string; time: string } {
  const format = (options: Intl.DateTimeFormatOptions) =>
    when.toLocaleString("en-US", { timeZone: ZONE, ...options }).replace(/\u202f/g, " ");

  return {
    date: format({ weekday: "short", month: "short", day: "numeric" }),
    time: format({ hour: "numeric", minute: "2-digit" }),
  };
}

export function topbarClockHtml(when: Date, pretend: boolean): string {
  const parts = clockParts(when);

  return `<span class="topbar-clock-date">${escapeHtml(parts.date)}</span> <span class="topbar-clock-time">${escapeHtml(parts.time)}</span>${
    pretend ? ` <span class="topbar-clock-pretend">pretend</span>` : ""
  }`;
}

let timer: number | undefined;

export function stopTopbarClock(): void {
  if (timer !== undefined) window.clearInterval(timer);
  timer = undefined;
}

// Fills the clock in the top bar and keeps it right. One timer at a time; it stops by itself when the top bar goes.
export function startTopbarClock(root: HTMLElement): void {
  stopTopbarClock();

  const box = root.querySelector<HTMLElement>("#topbar-clock");
  if (!box) return;

  const draw = () => {
    if (!box.isConnected) {
      stopTopbarClock();
      return;
    }
    box.innerHTML = topbarClockHtml(appNow(), demoClockActive());
  };

  draw();
  timer = window.setInterval(draw, 10000);
}
