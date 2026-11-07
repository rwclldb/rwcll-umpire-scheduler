import { escapeHtml } from "../ui";
import { formatMoney, PAY_PLACES } from "../payments/pay-rates-model";

// Families and youth safeguards: the sums and the screens' HTML. (families.ts and my-family.ts
// make them work; the database decides who may do anything and checks every rule again.)

// The wording a parent agrees to is kept in the database (a super admin edits it on the Families screen).
// {child} is where the child's name goes.
export type Wording = { version: string; body: string; is_sample: boolean };

// (a function, not a string, so a name containing $ is never read as a special code)
export const fillWording = (body: string, childName: string): string => body.replace(/\{child\}/g, () => childName);

export const SAMPLE_WARNING =
  "The consent wording is still the SAMPLE. Parents cannot give consent until a super admin replaces the [[placeholders]] and saves it.";

export type Guardian = { link_id: string; parent_id: string; name: string; email: string | null; relationship: string; consent: boolean };

export type FamilyUmpire = {
  umpire_id: string;
  display_name: string;
  eligibility_status: string;
  has_account: boolean;
  age: number | null;
  turns_18_on: string | null;
  needs_consent: boolean;
  has_consent: boolean;
  guardians: Guardian[];
};

export type ParentAccount = { profile_id: string; display_name: string; email: string | null; registration_note: string | null; children: number };
export type FamilyLogRow = { action: string; detail: string; actor_name: string; acted_at: string };

export const RELATIONSHIPS: [string, string][] = [
  ["mother", "Mother"],
  ["father", "Father"],
  ["guardian", "Guardian"],
  ["other", "Other"],
];

const relLabel = (value: string) => RELATIONSHIPS.find(([key]) => key === value)?.[1] ?? value;

const parseKey = (key: string) => key.split("-").map(Number);

const daysBetween = (fromKey: string, toKey: string) => {
  const [fy, fm, fd] = parseKey(fromKey);
  const [ty, tm, td] = parseKey(toKey);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
};

const longDate = (key: string) => {
  const [y, m, d] = parseKey(key);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ---------------------------------------------------------------- what needs attention
export type Attention = { kind: "consent" | "turned_18" | "turning_18" | "no_guardian"; umpire: FamilyUmpire; text: string };

const ORDER = { consent: 0, turned_18: 1, turning_18: 2, no_guardian: 3 } as const;

export function attentionItems(umpires: FamilyUmpire[], todayKey: string): Attention[] {
  const items: Attention[] = [];

  for (const u of umpires) {
    const turned18 = u.age !== null && u.age >= 18;

    if (u.needs_consent && !u.has_consent) {
      const reason = u.age === null ? " (their birth date is not entered, so we cannot show they are old enough: enter it, or a parent can consent)" : "";
      items.push({
        kind: "consent",
        umpire: u,
        text: u.guardians.length === 0
          ? `Needs a parent or guardian's consent before they can be assigned, and no parent or guardian is linked yet${reason}.`
          : `Needs a parent or guardian's consent before they can be assigned${reason}.`,
      });
    }

    if (turned18) {
      items.push({ kind: "turned_18", umpire: u, text: `Turned 18 (age ${u.age}). Change them to an adult umpire.` });
    } else if (u.turns_18_on) {
      const days = daysBetween(todayKey, u.turns_18_on);
      if (days >= 0 && days <= 60) items.push({ kind: "turning_18", umpire: u, text: `Turns 18 on ${longDate(u.turns_18_on)} (in ${days} ${days === 1 ? "day" : "days"}).` });
    }

    if (u.guardians.length === 0 && !turned18 && !(u.needs_consent && !u.has_consent)) {
      items.push({ kind: "no_guardian", umpire: u, text: "No parent or guardian is linked. A youth umpire is paid through a parent or guardian." });
    }
  }

  return items.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.umpire.display_name.localeCompare(b.umpire.display_name));
}

