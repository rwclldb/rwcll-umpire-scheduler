import { supabase } from "../supabase";
import { appNow } from "../clock";
import { dateKey } from "../games/availability";
import { formatMoney } from "./pay-rates-model";
import { say, swapHandlers } from "./shared";
import {
  candidateOptions,
  earningsHtml,
  parseSignedDollars,
  payeesHtml,
  payrollCsv,
  payrollHtml,
} from "./payroll-model";
import type {
  AdjustmentRow,
  Candidate,
  EarningRow,
  LineRow,
  MoneyLogRow,
  PaymentRow,
  PayrollRow,
  UmpireRow,
} from "./payroll-model";

// The Payees, Earnings and Payroll sections of the Payments page. The database checks
// every rule again; these screens only show what it gives them.

let flash: { selector: string; text: string } | null = null;
const flashNext = (selector: string, text: string) => { flash = { selector, text }; };

const failure = (box: HTMLElement) => {
  box.innerHTML = `<p class="message error">This could not be loaded. Refresh and try again.</p>`;
};

const monthStart = (offset: number): string => {
  const now = appNow();
  return dateKey(new Date(now.getFullYear(), now.getMonth() + offset, 1));
};

// ============================================================================ payees
export async function renderPayeesSection(box: HTMLElement): Promise<void> {
  const controller = swapHandlers(box);
  box.innerHTML = `<p>Loading&hellip;</p>`;

  const [umpires, candidates] = await Promise.all([supabase.rpc("payments_umpire_list"), supabase.rpc("payee_candidates")]);
  if (umpires.error || candidates.error) return failure(box);

  const list = (umpires.data ?? []) as UmpireRow[];
  const people = (candidates.data ?? []) as Candidate[];
  box.innerHTML = payeesHtml(list);

  if (flash && flash.selector === "#payees-message") {
    say(box, flash.selector, flash.text, "success");
    flash = null;
  }

  // the long list of accounts is only put into a box when it is opened
  const fill = (event: Event) => {
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>(".payee-select");
    if (!select || select.dataset.filled) return;

    const current = select.dataset.current ?? "";
    const placeholder = select.options[0].outerHTML;
    const kept = current ? [...select.options].find((option) => option.value === current)?.outerHTML ?? "" : "";

    select.innerHTML = placeholder + candidateOptions(people, current || null);
    if (current && !select.querySelector(`option[value="${current}"]`)) select.insertAdjacentHTML("beforeend", kept);
    select.value = current;
    select.dataset.filled = "1";
  };

  box.addEventListener("focusin", fill, { signal: controller.signal });
  box.addEventListener("pointerdown", fill, { signal: controller.signal, capture: true });

  box.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-save-payee]");
    if (!button) return;

    const id = button.dataset.savePayee as string;
    const select = box.querySelector<HTMLSelectElement>(`[data-payee-select="${id}"]`)!;
    const row = list.find((u) => u.umpire_id === id);
    button.disabled = true;

    void (async () => {
      const { error } = await supabase.rpc("set_umpire_payee", { p_umpire_id: id, p_payee_profile_id: select.value || null });
      if (error) {
        button.disabled = false;
        return say(box, "#payees-message", `Could not save. ${error.message}`);
      }

      flashNext("#payees-message", `Saved the payee for ${row?.display_name ?? "that umpire"}.`);
      void renderPayeesSection(box);
    })();
  }, { signal: controller.signal });
}

// ========================================================================== earnings
let earnFrom = "";
let earnThrough = "";

