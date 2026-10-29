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

  container.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-checkin]");
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
