import { escapeHtml } from "../ui";
import { formatDate, formatTime } from "./format";

// Reports: post-game reports from umpires, and reports from outside (coaches,
// parents, the board) about an umpire. This file writes the screens; reports.ts
// and reports-umpire.ts make their buttons work. Who can read what is decided by
// the database, not by this file.

export const GAME_REPORT_CATEGORIES: [string, string][] = [
  ["ejection", "An ejection"],
  ["protest", "A protest"],
  ["conduct", "Conduct (players, coaches or fans)"],
  ["incident", "An incident or injury"],
  ["other", "Something else"],
];

export const SOURCE_ROLES: [string, string][] = [
  ["coach", "A coach"],
  ["manager", "A manager"],
  ["parent", "A parent"],
  ["league_official", "A league official"],
  ["spectator", "A spectator"],
  ["other", "Someone else"],
];

export const categoryLabel = (value: string) => GAME_REPORT_CATEGORIES.find(([key]) => key === value)?.[1] ?? value;
export const sourceRoleLabel = (value: string) => SOURCE_ROLES.find(([key]) => key === value)?.[1] ?? value;

export const REPORT_GUIDANCE =
  "Write what happened, as facts. Use initials for children, leave out medical details, and do not guess or repeat rumors.";

export const SAFETY_NOTICE =
  "If this is about the safety or welfare of a child, tell the league's safety officer as well. This app is not the way to report that.";

// "Oct 31 \u00b7 9:25 AM"
export const reportWhen = (iso: string) => `${formatDate(iso)} \u00b7 ${formatTime(iso)}`;

