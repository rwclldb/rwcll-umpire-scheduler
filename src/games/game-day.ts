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

    // "I can't make it"
    const decline = target.closest<HTMLButtonElement>("[data-gd-decline-send]");
    if (decline) {
      decline.disabled = true;
      const reason = decline.closest(".gd-decline-body")?.querySelector<HTMLTextAreaElement>(".gd-decline-reason")?.value ?? "";

      void (async () => {
        const { error } = await supabase.rpc("decline_assignment", { p_game_id: decline.dataset.gdDeclineSend, p_reason: reason });

        if (error) {
          decline.disabled = false;
          return say(`That did not work. ${error.message}`);
        }

        refresh("You have declined this game, and the administrators have been told.");
      })();

      return;
    }

    // a report about the game
    const report = target.closest<HTMLButtonElement>("[data-gd-report-send]");
    if (report) {
      const body = report.closest(".gd-report-body")!;
      const text = body.querySelector<HTMLTextAreaElement>(".gd-report-text")!.value.trim();
      if (!text) return say("Write what happened.");

      report.disabled = true;

      void (async () => {
        const pretend = demoNowIso();
        const { error } = await supabase.rpc("file_game_report", {
          p_game_id: report.dataset.gdReportSend,
          p_category: body.querySelector<HTMLSelectElement>(".gd-report-category")!.value,
          p_body: text,
          ...(pretend ? { p_now: pretend } : {}),
        });

        if (error) {
          report.disabled = false;
          return say(`Could not send the report. ${error.message}`);
        }

        refresh("Your report was sent. Only the umpire chief and super admins can read it.");
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