export function parentOptions(parents: ParentAccount[], selected: string | null = null): string {
  const free = parents.filter((p) => p.children === 0);
  const rest = parents.filter((p) => p.children > 0);
  const option = (p: ParentAccount) =>
    `<option value="${escapeHtml(p.profile_id)}"${p.profile_id === selected ? " selected" : ""}>${escapeHtml(p.display_name)}${p.email && p.email !== p.display_name ? ` (${escapeHtml(p.email)})` : ""}</option>`;
  return `${free.length ? `<optgroup label="Not linked to a child yet">${free.map(option).join("")}</optgroup>` : ""}${rest.length ? `<optgroup label="Already linked to a child">${rest.map(option).join("")}</optgroup>` : ""}`;
}

export function logText(row: FamilyLogRow): string {
  const when = new Date(row.acted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).replace(/\u202f/g, " ");
  return `${when} \u00b7 ${row.actor_name}: ${row.detail}`;
}

// ---------------------------------------------------------------- the Families screen
export function familiesHtml(input: {
  umpires: FamilyUmpire[];
  parents: ParentAccount[];
  log: FamilyLogRow[];
  todayKey: string;
  minAge: number;
  consentBelow: number;
  wording: Wording;
  canEditWording: boolean;
}): string {
  const attention = attentionItems(input.umpires, input.todayKey);
  const consentOn = input.consentBelow > input.minAge || input.consentBelow > 13;
  const relSelect = (attr: string) => `<select class="rel-select" ${attr} aria-label="Relationship">${RELATIONSHIPS.map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select>`;
  const consentRule = input.consentBelow > input.minAge
    ? `Umpires aged <strong>${input.minAge} to ${input.consentBelow - 1}</strong> need a linked parent or guardian's consent before they can be assigned.`
    : `Nobody under ${input.minAge} can be approved, so consent does not come up.`;

  return `
    <section class="families" aria-labelledby="families-title">
      <h2 id="families-title">Parents and guardians</h2>
      <p class="report-privacy">
        <strong>Only you can link</strong> a parent or guardian to a youth umpire: nobody can attach themselves to a child.
        A parent sees, read-only, their own children's games, earnings and the payments made to them. Minimum age <strong>${input.minAge}</strong>.
        ${consentRule}
      </p>
      <p id="families-message" class="message" role="status" aria-live="polite"></p>
      ${input.wording.is_sample && consentOn ? `<p class="message error" role="alert" id="wording-warning">${escapeHtml(SAMPLE_WARNING)}</p>` : ""}

      <h3>Needs attention</h3>
      ${attention.length === 0
        ? `<p class="report-none">Nothing needs attention.</p>`
        : `<ul class="attention-list">${attention.map((a) => `
            <li class="attention attention-${a.kind}" data-attention="${a.kind}" data-umpire="${escapeHtml(a.umpire.umpire_id)}">
              <strong>${escapeHtml(a.umpire.display_name)}</strong>: ${escapeHtml(a.text)}
              ${a.kind === "turned_18" ? `<button type="button" class="secondary-button rate-copy" data-convert="${escapeHtml(a.umpire.umpire_id)}">Change to adult</button>` : ""}
            </li>`).join("")}</ul>`}

      <p class="field-help">An umpire who turns 18 is changed to an adult <strong>automatically</strong> each morning (their parents, and they, are told). The button is there in case you want it done today.</p>

      <h3>Youth umpires</h3>
      ${input.umpires.length === 0 ? `<p class="report-none">There are no youth umpires yet.</p>` : input.umpires.map((u) => `
        <article class="family-card" data-family="${escapeHtml(u.umpire_id)}">
          <h4>${escapeHtml(u.display_name)}
            <span class="family-meta">${u.age === null ? "age unknown" : `age ${u.age}`}${u.has_account ? "" : " \u00b7 no account"}${u.eligibility_status !== "active" ? ` \u00b7 ${escapeHtml(u.eligibility_status)}` : ""}</span>
            ${u.needs_consent ? (u.has_consent ? `<span class="family-badge family-badge-ok">Consent given</span>` : `<span class="family-badge family-badge-wait">Waiting for consent</span>`) : ""}
          </h4>
          ${u.guardians.length === 0 ? `<p class="report-none">No parent or guardian linked.</p>` : `<ul class="guardian-list">${u.guardians.map((g) => `
            <li data-link="${escapeHtml(g.link_id)}">${escapeHtml(g.name)} <span class="family-meta">(${escapeHtml(relLabel(g.relationship))}${g.email ? `, ${escapeHtml(g.email)}` : ""}${u.needs_consent ? `, ${g.consent ? "has given consent" : "no consent yet"}` : ""})</span>
              <button type="button" class="secondary-button rate-copy" data-unlink="${escapeHtml(g.link_id)}" aria-label="Unlink ${escapeHtml(g.name)} from ${escapeHtml(u.display_name)}">Unlink</button></li>`).join("")}</ul>`}
          ${u.guardians.length >= 4 ? `<p class="field-help">The most (4) are linked.</p>` : `
          <div class="link-form">
            <select class="parent-select" data-link-parent="${escapeHtml(u.umpire_id)}" aria-label="Parent or guardian to link to ${escapeHtml(u.display_name)}"><option value="">Choose a parent or guardian&hellip;</option></select>
            ${relSelect(`data-link-rel="${escapeHtml(u.umpire_id)}"`)}
            <button type="button" class="secondary-button" data-link-add="${escapeHtml(u.umpire_id)}">Link</button>
          </div>`}
        </article>`).join("")}

      <h3>Parent and guardian accounts</h3>
      ${input.parents.length === 0 ? `<p class="report-none">No parent or guardian accounts are approved yet.</p>` : `<ul class="guardian-list">${input.parents.map((p) => `
        <li data-parent="${escapeHtml(p.profile_id)}"><strong>${escapeHtml(p.display_name)}</strong> <span class="family-meta">${escapeHtml(p.email ?? "")}</span>
          ${p.children === 0 ? `<span class="family-badge family-badge-wait">not linked to a child</span>` : `<span class="family-meta">${p.children} ${p.children === 1 ? "child" : "children"}</span>`}
          ${p.registration_note ? `<br><span class="family-meta">Said: ${escapeHtml(p.registration_note)}</span>` : ""}</li>`).join("")}</ul>`}

      <h3>Consent wording</h3>
      <p class="field-help">This is what a parent reads and agrees to. <code>{child}</code> is replaced by the child's name. Current version: <strong>${escapeHtml(input.wording.version)}</strong>${input.wording.is_sample ? " (a sample)" : ""}.
        ${input.canEditWording ? "Parents who have already given consent are <strong>not</strong> asked again when you change it; the version they agreed to is kept with their consent." : "Only a super admin can change it."}</p>
      ${input.canEditWording ? `
        <label for="wording-text" class="visually-hidden">Consent wording</label>
        <textarea id="wording-text" class="wording-text" rows="14" maxlength="4000">${escapeHtml(input.wording.body)}</textarea>
        <div class="rates-actions"><button type="button" class="secondary-button" id="wording-save">Save as new wording</button></div>`
        : `<pre class="wording-preview">${escapeHtml(input.wording.body)}</pre>`}

      <h3 class="rates-log-title">Recent activity</h3>
      ${input.log.length === 0 ? `<p class="report-none">Nothing yet.</p>` : `<ul class="rates-log">${input.log.map((row) => `<li>${escapeHtml(logText(row))}</li>`).join("")}</ul>`}
    </section>`;
}

