import { supabase } from "../supabase";
import { dateKey, parseDateKey } from "./availability";
import {
  boardCalendarHtml,
  buildDayBoard,
  dayBoardHtml,
  dayBoardPrintHtml,
  dayTitle,
  monthCounts,
  summaryText,
} from "./board-model";
import type { DayCount } from "./board-model";
import { loadContactNumbers, loadContext, loadGamesBetween } from "./data";
import { localDateKey } from "./format";
import { printHtml } from "./print";
import type { Assignment, Game, GamesContext } from "./types";
import { escapeHtml } from "../ui";
import { appNow, demoNowIso } from "../clock";

// The field board: one day's games by field, with the umpires, and a calendar
// that shows how many games there are on each day. The day is in the address
// (for example #/board/2026-10-31), so it can be bookmarked and Back works.

const KEEP_MS = 60_000;   // data is kept for a minute, so stepping between days is quick

type MonthData = { at: number; games: Game[]; assignments: Assignment[] };
const months = new Map<string, MonthData>();
let contextKept: { at: number; context: GamesContext } | null = null;

// A message to show once after the board is redrawn (for example "Arrival recorded.")
let flash = "";

async function getContext(): Promise<{ context: GamesContext | null; error: string | null }> {
  if (contextKept && Date.now() - contextKept.at < KEEP_MS) return { context: contextKept.context, error: null };

  const result = await loadContext();
  if (result.context) contextKept = { at: Date.now(), context: result.context };
  return result;
}

async function getMonth(year: number, month: number): Promise<{ data: MonthData | null; error: string | null }> {
  const key = `${year}-${month}`;
  const kept = months.get(key);
  if (kept && Date.now() - kept.at < KEEP_MS) return { data: kept, error: null };

  const result = await loadGamesBetween(new Date(year, month, 1).toISOString(), new Date(year, month + 1, 1).toISOString());
  if (result.error) return { data: null, error: result.error };

  const data = { at: Date.now(), games: result.games, assignments: result.assignments };
  months.set(key, data);
  return { data, error: null };
}

// A date from the address, or today if it is missing or is not a real date.
function chosenDay(sub: string | undefined, today: string): string {
  if (!sub || !/^\d{4}-\d{2}-\d{2}$/.test(sub)) return today;
  const parsed = parseDateKey(sub);
  return parsed && dateKey(parsed) === sub ? sub : today;
}

function shiftDay(key: string, days: number): string {
  const day = parseDateKey(key) as Date;
  return dateKey(new Date(day.getFullYear(), day.getMonth(), day.getDate() + days));
}