export async function renderEarningsSection(box: HTMLElement): Promise<void> {
  const controller = swapHandlers(box);
  box.innerHTML = `<p>Loading&hellip;</p>`;

  const [umpires, earnings, adjustments] = await Promise.all([
    supabase.rpc("payments_umpire_list"),
    supabase.from("earnings").select("id, umpire_id, game_date, division_name, position, amount_cents").is("payroll_id", null).is("voided_at", null),
    supabase.from("earning_adjustments").select("id, umpire_id, amount_cents, reason, created_by_name").is("payroll_id", null).is("voided_at", null),
  ]);
  if (umpires.error || earnings.error || adjustments.error) return failure(box);

  const today = dateKey(appNow());
  if (!earnFrom) earnFrom = monthStart(-1);
  if (!earnThrough) earnThrough = today;

  box.innerHTML = earningsHtml({
    umpires: (umpires.data ?? []) as UmpireRow[],
    earnings: (earnings.data ?? []) as EarningRow[],
    adjustments: (adjustments.data ?? []) as AdjustmentRow[],
    from: earnFrom,
    through: earnThrough,
    todayKey: today,
  });

  if (flash && flash.selector === "#earn-message") {
    say(box, flash.selector, flash.text, "success");
    flash = null;
  }

  const reload = (text: string) => { flashNext("#earn-message", text); void renderEarningsSection(box); };

  box.addEventListener("change", (event) => {
    const target = event.target as HTMLInputElement;
    if (target.id === "earn-from") earnFrom = target.value;
    if (target.id === "earn-through") earnThrough = target.value;
  }, { signal: controller.signal });

  box.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const say2 = (text: string) => say(box, "#earn-message", text);

    if (target.closest("#earn-run")) {
      const button = target.closest<HTMLButtonElement>("#earn-run")!;
      if (!earnFrom || !earnThrough) return say2("Choose a start and an end date.");
      button.disabled = true;

      void (async () => {
        const { data, error } = await supabase.rpc("generate_earnings", { p_from: earnFrom, p_through: earnThrough });
        if (error) {
          button.disabled = false;
          return say2(`Could not work out earnings. ${error.message}`);
        }

        const result = data as { created: number; total_cents: number; no_rate: number };
        reload(
          `Added ${result.created} ${result.created === 1 ? "earning" : "earnings"} (${formatMoney(result.total_cents)}).` +
            (result.no_rate > 0 ? ` ${result.no_rate} recorded ${result.no_rate === 1 ? "arrival earned" : "arrivals earned"} nothing because that place has no pay rate (see Pay rates).` : ""),
        );
      })();
      return;
    }

    const voidEarning = target.closest<HTMLButtonElement>("[data-void-earning]");
    if (voidEarning) {
      const reason = window.prompt("Why is this earning being voided? (A reason is required.)");
      if (reason === null) return;
      voidEarning.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("void_earning", { p_id: voidEarning.dataset.voidEarning, p_reason: reason });
        if (error) {
          voidEarning.disabled = false;
          return say2(`Could not void it. ${error.message}`);
        }
        reload("Voided.");
      })();
      return;
    }

    const voidAdjustment = target.closest<HTMLButtonElement>("[data-void-adjustment]");
    if (voidAdjustment) {
      if (!window.confirm("Void this adjustment?")) return;
      voidAdjustment.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("void_adjustment", { p_id: voidAdjustment.dataset.voidAdjustment });
        if (error) {
          voidAdjustment.disabled = false;
          return say2(`Could not void it. ${error.message}`);
        }
        reload("Adjustment voided.");
      })();
      return;
    }

    if (target.closest("#adj-add")) {
      const button = target.closest<HTMLButtonElement>("#adj-add")!;
      const umpire = box.querySelector<HTMLSelectElement>("#adj-umpire")!.value;
      const amount = parseSignedDollars(box.querySelector<HTMLInputElement>("#adj-amount")!.value);
      const reason = box.querySelector<HTMLInputElement>("#adj-reason")!.value.trim();

      if (!umpire) return say2("Choose the umpire.");
      if (!amount.ok) return say2(amount.error);
      if (!reason) return say2("Give a reason.");
      button.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("add_adjustment", { p_umpire_id: umpire, p_game_id: null, p_amount_cents: amount.cents, p_reason: reason });
        if (error) {
          button.disabled = false;
          return say2(`Could not add it. ${error.message}`);
        }
        reload("Adjustment added.");
      })();
    }
  }, { signal: controller.signal });
}

