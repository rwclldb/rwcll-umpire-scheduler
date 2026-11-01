import { supabase } from "../supabase";
import { appNowMs, demoNowIso } from "../clock";
import { loadGameReports } from "./data";
import { formatDate } from "./format";
import { myReportsHtml } from "./reports-model";
import type { GameReportView } from "./reports-model";
import type { UmpireGame } from "./schedule";

// The umpire's part of Home: write a post-game report, and read (and add
// follow-ups to) the ones they have sent. They cannot edit a report after
// sending it, and they never see anything written about them from outside.

const FOURTEEN_DAYS = 14 * 86_400_000;

export async function renderMyReports(
  container: HTMLElement,
  options: { items: UmpireGame[]; umpireName: string; refresh: (notice: string) => void }
): Promise<void> {
  const now = appNowMs();
  const label = (game: UmpireGame) => `${formatDate(game.startsAt)} \u00b7 ${game.time} \u00b7 ${game.division} \u00b7 ${game.home} vs ${game.away}`;

  // games they can write about: started, not canceled, and within 14 days of ending
  const writable = options.items
    .filter((game) => game.status !== "canceled" && Date.parse(game.startsAt) <= now && Date.parse(game.endsAt) + FOURTEEN_DAYS >= now)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((game) => ({ id: game.id, label: label(game) }));

  const own = await loadGameReports();   // (the database gives an umpire only their own)
  const byGame = new Map(options.items.map((game) => [game.id, game]));

  const views: GameReportView[] = own.reports.map((report) => ({
    id: report.id,
    created_at: report.created_at,
    category: report.category,
    body: report.body,
    authorName: report.author_name,
    umpireId: report.umpire_id,
    umpireName: options.umpireName,
    gameLabel: byGame.get(report.game_id) ? label(byGame.get(report.game_id)!) : "A game",
    endsOn: null,
    followups: (own.followups.get(report.id) ?? []).map((item) => ({ id: item.id, author_name: item.author_name, body: item.body, created_at: item.created_at })),
  }));

  container.innerHTML = myReportsHtml({ games: writable, reports: views });

  const say = (text: string) => {
    const message = container.querySelector<HTMLElement>("#my-reports-message")!;
    message.textContent = text;
    message.className = "message error";
  };

  container.querySelector<HTMLFormElement>("#my-report-form")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const body = container.querySelector<HTMLTextAreaElement>("#my-report-body")!.value.trim();
    if (!body) return say("Write what happened.");

    const button = container.querySelector<HTMLButtonElement>("#my-report-form button[type='submit']")!;
    button.disabled = true;

    void (async () => {
      const { error } = await supabase.rpc("file_game_report", {
        p_game_id: container.querySelector<HTMLSelectElement>("#my-report-game")!.value,
        p_category: container.querySelector<HTMLSelectElement>("#my-report-category")!.value,
        p_body: body,
        ...(demoNowIso() ? { p_now: demoNowIso() } : {}),
      });

      if (error) {
        button.disabled = false;
        return say(`Could not send the report. ${error.message}`);
      }

      options.refresh("Your report was sent. Only the umpire chief and super admins can read it.");
    })();
  });

  container.addEventListener("submit", (event) => {
    const form = (event.target as HTMLElement).closest<HTMLFormElement>("form.report-followup-form");
    if (!form) return;
    event.preventDefault();

    const text = form.querySelector<HTMLTextAreaElement>(".report-followup-text")!.value.trim();
    if (!text) return say("Write something first.");

    const button = form.querySelector<HTMLButtonElement>("button")!;
    button.disabled = true;

    void (async () => {
      const { error } = await supabase.rpc("add_game_report_followup", {
        p_report_id: form.dataset.report,
        p_body: text,
        ...(demoNowIso() ? { p_now: demoNowIso() } : {}),
      });

      if (error) {
        button.disabled = false;
        return say(`Could not add it. ${error.message}`);
      }

      options.refresh("Follow-up added. Only the umpire chief and super admins can read it.");
    })();
  });
}
