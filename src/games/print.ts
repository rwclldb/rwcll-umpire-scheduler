// Printing a piece of HTML on its own.
//
// The text is put in a hidden holder outside the app. While the browser's
// print window is open, the style sheet hides the app and shows only the
// holder; afterwards the holder is removed again.

export function printHtml(html: string): void {
  document.getElementById("print-root")?.remove();

  const root = document.createElement("div");
  root.id = "print-root";
  root.innerHTML = html;
  document.body.appendChild(root);
  document.body.classList.add("printing");

  let finished = false;
  const cleanUp = () => {
    if (finished) return;
    finished = true;
    window.removeEventListener("afterprint", cleanUp);
    root.remove();
    document.body.classList.remove("printing");
  };

  window.addEventListener("afterprint", cleanUp);
  // Never leave it behind, even if a browser does not say when printing ended.
  window.setTimeout(cleanUp, 10 * 60 * 1000);

  window.print();
}
