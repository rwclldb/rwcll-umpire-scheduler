import { escapeHtml } from "./ui";

// The parts of the Administration area. The Administration tab shows a button
// for each (with a line saying what it is for); each part has its own address,
// for example "#/admin/roles".
export type AdminSection = {
  id: string;
  label: string;
  help: string;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    id: "approvals",
    label: "Approvals",
    help: "Review new accounts and umpire registrations that are waiting for approval.",
  },
  {
    id: "roles",
    label: "Roles",
    help: "Give people their roles, and see what each role allows.",
  },
  {
    id: "setup",
    label: "League Setup",
    help: "Leagues, seasons, divisions and teams, and creating a season from the registration files.",
  },
  {
    id: "locations",
    label: "Locations",
    help: "The fields where games are played, with their addresses.",
  },
  {
    id: "umpires",
    label: "Umpire Directory",
    help: "Everyone who umpires: their records and contact details, invitations, and linking them to accounts.",
  },
  {
    id: "outbox",
    label: "Outbox",
    help: "Messages waiting to be sent, such as invitations, assignments and reminders.",
  },
  {
    id: "details",
    label: "My details",
    help: "Your own phone number, and whether you want text messages.",
  },
];

// The part named in an address, or null for the Administration tab itself
// (or for a name that is not one of the parts).
export function adminSectionFor(sub: string | undefined): AdminSection | null {
  return ADMIN_SECTIONS.find((section) => section.id === sub) ?? null;
}

// The Administration tab itself: a button for each part, each with a short
// italic line under it.
export function adminLandingHtml(): string {
  return `
    <main class="page">
      <section class="auth-card admin-card">
        <p class="eyebrow">RWCLL · ADMINISTRATION</p>
        <h1>Administration</h1>
        <p class="intro">Choose what you want to work on.</p>

        <ul class="admin-menu">
          ${ADMIN_SECTIONS.map((section) => `
            <li class="admin-menu-item">
              <button type="button" class="primary-button admin-menu-button"
                data-admin-section="${escapeHtml(section.id)}">
                ${escapeHtml(section.label)}
              </button>
              <em class="admin-menu-help">${escapeHtml(section.help)}</em>
            </li>
          `).join("")}
        </ul>
      </section>
    </main>
  `;
}

// The row of tabs across the top of a part: the Administration overview first,
// then every part, with the current one marked.
export function adminSubnavHtml(current: string): string {
  const button = (id: string, label: string) => `
    <li>
      <button type="button" class="admin-subnav-button"
        data-admin-section="${escapeHtml(id)}"
        ${id === current ? 'aria-current="page"' : ""}>
        ${escapeHtml(label)}
      </button>
    </li>
  `;

  return `
    <nav class="admin-subnav" aria-label="Administration sections">
      <ul>
        ${button("", "Overview")}
        ${ADMIN_SECTIONS.map((section) => button(section.id, section.label)).join("")}
      </ul>
    </nav>
  `;
}
