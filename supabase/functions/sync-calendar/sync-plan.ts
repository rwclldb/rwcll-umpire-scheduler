// Working out what one sync should do, WITHOUT changing anything.
//
// In: the feed's events and what the database holds now (the season, its teams and games, the
// fields, the names administrators have matched). Out: the games to add, the games to change (with
// the words that tell umpires what changed), and everything a person needs to look at.
//
// What is never done here: canceling a game, changing a game's status, touching a game that has
// already started, or creating teams and fields (a person does that, once, on the sync page).

import type { FeedEvent } from "./ics.ts";
import { dayKey, matchGames } from "./match.ts";
import type { FeedGameRef, OurGameRef } from "./match.ts";
import {
  divisionPrefix, isPractice, matchDivision, norm, readPlace, readTeams, resolveField, resolveTeam,
} from "./names.ts";
import type { FieldOption, SavedName, TeamOption } from "./names.ts";

export type OurGame = {
  id: string;
  division_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_label: string | null;
  away_label: string | null;
  location_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  master_source: string | null;
  updated_at: string;
};

export type SyncContext = {
  timeZone: string;
  now: Date;
  season: { id: string; name: string; starts_on: string | null; ends_on: string | null };
  divisions: { id: string; name: string }[];
  teams: TeamOption[]; // this season's teams
  fields: FieldOption[];
  games: OurGame[]; // this season's games
  assignedCount: Map<string, number>;
  savedNames: SavedName[];
};

// What the last successful run already reported, so administrators are only emailed about new things.
export type Previous = { heldKeys: string[]; notInFeedIds: string[]; nameKeys: string[] } | null;

export type GameFields = {
  division_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_label: string | null;
  away_label: string | null;
  location_id: string;
  starts_at: string;
  ends_at: string;
};

export type Insert = GameFields & { title: string; when: string };

export type Update = {
  id: string;
  expected_updated_at: string;
  set: GameFields;
  quiet: boolean; // nothing an umpire cares about changed: save it, but tell nobody
  title: string;
  when: string;
  how: "same_day" | "new_opponent" | "moved";
  changes: string[];
  assigned: number;
  notice_subject: string;
  notice_body: string; // the database adds the umpire's position and the app's address
};

export type NameRow = {
  kind: "team" | "field";
  key: string;
  name: string; // as the feed writes it
  games: number;
  matched_to: string | null; // our name, "Outside team", or null when not matched
  how: string | null;
  address?: string; // fields
  guess_division_id?: string | null; // teams: the division its name suggests
};

export type Held = { key: string; title: string; when: string; reasons: string[] };
export type NotInFeed = { id: string; title: string; when: string; assigned: number };
export type Skipped = { title: string; when: string; reason: string };

export type SyncPlan = {
  counts: {
    events: number;
    practices: number;
    other_events: number;
    cancelled_in_feed: number;
    outside_season: number;
    not_tracked: number; // games with a team marked "not tracked" (e.g. Tee Ball), skipped
    already_started: number;
    games: number;
    unchanged: number;
  };
  inserts: Insert[];
  updates: Update[];
  held: Held[];
  not_in_feed: NotInFeed[];
  skipped: Skipped[]; // on the master calendar, but deliberately left alone here
  names: NameRow[];
  other_event_titles: string[]; // a few, so a person can see what was not treated as a game
  admin_notice: { subject: string; body: string } | null;
};

// ------------------------------------------------------------------ words

export function whenText(startIso: string, endIso: string, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  return `${day.format(new Date(startIso))}, ${time.format(new Date(startIso))} - ${time.format(new Date(endIso))}`;
}

const ARROW = "→";

// ------------------------------------------------------------------ the plan

type Resolved = {
  index: number;
  event: FeedEvent;
  key: string;
  fields: GameFields;
  homeSide: string;
  awaySide: string;
  homeName: string;
  awayName: string;
  fieldName: string;
};