// ---------------------------------------------------------------- the parent's page
export type MyChild = {
  umpire_id: string;
  display_name: string;
  eligibility_status: string;
  age: number | null;
  needs_consent: boolean;
  has_consent: boolean;
  i_consented: boolean;
  relationship: string;
};

export type ScheduleRow = {
  game_id: string;
  starts_at: string;
  ends_at: string;
  game_status: string;
  division_name: string | null;
  location_name: string | null;
  home_team: string | null;
  away_team: string | null;
  place: string;
  assignment_status: string;
  attendance: string | null;
};

export type EarningRow = { kind: string; on_date: string; label: string; place: string | null; amount_cents: number; state: string };
export type PaymentRow = { payment_id: string; period_start: string; period_end: string; amount_cents: number; umpire_count: number; status: string; method: string | null; paid_at: string | null };

const placeLabel = (value: string | null) => (value ? PAY_PLACES.find(([key]) => key === value)?.[1] ?? value : "");

export function gameWhen(iso: string): string {
  return new Date(iso)
    .toLocaleString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(/\u202f/g, " ");
}

export function scheduleStatus(row: ScheduleRow): string {
  if (row.game_status === "canceled") return "Game canceled";
  if (row.attendance === "arrived") return "Arrived";
  if (row.attendance === "no_show") return "Did not arrive";
  if (row.assignment_status === "confirmed") return "Confirmed";
  if (row.assignment_status === "declined") return "Declined";
  return "Assigned: not confirmed yet";
}

