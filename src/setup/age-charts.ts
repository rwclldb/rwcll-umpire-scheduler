import { CHART_MONTHS, MAX_CHART_FILE_BYTES, MAX_LL_AGE, MIN_LL_AGE } from "./constants";
import { state } from "./state";
import { supabase } from "../supabase";
import type { AgeChartRecord, ChartEntry } from "./types";
import { escapeHtml } from "../ui";

export type ChartParseResult = {
  entries: ChartEntry[];
  errors: string[];
};

export function parseAgeChartCsv(text: string): ChartParseResult {
  const errors: string[] = [];
  const entries: ChartEntry[] = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/);

  let headerSeen = false;
  let dataRows = 0;
  const seenMonthYear = new Set<string>();
  const seenMonthAge = new Set<string>();

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const line = lines[index].trim();
    if (!line) continue;

    if (line.includes('"')) {
      errors.push(`Line ${lineNumber}: quotation marks are not supported.`);
      continue;
    }

    const cells = line.split(",").map((cell) => cell.trim());

    if (!headerSeen) {
      headerSeen = true;
      const expected = [...CHART_MONTHS, "AGE"];
      const actual = cells.map((cell) => cell.toUpperCase());
      const headerMatches =
        actual.length === expected.length &&
        expected.every((name, position) => actual[position] === name);

      if (!headerMatches) {
        errors.push(
          `Line ${lineNumber}: the header must be exactly ${expected.join(",")}.`,
        );
        return { entries: [], errors };
      }
      continue;
    }

    dataRows++;

    if (cells.length !== 13) {
      errors.push(
        `Line ${lineNumber}: expected 13 values but found ${cells.length}.`,
      );
      continue;
    }

    const ageText = cells[12];
    if (!/^\d+$/.test(ageText)) {
      errors.push(
        `Line ${lineNumber}: AGE "${ageText}" is not a whole number.`,
      );
      continue;
    }

    const age = Number(ageText);
    if (age < MIN_LL_AGE || age > MAX_LL_AGE) {
      errors.push(
        `Line ${lineNumber}: AGE ${age} is outside the supported range ` +
        `${MIN_LL_AGE}–${MAX_LL_AGE}.`,
      );
      continue;
    }

    const rowEntries: ChartEntry[] = [];
    const badMonths: string[] = [];

    cells.slice(0, 12).forEach((cell, position) => {
      const year = Number(cell);
      if (!/^\d{4}$/.test(cell) || year < 1900 || year > 2100) {
        badMonths.push(CHART_MONTHS[position]);
      } else {
        rowEntries.push({
          birth_month: position + 1,
          birth_year: year,
          ll_age: age,
        });
      }
    });

    if (badMonths.length > 0) {
      errors.push(
        `Line ${lineNumber}: invalid birth year in ${badMonths.join(", ")}. ` +
        `Use four-digit years.`,
      );
      continue;
    }

    const repeatedMonths: string[] = [];
    let repeatedAge = false;

    for (const entry of rowEntries) {
      if (seenMonthYear.has(`${entry.birth_month}-${entry.birth_year}`)) {
        repeatedMonths.push(CHART_MONTHS[entry.birth_month - 1]);
      }
      if (seenMonthAge.has(`${entry.birth_month}-${entry.ll_age}`)) {
        repeatedAge = true;
      }
    }

    if (repeatedMonths.length > 0) {
      errors.push(
        `Line ${lineNumber}: the birth year repeats one already used ` +
        `for ${repeatedMonths.join(", ")}.`,
      );
      continue;
    }

    if (repeatedAge) {
      errors.push(`Line ${lineNumber}: age ${age} appears more than once.`);
      continue;
    }

    for (const entry of rowEntries) {
      seenMonthYear.add(`${entry.birth_month}-${entry.birth_year}`);
      seenMonthAge.add(`${entry.birth_month}-${entry.ll_age}`);
      entries.push(entry);
    }
  }

  if (!headerSeen) {
    errors.push("The file is empty.");
  } else if (dataRows === 0) {
    errors.push("The file has a header but no data rows.");
  }

  return { entries: errors.length > 0 ? [] : entries, errors };
}

export function summarizeEntries(entries: ChartEntry[]): string {
  const ages = entries.map((entry) => entry.ll_age);
  const years = entries.map((entry) => entry.birth_year);
  return (
    `${entries.length} entries, Little League ages ` +
    `${Math.min(...ages)}–${Math.max(...ages)}, birth years ` +
    `${Math.min(...years)}–${Math.max(...years)}.`
  );
}

export async function loadAgeCharts(): Promise<AgeChartRecord[] | null> {
  const { data, error } = await supabase
    .from("little_league_age_charts")
    .select("id, chart_year, name")
    .order("chart_year", { ascending: false })
    .order("name");

  if (error) {
    console.error("Age chart load failed:", error.message);
    return null;
  }
  return (data ?? []) as AgeChartRecord[];
}

