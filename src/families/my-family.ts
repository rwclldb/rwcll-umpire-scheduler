import { supabase } from "../supabase";
import { appNow } from "../clock";
import { swapHandlers, say } from "../payments/shared";
import { CONSENT_VERSION, myFamilyHtml } from "./family-model";
import type { EarningRow, MyChild, PaymentRow, ScheduleRow } from "./family-model";

// The parent's page: their own children's games, earnings and payments, read-only, and the one
// thing they can do, give or withdraw consent. The database only ever returns THEIR children.

let flash = "";

export async function renderMyFamilyPage(container: HTMLElement): Promise<void> {
  const controller = swapHandlers(container);
  const shell = (inner: string) => `<main class="page"><section class="auth-card admin-card family-page">${inner}</section></main>`;
  container.innerHTML = shell(`<p>Loading&hellip;</p>`);

  const [family, payments] = await Promise.all([supabase.rpc("my_family"), supabase.rpc("my_payments")]);
  if (family.error || payments.error) {
    container.innerHTML = shell(`<p class="message error">Your family page could not be loaded. Refresh and try again.</p>`);
    return;
  }

  const children = (family.data ?? []) as MyChild[];
  const schedules: Record<string, ScheduleRow[]> = {};
  const earnings: Record<string, EarningRow[]> = {};

  await Promise.all(children.map(async (child) => {
    const [schedule, earned] = await Promise.all([
      supabase.rpc("family_schedule", { p_umpire_id: child.umpire_id }),
      supabase.rpc("family_earnings", { p_umpire_id: child.umpire_id }),
    ]);
    schedules[child.umpire_id] = (schedule.data ?? []) as ScheduleRow[];
    earnings[child.umpire_id] = (earned.data ?? []) as EarningRow[];
  }));

  container.innerHTML = shell(myFamilyHtml({
    children,
    schedules,
    earnings,
    payments: (payments.data ?? []) as PaymentRow[],
    nowIso: appNow().toISOString(),
  }));

  if (flash) {
    say(container, "#family-message", flash, "success");
    flash = "";
  }

  const reload = (text: string) => { flash = text; void renderMyFamilyPage(container); };
  const nameOf = (id: string) => children.find((c) => c.umpire_id === id)?.display_name ?? "your child";

  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    const give = target.closest<HTMLButtonElement>("[data-give-consent]");
    if (give) {
      const id = give.dataset.giveConsent as string;
      give.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("give_consent", { p_umpire_id: id, p_text_version: CONSENT_VERSION });
        if (error) {
          give.disabled = false;
          return say(container, "#family-message", `Could not record your consent. ${error.message}`);
        }
        reload(`Thank you. Your consent for ${nameOf(id)} is recorded.`);
      })();
      return;
    }

    const withdraw = target.closest<HTMLButtonElement>("[data-withdraw-consent]");
    if (withdraw) {
      const id = withdraw.dataset.withdrawConsent as string;
      if (!window.confirm(`Withdraw your consent for ${nameOf(id)} to umpire? They will not be assigned to games until consent is given again.`)) return;
      withdraw.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("withdraw_consent", { p_umpire_id: id });
        if (error) {
          withdraw.disabled = false;
          return say(container, "#family-message", `Could not withdraw your consent. ${error.message}`);
        }
        reload(`Your consent for ${nameOf(id)} is withdrawn.`);
      })();
    }
  }, { signal: controller.signal });
}
