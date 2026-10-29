import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { loadGamesByIds } from "./data";
import { formatDate, localDateKey } from "./format";
import { buildScheduleGames, lookupsFor } from "./schedule";
import type { ScheduleGame } from "./schedule";
import { POSITION_NAME } from "./staffing";
import { groupOptions } from "./take-options";
import type { TakeOption } from "./take-options";
import type { GamesContext, Position } from "./types";
import { appNow } from "../clock";

const dayText = (offsetDays: number): string => {
  const date = appNow();
  date.setDate(date.getDate() + offsetDays);
  return localDateKey(date.toISOString());
};

// "Games you can take": the open places an umpire is allowed to take for
// themselves, shown on their Home page. The database decides what is offered
// (which divisions allow it, overlaps, the limit, the youth age rule, ...);
// this only asks and shows. When nothing is offered at first, nothing is shown
// at all, so umpires whose league has not turned it on never see it.
export async function renderOpenGames(
  container: HTMLElement,
  options: { context: GamesContext; onTaken: (message: string) => void }
): Promise<void> {
  container.innerHTML = "";

  // Ask for the games between two dates (the whole of both days, in the computer's time).
  const ask = async (from: string, to: string) => {
    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);

    const { data, error } = await supabase.rpc("self_assign_options", {
      p_from: Number.isNaN(start.getTime()) ? null : start.toISOString(),
      p_to: Number.isNaN(end.getTime()) ? null : end.toISOString(),
    });

    if (error) return { rows: [] as TakeOption[], games: [] as ScheduleGame[], error: error.message };

    const rows = (data ?? []) as TakeOption[];
    const found = await loadGamesByIds(rows.map((row) => row.game_id));
    if (found.error) return { rows: [] as TakeOption[], games: [] as ScheduleGame[], error: found.error };

    return {
      rows,
      games: buildScheduleGames(found.games, [], lookupsFor(options.context)),
      error: null as string | null,
    };
  };

  const first = await ask(dayText(0), dayText(30));

  if (first.error) {
    console.error("Games to take failed:", first.error);
    return; // nothing to show; the rest of the page is unaffected
  }

  if (first.rows.length === 0) return;

  container.innerHTML = `
    <section class="open-games">
      <h2>Games you can take</h2>
      <p class="directory-description">
        Open places in games you are allowed to take for yourself. A game you
        take is confirmed straight away, and you can decline it later from
        your schedule. You cannot take a game that overlaps one of yours.
      </p>
      <div class="game-filters">
        <div>
          <label for="og-from">From</label>
          <input id="og-from" type="date" value="${escapeHtml(dayText(0))}" />
        </div>
        <div>
          <label for="og-to">To</label>
          <input id="og-to" type="date" value="${escapeHtml(dayText(30))}" />
        </div>
      </div>
      <p id="og-message" class="message" role="status" aria-live="polite"></p>
      <div id="og-list"></div>
    </section>
  `;

  const get = <T extends HTMLElement>(id: string) => container.querySelector<T>(`#${id}`)!;
  const say = (text: string, kind: "error" | "success" = "error") => {
    const element = get<HTMLElement>("og-message");
    element.textContent = text;
    element.className = text ? `message ${kind}` : "message";
  };

  let shown: ScheduleGame[] = [];

  const draw = (rows: TakeOption[], games: ScheduleGame[]) => {
    shown = games;
    const places = groupOptions(rows);
    const list = games.filter((game) => places.has(game.id));
    const holder = get<HTMLElement>("og-list");

    if (list.length === 0) {
      holder.innerHTML = `<p class="directory-empty">There are no open games you can take in these dates.</p>`;
      return;
    }

    holder.innerHTML = `
      ${rows.length >= 500 ? `<p class="directory-description">Only the first 500 places are shown. Choose a shorter range to see the rest.</p>` : ""}
      <div class="table-scroll">
        <table class="umpire-table imp-table" aria-label="Games you can take">
          <thead>
            <tr><th>Date</th><th>Time</th><th>Field</th><th>Game</th><th>Division</th><th>Take</th></tr>
          </thead>
          <tbody>
            ${list.map((game) => `
              <tr>
                <td data-label="Date" class="og-date">${escapeHtml(formatDate(game.startsAt))}</td>
                <td data-label="Time" class="og-time">${escapeHtml(game.time)}</td>
                <td data-label="Field" class="og-field">${escapeHtml(game.field)}${game.address ? `<br><span class="game-where">${escapeHtml(game.address)}</span>` : ""}</td>
                <td data-label="Game" class="og-game">${escapeHtml(game.home)} vs ${escapeHtml(game.away)}</td>
                <td data-label="Division" class="og-division">${escapeHtml(game.division)}</td>
                <td data-label="Take" class="og-take"><div class="sv-actions">${(places.get(game.id) ?? []).map((place) => `
                  <button type="button" class="primary-button" data-take-game="${escapeHtml(game.id)}" data-take-place="${place}">Take ${escapeHtml(POSITION_NAME[place])}</button>`).join("")}</div></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const reload = async () => {
    const found = await ask(get<HTMLInputElement>("og-from").value, get<HTMLInputElement>("og-to").value);
    if (found.error) {
      say(`The list could not be loaded. ${found.error}`);
      return;
    }
    draw(found.rows, found.games);
  };

  draw(first.rows, first.games);

  for (const id of ["og-from", "og-to"]) {
    get<HTMLElement>(id).addEventListener("change", () => {
      say("");
      void reload();
    });
  }

  get<HTMLElement>("og-list").addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-take-game]");
    if (!button) return;

    const gameId = button.dataset.takeGame!;
    const place = button.dataset.takePlace!;
    const game = shown.find((item) => item.id === gameId);

    for (const other of container.querySelectorAll<HTMLButtonElement>("[data-take-game]")) other.disabled = true;
    say("");

    void (async () => {
      const { error } = await supabase.rpc("self_assign", { p_game_id: gameId, p_place: place });

      if (error) {
        say(`That did not work. ${error.message}`);
        await reload(); // what is open may have changed
        return;
      }

      options.onTaken(
        `You have taken the ${POSITION_NAME[place as Position].toLowerCase()} place for ${game ? `${game.home} vs ${game.away}` : "that game"}. It is confirmed and on your schedule.`
      );
    })();
  });
}
