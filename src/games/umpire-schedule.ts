import { escapeHtml } from "../ui";
import { downloadText, safeFileName, toCsv } from "./csv-out";
import { loadUmpireGames } from "./data";
import { formatDate, formatPrinted, localDateKey } from "./format";
import { printHtml } from "./print";
import {
  UMPIRE_CSV_HEADERS,
  buildUmpireSchedule,
  lookupsFor,
  umpireCsvRows,
  umpirePrintHtml,
} from "./schedule";
import type { UmpireGame } from "./schedule";
import type { GamesContext } from "./types";

// One umpire's games, with date choices, a preview, and Print / Download.
// Used for an administrator looking at any umpire, and for an umpire looking
// at themselves.
export function renderScheduleView(
  container: HTMLElement,
  options: {
    umpireName: string;
    items: UmpireGame[];
    emptyText: string;
    // When given (an umpire looking at their own games), games still waiting
    // for an answer get Confirm and Decline buttons. It returns an error
    // message, or null when it worked.
    onAnswer?: (gameId: string, action: "confirm" | "decline", reason: string) => Promise<string | null>;
    // Called after a successful answer, so the screen can be drawn again.
    onAnswered?: (message: string) => void;
  }
): void {
  const { umpireName, items } = options;
  const today = localDateKey(new Date().toISOString());

  container.innerHTML = `
    <div class="schedule-view">
      <div class="game-filters">
        <div>
          <label for="sv-from">From</label>
          <input id="sv-from" type="date" value="${escapeHtml(today)}" />
        </div>
        <div>
          <label for="sv-to">To</label>
          <input id="sv-to" type="date" />
        </div>
        <label class="season-checkbox-label game-filter-wide">
          <input id="sv-canceled" type="checkbox" /> Include canceled games
        </label>
      </div>

      <p id="sv-summary" class="game-summary" role="status" aria-live="polite"></p>
      <p id="sv-message" class="message" role="status" aria-live="polite"></p>
      <div id="sv-list"></div>
      <div id="sv-decline"></div>

      <div class="account-actions">
        <button id="sv-print" class="primary-button" type="button">Print this schedule</button>
        <button id="sv-csv" class="secondary-button" type="button">Download CSV</button>
      </div>
    </div>
  `;

  const get = <T extends HTMLElement>(id: string) => container.querySelector<T>(`#${id}`)!;

  const shown = (): UmpireGame[] => {
    const from = get<HTMLInputElement>("sv-from").value;
    const to = get<HTMLInputElement>("sv-to").value;
    const canceled = get<HTMLInputElement>("sv-canceled").checked;

    return items.filter(
      (game) =>
        (!from || game.day >= from) &&
        (!to || game.day <= to) &&
        (canceled || game.status !== "canceled")
    );
  };

  const rangeText = () => {
    const from = get<HTMLInputElement>("sv-from").value;
    const to = get<HTMLInputElement>("sv-to").value;
    const pretty = (day: string) => formatDate(new Date(`${day}T12:00:00`).toISOString());
    return from && to ? `From ${pretty(from)} to ${pretty(to)}`
      : from ? `From ${pretty(from)}`
      : to ? `Up to ${pretty(to)}`
      : "All dates";
  };

  // Whether this umpire can still answer for the game (it has not started and is not canceled).
  const canAnswer = (game: UmpireGame) =>
    Boolean(options.onAnswer) && game.status !== "canceled" && Date.parse(game.startsAt) > Date.now();

  const statusCell = (game: UmpireGame): string => {
    if (game.status === "canceled") return "&mdash;";
    if (game.myStatus === "confirmed") return `<span class="sv-status sv-status-confirmed">Confirmed</span>`;

    if (canAnswer(game)) {
      return `<span class="sv-status sv-status-pending">Needs your answer</span>
        <div class="sv-actions">
          <button type="button" class="primary-button" data-sv-confirm="${escapeHtml(game.id)}">Confirm</button>
          <button type="button" class="secondary-button" data-sv-decline="${escapeHtml(game.id)}">Decline</button>
        </div>`;
    }

    return `<span class="sv-status sv-status-assigned">Assigned</span>`;
  };

  const say = (text: string, kind: "error" | "success" = "error") => {
    const element = get<HTMLElement>("sv-message");
    element.textContent = text;
    element.className = text ? `message ${kind}` : "message";
  };

  // Sends the answer; true when it worked.
  const answer = async (gameId: string, action: "confirm" | "decline", reason: string): Promise<boolean> => {
    say("");
    const problem = await options.onAnswer!(gameId, action, reason);

    if (problem) {
      say(problem);
      return false;
    }

    options.onAnswered?.(
      action === "confirm"
        ? "Thank you. You have confirmed this game."
        : "You have declined this game, and the administrators have been told."
    );
    return true;
  };

  const askToDecline = (game: UmpireGame) => {
    const holder = get<HTMLElement>("sv-decline");
    holder.innerHTML = `
      <section class="importer sv-decline-panel">
        <h3>Decline this game?</h3>
        <p class="directory-description">
          ${escapeHtml(game.home)} vs ${escapeHtml(game.away)}<br>
          ${escapeHtml(formatDate(game.startsAt))}, ${escapeHtml(game.time)} (${escapeHtml(game.position)}, ${escapeHtml(game.field)})
        </p>
        <label for="sv-reason">Reason (optional)</label>
        <textarea id="sv-reason" rows="3" maxlength="500"></textarea>
        <div class="account-actions">
          <button id="sv-decline-go" class="primary-button" type="button">Decline this game</button>
          <button id="sv-decline-keep" class="secondary-button" type="button">Keep it</button>
        </div>
      </section>
    `;

    holder.querySelector("#sv-decline-keep")?.addEventListener("click", () => {
      holder.innerHTML = "";
    });

    holder.querySelector<HTMLButtonElement>("#sv-decline-go")?.addEventListener("click", async (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      const reason = holder.querySelector<HTMLTextAreaElement>("#sv-reason")!.value;
      if (!(await answer(game.id, "decline", reason))) button.disabled = false;
    });

    holder.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const render = () => {
    const list = shown();
    const summary = get<HTMLElement>("sv-summary");
    const holder = get<HTMLElement>("sv-list");
    const disabled = list.length === 0;

    get<HTMLButtonElement>("sv-print").disabled = disabled;
    get<HTMLButtonElement>("sv-csv").disabled = disabled;

    summary.textContent = `${list.length} ${list.length === 1 ? "game" : "games"} \u00b7 ${rangeText()}`;

    if (list.length === 0) {
      holder.innerHTML = `<p class="directory-empty">${
        items.length === 0 ? escapeHtml(options.emptyText) : "No games in these dates. Change From and To to see more."
      }</p>`;
      return;
    }

    holder.innerHTML = `
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Schedule">
          <thead>
            <tr><th>Date</th><th>Time</th><th>Position</th><th>Field</th><th>Game</th><th>Division</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${list.map((game) => `
              <tr class="${game.status === "canceled" ? "game-row-canceled" : ""}">
                <td data-label="Date" class="sv-date">${escapeHtml(formatDate(game.startsAt))}</td>
                <td data-label="Time" class="sv-time">${escapeHtml(game.time)}</td>
                <td data-label="Position" class="sv-position"><strong>${escapeHtml(game.position)}</strong></td>
                <td data-label="Field" class="sv-field">${escapeHtml(game.field)}${game.address ? `<br><span class="game-where">${escapeHtml(game.address)}</span>` : ""}</td>
                <td data-label="Game" class="sv-game">${escapeHtml(game.home)} vs ${escapeHtml(game.away)}${game.status === "canceled" ? " (canceled)" : ""}</td>
                <td data-label="Division" class="sv-division">${escapeHtml(game.division)}</td>
                <td data-label="Status" class="sv-status-cell">${statusCell(game)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  get<HTMLElement>("sv-list").addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const confirm = target.closest<HTMLButtonElement>("[data-sv-confirm]");
    if (confirm) {
      confirm.disabled = true;
      void answer(confirm.dataset.svConfirm!, "confirm", "").then((ok) => {
        if (!ok) confirm.disabled = false;
      });
      return;
    }

    const decline = target.closest<HTMLButtonElement>("[data-sv-decline]");
    if (decline) {
      const game = items.find((item) => item.id === decline.dataset.svDecline);
      if (game) askToDecline(game);
    }
  });

  for (const id of ["sv-from", "sv-to", "sv-canceled"]) {
    get<HTMLElement>(id).addEventListener("change", render);
  }

  get<HTMLElement>("sv-print").addEventListener("click", () => {
    const list = shown();
    if (list.length === 0) return;

    printHtml(
      umpirePrintHtml(umpireName, list, {
        title: "Umpire schedule",
        lines: [rangeText(), get<HTMLInputElement>("sv-canceled").checked ? "Including canceled games" : "Canceled games are not shown"],
        printedAt: formatPrinted(new Date()),
      })
    );
  });

  get<HTMLElement>("sv-csv").addEventListener("click", () => {
    const list = shown();
    if (list.length === 0) return;

    const from = get<HTMLInputElement>("sv-from").value || "start";
    const to = get<HTMLInputElement>("sv-to").value || "end";
    downloadText(
      `${safeFileName(`RWCLL-schedule-${umpireName}-${from}-${to}`)}.csv`,
      toCsv([UMPIRE_CSV_HEADERS, ...umpireCsvRows(list)])
    );
  });

  render();
}

// An administrator picks any umpire to see, print or download their games.
export function renderUmpireSchedulePanel(
  container: HTMLElement,
  options: { context: GamesContext; onClose: () => void }
): void {
  const { context } = options;
  const names = [...context.umpireNames.entries()].sort((a, b) => a[1].localeCompare(b[1]));

  container.innerHTML = `
    <section class="importer" id="umpire-schedule-panel">
      <h3>One umpire's schedule</h3>
      <p class="directory-description">
        Choose an umpire to see, print or download all of their games, in
        every season. Times are shown in your computer's time zone.
      </p>

      <label for="us-umpire">Umpire</label>
      <select id="us-umpire">
        <option value="">Choose an umpire&hellip;</option>
        ${names.map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("")}
      </select>

      <p id="us-message" class="message" role="status" aria-live="polite"></p>
      <div id="us-view"></div>

      <div class="account-actions">
        <button id="us-close" class="secondary-button" type="button">Close</button>
      </div>
    </section>
  `;

  const view = container.querySelector<HTMLElement>("#us-view")!;
  const message = container.querySelector<HTMLElement>("#us-message")!;
  let token = 0;

  container.querySelector("#us-umpire")?.addEventListener("change", async (event) => {
    const umpireId = (event.target as HTMLSelectElement).value;
    const myToken = ++token;
    view.innerHTML = "";
    message.textContent = "";
    message.className = "message";
    if (!umpireId) return;

    message.textContent = "Loading\u2026";
    const result = await loadUmpireGames(umpireId);
    if (myToken !== token) return; // another umpire was chosen meanwhile

    if (result.error) {
      message.textContent = "Could not load this umpire's games. Try again.";
      message.className = "message error";
      console.error("Umpire schedule failed:", result.error);
      return;
    }

    message.textContent = "";
    renderScheduleView(view, {
      umpireName: context.umpireNames.get(umpireId) ?? "Umpire",
      items: buildUmpireSchedule(umpireId, result.games, result.assignments, lookupsFor(context)),
      emptyText: "This umpire has not been assigned any games yet.",
    });
  });

  container.querySelector("#us-close")?.addEventListener("click", options.onClose);
}
