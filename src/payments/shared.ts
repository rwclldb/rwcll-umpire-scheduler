// Each section of the Payments page draws into the same box. Switching sections (or redrawing
// one) must cancel the click handlers of what was there before, otherwise one click would be
// handled once for every earlier drawing (and Save would run twice).
const handlers = new WeakMap<HTMLElement, AbortController>();

export function swapHandlers(box: HTMLElement): AbortController {
  handlers.get(box)?.abort();
  const controller = new AbortController();
  handlers.set(box, controller);
  return controller;
}

export function cancelHandlers(box: HTMLElement): void {
  handlers.get(box)?.abort();
}

export function say(box: HTMLElement, selector: string, text: string, type: "error" | "success" = "error"): void {
  const message = box.querySelector<HTMLElement>(selector);
  if (!message) return;
  message.textContent = text;
  message.className = `message ${type}`;
}