export function renderChartOptions(
  charts: AgeChartRecord[],
  selectedId: string | null,
): string {
  return (
    `<option value="">No chart selected</option>` +
    charts.map((chart) => `
      <option value="${escapeHtml(chart.id)}"
        ${chart.id === selectedId ? "selected" : ""}>
        ${escapeHtml(chart.name)}
      </option>
    `).join("")
  );
}

export function showChartFeedback(
  form: HTMLFormElement,
  kind: "error" | "success" | "info",
  headline: string,
  details: string[] = [],
): void {
  const element = form.querySelector<HTMLElement>("#chart-import-feedback");
  if (!element) return;

  const shown = details.slice(0, 8);
  const more = details.length > shown.length
    ? `<p>…and ${details.length - shown.length} more.</p>`
    : "";
  const list = shown.length
    ? `<ul>${shown.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : "";

  element.innerHTML =
    `<p class="message ${kind === "info" ? "" : kind}">` +
    `${escapeHtml(headline)}</p>${list}${more}`;
}

export function wireChartImport(form: HTMLFormElement): void {
  const fileInput = form.querySelector<HTMLInputElement>("#chart-file");
  const yearInput = form.querySelector<HTMLInputElement>("#chart-year");
  const nameInput = form.querySelector<HTMLInputElement>("#chart-name");
  const importButton =
    form.querySelector<HTMLButtonElement>("#chart-import-button");
  const chartSelect = form.querySelector<HTMLSelectElement>("#season-chart");

  if (!fileInput || !yearInput || !nameInput || !importButton || !chartSelect) {
    return;
  }

  let pendingEntries: ChartEntry[] = [];

  // Pressing Enter in an import field must not submit the season form.
  form.querySelector("#chart-import")
    ?.addEventListener("keydown", (event) => {
      if ((event as KeyboardEvent).key === "Enter") {
        event.preventDefault();
      }
    });

  fileInput.addEventListener("change", async () => {
    pendingEntries = [];
    importButton.disabled = true;

    const file = fileInput.files?.[0];
    if (!file) {
      showChartFeedback(form, "info", "");
      return;
    }

    if (file.size > MAX_CHART_FILE_BYTES) {
      showChartFeedback(
        form,
        "error",
        "That file is too large for an age chart. Choose the chart CSV.",
      );
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      showChartFeedback(form, "error", "The file could not be read.");
      return;
    }

    const result = parseAgeChartCsv(text);

    if (result.errors.length > 0) {
      showChartFeedback(
        form,
        "error",
        "This file can't be imported. Fix these problems and choose it again:",
        result.errors,
      );
      return;
    }

    pendingEntries = result.entries;

    const yearInName = file.name.match(/(20\d{2})/);
    if (!yearInput.value && yearInName) {
      yearInput.value = yearInName[1];
    }
    if (!nameInput.value.trim() && yearInput.value) {
      nameInput.value = `${yearInput.value} Little League Age Chart`;
    }

    showChartFeedback(
      form,
      "success",
      `File checked: ${summarizeEntries(pendingEntries)} ` +
        `Confirm the year and name, then select Import chart.`,
    );
    importButton.disabled = false;
  });

  importButton.addEventListener("click", async () => {
    const year = Number(yearInput.value);
    const name = nameInput.value.trim();

    if (pendingEntries.length === 0) {
      showChartFeedback(form, "error", "Choose a chart CSV file first.");
      return;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      showChartFeedback(
        form,
        "error",
        "Enter a chart year between 2000 and 2100.",
      );
      return;
    }

    if (!name) {
      showChartFeedback(form, "error", "Enter a chart name.");
      return;
    }

    importButton.disabled = true;
    importButton.textContent = "Importing…";

    const { data, error } = await supabase.rpc("import_age_chart", {
      p_chart_year: year,
      p_name: name,
      p_entries: pendingEntries,
    });

    importButton.textContent = "Import chart";

    if (error) {
      showChartFeedback(
        form,
        "error",
        error.code === "23505"
          ? "A chart with this year and name already exists. " +
            "Choose a different name."
          : `Could not import the chart: ${error.message}`,
      );
      importButton.disabled = false;
      return;
    }

    const newChartId = typeof data === "string" ? data : null;
    const refreshed = await loadAgeCharts();

    pendingEntries = [];
    fileInput.value = "";

    if (!refreshed) {
      showChartFeedback(
        form,
        "success",
        "The chart was imported, but the list could not refresh. " +
          "Select Refresh at the top of League Setup.",
      );
      return;
    }

    state.ageCharts = refreshed;
    chartSelect.innerHTML = renderChartOptions(state.ageCharts, newChartId);

    showChartFeedback(
      form,
      "success",
      "Chart imported and selected. It is saved, but it is not attached " +
        "to this season until you select Save season.",
    );
  });
}
