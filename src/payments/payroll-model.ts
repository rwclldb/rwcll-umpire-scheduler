import { escapeHtml } from "../ui";
import { MAX_CENTS, PAY_PLACES, formatMoney } from "./pay-rates-model";

// Payees, earnings, adjustments and payrolls: the sums and the screens' HTML. (payroll.ts
// makes them work; the database decides who may do anything and checks every rule again.)

export type UmpireRow = {
  umpire_id: string;
  display_name: string;
  classification: string;
  eligibility_status: string;
  has_account: boolean;
  payee_id: string | null;
  effective_payee_id: string | null;
  effective_payee_name: string | null;
};

export type Candidate = { profile_id: string; display_name: string; email: string | null; is_parent: boolean };
export type EarningRow = { id: string; umpire_id: string; game_date: string; division_name: string; position: string; amount_cents: number };
export type AdjustmentRow = { id: string; umpire_id: string; amount_cents: number; reason: string; created_by_name: string };

export type PayrollRow = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  note: string | null;
  total_cents: number;
  created_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
};

export type LineRow = {
  payroll_id: string;
  umpire_id: string;
  umpire_name: string;
  payee_profile_id: string | null;
  games: number;
  earned_cents: number;
  adjustments_cents: number;
  total_cents: number;
};

export type PaymentRow = {
  id: string;
  payroll_id: string;
  payee_profile_id: string | null;
  payee_name: string;
  amount_cents: number;
  umpire_count: number;
  status: string;
  method: string | null;
  reference: string | null;
  paid_at: string | null;
};

export type MoneyLogRow = { action: string; detail: string; actor_name: string; acted_at: string };

const placeLabel = (value: string) => PAY_PLACES.find(([key]) => key === value)?.[1] ?? value;

export const METHODS: [string, string][] = [
  ["check", "Check"],
  ["bank_transfer", "Bank transfer"],
  ["cash", "Cash"],
  ["other", "Other"],
];

const shortDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const longDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const signedMoney = (cents: number) => (cents < 0 ? `-${formatMoney(-cents)}` : formatMoney(cents));

// ---------------------------------------------------------------- an adjustment's amount
// "10", "+10", "-5.50", "$-5" -> cents, with the sign. Zero and more than $1000.00 are refused.
export type ParsedSigned = { ok: true; cents: number } | { ok: false; error: string };

export function parseSignedDollars(text: string): ParsedSigned {
  const t = text.replace(/[\s,$]/g, "");
  const match = /^([+-])?(\d+(?:\.\d{1,2})?)$/.exec(t);
  if (!match) return { ok: false, error: "Enter an amount in dollars, like 10 or -5.50 (a minus takes money away)." };

  const [dollars, cents = ""] = match[2].split(".");
  const total = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));

  if (total === 0) return { ok: false, error: "An adjustment cannot be zero." };
  if (total > MAX_CENTS) return { ok: false, error: "An adjustment can be at most $1000.00 either way." };
  return { ok: true, cents: match[1] === "-" ? -total : total };
}

