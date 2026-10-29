import { supabase } from "../supabase";
import { msUntilNextOpening } from "./game-day-model";
import type { GameDayEntry } from "./game-day-model";

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
      const { error } = await supabase.rpc("check_in", { p_game_id: button.dataset.checkin });

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
  const wait = msUntilNextOpening(entries, new Date());
  if (wait !== null) {
    window.setTimeout(() => {
      if (container.isConnected) refresh("");
    }, Math.min(wait + 1000, 6 * 3600_000));
  }
}
