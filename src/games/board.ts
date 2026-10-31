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
import { callAroundHtml, callAroundList } from "./call-around-model";
import { closurePreview, closureWindow, gamesToCancel, reasonText } from "./closure-model";
import { loadAccessDetails, loadAvailability, loadClosures, loadContactNumbers, loadContext, loadGameNotes, loadGamesBetween, loadRunningLate } from "./data";
import { POSITIONS, POSITION_LABEL } from "./staffing";
import type { BoardExtras } from "./board-model";
import type { Position } from "./types";
import { wireNotes } from "./game-notes";
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

// Each time the board is drawn it adds its buttons' handlers to the same
// container, so the handlers of the previous drawing are cancelled first
// (otherwise one click would be handled once for every earlier drawing).
const handlers = new WeakMap<HTMLElement, AbortController>();

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

  handlers.get(container)?.abort();
  const controller = new AbortController();
  handlers.set(container, controller);

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

    // The page has no day to show, but its buttons must still work (above all Refresh).
    container.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const step = target.closest<HTMLElement>("[data-board-step]");
      if (step) return navigate(`board/${shiftDay(dayKey, Number(step.dataset.boardStep))}`);
      if (target.closest("#board-today")) return navigate(`board/${todayKey}`);
      if (target.closest("#board-refresh")) {
        months.clear();
        contextKept = null;
        void renderBoardPage(container, navigate, sub);
      }
    }, { signal: controller.signal });

    get<HTMLInputElement>("board-date").addEventListener("change", (event) => {
      const value = (event.target as HTMLInputElement).value;
      if (value) navigate(`board/${value}`);
    });
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

  // ---- the day-of notes on these games
  const gameIds = board.fields.flatMap((field) => field.games.map((game) => game.id));
  const notes = gameIds.length ? (await loadGameNotes(gameIds)).notes : undefined;

  // ---- the extras: access details, rainouts, and who has said they are running late
  const dayStart = new Date(`${dayKey}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [access, closed, late] = await Promise.all([
    loadAccessDetails(board.fields.map((field) => field.locationId)),
    loadClosures(dayStart.toISOString(), dayEnd.toISOString()),
    loadRunningLate(gameIds),
  ]);
  const extras: BoardExtras = { access, closures: closed.closures, late };

  // ---- the day
  let dayHtml = dayBoardHtml(board, contacts, notes, extras);
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

    // When "Mark" is opened, the arrival time starts as the time it is now (the
    // pretend time, if the demo clock is in use) for a game that is today. It is
    // sent as "now" unless it is changed. For a game on another day it stays blank.
    // (This happens in the same click that opens the panel, so it can never
    // overwrite something already typed.)
    const markSummary = target.closest<HTMLElement>("details.board-mark > summary");
    if (markSummary) {
      const details = markSummary.parentElement as HTMLDetailsElement;
      const input = details.querySelector<HTMLInputElement>(".board-mark-time");
      if (!details.open && input) {
        const now = appNow();
        input.value = details.dataset.day === dateKey(now)
          ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
          : "";
        input.dataset.default = input.value;
      }
      return;
    }

    const reopen = target.closest<HTMLButtonElement>("[data-reopen]");
    if (reopen) {
      void reopenField(reopen);
      return;
    }

    const find = target.closest<HTMLButtonElement>("[data-find-game]");
    if (find) {
      void openFind(find);
      return;
    }

    const assign = target.closest<HTMLButtonElement>("[data-assign-umpire]");
    if (assign) {
      void assignUmpire(assign);
      return;
    }

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
      printHtml(dayBoardPrintHtml(board, new Date(), notes));
      return;
    }

    if (target.closest("#board-refresh")) {
      months.clear();
      contextKept = null;
      void renderBoardPage(container, navigate, sub);
    }
  }, { signal: controller.signal });

  // ---- Rainout: close a field
  const say = (text: string, type: "error" | "success" = "error") => {
    const message = get<HTMLElement>("board-message");
    message.textContent = text;
    message.className = `message ${type}`;
  };

  // what the rainout form would do right now
  const closureNow = () => {
    const form = container.querySelector<HTMLFormElement>("#closure-form");
    if (!form) return null;

    const field = board.fields.find((item) => item.locationId === form.querySelector<HTMLSelectElement>("#closure-field")!.value);
    const window = closureWindow(dayKey, form.querySelector<HTMLInputElement>("#closure-from")!.value, form.querySelector<HTMLInputElement>("#closure-to")!.value);
    const games = field && window ? gamesToCancel(field, window.from.getTime(), window.to.getTime()) : [];

    return { form, field, window, games };
  };

  const updateClosurePreview = () => {
    const now = closureNow();
    const preview = container.querySelector<HTMLElement>("#closure-preview");
    if (!now || !preview) return;
    preview.textContent = now.window ? closurePreview(now.games) : "The end time must be after the start time.";
  };

  container.addEventListener("change", (event) => {
    if ((event.target as HTMLElement).closest("#closure-form")) updateClosurePreview();
  }, { signal: controller.signal });
  container.addEventListener("input", (event) => {
    if ((event.target as HTMLElement).closest("#closure-form")) updateClosurePreview();
  }, { signal: controller.signal });
  container.addEventListener("toggle", (event) => {
    if ((event.target as HTMLElement).id === "board-closure-box") updateClosurePreview();
  }, { capture: true, signal: controller.signal });

  container.addEventListener("submit", (event) => {
    if (!(event.target as HTMLElement).closest("#closure-form")) return;
    event.preventDefault();

    const now = closureNow();
    if (!now || !now.field) return;
    if (!now.window) return say("The end time must be after the start time.");

    const choice = now.form.querySelector<HTMLSelectElement>("#closure-reason")!.value;
    const reason = reasonText(choice, now.form.querySelector<HTMLInputElement>("#closure-details")!.value);
    if (!reason) return say("Give a reason (details are needed when the reason is Other).");
    if (now.games.length === 0) return say("No games would be canceled in that time.");

    if (!window.confirm(`${now.field.name}: ${closurePreview(now.games)}\n\nReason: ${reason}\n\nCancel them?`)) return;

    now.form.querySelectorAll("button").forEach((item) => { (item as HTMLButtonElement).disabled = true; });

    void (async () => {
      const { data, error } = await supabase.rpc("close_field", {
        p_location_id: now.field!.locationId,
        p_from: now.window!.from.toISOString(),
        p_to: now.window!.to.toISOString(),
        p_reason: reason,
        ...(demoNowIso() ? { p_now: demoNowIso() } : {}),
      });

      if (error) {
        now.form.querySelectorAll("button").forEach((item) => { (item as HTMLButtonElement).disabled = false; });
        return say(`Could not close the field. ${error.message}`);
      }

      months.clear();
      flash = `Closed ${now.field!.name}: ${data} ${Number(data) === 1 ? "game" : "games"} canceled and the umpires told.`;
      void renderBoardPage(container, navigate, sub);
    })();
  }, { signal: controller.signal });

  const reopenField = async (button: HTMLButtonElement) => {
    if (!window.confirm("Reopen this field? The games it canceled will be put back, and the umpires told.")) return;

    button.disabled = true;
    const { data, error } = await supabase.rpc("reopen_closure", {
      p_closure_id: button.dataset.reopen,
      ...(demoNowIso() ? { p_now: demoNowIso() } : {}),
    });

    if (error) {
      button.disabled = false;
      return say(`Could not reopen it. ${error.message}`);
    }

    months.clear();
    flash = `Reopened: ${data} ${Number(data) === 1 ? "game" : "games"} put back and the umpires told.`;
    void renderBoardPage(container, navigate, sub);
  };

  // ---- Call-around: who could take an open place
  const openFind = async (button: HTMLButtonElement) => {
    const gameId = button.dataset.findGame as string;
    const position = button.dataset.findPosition as Position;
    const panel = container.querySelector<HTMLElement>(`[data-find-panel="${gameId}:${position}"]`)!;

    if (!panel.hidden) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    panel.innerHTML = `<p class="callaround-help">Looking for umpires&hellip;</p>`;

    const game = loadedMonth.data!.games.find((item) => item.id === gameId);
    const eligibility = await supabase.rpc("game_umpire_eligibility", { p_game_id: gameId });

    if (!game || eligibility.error) {
      panel.innerHTML = `<p class="message error">Could not look for umpires. ${escapeHtml(eligibility.error?.message ?? "")}</p>`;
      return;
    }

    const problems = new Map(
      ((eligibility.data ?? []) as { umpire_id: string; problem: string | null }[]).map((row): [string, string | null] => [row.umpire_id, row.problem])
    );

    const candidates = callAroundList({
      game,
      umpires: context.umpires,
      games: loadedMonth.data!.games,
      assignments: loadedMonth.data!.assignments,
      availability: await loadAvailability(),
      problems,
    });

    const numbers = candidates.length ? (await loadContactNumbers(candidates.map((candidate) => candidate.umpireId))).contacts : new Map();
    panel.innerHTML = callAroundHtml(gameId, position, candidates, numbers);
  };

  const assignUmpire = async (button: HTMLButtonElement) => {
    const gameId = button.dataset.assignGame as string;
    const position = button.dataset.assignPosition as Position;
    const umpireId = button.dataset.assignUmpire as string;

    // every place as it is now, with this umpire in the open one
    const places: Record<string, string | null> = {};
    for (const place of POSITIONS) places[place] = null;
    for (const row of loadedMonth.data!.assignments.filter((item) => item.game_id === gameId)) places[row.position] = row.umpire_id;
    places[position] = umpireId;

    container.querySelectorAll<HTMLButtonElement>("[data-assign-umpire]").forEach((item) => { item.disabled = true; });

    const { error } = await supabase.rpc("set_game_umpires", { p_game_id: gameId, p_umpires: places });

    if (error) {
      container.querySelectorAll<HTMLButtonElement>("[data-assign-umpire]").forEach((item) => { item.disabled = false; });
      return say(`Could not assign them. ${error.message}`);
    }

    months.clear();
    flash = `Assigned ${context.umpireNames.get(umpireId) ?? "the umpire"} to the ${POSITION_LABEL[position]} place.`;
    void renderBoardPage(container, navigate, sub);
  };

  // The notes: add and remove
  wireNotes(container, (notice) => {
    flash = notice;
    void renderBoardPage(container, navigate, sub);
  }, controller.signal);

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
      const input = button.closest(".board-mark-body")?.querySelector<HTMLInputElement>(".board-mark-time");
      const typed = input?.value;
      // (a time that was left as it was filled in means "now", so the database uses its own now)
      if (typed && typed !== input?.dataset.default) {
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