export function buildSyncPlan(events: FeedEvent[], context: SyncContext, previous: Previous): SyncPlan {
  const { timeZone, now } = context;
  const counts: SyncPlan["counts"] = {
    events: events.length, practices: 0, other_events: 0, cancelled_in_feed: 0,
    outside_season: 0, not_tracked: 0, already_started: 0, games: 0, unchanged: 0,
  };

  const teamById = new Map(context.teams.map((team) => [team.id, team]));
  const fieldById = new Map(context.fields.map((field) => [field.id, field]));
  const divisionName = new Map(context.divisions.map((division) => [division.id, division.name]));
  const names = new Map<string, NameRow>();
  const held: Held[] = [];
  const otherTitles: string[] = [];
  const resolved: Resolved[] = [];
  // held games whose two teams are known: they still count as "on the master calendar" when looking
  // for games of ours that have gone (a game moved to a field not matched yet is not a missing game)
  const heldRefs: FeedGameRef[] = [];
  const heldByIndex = new Map<number, Held>();

  const noteName = (row: Omit<NameRow, "games">) => {
    const id = `${row.kind}:${row.key}`;
    const found = names.get(id);
    if (found) found.games += 1;
    else names.set(id, { ...row, games: 1 });
  };

  // ---- 1. read each event, and turn its names into ours
  events.forEach((event, index) => {
    if (isPractice(event.summary)) {
      counts.practices++;
      return;
    }
    const teams = readTeams(event.summary);
    if (!teams) {
      counts.other_events++;
      if (otherTitles.length < 15 && event.summary) otherTitles.push(event.summary);
      return;
    }
    if (event.cancelled) {
      counts.cancelled_in_feed++;
      return;
    }
    counts.games++;

    const key = `${norm(event.summary)}|${event.startsAt ?? ""}`;
    const title = `${teams.home} vs ${teams.away}`;
    const when = event.startsAt && event.endsAt ? whenText(event.startsAt, event.endsAt, timeZone) : "(no time)";
    const reasons: string[] = [];

    if (!event.startsAt || !event.endsAt) {
      reasons.push(event.allDay ? "It has a date but no start time." : "Its start or end time cannot be read.");
    } else if (Date.parse(event.endsAt) <= Date.parse(event.startsAt)) {
      reasons.push("It ends at or before it starts.");
    }

    if (event.startsAt) {
      const day = dayKey(event.startsAt, timeZone);
      if ((context.season.starts_on && day < context.season.starts_on) || (context.season.ends_on && day > context.season.ends_on)) {
        counts.outside_season++;
        return;
      }
      if (Date.parse(event.startsAt) <= now.getTime()) {
        counts.already_started++;
        return;
      }
    }

    // teams. A game with a team that is not tracked here (e.g. Tee Ball) is skipped, and nothing else
    // about it (the other team, the field) is looked at.
    const resolutions = [teams.home, teams.away].map((name) => ({ name, found: resolveTeam(name, context.teams, context.savedNames) }));
    if (resolutions.some((side) => side.found.kind === "ignored")) {
      for (const side of resolutions) {
        if (side.found.kind === "ignored") {
          noteName({ kind: "team", key: norm(side.name), name: side.name, matched_to: "Not tracked", how: "saved", guess_division_id: null });
        }
      }
      counts.not_tracked++;
      return;
    }

    const sides: { name: string; side: string; teamId: string | null; label: string | null; division: string | null }[] = [];
    for (const { name, found } of resolutions) {
      const guess = matchDivision(divisionPrefix(name), context.divisions);
      if (found.kind === "team") {
        noteName({ kind: "team", key: norm(name), name, matched_to: found.team.name, how: found.how, guess_division_id: guess });
        sides.push({ name, side: `team:${found.team.id}`, teamId: found.team.id, label: null, division: found.team.division_id });
      } else if (found.kind === "outside") {
        noteName({ kind: "team", key: norm(name), name, matched_to: "Outside team", how: found.how, guess_division_id: guess });
        sides.push({ name, side: `label:${norm(name)}`, teamId: null, label: name, division: null });
      } else {
        noteName({ kind: "team", key: norm(name), name, matched_to: null, how: null, guess_division_id: guess });
        reasons.push(`The team "${name}" is not matched to one of this season's teams yet.`);
      }
    }

    // field
    const place = readPlace(event.description, event.location);
    const field = resolveField(event.description, event.location, context.fields, context.savedNames);
    if (!place.name) {
      reasons.push("It has no field.");
    } else if (field.kind === "field") {
      noteName({ kind: "field", key: norm(place.name), name: place.name, matched_to: field.field.name, how: field.how, address: event.location });
    } else {
      noteName({ kind: "field", key: norm(place.name), name: place.name, matched_to: null, how: null, address: event.location });
      reasons.push(`The field "${place.name}" is not matched to one of your fields yet.`);
    }

    // division: from our team(s); for two outside teams, from the name ("SEN 01 - ...")
    let divisionId: string | null = null;
    if (sides.length === 2) {
      if (sides[0].side === sides[1].side) reasons.push("The same team is on both sides.");
      const ours = [...new Set(sides.map((side) => side.division).filter((id): id is string => Boolean(id)))];
      if (ours.length > 1) {
        reasons.push(`The two teams are in different divisions (${ours.map((id) => divisionName.get(id) ?? "?").join(" and ")}).`);
      } else if (ours.length === 1) {
        divisionId = ours[0];
      } else if (sides.some((side) => side.teamId)) {
        reasons.push("Its team has no division. Set the team's division under League Setup.");
      } else {
        divisionId = sides.map((side) => matchDivision(divisionPrefix(side.name), context.divisions)).find(Boolean) ?? null;
        if (!divisionId) reasons.push("Neither team is one of ours, so its division cannot be told.");
      }
    }

    if (reasons.length > 0 || !divisionId || field.kind !== "field" || sides.length !== 2) {
      const item: Held = { key, title, when, reasons };
      held.push(item);
      if (sides.length === 2 && sides[0].side !== sides[1].side && event.startsAt) {
        heldRefs.push({ index, home: sides[0].side, away: sides[1].side, startsAt: event.startsAt });
        heldByIndex.set(index, item);
      }
      return;
    }

    const [home, away] = sides;
    resolved.push({
      index,
      event,
      key,
      homeSide: home.side,
      awaySide: away.side,
      homeName: home.teamId ? teamById.get(home.teamId)!.name : home.name,
      awayName: away.teamId ? teamById.get(away.teamId)!.name : away.name,
      fieldName: field.field.name,
      fields: {
        division_id: divisionId,
        home_team_id: home.teamId,
        away_team_id: away.teamId,
        home_label: home.label,
        away_label: away.label,
        location_id: field.field.id,
        starts_at: event.startsAt!,
        ends_at: event.endsAt!,
      },
    });
  });

  // ---- 2. which feed game is which of our games
  const sideOf = (teamId: string | null, label: string | null) => (teamId ? `team:${teamId}` : `label:${norm(label ?? "")}`);
  const ourRefs: OurGameRef[] = context.games.map((game) => ({
    id: game.id,
    home: sideOf(game.home_team_id, game.home_label),
    away: sideOf(game.away_team_id, game.away_label),
    startsAt: game.starts_at,
    status: game.status,
    fromMasterCalendar: game.master_source !== null,
  }));
  const feedRefs: FeedGameRef[] = resolved.map((item) => ({
    index: item.index, home: item.homeSide, away: item.awaySide, startsAt: item.fields.starts_at,
  }));
  const result = matchGames(feedRefs, ourRefs, { timeZone, now });

  const byIndex = new Map(resolved.map((item) => [item.index, item]));
  const gameById = new Map(context.games.map((game) => [game.id, game]));
  const ourSideName = (teamId: string | null, label: string | null) =>
    teamId ? teamById.get(teamId)?.name ?? "a team" : label ?? "?";

  // ---- 3. new games
  const inserts: Insert[] = result.newFeedIndexes.map((index) => {
    const item = byIndex.get(index)!;
    return {
      ...item.fields,
      title: `${item.homeName} vs ${item.awayName}`,
      when: `${whenText(item.fields.starts_at, item.fields.ends_at, timeZone)}, ${item.fieldName}`,
    };
  });

  // ---- 4. games that are the same game: what changed
  const updates: Update[] = [];
  const skipped: Skipped[] = [];

  for (const pair of result.pairs) {
    const item = byIndex.get(pair.feedIndex)!;
    const game = gameById.get(pair.gameId)!;
    const next = item.fields;
    const title = `${item.homeName} vs ${item.awayName}`;
    const when = `${whenText(next.starts_at, next.ends_at, timeZone)}, ${item.fieldName}`;

    if (game.status === "canceled") {
      skipped.push({ title, when, reason: "Canceled here, but still on the master calendar. It was left canceled." });
      continue;
    }
    if (game.status === "completed" || Date.parse(game.starts_at) <= now.getTime()) {
      counts.already_started++;
      continue;
    }

    const changes: string[] = [];
    if (Date.parse(game.starts_at) !== Date.parse(next.starts_at) || Date.parse(game.ends_at) !== Date.parse(next.ends_at)) {
      changes.push(`Time: ${whenText(game.starts_at, game.ends_at, timeZone)} ${ARROW} ${whenText(next.starts_at, next.ends_at, timeZone)}`);
    }
    if (game.location_id !== next.location_id) {
      changes.push(`Field: ${fieldById.get(game.location_id)?.name ?? "?"} ${ARROW} ${item.fieldName}`);
    }
    if (sideOf(game.home_team_id, game.home_label) !== item.homeSide) {
      changes.push(`Home team: ${ourSideName(game.home_team_id, game.home_label)} ${ARROW} ${item.homeName}`);
    }
    if (sideOf(game.away_team_id, game.away_label) !== item.awaySide) {
      changes.push(`Away team: ${ourSideName(game.away_team_id, game.away_label)} ${ARROW} ${item.awayName}`);
    }
    if (game.division_id !== next.division_id) {
      changes.push(`Division: ${divisionName.get(game.division_id) ?? "?"} ${ARROW} ${divisionName.get(next.division_id) ?? "?"}`);
    }

    // Saved quietly (nobody is told): an outside team written differently, or a game made by hand
    // that is now kept up to date from the master calendar.
    const quiet = changes.length === 0 &&
      (game.home_label !== next.home_label || game.away_label !== next.away_label || game.master_source === null);

    if (changes.length === 0) counts.unchanged++;
    if (changes.length === 0 && !quiet) continue;

    const assigned = context.assignedCount.get(game.id) ?? 0;
    updates.push({
      id: game.id,
      expected_updated_at: game.updated_at,
      set: next,
      quiet,
      title,
      when,
      how: pair.how,
      changes,
      assigned,
      notice_subject: `Game changed: ${title}, ${whenText(next.starts_at, next.ends_at, timeZone).split(",").slice(0, 2).join(",")}`,
      notice_body: [
        "A game you are umpiring has changed on the master calendar.",
        "",
        title,
        `Now: ${when}`,
        "",
        "What changed:",
        ...changes.map((change) => `- ${change}`),
        "",
        "Please open the app and confirm this game again, or tell us if you can no longer make it.",
      ].join("\n"),
    });
  }

  // ---- 5. ours, but not in the feed. A game of ours that is a held game (same matching rules) is
  // still on the master calendar: it is left as it is, and the held game says which one it is.
  const leftOurs = ourRefs.filter((ref) => result.notInFeed.includes(ref.id));
  const heldPairs = matchGames(heldRefs, leftOurs, { timeZone, now }).pairs;
  for (const pair of heldPairs) {
    const game = gameById.get(pair.gameId)!;
    heldByIndex.get(pair.feedIndex)?.reasons.push(
      `It is the game here on ${whenText(game.starts_at, game.ends_at, timeZone)}, ${fieldById.get(game.location_id)?.name ?? "?"}, which is left as it is until then.`
    );
  }
  const coveredByHeld = new Set(heldPairs.map((pair) => pair.gameId));

  const notInFeed: NotInFeed[] = result.notInFeed
    .filter((id) => !coveredByHeld.has(id))
    .map((id) => gameById.get(id)!)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((game) => ({
      id: game.id,
      title: `${ourSideName(game.home_team_id, game.home_label)} vs ${ourSideName(game.away_team_id, game.away_label)}`,
      when: `${whenText(game.starts_at, game.ends_at, timeZone)}, ${fieldById.get(game.location_id)?.name ?? "?"}`,
      assigned: context.assignedCount.get(game.id) ?? 0,
    }));

  inserts.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  updates.sort((a, b) => a.set.starts_at.localeCompare(b.set.starts_at));

  const nameRows = [...names.values()].sort((a, b) =>
    Number(a.matched_to !== null) - Number(b.matched_to !== null) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)
  );

  return {
    counts,
    inserts,
    updates,
    held,
    not_in_feed: notInFeed,
    skipped,
    names: nameRows,
    other_event_titles: otherTitles,
    admin_notice: adminNotice(held, notInFeed, nameRows, previous),
  };
}

