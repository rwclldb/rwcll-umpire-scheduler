import { escapeHtml } from "../ui";

// Pay rates: what each place pays per game, for each division, for youth and for
// adult umpires. (This file does the sums and writes the screen; payments.ts makes
// it work, and the database decides who may change anything.)

export const PAY_PLACES: [string, string][] = [
  ["plate", "Home plate"],
  ["first_base", "First base"],
  ["second_base", "Second base"],
  ["third_base", "Third base"],
  ["field", "Field"],
];

export const PAY_CLASSES: [string, string][] = [
  ["youth", "Youth umpires"],
  ["adult", "Adult umpires"],
];

export const MAX_CENTS = 100_000;   // $1000.00, the most one place can pay

export type PayRateRow = {
  division_id: string;
  classification: string;
  position: string;
  amount_cents: number;
  effective_on: string;   // "2026-10-01"
};

export type RateChange = { division_id: string; classification: string; position: string; amount_cents: number };

export const rateKey = (division: string, classification: string, place: string) => `${division}|${classification}|${place}`;

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// "50", "50.00", "$50", "$ 1,000.50" -> cents. Blank means "no rate". Anything that is
// not a plain amount of dollars and cents (letters, negatives, a fraction of a cent,
// more than $1000.00) is an error, never guessed at.
export type Parsed = { ok: true; cents: number | null } | { ok: false; error: string };

export function parseDollars(text: string): Parsed {
  const t = text.replace(/[\s,$]/g, "");
  if (t === "") return { ok: true, cents: null };

  if (!/^\d+(\.\d{1,2})?$/.test(t)) return { ok: false, error: "Enter an amount in dollars, like 50 or 25.50." };

  const [dollars, cents = ""] = t.split(".");
  const total = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return total > MAX_CENTS ? { ok: false, error: "The most one place can pay is $1000.00." } : { ok: true, cents: total };
}

// 5000 -> "50.00", null -> ""
export const centsToInput = (cents: number | null | undefined): string => (cents === null || cents === undefined ? "" : (cents / 100).toFixed(2));

// What each place pays on a date: the newest rate whose start date has passed.
export function resolveRates(rows: PayRateRow[], onDate: string): Map<string, number> {
  const best = new Map<string, PayRateRow>();

  for (const row of rows) {
    if (row.effective_on > onDate) continue;
    const key = rateKey(row.division_id, row.classification, row.position);
    const current = best.get(key);
    if (!current || row.effective_on > current.effective_on) best.set(key, row);
  }

  return new Map([...best].map(([key, row]) => [key, row.amount_cents]));
}

// What to save, given what each place pays now and what was typed. A cell left blank
// where nothing was set is not a change; a cell cleared where a rate was set becomes $0.
export function planSave(
  current: Map<string, number>,
  typed: Map<string, string>
): { changes: RateChange[]; errors: { key: string; message: string }[] } {
  const changes: RateChange[] = [];
  const errors: { key: string; message: string }[] = [];

  for (const [key, text] of typed) {
    const parsed = parseDollars(text);
    if (!parsed.ok) {
      errors.push({ key, message: parsed.error });
      continue;
    }

    const before = current.get(key);
    const after = parsed.cents ?? (before !== undefined && before > 0 ? 0 : undefined);
    if (after === undefined || after === before || (before === undefined && after === 0)) continue;

    const [division_id, classification, position] = key.split("|");
    changes.push({ division_id, classification, position, amount_cents: after });
  }

  return { changes, errors };
}

export type LogRow = {
  division_name: string;
  classification: string;
  position: string;
  effective_on: string;
  old_cents: number | null;
  new_cents: number;
  changed_by_name: string;
  changed_at: string;
};

const placeLabel = (value: string) => PAY_PLACES.find(([key]) => key === value)?.[1] ?? value;
const kindLabel = (value: string) => (value === "adult" ? "adult" : "youth");

const shortDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export function logLine(row: LogRow): string {
  const when = new Date(row.changed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\u202f/g, " ");
  const change = row.old_cents === null ? `set to ${formatMoney(row.new_cents)}` : `${formatMoney(row.old_cents)} to ${formatMoney(row.new_cents)}`;
  return `${when} \u00b7 ${row.changed_by_name}: ${row.division_name}, ${kindLabel(row.classification)}, ${placeLabel(row.position).toLowerCase()}, ${change} (from ${shortDate(row.effective_on)})`;
}

function gridHtml(
  classification: string,
  divisions: { id: string; name: string }[],
  current: Map<string, number>
): string {
  return `
    <div class="rates-table-wrap">
      <table class="rates-table">
        <caption class="rates-caption">${escapeHtml(PAY_CLASSES.find(([key]) => key === classification)?.[1] ?? classification)}, per game</caption>
        <thead>
          <tr>
            <th scope="col">Division</th>
            ${PAY_PLACES.map(([, label]) => `<th scope="col">${escapeHtml(label)}</th>`).join("")}
            <th scope="col"><span class="visually-hidden">Copy</span></th>
          </tr>
        </thead>
        <tbody>
          ${divisions.map((division) => `
            <tr data-rate-row="${escapeHtml(classification)}|${escapeHtml(division.id)}">
              <th scope="row">${escapeHtml(division.name)}</th>
              ${PAY_PLACES.map(([place, label]) => `
                <td><input class="rate-cell" inputmode="decimal" autocomplete="off"
                  data-rate-key="${escapeHtml(rateKey(division.id, classification, place))}"
                  value="${escapeHtml(centsToInput(current.get(rateKey(division.id, classification, place))))}"
                  aria-label="${escapeHtml(`${classification === "adult" ? "Adult" : "Youth"}, ${division.name}, ${label}, dollars per game`)}" /></td>`).join("")}
              <td><button type="button" class="secondary-button rate-copy"
                data-copy-row="${escapeHtml(classification)}|${escapeHtml(division.id)}"
                aria-label="Copy the ${escapeHtml(division.name)} ${classification === "adult" ? "adult" : "youth"} row to every division">Copy to all</button></td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

export function payRatesHtml(input: {
  divisions: { id: string; name: string }[];
  current: Map<string, number>;
  effectiveOn: string;
  todayKey: string;
  minDate: string;
  maxDate: string;
  log: LogRow[];
}): string {
  return `
    <section class="pay-rates" aria-labelledby="pay-rates-title">
      <h2 id="pay-rates-title">Pay rates</h2>
      <p class="report-privacy">
        What each place pays <strong>per game</strong>, for each division. Youth and adult umpires have separate rates.
        Adult rates start empty, which means adults are not paid; fill them in if that changes.
        A rate applies to games on or after its <strong>start date</strong>, so a change never rewrites the past.
        This only sets the amounts: nothing is paid from this page.
      </p>
      <p id="rates-message" class="message" role="status" aria-live="polite"></p>

      <label class="rates-date">New rates start on
        <input type="date" id="rates-date" value="${escapeHtml(input.effectiveOn)}" min="${escapeHtml(input.minDate)}" max="${escapeHtml(input.maxDate)}" required />
      </label>
      <p class="field-help">The amounts shown are what applies on this date. Change a start date, or leave it as today.</p>

      ${input.divisions.length === 0
        ? `<p class="report-none">There are no divisions yet. Set them up in League Setup first.</p>`
        : `${gridHtml("youth", input.divisions, input.current)}${gridHtml("adult", input.divisions, input.current)}
      <div class="rates-actions">
        <button type="button" class="primary-button" id="rates-save">Save rates</button>
        <button type="button" class="secondary-button" id="rates-reset">Undo my changes</button>
      </div>`}

      <h3 class="rates-log-title">Recent changes</h3>
      ${input.log.length === 0
        ? `<p class="report-none">No rates have been set yet.</p>`
        : `<ul class="rates-log">${input.log.map((row) => `<li>${escapeHtml(logLine(row))}</li>`).join("")}</ul>`}
    </section>`;
}