export async function renderBoardPage(
  container: HTMLElement,
  navigate: (address: string) => void,
  sub?: string
): Promise<void> {
  const now = appNow();
  const todayKey = dateKey(now);
  const dayKey = chosenDay(sub, todayKey);
  const day = parseDateKey(dayKey) as Date;
  let calendar = { year: day.getFullYear(), month: day.getMonth() };

  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card board-card">
        <p class="eyebrow">RWCLL &middot; FIELD BOARD</p>
        <h1>Field board</h1>

        <div class="board-controls">
          <button type="button" class="secondary-button" data-board-step="-1">&lsaquo; Previous day</button>
          <button type="button" class="secondary-button" id="board-today">Today</button>
          <button type="button" class="secondary-button" data-board-step="1">Next day &rsaquo;</button>
          <label class="board-goto">Go to
            <input id="board-date" type="date" value="${dayKey}" />
          </label>
          <button type="button" class="secondary-button" id="board-print">Print this day</button>
          <button type="button" class="secondary-button" id="board-refresh">Refresh</button>
        </div>

        <h2 id="board-title" class="board-date">${escapeHtml(dayTitle(dayKey))}</h2>
        <p id="board-summary" class="board-summary">Loading&hellip;</p>
        <p id="board-message" class="message" role="status" aria-live="polite"></p>

        <div class="board-layout">
          <details id="board-calendar-box" class="board-calendar-box">
            <summary>Calendar</summary>
            <div id="board-calendar"></div>
          </details>

          <div id="board-day"></div>
        </div>
      </section>
    </main>
  `;

  const get = <T extends HTMLElement>(id: string) => container.querySelector<T>(`#${id}`)!;
  const fail = (text: string) => {
    get<HTMLElement>("board-summary").textContent = "";
    const message = get<HTMLElement>("board-message");
    message.textContent = text;
    message.className = "message error";
  };

  // the calendar is open on a wide screen, and tucked away on a phone
  get<HTMLDetailsElement>("board-calendar-box").open = window.matchMedia("(min-width: 700px)").matches;

  const [loadedContext, loadedMonth] = await Promise.all([getContext(), getMonth(day.getFullYear(), day.getMonth())]);

  if (loadedContext.error || !loadedContext.context || loadedMonth.error || !loadedMonth.data) {
    console.error("Field board failed:", loadedContext.error ?? loadedMonth.error);
    fail("The field board could not be loaded. Refresh and try again.");
    return;
  }

  const context = loadedContext.context;
  const base = {
    divisions: context.divisions,
    teamNames: new Map(context.teams.map((team) => [team.id, team.name])),
    locations: context.locations,
    umpireNames: context.umpireNames,
    now,
  };

  const board = buildDayBoard({ ...base, games: loadedMonth.data.games, assignments: loadedMonth.data.assignments }, dayKey);
  get<HTMLElement>("board-summary").textContent = summaryText(board.summary);

  // ---- how to reach the umpires on this day's games (administrators only; if
  // they cannot be read, the board simply has no call or text links)
  const umpireIds = [...new Set(
    board.fields.flatMap((field) => field.games.flatMap((game) => game.slots.map((slot) => slot.umpireId)))
      .filter((id): id is string => Boolean(id))
  )];
  const contacts = umpireIds.length ? (await loadContactNumbers(umpireIds)).contacts : undefined;

  // ---- the day
  let dayHtml = dayBoardHtml(board, contacts);
  if (board.summary.games === 0 && board.summary.canceled === 0) {
    // offer the nearest days that do have games (within the month shown)
    const counts = monthCounts(loadedMonth.data.games, loadedMonth.data.assignments, context.divisions, now);
    const withGames = [...counts.entries()].filter(([, count]) => count.games > 0).map(([key]) => key).sort();
    const before = [...withGames].reverse().find((key) => key < dayKey);
    const after = withGames.find((key) => key > dayKey);
    const link = (key: string, text: string) =>
      `<button type="button" class="secondary-button" data-board-goto="${key}">${escapeHtml(text)}: ${escapeHtml(dayTitle(key))}</button>`;

    dayHtml = `<div class="board-none">${before ? link(before, "Previous game day") : ""}${after ? link(after, "Next game day") : ""}</div>`;
  }
  get<HTMLElement>("board-day").innerHTML = dayHtml;

  if (flash) {
    const message = get<HTMLElement>("board-message");
    message.textContent = flash;
    message.className = "message success";
    flash = "";
  }

  // ---- the calendar (any month, by its arrows)
  const drawCalendar = async () => {
    const result = await getMonth(calendar.year, calendar.month);
    if (result.error || !result.data) {
      get<HTMLElement>("board-calendar").innerHTML = `<p class="directory-empty">The calendar could not be loaded.</p>`;
      return;
    }

    const counts: Map<string, DayCount> = monthCounts(result.data.games, result.data.assignments, context.divisions, now);
    get<HTMLElement>("board-calendar").innerHTML = boardCalendarHtml(calendar.year, calendar.month, counts, dayKey, todayKey);
  };
  await drawCalendar();

  // ---- buttons
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const step = target.closest<HTMLElement>("[data-board-step]");
    if (step) return navigate(`board/${shiftDay(dayKey, Number(step.dataset.boardStep))}`);

    if (target.closest("#board-today")) return navigate(`board/${todayKey}`);

    const pick = target.closest<HTMLElement>("[data-board-day], [data-board-goto]");
    if (pick) return navigate(`board/${pick.dataset.boardDay ?? pick.dataset.boardGoto}`);

    const move = target.closest<HTMLElement>("[data-board-month]");
    if (move) {
      const moved = new Date(calendar.year, calendar.month + Number(move.dataset.boardMonth), 1);
      calendar = { year: moved.getFullYear(), month: moved.getMonth() };
      void drawCalendar();
      return;
    }

    const mark = target.closest<HTMLButtonElement>("[data-mark]");
    if (mark) {
      void recordMark(mark);
      return;
    }

    if (target.closest("#board-print")) {
      printHtml(dayBoardPrintHtml(board, new Date()));
      return;
    }

    if (target.closest("#board-refresh")) {
      months.clear();
      contextKept = null;
      void renderBoardPage(container, navigate, sub);
    }
  });

  // An administrator records an arrival, a no-show, or clears it.
  const recordMark = async (button: HTMLButtonElement) => {
    const kind = button.dataset.mark;
    const gameId = button.dataset.game as string;
    const message = get<HTMLElement>("board-message");
    const say = (text: string, type: "error" | "success" = "error") => {
      message.textContent = text;
      message.className = `message ${type}`;
    };

    // an arrival time (blank means now): the typed time, on the day of that game
    let arrivedAt: string | null = null;
    if (kind === "arrived") {
      const typed = button.closest(".board-mark-body")?.querySelector<HTMLInputElement>(".board-mark-time")?.value;
      if (typed) {
        const game = board.fields.flatMap((field) => field.games).find((item) => item.id === gameId);
        const when = new Date(`${game ? localDateKey(game.startsAt) : dayKey}T${typed}:00`);
        if (Number.isNaN(when.getTime())) return say("That time is not valid.");
        arrivedAt = when.toISOString();
      }
    }

    container.querySelectorAll<HTMLButtonElement>("[data-mark]").forEach((item) => { item.disabled = true; });

    const { error } = await supabase.rpc("admin_set_attendance", {
      p_game_id: gameId,
      p_umpire_id: button.dataset.umpire as string,
      p_attendance: kind === "clear" ? null : kind,
      p_arrived_at: arrivedAt,
      ...(demoNowIso() ? { p_now: demoNowIso() } : {}),
    });

    if (error) {
      container.querySelectorAll<HTMLButtonElement>("[data-mark]").forEach((item) => { item.disabled = false; });
      return say(`Could not record it. ${error.message}`);
    }

    months.clear();
    flash = kind === "arrived" ? "Arrival recorded." : kind === "no_show" ? "No-show recorded." : "Attendance cleared.";
    void renderBoardPage(container, navigate, sub);
  };

  get<HTMLInputElement>("board-date").addEventListener("change", (event) => {
    const value = (event.target as HTMLInputElement).value;
    if (value) navigate(`board/${value}`);
  });
}