// ---------------------------------------------------------------- spreadsheet export
// A name that starts with = + - or @ can run as a FORMULA when a spreadsheet opens the file,
// and names come from people's accounts, so such text is neutralized with a leading '.
export function csvText(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const csvMoney = (cents: number) => (cents / 100).toFixed(2);

export function payrollCsv(payroll: PayrollRow, lines: LineRow[], payments: PaymentRow[]): string {
  const paymentFor = (id: string | null) => payments.find((p) => p.payee_profile_id !== null && p.payee_profile_id === id);
  // by payee, then umpire; umpires with no payee go last (decided explicitly: a stand-in character
  // such as "~" would sort FIRST in some locales)
  const rows = [...lines].sort((a, b) => {
    const payA = paymentFor(a.payee_profile_id);
    const payB = paymentFor(b.payee_profile_id);
    if (Boolean(payA) !== Boolean(payB)) return payA ? -1 : 1;
    return (payA?.payee_name ?? "").localeCompare(payB?.payee_name ?? "") || a.umpire_name.localeCompare(b.umpire_name);
  });

  const header = ["Period start", "Period end", "Payee", "Umpire", "Games", "Earned", "Adjustments", "Total", "Payment", "Method", "Reference"];
  const body = rows.map((line) => {
    const payment = paymentFor(line.payee_profile_id);
    return [
      payroll.period_start,
      payroll.period_end,
      csvText(payment?.payee_name ?? "(no payee)"),
      csvText(line.umpire_name),
      String(line.games),
      csvMoney(line.earned_cents),
      csvMoney(line.adjustments_cents),
      csvMoney(line.total_cents),
      payment ? payment.status : "none",
      csvText(payment?.method ?? ""),
      csvText(payment?.reference ?? ""),
    ].join(",");
  });

  return [header.join(","), ...body].join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------- who is paid
export const needsPayee = (umpire: UmpireRow) => umpire.effective_payee_id === null;

export function sortUmpiresForPayees(umpires: UmpireRow[]): UmpireRow[] {
  return [...umpires].sort((a, b) => Number(needsPayee(b)) - Number(needsPayee(a)) || a.display_name.localeCompare(b.display_name));
}

export function candidateOptions(candidates: Candidate[], selected: string | null): string {
  const option = (c: Candidate) => `<option value="${escapeHtml(c.profile_id)}"${c.profile_id === selected ? " selected" : ""}>${escapeHtml(c.display_name)}${c.email && c.email !== c.display_name ? ` (${escapeHtml(c.email)})` : ""}</option>`;
  const parents = candidates.filter((c) => c.is_parent);
  const others = candidates.filter((c) => !c.is_parent);

  return `${parents.length ? `<optgroup label="Parents and guardians">${parents.map(option).join("")}</optgroup>` : ""}${others.length ? `<optgroup label="Other accounts">${others.map(option).join("")}</optgroup>` : ""}`;
}

export function payeesHtml(umpires: UmpireRow[]): string {
  const missing = umpires.filter(needsPayee).filter((u) => u.eligibility_status === "active").length;

  return `
    <section class="payees" aria-labelledby="payees-title">
      <h2 id="payees-title">Who is paid</h2>
      <p class="report-privacy">
        Each umpire's pay goes to a <strong>payee</strong>. An <strong>adult</strong> umpire is paid to their own account
        unless you choose someone else. A <strong>youth</strong> umpire must have a <strong>parent or guardian's account</strong>
        chosen: Stripe does not allow a minor to hold a payout account. Brothers and sisters can share one parent, and are paid
        together as one family. A change here affects payrolls made from now on.
      </p>
      <p id="payees-message" class="message" role="status" aria-live="polite"></p>
      <p class="payees-summary" id="payees-summary">${missing === 0 ? "Everyone has a payee." : `<strong>${missing}</strong> active ${missing === 1 ? "umpire still needs" : "umpires still need"} a payee.`}</p>
      ${umpires.length === 0
        ? `<p class="report-none">There are no umpires yet.</p>`
        : `<div class="rates-table-wrap"><table class="rates-table payees-table">
            <caption class="visually-hidden">Who receives each umpire's pay</caption>
            <thead><tr><th scope="col">Umpire</th><th scope="col">Kind</th><th scope="col">Paid to</th><th scope="col"><span class="visually-hidden">Save</span></th></tr></thead>
            <tbody>${sortUmpiresForPayees(umpires).map((u) => `
              <tr data-payee-row="${escapeHtml(u.umpire_id)}">
                <th scope="row">${escapeHtml(u.display_name)}${u.eligibility_status !== "active" ? ` <span class="payee-flag">(${escapeHtml(u.eligibility_status)})</span>` : ""}${needsPayee(u) ? ` <span class="payee-flag payee-flag-missing">needs a payee</span>` : ""}</th>
                <td>${u.classification === "adult" ? "Adult" : "Youth"}${u.has_account ? "" : ` <span class="payee-flag">(no account)</span>`}</td>
                <td><select class="payee-select" data-payee-select="${escapeHtml(u.umpire_id)}" data-current="${escapeHtml(u.payee_id ?? "")}" aria-label="${escapeHtml(`Who is paid for ${u.display_name}`)}">
                  <option value="">${u.classification === "adult" ? "Themselves" : "Choose a parent or guardian\u2026"}</option>
                  ${u.payee_id ? `<option value="${escapeHtml(u.payee_id)}" selected>${escapeHtml(u.effective_payee_name ?? "Chosen account")}</option>` : ""}
                </select></td>
                <td><button type="button" class="secondary-button rate-copy" data-save-payee="${escapeHtml(u.umpire_id)}">Save</button></td>
              </tr>`).join("")}</tbody>
          </table></div>`}
    </section>`;
}

// ---------------------------------------------------------------- earnings
export function earningsHtml(input: {
  umpires: UmpireRow[];
  earnings: EarningRow[];
  adjustments: AdjustmentRow[];
  from: string;
  through: string;
  todayKey: string;
}): string {
  const name = (id: string) => input.umpires.find((u) => u.umpire_id === id)?.display_name ?? "Unknown umpire";
  const earned = input.earnings.reduce((sum, e) => sum + e.amount_cents, 0);
  const adjusted = input.adjustments.reduce((sum, a) => sum + a.amount_cents, 0);
  const sortedEarnings = [...input.earnings].sort((a, b) => a.game_date.localeCompare(b.game_date) || name(a.umpire_id).localeCompare(name(b.umpire_id)));

  return `
    <section class="earnings-section" aria-labelledby="earnings-title">
      <h2 id="earnings-title">Earnings</h2>
      <p class="report-privacy">
        An umpire earns a game when their <strong>arrival is recorded</strong> (their own check-in, or marked on the Field board)
        on a game that was played and not canceled. The amount is what that place paid <strong>on the game's date</strong>, and it
        is kept as it was at that moment, so a later change of rates does not alter it. Running this again only adds what is new.
      </p>
      <p id="earn-message" class="message" role="status" aria-live="polite"></p>

      <div class="earn-form">
        <label>From <input type="date" id="earn-from" value="${escapeHtml(input.from)}" /></label>
        <label>Through <input type="date" id="earn-through" value="${escapeHtml(input.through)}" max="${escapeHtml(input.todayKey)}" /></label>
        <button type="button" class="primary-button" id="earn-run">Work out earnings</button>
      </div>

      <h3>Waiting to be paid</h3>
      <p class="earn-summary" id="earn-summary">${input.earnings.length} ${input.earnings.length === 1 ? "earning" : "earnings"}, ${formatMoney(earned)}${input.adjustments.length ? `, and adjustments of ${signedMoney(adjusted)}` : ""}.</p>
      ${input.earnings.length === 0
        ? `<p class="report-none">Nothing is waiting. Work out earnings above, or everything has been put in a payroll.</p>`
        : `<div class="rates-table-wrap"><table class="rates-table earn-table">
            <caption class="visually-hidden">Earnings not yet in a payroll</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Umpire</th><th scope="col">Division</th><th scope="col">Place</th><th scope="col">Amount</th><th scope="col"><span class="visually-hidden">Void</span></th></tr></thead>
            <tbody>${sortedEarnings.map((e) => `
              <tr data-earning="${escapeHtml(e.id)}">
                <td>${escapeHtml(shortDate(e.game_date))}</td><th scope="row">${escapeHtml(name(e.umpire_id))}</th><td>${escapeHtml(e.division_name)}</td><td>${escapeHtml(placeLabel(e.position))}</td>
                <td class="money">${formatMoney(e.amount_cents)}</td>
                <td><button type="button" class="secondary-button rate-copy" data-void-earning="${escapeHtml(e.id)}" aria-label="Void the earning of ${escapeHtml(name(e.umpire_id))} on ${escapeHtml(shortDate(e.game_date))}">Void</button></td>
              </tr>`).join("")}</tbody>
          </table></div>`}

      <h3>Adjustments</h3>
      <p class="field-help">For anything the arrivals do not capture: a substitute who worked, a bonus, a correction. A minus takes money away.</p>
      ${input.adjustments.length === 0 ? `<p class="report-none">No adjustments are waiting.</p>` : `<ul class="rates-log adj-list">${input.adjustments.map((a) => `
        <li data-adjustment="${escapeHtml(a.id)}">${escapeHtml(name(a.umpire_id))}: <strong>${signedMoney(a.amount_cents)}</strong> ${escapeHtml(a.reason)} <span class="field-help">(${escapeHtml(a.created_by_name)})</span>
          <button type="button" class="secondary-button rate-copy" data-void-adjustment="${escapeHtml(a.id)}">Void</button></li>`).join("")}</ul>`}

      <div class="adj-form">
        <label>Umpire
          <select id="adj-umpire"><option value="">Choose&hellip;</option>${[...input.umpires].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((u) => `<option value="${escapeHtml(u.umpire_id)}">${escapeHtml(u.display_name)}</option>`).join("")}</select>
        </label>
        <label>Amount ($) <input id="adj-amount" inputmode="decimal" autocomplete="off" placeholder="10 or -5.50" /></label>
        <label>Reason <input id="adj-reason" maxlength="200" autocomplete="off" /></label>
        <button type="button" class="secondary-button" id="adj-add">Add adjustment</button>
      </div>
    </section>`;
}

// ---------------------------------------------------------------- payrolls
export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  approved: "Approved: waiting to be paid",
  paid: "Paid",
  discarded: "Discarded",
};

export const periodLabel = (p: { period_start: string; period_end: string }) => `${longDate(p.period_start)} to ${longDate(p.period_end)}`;

function paymentsTable(payments: PaymentRow[], editable: boolean): string {
  if (payments.length === 0) return `<p class="report-none">Nobody is owed anything in this payroll.</p>`;

  return `<div class="rates-table-wrap"><table class="rates-table pay-table">
    <thead><tr><th scope="col">Paid to</th><th scope="col">Umpires</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
    <tbody>${[...payments].sort((a, b) => a.payee_name.localeCompare(b.payee_name)).map((p) => `
      <tr data-payment="${escapeHtml(p.id)}">
        <th scope="row">${escapeHtml(p.payee_name)}</th><td>${p.umpire_count}</td><td class="money">${formatMoney(p.amount_cents)}</td>
        <td>${p.status === "paid"
          ? `Paid${p.method ? ` by ${escapeHtml(METHODS.find(([key]) => key === p.method)?.[1].toLowerCase() ?? p.method)}` : ""}${p.reference ? ` (${escapeHtml(p.reference)})` : ""}`
          : editable
            ? `<span class="pay-record">
                <select data-pay-method="${escapeHtml(p.id)}" aria-label="How ${escapeHtml(p.payee_name)} was paid">${METHODS.map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select>
                <input data-pay-reference="${escapeHtml(p.id)}" maxlength="100" placeholder="Check number or note" aria-label="Reference for ${escapeHtml(p.payee_name)}" />
                <button type="button" class="secondary-button rate-copy" data-record-payment="${escapeHtml(p.id)}">Record as paid</button>
              </span>`
            : "Waiting"}</td>
      </tr>`).join("")}</tbody></table></div>`;
}

function linesTable(lines: LineRow[]): string {
  return `<div class="rates-table-wrap"><table class="rates-table line-table">
    <thead><tr><th scope="col">Umpire</th><th scope="col">Games</th><th scope="col">Earned</th><th scope="col">Adjustments</th><th scope="col">Total</th></tr></thead>
    <tbody>${[...lines].sort((a, b) => a.umpire_name.localeCompare(b.umpire_name)).map((l) => `
      <tr><th scope="row">${escapeHtml(l.umpire_name)}${l.payee_profile_id === null && l.total_cents !== 0 ? ` <span class="payee-flag payee-flag-missing">no payee</span>` : ""}</th><td>${l.games}</td><td class="money">${formatMoney(l.earned_cents)}</td><td class="money">${signedMoney(l.adjustments_cents)}</td><td class="money">${signedMoney(l.total_cents)}</td></tr>`).join("")}</tbody></table></div>`;
}

export function logText(row: MoneyLogRow): string {
  const when = new Date(row.acted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\u202f/g, " ");
  return `${when} \u00b7 ${row.actor_name}: ${row.detail}`;
}

export function payrollHtml(input: {
  payrolls: PayrollRow[];
  lines: LineRow[];
  payments: PaymentRow[];
  log: MoneyLogRow[];
  defaultStart: string;
  defaultEnd: string;
  waitingCount: number;
}): string {
  const draft = input.payrolls.find((p) => p.status === "draft");
  const past = input.payrolls.filter((p) => p.status !== "draft");
  const linesOf = (id: string) => input.lines.filter((l) => l.payroll_id === id);
  const paymentsOf = (id: string) => input.payments.filter((p) => p.payroll_id === id);
  const missing = draft ? linesOf(draft.id).filter((l) => l.payee_profile_id === null && l.total_cents !== 0) : [];

  return `
    <section class="payroll-section" aria-labelledby="payroll-title">
      <h2 id="payroll-title">Payroll</h2>
      <p class="report-privacy">
        A payroll collects everything waiting to be paid for a period, totals it for each <strong>family</strong> (payee), and is
        <strong>approved</strong> by the treasurer or any super admin. Then record each payment as it is made. Nothing is sent
        by this page; paying through Stripe comes later.
      </p>
      <p id="payroll-message" class="message" role="status" aria-live="polite"></p>

      ${draft ? `
        <article class="payroll-card payroll-draft" data-payroll="${escapeHtml(draft.id)}">
          <h3>Draft payroll: ${escapeHtml(periodLabel(draft))}${draft.note ? ` <span class="field-help">(${escapeHtml(draft.note)})</span>` : ""}</h3>
          <p class="payroll-total">Total: <strong>${signedMoney(draft.total_cents)}</strong>. Created by ${escapeHtml(draft.created_by_name)}.</p>
          ${missing.length ? `<p class="message error" role="alert">${missing.length === 1 ? "One umpire has" : `${missing.length} umpires have`} no payee yet: ${missing.map((l) => `${escapeHtml(l.umpire_name)} (${signedMoney(l.total_cents)})`).join(", ")}. Choose a payee for ${missing.length === 1 ? "them" : "each"} in <strong>Payees</strong>, then approve.</p>` : ""}
          <h4>Payments</h4>
          ${paymentsTable(paymentsOf(draft.id), false)}
          <h4>By umpire</h4>
          ${linesTable(linesOf(draft.id))}
          <div class="rates-actions">
            <button type="button" class="primary-button" data-approve="${escapeHtml(draft.id)}">Approve payroll</button>
            <button type="button" class="secondary-button" data-discard="${escapeHtml(draft.id)}">Discard this draft</button>
          </div>
        </article>`
      : `
        <div class="earn-form payroll-new">
          <p class="field-help">${input.waitingCount === 0 ? "Nothing is waiting to be paid yet. Work out earnings first." : `${input.waitingCount} ${input.waitingCount === 1 ? "item is" : "items are"} waiting to be paid.`}</p>
          <label>Period starts <input type="date" id="payroll-start" value="${escapeHtml(input.defaultStart)}" /></label>
          <label>Period ends <input type="date" id="payroll-end" value="${escapeHtml(input.defaultEnd)}" /></label>
          <label>Note <input id="payroll-note" maxlength="200" autocomplete="off" placeholder="Optional, for example October" /></label>
          <button type="button" class="primary-button" id="payroll-create">Create a payroll</button>
        </div>`}

      <h3>Earlier payrolls</h3>
      ${past.length === 0 ? `<p class="report-none">No earlier payrolls.</p>` : past.map((p) => `
        <details class="payroll-card" data-payroll="${escapeHtml(p.id)}">
          <summary><strong>${escapeHtml(periodLabel(p))}</strong> &middot; ${escapeHtml(STATUS_LABEL[p.status] ?? p.status)} &middot; ${p.status === "discarded" ? "" : signedMoney(p.total_cents)}</summary>
          ${p.status === "discarded" ? `<p class="field-help">This draft was discarded. Nothing was paid.</p>` : `
            <p class="field-help">Created by ${escapeHtml(p.created_by_name)}${p.approved_by_name ? `; approved by ${escapeHtml(p.approved_by_name)}` : ""}.${p.note ? ` ${escapeHtml(p.note)}` : ""}</p>
            ${paymentsTable(paymentsOf(p.id), p.status === "approved")}
            <button type="button" class="secondary-button" data-csv="${escapeHtml(p.id)}">Download spreadsheet (CSV)</button>`}
        </details>`).join("")}

      <h3 class="rates-log-title">Recent activity</h3>
      ${input.log.length === 0 ? `<p class="report-none">Nothing yet.</p>` : `<ul class="rates-log">${input.log.map((row) => `<li>${escapeHtml(logText(row))}</li>`).join("")}</ul>`}
    </section>`;
}