// "Oct 12, 2027" from "2026-10-12" plus a year: when a report is deleted automatically.
export function retentionText(endsOn: string | null | undefined): string {
  if (!endsOn) {
    return "This season has no end date, so this report will not be deleted automatically. Set the season's end date in League Setup.";
  }

  const [year, month, day] = endsOn.split("-").map(Number);
  const last = new Date(year + 1, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `Deleted automatically after ${last} (a year after the season ends).`;
}

export type FollowupView = { id: string; author_name: string; body: string; created_at: string };

export type GameReportView = {
  id: string;
  created_at: string;
  category: string;
  body: string;
  authorName: string;
  umpireId: string;
  umpireName: string;
  gameLabel: string;
  endsOn: string | null;
  followups: FollowupView[];
};

export type OutsideReportView = {
  id: string;
  created_at: string;
  edited_at: string | null;
  received_on: string;
  source_name: string;
  source_role: string;
  body: string;
  umpireId: string;
  umpireName: string;
  gameId: string | null;
  gameLabel: string | null;
  seasonId: string;
  seasonName: string;
  endsOn: string | null;
  enteredBy: string;
  followups: FollowupView[];
};

function followupsHtml(list: FollowupView[]): string {
  if (list.length === 0) return "";

  return `
    <ul class="report-followups">
      ${list.map((item) => `
        <li><span class="report-meta"><strong>${escapeHtml(item.author_name)}</strong> &middot; ${escapeHtml(reportWhen(item.created_at))}</span>
          <span class="report-text">${escapeHtml(item.body)}</span></li>`).join("")}
    </ul>`;
}

function followupFormHtml(kind: "game" | "outside", id: string): string {
  return `
    <form class="report-followup-form" data-followup-kind="${kind}" data-report="${escapeHtml(id)}">
      <label>Add a follow-up
        <textarea class="report-followup-text" rows="2" maxlength="4000" required></textarea>
      </label>
      <button type="submit" class="secondary-button">Add follow-up</button>
    </form>`;
}

// the change log opens on demand (it lists who did what, and when, never the text)
function logHtml(kind: "game" | "outside", id: string): string {
  return `
    <details class="report-log" data-log-kind="${kind}" data-log-id="${escapeHtml(id)}">
      <summary>Change log</summary>
      <div class="report-log-body" aria-live="polite"></div>
    </details>`;
}

export function gameReportHtml(report: GameReportView, options: { admin: boolean; canDelete: boolean }): string {
  return `
    <article class="report" data-umpire="${escapeHtml(report.umpireId)}" data-report-card="${escapeHtml(report.id)}">
      <h3>${options.admin ? `${escapeHtml(report.umpireName)} &middot; ` : ""}${escapeHtml(categoryLabel(report.category))}</h3>
      <p class="report-meta">${escapeHtml(report.gameLabel)} &middot; written ${escapeHtml(reportWhen(report.created_at))}</p>
      <p class="report-text">${escapeHtml(report.body)}</p>
      ${followupsHtml(report.followups)}
      ${followupFormHtml("game", report.id)}
      ${options.admin ? `<p class="report-retention">${escapeHtml(retentionText(report.endsOn))}</p>` : ""}
      ${options.admin ? logHtml("game", report.id) : ""}
      ${options.canDelete ? `<button type="button" class="secondary-button report-delete" data-delete-report="game:${escapeHtml(report.id)}">Delete this report</button>` : ""}
    </article>`;
}

export function outsideReportHtml(report: OutsideReportView, options: { canDelete: boolean }): string {
  return `
    <article class="report report-outside" data-umpire="${escapeHtml(report.umpireId)}" data-report-card="${escapeHtml(report.id)}">
      <h3>About ${escapeHtml(report.umpireName)}</h3>
      <p class="report-meta">
        From <strong>${escapeHtml(report.source_name)}</strong> (${escapeHtml(sourceRoleLabel(report.source_role).toLowerCase())})
        &middot; received ${escapeHtml(formatDate(`${report.received_on}T12:00:00`))}
        ${report.gameLabel ? `&middot; ${escapeHtml(report.gameLabel)}` : ""}
        &middot; entered by ${escapeHtml(report.enteredBy)}${report.edited_at ? ` (edited ${escapeHtml(reportWhen(report.edited_at))})` : ""}
      </p>
      <p class="report-text">${escapeHtml(report.body)}</p>
      ${followupsHtml(report.followups)}
      ${followupFormHtml("outside", report.id)}
      <p class="report-retention">${escapeHtml(retentionText(report.endsOn))}</p>
      <div class="report-actions">
        <button type="button" class="secondary-button" data-edit-outside="${escapeHtml(report.id)}">Edit</button>
        ${options.canDelete ? `<button type="button" class="secondary-button report-delete" data-delete-report="outside:${escapeHtml(report.id)}">Delete this report</button>` : ""}
      </div>
      ${logHtml("outside", report.id)}
    </article>`;
}

export function outsideFormHtml(input: {
  umpires: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  defaultSeasonId: string;
  todayKey: string;
}): string {
  return `
    <details class="report-form-box" id="outside-box">
      <summary>Add a report from outside</summary>
      <form id="outside-form" class="outside-form">
        <input type="hidden" id="outside-edit-id" value="" />
        <p class="report-guidance">${escapeHtml(REPORT_GUIDANCE)}</p>
        <p class="report-guidance">${escapeHtml(SAFETY_NOTICE)}</p>
        <label>Who is it about?
          <select id="outside-umpire" required>
            <option value="">Choose an umpire</option>
            ${input.umpires.map((umpire) => `<option value="${escapeHtml(umpire.id)}">${escapeHtml(umpire.name)}</option>`).join("")}
          </select>
        </label>
        <label>Season
          <select id="outside-season" required>
            ${input.seasons.map((season) => `<option value="${escapeHtml(season.id)}"${season.id === input.defaultSeasonId ? " selected" : ""}>${escapeHtml(season.name)}</option>`).join("")}
          </select>
        </label>
        <p class="field-help">The season decides when the report is deleted: a year after it ends.</p>
        <label>Which game (optional)
          <select id="outside-game"><option value="">No particular game</option></select>
        </label>
        <label>Who reported it?
          <input id="outside-source" maxlength="100" required placeholder="Name" />
        </label>
        <label>They are
          <select id="outside-role">
            ${SOURCE_ROLES.map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join("")}
          </select>
        </label>
        <label>Date received
          <input id="outside-date" type="date" value="${escapeHtml(input.todayKey)}" max="${escapeHtml(input.todayKey)}" required />
        </label>
        <label>What was reported
          <textarea id="outside-body" rows="5" maxlength="4000" required></textarea>
        </label>
        <p class="report-guidance"><strong>The umpire this is about cannot see it.</strong></p>
        <div class="report-form-actions">
          <button type="submit" class="primary-button" id="outside-save">Save report</button>
          <button type="button" class="secondary-button" id="outside-cancel" hidden>Cancel editing</button>
        </div>
      </form>
    </details>`;
}

export function reportsPageHtml(data: {
  gameReports: GameReportView[];
  outside: OutsideReportView[];
  umpires: { id: string; name: string }[];
  seasons: { id: string; name: string }[];
  defaultSeasonId: string;
  todayKey: string;
  canDelete: boolean;
  purged: number;
}): string {
  const noun = (n: number) => (n === 1 ? "report" : "reports");

  return `
    <main class="page">
      <section class="auth-card admin-card reports-card">
        <p class="eyebrow">RWCLL &middot; REPORTS</p>
        <h1>Reports</h1>
        <p class="report-privacy">
          Only the umpire chief and super admins can read these.
          <strong>An umpire cannot see a report from outside about themselves</strong>, and cannot change a
          post-game report after sending it. Reports are never printed or emailed, and each is deleted
          automatically a year after its season ends.
        </p>
        <p id="reports-message" class="message${data.purged ? " success" : ""}" role="status" aria-live="polite">${data.purged ? `${data.purged} expired ${noun(data.purged)} deleted automatically.` : ""}</p>

        <label class="report-filter">Show reports for
          <select id="reports-filter">
            <option value="">Everyone</option>
            ${data.umpires.map((umpire) => `<option value="${escapeHtml(umpire.id)}">${escapeHtml(umpire.name)}</option>`).join("")}
          </select>
        </label>

        <h2>Post-game reports (${data.gameReports.length})</h2>
        ${data.gameReports.length === 0
          ? `<p class="report-none">No post-game reports.</p>`
          : data.gameReports.map((report) => gameReportHtml(report, { admin: true, canDelete: data.canDelete })).join("")}

        <h2>Reports from outside (${data.outside.length})</h2>
        ${outsideFormHtml(data)}
        ${data.outside.length === 0
          ? `<p class="report-none">No reports from outside.</p>`
          : data.outside.map((report) => outsideReportHtml(report, { canDelete: data.canDelete })).join("")}
      </section>
    </main>`;
}

// The umpire's own part of Home: write a post-game report, and read what they have sent.
export function myReportsHtml(data: { games: { id: string; label: string }[]; reports: GameReportView[] }): string {
  return `
    <section class="my-reports" aria-labelledby="my-reports-title">
      <h2 id="my-reports-title">Post-game reports</h2>
      <p id="my-reports-message" class="message" role="status" aria-live="polite"></p>
      <details class="report-form-box" id="my-report-box">
        <summary>Write a post-game report</summary>
        ${data.games.length === 0
          ? `<p class="report-none">You have no games you can write a report about right now. You can write one from the moment a game starts until 14 days after it.</p>`
          : `
        <form id="my-report-form" class="outside-form">
          <p class="report-guidance">${escapeHtml(REPORT_GUIDANCE)}</p>
          <p class="report-guidance">${escapeHtml(SAFETY_NOTICE)}</p>
          <label>Which game?
            <select id="my-report-game" required>
              ${data.games.map((game) => `<option value="${escapeHtml(game.id)}">${escapeHtml(game.label)}</option>`).join("")}
            </select>
          </label>
          <label>What is it about?
            <select id="my-report-category">
              ${GAME_REPORT_CATEGORIES.map(([key, label]) => `<option value="${key}">${escapeHtml(label)}</option>`).join("")}
            </select>
          </label>
          <label>What happened
            <textarea id="my-report-body" rows="5" maxlength="4000" required></textarea>
          </label>
          <p class="report-guidance">
            <strong>Only the umpire chief and super admins can read this.</strong>
            You can read what you send and add follow-ups, but you cannot change it afterwards.
          </p>
          <button type="submit" class="primary-button">Send report</button>
        </form>`}
      </details>
      ${data.reports.length === 0
        ? ""
        : `<h3 class="my-reports-sent">What you have sent</h3>${data.reports.map((report) => gameReportHtml(report, { admin: false, canDelete: false })).join("")}`}
    </section>`;
}