// =========================================================================== payroll
export async function renderPayrollSection(box: HTMLElement): Promise<void> {
  const controller = swapHandlers(box);
  box.innerHTML = `<p>Loading&hellip;</p>`;

  const [payrolls, lines, payments, log, earnings, adjustments] = await Promise.all([
    supabase.from("payrolls").select("id, period_start, period_end, status, note, total_cents, created_by_name, created_at, approved_by_name, approved_at"),
    supabase.from("payroll_lines").select("payroll_id, umpire_id, umpire_name, payee_profile_id, games, earned_cents, adjustments_cents, total_cents"),
    supabase.from("payroll_payments").select("id, payroll_id, payee_profile_id, payee_name, amount_cents, umpire_count, status, method, reference, paid_at"),
    supabase.from("money_log").select("action, detail, actor_name, acted_at").limit(60),
    supabase.from("earnings").select("id").is("payroll_id", null).is("voided_at", null),
    supabase.from("earning_adjustments").select("id").is("payroll_id", null).is("voided_at", null),
  ]);
  if (payrolls.error || lines.error || payments.error || log.error || earnings.error || adjustments.error) return failure(box);

  const all = ((payrolls.data ?? []) as (PayrollRow & { created_at: string })[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const lineRows = (lines.data ?? []) as LineRow[];
  const paymentRows = (payments.data ?? []) as PaymentRow[];
  const logRows = ((log.data ?? []) as MoneyLogRow[]).sort((a, b) => b.acted_at.localeCompare(a.acted_at)).slice(0, 30);

  const previous = monthStart(-1);
  const [py, pm] = previous.split("-").map(Number);
  const lastDay = dateKey(new Date(py, pm, 0));

  box.innerHTML = payrollHtml({
    payrolls: all,
    lines: lineRows,
    payments: paymentRows,
    log: logRows,
    defaultStart: previous,
    defaultEnd: lastDay,
    waitingCount: (earnings.data ?? []).length + (adjustments.data ?? []).length,
  });

  if (flash && flash.selector === "#payroll-message") {
    say(box, flash.selector, flash.text, "success");
    flash = null;
  }

  const reload = (text: string) => { flashNext("#payroll-message", text); void renderPayrollSection(box); };

  box.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const say2 = (text: string) => say(box, "#payroll-message", text);
    const run = (button: HTMLButtonElement, name: string, args: Record<string, unknown>, done: string, failed: string) => {
      button.disabled = true;
      void (async () => {
        const { error } = await supabase.rpc(name, args);
        if (error) {
          button.disabled = false;
          return say2(`${failed} ${error.message}`);
        }
        reload(done);
      })();
    };

    const create = target.closest<HTMLButtonElement>("#payroll-create");
    if (create) {
      const start = box.querySelector<HTMLInputElement>("#payroll-start")!.value;
      const end = box.querySelector<HTMLInputElement>("#payroll-end")!.value;
      if (!start || !end) return say2("Choose when the period starts and ends.");
      return run(create, "create_payroll", { p_period_start: start, p_period_end: end, p_note: box.querySelector<HTMLInputElement>("#payroll-note")!.value.trim() || null }, "Draft payroll created. Check it, then approve it.", "Could not create the payroll.");
    }

    const approve = target.closest<HTMLButtonElement>("[data-approve]");
    if (approve) {
      const draft = all.find((p) => p.id === approve.dataset.approve);
      if (!window.confirm(`Approve this payroll for ${formatMoney(draft?.total_cents ?? 0)}? After approval it cannot be changed, only paid.`)) return;
      return run(approve, "approve_payroll", { p_id: approve.dataset.approve }, "Approved. Record each payment as it is made.", "Could not approve.");
    }

    const discard = target.closest<HTMLButtonElement>("[data-discard]");
    if (discard) {
      if (!window.confirm("Discard this draft? Everything in it goes back to waiting to be paid.")) return;
      return run(discard, "discard_payroll", { p_id: discard.dataset.discard }, "Draft discarded. Its earnings are waiting to be paid again.", "Could not discard.");
    }

    const record = target.closest<HTMLButtonElement>("[data-record-payment]");
    if (record) {
      const id = record.dataset.recordPayment as string;
      const method = box.querySelector<HTMLSelectElement>(`[data-pay-method="${id}"]`)!.value;
      const reference = box.querySelector<HTMLInputElement>(`[data-pay-reference="${id}"]`)!.value.trim();
      return run(record, "record_payment", { p_payment_id: id, p_method: method, p_reference: reference || null }, "Payment recorded.", "Could not record the payment.");
    }

    const csv = target.closest<HTMLButtonElement>("[data-csv]");
    if (csv) {
      const payroll = all.find((p) => p.id === csv.dataset.csv);
      if (!payroll) return;

      const text = payrollCsv(payroll, lineRows.filter((l) => l.payroll_id === payroll.id), paymentRows.filter((p) => p.payroll_id === payroll.id));
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
      link.download = `payroll-${payroll.period_start}-to-${payroll.period_end}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }
  }, { signal: controller.signal });
}