// One email to the administrators, only about things that were not already reported last time.
function adminNotice(held: Held[], notInFeed: NotInFeed[], names: NameRow[], previous: Previous): SyncPlan["admin_notice"] {
  const seenHeld = new Set(previous?.heldKeys ?? []);
  const seenMissing = new Set(previous?.notInFeedIds ?? []);
  const seenNames = new Set(previous?.nameKeys ?? []);

  const newMissing = notInFeed.filter((game) => !seenMissing.has(game.id));
  const newNames = names.filter((row) => row.matched_to === null && !seenNames.has(`${row.kind}:${row.key}`));
  const newHeld = held.filter((game) => !seenHeld.has(game.key));

  if (newMissing.length === 0 && newNames.length === 0 && newHeld.length === 0) return null;

  const lines: string[] = ["The master calendar sync found something that needs a person.", ""];
  if (newMissing.length > 0) {
    lines.push("Games here that are no longer on the master calendar (cancel them on the Games tab if they are off):");
    for (const game of newMissing) {
      lines.push(`- ${game.title}, ${game.when}${game.assigned ? ` (${game.assigned} umpire${game.assigned === 1 ? "" : "s"} assigned)` : ""}`);
    }
    lines.push("");
  }
  if (newNames.length > 0) {
    lines.push("Names on the master calendar that are not matched yet (match them on the sync page):");
    for (const row of newNames) lines.push(`- ${row.kind === "team" ? "Team" : "Field"}: ${row.name}`);
    lines.push("");
  }
  if (newHeld.length > 0) {
    lines.push(`${newHeld.length} game${newHeld.length === 1 ? " was" : "s were"} not added or changed until this is fixed:`);
    for (const game of newHeld.slice(0, 25)) lines.push(`- ${game.title}, ${game.when}: ${game.reasons.join(" ")}`);
    if (newHeld.length > 25) lines.push(`- and ${newHeld.length - 25} more`);
    lines.push("");
  }
  lines.push("Open the app, go to Games, and choose Master calendar sync.");

  const parts = [
    newMissing.length ? `${newMissing.length} game${newMissing.length === 1 ? "" : "s"} not on the calendar` : "",
    newNames.length ? `${newNames.length} name${newNames.length === 1 ? "" : "s"} to match` : "",
    newHeld.length ? `${newHeld.length} game${newHeld.length === 1 ? "" : "s"} held` : "",
  ].filter(Boolean);

  return { subject: `Master calendar sync: ${parts.join(", ")}`, body: lines.join("\n") };
}

// What to remember from this run for the next one.
export function rememberForNextTime(plan: SyncPlan): NonNullable<Previous> {
  return {
    heldKeys: plan.held.map((game) => game.key),
    notInFeedIds: plan.not_in_feed.map((game) => game.id),
    nameKeys: plan.names.filter((row) => row.matched_to === null).map((row) => `${row.kind}:${row.key}`),
  };
}
