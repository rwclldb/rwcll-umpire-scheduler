import { supabase } from "../supabase";
import { appNow, demoNowIso } from "../clock";
import { escapeHtml } from "../ui";
import { dateKey } from "./availability";
import { loadContext, loadGameReports, loadGamesByIds, loadOutsideReports, loadReportAudit, loadSeasonGames } from "./data";
import { formatDate } from "./format";
import { reportWhen, reportsPageHtml } from "./reports-model";
import type { FollowupView, GameReportView, OutsideReportView } from "./reports-model";
import { lookupsFor } from "./schedule";
import type { Game, ReportFollowup } from "./types";

// The Reports page (the umpire chief and super admins). The database decides who
// can read or change anything; this page just shows what it is given.

const handlers = new WeakMap<HTMLElement, AbortController>();
let flash = "";

const ACTION_TEXT: Record<string, string> = {
  created: "Created",
  edited: "Edited",
  followup: "Added a follow-up",
  deleted: "Deleted",
  purged: "Deleted automatically (a year after its season ended)",
};

const toFollowups = (list: ReportFollowup[] | undefined): FollowupView[] =>
  (list ?? []).map((item) => ({ id: item.id, author_name: item.author_name, body: item.body, created_at: item.created_at }));

export async function renderReportsPage(container: HTMLElement, canDelete: boolean): Promise<void> {
  handlers.get(container)?.abort();
  const controller = new AbortController();
  handlers.set(container, controller);

  container.innerHTML = `<main class="page"><section class="auth-card admin-card"><h1>Reports</h1><p>Loading&hellip;</p></section></main>`;

  // Reports whose season ended over a year ago are deleted now (the database does
  // it; a report in a season with no end date is never touched).
  const pretend = demoNowIso();
  const purge = await supabase.rpc("purge_expired_reports", pretend ? { p_now: pretend } : {});
  const purged = purge.error ? 0 : Number(purge.data) || 0;

  const [loadedContext, game, outside] = await Promise.all([loadContext(), loadGameReports(), loadOutsideReports()]);

  if (loadedContext.error || !loadedContext.context || game.error || outside.error) {
    container.innerHTML = `<main class="page"><section class="auth-card admin-card"><h1>Reports</h1><p class="message error">The reports could not be loaded. Refresh and try again.</p></section></main>`;
    return;
  }

  const context = loadedContext.context;
  const look = lookupsFor(context);
  const seasons = new Map(context.seasons.map((season) => [season.id, season]));
  const umpireName = (id: string) => context.umpireNames.get(id) ?? "An umpire";

  const gameIds = [...game.reports.map((report) => report.game_id), ...outside.reports.map((report) => report.game_id).filter((id): id is string => Boolean(id))];
  const games = new Map((gameIds.length ? (await loadGamesByIds(gameIds)).games : []).map((item) => [item.id, item]));

  const gameLabel = (item: Game | undefined) => {
    if (!item) return "A game";
    const team = (id: string | null, label: string | null) => (id ? look.teamName(id) : label ?? "TBD");
    return `${formatDate(item.starts_at)} \u00b7 ${look.divisionName(item.division_id)} \u00b7 ${team(item.home_team_id, item.home_label)} vs ${team(item.away_team_id, item.away_label)} \u00b7 ${look.fieldName(item.location_id)}`;
  };

  const gameViews: GameReportView[] = game.reports.map((report) => ({
    id: report.id,
    created_at: report.created_at,
    category: report.category,
    body: report.body,
    authorName: report.author_name,
    umpireId: report.umpire_id,
    umpireName: umpireName(report.umpire_id),
    gameLabel: gameLabel(games.get(report.game_id)),
    endsOn: seasons.get(report.season_id)?.ends_on ?? null,
    followups: toFollowups(game.followups.get(report.id)),
  }));

  const outsideViews: OutsideReportView[] = outside.reports.map((report) => ({
    id: report.id,
    created_at: report.created_at,
    edited_at: report.edited_at,
    received_on: report.received_on,
    source_name: report.source_name,
    source_role: report.source_role,
    body: report.body,
    umpireId: report.umpire_id,
    umpireName: umpireName(report.umpire_id),
    gameId: report.game_id,
    gameLabel: report.game_id ? gameLabel(games.get(report.game_id)) : null,
    seasonId: report.season_id,
    seasonName: seasons.get(report.season_id)?.name ?? "",
    endsOn: seasons.get(report.season_id)?.ends_on ?? null,
    enteredBy: report.entered_by_name,
    followups: toFollowups(outside.followups.get(report.id)),
  }));

  const umpires = context.umpires.map((umpire) => ({ id: umpire.id, name: umpire.name })).sort((a, b) => a.name.localeCompare(b.name));
  const seasonList = context.seasons.map((season) => ({ id: season.id, name: season.name }));
  const defaultSeasonId = context.seasons.find((season) => season.is_active)?.id ?? seasonList[0]?.id ?? "";

  container.innerHTML = reportsPageHtml({
    gameReports: gameViews,
    outside: outsideViews,
    umpires,
    seasons: seasonList,
    defaultSeasonId,
    todayKey: dateKey(appNow()),
    canDelete,
    purged,
  });

  const $ = <T extends HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
  const say = (text: string, type: "error" | "success" = "error") => {
    const message = $<HTMLElement>("#reports-message");
    message.textContent = text;
    message.className = `message ${type}`;
  };
  const refresh = (notice: string) => {
    flash = notice;
    void renderReportsPage(container, canDelete);
  };

  if (flash) {
    say(flash, "success");
    flash = "";
  }

  // ---- show one umpire's reports
  $<HTMLSelectElement>("#reports-filter").addEventListener("change", (event) => {
    const chosen = (event.target as HTMLSelectElement).value;
    container.querySelectorAll<HTMLElement>(".report").forEach((card) => {
      card.hidden = chosen !== "" && card.dataset.umpire !== chosen;
    });
  }, { signal: controller.signal });

  // ---- the games to pick from, for the umpire and season chosen in the form
  const fillGames = async () => {
    const umpireId = $<HTMLSelectElement>("#outside-umpire").value;
    const seasonId = $<HTMLSelectElement>("#outside-season").value;
    const select = $<HTMLSelectElement>("#outside-game");
    select.innerHTML = `<option value="">No particular game</option>`;
    if (!umpireId || !seasonId) return;

    const found = await loadSeasonGames(seasonId);
    if (found.error) return;

    const mine = new Set(found.assignments.filter((row) => row.umpire_id === umpireId).map((row) => row.game_id));
    const list = found.games.filter((item) => mine.has(item.id)).sort((a, b) => b.starts_at.localeCompare(a.starts_at)).slice(0, 60);
    for (const item of list) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = gameLabel(item);
      select.appendChild(option);
    }
  };

  container.addEventListener("change", (event) => {
    const id = (event.target as HTMLElement).id;
    if (id === "outside-umpire" || id === "outside-season") void fillGames();
  }, { signal: controller.signal });

  // ---- editing a report from outside uses the same form
  const editing = (report: OutsideReportView | null) => {
    $<HTMLInputElement>("#outside-edit-id").value = report?.id ?? "";
    $<HTMLSelectElement>("#outside-umpire").disabled = Boolean(report);
    $<HTMLSelectElement>("#outside-season").disabled = Boolean(report);
    $<HTMLSelectElement>("#outside-game").disabled = Boolean(report);
    $<HTMLButtonElement>("#outside-cancel").hidden = !report;
    $<HTMLButtonElement>("#outside-save").textContent = report ? "Save changes" : "Save report";
    $<HTMLElement>("#outside-box > summary").textContent = report ? "Edit a report from outside" : "Add a report from outside";

    if (report) {
      $<HTMLSelectElement>("#outside-umpire").value = report.umpireId;
      $<HTMLSelectElement>("#outside-season").value = report.seasonId;
      $<HTMLInputElement>("#outside-source").value = report.source_name;
      $<HTMLSelectElement>("#outside-role").value = report.source_role;
      $<HTMLInputElement>("#outside-date").value = report.received_on;
      $<HTMLTextAreaElement>("#outside-body").value = report.body;
      $<HTMLDetailsElement>("#outside-box").open = true;
      $<HTMLElement>("#outside-box").scrollIntoView({ block: "start" });
    } else {
      $<HTMLFormElement>("#outside-form").reset();
      $<HTMLInputElement>("#outside-date").value = dateKey(appNow());
      $<HTMLSelectElement>("#outside-season").value = defaultSeasonId;
    }
  };

  // ---- clicks
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const edit = target.closest<HTMLButtonElement>("[data-edit-outside]");
    if (edit) return editing(outsideViews.find((report) => report.id === edit.dataset.editOutside) ?? null);

    if (target.closest("#outside-cancel")) return editing(null);

    const remove = target.closest<HTMLButtonElement>("[data-delete-report]");
    if (remove) {
      const [kind, id] = (remove.dataset.deleteReport as string).split(":");
      if (!window.confirm("Delete this report for good? Its follow-ups go with it. The change log keeps a note that it was deleted, and who did it.")) return;

      remove.disabled = true;
      void (async () => {
        const { error } = await supabase.rpc("delete_report", { p_kind: kind, p_report_id: id, ...(demoNowIso() ? { p_now: demoNowIso() } : {}) });
        if (error) {
          remove.disabled = false;
          return say(`Could not delete it. ${error.message}`);
        }
        refresh("Report deleted.");
      })();
    }
  }, { signal: controller.signal });

  // ---- the change log opens on demand
  container.addEventListener("toggle", (event) => {
    const details = event.target as HTMLElement;
    if (!(details instanceof HTMLDetailsElement) || !details.matches("details.report-log") || !details.open) return;

    const body = details.querySelector<HTMLElement>(".report-log-body")!;
    body.textContent = "Loading\u2026";
    void loadReportAudit(details.dataset.logId as string).then((rows) => {
      body.innerHTML = rows.length === 0
        ? "<p>No entries.</p>"
        : `<ul>${rows.map((row) => `<li>${escapeHtml(reportWhen(row.acted_at))} &middot; ${escapeHtml(row.actor_name)}: ${escapeHtml(ACTION_TEXT[row.action] ?? row.action)}</li>`).join("")}</ul>`;
    });
  }, { capture: true, signal: controller.signal });

  // ---- forms
  container.addEventListener("submit", (event) => {
    const form = event.target as HTMLFormElement;

    // a follow-up to a report
    if (form.matches(".report-followup-form")) {
      event.preventDefault();
      const text = form.querySelector<HTMLTextAreaElement>(".report-followup-text")!.value.trim();
      if (!text) return say("Write something first.");

      const kind = form.dataset.followupKind;
      const button = form.querySelector<HTMLButtonElement>("button")!;
      button.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc(kind === "game" ? "add_game_report_followup" : "add_outside_report_followup", {
          p_report_id: form.dataset.report,
          p_body: text,
          ...(demoNowIso() ? { p_now: demoNowIso() } : {}),
        });
        if (error) {
          button.disabled = false;
          return say(`Could not add it. ${error.message}`);
        }
        refresh("Follow-up added.");
      })();
      return;
    }

    // a report from outside: new, or an edit
    if (form.id === "outside-form") {
      event.preventDefault();
      const editId = $<HTMLInputElement>("#outside-edit-id").value;
      const body = $<HTMLTextAreaElement>("#outside-body").value.trim();
      const source = $<HTMLInputElement>("#outside-source").value.trim();
      if (!body) return say("Write what was reported.");
      if (!source) return say("Say who reported it.");

      const save = $<HTMLButtonElement>("#outside-save");
      save.disabled = true;

      void (async () => {
        const common = {
          p_source_name: source,
          p_source_role: $<HTMLSelectElement>("#outside-role").value,
          p_received_on: $<HTMLInputElement>("#outside-date").value,
          p_body: body,
          ...(demoNowIso() ? { p_now: demoNowIso() } : {}),
        };

        const { error } = editId
          ? await supabase.rpc("edit_outside_report", { p_report_id: editId, ...common })
          : await supabase.rpc("add_outside_report", {
              p_umpire_id: $<HTMLSelectElement>("#outside-umpire").value,
              p_game_id: $<HTMLSelectElement>("#outside-game").value || null,
              p_season_id: $<HTMLSelectElement>("#outside-season").value,
              ...common,
            });

        if (error) {
          save.disabled = false;
          return say(`Could not save the report. ${error.message}`);
        }
        refresh(editId ? "Report updated." : "Report saved. The umpire it is about cannot see it.");
      })();
    }
  }, { signal: controller.signal });
}
