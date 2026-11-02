import { supabase } from "../supabase";
import { appNow } from "../clock";
import { dateKey } from "../games/availability";
import { swapHandlers, say } from "../payments/shared";
import { familiesHtml, parentOptions } from "./family-model";
import type { FamilyLogRow, FamilyUmpire, ParentAccount } from "./family-model";

// The Families screen (super admins and the umpire chief): link parents and guardians to youth
// umpires, see who needs consent, and change an umpire who has turned 18 to an adult. The
// database decides who may do anything and checks every rule again.

let flash = "";

export async function renderFamiliesPage(container: HTMLElement): Promise<void> {
  const controller = swapHandlers(container);
  const shell = (inner: string) => `<main class="page"><section class="auth-card admin-card families-card"><p class="eyebrow">RWCLL &middot; FAMILIES</p><h1>Families</h1>${inner}</section></main>`;
  container.innerHTML = shell(`<p>Loading&hellip;</p>`);

  const [overview, parents, log, minAge, consentBelow] = await Promise.all([
    supabase.rpc("families_overview"),
    supabase.rpc("parent_accounts"),
    supabase.from("family_log").select("action, detail, actor_name, acted_at").limit(60),
    supabase.rpc("umpire_min_age"),
    supabase.rpc("parent_consent_below_age"),
  ]);

  if (overview.error || parents.error || log.error) {
    container.innerHTML = shell(`<p class="message error">The families could not be loaded. Refresh and try again.</p>`);
    return;
  }

  const umpires = (overview.data ?? []) as FamilyUmpire[];
  const parentList = (parents.data ?? []) as ParentAccount[];
  const logRows = ((log.data ?? []) as FamilyLogRow[]).sort((a, b) => b.acted_at.localeCompare(a.acted_at)).slice(0, 30);

  container.innerHTML = shell(familiesHtml({
    umpires,
    parents: parentList,
    log: logRows,
    todayKey: dateKey(appNow()),
    minAge: Number(minAge.data ?? 13),
    consentBelow: Number(consentBelow.data ?? 13),
  }));

  if (flash) {
    say(container, "#families-message", flash, "success");
    flash = "";
  }

  const reload = (text: string) => { flash = text; void renderFamiliesPage(container); };
  const nameOf = (id: string) => umpires.find((u) => u.umpire_id === id)?.display_name ?? "that umpire";

  // the list of parent accounts is only put into a box when it is opened
  const fill = (event: Event) => {
    const select = (event.target as HTMLElement).closest<HTMLSelectElement>(".parent-select");
    if (!select || select.dataset.filled) return;
    select.insertAdjacentHTML("beforeend", parentOptions(parentList));
    select.dataset.filled = "1";
  };
  container.addEventListener("focusin", fill, { signal: controller.signal });
  container.addEventListener("pointerdown", fill, { signal: controller.signal, capture: true });

  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const problem = (text: string) => say(container, "#families-message", text);

    const add = target.closest<HTMLButtonElement>("[data-link-add]");
    if (add) {
      const id = add.dataset.linkAdd as string;
      const parent = container.querySelector<HTMLSelectElement>(`[data-link-parent="${id}"]`)!.value;
      const relationship = container.querySelector<HTMLSelectElement>(`[data-link-rel="${id}"]`)!.value;
      if (!parent) return problem("Choose a parent or guardian first.");
      add.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("link_guardian", { p_umpire_id: id, p_parent_id: parent, p_relationship: relationship });
        if (error) {
          add.disabled = false;
          return problem(`Could not link. ${error.message}`);
        }
        reload(`Linked to ${nameOf(id)}.`);
      })();
      return;
    }

    const unlink = target.closest<HTMLButtonElement>("[data-unlink]");
    if (unlink) {
      if (!window.confirm("Unlink this parent or guardian? They will no longer see this child, and any consent they gave is withdrawn.")) return;
      unlink.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("unlink_guardian", { p_link_id: unlink.dataset.unlink });
        if (error) {
          unlink.disabled = false;
          return problem(`Could not unlink. ${error.message}`);
        }
        reload("Unlinked.");
      })();
      return;
    }

    const convert = target.closest<HTMLButtonElement>("[data-convert]");
    if (convert) {
      const id = convert.dataset.convert as string;
      if (!window.confirm(`Change ${nameOf(id)} to an adult umpire? They will be paid adult rates, to themselves, their parents' links will end, and their account's role changes. This cannot be undone here.`)) return;
      convert.disabled = true;

      void (async () => {
        const { error } = await supabase.rpc("convert_to_adult", { p_umpire_id: id });
        if (error) {
          convert.disabled = false;
          return problem(`Could not change them. ${error.message}`);
        }
        reload(`${nameOf(id)} is now an adult umpire.`);
      })();
    }
  }, { signal: controller.signal });
}
