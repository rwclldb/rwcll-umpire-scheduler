import { supabase } from "../supabase";
import { msUntilNextOpening } from "./game-day-model";
import type { GameDayEntry } from "./game-day-model";
import { appNow, demoNowIso } from "../clock";

// Makes the buttons work. `refresh` redraws the whole Home page (with a message).
export function wireGameDay(
  container: HTMLElement,
  entries: GameDayEntry[],
  refresh: (notice: string) => void
): void {
  const message = container.querySelector<HTMLElement>("#game-day-message");

  const say = (text: string) => {
    if (!message) return;
    message.textContent = text;
    message.className = "message error";
  };

  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;

    // "I'm running late" and "I'm not late after all"
    const send = target.closest<HTMLButtonElement>("[data-late-send]");
    const clear = target.closest<HTMLButtonElement>("[data-late-clear]");
    if (send || clear) {
      const button = (send ?? clear)!;
      button.disabled = true;

      void (async () => {
        const pretend = demoNowIso();

        if (send) {
          const minutes = Number(send.closest(".gd-late-body")?.querySelector<HTMLSelectElement>(".gd-late-minutes")?.value);
          const { error } = await supabase.rpc("report_running_late", {
            p_game_id: send.dataset.lateSend,
            p_minutes: minutes,
            ...(pretend ? { p_now: pretend } : {}),
          });

          if (error) {
            button.disabled = false;
            return say(`Could not tell them. ${error.message}`);
          }

          return refresh(`Thank you. The administrators know you are running about ${minutes} minutes late.`);
        }

        const { error } = await supabase.rpc("clear_running_late", { p_game_id: clear!.dataset.lateClear });
        if (error) {
          button.disabled = false;
          return say(`Could not do that. ${error.message}`);
        }

        refresh("Okay. You are no longer marked as running late.");
      })();

      return;
    }

    const button = target.closest<HTMLButtonElement>("[data-checkin]");
    if (!button) return;

    button.disabled = true;
    void (async () => {
      // (a pretend time is sent only when one is set; the database ignores it
      // unless the demo clock is switched on there)
      const pretend = demoNowIso();
      const { error } = await supabase.rpc("check_in", {
        p_game_id: button.dataset.checkin,
        ...(pretend ? { p_now: pretend } : {}),
      });

      if (error) {
        button.disabled = false;
        if (message) {
          message.textContent = `Could not check you in. ${error.message}`;
          message.className = "message error";
        }
        return;
      }

      refresh("You are checked in. Thank you!");
    })();
  });

  // When a check-in is about to open, redraw so the button appears by itself.
  const wait = msUntilNextOpening(entries, appNow());
  if (wait !== null) {
    window.setTimeout(() => {
      if (container.isConnected) refresh("");
    }, Math.min(wait + 1000, 6 * 3600_000));
  }
}
