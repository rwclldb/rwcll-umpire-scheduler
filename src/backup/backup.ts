import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { swapHandlers, say } from "../payments/shared";
import { buildExportZip, exportFileName, totalRows } from "./export-model";
import type { ExportedTable } from "./export-model";

// Administration > Backup and export (super admins). "Download everything" asks the database for
// every table of the league's data, one at a time, builds a zip of spreadsheets (CSV) and JSON
// files in the browser, and offers it for download. The database keeps a record of each download.

type LastDownload = {
  finished_at: string;
  exported_by_name: string;
  tables_count: number | null;
  rows_count: number | null;
};

export type ExportResult = { fileName: string; tables: number; rows: number; bytes: number; logged: boolean };

const WARN_AFTER_DAYS = 30;

// Offers bytes to the person as a file.
function downloadBytes(fileName: string, bytes: Uint8Array, type: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Everything, start to finish. `progress` is told what is happening. It throws with a plain message
// if anything fails, and then nothing is downloaded.
export async function downloadEverything(progress: (text: string) => void, when: Date = new Date()): Promise<ExportResult> {
  progress("Starting…");

  const started = await supabase.rpc("begin_export");
  if (started.error) throw new Error(started.error.message);

  const info = started.data as { export_id?: string; tables?: string[]; by?: string } | null;
  if (!info || typeof info.export_id !== "string" || !Array.isArray(info.tables)) {
    throw new Error("The database did not answer the way it should. Has the latest database update been applied?");
  }

  const names = info.tables;
  const tables: ExportedTable[] = [];

  for (let i = 0; i < names.length; i++) {
    progress(`Getting ${names[i]} (${i + 1} of ${names.length})…`);

    const answer = await supabase.rpc("export_table", { p_export_id: info.export_id, p_table: names[i] });
    if (answer.error) throw new Error(`${names[i]}: ${answer.error.message}`);

    tables.push({ name: names[i], rows: Array.isArray(answer.data) ? (answer.data as Record<string, unknown>[]) : [] });
  }

  progress("Building the file…");
  const bytes = buildExportZip({ tables, when, by: info.by ?? "A super admin" });
  const fileName = exportFileName(when);
  const rows = totalRows(tables);

  // The file is delivered even if the record of it cannot be saved (the person is told).
  const finished = await supabase.rpc("finish_export", { p_export_id: info.export_id, p_tables: tables.length, p_rows: rows });

  downloadBytes(fileName, bytes, "application/zip");

  return { fileName, tables: tables.length, rows, bytes: bytes.length, logged: !finished.error };
}

function whenText(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
}

const sizeText = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// The line about the last download, and a warning when it has been a long time (or never).
export function lastDownloadHtml(last: LastDownload | null, now: number = Date.now()): string {
  if (!last) {
    return `<p class="backup-last backup-warn"><strong>No one has downloaded a copy yet.</strong> Download one now, and again every month or so.</p>`;
  }

  const days = Math.floor((now - Date.parse(last.finished_at)) / 86400000);
  const detail = last.tables_count !== null && last.rows_count !== null
    ? ` (${last.tables_count} tables, ${last.rows_count.toLocaleString("en-US")} rows)`
    : "";

  return `
    <p class="backup-last${days >= WARN_AFTER_DAYS ? " backup-warn" : ""}">
      Last downloaded: <strong>${escapeHtml(whenText(last.finished_at))}</strong> by ${escapeHtml(last.exported_by_name)}${escapeHtml(detail)}.
      ${days >= WARN_AFTER_DAYS ? `<strong>That was ${days} days ago.</strong> Download a new copy.` : ""}
    </p>`;
}

export async function renderBackup(container: HTMLElement): Promise<void> {
  const handlers = swapHandlers(container);

  container.innerHTML = `
    <h2>Backup and export</h2>
    <p class="directory-description">
      Download a copy of all the league's data (people, games, assignments, families, payments and more) as a zip file
      of spreadsheets. Keep it somewhere safe: it is your own copy, in a form you can open without this app.
    </p>

    <div id="backup-last"><p class="backup-last">Checking when a copy was last downloaded…</p></div>

    <div class="account-actions">
      <button id="backup-download" class="primary-button" type="button">Download everything</button>
    </div>
    <p id="backup-message" class="message" role="status" aria-live="polite"></p>

    <h3>What is in the file</h3>
    <ul class="backup-list">
      <li>A spreadsheet (CSV) and a JSON copy of every table of the league's data.</li>
      <li>A README that lists each table and how many rows it holds.</li>
    </ul>

    <h3>What is not in the file</h3>
    <ul class="backup-list">
      <li>Sign-in accounts and passwords. After a restore, people would have to reset their passwords.</li>
      <li>Dashboard settings (email templates, sign-in settings, email sending secrets) and the app itself.</li>
    </ul>

    <p class="directory-description">
      This is a readable copy, not the full recovery backup. The full backup (<code>scripts\\backup-live.ps1</code>, described
      in <code>RECOVERY.md</code>) is what rebuilds everything after a disaster. Take it before every database update and weekly
      during the season.
    </p>

    <p class="backup-privacy"><strong>The file contains private information about people, including children.</strong>
      Keep it off GitHub, out of email and out of shared folders. Store it on an encrypted drive, and delete copies you no longer need.</p>
  `;

  const button = container.querySelector<HTMLButtonElement>("#backup-download")!;
  const last = container.querySelector<HTMLElement>("#backup-last")!;

  // when a copy was last downloaded
  void (async () => {
    const { data, error } = await supabase
      .from("export_log")
      .select("finished_at, exported_by_name, tables_count, rows_count")
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .limit(1);

    if (!container.isConnected) return;

    if (error) {
      last.innerHTML = `<p class="backup-last">Could not check when a copy was last downloaded. ${escapeHtml(error.message)}</p>`;
      return;
    }

    const rows = ((data ?? []) as LastDownload[])
      .filter((row) => Boolean(row.finished_at))
      .sort((a, b) => Date.parse(b.finished_at) - Date.parse(a.finished_at));

    last.innerHTML = lastDownloadHtml(rows[0] ?? null);
  })();

  button.addEventListener("click", () => {
    button.disabled = true;
    say(container, "#backup-message", "Starting…", "success");

    void (async () => {
      try {
        const result = await downloadEverything((text) => say(container, "#backup-message", text, "success"));

        say(
          container,
          "#backup-message",
          `Downloaded ${result.fileName}: ${result.tables} tables, ${result.rows.toLocaleString("en-US")} rows (${sizeText(result.bytes)}).` +
            (result.logged ? "" : " The download could not be recorded in the log, but the file is complete."),
          "success"
        );

        if (result.logged && container.isConnected) {
          last.innerHTML = lastDownloadHtml({
            finished_at: new Date().toISOString(),
            exported_by_name: "you",
            tables_count: result.tables,
            rows_count: result.rows,
          });
        }
      } catch (error) {
        say(container, "#backup-message", `Nothing was downloaded. ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        button.disabled = false;
      }
    })();
  }, { signal: handlers.signal });
}
