import { supabase } from "../supabase";
import { escapeHtml } from "../ui";
import { loadContext, loadUmpireGames } from "./data";
import { renderScheduleView } from "./umpire-schedule";
import { buildUmpireSchedule, lookupsFor } from "./schedule";

// An umpire's own schedule, on their Home page. An umpire can read only their
// own assignments, so this can only ever show their own games (and their own
// position in each, never another umpire's name).
export async function renderMySchedule(container: HTMLElement): Promise<void> {
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

  container.innerHTML = `
    <section class="my-schedule">
      <h2>My schedule</h2>
      <p class="directory-description">
        Your assigned games. Times are shown in your computer's time zone.
      </p>
      <div id="my-schedule-view"></div>
    </section>
  `;

  renderScheduleView(container.querySelector<HTMLElement>("#my-schedule-view")!, {
    umpireName: (me.display_name as string) || "Me",
    items: buildUmpireSchedule(me.id as string, games.games, games.assignments, lookupsFor(context)),
    emptyText: "You have not been assigned any games yet. They will appear here as soon as the scheduler assigns you.",
  });
}
