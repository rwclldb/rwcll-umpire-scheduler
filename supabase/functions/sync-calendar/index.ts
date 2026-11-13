// The master calendar sync: downloads the Sports Connect calendar feed and keeps the games up to date.
//
// Started two ways:
//   * by the scheduled job, twice a day (supabase/jobs/schedule_calendar_sync.sql), with the same
//     x-sender-secret header the email sender uses;
//   * by "Sync now" in the app, signed in as a scheduling administrator.
// Deploy it with --no-verify-jwt (it checks who is calling itself):
//   npx supabase functions deploy sync-calendar --no-verify-jwt
//
// What it does: ics.ts reads the feed, names.ts turns the feed's names into our teams and fields,
// match.ts decides which feed game is which of our games, sync-plan.ts works out what changed, and the
// database function apply_calendar_sync saves it all and writes the log. See docs/FAQ.md, section 63.
//
// (This file runs in Supabase's Deno, not in the app's build.)
import { createClient } from "npm:@supabase/supabase-js@2";
import { looksLikeCalendar, parseIcs } from "./ics.ts";
import { buildSyncPlan, rememberForNextTime } from "./sync-plan.ts";

const MAX_FEED_BYTES = 10 * 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Who is asking: the scheduled job, or a signed-in scheduling administrator. null: nobody allowed.
async function caller(request: Request): Promise<{ trigger: "scheduled" | "manual"; name: string } | null> {
  const secret = Deno.env.get("SENDER_SECRET") ?? "";
  const given = request.headers.get("x-sender-secret") ?? "";
  if (secret && given && safeEqual(secret, given)) return { trigger: "scheduled", name: "Scheduled sync" };

  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;

  const asUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth } },
  });
  const user = await asUser.auth.getUser();
  if (user.error || !user.data.user) return null;

  const admin = await asUser.rpc("is_scheduling_admin");
  if (admin.error || admin.data !== true) return null;

  const profile = await asUser.from("profiles").select("display_name, email").eq("id", user.data.user.id).maybeSingle();
  const name = profile.data?.display_name?.trim() || profile.data?.email || "An administrator";
  return { trigger: "manual", name };
}

// Every row of a query, a page at a time (the database hands out at most 1000 at once).
async function all(query: (from: number, to: number) => any): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const page = await query(from, from + 999);
    if (page.error) throw new Error(page.error.message);
    rows.push(...(page.data ?? []));
    if ((page.data ?? []).length < 1000) return rows;
  }
}

async function downloadFeed(url: string): Promise<string> {
  const address = url.replace(/^webcal:\/\//i, "https://");
  let response: Response;
  try {
    response = await fetch(address, { signal: AbortSignal.timeout(30000), headers: { Accept: "text/calendar, */*" } });
  } catch (error) {
    throw new Error(`The feed could not be reached: ${String((error as Error)?.message ?? error).slice(0, 200)}`);
  }
  if (!response.ok) throw new Error(`The feed answered with an error (${response.status} ${response.statusText}).`);

  const text = await response.text();
  if (text.length > MAX_FEED_BYTES) throw new Error("The feed is larger than 10 MB, which is not expected.");
  if (!looksLikeCalendar(text)) throw new Error("The feed's address did not return a calendar. Check the address in the sync settings.");
  return text;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const who = await caller(request);
  if (!who) return reply({ error: "Forbidden" }, 403);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const settings = await db.from("calendar_feed_settings").select("*").maybeSingle();
  if (settings.error) return reply({ error: `Could not read the sync settings: ${settings.error.message}` }, 500);
  const config = settings.data;

  // the scheduled job does nothing while the sync is switched off; "Sync now" still works
  if (who.trigger === "scheduled" && !config?.enabled) return reply({ note: "The sync is switched off." });

  const fail = async (message: string) => {
    await db.rpc("record_calendar_sync_failure", {
      p_trigger: who.trigger, p_triggered_by: who.name, p_season_id: config?.season_id ?? null, p_message: message,
    });
    return reply({ error: message }, 500);
  };

  try {
    if (!config?.feed_url) return await fail("There is no feed address in the sync settings.");
    if (!config?.season_id) return await fail("No season is chosen in the sync settings.");
    const timeZone = config.time_zone || "America/Los_Angeles";

    const feedText = await downloadFeed(config.feed_url);
    const events = parseIcs(feedText, timeZone);

    // ---- what we hold now
    const [season, divisions, locations] = await Promise.all([
      db.from("seasons").select("id, name, starts_on, ends_on").eq("id", config.season_id).maybeSingle(),
      db.from("divisions").select("id, name"),
      db.from("locations").select("id, name, address"),
    ]);
    for (const answer of [season, divisions, locations]) if (answer.error) throw new Error(answer.error.message);
    if (!season.data) return await fail("The season chosen in the sync settings no longer exists.");

    const teams = await all((from, to) =>
      db.from("teams").select("id, name, division_id").eq("season_id", config.season_id).order("id").range(from, to));
    const games = await all((from, to) =>
      db.from("games")
        .select("id, division_id, home_team_id, away_team_id, home_label, away_label, location_id, starts_at, ends_at, status, master_source, updated_at")
        .eq("season_id", config.season_id).order("id").range(from, to));
    const assignments = await all((from, to) =>
      db.from("game_assignments").select("game_id, games!inner(season_id)")
        .eq("games.season_id", config.season_id).order("id").range(from, to));
    const savedNames = await all((from, to) =>
      db.from("calendar_feed_names").select("kind, feed_key, team_id, location_id, is_outside, is_ignored, season_id")
        .or(`season_id.is.null,season_id.eq.${config.season_id}`).order("id").range(from, to));

    const assignedCount = new Map<string, number>();
    for (const row of assignments) assignedCount.set(row.game_id, (assignedCount.get(row.game_id) ?? 0) + 1);

    // what the last good run already told the administrators about
    const last = await db.from("calendar_sync_runs").select("details").eq("status", "ok")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    const previous = last.data?.details?.remember?.heldKeys ? last.data.details.remember : null;

    const plan = buildSyncPlan(events, {
      timeZone,
      now: new Date(),
      season: season.data,
      divisions: divisions.data ?? [],
      teams,
      fields: locations.data ?? [],
      games,
      assignedCount,
      savedNames,
    }, previous);

    // An empty feed (between seasons, or Sports Connect having a bad moment) must not flag every game.
    let note = "";
    if (plan.counts.games === 0) {
      plan.not_in_feed = [];
      plan.admin_notice = null;
      note = "The feed had no games in it, so nothing was changed and no games were flagged.";
    }

    const applied = await db.rpc("apply_calendar_sync", {
      p_run: {
        trigger: who.trigger,
        triggered_by: who.name,
        season_id: config.season_id,
        note,
        ...plan,
        remember: plan.counts.games === 0 && previous ? previous : rememberForNextTime(plan),
      },
    });
    if (applied.error) throw new Error(applied.error.message);

    return reply({ ok: true, ...applied.data, held: plan.held.length, not_in_feed: plan.not_in_feed.length, note });
  } catch (error) {
    return await fail(String((error as Error)?.message ?? error).slice(0, 1000));
  }
});
