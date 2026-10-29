// The league logo, shown in the header and on the sign-in screens.
//
// The picture is the file  public/rwcll-logo.png.  To change the logo, replace
// that file (keep the name). The address has no leading slash on purpose, so it
// works wherever the app is hosted: in a sub-folder (GitHub Pages) or at the
// main address of a website.
export const LOGO_FILE = "rwcll-logo.png";
export const LOGO_ALT = "Redwood City Little League";

export function logoHtml(className: string): string {
  return `<img class="${className}" src="${LOGO_FILE}" alt="${LOGO_ALT}" />`;
}