// The status as it is shown: a canceled game stands out (red, with a cross), the rest is plain text.
export function scheduleStatusHtml(row: ScheduleRow): string {
  const text = escapeHtml(scheduleStatus(row));
  return row.game_status === "canceled" ? `<span class="family-status-canceled">${text}</span>` : text;
}

export const STATE_LABEL: Record<string, string> = {
  waiting: "Waiting to be paid",
  approved: "Approved: payment coming",
  paid: "Paid",
};

export function earningTotals(rows: EarningRow[]): Record<string, number> {
  const totals: Record<string, number> = { waiting: 0, approved: 0, paid: 0 };
  for (const row of rows) totals[row.state] = (totals[row.state] ?? 0) + row.amount_cents;
  return totals;
}

const signed = (cents: number) => (cents < 0 ? `-${formatMoney(-cents)}` : formatMoney(cents));

function consentPanel(child: MyChild, wording: Wording): string {
  if (!child.needs_consent) return "";

  if (!child.has_consent) {
    return `
      <div class="consent-box consent-needed" role="group" aria-label="Consent for ${escapeHtml(child.display_name)}">
        <p><strong>${escapeHtml(child.display_name)} cannot be assigned to games until you give consent.</strong></p>
        ${wording.is_sample
          ? `<p>The league has not finished the consent wording yet, so consent cannot be given. Please ask the league.</p>`
          : `<p class="consent-text">${escapeHtml(fillWording(wording.body, child.display_name))}</p>
        <button type="button" class="primary-button" data-give-consent="${escapeHtml(child.umpire_id)}" data-version="${escapeHtml(wording.version)}">I give consent</button>`}
      </div>`;
  }

  return child.i_consented
    ? `<div class="consent-box consent-given"><p>You gave consent for ${escapeHtml(child.display_name)} to umpire.
        <button type="button" class="secondary-button" data-withdraw-consent="${escapeHtml(child.umpire_id)}">Withdraw consent</button></p></div>`
    : `<div class="consent-box consent-given"><p>Another parent or guardian has given consent for ${escapeHtml(child.display_name)}.</p></div>`;
}

