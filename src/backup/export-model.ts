import { safeFileName, toCsv } from "../games/csv-out";
import { createZip } from "./zip";
import type { ZipFile } from "./zip";

// What goes into the "Download everything" zip: for each table a spreadsheet (CSV) and a JSON copy,
// and a README that says what is and is not included.

export type ExportedTable = { name: string; rows: Record<string, unknown>[] };

// One value as text for a spreadsheet: empty for nothing, true/false, and lists or objects as JSON.
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// The rows of one table as a grid: the column names first (in the order they first appear), then
// one line per row. A table with no rows has no columns to show.
export function tableToGrid(rows: Record<string, unknown>[]): string[][] {
  const columns: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  if (columns.length === 0) return [];
  return [columns, ...rows.map((row) => columns.map((column) => cellText(row[column])))];
}

export function totalRows(tables: ExportedTable[]): number {
  return tables.reduce((sum, table) => sum + table.rows.length, 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

// For example "rwcll-data-2026-11-05-1530.zip" (the computer's own date and time).
export function exportFileName(when: Date): string {
  return `rwcll-data-${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-${pad(when.getHours())}${pad(when.getMinutes())}.zip`;
}

export function readmeText(tables: ExportedTable[], when: Date, by: string): string {
  const stamp = when.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" });
  const width = Math.max(10, ...tables.map((table) => table.name.length));

  return [
    "RWCLL umpire management: a copy of the league's data",
    "=====================================================",
    `Downloaded: ${stamp}`,
    `By: ${by}`,
    `${tables.length} tables, ${totalRows(tables)} rows`,
    "",
    "WHAT IS IN THIS FILE",
    "  csv\\    one spreadsheet for each table. Open them in Excel or Google Sheets.",
    "           Text that begins with = + - or @ has an apostrophe added in front, so a spreadsheet",
    "           does not treat it as a formula. The JSON files have the exact values.",
    "  json\\   the same data exactly as stored, one file for each table.",
    "",
    "WHAT IS NOT IN THIS FILE",
    "  - Sign-in accounts and passwords. Without them, people would have to reset their passwords.",
    "  - Dashboard settings (email templates, sign-in settings, email sending secrets).",
    "  - The app itself (it is kept in Git).",
    "  For a full backup that can rebuild everything, use scripts\\backup-live.ps1 (see RECOVERY.md).",
    "",
    "PLEASE KEEP THIS FILE PRIVATE",
    "  It contains personal information about people, including children: names, contact details,",
    "  birth dates, families, reports and payments. Keep it off GitHub, out of email and out of shared",
    "  folders. Store it only on an encrypted drive or in an encrypted archive, and delete copies you",
    "  no longer need.",
    "",
    "THE TABLES (rows in each)",
    ...tables.map((table) => `  ${table.name.padEnd(width)}  ${table.rows.length}`),
    "",
  ].join("\r\n");
}

// Every file for the zip.
export function buildExportFiles(input: { tables: ExportedTable[]; when: Date; by: string }): ZipFile[] {
  const encoder = new TextEncoder();
  const files: ZipFile[] = [{ name: "README.txt", data: encoder.encode(readmeText(input.tables, input.when, input.by)) }];

  for (const table of input.tables) {
    const name = safeFileName(table.name);
    const grid = tableToGrid(table.rows);
    files.push({ name: `csv/${name}.csv`, data: encoder.encode(toCsv(grid.length ? grid : [[]])) });
    files.push({ name: `json/${name}.json`, data: encoder.encode(JSON.stringify(table.rows, null, 1)) });
  }

  return files;
}

// The finished zip, ready to offer for download.
export function buildExportZip(input: { tables: ExportedTable[]; when: Date; by: string }): Uint8Array {
  return createZip(buildExportFiles(input), input.when);
}
