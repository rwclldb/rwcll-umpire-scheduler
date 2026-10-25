import { escapeHtml } from "./ui";

// One screen of the signed-in app. A person sees the pages their roles allow.
export type ShellPage = {
  id: string;
  label: string;
  render: (
    container: HTMLElement,
    navigate: (pageId: string) => void,
  ) => void | Promise<void>;
};

// A bar across the top of every signed-in screen, with Sign out at the right.
// It sticks to the top as the page scrolls.
export function addTopBar(
  root: HTMLElement,
  name: string,
  onSignOut: () => void,
): void {
  root.querySelector(".topbar")?.remove();

  root.insertAdjacentHTML(
    "afterbegin",
    `
      <header class="topbar">
        <span class="topbar-user">
          ${name ? `Signed in as ${escapeHtml(name)}` : "Signed in"}
        </span>
        <button id="topbar-signout" class="secondary-button"
          type="button">Sign out</button>
      </header>
    `,
  );

  root.querySelector("#topbar-signout")?.addEventListener("click", onSignOut);
}

// Only one listener at a time, even if the shell is drawn again.
let hashListener: (() => void) | null = null;

// The signed-in app: top bar, a menu (only when there is more than one page),
// and the current page. The page is kept in the address (for example
// "#/setup"), so Back, Forward and bookmarks work. Addresses that are not
// page names (such as email-link details) are ignored.
export function renderShell(
  root: HTMLElement,
  options: { name: string; pages: ShellPage[]; onSignOut: () => void },
): void {
  const { pages } = options;

  root.innerHTML = `
    <nav class="app-nav" aria-label="Main menu" ${pages.length < 2 ? "hidden" : ""}>
      <ul>
        ${pages.map((page) => `
          <li>
            <button type="button" class="app-nav-button"
              data-page="${escapeHtml(page.id)}">
              ${escapeHtml(page.label)}
            </button>
          </li>
        `).join("")}
      </ul>
    </nav>
    <div id="page-content"></div>
  `;

  addTopBar(root, options.name, options.onSignOut);

  const navigate = (pageId: string) => {
    window.location.hash = `#/${pageId}`;
  };

  root.querySelector(".app-nav")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest<HTMLButtonElement>("[data-page]");
    if (button?.dataset.page) navigate(button.dataset.page);
  });

  const show = () => {
    const content = document.querySelector<HTMLElement>("#page-content");
    if (!content) return;   // the shell has been replaced (for example on sign out)

    const wanted = /^#\/([a-z0-9-]+)$/.exec(window.location.hash)?.[1];
    const page = pages.find((item) => item.id === wanted) ?? pages[0];
    if (!page) return;

    document.querySelectorAll<HTMLButtonElement>(".app-nav-button")
      .forEach((button) => {
        if (button.dataset.page === page.id) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      });

    content.innerHTML = "";
    void page.render(content, navigate);
    window.scrollTo(0, 0);
  };

  if (hashListener) {
    window.removeEventListener("hashchange", hashListener);
  }
  hashListener = show;
  window.addEventListener("hashchange", hashListener);

  show();
}
