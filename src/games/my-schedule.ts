import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { loadContext, loadUmpireGames } from "./data";
import { renderAvailabilityEditor } from "./availability-editor";
import { wireGameDay } from "./game-day";
import { gameDayEntries, gameDayHtml } from "./game-day-model";
import { renderOpenGames } from "./open-games";
import { renderScheduleView } from "./umpire-schedule";
import { buildUmpireSchedule, lookupsFor } from "./schedule";

// An umpire's own schedule, on their Home page. An umpire can read only their
// own assignments, so this can only ever show their own games (and their own
// position in each, never another umpire's name).
export async function renderMySchedule(container: HTMLElement, notice = ""): Promise<void> {
  container.innerHTML = `
    <section class="my-schedule">
      <h2>My schedule</h2>
      <p class="directory-description">Loading your games&hellip;</p>
    </section>
  `;

  const fail = (text: string) => {
    container.innerHTML = `
      <section class="my-schedule">
        <h2>My schedule</h2>
        <p class="directory-empty">${escapeHtml(text)}</p>
      </section>
    `;
  };

  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) return fail("Sign in again to see your schedule.");

  const { data: me, error } = await supabase
    .from("umpires")
    .select("id, display_name")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    console.error("My schedule failed:", error.message);
    return fail("Your schedule could not be loaded. Refresh and try again.");
  }

  if (!me) {
    return fail(
      "Your account is not connected to an umpire record yet, so there is no schedule to show. Please ask an administrator."
    );
  }

  const [{ context, error: contextError }, games] = await Promise.all([
    loadContext(),
    loadUmpireGames(me.id as string),
  ]);

  if (!context || games.error) {
    console.error("My schedule failed:", contextError ?? games.error);
    return fail("Your schedule could not be loaded. Refresh and try again.");
  }

  const items = buildUmpireSchedule(me.id as string, games.games, games.assignments, lookupsFor(context));

  // games that are still to come and are waiting for this umpire's answer
  const waiting = items.filter(
    (game) => game.myStatus === "assigned" && game.status !== "canceled" && Date.parse(game.startsAt) > Date.now()
  ).length;

  // today's games, with a check-in button when one is within an hour of starting
  const gameDay = gameDayEntries(items, games.assignments, me.id as string, new Date());

  container.innerHTML = `
    <div id="my-game-day">${gameDayHtml(gameDay)}</div>
    <section class="my-schedule">
      <h2>My schedule</h2>
      ${notice ? `<p class="message success" role="status">${escapeHtml(notice)}</p>` : ""}
      ${waiting
        ? `<p class="my-pending" role="status">You have <strong>${waiting}</strong> ${waiting === 1 ? "game" : "games"} waiting for your answer. Please confirm or decline ${waiting === 1 ? "it" : "them"} below.</p>`
        : ""}
      <p class="directory-description">
        Your assigned games. Times are shown in your computer's time zone.
      </p>
      <div id="my-schedule-view"></div>
    </section>
    <div id="my-availability"></div>
    <div id="my-open-games"></div>
  `;

  wireGameDay(container.querySelector<HTMLElement>("#my-game-day")!, gameDay, (message) => {
    void renderMySchedule(container, message);
  });

  renderScheduleView(container.querySelector<HTMLElement>("#my-schedule-view")!, {
    umpireName: (me.display_name as string) || "Me",
    items,
    emptyText: "You have not been assigned any games yet. They will appear here as soon as the scheduler assigns you.",
    onAnswer: async (gameId, action, reason) => {
      const { error: answerError } =
        action === "confirm"
          ? await supabase.rpc("confirm_assignment", { p_game_id: gameId })
          : await supabase.rpc("decline_assignment", { p_game_id: gameId, p_reason: reason });

      return answerError ? `That did not work. ${answerError.message}` : null;
    },
    onAnswered: (message) => {
      void renderMySchedule(container, message);
    },
  });

  // When this umpire can umpire.
  void renderAvailabilityEditor(container.querySelector<HTMLElement>("#my-availability")!, {
    umpireId: me.id as string,
    own: true,
  });

  // Open places this umpire is allowed to take for themselves (nothing is shown when there are none).
  void renderOpenGames(container.querySelector<HTMLElement>("#my-open-games")!, {
    context,
    onTaken: (message) => {
      void renderMySchedule(container, message);
    },
  });
}
