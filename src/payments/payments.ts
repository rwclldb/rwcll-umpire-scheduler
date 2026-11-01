import { supabase } from "../supabase";
import { appNow } from "../clock";
import { sortDivisions } from "../division-order";
import { dateKey } from "../games/availability";
import { loadContext } from "../games/data";
import { payRatesHtml, planSave, resolveRates } from "./pay-rates-model";
import { renderEarningsSection, renderPayeesSection, renderPayrollSection } from "./payroll";
import { cancelHandlers, swapHandlers } from "./shared";
import type { LogRow, PayRateRow } from "./pay-rates-model";

// The Payments page (the treasurer and super admins). For now it sets pay rates; what
// umpires are owed, and paying them, come later. The database decides who may do
// anything here; this page just shows what it is given.

let flash = "";

const addDays = (key: string, days: number): string => {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d + days));
};

async function renderRatesSection(container: HTMLElement): Promise<void> {
  cancelHandlers(container);

  container.innerHTML = `<p>Loading&hellip;</p>`;

  const [loaded, rates, log] = await Promise.all([
    loadContext(),
    supabase.from("pay_rates").select("division_id, classification, position, amount_cents, effective_on").order("effective_on"),
    supabase
      .from("pay_rate_log")
      .select("division_name, classification, position, effective_on, old_cents, new_cents, changed_by_name, changed_at")
      .order("changed_at", { ascending: false })
      .limit(20),
  ]);

  if (loaded.error || !loaded.context || rates.error || log.error) {
    container.innerHTML = `<p class="message error">The pay rates could not be loaded. Refresh and try again.</p>`;
    return;
  }

  const divisions = sortDivisions(loaded.context.divisions).map((division) => ({ id: division.id, name: division.name }));
  const rows = (rates.data ?? []) as PayRateRow[];
  const today = dateKey(appNow());
  let effectiveOn = today;

  const draw = () => {
    // each drawing cancels the handlers of the one before it (otherwise one click
    // would be handled once for every earlier drawing, and Save would run twice)
    const controller = swapHandlers(container);

    const current = resolveRates(rows, effectiveOn);

    container.innerHTML = payRatesHtml({
      divisions,
      current,
      effectiveOn,
      todayKey: today,
      minDate: addDays(today, -60),
      maxDate: addDays(today, 365),
      log: (log.data ?? []) as LogRow[],
    });

    const $ = <T extends HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
    const say = (text: string, type: "error" | "success" = "error") => {
      const message = $<HTMLElement>("#rates-message");
      message.textContent = text;
      message.className = `message ${type}`;
    };

    if (flash) {
      say(flash, "success");
      flash = "";
    }

    const typed = () => new Map([...container.querySelectorAll<HTMLInputElement>(".rate-cell")].map((input) => [input.dataset.rateKey as string, input.value]));
    const plan = () => planSave(current, typed());

    // changing the start date shows what applies on that date (after a warning, if something was typed)
    $<HTMLInputElement>("#rates-date")?.addEventListener("change", (event) => {
      const chosen = (event.target as HTMLInputElement).value;
      if (!chosen) return;

      const { changes, errors } = plan();
      if ((changes.length || errors.length) && !window.confirm("Changing the start date will discard the amounts you have typed. Continue?")) {
        (event.target as HTMLInputElement).value = effectiveOn;
        return;
      }

      effectiveOn = chosen;
      draw();
    }, { signal: controller.signal });

    container.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      // copy one row to every division (for the same kind of umpire)
      const copy = target.closest<HTMLButtonElement>("[data-copy-row]");
      if (copy) {
        const [classification] = (copy.dataset.copyRow as string).split("|");
        const source = [...container.querySelectorAll<HTMLInputElement>(`[data-rate-row="${copy.dataset.copyRow}"] .rate-cell`)].map((input) => input.value);

        container.querySelectorAll<HTMLElement>(`[data-rate-row^="${classification}|"]`).forEach((row) => {
          row.querySelectorAll<HTMLInputElement>(".rate-cell").forEach((input, index) => { input.value = source[index]; });
        });
        say("Copied to every division. Press Save rates to keep it.", "success");
        return;
      }

      if (target.closest("#rates-reset")) return draw();

      if (target.closest("#rates-save")) {
        container.querySelectorAll<HTMLInputElement>(".rate-cell").forEach((input) => input.removeAttribute("aria-invalid"));

        const { changes, errors } = plan();
        if (errors.length) {
          container.querySelector<HTMLInputElement>(`[data-rate-key="${errors[0].key}"]`)?.setAttribute("aria-invalid", "true");
          container.querySelector<HTMLInputElement>(`[data-rate-key="${errors[0].key}"]`)?.focus();
          return say(errors[0].message);
        }
        if (changes.length === 0) return say("There is nothing to save: no amount has changed.");

        const save = $<HTMLButtonElement>("#rates-save");
        save.disabled = true;

        void (async () => {
          const { data, error } = await supabase.rpc("set_pay_rates", { p_effective_on: effectiveOn, p_rates: changes });
          if (error) {
            save.disabled = false;
            return say(`Could not save the rates. ${error.message}`);
          }

          flash = `Saved ${data} ${Number(data) === 1 ? "rate" : "rates"}, starting ${effectiveOn}.`;
          void renderRatesSection(container);
        })();
      }
    }, { signal: controller.signal });
  };

  draw();
}

// ---------------------------------------------------------------------------- the page
const SECTIONS: [string, string][] = [
  ["rates", "Pay rates"],
  ["payees", "Who is paid"],
  ["earnings", "Earnings"],
  ["payroll", "Payroll"],
];

let currentSection = "rates";
const shellHandlers = new WeakMap<HTMLElement, AbortController>();

export async function renderPaymentsPage(container: HTMLElement): Promise<void> {
  shellHandlers.get(container)?.abort();
  const controller = new AbortController();
  shellHandlers.set(container, controller);

  container.innerHTML = `
    <main class="page">
      <section class="auth-card admin-card payments-card">
        <p class="eyebrow">RWCLL &middot; PAYMENTS</p>
        <h1>Payments</h1>
        <div class="pay-tabs" role="group" aria-label="Payments sections">
          ${SECTIONS.map(([id, label]) => `<button type="button" class="pay-tab" data-pay-section="${id}" aria-pressed="${id === currentSection}">${label}</button>`).join("")}
        </div>
        <div id="payments-content"></div>
      </section>
    </main>`;

  const content = container.querySelector<HTMLElement>("#payments-content")!;

  const show = (id: string) => {
    currentSection = id;
    container.querySelectorAll<HTMLButtonElement>("[data-pay-section]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.paySection === id));
    });

    const draw = { rates: renderRatesSection, payees: renderPayeesSection, earnings: renderEarningsSection, payroll: renderPayrollSection }[id] ?? renderRatesSection;
    void draw(content);
  };

  container.addEventListener("click", (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-pay-section]");
    if (tab) show(tab.dataset.paySection as string);
  }, { signal: controller.signal });

  show(currentSection);
}