export function myFamilyHtml(input: {
  children: MyChild[];
  schedules: Record<string, ScheduleRow[]>;
  earnings: Record<string, EarningRow[]>;
  payments: PaymentRow[];
  nowIso: string;
  wording: Wording;
}): string {
  const paid = input.payments.filter((p) => p.status === "paid").reduce((t, p) => t + p.amount_cents, 0);
  const coming = input.payments.filter((p) => p.status !== "paid").reduce((t, p) => t + p.amount_cents, 0);

  return `
    <section class="my-family" aria-labelledby="my-family-title">
      <h2 id="my-family-title">My family</h2>
      <p class="report-privacy">This page is <strong>read-only</strong>. It shows your own children's games, earnings and the payments made to you. Nothing here can be changed except consent.</p>
      <p id="family-message" class="message" role="status" aria-live="polite"></p>

      <h3>Payments to you</h3>
      ${input.payments.length === 0 ? `<p class="report-none">No payments yet.</p>` : `
        <p class="earn-summary">Paid to you so far: <strong>${formatMoney(paid)}</strong>${coming > 0 ? `. Coming: <strong>${formatMoney(coming)}</strong>` : ""}.</p>
        <div class="rates-table-wrap"><table class="rates-table pay-table">
          <caption class="visually-hidden">Payments made to you</caption>
          <thead><tr><th scope="col">Period</th><th scope="col">Children</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
          <tbody>${input.payments.map((p) => `<tr><th scope="row">${escapeHtml(longDate(p.period_start))} to ${escapeHtml(longDate(p.period_end))}</th><td>${p.umpire_count}</td><td class="money">${formatMoney(p.amount_cents)}</td><td>${p.status === "paid" ? `Paid${p.method ? ` by ${escapeHtml(p.method.replace("_", " "))}` : ""}` : "Coming"}</td></tr>`).join("")}</tbody>
        </table></div>`}

      ${input.children.length === 0 ? `<p class="report-none">No children are linked to your account yet. An administrator links your account to your child. If you have signed up recently, please wait for them.</p>` : input.children.map((child) => {
        const schedule = input.schedules[child.umpire_id] ?? [];
        const upcoming = schedule.filter((g) => g.starts_at >= input.nowIso);
        const earlier = schedule.filter((g) => g.starts_at < input.nowIso).reverse();
        const earns = input.earnings[child.umpire_id] ?? [];
        const totals = earningTotals(earns);
        const table = (rows: ScheduleRow[], caption: string) => rows.length === 0 ? `<p class="report-none">None.</p>` : `
          <div class="rates-table-wrap"><table class="rates-table sched-table">
            <caption class="visually-hidden">${escapeHtml(caption)}</caption>
            <thead><tr><th scope="col">When</th><th scope="col">Game</th><th scope="col">Field</th><th scope="col">Place</th><th scope="col">Status</th></tr></thead>
            <tbody>${rows.map((g) => `<tr${g.game_status === "canceled" ? ' class="sched-row-canceled"' : ""}><th scope="row">${escapeHtml(gameWhen(g.starts_at))}</th><td>${escapeHtml(g.home_team ?? "?")} vs ${escapeHtml(g.away_team ?? "?")}${g.division_name ? ` <span class="family-meta">(${escapeHtml(g.division_name)})</span>` : ""}</td><td>${escapeHtml(g.location_name ?? "")}</td><td>${escapeHtml(placeLabel(g.place))}</td><td>${scheduleStatusHtml(g)}</td></tr>`).join("")}</tbody>
          </table></div>`;

        return `
          <article class="family-card" data-child="${escapeHtml(child.umpire_id)}">
            <h3>${escapeHtml(child.display_name)} <span class="family-meta">${child.age === null ? "" : `age ${child.age}, `}you are their ${escapeHtml(relLabel(child.relationship).toLowerCase())}</span>
              ${child.needs_consent && !child.has_consent ? `<span class="family-badge family-badge-wait">Waiting for consent</span>` : child.eligibility_status !== "active" ? `<span class="family-badge family-badge-wait">${escapeHtml(child.eligibility_status)}</span>` : `<span class="family-badge family-badge-ok">Active</span>`}
            </h3>
            ${consentPanel(child, input.wording)}
            <h4>Coming up</h4>
            ${table(upcoming, `${child.display_name}'s upcoming games`)}
            <h4>Earlier games</h4>
            ${table(earlier, `${child.display_name}'s earlier games`)}
            <h4>Earnings</h4>
            ${earns.length === 0 ? `<p class="report-none">No earnings yet.</p>` : `
              <p class="earn-summary">Waiting to be paid: <strong>${signed(totals.waiting)}</strong> &middot; Approved: <strong>${signed(totals.approved)}</strong> &middot; Paid: <strong>${signed(totals.paid)}</strong></p>
              <div class="rates-table-wrap"><table class="rates-table earn-table">
                <caption class="visually-hidden">${escapeHtml(child.display_name)}'s earnings</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">For</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
                <tbody>${earns.map((e) => `<tr><th scope="row">${escapeHtml(longDate(e.on_date))}</th><td>${e.kind === "adjustment" ? `Adjustment: ${escapeHtml(e.label)}` : `${escapeHtml(e.label)}, ${escapeHtml(placeLabel(e.place).toLowerCase())}`}</td><td class="money">${signed(e.amount_cents)}</td><td>${escapeHtml(STATE_LABEL[e.state] ?? e.state)}</td></tr>`).join("")}</tbody>
              </table></div>`}
          </article>`;
      }).join("")}
    </section>`;
}
