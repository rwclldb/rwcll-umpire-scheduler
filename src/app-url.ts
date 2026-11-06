// The address of the app itself: what the links in emails (confirming a sign-up, resetting a password)
// should come back to. It is the page's own address WITHOUT any "#/page" or "?" part.
//
// The web address alone ("https://rwclldb.github.io/") is not enough: on GitHub Pages the app lives in a
// folder ("https://rwclldb.github.io/rwcll-umpire-scheduler/"), so a link back to the bare address would
// land on the wrong page. (On the developer's own computer the app is at "http://localhost:5173/".)

export function appUrlFrom(place: { origin: string; pathname: string }): string {
  const path = place.pathname.startsWith("/") ? place.pathname : `/${place.pathname}`;
  return `${place.origin}${path.replace(/\/index\.html$/, "/")}`;
}

export function appUrl(): string {
  return appUrlFrom(window.location);
}
